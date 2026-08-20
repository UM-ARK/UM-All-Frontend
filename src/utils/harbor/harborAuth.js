import { Linking, Platform } from 'react-native';

import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import {
    Buffer,
    constants as cryptoConstants,
    generateKeyPair,
    privateDecrypt,
} from 'react-native-quick-crypto';

import { getBestBrowserPackage } from '../browserPackage';
import { ARK_HARBOR, HARBOR_PUSH_URL } from '../pathMap';
import {
    clearHarborRsaKeyPair,
    clearPendingHarborAuthorization,
    loadHarborClientId,
    loadHarborRsaKeyPair,
    loadPendingHarborAuthorization,
    saveHarborClientId,
    saveHarborCredentials,
    saveHarborRsaKeyPair,
    savePendingHarborAuthorization,
} from './harborAuthStorage';
import { logHarborAuthError, logHarborAuthEvent } from './harborLogger';

const APPLICATION_NAME = 'ARK ALL';
const AUTH_PATH = '/user-api-key/new';
const HTTPS_REDIRECT_URL = 'https://umall.one/auth/discourse';
const CUSTOM_REDIRECT_URL = 'one.umall://auth/discourse';
export const DEFAULT_HARBOR_AUTH_SCOPES = ['read', 'write', 'push'];
// 僅在使用者點擊登入後的時間窗內承認 callback（含 OEM 瀏覽器 deep link）。
export const AUTH_TTL_MS = 5 * 60 * 1000;
// Auth Session 關閉後，短暫等待 OEM 瀏覽器 deep link 到達。
const AUTH_DEEPLINK_GRACE_MS = 2500;
const RSA_BITS = 2048;
const RSA_KEY_VERSION = 1;
const RSA_AUTH_PADDING = 'oaep';
const RSA_OAEP_HASH = 'sha1';
// umall.one 部署 AASA 與 assetlinks.json 後，才可安全切換為 HTTPS callback。
const HTTPS_AUTH_CALLBACK_ENABLED = true;
let harborRsaKeyPairPromise = null;
let harborAuthCompletionPromise = null;
let harborAuthSessionActive = false;
let authDeepLinkBuffer = null;
const authDeepLinkListeners = new Set();

export const HARBOR_AUTH_ERROR = {
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
    INVALID_CALLBACK: 'invalid_callback',
    INVALID_PAYLOAD: 'invalid_payload',
    NO_PENDING_AUTH: 'no_pending_auth',
};

function createAuthError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
}

export function generateHarborRsaKeyPair() {
    const startedAt = Date.now();
    logHarborAuthEvent('rsa.generate.start', { modulusLength: RSA_BITS });

    return new Promise((resolve, reject) => {
        generateKeyPair(
            'rsa',
            {
                modulusLength: RSA_BITS,
                publicExponent: 0x10001,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
            },
            (error, publicKey, privateKey) => {
                if (error) {
                    logHarborAuthError('rsa.generate.failed', error, {
                        durationMs: Date.now() - startedAt,
                    });
                    reject(error);
                    return;
                }

                if (
                    typeof publicKey !== 'string' ||
                    typeof privateKey !== 'string'
                ) {
                    const formatError = new Error('Harbor RSA 金鑰格式無效。');
                    logHarborAuthError('rsa.generate.failed', formatError, {
                        durationMs: Date.now() - startedAt,
                    });
                    reject(formatError);
                    return;
                }

                logHarborAuthEvent('rsa.generate.success', {
                    durationMs: Date.now() - startedAt,
                });
                resolve({ publicKey, privateKey });
            },
        );
    });
}

function isHarborRsaKeyPairUsable(keyPair) {
    if (!keyPair) {
        return false;
    }

    const { publicKey, privateKey } = keyPair;
    return (
        typeof publicKey === 'string' &&
        typeof privateKey === 'string' &&
        publicKey.startsWith('-----BEGIN PUBLIC KEY-----') &&
        publicKey.trimEnd().endsWith('-----END PUBLIC KEY-----') &&
        privateKey.startsWith('-----BEGIN PRIVATE KEY-----') &&
        privateKey.trimEnd().endsWith('-----END PRIVATE KEY-----')
    );
}

