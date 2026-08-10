const getResultPosition = result => {
    const points = Array.isArray(result?.cornerPoints)
        ? result.cornerPoints.filter(
            point => Number.isFinite(point?.x) && Number.isFinite(point?.y),
        )
        : [];

    if (points.length > 0) {
        return {
            x: Math.min(...points.map(point => point.x)),
            y: Math.min(...points.map(point => point.y)),
        };
    }

    const origin = result?.bounds?.origin;
    return {
        x: Number.isFinite(origin?.x) ? origin.x : Number.MAX_SAFE_INTEGER,
        y: Number.isFinite(origin?.y) ? origin.y : Number.MAX_SAFE_INTEGER,
    };
};

/**
 * 清理掃碼結果、移除重複內容，並按圖片內由上至下、由左至右排序。
 */
export const normalizeImageQrResults = results => {
    if (!Array.isArray(results)) {
        return [];
    }

    const seen = new Set();
    return results
        .map(result => ({
            ...result,
            data: typeof result?.data === 'string' ? result.data.trim() : '',
            position: getResultPosition(result),
        }))
        .filter(result => {
            if (!result.data || seen.has(result.data)) {
                return false;
            }
            seen.add(result.data);
            return true;
        })
        .sort((left, right) =>
            left.position.y - right.position.y ||
            left.position.x - right.position.x,
        );
};

/**
 * 只允許看圖器把 HTTP(S) 二維碼交給瀏覽器，其餘內容只供複製。
 */
export const getImageQrHttpUrl = value => {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmedValue = value.trim();
    try {
        const parsedUrl = new URL(trimmedValue);
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return null;
        }
        return trimmedValue;
    } catch (_error) {
        return null;
    }
};

export const getImageQrDisplayHost = value => {
    const url = getImageQrHttpUrl(value);
    if (!url) {
        return null;
    }

    try {
        return new URL(url).hostname || null;
    } catch (_error) {
        return null;
    }
};
