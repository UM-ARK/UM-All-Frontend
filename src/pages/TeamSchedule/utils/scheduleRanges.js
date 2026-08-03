/**
 * 組隊約時間：slot 展開與 ranges 合併（純函式）
 * 半開區間 `[start, end)`；不可跨 candidate window 空檔合併
 */
import {
    normalizeCandidateWindows,
    normalizeSlotMinutes,
    normalizeTimezone,
    parseInTimezone,
} from '../../../utils/scheduling/schedulingModels';

/**
 * 將單一 candidate window 展開為半開 slots
 * @param {{startAt: string, endAt: string, date?: string}} window
 * @param {number} slotMinutes
 * @param {string} timezone
 * @returns {Array<{date: string, startAt: string, endAt: string, windowStartAt: string, windowEndAt: string}>}
 */
export function expandWindowToSlots(window, slotMinutes, timezone) {
    const tz = normalizeTimezone(timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    const start = parseInTimezone(window && window.startAt, tz);
    const end = parseInTimezone(window && window.endAt, tz);
    if (!start || !end || !end.isAfter(start)) {
        return [];
    }
    const date =
        typeof window.date === 'string' && window.date
            ? window.date
            : start.format('YYYY-MM-DD');
    const windowStartAt = start.toISOString();
    const windowEndAt = end.toISOString();
    const slots = [];
    const cursor = start.clone();
    while (cursor.clone().add(slot, 'minutes').isSameOrBefore(end)) {
        const slotStart = cursor.clone();
        const slotEnd = cursor.clone().add(slot, 'minutes');
        slots.push({
            date,
            startAt: slotStart.toISOString(),
            endAt: slotEnd.toISOString(),
            windowStartAt,
            windowEndAt,
        });
        cursor.add(slot, 'minutes');
    }
    return slots;
}

/**
 * 展開所有 candidate windows 的 slots（保留 window 邊界以便不跨 gap）
 * @param {Array} windows
 * @param {number} slotMinutes
 * @param {string} timezone
 * @returns {Array}
 */
export function expandCandidateWindowsToSlots(windows, slotMinutes, timezone) {
    const normalized = normalizeCandidateWindows(windows, timezone);
    const slots = [];
    for (let i = 0; i < normalized.length; i++) {
        const expanded = expandWindowToSlots(normalized[i], slotMinutes, timezone);
        for (let j = 0; j < expanded.length; j++) {
            slots.push(expanded[j]);
        }
    }
    return slots;
}

/**
 * slot 鍵值（便於 Set／Map）
 * @param {{startAt: string, endAt: string}} slot
 * @returns {string}
 */
export function slotKey(slot) {
    return `${slot.startAt}|${slot.endAt}`;
}

/**
 * 在同一 candidate window 內，將相鄰選中 slots 合併為 ranges
 * @param {Array<{startAt: string, endAt: string, windowStartAt?: string, windowEndAt?: string, date?: string}>} selectedSlots
 * @param {object} options
 * @param {Array} [options.candidateWindows] 用於校驗／補 window 邊界
 * @param {number} [options.slotMinutes]
 * @param {string} [options.timezone]
 * @returns {Array<{startAt: string, endAt: string}>}
 */
export function mergeSlotsToRanges(selectedSlots, options = {}) {
    const tz = normalizeTimezone(options.timezone);
    const slotMinutes = normalizeSlotMinutes(options.slotMinutes);
    const windows = normalizeCandidateWindows(options.candidateWindows, tz);

    if (!Array.isArray(selectedSlots) || selectedSlots.length === 0) {
        return [];
    }

    // 僅保留完整落在某個 candidate window 內的 slot，並標記所屬 window
    const annotated = [];
    for (let i = 0; i < selectedSlots.length; i++) {
        const raw = selectedSlots[i];
        if (!raw || !raw.startAt || !raw.endAt) {
            continue;
        }
        let windowStartAt = raw.windowStartAt || null;
        let windowEndAt = raw.windowEndAt || null;
        if (!windowStartAt || !windowEndAt) {
            const owner = windows.find(
                win => raw.startAt >= win.startAt && raw.endAt <= win.endAt,
            );
            if (!owner) {
                continue;
            }
            windowStartAt = owner.startAt;
            windowEndAt = owner.endAt;
        } else if (
            windows.length > 0 &&
            !windows.some(
                win =>
                    windowStartAt === win.startAt &&
                    windowEndAt === win.endAt &&
                    raw.startAt >= win.startAt &&
                    raw.endAt <= win.endAt,
            ) &&
            !windows.some(
                win => raw.startAt >= win.startAt && raw.endAt <= win.endAt,
            )
        ) {
            // 有提供 windows 時，slot 必須落在某個 window
            continue;
        }
        annotated.push({
            startAt: raw.startAt,
            endAt: raw.endAt,
            windowStartAt,
            windowEndAt,
        });
    }

    annotated.sort((a, b) => {
        if (a.windowStartAt !== b.windowStartAt) {
            if (a.windowStartAt < b.windowStartAt) {
                return -1;
            }
            if (a.windowStartAt > b.windowStartAt) {
                return 1;
            }
        }
        if (a.startAt < b.startAt) {
            return -1;
        }
        if (a.startAt > b.startAt) {
            return 1;
        }
        return 0;
    });

    // 去重
    const unique = [];
    const seen = new Set();
    for (let i = 0; i < annotated.length; i++) {
        const item = annotated[i];
        const key = `${item.windowStartAt}|${item.startAt}|${item.endAt}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(item);
    }

    const ranges = [];
    let current = null;
    for (let i = 0; i < unique.length; i++) {
        const slot = unique[i];
        if (!current) {
            current = {
                startAt: slot.startAt,
                endAt: slot.endAt,
                windowStartAt: slot.windowStartAt,
                windowEndAt: slot.windowEndAt,
            };
            continue;
        }
        const sameWindow =
            current.windowStartAt === slot.windowStartAt &&
            current.windowEndAt === slot.windowEndAt;
        const adjacent = current.endAt === slot.startAt;
        if (sameWindow && adjacent) {
            current.endAt = slot.endAt;
        } else {
            ranges.push({
                startAt: current.startAt,
                endAt: current.endAt,
            });
            current = {
                startAt: slot.startAt,
                endAt: slot.endAt,
                windowStartAt: slot.windowStartAt,
                windowEndAt: slot.windowEndAt,
            };
        }
    }
    if (current) {
        ranges.push({
            startAt: current.startAt,
            endAt: current.endAt,
        });
    }

    // 對齊 slotMinutes：確保長度為整數格（防禦）
    return ranges
        .map(range => alignRangeToSlots(range, slotMinutes, tz))
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
 * 將 range 對齊到 slotMinutes（若無法對齊則丟棄）
 * @param {{startAt: string, endAt: string}} range
 * @param {number} slotMinutes
 * @param {string} timezone
 * @returns {{startAt: string, endAt: string}|null}
 */
export function alignRangeToSlots(range, slotMinutes, timezone) {
    const start = parseInTimezone(range && range.startAt, timezone);
    const end = parseInTimezone(range && range.endAt, timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    if (!start || !end || !end.isAfter(start)) {
        return null;
    }
    const diffMinutes = end.diff(start, 'minutes');
    if (diffMinutes <= 0 || diffMinutes % slot !== 0) {
        return null;
    }
    return {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
    };
}

/**
 * 將選中 slots 合併為 candidateWindows（建立活動用）
 * 同一天相鄰格合併；空檔產生多段；date 由活動時區 startAt 產生
 * @param {Array} selectedSlots
 * @param {object} options
 * @param {string} options.timezone
 * @param {number} options.slotMinutes
 * @returns {Array<{date: string, startAt: string, endAt: string}>}
 */
export function mergeSlotsToCandidateWindows(selectedSlots, options = {}) {
    const tz = normalizeTimezone(options.timezone);
    const slotMinutes = normalizeSlotMinutes(options.slotMinutes);
    if (!Array.isArray(selectedSlots) || selectedSlots.length === 0) {
        return [];
    }

    const sorted = selectedSlots
        .filter(slot => slot && slot.startAt && slot.endAt)
        .slice()
        .sort((a, b) => {
            if (a.startAt < b.startAt) {
                return -1;
            }
            if (a.startAt > b.startAt) {
                return 1;
            }
            return 0;
        });

    // 去重
    const unique = [];
    const seen = new Set();
    for (let i = 0; i < sorted.length; i++) {
        const key = slotKey(sorted[i]);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(sorted[i]);
    }

    const windows = [];
    let current = null;
    for (let i = 0; i < unique.length; i++) {
        const slot = unique[i];
        const start = parseInTimezone(slot.startAt, tz);
        if (!start) {
            continue;
        }
        if (!current) {
            current = {
                startAt: slot.startAt,
                endAt: slot.endAt,
            };
            continue;
        }
        // 僅相鄰且同一日曆日才合併；跨日或中間有空檔則切新 window
        const currentEnd = parseInTimezone(current.endAt, tz);
        const sameDay =
            currentEnd &&
            currentEnd.format('YYYY-MM-DD') === start.format('YYYY-MM-DD');
        if (sameDay && current.endAt === slot.startAt) {
            current.endAt = slot.endAt;
        } else {
            const date = parseInTimezone(current.startAt, tz).format('YYYY-MM-DD');
            windows.push({
                date,
                startAt: current.startAt,
                endAt: current.endAt,
            });
            current = {
                startAt: slot.startAt,
                endAt: slot.endAt,
            };
        }
    }
    if (current) {
        const date = parseInTimezone(current.startAt, tz).format('YYYY-MM-DD');
        windows.push({
            date,
            startAt: current.startAt,
            endAt: current.endAt,
        });
    }

    return normalizeCandidateWindows(windows, tz).filter(win => {
        const aligned = alignRangeToSlots(win, slotMinutes, tz);
        return Boolean(aligned);
    });
}

/**
 * 將 ranges 展開回 slots（需在 candidate windows 內）
 * @param {Array<{startAt: string, endAt: string}>} ranges
 * @param {Array} candidateWindows
 * @param {number} slotMinutes
 * @param {string} timezone
 * @returns {Array}
 */
export function expandRangesToSlots(ranges, candidateWindows, slotMinutes, timezone) {
    const allSlots = expandCandidateWindowsToSlots(
        candidateWindows,
        slotMinutes,
        timezone,
    );
    if (!Array.isArray(ranges) || ranges.length === 0) {
        return [];
    }
    return allSlots.filter(slot =>
        ranges.some(
            range => range.startAt <= slot.startAt && range.endAt >= slot.endAt,
        ),
    );
}
