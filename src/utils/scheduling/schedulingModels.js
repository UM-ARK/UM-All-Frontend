/**
 * 組隊約時間：共用 weekly 模型正規化與語意輔助（純函式）
 */
export const DEFAULT_TIMEZONE = 'Asia/Macau';
export const DEFAULT_SLOT_MINUTES = 15;
export const ALLOWED_SLOT_MINUTES = [15, 30, 60];
export const DEFAULT_WEEKLY_SCROLL_MINUTE = 8 * 60;

export const FULL_WEEK_CANDIDATE_WINDOWS = Array.from(
    {length: 7},
    (_, index) => ({
        weekday: index + 1,
        startMinute: 0,
        endMinute: 1440,
    }),
);

/**
 * 正規化時區字串，空白則回預設亞洲／澳門。
 * 時區只用於管理時間，例如回覆截止時間。
 */
export function normalizeTimezone(timezone) {
    if (typeof timezone === 'string' && timezone.trim()) {
        return timezone.trim();
    }
    return DEFAULT_TIMEZONE;
}

/**
 * 正規化 slot 分鐘數，僅允許 15／30／60。
 */
export function normalizeSlotMinutes(slotMinutes) {
    const value = Number(slotMinutes);
    if (ALLOWED_SLOT_MINUTES.includes(value)) {
        return value;
    }
    return DEFAULT_SLOT_MINUTES;
}

/**
 * 正規化星期數，週一為 1、週日為 7。
 */
export function normalizeWeekday(weekday) {
    const value = Number(weekday);
    if (Number.isInteger(value) && value >= 1 && value <= 7) {
        return value;
    }
    return null;
}

/**
 * 正規化一天中的分鐘數。
 */
export function normalizeMinute(value, {allowDayEnd = false} = {}) {
    const minute = Number(value);
    const maximum = allowDayEnd ? 1440 : 1439;
    if (Number.isInteger(minute) && minute >= 0 && minute <= maximum) {
        return minute;
    }
    return null;
}

/**
 * 正規化單一 weekly candidate window。
 */
export function normalizeCandidateWindow(window) {
    if (!window || typeof window !== 'object') {
        return null;
    }
    const weekday = normalizeWeekday(window.weekday);
    const startMinute = normalizeMinute(window.startMinute);
    const endMinute = normalizeMinute(window.endMinute, {allowDayEnd: true});
    if (weekday == null || startMinute == null || endMinute == null || endMinute <= startMinute) {
        return null;
    }
    return {weekday, startMinute, endMinute};
}

/**
 * 正規化並依 weekday／startMinute 排序 candidate windows。
 */
export function normalizeCandidateWindows(windows) {
    if (!Array.isArray(windows)) {
        return [];
    }
    return windows
        .map(normalizeCandidateWindow)
        .filter(Boolean)
        .sort(compareWeeklyRanges);
}

/**
 * 正規化單一 weekly 可用區間。
 */
export function normalizeAvailabilityRange(range) {
    return normalizeCandidateWindow(range);
}

/**
 * 正規化 availability：null／已提交空 ranges／有 ranges。
 */
export function normalizeAvailability(availability) {
    if (availability == null) {
        return null;
    }
    const rawRanges = Array.isArray(availability.ranges) ? availability.ranges : [];
    return {
        ranges: rawRanges
            .map(normalizeAvailabilityRange)
            .filter(Boolean)
            .sort(compareWeeklyRanges),
    };
}

/**
 * 是否已提交可用時間（含全沒空）。
 */
export function isAvailabilitySubmitted(availability) {
    return availability != null;
}

/**
 * 已提交且候選範圍內完全沒空。
 */
export function isAvailabilityFullyBusy(availability) {
    return (
        availability != null &&
        Array.isArray(availability.ranges) &&
        availability.ranges.length === 0
    );
}

/**
 * 是否有至少一段空閒區間。
 */
export function hasAvailabilityRanges(availability) {
    return (
        availability != null &&
        Array.isArray(availability.ranges) &&
        availability.ranges.length > 0
    );
}

/**
 * 取得所有成員 availability 中最早的每日開始分鐘；無資料時回預設 08:00。
 */
export function getEarliestAvailabilityStartMinute(
    members,
    fallback = DEFAULT_WEEKLY_SCROLL_MINUTE,
) {
    const list = Array.isArray(members) ? members : [];
    let earliest = null;
    for (let i = 0; i < list.length; i++) {
        const availability = normalizeAvailability(list[i]?.availability);
        if (!availability) {
            continue;
        }
        for (let j = 0; j < availability.ranges.length; j++) {
            const startMinute = availability.ranges[j].startMinute;
            if (earliest == null || startMinute < earliest) {
                earliest = startMinute;
            }
        }
    }
    return earliest == null ? fallback : earliest;
}

/**
 * 區間是否完整覆蓋半開 slot `[startMinute, endMinute)`。
 */
export function rangeCoversSlot(range, slot) {
    if (!range || !slot || range.weekday !== slot.weekday) {
        return false;
    }
    return (
        range.startMinute <= slot.startMinute &&
        range.endMinute >= slot.endMinute
    );
}

/**
 * 正規化活動核心欄位（不改動未知欄位語意）。
 */
export function normalizeTeamEvent(event) {
    if (!event || typeof event !== 'object') {
        return null;
    }
    return {
        ...event,
        timezone: normalizeTimezone(event.timezone),
        slotMinutes: normalizeSlotMinutes(event.slotMinutes),
        candidateWindows: normalizeCandidateWindows(event.candidateWindows),
    };
}

/**
 * 正規化 membership。
 */
export function normalizeMembership(membership) {
    if (!membership || typeof membership !== 'object') {
        return null;
    }
    return {...membership};
}

/**
 * 列表「最近三個」：保留 API 回傳順序，取前三筆。
 */
export function takeRecentTeamEvents(events) {
    if (!Array.isArray(events)) {
        return [];
    }
    return events.slice(0, 3);
}

/**
 * 回傳同一星期中的兩區間是否重疊（半開語意下相接不算重疊）。
 */
export function rangesOverlap(a, b) {
    return (
        a &&
        b &&
        a.weekday === b.weekday &&
        a.startMinute < b.endMinute &&
        b.startMinute < a.endMinute
    );
}

/**
 * 兩區間是否相鄰（同一 weekday 且 endMinute === startMinute）。
 */
export function rangesAreAdjacent(a, b) {
    return (
        a &&
        b &&
        a.weekday === b.weekday &&
        (a.endMinute === b.startMinute || b.endMinute === a.startMinute)
    );
}

function compareWeeklyRanges(a, b) {
    if (a.weekday !== b.weekday) {
        return a.weekday - b.weekday;
    }
    if (a.startMinute !== b.startMinute) {
        return a.startMinute - b.startMinute;
    }
    return a.endMinute - b.endMinute;
}
