/**
 * 組隊約時間：共用模型正規化與語意輔助（純函式）
 */
import moment from 'moment-timezone';

export const DEFAULT_TIMEZONE = 'Asia/Macau';
export const DEFAULT_SLOT_MINUTES = 15;
export const ALLOWED_SLOT_MINUTES = [15, 30, 60];

/**
 * 正規化時區字串，空白則回預設亞洲／澳門
 * @param {string|null|undefined} timezone
 * @returns {string}
 */
export function normalizeTimezone(timezone) {
    if (typeof timezone === 'string' && timezone.trim()) {
        return timezone.trim();
    }
    return DEFAULT_TIMEZONE;
}

/**
 * 正規化 slot 分鐘數，僅允許 15／30／60
 * @param {number|string|null|undefined} slotMinutes
 * @returns {number}
 */
export function normalizeSlotMinutes(slotMinutes) {
    const value = Number(slotMinutes);
    if (ALLOWED_SLOT_MINUTES.includes(value)) {
        return value;
    }
    return DEFAULT_SLOT_MINUTES;
}

/**
 * 將 ISO／可解析時間轉為活動時區的 moment（無效則 null）
 * @param {string|number|Date|null|undefined} value
 * @param {string} timezone
 * @returns {import('moment').Moment|null}
 */
export function parseInTimezone(value, timezone) {
    if (value == null || value === '') {
        return null;
    }
    const tz = normalizeTimezone(timezone);
    const m = moment.tz(value, tz);
    return m.isValid() ? m : null;
}

/**
 * 由 startAt 推導活動時區下的 YYYY-MM-DD
 * @param {string} startAt
 * @param {string} timezone
 * @returns {string|null}
 */
export function dateKeyFromStartAt(startAt, timezone) {
    const m = parseInTimezone(startAt, timezone);
    return m ? m.format('YYYY-MM-DD') : null;
}

/**
 * 正規化單一 candidate window，必要時由 startAt 補 date
 * @param {object} window
 * @param {string} timezone
 * @returns {{date: string, startAt: string, endAt: string}|null}
 */
export function normalizeCandidateWindow(window, timezone) {
    if (!window || typeof window !== 'object') {
        return null;
    }
    const start = parseInTimezone(window.startAt, timezone);
    const end = parseInTimezone(window.endAt, timezone);
    if (!start || !end || !end.isAfter(start)) {
        return null;
    }
    const date =
        typeof window.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(window.date)
            ? window.date
            : start.format('YYYY-MM-DD');
    return {
        date,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
    };
}

/**
 * 正規化並依 startAt 排序 candidateWindows
 * @param {Array} windows
 * @param {string} timezone
 * @returns {Array<{date: string, startAt: string, endAt: string}>}
 */
export function normalizeCandidateWindows(windows, timezone) {
    if (!Array.isArray(windows)) {
        return [];
    }
    return windows
        .map(item => normalizeCandidateWindow(item, timezone))
        .filter(Boolean)
        .sort((a, b) => {
            if (a.startAt < b.startAt) {
                return -1;
            }
            if (a.startAt > b.startAt) {
                return 1;
            }
            return 0;
        });
}

/**
 * 正規化單一可用區間
 * @param {object} range
 * @param {string} timezone
 * @returns {{startAt: string, endAt: string}|null}
 */
export function normalizeAvailabilityRange(range, timezone) {
    if (!range || typeof range !== 'object') {
        return null;
    }
    const start = parseInTimezone(range.startAt, timezone);
    const end = parseInTimezone(range.endAt, timezone);
    if (!start || !end || !end.isAfter(start)) {
        return null;
    }
    return {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
    };
}

/**
 * 正規化 availability：null／已提交空 ranges／有 ranges
 * @param {object|null|undefined} availability
 * @param {string} timezone
 * @returns {null|{ranges: Array<{startAt: string, endAt: string}>}}
 */
export function normalizeAvailability(availability, timezone) {
    if (availability == null) {
        return null;
    }
    const rawRanges = Array.isArray(availability.ranges) ? availability.ranges : [];
    const ranges = rawRanges
        .map(item => normalizeAvailabilityRange(item, timezone))
        .filter(Boolean)
        .sort((a, b) => {
            if (a.startAt < b.startAt) {
                return -1;
            }
            if (a.startAt > b.startAt) {
                return 1;
            }
            return 0;
        });
    return {ranges};
}

