import { Platform } from 'react-native';
import axios from 'axios';

import { loadHarborCredentials } from '../harbor/harborAuthStorage';
import { SCHEDULING_BASE_URI } from '../pathMap';
import {
    clearSchedulingSessionStorage,
    clearPendingSchedulingLogout,
    getSchedulingDeviceId,
    loadPendingSchedulingLogouts,
    loadSchedulingSession,
    savePendingSchedulingLogout,
    saveSchedulingSession,
} from './schedulingAuthStorage';
import {
    createSchedulingError,
    normalizeSchedulingError,
} from './schedulingErrors';
import {
    logSchedulingAuthError,
    logSchedulingAuthEvent,
} from './schedulingLogger';

const REQUEST_TIMEOUT = 15000;
// 過期前預留五分鐘，避免邊界請求帶上即將失效的 JWT。
export const SCHEDULING_TOKEN_EXPIRY_SKEW_MS = 5 * 60 * 1000;
const AUTH_RETRY_BASE_DELAY_MS = 500;
const AUTH_RETRY_MAX_DELAY_MS = 5000;

/** @type {{accessToken: string, expiresAt: string, refreshToken: string, refreshIdleExpiresAt: string, refreshAbsoluteExpiresAt: string, harborReverifyAfter: string, sessionId: string, user: object}|null} */
let schedulingSession = null;
/** @type {Promise<object>|null} */
let exchangeInFlight = null;
/** @type {Promise<object>|null} */
let refreshInFlight = null;
/** @type {Promise<object>|null} */
let reverifyInFlight = null;
/** @type {Promise<object|null>|null} */
let hydrateInFlight = null;
/** @type {((error: Error) => void)|null} */
let harborAuthFailureHandler = null;
let authRetryCount = 0;
let authCooldownUntil = 0;

export function getSchedulingSession() {
    return schedulingSession;
}

function hasCompleteSchedulingSession(session) {
    return Boolean(
        session?.accessToken &&
            session?.expiresAt &&
            session?.refreshToken &&
            session?.refreshIdleExpiresAt &&
            session?.refreshAbsoluteExpiresAt &&
            session?.harborReverifyAfter &&
            session?.sessionId &&
            session?.user &&
            typeof session.accessToken === 'string' &&
            typeof session.expiresAt === 'string' &&
            typeof session.refreshToken === 'string' &&
            typeof session.refreshIdleExpiresAt === 'string' &&
            typeof session.refreshAbsoluteExpiresAt === 'string' &&
            typeof session.harborReverifyAfter === 'string' &&
            typeof session.sessionId === 'string' &&
            typeof session.user === 'object' &&
            !Array.isArray(session.user),
    );
}

