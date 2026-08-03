/**
 * 組隊約時間：熱力圖與最佳時段建議（純函式）
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
 * 取得 summary 中 active 成員列表
 * @param {object} summary
 * @returns {Array}
 */
export function getActiveMembers(summary) {
    if (!summary || !Array.isArray(summary.members)) {
        return [];
    }
    return summary.members.filter(member => {
        if (!member) {
            return false;
        }
        // 未標 status 時視為 active；明確 left 等狀態排除
        return member.status == null || member.status === 'active';
    });
}

/**
 * 提交／空閒統計（availability 三種語意）
 * @param {Array} members
 * @param {string} timezone
 * @returns {{memberCount: number, submittedCount: number, fullyBusyCount: number, withRangesCount: number, unsubmittedCount: number}}
 */
export function computeAvailabilityStats(members, timezone) {
    const list = Array.isArray(members) ? members : [];
    let submittedCount = 0;
    let fullyBusyCount = 0;
    let withRangesCount = 0;
    for (let i = 0; i < list.length; i++) {
        const availability = normalizeAvailability(list[i].availability, timezone);
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
 * 建立每個 slot 的熱力資料
 * @param {object} params
 * @param {Array} params.candidateWindows
 * @param {number} params.slotMinutes
 * @param {string} params.timezone
 * @param {Array} params.members active members（含 availability）
 * @returns {{slots: Array, memberCount: number, submittedCount: number, stats: object}}
 */
export function buildHeatmap({
    candidateWindows,
    slotMinutes,
    timezone,
    members,
} = {}) {
    const tz = normalizeTimezone(timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    const windows = normalizeCandidateWindows(candidateWindows, tz);
    const activeMembers = Array.isArray(members) ? members : [];
    const stats = computeAvailabilityStats(activeMembers, tz);
    const memberCount = stats.memberCount;

    const normalizedMembers = activeMembers.map(member => ({
        ...member,
        availability: normalizeAvailability(member.availability, tz),
    }));

    const baseSlots = expandCandidateWindowsToSlots(windows, slot, tz);
    const slots = baseSlots.map(base => {
        const freeMembers = [];
        let availableCount = 0;
        for (let i = 0; i < normalizedMembers.length; i++) {
            const member = normalizedMembers[i];
            const availability = member.availability;
            if (!isAvailabilitySubmitted(availability)) {
                continue;
            }
            const covered = availability.ranges.some(range =>
                rangeCoversSlot(range, base),
            );
            if (covered) {
                availableCount += 1;
                freeMembers.push(member);
            }
        }
        const heat =
            memberCount > 0 ? availableCount / memberCount : 0;
        return {
            ...base,
            availableCount,
            submittedCount: stats.submittedCount,
            memberCount,
            heat,
            freeMembers,
        };
    });

    return {
        slots,
        memberCount,
        submittedCount: stats.submittedCount,
        stats,
    };
}

/**
 * 由 heatmap slots 推導最佳時段建議（最多 3 項）
 * - 取 availableCount 最高者
 * - 同一 candidate window 內相鄰且人數相同才合併
 * - 不可跨日／跨 gap
 * - 人數降序、開始升序；availableCount===0 不顯示
 * @param {Array} heatmapSlots
 * @returns {Array<{startAt: string, endAt: string, date: string, availableCount: number, memberCount: number, heat: number}>}
 */
export function suggestBestSlots(heatmapSlots) {
    if (!Array.isArray(heatmapSlots) || heatmapSlots.length === 0) {
        return [];
    }

    const positive = heatmapSlots.filter(slot => slot.availableCount > 0);
    if (positive.length === 0) {
        return [];
    }

    // 依 window 再依 start 排序，方便相鄰合併
    const sorted = positive.slice().sort((a, b) => {
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

    const merged = [];
    let current = null;
    for (let i = 0; i < sorted.length; i++) {
        const slot = sorted[i];
        if (!current) {
            current = {
                startAt: slot.startAt,
                endAt: slot.endAt,
                date: slot.date,
                availableCount: slot.availableCount,
                memberCount: slot.memberCount,
                heat: slot.heat,
                windowStartAt: slot.windowStartAt,
                windowEndAt: slot.windowEndAt,
            };
            continue;
        }
        const sameWindow =
            current.windowStartAt === slot.windowStartAt &&
            current.windowEndAt === slot.windowEndAt;
        const sameCount = current.availableCount === slot.availableCount;
        const adjacent = current.endAt === slot.startAt;
        const sameDay = current.date === slot.date;
        if (sameWindow && sameCount && adjacent && sameDay) {
            current.endAt = slot.endAt;
        } else {
            merged.push(current);
            current = {
                startAt: slot.startAt,
                endAt: slot.endAt,
                date: slot.date,
                availableCount: slot.availableCount,
                memberCount: slot.memberCount,
                heat: slot.heat,
                windowStartAt: slot.windowStartAt,
                windowEndAt: slot.windowEndAt,
            };
        }
    }
    if (current) {
        merged.push(current);
    }

    merged.sort((a, b) => {
        if (b.availableCount !== a.availableCount) {
            return b.availableCount - a.availableCount;
        }
        if (a.startAt < b.startAt) {
            return -1;
        }
        if (a.startAt > b.startAt) {
            return 1;
        }
        return 0;
    });

    return merged.slice(0, 3).map(item => ({
        startAt: item.startAt,
        endAt: item.endAt,
        date: item.date,
        availableCount: item.availableCount,
        memberCount: item.memberCount,
        heat: item.heat,
    }));
}

/**
 * 一次建立 heatmap 與最佳建議
 * @param {object} params
 * @returns {{heatmap: object, suggestions: Array}}
 */
export function buildHeatmapWithSuggestions(params) {
    const heatmap = buildHeatmap(params);
    return {
        heatmap,
        suggestions: suggestBestSlots(heatmap.slots),
    };
}
