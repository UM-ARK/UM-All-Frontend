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
    takeRecentTeamEvents,
} from '../../../utils/scheduling/schedulingModels';

/** 短時間切頁可重用，避免重複 request */
const TEAM_EVENTS_CACHE_TTL_MS = 45 * 1000;

/** 模組級記憶體 cache（JWT 本身也不持久化） */
let teamEventsCache = {
    events: null,
    fetchedAt: 0,
};

/**
 * 清空列表 cache（Harbor 登出或手動 invalidate）
 */
export function clearTeamEventsCache() {
    teamEventsCache = {
        events: null,
        fetchedAt: 0,
    };
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
 *   status: 'idle'|'loading'|'ready'|'error',
 *   error: object|null,
 *   refresh: (options?: {force?: boolean}) => Promise<Array>,
 *   invalidate: () => void,
 * }}
 */
export function useTeamEvents({autoLoad = true} = {}) {
    const {ensureSession, harborStatus} = useSchedulingSession();
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
        clearTeamEventsCache();
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
                clearTeamEventsCache();
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
                await ensureSession();
                const data = await listMyTeamEvents();
                const nextEvents = normalizeTeamEventList(data?.events);
                teamEventsCache = {
                    events: nextEvents,
                    fetchedAt: Date.now(),
                };
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

    useEffect(() => {
        if (!autoLoad || harborStatus !== 'signedIn') {
            return undefined;
        }
        refresh({force: false}).catch(() => {
            // 錯誤已寫入 state
        });
        return undefined;
    }, [autoLoad, harborStatus, refresh]);

    const recentEvents = useMemo(
        () => takeRecentTeamEvents(events),
        [events],
    );

    return {
        events,
        recentEvents,
        status,
        error,
        refresh,
        invalidate,
    };
}

export default useTeamEvents;
