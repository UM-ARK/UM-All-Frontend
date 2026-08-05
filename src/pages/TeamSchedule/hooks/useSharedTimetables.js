/**
 * 小組課表共享：延後讀取、本人 mutation 與過期回應保護。
 */
import {useCallback, useEffect, useRef, useState} from 'react';

import {
    deleteMySharedTimetable,
    getMySharedTimetable,
    getTeamSharedTimetables,
    putMySharedTimetable,
} from '../../../utils/scheduling/schedulingApi';
import {normalizeSchedulingError} from '../../../utils/scheduling/schedulingErrors';
import {normalizeSharedTimetable} from '../utils/sharedTimetable';
import {
    getCachedSharedTimetables,
    ensureTeamScheduleCacheScope,
    loadCachedSharedTimetables,
    patchCachedSharedTimetables,
    peekCachedSharedTimetables,
} from '../utils/teamScheduleDataCache';

function pickSharedTimetable(data) {
    return normalizeSharedTimetable(data?.sharedTimetable || data);
}

function pickMembers(data) {
    return Array.isArray(data?.members)
        ? data.members
        : Array.isArray(data)
          ? data
          : [];
}

export function useSharedTimetables({eventId, myHarborUserId} = {}) {
    ensureTeamScheduleCacheScope(myHarborUserId);
    const initialCache = peekCachedSharedTimetables(eventId);
    const initialMembers = Array.isArray(initialCache?.value)
        ? initialCache.value
        : [];
    const initialMine = initialMembers.find(member =>
        myHarborUserId != null &&
        String(member?.harborUserId) === String(myHarborUserId),
    );
    const [phase, setPhase] = useState(initialCache ? 'ready' : 'idle');
    const [members, setMembers] = useState(initialMembers);
    const [mySharedTimetable, setMySharedTimetable] = useState(() =>
        normalizeSharedTimetable(initialMine?.sharedTimetable),
    );
    const [error, setError] = useState(null);
    const requestIdRef = useRef(0);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        requestIdRef.current += 1;
        const cached = peekCachedSharedTimetables(eventId);
        const nextMembers = Array.isArray(cached?.value) ? cached.value : [];
        const mine = nextMembers.find(member =>
            myHarborUserId != null &&
            String(member?.harborUserId) === String(myHarborUserId),
        );
        setPhase(cached ? 'ready' : 'idle');
        setMembers(nextMembers);
        setMySharedTimetable(
            normalizeSharedTimetable(mine?.sharedTimetable),
        );
        setError(null);
    }, [eventId, myHarborUserId]);

    const patchMySnapshot = useCallback(snapshot => {
        const normalized = normalizeSharedTimetable(snapshot);
        requestIdRef.current += 1;
        setMySharedTimetable(normalized);
        setMembers(current => {
            const nextMembers = current.map(member => {
                if (
                    myHarborUserId != null &&
                    String(member?.harborUserId) === String(myHarborUserId)
                ) {
                    return {...member, sharedTimetable: normalized};
                }
                return member;
            });
            patchCachedSharedTimetables(eventId, nextMembers);
            return nextMembers;
        });
        return normalized;
    }, [eventId, myHarborUserId]);

    const load = useCallback(async ({force = false} = {}) => {
        if (!eventId) {
            return members;
        }
        if (!force) {
            const cached = getCachedSharedTimetables(eventId);
            if (cached) {
                return cached.value;
            }
        }
        const requestId = ++requestIdRef.current;
        // 強制刷新且已有內容時不切 loading，避免下拉時整頁閃爍
        if (phase !== 'ready') {
            setPhase('loading');
        }
        setError(null);
        try {
            const entry = await loadCachedSharedTimetables(
                eventId,
                async () => pickMembers(
                    await getTeamSharedTimetables(eventId),
                ),
                {force},
            );
            const nextMembers = entry.value;
            if (!mountedRef.current || requestId !== requestIdRef.current) {
                return nextMembers;
            }
            setMembers(nextMembers);
            const mine = nextMembers.find(member =>
                myHarborUserId != null &&
                String(member?.harborUserId) === String(myHarborUserId),
            );
            setMySharedTimetable(
                normalizeSharedTimetable(mine?.sharedTimetable),
            );
            setPhase('ready');
            return nextMembers;
        } catch (requestError) {
            const normalized = normalizeSchedulingError(requestError);
            if (mountedRef.current && requestId === requestIdRef.current) {
                setError(normalized);
                setPhase('error');
            }
            throw normalized;
        }
    }, [eventId, members, myHarborUserId, phase]);

    const loadMine = useCallback(async () => {
        const data = await getMySharedTimetable(eventId);
        const snapshot = pickSharedTimetable(data);
        patchMySnapshot(snapshot);
        return snapshot;
    }, [eventId, patchMySnapshot]);

    const save = useCallback(async payload => {
        try {
            const data = await putMySharedTimetable(eventId, payload);
            const snapshot = pickSharedTimetable(data) || {
                ...payload,
                revision: payload.revision + 1,
            };
            return patchMySnapshot(snapshot);
        } catch (requestError) {
            const normalized = normalizeSchedulingError(requestError);
            if (normalized.code === 'revision_conflict') {
                const latest = await loadMine().catch(() => null);
                return {conflict: true, latest};
            }
            throw normalized;
        }
    }, [eventId, loadMine, patchMySnapshot]);

    const stopSharing = useCallback(async () => {
        await deleteMySharedTimetable(eventId);
        patchMySnapshot(null);
    }, [eventId, patchMySnapshot]);

    return {
        phase,
        members,
        mySharedTimetable,
        error,
        load,
        loadMine,
        save,
        stopSharing,
    };
}

export default useSharedTimetables;
