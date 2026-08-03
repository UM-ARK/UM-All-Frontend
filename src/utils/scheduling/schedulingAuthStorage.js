import * as SecureStore from 'expo-secure-store';

const KEYCHAIN_SERVICE = 'one.umall.scheduling.auth';
const SESSION_KEY = 'scheduling.auth.session.v1';

const SECURE_STORE_OPTIONS = {
    keychainService: KEYCHAIN_SERVICE,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * 從 SecureStore 讀取 Scheduling session。
 * 僅存 accessToken／expiresAt／user，禁止寫入 storageKits／AsyncStorage。
 */
export async function loadSchedulingSession() {
    const value = await SecureStore.getItemAsync(
        SESSION_KEY,
        SECURE_STORE_OPTIONS,
    );
    if (!value) {
        return null;
    }

    try {
        const parsed = JSON.parse(value);
        if (
            !parsed?.accessToken ||
            !parsed?.expiresAt ||
            typeof parsed.accessToken !== 'string'
        ) {
            await clearSchedulingSessionStorage();
            return null;
        }
        return {
            accessToken: parsed.accessToken,
            expiresAt: parsed.expiresAt,
            user: parsed.user || null,
        };
    } catch (_error) {
        await clearSchedulingSessionStorage();
        return null;
    }
}

export async function saveSchedulingSession(session) {
    if (
        !session?.accessToken ||
        !session?.expiresAt ||
        typeof session.accessToken !== 'string'
    ) {
        await clearSchedulingSessionStorage();
        return;
    }

    await SecureStore.setItemAsync(
        SESSION_KEY,
        JSON.stringify({
            accessToken: session.accessToken,
            expiresAt: session.expiresAt,
            user: session.user || null,
        }),
        SECURE_STORE_OPTIONS,
    );
}

export function clearSchedulingSessionStorage() {
    return SecureStore.deleteItemAsync(SESSION_KEY, SECURE_STORE_OPTIONS);
}
