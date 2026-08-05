/**
 * 組隊詳情：並行載入 detail／summary、邀請加入、下拉與前景刷新
 */
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState} from 'react-native';

import {useIsFocused} from '@react-navigation/native';

import {useSchedulingSession} from '../../../contexts/SchedulingSessionContext';
import {logToFirebase} from '../../../utils/firebaseAnalytics';
import {
    getTeamEvent,
    getTeamEventSummary,
    joinTeamEvent,
} from '../../../utils/scheduling/schedulingApi';
import {normalizeSchedulingError} from '../../../utils/scheduling/schedulingErrors';
import {
    normalizeMembership,
    normalizeTeamEvent,
} from '../../../utils/scheduling/schedulingModels';
import {
    clearTeamScheduleDataCache,
    clearTeamScheduleEventCache,
    ensureTeamScheduleCacheScope,
    loadCachedTeamEventDetail,
    loadCachedTeamEventSummary,
    patchCachedTeamEventDetail,
    patchCachedTeamEventSummary,
    peekCachedTeamEventDetail,
    peekCachedTeamEventSummary,
    TEAM_EVENT_SUMMARY_CACHE_TTL_MS,
} from '../utils/teamScheduleDataCache';
import {clearTeamEventsCache} from './useTeamEvents';

/**
 * 正規化 detail response
 * @param {object} data
 * @returns {{event: object|null, membership: object|null, inviteLink: object|null}}
 */
function normalizeDetailResponse(data) {
    const event = normalizeTeamEvent(data?.event || data);
    const membership = normalizeMembership(
        data?.membership || data?.event?.membership || null,
    );
    const inviteLink =
        data?.inviteLink && typeof data.inviteLink === 'object'
            ? data.inviteLink
            : null;
    return {event, membership, inviteLink};
}

/**
 * 正規化 summary response，並用 eventId 對齊
 * @param {object} data
 * @param {string} expectedEventId
 * @returns {{event: object|null, members: Array, summaryRevision: number|null, generatedAt: string|null}}
 */
function normalizeSummaryResponse(data, expectedEventId) {
    const event = normalizeTeamEvent(data?.event);
    const eventId = event?.eventId || data?.event?.eventId;
    if (
        expectedEventId &&
        eventId &&
        String(eventId) !== String(expectedEventId)
    ) {
        throw normalizeSchedulingError({
            code: 'event_mismatch',
            message: '詳情與摘要活動不一致',
            status: 409,
            retryable: true,
        });
    }
    const members = Array.isArray(data?.members) ? data.members : [];
    return {
        event,
        members,
        summaryRevision:
            typeof data?.summaryRevision === 'number'
                ? data.summaryRevision
                : null,
        generatedAt: data?.generatedAt || null,
    };
}

/**
 * @param {object} options
 * @param {string} options.eventId
 * @param {string|null|undefined} [options.initialInviteToken] 僅傳入一次；由呼叫端 scrub 後保留
 * @param {boolean} [options.harborSignedIn]
 */