function toSchedulingSession(data, previousSession = null) {
    const session = {
        ...data,
        user: data?.user || previousSession?.user || null,
    };
    if (!hasCompleteSchedulingSession(session)) {
        logSchedulingAuthEvent('auth.invalid_response', {
            dataKeys:
                data && typeof data === 'object' ? Object.keys(data) : null,
        });
        throw createSchedulingError({
            code: 'invalid_auth_response',
            message: '認證回應格式無效',
            status: null,
            retryable: false,
        });
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

/**
 * 更新記憶體 session。
 * @param {object|null} session
 * @param {{persist?: boolean}=} options persist 預設 true，寫入 SecureStore（非 AsyncStorage）
 */
export function setSchedulingSession(session, {persist = true} = {}) {
    if (!hasCompleteSchedulingSession(session)) {
        schedulingSession = null;
        if (persist) {
            clearSchedulingSessionStorage().catch(() => {});
        }
        return null;
    }

    schedulingSession = toSchedulingSession(session);
    if (persist) {
        saveSchedulingSession(schedulingSession).catch(() => {});
    }
    return schedulingSession;
}

/**
 * 清空記憶體與 SecureStore 中的 Scheduling session。
 */
export function clearSchedulingSession() {
    schedulingSession = null;
    return clearSchedulingSessionStorage().catch(() => {});
}

export function setSchedulingHarborAuthFailureHandler(handler) {
    harborAuthFailureHandler = typeof handler === 'function' ? handler : null;
}

export function signalSchedulingHarborAuthFailure(error) {
    harborAuthFailureHandler?.(error);
}

function clearAndSignalHarborAuthFailure(error) {
    clearSchedulingSession();
    signalSchedulingHarborAuthFailure(error);
}

/**
 * 若 now >= expiresAt - 5min 則視為已過期。
 */
export function isSchedulingTokenExpired(session, now = Date.now()) {
    if (!session?.accessToken || !session?.expiresAt) {
        return true;
    }

    const expiresAtMs = Date.parse(session.expiresAt);
    if (!Number.isFinite(expiresAtMs)) {
        return true;
    }

    return now >= expiresAtMs - SCHEDULING_TOKEN_EXPIRY_SKEW_MS;
}

function isHarborReverificationDue(session, now = Date.now()) {
    const reverifyAtMs = Date.parse(session?.harborReverifyAfter);
    return Number.isFinite(reverifyAtMs) && now >= reverifyAtMs;
}

function isHarborAuthFailure(error) {
    return (
        error?.status === 401 &&
        (error.code === 'harbor_auth_failed' ||
            error.code === 'harbor_account_mismatch')
    );
}

function isInvalidRefresh(error) {
    return (
        error?.status === 401 &&
        (error.code === 'invalid_refresh_token' ||
            error.code === 'refresh_token_reused')
    );
}

function createCooldownError() {
    return createSchedulingError({
        code: 'scheduling_auth_cooldown',
        message: '身分服務暫時不可用，請稍後再試',
        status: null,
        retryable: true,
    });
}

function ensureAuthCooldownHasPassed() {
    if (Date.now() < authCooldownUntil) {
        throw createCooldownError();
    }
}

function recordAuthFailure(error) {
    if (!error?.retryable) {
        return;
    }

    authRetryCount = Math.min(authRetryCount + 1, 4);
    const jitterMs = Math.floor(Math.random() * 250);
    const delayMs = Math.min(
        AUTH_RETRY_MAX_DELAY_MS,
        AUTH_RETRY_BASE_DELAY_MS * 2 ** (authRetryCount - 1) + jitterMs,
    );
    authCooldownUntil = Date.now() + delayMs;
}

function resetAuthCooldown() {
    authRetryCount = 0;
    authCooldownUntil = 0;
}

/**
 * 自 SecureStore 還原 session 至記憶體（single-flight）。
 */
async function hydrateSchedulingSessionFromStorage() {
    if (hydrateInFlight) {
        return hydrateInFlight;
    }

    const request = (async () => {
        const stored = await loadSchedulingSession();
        if (!stored) {
            return null;
        }
        if (!hasCompleteSchedulingSession(stored)) {
            await clearSchedulingSessionStorage();
            return null;
        }
        schedulingSession = toSchedulingSession(stored);
        return schedulingSession;
    })().finally(() => {
        if (hydrateInFlight === request) {
            hydrateInFlight = null;
        }
    });

    hydrateInFlight = request;
    return request;
}

async function getHarborCredentialsOrThrow() {
    const credentials = await loadHarborCredentials();
    if (!credentials?.userApiKey || !credentials?.clientId) {
        throw createSchedulingError({
            code: 'authentication_required',
            message: '請先登入 Harbor',
            status: 401,
            retryable: false,
        });
    }
    return credentials;
}

async function saveAuthenticatedSession(data, previousSession = null) {
    const session = toSchedulingSession(data, previousSession);
    // rotation 後必須先落盤，才可讓等候中的 API 使用新 token。
    await saveSchedulingSession(session);
    schedulingSession = session;
    resetAuthCooldown();
    return session;
}

async function performHarborExchange() {
    const startedAt = Date.now();
    ensureAuthCooldownHasPassed();
    const pendingLogoutResult = await retryPendingSchedulingLogouts();
    if (pendingLogoutResult.remainingCount > 0) {
        throw createSchedulingError({
            code: 'scheduling_logout_pending',
            message: '正在完成上一個帳號的登出，請稍後再試',
            status: null,
            retryable: true,
        });
    }
    const [credentials, deviceId] = await Promise.all([
        getHarborCredentialsOrThrow(),
        getSchedulingDeviceId(),
    ]);

    try {
        const response = await axios.post(
            `${SCHEDULING_BASE_URI}/auth/harbor/exchange`,
            {
                deviceId,
                deviceName: null,
                platform: Platform.OS,
            },
            {
                timeout: REQUEST_TIMEOUT,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'User-Api-Key': credentials.userApiKey,
                    'User-Api-Client-Id': credentials.clientId,
                },
            },
        );
        return await saveAuthenticatedSession(response.data);
    } catch (error) {
        const normalized = normalizeSchedulingError(error);
        recordAuthFailure(normalized);
        logSchedulingAuthError('exchange.failed', normalized, {
            durationMs: Date.now() - startedAt,
        });
        if (isHarborAuthFailure(normalized)) {
            clearAndSignalHarborAuthFailure(normalized);
        }
        throw normalized;
    }
}

async function performRefresh(session) {
    ensureAuthCooldownHasPassed();
    try {
        const response = await axios.post(
            `${SCHEDULING_BASE_URI}/auth/refresh`,
            {refreshToken: session.refreshToken},
            {timeout: REQUEST_TIMEOUT},
        );
        return await saveAuthenticatedSession(response.data, session);
    } catch (error) {
        const normalized = normalizeSchedulingError(error);
        recordAuthFailure(normalized);
        if (isHarborAuthFailure(normalized)) {
            clearAndSignalHarborAuthFailure(normalized);
        }
        throw normalized;
    }
}

async function performHarborReverify(session) {
    ensureAuthCooldownHasPassed();
    const [credentials, deviceId] = await Promise.all([
        getHarborCredentialsOrThrow(),
        getSchedulingDeviceId(),
    ]);
    try {
        const response = await axios.post(
            `${SCHEDULING_BASE_URI}/auth/harbor/reverify`,
            {refreshToken: session.refreshToken, deviceId},
            {
                timeout: REQUEST_TIMEOUT,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'User-Api-Key': credentials.userApiKey,
                    'User-Api-Client-Id': credentials.clientId,
                },
            },
        );
        return await saveAuthenticatedSession(response.data, session);
    } catch (error) {
        const normalized = normalizeSchedulingError(error);
        recordAuthFailure(normalized);
        if (isHarborAuthFailure(normalized)) {
            clearAndSignalHarborAuthFailure(normalized);
        }
        throw normalized;
    }
}

