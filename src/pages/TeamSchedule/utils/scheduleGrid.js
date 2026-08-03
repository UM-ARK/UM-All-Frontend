/**
 * 組隊約時間：週／日格線模型（純函式）
 * 以 event.timezone 分組，固定週一至週日七欄
 */
import moment from 'moment-timezone';
import {
    normalizeCandidateWindows,
    normalizeSlotMinutes,
    normalizeTimezone,
    parseInTimezone,
} from '../../../utils/scheduling/schedulingModels';

/**
 * 取得日期所屬週一（ISO week，活動時區）
 * @param {string} dateKey YYYY-MM-DD
 * @param {string} timezone
 * @returns {string}
 */
export function getWeekStartDate(dateKey, timezone) {
    const tz = normalizeTimezone(timezone);
    return moment.tz(dateKey, 'YYYY-MM-DD', tz).startOf('isoWeek').format('YYYY-MM-DD');
}

/**
 * 由週一產生該週七個日期鍵
 * @param {string} weekStartDate
 * @param {string} timezone
 * @returns {string[]}
 */
export function getWeekDateKeys(weekStartDate, timezone) {
    const tz = normalizeTimezone(timezone);
    const monday = moment.tz(weekStartDate, 'YYYY-MM-DD', tz).startOf('isoWeek');
    const dates = [];
    for (let i = 0; i < 7; i++) {
        dates.push(monday.clone().add(i, 'days').format('YYYY-MM-DD'));
    }
    return dates;
}

/**
 * 依日期分組 candidate windows（同日可多段）
 * @param {Array} windows
 * @param {string} timezone
 * @returns {Map<string, Array>}
 */
export function groupWindowsByDate(windows, timezone) {
    const normalized = normalizeCandidateWindows(windows, timezone);
    const map = new Map();
    for (let i = 0; i < normalized.length; i++) {
        const win = normalized[i];
        if (!map.has(win.date)) {
            map.set(win.date, []);
        }
        map.get(win.date).push(win);
    }
    return map;
}

/**
 * 同一天多段 window 之間的禁用空檔（半開）
 * @param {Array<{startAt: string, endAt: string}>} dayWindows 已按 startAt 排序
 * @returns {Array<{startAt: string, endAt: string}>}
 */
export function getDisabledGapsForDay(dayWindows) {
    if (!Array.isArray(dayWindows) || dayWindows.length < 2) {
        return [];
    }
    const gaps = [];
    for (let i = 0; i < dayWindows.length - 1; i++) {
        const current = dayWindows[i];
        const next = dayWindows[i + 1];
        if (current.endAt < next.startAt) {
            gaps.push({
                startAt: current.endAt,
                endAt: next.startAt,
            });
        }
    }
    return gaps;
}

/**
 * 判斷時間點是否落在任一候選 window 內（半開）
 * @param {string} instantIso
 * @param {Array<{startAt: string, endAt: string}>} dayWindows
 * @returns {boolean}
 */
export function isInstantInCandidateWindows(instantIso, dayWindows) {
    if (!Array.isArray(dayWindows)) {
        return false;
    }
    for (let i = 0; i < dayWindows.length; i++) {
        const win = dayWindows[i];
        if (instantIso >= win.startAt && instantIso < win.endAt) {
            return true;
        }
    }
    return false;
}

/**
 * 判斷半開 slot 是否完全落在單一 candidate window 內
 * @param {{startAt: string, endAt: string}} slot
 * @param {Array<{startAt: string, endAt: string}>} dayWindows
 * @returns {boolean}
 */
export function isSlotInsideCandidateWindows(slot, dayWindows) {
    if (!slot || !Array.isArray(dayWindows)) {
        return false;
    }
    for (let i = 0; i < dayWindows.length; i++) {
        const win = dayWindows[i];
        if (slot.startAt >= win.startAt && slot.endAt <= win.endAt) {
            return true;
        }
    }
    return false;
}

/**
 * 建立單日模型
 * @param {string} date
 * @param {Array} dayWindows
 * @param {string} timezone
 * @returns {object}
 */
export function buildDayModel(date, dayWindows, timezone) {
    const tz = normalizeTimezone(timezone);
    const windows = Array.isArray(dayWindows) ? dayWindows.slice() : [];
    const m = moment.tz(date, 'YYYY-MM-DD', tz);
    return {
        date,
        // isoWeekday：週一=1 … 週日=7
        weekday: m.isoWeekday(),
        enabled: windows.length > 0,
        windows,
        disabledGaps: getDisabledGapsForDay(windows),
    };
}