/**
 * 是否已提交可用時間（含全沒空）
 * @param {object|null|undefined} availability
 * @returns {boolean}
 */
export function isAvailabilitySubmitted(availability) {
    return availability != null;
}

/**
 * 已提交且候選範圍內完全沒空
 * @param {object|null|undefined} availability
 * @returns {boolean}
 */
export function isAvailabilityFullyBusy(availability) {
    return (
        availability != null &&
        Array.isArray(availability.ranges) &&
        availability.ranges.length === 0
    );
}

/**
 * 是否有至少一段空閒區間
 * @param {object|null|undefined} availability
 * @returns {boolean}
 */
export function hasAvailabilityRanges(availability) {
    return (
        availability != null &&
        Array.isArray(availability.ranges) &&
        availability.ranges.length > 0
    );
}

/**
 * 區間是否完整覆蓋半開 slot `[slotStart, slotEnd)`
 * @param {{startAt: string, endAt: string}} range
 * @param {{startAt: string, endAt: string}} slot
 * @returns {boolean}
 */
export function rangeCoversSlot(range, slot) {
    if (!range || !slot) {
        return false;
    }
    return range.startAt <= slot.startAt && range.endAt >= slot.endAt;
}

/**
 * 正規化活動核心欄位（不改動未知欄位語意）
 * @param {object} event
 * @returns {object|null}
 */
export function normalizeTeamEvent(event) {
    if (!event || typeof event !== 'object') {
        return null;
    }
    const timezone = normalizeTimezone(event.timezone);
    const slotMinutes = normalizeSlotMinutes(event.slotMinutes);
    return {
        ...event,
        timezone,
        slotMinutes,
        candidateWindows: normalizeCandidateWindows(event.candidateWindows, timezone),
    };
}

/**
 * 正規化 membership
 * @param {object} membership
 * @returns {object|null}
 */
export function normalizeMembership(membership) {
    if (!membership || typeof membership !== 'object') {
        return null;
    }
    return {...membership};
}

/**
 * 列表「最近三個」：保留 API 回傳順序，取前三筆
 * @param {Array} events
 * @returns {Array}
 */
export function takeRecentTeamEvents(events) {
    if (!Array.isArray(events)) {
        return [];
    }
    return events.slice(0, 3);
}

/**
 * 候選日期去重後由早到晚排序
 * @param {Array} windows
 * @param {string} timezone
 * @returns {string[]}
 */
export function getCandidateDates(windows, timezone) {
    const normalized = normalizeCandidateWindows(windows, timezone);
    const dates = [];
    const seen = new Set();
    for (let i = 0; i < normalized.length; i++) {
        const date = normalized[i].date;
        if (!seen.has(date)) {
            seen.add(date);
            dates.push(date);
        }
    }
    dates.sort();
    return dates;
}

/**
 * 列表用候選日期摘要：單日／多日最早至最晚＋天數
 * @param {Array} windows
 * @param {string} timezone
 * @returns {{kind: 'empty'}|{kind: 'single', date: string}|{kind: 'range', startDate: string, endDate: string, dayCount: number}}
 */
export function summarizeCandidateDates(windows, timezone) {
    const dates = getCandidateDates(windows, timezone);
    if (dates.length === 0) {
        return {kind: 'empty'};
    }
    if (dates.length === 1) {
        return {kind: 'single', date: dates[0]};
    }
    return {
        kind: 'range',
        startDate: dates[0],
        endDate: dates[dates.length - 1],
        dayCount: dates.length,
    };
}

/**
 * 回傳區間與另一區間是否重疊（半開語意下相接不算重疊）
 * @param {{startAt: string, endAt: string}} a
 * @param {{startAt: string, endAt: string}} b
 * @returns {boolean}
 */
export function rangesOverlap(a, b) {
    return a.startAt < b.endAt && b.startAt < a.endAt;
}

/**
 * 兩區間是否相鄰（a.end === b.start 或反向）
 * @param {{startAt: string, endAt: string}} a
 * @param {{startAt: string, endAt: string}} b
 * @returns {boolean}
 */
export function rangesAreAdjacent(a, b) {
    return a.endAt === b.startAt || b.endAt === a.startAt;
}
