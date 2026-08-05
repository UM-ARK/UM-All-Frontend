/**
 * 組隊約時間：weekly 熱力圖與最佳時段建議（純函式）
 */
import {
    isAvailabilitySubmitted,
    normalizeAvailability,
    normalizeCandidateWindows,
    normalizeSlotMinutes,
    normalizeTimezone,
    rangeCoversSlot,
} from '../../../utils/scheduling/schedulingModels';
import {expandCandidateWindowsToSlots} from './scheduleRanges';

/**
 * 取得 summary 中 active 成員列表。
 */
export function getActiveMembers(summary) {
    if (!summary || !Array.isArray(summary.members)) {
        return [];
    }
    return summary.members.filter(member => {
        if (!member) {
            return false;
        }
        return member.status == null || member.status === 'active';
    });
}

/**
 * 提交／空閒統計（availability 三種語意）。
 */
export function computeAvailabilityStats(members) {
    const list = Array.isArray(members) ? members : [];
    let submittedCount = 0;
    let fullyBusyCount = 0;
    let withRangesCount = 0;
    for (let i = 0; i < list.length; i++) {
        const availability = normalizeAvailability(list[i].availability);
        if (!isAvailabilitySubmitted(availability)) {
            continue;
        }
        submittedCount += 1;
        if (availability.ranges.length === 0) {
            fullyBusyCount += 1;
        } else {
            withRangesCount += 1;
        }
    }
    const memberCount = list.length;
    return {
        memberCount,
        submittedCount,
        fullyBusyCount,
        withRangesCount,
        unsubmittedCount: memberCount - submittedCount,
    };
}

/**
 * 建立每個 weekly slot 的熱力資料。
 */
export function buildHeatmap({
    candidateWindows,
    slotMinutes,
    timezone,
    members,
} = {}) {
    const slot = normalizeSlotMinutes(slotMinutes);
    const windows = normalizeCandidateWindows(candidateWindows);
    const activeMembers = Array.isArray(members) ? members : [];
    const stats = computeAvailabilityStats(activeMembers);
    const normalizedMembers = activeMembers.map(member => ({
        ...member,
        availability: normalizeAvailability(member.availability),
    }));
    const slots = expandCandidateWindowsToSlots(windows, slot).map(base => {
        const freeMembers = [];
        for (let i = 0; i < normalizedMembers.length; i++) {
            const member = normalizedMembers[i];
            if (
                isAvailabilitySubmitted(member.availability) &&
                member.availability.ranges.some(range => rangeCoversSlot(range, base))
            ) {
                freeMembers.push(member);
            }
        }
        const availableCount = freeMembers.length;
        return {
            ...base,
            availableCount,
            submittedCount: stats.submittedCount,
            memberCount: stats.memberCount,
            heat: stats.memberCount > 0 ? availableCount / stats.memberCount : 0,
            freeMembers,
        };
    });

    return {
        slots,
        memberCount: stats.memberCount,
        submittedCount: stats.submittedCount,
        stats,
        timezone: normalizeTimezone(timezone),
    };
}

/**
 * 將固定 15 分鐘的 heatmap slots 聚合為顯示用格子。
 * 統計資料取可出席人數最高的單一 child slot，避免合併不同時間的成員。
 */
export function aggregateHeatmapSlots(heatmapSlots, displaySlotMinutes, selfSelectedKeys) {
    if (!Array.isArray(heatmapSlots)) {
        return [];
    }
    const displaySlot = normalizeSlotMinutes(displaySlotMinutes);
    const selectedKeys = selfSelectedKeys instanceof Set
        ? selfSelectedKeys
        : new Set(Array.isArray(selfSelectedKeys) ? selfSelectedKeys : []);
    const buckets = new Map();
    const sorted = heatmapSlots
        .filter(isFifteenMinuteHeatmapSlot)
        .slice()
        .sort(compareSlotsByWindow);

    for (let i = 0; i < sorted.length; i++) {
        const slot = sorted[i];
        const startMinute = Math.floor(slot.startMinute / displaySlot) * displaySlot;
        const key = `${slot.weekday}:${startMinute}`;
        const bucket = buckets.get(key);
        if (bucket) {
            bucket.childSlots.push(slot);
            continue;
        }
        buckets.set(key, {
            weekday: slot.weekday,
            startMinute,
            endMinute: startMinute + displaySlot,
            childSlots: [slot],
        });
    }

    return Array.from(buckets.values()).map(bucket => {
        const representative = getHeatmapRepresentativeSlot(bucket.childSlots);
        return {
            ...bucket,
            hasData: bucket.childSlots.some(slot => slot.hasData !== false),
            isSelfSelected: bucket.childSlots.some(slot =>
                slot.isSelfSelected || selectedKeys.has(`${slot.weekday}:${slot.startMinute}`),
            ),
            representativeSlot: representative,
            availableCount: getAvailableCount(representative),
            memberCount: representative.memberCount,
            heat: representative.heat,
            freeMembers: representative.freeMembers,
        };
    });
}