/**
 * 計算該週縱軸：最早 candidate start → 最晚 candidate end
 * @param {Array} days
 * @returns {{axisStartAt: string|null, axisEndAt: string|null}}
 */
export function getWeekAxisBounds(days) {
    let axisStartAt = null;
    let axisEndAt = null;
    if (!Array.isArray(days)) {
        return {axisStartAt, axisEndAt};
    }
    for (let i = 0; i < days.length; i++) {
        const day = days[i];
        if (!day || !Array.isArray(day.windows)) {
            continue;
        }
        for (let j = 0; j < day.windows.length; j++) {
            const win = day.windows[j];
            if (!axisStartAt || win.startAt < axisStartAt) {
                axisStartAt = win.startAt;
            }
            if (!axisEndAt || win.endAt > axisEndAt) {
                axisEndAt = win.endAt;
            }
        }
    }
    return {axisStartAt, axisEndAt};
}

/**
 * 建立單週頁面（固定七欄）
 * @param {string} weekStartDate
 * @param {Map<string, Array>} windowsByDate
 * @param {string} timezone
 * @param {number} slotMinutes
 * @returns {object}
 */
export function buildWeekPage(weekStartDate, windowsByDate, timezone, slotMinutes) {
    const tz = normalizeTimezone(timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    const dateKeys = getWeekDateKeys(weekStartDate, tz);
    const days = dateKeys.map(date =>
        buildDayModel(date, windowsByDate.get(date) || [], tz),
    );
    const {axisStartAt, axisEndAt} = getWeekAxisBounds(days);
    const sunday = dateKeys[6];
    return {
        weekStartDate: dateKeys[0],
        weekEndDate: sunday,
        slotMinutes: slot,
        timezone: tz,
        days,
        axisStartAt,
        axisEndAt,
        hasCandidates: days.some(day => day.enabled),
    };
}

/**
 * 由 candidateWindows 建立所有涵蓋候選日的週頁（跨週／跨月／跨年）
 * @param {object} params
 * @param {Array} params.candidateWindows
 * @param {string} params.timezone
 * @param {number} [params.slotMinutes]
 * @returns {object[]}
 */
export function buildWeekPages({candidateWindows, timezone, slotMinutes} = {}) {
    const tz = normalizeTimezone(timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    const windowsByDate = groupWindowsByDate(candidateWindows, tz);
    const weekStarts = [];
    const seen = new Set();
    const dates = Array.from(windowsByDate.keys()).sort();
    for (let i = 0; i < dates.length; i++) {
        const weekStart = getWeekStartDate(dates[i], tz);
        if (!seen.has(weekStart)) {
            seen.add(weekStart);
            weekStarts.push(weekStart);
        }
    }
    weekStarts.sort();
    return weekStarts.map(weekStart =>
        buildWeekPage(weekStart, windowsByDate, tz, slot),
    );
}

/**
 * 依活動時區產生左側時間刻度（半開 slot 起點）
 * @param {string} axisStartAt
 * @param {string} axisEndAt
 * @param {number} slotMinutes
 * @param {string} timezone
 * @returns {string[]} ISO 字串列表
 */
export function buildTimeAxisLabels(axisStartAt, axisEndAt, slotMinutes, timezone) {
    const start = parseInTimezone(axisStartAt, timezone);
    const end = parseInTimezone(axisEndAt, timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    if (!start || !end || !end.isAfter(start)) {
        return [];
    }
    const labels = [];
    const cursor = start.clone();
    while (cursor.isBefore(end)) {
        labels.push(cursor.toISOString());
        cursor.add(slot, 'minutes');
    }
    return labels;
}

/**
 * 尋找包含指定日期的週頁索引
 * @param {object[]} weekPages
 * @param {string} dateKey
 * @returns {number}
 */
export function findWeekPageIndexByDate(weekPages, dateKey) {
    if (!Array.isArray(weekPages) || !dateKey) {
        return -1;
    }
    for (let i = 0; i < weekPages.length; i++) {
        const page = weekPages[i];
        if (!page || !Array.isArray(page.days)) {
            continue;
        }
        if (page.days.some(day => day.date === dateKey)) {
            return i;
        }
    }
    return -1;
}
