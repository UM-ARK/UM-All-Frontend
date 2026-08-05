/**
 * 組隊約時間列表 hook：ensureSession → listMyTeamEvents，記憶體短 TTL cache
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {useSchedulingSession} from '../../../contexts/SchedulingSessionContext';
import {listMyTeamEvents} from '../../../utils/scheduling/schedulingApi';
import {normalizeSchedulingError} from '../../../utils/scheduling/schedulingErrors';
import {
    normalizeMembership,
    normalizeTeamEvent,
    sortTeamEvents,
    takeRecentTeamEvents,
} from '../../../utils/scheduling/schedulingModels';
import {
    clearTeamScheduleDataCache,
    clearTeamScheduleEventCache,
    ensureTeamScheduleCacheScope,
} from '../utils/teamScheduleDataCache';
import {useTeamEventFavorites} from './useTeamEventFavorites';

/** 短時間切頁可重用，避免重複 request */
const TEAM_EVENTS_CACHE_TTL_MS = 45 * 1000;

/** 模組級記憶體 cache（JWT 本身也不持久化） */
let teamEventsCache = {
    events: null,
    fetchedAt: 0,
};
let teamEventsCacheGeneration = 0;
let teamEventsRequest = null;

/** 已掛載 useTeamEvents 實例的 cache 變更訂閱 */
const cacheListeners = new Set();

function notifyCacheListeners() {
    cacheListeners.forEach(listener => {
        try {
            listener();
        } catch (_error) {
            // 單一訂閱失敗不影響其他實例
        }
    });
}

/**
 * 清空列表 cache（Harbor 登出或手動 invalidate）
 * 會通知已掛載實例，避免返回上一頁仍顯示舊資料
 */
export function clearTeamEventsCache() {
    teamEventsCacheGeneration += 1;
    teamEventsCache = {
        events: null,
        fetchedAt: 0,
    };
    notifyCacheListeners();
}

/**
 * 樂觀移除單一活動（刪除／退出後立即同步已掛載列表）
 * @param {string|number} eventId
 */
export function removeTeamEventFromCache(eventId) {
    const id = eventId != null ? String(eventId) : '';
    if (!id) {
        clearTeamEventsCache();
        return;
    }
    teamEventsCacheGeneration += 1;
    clearTeamScheduleEventCache(id);
    if (Array.isArray(teamEventsCache.events)) {
        teamEventsCache = {
            events: teamEventsCache.events.filter(
                item => String(item?.event?.eventId) !== id,
            ),
            // 標記過期，下次 focus 仍會與伺服器對齊
            fetchedAt: 0,
        };
    } else {
        teamEventsCache = {
            events: null,
            fetchedAt: 0,
        };
    }
    notifyCacheListeners();
}

/**
 * @param {Array} rawEvents
 * @returns {Array<{event: object, membership: object|null}>}
 */
function normalizeTeamEventList(rawEvents) {
    if (!Array.isArray(rawEvents)) {
        return [];
    }
    const result = [];
    for (let i = 0; i < rawEvents.length; i++) {
        const item = rawEvents[i];
        if (!item || typeof item !== 'object') {
            continue;
        }
        const event = normalizeTeamEvent(item.event);
        if (!event?.eventId) {
            continue;
        }
        result.push({
            event,
            membership: normalizeMembership(item.membership),
        });
    }
    return result;
}

function isCacheFresh(now = Date.now()) {
    return (
        Array.isArray(teamEventsCache.events) &&
        now - teamEventsCache.fetchedAt < TEAM_EVENTS_CACHE_TTL_MS
    );
}

/**
 * @param {{autoLoad?: boolean}=} options
 * @returns {{
 *   events: Array,
 *   recentEvents: Array,
 *   favoriteEventIds: Array<string>,
 *   status: 'idle'|'loading'|'ready'|'error',
 *   error: object|null,
 *   refresh: (options?: {force?: boolean}) => Promise<Array>,
 *   invalidate: () => void,
 * }}
 */
