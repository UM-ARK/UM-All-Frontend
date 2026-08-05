import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const KEYCHAIN_SERVICE = 'one.umall.scheduling.auth';
const LEGACY_SESSION_KEY = 'scheduling.auth.session.v1';
const SESSION_KEY = 'scheduling.auth.session.v2';
const DEVICE_ID_KEY = 'scheduling.auth.device-id.v1';

const SECURE_STORE_OPTIONS = {
    keychainService: KEYCHAIN_SERVICE,
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let deviceIdInFlight = null;

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function isValidDate(value) {
    return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function isValidDeviceId(value) {
    return (
        typeof value === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            value,
        )
    );
}

function normalizeSchedulingSession(session) {
    if (
        !session ||
        typeof session !== 'object' ||
        !isNonEmptyString(session.accessToken) ||
        !isNonEmptyString(session.refreshToken) ||
        !isValidDate(session.expiresAt) ||
        !isValidDate(session.refreshIdleExpiresAt) ||
        !isValidDate(session.refreshAbsoluteExpiresAt) ||
        !isValidDate(session.harborReverifyAfter) ||
        !isNonEmptyString(session.sessionId) ||
        !session.user ||
        typeof session.user !== 'object' ||
        Array.isArray(session.user)
    ) {
        return null;
    }

    return {
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
        refreshToken: session.refreshToken,
        refreshIdleExpiresAt: session.refreshIdleExpiresAt,
        refreshAbsoluteExpiresAt: session.refreshAbsoluteExpiresAt,
        harborReverifyAfter: session.harborReverifyAfter,
        sessionId: session.sessionId,
        user: session.user,
    };
}

function clearLegacySchedulingSession() {
    return SecureStore.deleteItemAsync(LEGACY_SESSION_KEY, SECURE_STORE_OPTIONS);
}

/**
 * 取得本次安裝固定的 Scheduling deviceId，不使用硬件或廣告識別碼。
 */
export async function getSchedulingDeviceId() {
    if (deviceIdInFlight) {
        return deviceIdInFlight;
    }

    const request = (async () => {
        const stored = await SecureStore.getItemAsync(
            DEVICE_ID_KEY,
            SECURE_STORE_OPTIONS,
        );
        if (isValidDeviceId(stored)) {
            return stored;
        }
        if (stored) {
            await SecureStore.deleteItemAsync(
                DEVICE_ID_KEY,
                SECURE_STORE_OPTIONS,
            );
        }

        const deviceId = Crypto.randomUUID();
        await SecureStore.setItemAsync(
            DEVICE_ID_KEY,
            deviceId,
            SECURE_STORE_OPTIONS,
        );
        return deviceId;
    })().finally(() => {
        if (deviceIdInFlight === request) {
            deviceIdInFlight = null;
        }
    });

    deviceIdInFlight = request;
    return request;
}

export function clearSchedulingDeviceId() {
    return SecureStore.deleteItemAsync(DEVICE_ID_KEY, SECURE_STORE_OPTIONS);
}

/**
 * 從 SecureStore 讀取完整 Scheduling v2 session；v1 一律刪除而不遷移。
 */
export async function loadSchedulingSession() {
    await clearLegacySchedulingSession();
    const value = await SecureStore.getItemAsync(
        SESSION_KEY,
        SECURE_STORE_OPTIONS,
    );
    if (!value) {
        return null;
    }

    try {
        const session = normalizeSchedulingSession(JSON.parse(value));
        if (!session) {
            await clearSchedulingSessionStorage();
            return null;
        }
        return session;
    } catch (_error) {
        await clearSchedulingSessionStorage();
        return null;
    }
}

export async function saveSchedulingSession(session) {
    const normalized = normalizeSchedulingSession(session);
    await clearLegacySchedulingSession();
    if (!normalized) {
        await clearSchedulingSessionStorage();
        return;
    }

    await SecureStore.setItemAsync(
        SESSION_KEY,
        JSON.stringify(normalized),
        SECURE_STORE_OPTIONS,
    );
}

export function clearSchedulingSessionStorage() {
    return Promise.all([
        SecureStore.deleteItemAsync(SESSION_KEY, SECURE_STORE_OPTIONS),
        clearLegacySchedulingSession(),
    ]);
}
