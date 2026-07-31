jest.mock('expo-secure-store', () => {
    const values = new Map();
    return {
        __values: values,
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
        deleteItemAsync: jest.fn(async key => {
            values.delete(key);
        }),
        getItemAsync: jest.fn(async key => values.get(key) || null),
        setItemAsync: jest.fn(async (key, value) => {
            values.set(key, value);
        }),
    };
});

import {
    clearHarborRsaKeyPair,
    clearPendingHarborRevocation,
    loadHarborRsaKeyPair,
    loadPendingHarborRevocation,
    saveHarborRsaKeyPair,
    savePendingHarborRevocation,
} from '../harborAuthStorage';

const RSA_PUBLIC_KEY = 'harbor.auth.rsa-public-key.v1';
const RSA_PRIVATE_KEY = 'harbor.auth.rsa-private-key.v1';
const PENDING_REVOCATION_KEY = 'harbor.auth.pending-revocation.v1';
const SecureStore = jest.requireMock('expo-secure-store');

describe('Harbor revoke queue', () => {
    beforeEach(() => {
        SecureStore.__values.clear();
        jest.clearAllMocks();
    });

    it('保存多筆撤銷工作並避免重複 key', async () => {
        const first = {userApiKey: 'first-key', clientId: 'installation-id'};
        const second = {userApiKey: 'second-key', clientId: 'installation-id'};

        await savePendingHarborRevocation(first);
        await savePendingHarborRevocation(first);
        await savePendingHarborRevocation(second);

        await expect(loadPendingHarborRevocation()).resolves.toEqual([
            first,
            second,
        ]);
    });

    it('只移除已完成的指定撤銷工作', async () => {
        const first = {userApiKey: 'first-key', clientId: 'installation-id'};
        const second = {userApiKey: 'second-key', clientId: 'installation-id'};
        await savePendingHarborRevocation(first);
        await savePendingHarborRevocation(second);

        await clearPendingHarborRevocation(first);

        await expect(loadPendingHarborRevocation()).resolves.toEqual([second]);
    });

    it('兼容舊版單一 pending revoke 格式', async () => {
        const legacyCredentials = {
            userApiKey: 'legacy-key',
            clientId: 'installation-id',
        };
        SecureStore.__values.set(
            PENDING_REVOCATION_KEY,
            JSON.stringify(legacyCredentials),
        );

        await expect(loadPendingHarborRevocation()).resolves.toEqual([
            legacyCredentials,
        ]);
    });
});

describe('Harbor RSA 金鑰儲存', () => {
    beforeEach(() => {
        SecureStore.__values.clear();
        jest.clearAllMocks();
    });

    it('分開保存並載入長期 RSA key pair', async () => {
        const keyPair = {
            publicKey: 'public-key',
            privateKey: 'private-key',
        };

        await saveHarborRsaKeyPair(keyPair);

        expect(SecureStore.__values.get(RSA_PUBLIC_KEY)).toBe('public-key');
        expect(SecureStore.__values.get(RSA_PRIVATE_KEY)).toBe('private-key');
        await expect(loadHarborRsaKeyPair()).resolves.toEqual(keyPair);
    });

    it('缺少任一金鑰時清除不完整資料', async () => {
        SecureStore.__values.set(RSA_PUBLIC_KEY, 'orphan-public-key');

        await expect(loadHarborRsaKeyPair()).resolves.toBeNull();
        expect(SecureStore.__values.has(RSA_PUBLIC_KEY)).toBe(false);
    });

    it('安全重置時同時清除公開與私密金鑰', async () => {
        SecureStore.__values.set(RSA_PUBLIC_KEY, 'public-key');
        SecureStore.__values.set(RSA_PRIVATE_KEY, 'private-key');

        await clearHarborRsaKeyPair();

        expect(SecureStore.__values.has(RSA_PUBLIC_KEY)).toBe(false);
        expect(SecureStore.__values.has(RSA_PRIVATE_KEY)).toBe(false);
    });
});
