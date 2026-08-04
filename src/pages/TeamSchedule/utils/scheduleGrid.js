/**
 * 組隊約時間：固定 weekly 格線模型（純函式）
 */
import {
    normalizeCandidateWindows,
    normalizeSlotMinutes,
    normalizeTimezone,
} from '../../../utils/scheduling/schedulingModels';

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * 依 weekday 分組 candidate windows（同日可多段）。
 */
export function groupWindowsByWeekday(windows) {
    const normalized = normalizeCandidateWindows(windows);
    const map = new Map();
    for (let i = 0; i < normalized.length; i++) {
        const window = normalized[i];
        if (!map.has(window.weekday)) {
            map.set(window.weekday, []);
        }
        map.get(window.weekday).push(window);
    }
    return map;
}

/**
 * 同一 weekday 多段 window 之間的禁用空檔（半開）。
 */
export function getDisabledGapsForDay(dayWindows) {
    if (!Array.isArray(dayWindows) || dayWindows.length < 2) {
        return [];
    }
    const gaps = [];
    for (let i = 0; i < dayWindows.length - 1; i++) {
        const current = dayWindows[i];
        const next = dayWindows[i + 1];
        if (current.endMinute < next.startMinute) {
            gaps.push({
                weekday: current.weekday,
                startMinute: current.endMinute,
                endMinute: next.startMinute,
            });
        }
    }
    return gaps;
}

/**
 * 判斷一天中的分鐘是否落在任一候選 window 內（半開）。
 */
export function isMinuteInCandidateWindows(weekday, minute, dayWindows) {
    if (!Array.isArray(dayWindows)) {
        return false;
    }
    return dayWindows.some(
        window =>
            window.weekday === weekday &&
            minute >= window.startMinute &&
            minute < window.endMinute,
    );
}

/**
 * 判斷半開 slot 是否完全落在單一 candidate window 內。
 */
export function isSlotInsideCandidateWindows(slot, dayWindows) {
    if (!slot || !Array.isArray(dayWindows)) {
        return false;
    }
    return dayWindows.some(
        window =>
            window.weekday === slot.weekday &&
            slot.startMinute >= window.startMinute &&
            slot.endMinute <= window.endMinute,
    );
}

/**
 * 建立單一 weekday 模型。
 */
export function buildDayModel(weekday, dayWindows) {
    const windows = Array.isArray(dayWindows) ? dayWindows.slice() : [];
    return {
        weekday,
        enabled: windows.length > 0,
        windows,
        disabledGaps: getDisabledGapsForDay(windows),
    };
}

/**
 * 計算 weekly 縱軸：最早 candidate start → 最晚 candidate end。
 */
export function getWeekAxisBounds(days) {
    let axisStartMinute = null;
    let axisEndMinute = null;
    if (!Array.isArray(days)) {
        return {axisStartMinute, axisEndMinute};
    }
    for (let i = 0; i < days.length; i++) {
        const windows = days[i] && days[i].windows;
        if (!Array.isArray(windows)) {
            continue;
        }
        for (let j = 0; j < windows.length; j++) {
            const window = windows[j];
            if (axisStartMinute == null || window.startMinute < axisStartMinute) {
                axisStartMinute = window.startMinute;
            }
            if (axisEndMinute == null || window.endMinute > axisEndMinute) {
                axisEndMinute = window.endMinute;
            }
        }
    }
    return {axisStartMinute, axisEndMinute};
}

/**
 * 建立固定週一至週日七欄的 weekly grid。
 */
export function buildWeeklyGrid({candidateWindows, timezone, slotMinutes} = {}) {
    const windowsByWeekday = groupWindowsByWeekday(candidateWindows);
    const days = WEEKDAYS.map(weekday =>
        buildDayModel(weekday, windowsByWeekday.get(weekday) || []),
    );
    const {axisStartMinute, axisEndMinute} = getWeekAxisBounds(days);
    return {
        slotMinutes: normalizeSlotMinutes(slotMinutes),
        timezone: normalizeTimezone(timezone),
        days,
        axisStartMinute,
        axisEndMinute,
        hasCandidates: days.some(day => day.enabled),
    };
}

/**
 * 產生左側時間刻度的分鐘值（半開 slot 起點）。
 */
export function buildTimeAxisLabels(axisStartMinute, axisEndMinute, slotMinutes) {
    const slot = normalizeSlotMinutes(slotMinutes);
    if (
        !Number.isInteger(axisStartMinute) ||
        !Number.isInteger(axisEndMinute) ||
        axisEndMinute <= axisStartMinute
    ) {
        return [];
    }
    const labels = [];
    for (let minute = axisStartMinute; minute < axisEndMinute; minute += slot) {
        labels.push(minute);
    }
    return labels;
}