function runSingleFlight(current, setCurrent, operation) {
    if (current()) {
        return current();
    }
    const request = operation().finally(() => {
        if (current() === request) {
            setCurrent(null);
        }
    });
    setCurrent(request);
    return request;
}

/** 以 Harbor 憑證換取 Scheduling token。 */
export function exchangeSchedulingToken() {
    return runSingleFlight(
        () => exchangeInFlight,
        value => {
            exchangeInFlight = value;
        },
        performHarborExchange,
    );
}

/** 使用 refresh token 續期；與 exchange 採獨立 single-flight。 */
export function refreshSchedulingToken(session = schedulingSession) {
    if (!session?.refreshToken) {
        return exchangeSchedulingToken();
    }
    return runSingleFlight(
        () => refreshInFlight,
        value => {
            refreshInFlight = value;
        },
        () => performRefresh(session),
    );
}

/** 使用現有 Harbor 憑證重新驗證目前裝置 session。 */
export function reverifySchedulingSession(session = schedulingSession) {
    if (!session?.refreshToken) {
        return exchangeSchedulingToken();
    }
    return runSingleFlight(
        () => reverifyInFlight,
        value => {
            reverifyInFlight = value;
        },
        () => performHarborReverify(session),
    );
}

/** 僅重新驗證既有 session；從未使用 Scheduling 時不主動換票。 */
export async function reverifyExistingSchedulingSession() {
    const session =
        schedulingSession || (await hydrateSchedulingSessionFromStorage());
    if (!session) {
        return null;
    }
    return reverifySchedulingSession(session);
}

