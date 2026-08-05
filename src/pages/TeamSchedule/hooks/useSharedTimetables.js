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
    const [phase, setPhase] = useState('idle');
    const [members, setMembers] = useState([]);
    const [mySharedTimetable, setMySharedTimetable] = useState(null);
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
        setPhase('idle');
        setMembers([]);
        setMySharedTimetable(null);
        setError(null);
    }, [eventId]);

    const patchMySnapshot = useCallback(snapshot => {
        const normalized = normalizeSharedTimetable(snapshot);
        setMySharedTimetable(normalized);
        setMembers(current =>
            current.map(member => {
                if (
                    myHarborUserId != null &&
                    String(member?.harborUserId) === String(myHarborUserId)
                ) {
                    return {...member, sharedTimetable: normalized};
                }
                return member;
            }),
        );
        return normalized;
    }, [myHarborUserId]);

    const load = useCallback(async ({force = false} = {}) => {
        if (!eventId || (!force && phase === 'ready')) {
            return members;
        }
        const requestId = ++requestIdRef.current;
        // 強制刷新且已有內容時不切 loading，避免下拉時整頁閃爍
        if (!(force && phase === 'ready')) {
            setPhase('loading');
        }
        setError(null);
        try {
            const data = await getTeamSharedTimetables(eventId);
            const nextMembers = pickMembers(data);
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
