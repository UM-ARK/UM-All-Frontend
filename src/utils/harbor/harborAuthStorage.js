import * as SecureStore from 'expo-secure-store';

const KEYCHAIN_SERVICE = 'one.umall.harbor.auth';
const CLIENT_ID_KEY = 'harbor.auth.client-id.v1';
const CREDENTIALS_KEY = 'harbor.auth.credentials.v1';
const RSA_PUBLIC_KEY = 'harbor.auth.rsa-public-key.v1';
const RSA_PRIVATE_KEY = 'harbor.auth.rsa-private-key.v1';
const PENDING_META_KEY = 'harbor.auth.pending-meta.v1';
// 保留舊鍵以完成升級前已經開始的授權，新的授權不再把私鑰放入 pending。
const PENDING_PRIVATE_KEY = 'harbor.auth.pending-private-key.v1';
const PENDING_REVOCATION_KEY = 'harbor.auth.pending-revocation.v1';

const SECURE_STORE_OPTIONS = {
    keychainService: KEYCHAIN_SERVICE,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

async function getJson(key) {
    const value = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch (error) {
        await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
        return null;
    }
}

async function setJson(key, value) {
    await SecureStore.setItemAsync(
        key,
        JSON.stringify(value),
        SECURE_STORE_OPTIONS,
    );
}

export function loadHarborClientId() {
    return SecureStore.getItemAsync(CLIENT_ID_KEY, SECURE_STORE_OPTIONS);
}

export function saveHarborClientId(clientId) {
    return SecureStore.setItemAsync(
        CLIENT_ID_KEY,
        clientId,
        SECURE_STORE_OPTIONS,
    );
}

export function loadHarborCredentials() {
    return getJson(CREDENTIALS_KEY);
}

export function saveHarborCredentials(credentials) {
    return setJson(CREDENTIALS_KEY, credentials);
}

export function clearHarborCredentials() {
    return SecureStore.deleteItemAsync(CREDENTIALS_KEY, SECURE_STORE_OPTIONS);
}

export async function loadHarborRsaKeyPair() {
    const [publicKey, privateKey] = await Promise.all([
        SecureStore.getItemAsync(RSA_PUBLIC_KEY, SECURE_STORE_OPTIONS),
        SecureStore.getItemAsync(RSA_PRIVATE_KEY, SECURE_STORE_OPTIONS),
    ]);

    if (publicKey && privateKey) {
        return {publicKey, privateKey};
    }

    if (publicKey || privateKey) {
        await clearHarborRsaKeyPair();
    }
    return null;
}

export async function saveHarborRsaKeyPair({publicKey, privateKey}) {
    // 分開保存以降低單一 Keychain 項目的大小，先寫私鑰避免留下不可用的公開金鑰。
    await SecureStore.setItemAsync(
        RSA_PRIVATE_KEY,
        privateKey,
        SECURE_STORE_OPTIONS,
    );
    try {
        await SecureStore.setItemAsync(
            RSA_PUBLIC_KEY,
            publicKey,
            SECURE_STORE_OPTIONS,
        );
    } catch (error) {
        await clearHarborRsaKeyPair();
        throw error;
    }
}

export function clearHarborRsaKeyPair() {
    return Promise.all([
        SecureStore.deleteItemAsync(RSA_PUBLIC_KEY, SECURE_STORE_OPTIONS),
        SecureStore.deleteItemAsync(RSA_PRIVATE_KEY, SECURE_STORE_OPTIONS),
    ]);
}

export async function savePendingHarborAuthorization(meta) {
    await SecureStore.deleteItemAsync(
        PENDING_PRIVATE_KEY,
        SECURE_STORE_OPTIONS,
    );
    await setJson(PENDING_META_KEY, meta);
}

export async function loadPendingHarborAuthorization() {
    const [meta, legacyPrivateKey] = await Promise.all([
        getJson(PENDING_META_KEY),
        SecureStore.getItemAsync(PENDING_PRIVATE_KEY, SECURE_STORE_OPTIONS),
    ]);

    if (!meta) {
        if (legacyPrivateKey) {
            await SecureStore.deleteItemAsync(
                PENDING_PRIVATE_KEY,
                SECURE_STORE_OPTIONS,
            );
        }
        return null;
    }

    return legacyPrivateKey ? {...meta, privateKey: legacyPrivateKey} : meta;
}

export async function clearPendingHarborAuthorization() {
    await Promise.all([
        SecureStore.deleteItemAsync(PENDING_META_KEY, SECURE_STORE_OPTIONS),
        SecureStore.deleteItemAsync(PENDING_PRIVATE_KEY, SECURE_STORE_OPTIONS),
    ]);
}

export function loadPendingHarborRevocation() {
    return getJson(PENDING_REVOCATION_KEY).then(value => {
        if (!value) {
            return [];
        }
        // 兼容早期單一 pending revoke 的儲存格式。
        return Array.isArray(value) ? value : [value];
    });
}

export async function savePendingHarborRevocation(credentials) {
    const queue = await loadPendingHarborRevocation();
    const alreadyQueued = queue.some(item => {
        return item.userApiKey === credentials.userApiKey;
    });
    if (!alreadyQueued) {
        queue.push(credentials);
    }
    await setJson(PENDING_REVOCATION_KEY, queue);
}

export async function clearPendingHarborRevocation(credentials) {
    if (!credentials) {
        await SecureStore.deleteItemAsync(
            PENDING_REVOCATION_KEY,
            SECURE_STORE_OPTIONS,
        );
        return;
    }

    const queue = await loadPendingHarborRevocation();
    const nextQueue = queue.filter(item => {
        return item.userApiKey !== credentials.userApiKey;
    });
    if (nextQueue.length === 0) {
        await SecureStore.deleteItemAsync(
            PENDING_REVOCATION_KEY,
            SECURE_STORE_OPTIONS,
        );
        return;
    }
    await setJson(PENDING_REVOCATION_KEY, nextQueue);
}
