/**
 * 組隊資料的模組級記憶體 cache；App 重啟或 Harbor 登出後不保留。
 */

export const TEAM_EVENT_DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;
export const TEAM_EVENT_SUMMARY_CACHE_TTL_MS = 45 * 1000;
export const TEAM_SHARED_TIMETABLES_CACHE_TTL_MS = 45 * 1000;

const detailCache = new Map();
const summaryCache = new Map();
const sharedTimetablesCache = new Map();
const inFlightRequests = new Map();
let cacheGeneration = 0;
let cacheScope = null;

function cacheKey(eventId) {
    return eventId != null ? String(eventId) : '';
}

export function ensureTeamScheduleCacheScope(harborUserId) {
    const nextScope = harborUserId != null ? String(harborUserId) : null;
    if (nextScope === cacheScope) {
        return false;
    }
    clearTeamScheduleDataCache();
    cacheScope = nextScope;
    return true;
}

function readFresh(cache, eventId, ttlMs, now = Date.now()) {
    const entry = cache.get(cacheKey(eventId));
    if (!entry || now - entry.fetchedAt >= ttlMs) {
        return null;
    }
    return entry;
}

function peek(cache, eventId) {
    return cache.get(cacheKey(eventId)) || null;
}

async function loadCached({cache, eventId, ttlMs, requestKey, loader, force}) {
    const key = cacheKey(eventId);
    if (!key) {
        return null;
    }
    if (!force) {
        const cached = readFresh(cache, key, ttlMs);
        if (cached) {
            return cached;
        }
    }
    const existingRequest = inFlightRequests.get(requestKey);
    if (existingRequest) {
        return existingRequest;
    }
    const generation = cacheGeneration;
    const request = Promise.resolve()
        .then(loader)
        .then(value => {
            const entry = {value, fetchedAt: Date.now()};
            if (generation === cacheGeneration) {
                cache.set(key, entry);
            }
            return entry;
        })
        .finally(() => {
            if (inFlightRequests.get(requestKey) === request) {
                inFlightRequests.delete(requestKey);
            }
        });
    inFlightRequests.set(requestKey, request);
    return request;
}

function patchCache(cache, eventId, requestPrefix, updater) {
    const key = cacheKey(eventId);
    if (!key) {
        return null;
    }
    const current = cache.get(key)?.value ?? null;
    const value = typeof updater === 'function' ? updater(current) : updater;
    if (value == null) {
        cache.delete(key);
        return value;
    }
    cacheGeneration += 1;
    inFlightRequests.delete(`${requestPrefix}:${key}`);
    cache.set(key, {value, fetchedAt: Date.now()});
    return value;
}

export function getCachedTeamEventDetail(eventId, now = Date.now()) {
    return readFresh(
        detailCache,
        eventId,
        TEAM_EVENT_DETAIL_CACHE_TTL_MS,
        now,
    );
}

export function peekCachedTeamEventDetail(eventId) {
    return peek(detailCache, eventId);
}

export function getCachedTeamEventSummary(eventId, now = Date.now()) {
    return readFresh(
        summaryCache,
        eventId,
        TEAM_EVENT_SUMMARY_CACHE_TTL_MS,
        now,
    );
}

export function peekCachedTeamEventSummary(eventId) {
    return peek(summaryCache, eventId);
}

export function getCachedSharedTimetables(eventId, now = Date.now()) {
    return readFresh(
        sharedTimetablesCache,
        eventId,
        TEAM_SHARED_TIMETABLES_CACHE_TTL_MS,
        now,
    );
}

export function peekCachedSharedTimetables(eventId) {
    return peek(sharedTimetablesCache, eventId);
}

export function loadCachedTeamEventDetail(eventId, loader, {force = false} = {}) {
    const key = cacheKey(eventId);
    return loadCached({
        cache: detailCache,
        eventId: key,
        ttlMs: TEAM_EVENT_DETAIL_CACHE_TTL_MS,
        requestKey: `detail:${key}`,
        loader,
        force,
    });
}

export function loadCachedTeamEventSummary(eventId, loader, {force = false} = {}) {
    const key = cacheKey(eventId);
    return loadCached({
        cache: summaryCache,
        eventId: key,
        ttlMs: TEAM_EVENT_SUMMARY_CACHE_TTL_MS,
        requestKey: `summary:${key}`,
        loader,
        force,
    });
}

export function loadCachedSharedTimetables(eventId, loader, {force = false} = {}) {
    const key = cacheKey(eventId);
    return loadCached({
        cache: sharedTimetablesCache,
        eventId: key,
        ttlMs: TEAM_SHARED_TIMETABLES_CACHE_TTL_MS,
        requestKey: `shared:${key}`,
        loader,
        force,
    });
}

export function patchCachedTeamEventDetail(eventId, updater) {
    return patchCache(detailCache, eventId, 'detail', updater);
}

export function patchCachedTeamEventSummary(eventId, updater) {
    return patchCache(summaryCache, eventId, 'summary', updater);
}

export function patchCachedSharedTimetables(eventId, updater) {
    return patchCache(sharedTimetablesCache, eventId, 'shared', updater);
}

export function clearTeamScheduleEventCache(eventId) {
    const key = cacheKey(eventId);
    cacheGeneration += 1;
    detailCache.delete(key);
    summaryCache.delete(key);
    sharedTimetablesCache.delete(key);
    inFlightRequests.delete(`detail:${key}`);
    inFlightRequests.delete(`summary:${key}`);
    inFlightRequests.delete(`shared:${key}`);
}

export function clearTeamScheduleDataCache() {
    cacheGeneration += 1;
    detailCache.clear();
    summaryCache.clear();
    sharedTimetablesCache.clear();
    inFlightRequests.clear();
}
