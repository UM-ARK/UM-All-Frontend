/**
 * 組隊約時間：weekly slot 展開與 ranges 合併（純函式）
 * 半開區間 `[startMinute, endMinute)`；不可跨 candidate window 空檔合併。
 */
import {
    normalizeCandidateWindows,
    normalizeSlotMinutes,
    normalizeWeekday,
} from '../../../utils/scheduling/schedulingModels';

/**
 * 將單一 candidate window 展開為半開 slots。
 */
export function expandWindowToSlots(window, slotMinutes) {
    const slot = normalizeSlotMinutes(slotMinutes);
    const windows = normalizeCandidateWindows([window]);
    if (windows.length === 0) {
        return [];
    }
    const normalized = windows[0];
    const slots = [];
    for (
        let startMinute = normalized.startMinute;
        startMinute + slot <= normalized.endMinute;
        startMinute += slot
    ) {
        slots.push({
            weekday: normalized.weekday,
            startMinute,
            endMinute: startMinute + slot,
            windowStartMinute: normalized.startMinute,
            windowEndMinute: normalized.endMinute,
        });
    }
    return slots;
}

/**
 * 展開所有 candidate windows 的 slots（保留 window 邊界以便不跨 gap）。
 */
export function expandCandidateWindowsToSlots(windows, slotMinutes) {
    const normalized = normalizeCandidateWindows(windows);
    return normalized.flatMap(window => expandWindowToSlots(window, slotMinutes));
}

/**
 * slot 鍵值（便於 Set／Map）。
 */
export function slotKey(slot) {
    return `${slot && slot.weekday}:${slot && slot.startMinute}`;
}

/**
 * 在同一 candidate window 內，將相鄰選中 slots 合併為 ranges。
 */
export function mergeSlotsToRanges(selectedSlots, options = {}) {
    const slotMinutes = normalizeSlotMinutes(options.slotMinutes);
    const windows = normalizeCandidateWindows(options.candidateWindows);
    const annotated = annotateSelectedSlots(selectedSlots, windows);
    const ranges = mergeAnnotatedSlots(annotated);
    return ranges
        .map(range => alignRangeToSlots(range, slotMinutes))
        .filter(Boolean)
        .sort(compareSlots);
}

/**
 * 將 range 對齊到 slotMinutes（若無法對齊則丟棄）。
 */
export function alignRangeToSlots(range, slotMinutes) {
    if (!range || typeof range !== 'object') {
        return null;
    }
    const weekday = normalizeWeekday(range.weekday);
    const startMinute = Number(range.startMinute);
    const endMinute = Number(range.endMinute);
    const slot = normalizeSlotMinutes(slotMinutes);
    if (
        weekday == null ||
        !Number.isInteger(startMinute) ||
        !Number.isInteger(endMinute) ||
        startMinute < 0 ||
        endMinute > 1440 ||
        endMinute <= startMinute ||
        startMinute % slot !== 0 ||
        endMinute % slot !== 0
    ) {
        return null;
    }
    return {weekday, startMinute, endMinute};
}

/**
 * 將選中 slots 合併為 candidateWindows（建立活動用）。
 */
export function mergeSlotsToCandidateWindows(selectedSlots, options = {}) {
    const slotMinutes = normalizeSlotMinutes(options.slotMinutes);
    const sorted = uniqueSlots(selectedSlots).sort(compareSlots);
    const windows = [];
    let current = null;
    for (let i = 0; i < sorted.length; i++) {
        const slot = alignRangeToSlots(sorted[i], slotMinutes);
        if (!slot) {
            continue;
        }
        if (
            current &&
            current.weekday === slot.weekday &&
            current.endMinute === slot.startMinute
        ) {
            current.endMinute = slot.endMinute;
            continue;
        }
        if (current) {
            windows.push(current);
        }
        current = {...slot};
    }
    if (current) {
        windows.push(current);
    }
    return normalizeCandidateWindows(windows);
}

/**
 * 將 ranges 展開回 slots（需在 candidate windows 內）。
 */
export function expandRangesToSlots(ranges, candidateWindows, slotMinutes) {
    const allSlots = expandCandidateWindowsToSlots(candidateWindows, slotMinutes);
    if (!Array.isArray(ranges) || ranges.length === 0) {
        return [];
    }
    return allSlots.filter(slot =>
        ranges.some(
            range =>
                range.weekday === slot.weekday &&
                range.startMinute <= slot.startMinute &&
                range.endMinute >= slot.endMinute,
        ),
    );
}

function annotateSelectedSlots(selectedSlots, windows) {
    if (!Array.isArray(selectedSlots) || selectedSlots.length === 0) {
        return [];
    }
    const annotated = [];
    for (let i = 0; i < selectedSlots.length; i++) {
        const slot = selectedSlots[i];
        if (!slot) {
            continue;
        }
        const owner = windows.find(
            window =>
                window.weekday === slot.weekday &&
                slot.startMinute >= window.startMinute &&
                slot.endMinute <= window.endMinute,
        );
        if (!owner) {
            continue;
        }
        annotated.push({
            weekday: slot.weekday,
            startMinute: slot.startMinute,
            endMinute: slot.endMinute,
            windowStartMinute: owner.startMinute,
            windowEndMinute: owner.endMinute,
        });
    }
    return uniqueSlots(annotated).sort((a, b) => {
        if (a.weekday !== b.weekday) {
            return a.weekday - b.weekday;
        }
        if (a.windowStartMinute !== b.windowStartMinute) {
            return a.windowStartMinute - b.windowStartMinute;
        }
        return a.startMinute - b.startMinute;
    });
}

function mergeAnnotatedSlots(slots) {
    const ranges = [];
    let current = null;
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (
            current &&
            current.weekday === slot.weekday &&
            current.windowStartMinute === slot.windowStartMinute &&
            current.windowEndMinute === slot.windowEndMinute &&
            current.endMinute === slot.startMinute
        ) {
            current.endMinute = slot.endMinute;
            continue;
        }
        if (current) {
            ranges.push({
                weekday: current.weekday,
                startMinute: current.startMinute,
                endMinute: current.endMinute,
            });
        }
        current = {...slot};
    }
    if (current) {
        ranges.push({
            weekday: current.weekday,
            startMinute: current.startMinute,
            endMinute: current.endMinute,
        });
    }
    return ranges;
}

function uniqueSlots(slots) {
    if (!Array.isArray(slots)) {
        return [];
    }
    const unique = [];
    const seen = new Set();
    for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        if (!slot) {
            continue;
        }
        const key = slotKey(slot);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(slot);
    }
    return unique;
}

function compareSlots(a, b) {
    if (a.weekday !== b.weekday) {
        return a.weekday - b.weekday;
    }
    if (a.startMinute !== b.startMinute) {
        return a.startMinute - b.startMinute;
    }
    return a.endMinute - b.endMinute;
}