/**
 * 合併同一天相鄰且可出席成員相同的時段，供整日統計顯示。
 */
export function mergeHeatmapSlotsForDay(heatmapSlots, weekday) {
    if (!Array.isArray(heatmapSlots) || !Number.isInteger(weekday)) {
        return [];
    }
    const sorted = heatmapSlots
        .filter(slot => slot?.weekday === weekday)
        .slice()
        .sort((a, b) => a.startMinute - b.startMinute);
    const merged = [];
    for (let i = 0; i < sorted.length; i++) {
        const slot = sorted[i];
        const previous = merged[merged.length - 1];
        if (
            previous &&
            previous.endMinute === slot.startMinute &&
            previous.memberCount === slot.memberCount &&
            getFreeMemberSignature(previous.freeMembers) ===
                getFreeMemberSignature(slot.freeMembers)
        ) {
            previous.endMinute = slot.endMinute;
            continue;
        }
        merged.push({...slot});
    }
    return merged;
}

/**
 * 由 heatmap slots 推導最佳時段建議（最多 3 項）。
 * 同一 candidate window 內相鄰且人數相同才合併，不可跨 weekday 或 gap。
 */
export function suggestBestSlots(heatmapSlots) {
    if (!Array.isArray(heatmapSlots)) {
        return [];
    }
    const sorted = heatmapSlots
        .filter(slot => slot.availableCount > 0)
        .slice()
        .sort(compareSlotsByWindow);
    const merged = [];
    let current = null;
    for (let i = 0; i < sorted.length; i++) {
        const slot = sorted[i];
        if (
            current &&
            current.weekday === slot.weekday &&
            current.windowStartMinute === slot.windowStartMinute &&
            current.windowEndMinute === slot.windowEndMinute &&
            current.availableCount === slot.availableCount &&
            current.endMinute === slot.startMinute
        ) {
            current.endMinute = slot.endMinute;
            continue;
        }
        if (current) {
            merged.push(current);
        }
        current = {
            weekday: slot.weekday,
            startMinute: slot.startMinute,
            endMinute: slot.endMinute,
            availableCount: slot.availableCount,
            memberCount: slot.memberCount,
            heat: slot.heat,
            windowStartMinute: slot.windowStartMinute,
            windowEndMinute: slot.windowEndMinute,
        };
    }
    if (current) {
        merged.push(current);
    }
    return merged
        .sort((a, b) => {
            if (b.availableCount !== a.availableCount) {
                return b.availableCount - a.availableCount;
            }
            if (a.weekday !== b.weekday) {
                return a.weekday - b.weekday;
            }
            return a.startMinute - b.startMinute;
        })
        .slice(0, 3)
        .map(item => ({
            weekday: item.weekday,
            startMinute: item.startMinute,
            endMinute: item.endMinute,
            availableCount: item.availableCount,
            memberCount: item.memberCount,
            heat: item.heat,
        }));
}

/**
 * 一次建立 heatmap 與最佳建議。
 */
export function buildHeatmapWithSuggestions(params) {
    const heatmap = buildHeatmap(params);
    return {
        heatmap,
        suggestions: suggestBestSlots(heatmap.slots),
    };
}

function compareSlotsByWindow(a, b) {
    if (a.weekday !== b.weekday) {
        return a.weekday - b.weekday;
    }
    if (a.windowStartMinute !== b.windowStartMinute) {
        return a.windowStartMinute - b.windowStartMinute;
    }
    return a.startMinute - b.startMinute;
}

function isFifteenMinuteHeatmapSlot(slot) {
    return (
        slot &&
        Number.isInteger(slot.weekday) &&
        Number.isInteger(slot.startMinute) &&
        Number.isInteger(slot.endMinute) &&
        slot.startMinute >= 0 &&
        slot.endMinute <= 1440 &&
        slot.endMinute - slot.startMinute === 15
    );
}

function getHeatmapRepresentativeSlot(childSlots) {
    let representative = childSlots[0];
    for (let i = 1; i < childSlots.length; i++) {
        const slot = childSlots[i];
        if (getAvailableCount(slot) > getAvailableCount(representative)) {
            representative = slot;
        }
    }
    return representative;
}

function getAvailableCount(slot) {
    return Number.isFinite(slot?.availableCount) ? slot.availableCount : 0;
}

function getFreeMemberSignature(members) {
    if (!Array.isArray(members)) {
        return '';
    }
    return members
        .map(member => String(member?.harborUserId ?? member?.username ?? ''))
        .sort()
        .join('|');
}
