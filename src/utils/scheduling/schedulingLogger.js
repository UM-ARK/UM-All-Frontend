const SCHEDULING_LOG_PREFIX = '[SchedulingAuth]';

export function logSchedulingAuthEvent(event, details) {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
        return;
    }

    if (details === undefined) {
        console.log(`${SCHEDULING_LOG_PREFIX} ${event}`);
        return;
    }

    console.log(`${SCHEDULING_LOG_PREFIX} ${event}`, details);
}

/**
 * 只記錄安全欄位；勿把 User-Api-Key／Bearer／完整 response body 寫入 log。
 */
export function logSchedulingAuthError(event, error, details = {}) {
    logSchedulingAuthEvent(event, {
        ...details,
        errorName: error?.name || 'Error',
        errorCode: error?.code ?? null,
        errorMessage: error?.message || String(error),
        httpStatus: error?.response?.status ?? error?.status ?? null,
        retryable: error?.retryable ?? null,
    });
}
