// Harbor 429 時，若伺服器未回傳等待秒數，APP 端統一使用此時長
export const HARBOR_RATE_LIMIT_DEFAULT_DELAY_MS = 10 * 1000;

let harborRateLimitRetryAt = 0;

function getHeader(headers, name) {
    if (typeof headers?.get === 'function') {
        return headers.get(name);
    }
    const directValue = headers?.[name] ?? headers?.[name.toLowerCase()];
    if (directValue != null) {
        return directValue;
    }

    const matchingKey = Object.keys(headers || {}).find(
        key => key.toLowerCase() === name.toLowerCase(),
    );
    return matchingKey ? headers[matchingKey] : undefined;
}

function secondsToMilliseconds(value) {
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds >= 0
        ? Math.max(1000, Math.ceil(seconds * 1000))
        : null;
}

export function isHarborRateLimited(error) {
    return error?.response?.status === 429;
}

export function getHarborRateLimitDelayMs(error, now = Date.now()) {
    if (!isHarborRateLimited(error)) {
        return 0;
    }

    const responseData = error?.response?.data;
    const bodyDelay = secondsToMilliseconds(
        responseData?.extras?.wait_seconds ??
        responseData?.wait_seconds ??
        responseData?.retry_after,
    );
    if (bodyDelay != null) {
        return bodyDelay;
    }

    const retryAfter = getHeader(error?.response?.headers, 'retry-after');
    const headerDelay = secondsToMilliseconds(retryAfter);
    if (headerDelay != null) {
        return headerDelay;
    }

    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) {
        return Math.max(1000, retryDate - now);
    }

    return HARBOR_RATE_LIMIT_DEFAULT_DELAY_MS;
}

export function recordHarborRateLimit(error, now = Date.now()) {
    const delay = getHarborRateLimitDelayMs(error, now);
    if (delay > 0) {
        harborRateLimitRetryAt = Math.max(
            harborRateLimitRetryAt,
            now + delay,
        );
    }
    return harborRateLimitRetryAt;
}

export function getHarborRateLimitRemainingMs(now = Date.now()) {
    return Math.max(0, harborRateLimitRetryAt - now);
}

export function createHarborRateLimitCooldownError(now = Date.now()) {
    const remainingMs = getHarborRateLimitRemainingMs(now);
    if (remainingMs <= 0) {
        return null;
    }
    const error = new Error('Harbor rate limit cooldown is active');
    error.code = 'HARBOR_RATE_LIMIT_COOLDOWN';
    error.response = {
        status: 429,
        data: {
            extras: {
                wait_seconds: Math.ceil(remainingMs / 1000),
            },
        },
    };
    return error;
}

export function clearHarborRateLimitCooldown() {
    harborRateLimitRetryAt = 0;
}
