function normalizedUsername(member) {
    return String(member?.username || '').trim().toLocaleLowerCase();
}

export function getSharedTimetableQuickMembers(
    members = [],
    recentIds = [],
    limit = 6,
) {
    const memberMap = new Map(
        members.map(member => [String(member?.harborUserId), member]),
    );
    const seen = new Set();
    const result = [];
    [...recentIds, ...members.map(member => member?.harborUserId)]
        .forEach(id => {
            const key = String(id);
            const member = memberMap.get(key);
            if (!member || seen.has(key) || result.length >= limit) {
                return;
            }
            seen.add(key);
            result.push(member);
        });
    return result;
}

export function getSharedTimetableMemberOptions(
    members = [],
    {myHarborUserId = null, query = ''} = {},
) {
    const normalizedQuery = String(query).trim().toLocaleLowerCase();
    return members
        .filter(member =>
            !normalizedQuery || normalizedUsername(member).includes(normalizedQuery),
        )
        .slice()
        .sort((left, right) => {
            const leftIsMe =
                myHarborUserId != null &&
                String(left?.harborUserId) === String(myHarborUserId);
            const rightIsMe =
                myHarborUserId != null &&
                String(right?.harborUserId) === String(myHarborUserId);
            if (leftIsMe !== rightIsMe) {
                return leftIsMe ? -1 : 1;
            }
            const leftIsSharing = Boolean(left?.sharedTimetable);
            const rightIsSharing = Boolean(right?.sharedTimetable);
            if (leftIsSharing !== rightIsSharing) {
                return leftIsSharing ? -1 : 1;
            }
            return normalizedUsername(left).localeCompare(
                normalizedUsername(right),
            );
        });
}
