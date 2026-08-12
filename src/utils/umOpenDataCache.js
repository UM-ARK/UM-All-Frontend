import {
    getLocalStorage,
    setLocalStorageSilently,
} from './storageKits';

export const UM_EVENT_CACHE_KEY = 'ARK_UM_OPEN_DATA_EVENT_CACHE_V1';
export const UM_NEWS_CACHE_KEY = 'ARK_UM_OPEN_DATA_NEWS_CACHE_V1';

const CACHE_FRESH_MS = 30 * 60 * 1000;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const readUMOpenDataCache = async (cacheKey, now = Date.now()) => {
    const cached = await getLocalStorage(cacheKey);
    if (
        !Array.isArray(cached?.items) ||
        !Number.isFinite(cached?.cachedAt) ||
        now - cached.cachedAt < 0 ||
        now - cached.cachedAt > CACHE_MAX_AGE_MS
    ) {
        return null;
    }

    return {
        items: cached.items,
        isFresh: now - cached.cachedAt < CACHE_FRESH_MS,
    };
};

export const writeUMOpenDataCache = (cacheKey, items) =>
    setLocalStorageSilently(cacheKey, {
        cachedAt: Date.now(),
        items,
    });
