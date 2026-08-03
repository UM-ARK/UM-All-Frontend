import axios from 'axios';

import { loadHarborCredentials } from '../harbor/harborAuthStorage';
import {
    clearSchedulingSessionStorage,
    loadSchedulingSession,
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

// Scheduling API 專用 base（不可拼接以 /api/ 結尾的 BASE_URI）
// TODO: 上線前修改 umall.one
export const SCHEDULING_BASE_URI = 'http://192.168.1.230:8000/api/v2';
// export const SCHEDULING_BASE_URI = 'https://umall.one/api/v2';

const REQUEST_TIMEOUT = 15000;
// 過期前預留約 30 秒，避免邊界請求帶上即將失效的 JWT
export const SCHEDULING_TOKEN_EXPIRY_SKEW_MS = 30 * 1000;

/** @type {{accessToken: string, expiresAt: string, user: object}|null} */
let schedulingSession = null;
/** @type {Promise<object>|null} */
let exchangeInFlight = null;
/** @type {Promise<object|null>|null} */
let hydrateInFlight = null;
/** @type {((error: Error) => void)|null} */
let harborAuthFailureHandler = null;

export function getSchedulingSession() {
    return schedulingSession;
}

/**
 * 更新記憶體 session。
 * @param {object|null} session
 * @param {{persist?: boolean}=} options persist 預設 true，寫入 SecureStore（非 AsyncStorage）
 */
export function setSchedulingSession(session, {persist = true} = {}) {
    if (
        !session?.accessToken ||
        !session?.expiresAt ||
        typeof session.accessToken !== 'string'
    ) {
        schedulingSession = null;
        if (persist) {
            clearSchedulingSessionStorage().catch(() => {});
        }
        return null;
    }

    schedulingSession = {
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
        user: session.user || null,
    };
    if (persist) {
        saveSchedulingSession(schedulingSession).catch(() => {});
    }
    return schedulingSession;
}

/**
 * 清空記憶體與 SecureStore 中的 Scheduling JWT。
 */
export function clearSchedulingSession() {
    schedulingSession = null;
    clearSchedulingSessionStorage().catch(() => {});
}

export function setSchedulingHarborAuthFailureHandler(handler) {
    harborAuthFailureHandler = typeof handler === 'function' ? handler : null;
}

export function signalSchedulingHarborAuthFailure(error) {
    harborAuthFailureHandler?.(error);
}

/**
 * 若 now >= expiresAt - 30s 則視為已過期。
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

function normalizeExchangeResponse(data) {
    if (!data?.accessToken || !data?.expiresAt) {
        logSchedulingAuthEvent('exchange.invalid_response', {
            hasAccessToken: Boolean(data?.accessToken),
            hasExpiresAt: Boolean(data?.expiresAt),
            hasUser: Boolean(data?.user),
            dataKeys:
                data && typeof data === 'object' ? Object.keys(data) : null,
        });
        throw createSchedulingError({
            code: 'invalid_exchange_response',
            message: '換票回應格式無效',
            status: null,
            retryable: false,
        });
    }

    // 由 performHarborExchange await 落盤，此處只更新記憶體
    return setSchedulingSession(
        {
            accessToken: data.accessToken,
            expiresAt: data.expiresAt,
            user: data.user || null,
        },
        {persist: false},
    );
}

/**
 * 自 SecureStore 還原未過期的 JWT 至記憶體（single-flight）。
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
        if (isSchedulingTokenExpired(stored)) {
            logSchedulingAuthEvent('session.secure_store_expired', {
                expiresAt: stored.expiresAt,
            });
            await clearSchedulingSessionStorage();
            if (
                schedulingSession?.accessToken === stored.accessToken
            ) {
                schedulingSession = null;
            }
            return null;
        }
        // 已在盤上，只灌記憶體，避免重複寫入
        schedulingSession = {
            accessToken: stored.accessToken,
            expiresAt: stored.expiresAt,
            user: stored.user || null,
        };
        return schedulingSession;
    })().finally(() => {
        if (hydrateInFlight === request) {
            hydrateInFlight = null;
        }
    });

    hydrateInFlight = request;
    return request;
}

async function performHarborExchange() {
    const startedAt = Date.now();
    const credentials = await loadHarborCredentials();
    if (!credentials?.userApiKey || !credentials?.clientId) {
        const authError = createSchedulingError({
            code: 'authentication_required',
            message: '請先登入 Harbor',
            status: 401,
            retryable: false,
        });
        logSchedulingAuthError('exchange.failed', authError, {
            stage: 'credentials',
            hasUserApiKey: Boolean(credentials?.userApiKey),
            hasClientId: Boolean(credentials?.clientId),
            durationMs: Date.now() - startedAt,
        });
        throw authError;
    }

    logSchedulingAuthEvent('exchange.start', {
        url: `${SCHEDULING_BASE_URI}/auth/harbor/exchange`,
        hasCredentials: true,
    });

    try {
        // Harbor key 只能出現在此換票請求，不得帶入其他組隊 API
        const response = await axios.post(
            `${SCHEDULING_BASE_URI}/auth/harbor/exchange`,
            {},
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
        const session = normalizeExchangeResponse(response.data);
        // 確保換票成功後 JWT 已落盤，冷啟動可重用至 expiresAt
        if (session) {
            try {
                await saveSchedulingSession(session);
            } catch (persistError) {
                logSchedulingAuthError('session.persist_failed', persistError, {
                    expiresAt: session.expiresAt,
                });
            }
        }
        logSchedulingAuthEvent('exchange.success', {
            httpStatus: response.status,
            expiresAt: session.expiresAt,
            hasUser: Boolean(session.user),
            durationMs: Date.now() - startedAt,
        });
        return session;
    } catch (error) {
        const normalized = normalizeSchedulingError(error);
        logSchedulingAuthError('exchange.failed', normalized, {
            stage: 'request',
            axiosCode: error?.isAxiosError ? error.code : null,
            rawHttpStatus: error?.response?.status ?? null,
            durationMs: Date.now() - startedAt,
        });
        // 503 harbor_unavailable：可重試，不應視為 Harbor 登出
        if (
            normalized.status === 401 &&
            normalized.code === 'harbor_auth_failed'
        ) {
            clearSchedulingSession();
            signalSchedulingHarborAuthFailure(normalized);
        }
        throw normalized;
    }
}

/**
 * 以 Harbor 憑證換取 Scheduling JWT；同一時間只允許一個 in-flight promise。
 */
export function exchangeSchedulingToken() {
    if (exchangeInFlight) {
        logSchedulingAuthEvent('exchange.reuse_inflight');
        return exchangeInFlight;
    }

    logSchedulingAuthEvent('exchange.enqueue');
    const request = performHarborExchange().finally(() => {
        if (exchangeInFlight === request) {
            exchangeInFlight = null;
        }
    });
    exchangeInFlight = request;
    return request;
}

/**
 * 記憶體或 SecureStore 中的 JWT 仍有效則直接回傳，否則觸發 single-flight exchange。
 */
export async function ensureSchedulingSession() {
    const current = getSchedulingSession();
    if (current && !isSchedulingTokenExpired(current)) {
        logSchedulingAuthEvent('session.cache_hit', {
            source: 'memory',
            expiresAt: current.expiresAt,
        });
        return current;
    }

    const hydrated = await hydrateSchedulingSessionFromStorage();
    if (hydrated && !isSchedulingTokenExpired(hydrated)) {
        logSchedulingAuthEvent('session.cache_hit', {
            source: 'secure_store',
            expiresAt: hydrated.expiresAt,
        });
        return hydrated;
    }

    logSchedulingAuthEvent('session.cache_miss', {
        hasSession: Boolean(current),
        expiresAt: current?.expiresAt ?? null,
    });
    return exchangeSchedulingToken();
}

export async function ensureSchedulingAccessToken() {
    const session = await ensureSchedulingSession();
    return session.accessToken;
}

/** 測試用：重置模組狀態 */
export function __resetSchedulingAuthForTests() {
    schedulingSession = null;
    exchangeInFlight = null;
    hydrateInFlight = null;
    harborAuthFailureHandler = null;
}
