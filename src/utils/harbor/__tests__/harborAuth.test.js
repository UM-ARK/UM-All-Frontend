import {constants, generateKeyPairSync, publicEncrypt} from 'crypto';
import {Buffer} from 'buffer';

jest.mock('react-native', () => ({
    Linking: {
        getInitialURL: jest.fn().mockResolvedValue(null),
    },
    Platform: {
        OS: 'android',
        Version: 36,
    },
}));

jest.mock('expo-crypto', () => ({
    getRandomBytes: jest.fn(byteCount => {
        return Uint8Array.from(require('crypto').randomBytes(byteCount));
    }),
    randomUUID: jest.fn(() => '11111111-2222-4333-8444-555555555555'),
}));

jest.mock('expo-web-browser', () => ({
    openAuthSessionAsync: jest.fn(),
}));

jest.mock('react-native-quick-crypto', () => {
    const nodeCrypto = require('crypto');

    return {
        Buffer: require('buffer').Buffer,
        constants: nodeCrypto.constants,
        generateKeyPair: nodeCrypto.generateKeyPair,
        privateDecrypt: nodeCrypto.privateDecrypt,
    };
});

jest.mock('expo-secure-store', () => ({
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
    deleteItemAsync: jest.fn(),
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
}));

jest.mock('../../pathMap', () => ({
    ARK_HARBOR: 'https://harbor.umall.one',
}));

jest.mock('../harborAuthStorage', () => ({
    clearHarborRsaKeyPair: jest.fn().mockResolvedValue(undefined),
    clearPendingHarborAuthorization: jest.fn().mockResolvedValue(undefined),
    loadHarborClientId: jest.fn().mockResolvedValue(null),
    loadHarborRsaKeyPair: jest.fn().mockResolvedValue(null),
    loadPendingHarborAuthorization: jest.fn(),
    saveHarborClientId: jest.fn().mockResolvedValue(undefined),
    saveHarborCredentials: jest.fn().mockResolvedValue(undefined),
    saveHarborRsaKeyPair: jest.fn().mockResolvedValue(undefined),
    savePendingHarborAuthorization: jest.fn().mockResolvedValue(undefined),
}));

const mockAuthStorage = jest.requireMock('../harborAuthStorage');
const mockExpoCrypto = jest.requireMock('expo-crypto');

import {
    buildHarborAuthUrl,
    completeHarborAuthorization,
    completeInitialHarborCallback,
    decryptHarborPayload,
    ensureHarborRsaKeyPair,
    generateHarborNonce,
    generateHarborRsaKeyPair,
    getHarborAuthRedirect,
    HARBOR_AUTH_ERROR,
    isHarborAuthCallback,
} from '../harborAuth';