export function ensureHarborRsaKeyPair() {
    if (harborRsaKeyPairPromise) {
        logHarborAuthEvent('rsa.ensure.await_existing');
        return harborRsaKeyPairPromise;
    }

    const startedAt = Date.now();
    let stage = 'secure_store_load';
    logHarborAuthEvent('rsa.ensure.start');

    harborRsaKeyPairPromise = (async () => {
        const storedKeyPair = await loadHarborRsaKeyPair();
        if (isHarborRsaKeyPairUsable(storedKeyPair)) {
            logHarborAuthEvent('rsa.ensure.success', {
                source: 'stored',
                durationMs: Date.now() - startedAt,
            });
            return storedKeyPair;
        }

        if (storedKeyPair) {
            stage = 'secure_store_clear_invalid';
            logHarborAuthEvent('rsa.stored.invalid');
            await clearHarborRsaKeyPair();
        }

        stage = 'rsa_generate';
        const generatedKeyPair = await generateHarborRsaKeyPair();
        stage = 'rsa_validate';
        if (!isHarborRsaKeyPairUsable(generatedKeyPair)) {
            throw new Error('Harbor RSA 金鑰驗證失敗。');
        }

        logHarborAuthEvent('rsa.validate.success');
        stage = 'secure_store_save';
        await saveHarborRsaKeyPair(generatedKeyPair);
        logHarborAuthEvent('rsa.persist.success');
        logHarborAuthEvent('rsa.ensure.success', {
            source: 'generated',
            durationMs: Date.now() - startedAt,
        });
        return generatedKeyPair;
    })().catch(error => {
        logHarborAuthError('rsa.ensure.failed', error, {
            stage,
            durationMs: Date.now() - startedAt,
        });
        // 初始化失敗後允許登入流程再次嘗試，而不是永久快取 rejected Promise。
        harborRsaKeyPairPromise = null;
        throw error;
    });

    return harborRsaKeyPairPromise;
}

export function generateHarborNonce(byteCount = 32) {
    return Array.from(Crypto.getRandomBytes(byteCount), byte => {
        return byte.toString(16).padStart(2, '0');
    }).join('');
}

export async function getOrCreateHarborClientId() {
    const existingClientId = await loadHarborClientId();
    if (existingClientId) {
        return existingClientId;
    }

    const clientId = Crypto.randomUUID();
    await saveHarborClientId(clientId);
    return clientId;
}

function supportsUniversalAuthCallback() {
    if (!HTTPS_AUTH_CALLBACK_ENABLED) {
        return false;
    }
    if (Platform.OS === 'android') {
        return true;
    }
    if (Platform.OS !== 'ios') {
        return false;
    }

    const version = Number.parseFloat(String(Platform.Version));
    return Number.isFinite(version) && version >= 17.4;
}

export function getHarborAuthRedirect() {
    return supportsUniversalAuthCallback()
        ? HTTPS_REDIRECT_URL
        : CUSTOM_REDIRECT_URL;
}

export function buildHarborAuthUrl({
    clientId,
    nonce,
    publicKey,
    redirectUrl,
    scopes = DEFAULT_HARBOR_AUTH_SCOPES,
    pushUrl = HARBOR_PUSH_URL,
}) {
    const params = new URLSearchParams({
        application_name: APPLICATION_NAME,
        client_id: clientId,
        auth_redirect: redirectUrl,
        scopes: scopes.join(','),
        nonce,
        public_key: publicKey,
        padding: RSA_AUTH_PADDING,
    });
    if (scopes.includes('push')) {
        params.set('push_url', pushUrl);
    }

    return `${ARK_HARBOR}${AUTH_PATH}?${params.toString()}`;
}

