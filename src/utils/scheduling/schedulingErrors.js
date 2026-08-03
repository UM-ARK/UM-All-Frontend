// 組隊約時間 API 錯誤正規化：只保留對使用者安全的欄位

const RETRYABLE_CODES = new Set([
    'harbor_unavailable',
    'membership_update_pending',
    'membership_cleanup_pending',
    'availability_update_pending',
]);

/**
 * 建立正規化後的 Scheduling 錯誤物件。
 * 刻意不附加 headers、Bearer、invite query 或 axios config。
 */
export function createSchedulingError({
    code = 'unknown_error',
    message = '暫時無法完成，請稍後再試',
    status = null,
    retryable = false,
} = {}) {
    const error = new Error(message);
    error.code = code;
    error.status = status;
    error.retryable = Boolean(retryable);
    return error;
}

function readBodyError(error) {
    const body = error?.response?.data;
    if (body && typeof body === 'object' && body.error) {
        return body.error;
    }
    return null;
}

function isAlreadyNormalized(error) {
    return (
        Boolean(error) &&
        typeof error.code === 'string' &&
        typeof error.message === 'string' &&
        Object.prototype.hasOwnProperty.call(error, 'retryable') &&
        !error.config &&
        !error.response &&
        !error.request
    );
}

/**
 * 將 axios／網路錯誤正規化為 {code, message, status, retryable}。
 * 不會把敏感 request 資訊掛到回傳錯誤上。
 */
export function normalizeSchedulingError(error) {
    if (isAlreadyNormalized(error)) {
        return error;
    }

    const status =
        error?.response?.status ??
        (typeof error?.status === 'number' ? error.status : null);
    const bodyError = readBodyError(error);
    const code =
        (typeof bodyError?.code === 'string' && bodyError.code) ||
        (typeof error?.code === 'string' && error.code) ||
        'unknown_error';
    const message =
        (typeof bodyError?.message === 'string' && bodyError.message) ||
        (typeof error?.message === 'string' && error.message) ||
        '暫時無法完成，請稍後再試';

    const retryable =
        status === 503 ||
        RETRYABLE_CODES.has(code) ||
        code === 'ECONNABORTED' ||
        code === 'ERR_NETWORK' ||
        code === 'ETIMEDOUT';

    return createSchedulingError({
        code,
        message,
        status,
        retryable,
    });
}