export function useTeamScheduleDetail({
    eventId,
    initialInviteToken = null,
    harborSignedIn = false,
} = {}) {
    const {ensureSession, user} = useSchedulingSession();
    const isFocused = useIsFocused();
    ensureTeamScheduleCacheScope(user?.harborUserId);

    const inviteTokenRef = useRef(
        initialInviteToken != null && initialInviteToken !== ''
            ? String(initialInviteToken)
            : null,
    );
    const hasInviteFlow = useRef(Boolean(inviteTokenRef.current));
    const initialDetailCache = peekCachedTeamEventDetail(eventId);
    const initialSummaryCache = peekCachedTeamEventSummary(eventId);
    const canUseInitialCache = Boolean(
        harborSignedIn &&
            !inviteTokenRef.current &&
            initialDetailCache &&
            initialSummaryCache,
    );

    const [phase, setPhase] = useState(() => {
        if (!harborSignedIn) {
            return inviteTokenRef.current ? 'need_login' : 'need_login';
        }
        if (inviteTokenRef.current) {
            return 'joining';
        }
        return canUseInitialCache ? 'ready' : 'loading';
    });
    const [detailEvent, setDetailEvent] = useState(() =>
        canUseInitialCache ? initialDetailCache.value.event : null,
    );
    const [membership, setMembership] = useState(() =>
        canUseInitialCache ? initialDetailCache.value.membership : null,
    );
    const [inviteLink, setInviteLink] = useState(() =>
        canUseInitialCache ? initialDetailCache.value.inviteLink : null,
    );
    const [summaryEvent, setSummaryEvent] = useState(() =>
        canUseInitialCache ? initialSummaryCache.value.event : null,
    );
    const [members, setMembers] = useState(() =>
        canUseInitialCache ? initialSummaryCache.value.members : [],
    );
    const [summaryRevision, setSummaryRevision] = useState(() =>
        canUseInitialCache ? initialSummaryCache.value.summaryRevision : null,
    );
    const [error, setError] = useState(null);
    const [joinError, setJoinError] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const requestIdRef = useRef(0);
    const mountedRef = useRef(true);
    const fetchedAtRef = useRef(
        canUseInitialCache ? initialSummaryCache.fetchedAt : 0,
    );
    const appStateRef = useRef(AppState.currentState);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    const clearInviteToken = useCallback(() => {
        inviteTokenRef.current = null;
    }, []);

    const applyDetail = useCallback(detail => {
        setDetailEvent(detail.event);
        setMembership(detail.membership);
        setInviteLink(detail.inviteLink);
    }, []);

    const applySummary = useCallback(summary => {
        setSummaryEvent(summary.event);
        setMembers(summary.members);
        setSummaryRevision(summary.summaryRevision);
    }, []);

    /**
     * 並行取得 detail + summary
     * @param {{force?: boolean, showRefresh?: boolean}} [options]
     */
    const loadDetailAndSummary = useCallback(
        async ({force = false, showRefresh = false} = {}) => {
            if (!eventId || !harborSignedIn) {
                return null;
            }

            const requestId = ++requestIdRef.current;
            if (showRefresh) {
                setIsRefreshing(true);
            } else if (mountedRef.current && !detailEvent) {
                setPhase(current =>
                    current === 'ready' || current === 'joining'
                        ? current
                        : 'loading',
                );
            }

            try {
                const session = await ensureSession();
                ensureTeamScheduleCacheScope(
                    session?.user?.harborUserId,
                );
                const [detailEntry, summaryEntry] = await Promise.all([
                    loadCachedTeamEventDetail(
                        eventId,
                        async () => normalizeDetailResponse(
                            await getTeamEvent(eventId),
                        ),
                        {force},
                    ),
                    loadCachedTeamEventSummary(
                        eventId,
                        async () => normalizeSummaryResponse(
                            await getTeamEventSummary(eventId),
                            eventId,
                        ),
                        {force},
                    ),
                ]);
                const detail = detailEntry.value;
                const summary = summaryEntry.value;
                const detailId = detail.event?.eventId;
                const summaryId = summary.event?.eventId;
                if (
                    detailId &&
                    summaryId &&
                    String(detailId) !== String(summaryId)
                ) {
                    throw normalizeSchedulingError({
                        code: 'event_mismatch',
                        message: '詳情與摘要活動不一致',
                        status: 409,
                        retryable: true,
                    });
                }

                if (!mountedRef.current || requestId !== requestIdRef.current) {
                    return {detail, summary};
                }

                applyDetail(detail);
                applySummary(summary);
                fetchedAtRef.current = summaryEntry.fetchedAt;
                setError(null);
                setJoinError(null);
                setPhase('ready');
                return {detail, summary};
            } catch (requestError) {
                const normalized = normalizeSchedulingError(requestError);
                if (!mountedRef.current || requestId !== requestIdRef.current) {
                    throw normalized;
                }
                setError(normalized);
                if (!detailEvent) {
                    setPhase('error');
                }
                throw normalized;
            } finally {
                if (mountedRef.current && requestId === requestIdRef.current) {
                    setIsRefreshing(false);
                }
            }
        },
        [
            applyDetail,
            applySummary,
            detailEvent,
            ensureSession,
            eventId,
            harborSignedIn,
        ],
    );

    /**
     * 僅刷新 summary（前景回補）；必要時一併刷 detail
     */
    const refreshSummary = useCallback(
        async ({includeDetail = false} = {}) => {
            if (!eventId || !harborSignedIn) {
                return null;
            }
            const requestId = ++requestIdRef.current;
            try {
                const session = await ensureSession();
                ensureTeamScheduleCacheScope(
                    session?.user?.harborUserId,
                );
                if (includeDetail) {
                    const [detailEntry, summaryEntry] = await Promise.all([
                        loadCachedTeamEventDetail(
                            eventId,
                            async () => normalizeDetailResponse(
                                await getTeamEvent(eventId),
                            ),
                        ),
                        loadCachedTeamEventSummary(
                            eventId,
                            async () => normalizeSummaryResponse(
                                await getTeamEventSummary(eventId),
                                eventId,
                            ),
                        ),
                    ]);
                    const detail = detailEntry.value;
                    const summary = summaryEntry.value;
                    if (
                        !mountedRef.current ||
                        requestId !== requestIdRef.current
                    ) {
                        return {detail, summary};
                    }
                    applyDetail(detail);
                    applySummary(summary);
                    fetchedAtRef.current = summaryEntry.fetchedAt;
                } else {
                    const summaryEntry = await loadCachedTeamEventSummary(
                        eventId,
                        async () => normalizeSummaryResponse(
                            await getTeamEventSummary(eventId),
                            eventId,
                        ),
                    );
                    const summary = summaryEntry.value;
                    if (
                        !mountedRef.current ||
                        requestId !== requestIdRef.current
                    ) {
                        return {summary};
                    }
                    applySummary(summary);
                    fetchedAtRef.current = summaryEntry.fetchedAt;
                }
                setError(null);
                setPhase('ready');
                return true;
            } catch (requestError) {
                const normalized = normalizeSchedulingError(requestError);
                if (!mountedRef.current || requestId !== requestIdRef.current) {
                    throw normalized;
                }
                // 前景刷新失敗不強制蓋成全頁 error（已有資料時）
                if (!detailEvent) {
                    setError(normalized);
                    setPhase('error');
                }
                throw normalized;
            }
        },
        [
            applyDetail,
            applySummary,
            detailEvent,
            ensureSession,
            eventId,
            harborSignedIn,
        ],
    );

    const joinWithInvite = useCallback(async () => {
        if (!eventId || !harborSignedIn) {
            return false;
        }
        const token = inviteTokenRef.current;
        if (!token) {
            // 無 token：直接當普通詳情載入
            await loadDetailAndSummary({});
            return true;
        }

        setPhase('joining');
        setJoinError(null);
        try {
            await ensureSession();
            await joinTeamEvent(eventId, token);
            logToFirebase('team_schedule_join', {method: 'invite'});
            clearInviteToken();
            hasInviteFlow.current = false;
            // 與新建組隊一致：清列表 cache，返回「我的」／列表才會看到新 membership
            clearTeamEventsCache();
            clearTeamScheduleEventCache(eventId);
            await loadDetailAndSummary({force: true});
            return true;
        } catch (requestError) {
            const normalized = normalizeSchedulingError(requestError);
            // 網路暫時失敗：保留 token 供重試
            const keepToken =
                normalized.retryable === true ||
                normalized.status === 503 ||
                normalized.code === 'harbor_unavailable' ||
                normalized.code === 'membership_create_pending' ||
                normalized.code === 'availability_update_pending';
            if (!keepToken) {
                clearInviteToken();
            }
            if (mountedRef.current) {
                setJoinError(normalized);
                setPhase('join_error');
            }
            throw normalized;
        }
    }, [
        clearInviteToken,
        ensureSession,
        eventId,
        harborSignedIn,
        loadDetailAndSummary,
    ]);

    // Harbor 登入狀態變化：登入後自動 join 或載入
    useEffect(() => {
        if (!eventId) {
            setPhase('error');
            setError(
                normalizeSchedulingError({
                    code: 'event_not_found',
                    message: '活動不存在',
                    status: 404,
                    retryable: false,
                }),
            );
            return undefined;
        }

        if (!harborSignedIn) {
            clearTeamScheduleDataCache();
            setPhase('need_login');
            return undefined;
        }

        let cancelled = false;
        const run = async () => {
            if (inviteTokenRef.current) {
                try {
                    if (!cancelled) {
                        await joinWithInvite();
                    }
                } catch (_error) {
                    // 已寫入 joinError
                }
                return;
            }
            try {
                if (!cancelled) {
                    await loadDetailAndSummary({});
                }
            } catch (_error) {
                // 已寫入 error
            }
        };
        run();
        return () => {
            cancelled = true;
        };
        // 僅在 eventId／登入態變化時重跑
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId, harborSignedIn]);

    // App 回前景：focused + stale → 刷 summary（必要時 detail）
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            const wasBackground =
                appStateRef.current === 'background' ||
                appStateRef.current === 'inactive';
            appStateRef.current = nextState;
            if (nextState !== 'active' || !wasBackground) {
                return;
            }
            if (!isFocused || phase !== 'ready' || !harborSignedIn) {
                return;
            }
            const stale =
                Date.now() - fetchedAtRef.current >=
                TEAM_EVENT_SUMMARY_CACHE_TTL_MS;
            if (!stale) {
                return;
            }
            refreshSummary({includeDetail: true}).catch(() => {});
        });
        return () => subscription.remove();
    }, [harborSignedIn, isFocused, phase, refreshSummary]);

    // Focus 且過期時刷新
    useEffect(() => {
        if (!isFocused || phase !== 'ready' || !harborSignedIn) {
            return;
        }
        const stale =
            Date.now() - fetchedAtRef.current >=
            TEAM_EVENT_SUMMARY_CACHE_TTL_MS;
        if (!stale) {
            return;
        }
        refreshSummary({includeDetail: false}).catch(() => {});
    }, [harborSignedIn, isFocused, phase, refreshSummary]);

    const refresh = useCallback(async () => {
        try {
            await loadDetailAndSummary({force: true, showRefresh: true});
        } catch (_error) {
            // 錯誤已寫入
        }
    }, [loadDetailAndSummary]);

    /**
     * PUT 成功後局部替換本人 availability
     */
    const patchMyAvailability = useCallback(
        (availability, nextSummaryRevision) => {
            requestIdRef.current += 1;
            setMembers(current => {
                if (!Array.isArray(current)) {
                    return current;
                }
                const myId = membership?.harborUserId;
                if (myId == null) {
                    return current;
                }
                return current.map(member => {
                    if (
                        member &&
                        String(member.harborUserId) === String(myId)
                    ) {
                        return {...member, availability};
                    }
                    return member;
                });
            });
            if (typeof nextSummaryRevision === 'number') {
                setSummaryRevision(nextSummaryRevision);
            }
            patchCachedTeamEventSummary(eventId, current => {
                if (!current) {
                    return current;
                }
                const myId = membership?.harborUserId;
                return {
                    ...current,
                    members: current.members.map(member =>
                        myId != null &&
                        String(member?.harborUserId) === String(myId)
                            ? {...member, availability}
                            : member,
                    ),
                    summaryRevision:
                        typeof nextSummaryRevision === 'number'
                            ? nextSummaryRevision
                            : current.summaryRevision,
                };
            });
            fetchedAtRef.current = Date.now();
        },
        [eventId, membership?.harborUserId],
    );

    const replaceMembers = useCallback(nextMembers => {
        requestIdRef.current += 1;
        const normalizedMembers = Array.isArray(nextMembers) ? nextMembers : [];
        setMembers(normalizedMembers);
        patchCachedTeamEventSummary(eventId, current =>
            current ? {...current, members: normalizedMembers} : current,
        );
    }, [eventId]);

    const updateDetailEvent = useCallback(nextEvent => {
        const normalized = normalizeTeamEvent(nextEvent);
        if (normalized) {
            requestIdRef.current += 1;
            setDetailEvent(normalized);
            patchCachedTeamEventDetail(eventId, current =>
                current ? {...current, event: normalized} : current,
            );
            // 同步 summary.status，避免合併顯示仍用舊狀態
            if (normalized.status != null) {
                setSummaryEvent(prev =>
                    prev ? {...prev, status: normalized.status} : prev,
                );
                patchCachedTeamEventSummary(eventId, current =>
                    current?.event
                        ? {
                              ...current,
                              event: {...current.event, status: normalized.status},
                          }
                        : current,
                );
            }
        }
    }, [eventId]);

    const updateInviteLink = useCallback(nextInviteLink => {
        requestIdRef.current += 1;
        setInviteLink(nextInviteLink);
        patchCachedTeamEventDetail(eventId, current =>
            current ? {...current, inviteLink: nextInviteLink} : current,
        );
    }, [eventId]);

    // 顯示用 event：標題／說明以 detail 為準（summary 省略 description）
    const event = useMemo(() => {
        if (!detailEvent && !summaryEvent) {
            return null;
        }
        if (!detailEvent) {
            return summaryEvent;
        }
        if (!summaryEvent) {
            return detailEvent;
        }
        return {
            ...summaryEvent,
            ...detailEvent,
            // summary 可能較新的 status／deadline／revision
            status: detailEvent.status ?? summaryEvent.status,
            responseDeadlineAt:
                detailEvent.responseDeadlineAt ??
                summaryEvent.responseDeadlineAt,
            summaryRevision:
                summaryRevision ??
                detailEvent.summaryRevision ??
                summaryEvent.summaryRevision,
            candidateWindows:
                detailEvent.candidateWindows?.length > 0
                    ? detailEvent.candidateWindows
                    : summaryEvent.candidateWindows,
        };
    }, [detailEvent, summaryEvent, summaryRevision]);

    const isInvitePending = Boolean(
        hasInviteFlow.current &&
            (phase === 'joining' ||
                phase === 'join_error' ||
                phase === 'need_login'),
    );

    return {
        phase,
        event,
        detailEvent,
        summaryEvent,
        membership,
        inviteLink,
        members,
        summaryRevision,
        error,
        joinError,
        isRefreshing,
        isInvitePending,
        hasInviteToken: () => Boolean(inviteTokenRef.current),
        refresh,
        retryJoin: joinWithInvite,
        loadDetailAndSummary,
        refreshSummary,
        patchMyAvailability,
        replaceMembers,
        updateDetailEvent,
        updateInviteLink,
        clearInviteToken,
    };
}

export default useTeamScheduleDetail;
