import axios from 'axios';

import {loadHarborCredentials} from '../harbor/harborAuthStorage';
import {
    createSchedulingError,
    normalizeSchedulingError,
} from './schedulingErrors';

// Scheduling API 專用 base（不可拼接以 /api/ 結尾的 BASE_URI）
// TODO: 上線前修改 umall.one
export const SCHEDULING_BASE_URI = 'http://127.0.0.1:8000/api/v2';
// export const SCHEDULING_BASE_URI = 'https://umall.one/api/v2';

const REQUEST_TIMEOUT = 15000;
// 過期前預留約 30 秒，避免邊界請求帶上即將失效的 JWT
export const SCHEDULING_TOKEN_EXPIRY_SKEW_MS = 30 * 1000;

/** @type {{accessToken: string, expiresAt: string, user: object}|null} */
let schedulingSession = null;
/** @type {Promise<object>|null} */
let exchangeInFlight = null;
/** @type {((error: Error) => void)|null} */
let harborAuthFailureHandler = null;

export function getSchedulingSession() {
    return schedulingSession;
}

/**
 * 僅保存在記憶體；禁止寫入 storageKits／AsyncStorage。
 */
export function setSchedulingSession(session) {
    if (
        !session?.accessToken ||
        !session?.expiresAt ||
        typeof session.accessToken !== 'string'
    ) {
        schedulingSession = null;
        return null;
    }

    schedulingSession = {
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
        user: session.user || null,
    };
    return schedulingSession;
}

export function clearSchedulingSession() {
    schedulingSession = null;
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
        throw createSchedulingError({
            code: 'invalid_exchange_response',
            message: '換票回應格式無效',
            status: null,
            retryable: false,
        });
    }

    return setSchedulingSession({
        accessToken: data.accessToken,
        expiresAt: data.expiresAt,
        user: data.user || null,
    });
}

async function performHarborExchange() {
    const credentials = await loadHarborCredentials();
    if (!credentials?.userApiKey || !credentials?.clientId) {
        throw createSchedulingError({
            code: 'authentication_required',
            message: '請先登入 Harbor',
            status: 401,
            retryable: false,
        });
    }

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
        return normalizeExchangeResponse(response.data);
    } catch (error) {
        const normalized = normalizeSchedulingError(error);
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
        return exchangeInFlight;
    }

    const request = performHarborExchange().finally(() => {
        if (exchangeInFlight === request) {
            exchangeInFlight = null;
        }
    });
    exchangeInFlight = request;
    return request;
}

/**
 * 若記憶體中的 JWT 仍有效則直接回傳，否則觸發 single-flight exchange。
 */
export async function ensureSchedulingSession() {
    const current = getSchedulingSession();
    if (current && !isSchedulingTokenExpired(current)) {
        return current;
    }
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
    harborAuthFailureHandler = null;
}