export function isHarborAuthCallback(url) {
    if (!url) {
        return false;
    }

    try {
        const parsedUrl = new URL(url);
        const isHttpsCallback =
            parsedUrl.protocol === 'https:' &&
            parsedUrl.hostname === 'umall.one' &&
            parsedUrl.pathname === '/auth/discourse';
        const isCustomCallback =
            parsedUrl.protocol === 'one.umall:' &&
            parsedUrl.hostname === 'auth' &&
            parsedUrl.pathname === '/discourse';

        return isHttpsCallback || isCustomCallback;
    } catch (error) {
        return false;
    }
}

export function decryptHarborPayload(payload, privateKey) {
    try {
        const normalizedPayload = payload.replace(/ /g, '+');
        const encryptedBytes = Buffer.from(normalizedPayload, 'base64');
        const decryptedBytes = privateDecrypt(
            {
                key: privateKey,
                padding: cryptoConstants.RSA_PKCS1_OAEP_PADDING,
                // Discourse/OpenSSL 的 User API Key OAEP 流程預設使用 SHA-1。
                oaepHash: RSA_OAEP_HASH,
            },
            encryptedBytes,
        );
        return JSON.parse(decryptedBytes.toString('utf8'));
    } catch (error) {
        logHarborAuthError('callback.decrypt.failed', error);
        throw createAuthError(
            HARBOR_AUTH_ERROR.INVALID_PAYLOAD,
            'Harbor 授權資料無法解密。',
        );
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function clearAuthDeepLinkState() {
    authDeepLinkBuffer = null;
    authDeepLinkListeners.clear();
}

function waitForAuthDeepLink(timeoutMs) {
    return new Promise(resolve => {
        if (authDeepLinkBuffer) {
            const url = authDeepLinkBuffer;
            resolve(url);
            return;
        }

        const timer = setTimeout(() => {
            authDeepLinkListeners.delete(onLink);
            resolve(null);
        }, timeoutMs);

        const onLink = url => {
            clearTimeout(timer);
            authDeepLinkListeners.delete(onLink);
            resolve(url);
        };
        authDeepLinkListeners.add(onLink);
    });
}

async function dismissHarborAuthBrowser() {
    try {
        WebBrowser.dismissAuthSession();
    } catch (error) {
        // 部分平台可能不支援 dismissAuthSession。
    }
    try {
        await WebBrowser.dismissBrowser();
    } catch (error) {
        // Custom Tab / 外部瀏覽器可能已關閉。
    }
}

/**
 * 接收 OEM／系統瀏覽器回傳的 auth deep link。
 * 若有進行中的 Auth Session，會優先交給 startHarborAuthorization 競速完成。
 * @returns {boolean} 是否為合法 Harbor auth callback URL
 */
export function deliverHarborAuthDeepLink(url) {
    if (!isHarborAuthCallback(url)) {
        return false;
    }

    logHarborAuthEvent('callback.deeplink.received');
    authDeepLinkBuffer = url;
    for (const listener of [...authDeepLinkListeners]) {
        listener(url);
    }
    return true;
}

export function isHarborAuthSessionActive() {
    return harborAuthSessionActive;
}

async function completeHarborAuthorizationInternal(url) {
    logHarborAuthEvent('callback.complete.start');

    if (!isHarborAuthCallback(url)) {
        const callbackError = createAuthError(
            HARBOR_AUTH_ERROR.INVALID_CALLBACK,
            'Harbor 授權回調地址無效。',
        );
        logHarborAuthError('callback.complete.failed', callbackError, {
            stage: 'callback_validate',
        });
        throw callbackError;
    }

    // 安全門檻：必須先點擊登入寫入 pending；無 pending 的 deep link 一律拒絕。
    const pendingAuthorization = await loadPendingHarborAuthorization();
    if (!pendingAuthorization) {
        const pendingError = createAuthError(
            HARBOR_AUTH_ERROR.NO_PENDING_AUTH,
            '沒有等待中的 Harbor 授權。',
        );
        logHarborAuthError('callback.complete.failed', pendingError, {
            stage: 'pending_load',
        });
        throw pendingError;
    }

    if (Date.now() - pendingAuthorization.createdAt > AUTH_TTL_MS) {
        await clearPendingHarborAuthorization();
        const expiredError = createAuthError(
            HARBOR_AUTH_ERROR.EXPIRED,
            'Harbor 授權已逾時，請重新登入。',
        );
        logHarborAuthError('callback.complete.failed', expiredError, {
            stage: 'pending_validate',
        });
        throw expiredError;
    }

    let stage = 'payload_read';
    try {
        const callbackUrl = new URL(url);
        const payload = callbackUrl.searchParams.get('payload');
        if (!payload) {
            throw createAuthError(
                HARBOR_AUTH_ERROR.INVALID_PAYLOAD,
                'Harbor 授權回調缺少必要資料。',
            );
        }

        // 舊版 pending 可能仍攜帶一次性私鑰；新流程則使用長期保存的私鑰。
        stage = 'rsa_private_key_load';
        const privateKey = pendingAuthorization.privateKey
            ? pendingAuthorization.privateKey
            : (await ensureHarborRsaKeyPair()).privateKey;
        stage = 'payload_decrypt';
        const decryptedPayload = decryptHarborPayload(payload, privateKey);
        stage = 'nonce_validate';
        if (
            decryptedPayload?.nonce !== pendingAuthorization.nonce ||
            typeof decryptedPayload?.key !== 'string' ||
            !decryptedPayload.key
        ) {
            throw createAuthError(
                HARBOR_AUTH_ERROR.INVALID_PAYLOAD,
                'Harbor 授權驗證失敗。',
            );
        }

        const credentials = {
            userApiKey: decryptedPayload.key,
            clientId: pendingAuthorization.clientId,
            apiVersion: decryptedPayload.api ?? null,
            scopes:
                pendingAuthorization.scopes ||
                ['read', 'write'],
            push:
                typeof decryptedPayload.push === 'boolean'
                    ? decryptedPayload.push
                    : null,
            createdAt: Date.now(),
        };

        // 必須先持久化憑證，再清除 pending metadata，避免成功後被終止而遺失登入。
        stage = 'credentials_save';
        await saveHarborCredentials(credentials);
        stage = 'pending_clear';
        await clearPendingHarborAuthorization();
        clearAuthDeepLinkState();
        logHarborAuthEvent('callback.complete.success');
        return credentials;
    } catch (error) {
        logHarborAuthError('callback.complete.failed', error, { stage });
        await clearPendingHarborAuthorization();
        clearAuthDeepLinkState();
        throw error;
    }
}

export async function completeHarborAuthorization(url) {
    // Auth Session 與 Linking 可能同時到達同一 callback，合併為單一完成流程。
    if (harborAuthCompletionPromise) {
        return harborAuthCompletionPromise;
    }

    harborAuthCompletionPromise = completeHarborAuthorizationInternal(
        url,
    ).finally(() => {
        harborAuthCompletionPromise = null;
    });
    return harborAuthCompletionPromise;
}

export async function startHarborAuthorization({
    purpose = 'harbor_login',
    scopes = DEFAULT_HARBOR_AUTH_SCOPES,
    pushUrl = HARBOR_PUSH_URL,
} = {}) {
    let stage = 'rsa_ensure';
    logHarborAuthEvent('authorization.start');
    try {
        const { publicKey } = await ensureHarborRsaKeyPair();
        logHarborAuthEvent('authorization.rsa.ready');

        stage = 'pending_clear';
        await clearPendingHarborAuthorization();
        clearAuthDeepLinkState();
        stage = 'client_id_prepare';
        const clientId = await getOrCreateHarborClientId();
        stage = 'nonce_generate';
        const nonce = generateHarborNonce();
        const redirectUrl = getHarborAuthRedirect();

        stage = 'pending_save';
        await savePendingHarborAuthorization({
            clientId,
            nonce,
            redirectUrl,
            purpose,
            scopes,
            pushUrl,
            createdAt: Date.now(),
            rsaKeyVersion: RSA_KEY_VERSION,
        });
        logHarborAuthEvent('authorization.pending.saved');

        stage = 'auth_url_build';
        const authUrl = buildHarborAuthUrl({
            clientId,
            nonce,
            publicKey,
            redirectUrl,
            scopes,
            pushUrl,
        });

        try {
            stage = 'browser_open';
            // Android：與 openLink 共用 Custom Tabs 瀏覽器選擇，避免落到系統預設華為瀏覽器。
            const browserPackage = await getBestBrowserPackage();
            logHarborAuthEvent('authorization.browser.open', {
                redirectScheme: new URL(redirectUrl).protocol.replace(':', ''),
                browserPackage: browserPackage || null,
            });

            harborAuthSessionActive = true;
            const browserPromise = WebBrowser.openAuthSessionAsync(
                authUrl,
                redirectUrl,
                {
                    preferEphemeralSession: false,
                    preferUniversalLinks: redirectUrl === HTTPS_REDIRECT_URL,
                    ...(browserPackage ? { browserPackage } : {}),
                },
            );
            // 與 Auth Session 並行等待 OEM deep link；逾時後仍可由 grace / Linking 補完。
            const deepLinkPromise = waitForAuthDeepLink(AUTH_TTL_MS);

            const raced = await Promise.race([
                browserPromise.then(result => ({
                    source: 'browser',
                    result,
                })),
                deepLinkPromise.then(url =>
                    url
                        ? { source: 'deeplink', url }
                        : { source: 'deeplink_timeout' },
                ),
            ]);

            if (raced.source === 'deeplink') {
                logHarborAuthEvent('authorization.browser.result', {
                    type: 'deeplink',
                    hasCallbackUrl: true,
                });
                await dismissHarborAuthBrowser();
                stage = 'callback_complete';
                const credentials = await completeHarborAuthorization(
                    raced.url,
                );
                logHarborAuthEvent('authorization.success', {
                    source: 'deeplink',
                });
                return credentials;
            }

            if (raced.source === 'browser') {
                const { result } = raced;
                logHarborAuthEvent('authorization.browser.result', {
                    type: result.type,
                    hasCallbackUrl: Boolean(result.url),
                });

                if (result.type === 'success' && result.url) {
                    stage = 'callback_complete';
                    const credentials = await completeHarborAuthorization(
                        result.url,
                    );
                    logHarborAuthEvent('authorization.success', {
                        source: 'auth_session',
                    });
                    return credentials;
                }
            }

            // Auth Session 關閉但未帶回 URL：短暫等待 OEM 瀏覽器 deep link。
            stage = 'deeplink_grace';
            const lateUrl = await waitForAuthDeepLink(AUTH_DEEPLINK_GRACE_MS);
            if (lateUrl) {
                logHarborAuthEvent('authorization.browser.result', {
                    type: 'deeplink_grace',
                    hasCallbackUrl: true,
                });
                stage = 'callback_complete';
                const credentials = await completeHarborAuthorization(lateUrl);
                logHarborAuthEvent('authorization.success', {
                    source: 'deeplink_grace',
                });
                return credentials;
            }

            throw createAuthError(
                HARBOR_AUTH_ERROR.CANCELLED,
                '已取消 Harbor 登入。',
            );
        } catch (error) {
            // 取消時保留 pending，讓稍後的 OEM deep link（5 分鐘內）仍可完成登入。
            if (error.code !== HARBOR_AUTH_ERROR.CANCELLED) {
                await clearPendingHarborAuthorization();
                clearAuthDeepLinkState();
            }
            throw error;
        } finally {
            harborAuthSessionActive = false;
        }
    } catch (error) {
        if (error.code === HARBOR_AUTH_ERROR.CANCELLED) {
            logHarborAuthEvent('authorization.cancelled', { stage });
        } else {
            logHarborAuthError('authorization.failed', error, { stage });
        }
        throw error;
    }
}

export async function completeInitialHarborCallback() {
    const initialUrl = await Linking.getInitialURL();
    if (!isHarborAuthCallback(initialUrl)) {
        const pendingAuthorization = await loadPendingHarborAuthorization();
        if (
            pendingAuthorization &&
            Date.now() - pendingAuthorization.createdAt > AUTH_TTL_MS
        ) {
            await clearPendingHarborAuthorization();
        }
        return null;
    }

    return completeHarborAuthorization(initialUrl);
}
