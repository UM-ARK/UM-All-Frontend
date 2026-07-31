const HARBOR_LOG_PREFIX = '[HarborAuth]';

export function logHarborAuthEvent(event, details) {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
        return;
    }

    if (details === undefined) {
        console.log(`${HARBOR_LOG_PREFIX} ${event}`);
        return;
    }

    console.log(`${HARBOR_LOG_PREFIX} ${event}`, details);
}

export function logHarborAuthError(event, error, details = {}) {
    logHarborAuthEvent(event, {
        ...details,
        errorName: error?.name || 'Error',
        errorCode: error?.code ?? null,
        errorMessage: error?.message || String(error),
        httpStatus: error?.response?.status ?? null,
    });
}
