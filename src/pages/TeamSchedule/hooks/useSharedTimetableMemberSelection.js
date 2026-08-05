import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {getSharedTimetableQuickMembers} from '../utils/sharedTimetableMembers';

const RECENT_MEMBER_LIMIT = 6;
const recentMemberIdsByEvent = new Map();

function memberKey(member) {
    return member?.harborUserId == null
        ? null
        : String(member.harborUserId);
}

export function useSharedTimetableMemberSelection(
    members = [],
    {eventId = '', isFocused = true} = {},
) {
    const eventKey = String(eventId || 'default');
    const [selectedId, setSelectedId] = useState('all');
    const [visibleRecentIds, setVisibleRecentIds] = useState(
        () => recentMemberIdsByEvent.get(eventKey) || [],
    );
    const pendingRecentIdsRef = useRef(visibleRecentIds);
    const wasFocusedRef = useRef(isFocused);
    const memberMap = useMemo(
        () => new Map(
            members
                .map(member => [memberKey(member), member])
                .filter(([key]) => key != null),
        ),
        [members],
    );

    useEffect(() => {
        const cachedIds = recentMemberIdsByEvent.get(eventKey) || [];
        pendingRecentIdsRef.current = cachedIds;
        setVisibleRecentIds(cachedIds);
        setSelectedId('all');
    }, [eventKey]);

    useEffect(() => {
        if (isFocused && !wasFocusedRef.current) {
            setVisibleRecentIds(pendingRecentIdsRef.current);
        }
        wasFocusedRef.current = isFocused;
    }, [isFocused]);

    useEffect(() => {
        if (
            members.length > 0 &&
            selectedId !== 'all' &&
            !memberMap.has(String(selectedId))
        ) {
            setSelectedId('all');
        }
    }, [memberMap, members.length, selectedId]);

    const selectAll = useCallback(() => {
        setSelectedId('all');
    }, []);

    const selectMember = useCallback(member => {
        const key = memberKey(member);
        if (key == null) {
            return;
        }
        setSelectedId(key);
        const nextRecentIds = [
            key,
            ...pendingRecentIdsRef.current.filter(id => id !== key),
        ].slice(0, RECENT_MEMBER_LIMIT);
        pendingRecentIdsRef.current = nextRecentIds;
        recentMemberIdsByEvent.set(eventKey, nextRecentIds);
    }, [eventKey]);

    const quickMembers = useMemo(
        () => getSharedTimetableQuickMembers(
            members,
            visibleRecentIds,
            RECENT_MEMBER_LIMIT,
        ),
        [members, visibleRecentIds],
    );

    return {
        quickMembers,
        selectedId,
        selectAll,
        selectMember,
    };
}