/** Harbor 推送啟用前必須重新核對 binding；沒有既有 session 才 exchange。 */
export async function reverifyHarborBindingForPush() {
    const session =
        schedulingSession || (await hydrateSchedulingSessionFromStorage());
    return session
        ? reverifySchedulingSession(session)
        : exchangeSchedulingToken();
}

async function refreshOrReverify(session) {
    try {
        if (isHarborReverificationDue(session)) {
            return await reverifySchedulingSession(session);
        }
        try {
            return await refreshSchedulingToken(session);
        } catch (error) {
            if (error.code === 'harbor_reverification_required') {
                return await reverifySchedulingSession(session);
            }
            throw error;
        }
    } catch (error) {
        if (isInvalidRefresh(error)) {
            await clearSchedulingSession();
            return exchangeSchedulingToken();
        }
        throw error;
    }
}

/**
 * 有效 access token 直接回傳；接近到期時 refresh 或 reverify。
 */
export async function ensureSchedulingSession() {
    if (refreshInFlight) {
        return refreshInFlight;
    }
    if (reverifyInFlight) {
        return reverifyInFlight;
    }
    let session = getSchedulingSession();
    if (!session) {
        session = await hydrateSchedulingSessionFromStorage();
    }
    if (!session) {
        return exchangeSchedulingToken();
    }
    if (!isSchedulingTokenExpired(session)) {
        return session;
    }
    return refreshOrReverify(session);
}

export async function ensureSchedulingAccessToken() {
    const session = await ensureSchedulingSession();
    return session.accessToken;
}

/**
 * API 已確認 access token 失效時，直接使用仍有效的 refresh chain 恢復一次。
 */
export async function refreshSchedulingAfterUnauthorized() {
    const session =
        schedulingSession || (await hydrateSchedulingSessionFromStorage());
    if (!session) {
        return exchangeSchedulingToken();
    }
    // 原 access token 已被服務端拒絕，refresh 進行期間不可再供其他請求重用。
    schedulingSession = null;
    return refreshOrReverify(session);
}

function isTerminalSchedulingLogoutError(error) {
    return (
        error?.status === 401 &&
        (error.code === 'invalid_refresh_token' ||
            error.code === 'refresh_token_reused')
    );
}

/** 啟動、恢復或下次換票前重試尚未送達後端的登出。 */
export async function retryPendingSchedulingLogouts() {
    const queue = await loadPendingSchedulingLogouts();
    let remainingCount = 0;
    for (const pendingSession of queue) {
        try {
            await axios.post(
                `${SCHEDULING_BASE_URI}/auth/logout`,
                {refreshToken: pendingSession.refreshToken},
                {timeout: REQUEST_TIMEOUT},
            );
            await clearPendingSchedulingLogout(pendingSession);
        } catch (error) {
            const normalized = normalizeSchedulingError(error);
            if (isTerminalSchedulingLogoutError(normalized)) {
                await clearPendingSchedulingLogout(pendingSession);
            } else {
                remainingCount += 1;
            }
        }
    }
    return {remainingCount};
}

/**
 * 撤銷目前裝置的 refresh session；網絡失敗仍清除本機資料。
 */
export async function logoutSchedulingSession() {
    const session =
        schedulingSession || (await hydrateSchedulingSessionFromStorage());
    if (session?.refreshToken) {
        await savePendingSchedulingLogout(session);
    }
    try {
        if (session?.refreshToken) {
            await axios.post(
                `${SCHEDULING_BASE_URI}/auth/logout`,
                {refreshToken: session.refreshToken},
                {timeout: REQUEST_TIMEOUT},
            );
            await clearPendingSchedulingLogout(session);
        }
    } catch (error) {
        const normalized = normalizeSchedulingError(error);
        if (isTerminalSchedulingLogoutError(normalized)) {
            await clearPendingSchedulingLogout(session);
        }
        throw normalized;
    } finally {
        schedulingSession = null;
        await clearSchedulingSessionStorage();
    }
}

/** 測試用：重置模組狀態 */
export function __resetSchedulingAuthForTests() {
    schedulingSession = null;
    exchangeInFlight = null;
    refreshInFlight = null;
    reverifyInFlight = null;
    hydrateInFlight = null;
    harborAuthFailureHandler = null;
    resetAuthCooldown();
}