export function useTeamEvents({autoLoad = true} = {}) {
    const {ensureSession, harborStatus, user} = useSchedulingSession();
    const cacheScopeChanged = ensureTeamScheduleCacheScope(
        user?.harborUserId,
    );
    if (cacheScopeChanged) {
        teamEventsCacheGeneration += 1;
        teamEventsCache = {
            events: null,
            fetchedAt: 0,
        };
    }
    const {favoriteEventIds} = useTeamEventFavorites();
    const [events, setEvents] = useState(() =>
        Array.isArray(teamEventsCache.events) ? teamEventsCache.events : [],
    );
    const [status, setStatus] = useState(() =>
        Array.isArray(teamEventsCache.events) && isCacheFresh()
            ? 'ready'
            : 'idle',
    );
    const [error, setError] = useState(null);
    const requestIdRef = useRef(0);
    const mountedRef = useRef(true);
    const eventsRef = useRef(events);
    eventsRef.current = events;
    const harborStatusRef = useRef(harborStatus);
    harborStatusRef.current = harborStatus;
    const refreshRef = useRef(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Harbor 登出／還原中：清空 cache 與畫面狀態
    useEffect(() => {
        if (harborStatus === 'signedIn') {
            return;
        }
        requestIdRef.current += 1;
        teamEventsCacheGeneration += 1;
        clearTeamScheduleDataCache();
        // 僅清記憶體，不經 notify，避免與下方 setState 重複
        teamEventsCache = {
            events: null,
            fetchedAt: 0,
        };
        if (!mountedRef.current) {
            return;
        }
        setEvents([]);
        setError(null);
        setStatus('idle');
    }, [harborStatus]);

    const invalidate = useCallback(() => {
        clearTeamEventsCache();
    }, []);

    const refresh = useCallback(
        async ({force = false} = {}) => {
            if (harborStatus !== 'signedIn') {
                teamEventsCache = {
                    events: null,
                    fetchedAt: 0,
                };
                if (mountedRef.current) {
                    setEvents([]);
                    setError(null);
                    setStatus('idle');
                }
                return [];
            }

            const now = Date.now();
            if (!force && isCacheFresh(now)) {
                const cached = teamEventsCache.events || [];
                if (mountedRef.current) {
                    setEvents(cached);
                    setError(null);
                    setStatus('ready');
                }
                return cached;
            }

            const requestId = ++requestIdRef.current;
            if (mountedRef.current) {
                // 已有資料時保持 ready，避免預覽區塊閃 skeleton
                setStatus(current =>
                    current === 'ready' && eventsRef.current.length > 0
                        ? current
                        : 'loading',
                );
            }

            try {
                const generation = teamEventsCacheGeneration;
                if (
                    !teamEventsRequest ||
                    teamEventsRequest.generation !== generation
                ) {
                    const promise = (async () => {
                        const session = await ensureSession();
                        ensureTeamScheduleCacheScope(
                            session?.user?.harborUserId,
                        );
                        const data = await listMyTeamEvents();
                        const nextEvents = normalizeTeamEventList(data?.events);
                        if (generation === teamEventsCacheGeneration) {
                            teamEventsCache = {
                                events: nextEvents,
                                fetchedAt: Date.now(),
                            };
                        }
                        return nextEvents;
                    })().finally(() => {
                        if (teamEventsRequest?.promise === promise) {
                            teamEventsRequest = null;
                        }
                    });
                    teamEventsRequest = {generation, promise};
                }
                const nextEvents = await teamEventsRequest.promise;
                if (!mountedRef.current || requestId !== requestIdRef.current) {
                    return nextEvents;
                }
                setEvents(nextEvents);
                setError(null);
                setStatus('ready');
                return nextEvents;
            } catch (requestError) {
                const normalized = normalizeSchedulingError(requestError);
                if (!mountedRef.current || requestId !== requestIdRef.current) {
                    throw normalized;
                }
                setError(normalized);
                setStatus('error');
                throw normalized;
            }
        },
        [ensureSession, harborStatus],
    );
    refreshRef.current = refresh;

    // 其他頁面 invalidate／樂觀移除時，同步本實例畫面
    useEffect(() => {
        const onCacheChange = () => {
            if (!mountedRef.current) {
                return;
            }
            if (Array.isArray(teamEventsCache.events)) {
                setEvents(teamEventsCache.events);
                setError(null);
                setStatus('ready');
                return;
            }
            if (harborStatusRef.current !== 'signedIn') {
                setEvents([]);
                setError(null);
                setStatus('idle');
                return;
            }
            // cache 被清空：強制重抓，避免停留在舊列表
            const refreshFn = refreshRef.current;
            if (typeof refreshFn === 'function') {
                refreshFn({force: true}).catch(() => {});
            }
        };
        cacheListeners.add(onCacheChange);
        return () => {
            cacheListeners.delete(onCacheChange);
        };
    }, []);

    useEffect(() => {
        if (!autoLoad || harborStatus !== 'signedIn') {
            return undefined;
        }
        refresh({force: false}).catch(() => {
            // 錯誤已寫入 state
        });
        return undefined;
    }, [autoLoad, harborStatus, refresh]);

    const sortedEvents = useMemo(
        () => sortTeamEvents(events, favoriteEventIds),
        [events, favoriteEventIds],
    );
    const recentEvents = useMemo(
        () => takeRecentTeamEvents(sortedEvents),
        [sortedEvents],
    );

    return {
        events: sortedEvents,
        recentEvents,
        favoriteEventIds,
        status,
        error,
        refresh,
        invalidate,
    };
}

export default useTeamEvents;