describe('Harbor User API Key 授權工具', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('產生固定長度的 CSPRNG hex nonce', () => {
        mockExpoCrypto.getRandomBytes.mockReturnValueOnce(
            Uint8Array.from([1, 2, 3, 4]),
        );
        expect(generateHarborNonce(4)).toBe('01020304');
    });

    it('產生 Discourse 可用的 RSA PEM 金鑰', async () => {
        const {publicKey, privateKey} = await generateHarborRsaKeyPair();

        expect(publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
        expect(privateKey).toMatch(/^-----BEGIN PRIVATE KEY-----/);
    });

    it('SecureStore 沒有金鑰時產生並保存新的 RSA key pair', async () => {
        await jest.isolateModulesAsync(async () => {
            const isolatedAuthStorage = require('../harborAuthStorage');
            const isolatedHarborAuth = require('../harborAuth');

            isolatedAuthStorage.loadHarborRsaKeyPair.mockResolvedValue(null);

            const keyPair =
                await isolatedHarborAuth.ensureHarborRsaKeyPair();

            expect(keyPair.publicKey).toMatch(/^-----BEGIN PUBLIC KEY-----/);
            expect(keyPair.privateKey).toMatch(/^-----BEGIN PRIVATE KEY-----/);
            expect(
                isolatedAuthStorage.saveHarborRsaKeyPair,
            ).toHaveBeenCalledWith(keyPair);
        });
    });

    it('重用 SecureStore 內有效的長期 RSA 金鑰', async () => {
        const storedKeyPair = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {type: 'spki', format: 'pem'},
            privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
        });
        mockAuthStorage.loadHarborRsaKeyPair.mockResolvedValue(storedKeyPair);

        await expect(ensureHarborRsaKeyPair()).resolves.toEqual(storedKeyPair);
        expect(mockAuthStorage.saveHarborRsaKeyPair).not.toHaveBeenCalled();
    });

    it('建立包含 OAEP 與必要參數的授權 URL', () => {
        const authUrl = buildHarborAuthUrl({
            clientId: 'installation-id',
            nonce: 'nonce-value',
            publicKey:
                '-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----',
            redirectUrl: 'https://umall.one/auth/discourse',
        });
        const parsedUrl = new URL(authUrl);

        expect(`${parsedUrl.origin}${parsedUrl.pathname}`).toBe(
            'https://harbor.umall.one/user-api-key/new',
        );
        expect(parsedUrl.searchParams.get('application_name')).toBe('ARK ALL');
        expect(parsedUrl.searchParams.get('client_id')).toBe('installation-id');
        expect(parsedUrl.searchParams.get('scopes')).toBe('read,write');
        expect(parsedUrl.searchParams.get('padding')).toBe('oaep');
        expect(parsedUrl.searchParams.get('nonce')).toBe('nonce-value');
    });

    it('網站關聯檔部署前使用可可靠返回 App 的 custom scheme', () => {
        expect(getHarborAuthRedirect()).toBe('one.umall://auth/discourse');
    });

    it('只接受 ARK ALL 的 HTTPS 或 custom scheme callback', () => {
        expect(
            isHarborAuthCallback(
                'https://umall.one/auth/discourse?payload=encrypted',
            ),
        ).toBe(true);
        expect(
            isHarborAuthCallback(
                'one.umall://auth/discourse?payload=encrypted',
            ),
        ).toBe(true);
        expect(
            isHarborAuthCallback(
                'https://attacker.example/auth/discourse?payload=encrypted',
            ),
        ).toBe(false);
        expect(isHarborAuthCallback('invalid url')).toBe(false);
    });

    it('冷啟動沒有 callback 時清除逾時的 pending authorization', async () => {
        mockAuthStorage.loadPendingHarborAuthorization.mockResolvedValue({
            createdAt: Date.now() - 11 * 60 * 1000,
            privateKey: 'expired-private-key',
        });

        await expect(completeInitialHarborCallback()).resolves.toBeNull();
        expect(
            mockAuthStorage.clearPendingHarborAuthorization,
        ).toHaveBeenCalled();
    });

    it('解密 Discourse RSA-OAEP SHA-1 payload', () => {
        const {publicKey, privateKey} = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {type: 'spki', format: 'pem'},
            privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
        });
        const sourcePayload = {
            key: 'user-api-key',
            nonce: 'expected-nonce',
            api: 4,
        };
        const encryptedPayload = publicEncrypt(
            {
                key: publicKey,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha1',
            },
            Buffer.from(JSON.stringify(sourcePayload), 'utf8'),
        ).toString('base64');

        expect(decryptHarborPayload(encryptedPayload, privateKey)).toEqual(
            sourcePayload,
        );
    });

    it('拒絕舊版 RSA PKCS#1 v1.5 payload', () => {
        const {publicKey, privateKey} = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {type: 'spki', format: 'pem'},
            privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
        });
        const encryptedPayload = publicEncrypt(
            {
                key: publicKey,
                padding: constants.RSA_PKCS1_PADDING,
            },
            Buffer.from(
                JSON.stringify({
                    key: 'legacy-user-api-key',
                    nonce: 'expected-nonce',
                }),
                'utf8',
            ),
        ).toString('base64');

        expect(() =>
            decryptHarborPayload(encryptedPayload, privateKey),
        ).toThrow(
            expect.objectContaining({
                code: HARBOR_AUTH_ERROR.INVALID_PAYLOAD,
            }),
        );
    });

    it('拒絕無法解密的 payload', () => {
        const {privateKey} = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {type: 'spki', format: 'pem'},
            privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
        });

        expect(() => decryptHarborPayload('not-base64', privateKey)).toThrow(
            expect.objectContaining({
                code: HARBOR_AUTH_ERROR.INVALID_PAYLOAD,
            }),
        );
    });

    it('callback 驗證成功後先保存 key，再清除 pending authorization', async () => {
        const {publicKey, privateKey} = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {type: 'spki', format: 'pem'},
            privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
        });
        const encryptedPayload = publicEncrypt(
            {
                key: publicKey,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha1',
            },
            Buffer.from(
                JSON.stringify({
                    key: 'persisted-user-api-key',
                    nonce: 'pending-nonce',
                    api: 4,
                }),
                'utf8',
            ),
        ).toString('base64');
        mockAuthStorage.loadPendingHarborAuthorization.mockResolvedValue({
            clientId: 'installation-id',
            nonce: 'pending-nonce',
            privateKey,
            createdAt: Date.now(),
        });
        const callbackUrl = new URL('https://umall.one/auth/discourse');
        callbackUrl.searchParams.set('payload', encryptedPayload);

        const credentials = await completeHarborAuthorization(
            callbackUrl.toString(),
        );

        expect(credentials).toEqual(
            expect.objectContaining({
                userApiKey: 'persisted-user-api-key',
                clientId: 'installation-id',
                apiVersion: 4,
            }),
        );
        expect(mockAuthStorage.saveHarborCredentials).toHaveBeenCalledWith(
            credentials,
        );
        expect(
            mockAuthStorage.saveHarborCredentials.mock.invocationCallOrder[0],
        ).toBeLessThan(
            mockAuthStorage.clearPendingHarborAuthorization.mock
                .invocationCallOrder[0],
        );
    });

    it('nonce 不一致時拒絕 callback 並清除 pending authorization', async () => {
        const {publicKey, privateKey} = generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {type: 'spki', format: 'pem'},
            privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
        });
        const encryptedPayload = publicEncrypt(
            {
                key: publicKey,
                padding: constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha1',
            },
            Buffer.from(
                JSON.stringify({key: 'api-key', nonce: 'wrong-nonce'}),
                'utf8',
            ),
        ).toString('base64');
        mockAuthStorage.loadPendingHarborAuthorization.mockResolvedValue({
            clientId: 'installation-id',
            nonce: 'expected-nonce',
            privateKey,
            createdAt: Date.now(),
        });
        const callbackUrl = new URL('one.umall://auth/discourse');
        callbackUrl.searchParams.set('payload', encryptedPayload);

        await expect(
            completeHarborAuthorization(callbackUrl.toString()),
        ).rejects.toMatchObject({code: HARBOR_AUTH_ERROR.INVALID_PAYLOAD});
        expect(mockAuthStorage.saveHarborCredentials).not.toHaveBeenCalled();
        expect(
            mockAuthStorage.clearPendingHarborAuthorization,
        ).toHaveBeenCalled();
    });
});
