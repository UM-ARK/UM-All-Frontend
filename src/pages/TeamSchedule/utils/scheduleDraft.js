/**
 * 組隊約時間：候選／可用時間草稿輔助（純函式）
 */
import {
    normalizeAvailability,
    normalizeCandidateWindows,
    normalizeSlotMinutes,
    normalizeTimezone,
} from '../../../utils/scheduling/schedulingModels';
import {isSlotInsideCandidateWindows} from './scheduleGrid';
import {
    expandCandidateWindowsToSlots,
    expandRangesToSlots,
    mergeSlotsToCandidateWindows,
    mergeSlotsToRanges,
    slotKey,
} from './scheduleRanges';

/**
 * 建立空草稿
 * @param {object} options
 * @param {'candidate'|'availability'} [options.mode]
 * @param {number} [options.slotMinutes]
 * @param {string} [options.timezone]
 * @param {number} [options.revision]
 * @returns {object}
 */
export function createEmptyDraft(options = {}) {
    return {
        mode: options.mode === 'candidate' ? 'candidate' : 'availability',
        slotMinutes: normalizeSlotMinutes(options.slotMinutes),
        timezone: normalizeTimezone(options.timezone),
        revision: typeof options.revision === 'number' ? options.revision : 0,
        selectedKeys: [],
    };
}

/**
 * 由 slots 陣列建立草稿選取集合
 * @param {Array} slots
 * @returns {string[]}
 */
export function slotsToSelectedKeys(slots) {
    if (!Array.isArray(slots)) {
        return [];
    }
    const keys = [];
    const seen = new Set();
    for (let i = 0; i < slots.length; i++) {
        const key = slotKey(slots[i]);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        keys.push(key);
    }
    return keys;
}

/**
 * 由選取鍵還原 slots（需對照完整 slot 清單）
 * @param {string[]} selectedKeys
 * @param {Array} allSlots
 * @returns {Array}
 */
export function selectedKeysToSlots(selectedKeys, allSlots) {
    if (!Array.isArray(selectedKeys) || !Array.isArray(allSlots)) {
        return [];
    }
    const set = new Set(selectedKeys);
    return allSlots.filter(slot => set.has(slotKey(slot)));
}

/**
 * 切換單一 slot 選取狀態
 * @param {object} draft
 * @param {{weekday: number, startMinute: number, endMinute: number}} slot
 * @returns {object}
 */
export function toggleDraftSlot(draft, slot) {
    const base = draft || createEmptyDraft();
    const key = slotKey(slot);
    const selected = new Set(base.selectedKeys || []);
    if (selected.has(key)) {
        selected.delete(key);
    } else {
        selected.add(key);
    }
    return {
        ...base,
        selectedKeys: Array.from(selected),
    };
}

/**
 * 依手勢模式批次加入或移除 slots（第一格決定 add／erase）
 * @param {object} draft
 * @param {Array} slots
 * @param {'add'|'erase'} mode
 * @returns {object}
 */
export function applyDraftGesture(draft, slots, mode) {
    const base = draft || createEmptyDraft();
    const selected = new Set(base.selectedKeys || []);
    const list = Array.isArray(slots) ? slots : [];
    for (let i = 0; i < list.length; i++) {
        const key = slotKey(list[i]);
        if (mode === 'erase') {
            selected.delete(key);
        } else {
            selected.add(key);
        }
    }
    return {
        ...base,
        selectedKeys: Array.from(selected),
    };
}

/**
 * 將指定時段內的可用 slots 批次加入草稿
 * @param {object} draft
 * @param {{weekday: number, startMinute: number, endMinute: number}} range
 * @param {Array} availableSlots
 * @returns {object}
 */
export function insertDraftRange(draft, range, availableSlots) {
    const base = draft || createEmptyDraft();
    const slots = Array.isArray(availableSlots)
        ? availableSlots.filter(
              item =>
                  item.weekday === range?.weekday &&
                  item.startMinute >= range?.startMinute &&
                  item.endMinute <= range?.endMinute,
          )
        : [];
    if (slots.length === 0) {
        return base;
    }
    return applyDraftGesture(base, slots, 'add');
}

/**
 * 由第一格與目前選取狀態推導手勢模式
 * @param {object} draft
 * @param {{weekday: number, startMinute: number, endMinute: number}} firstSlot
 * @returns {'add'|'erase'}
 */
export function resolveGestureMode(draft, firstSlot) {
    const selected = new Set((draft && draft.selectedKeys) || []);
    return selected.has(slotKey(firstSlot)) ? 'erase' : 'add';
}

/**
 * 從本人 availability 建立編輯草稿；null 以空草稿、revision 0 開始
 * @param {object} params
 * @param {object|null} params.availability
 * @param {Array} params.candidateWindows
 * @param {number} params.slotMinutes
 * @param {string} params.timezone
 * @param {number} [params.revision]
 * @returns {object}
 */
export function createAvailabilityDraftFromServer({
    availability,
    candidateWindows,
    slotMinutes,
    timezone,
    revision,
} = {}) {
    const tz = normalizeTimezone(timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    const windows = normalizeCandidateWindows(candidateWindows, tz);
    const normalized = normalizeAvailability(availability, tz);
    let draftRevision = 0;
    if (typeof revision === 'number') {
        draftRevision = revision;
    } else if (
        availability &&
        typeof availability.revision === 'number'
    ) {
        draftRevision = availability.revision;
    }

    if (normalized == null || normalized.ranges.length === 0) {
        return createEmptyDraft({
            mode: 'availability',
            slotMinutes: slot,
            timezone: tz,
            revision: draftRevision,
        });
    }

    const slots = expandRangesToSlots(
        normalized.ranges,
        windows,
        slot,
        tz,
    );
    return {
        mode: 'availability',
        slotMinutes: slot,
        timezone: tz,
        revision: draftRevision,
        selectedKeys: slotsToSelectedKeys(slots),
    };
}

/**
 * 從既有 candidateWindows 建立候選草稿
 * @param {object} params
 * @returns {object}
 */
export function createCandidateDraftFromWindows({
    candidateWindows,
    slotMinutes,
    timezone,
} = {}) {
    const tz = normalizeTimezone(timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    const windows = normalizeCandidateWindows(candidateWindows, tz);
    const slots = expandCandidateWindowsToSlots(windows, slot, tz);
    return {
        mode: 'candidate',
        slotMinutes: slot,
        timezone: tz,
        revision: 0,
        selectedKeys: slotsToSelectedKeys(slots),
    };
}

/**
 * 將草稿轉成 PUT availability 用的 ranges
 * @param {object} draft
 * @param {Array} candidateWindows
 * @returns {{ranges: Array<{weekday: number, startMinute: number, endMinute: number}>, revision: number}}
 */
export function commitAvailabilityDraft(draft, candidateWindows) {
    const tz = normalizeTimezone(draft && draft.timezone);
    const slot = normalizeSlotMinutes(draft && draft.slotMinutes);
    const windows = normalizeCandidateWindows(candidateWindows, tz);
    const allSlots = expandCandidateWindowsToSlots(windows, slot, tz);
    const selected = selectedKeysToSlots(draft && draft.selectedKeys, allSlots);
    // 僅保留落在候選 window 內的格子
    const valid = selected.filter(item =>
        isSlotInsideCandidateWindows(item, windows),
    );
    const ranges = mergeSlotsToRanges(valid, {
        candidateWindows: windows,
        slotMinutes: slot,
        timezone: tz,
    });
    return {
        ranges,
        revision: typeof draft?.revision === 'number' ? draft.revision : 0,
    };
}

/**
 * 將候選草稿轉成建立活動用的 candidateWindows
 * @param {object} draft
 * @param {Array} [referenceSlots] 完整可選 slot 清單；缺省則無法還原
 * @returns {Array<{weekday: number, startMinute: number, endMinute: number}>}
 */
export function commitCandidateDraft(draft, referenceSlots) {
    const tz = normalizeTimezone(draft && draft.timezone);
    const slot = normalizeSlotMinutes(draft && draft.slotMinutes);
    const allSlots = Array.isArray(referenceSlots) ? referenceSlots : [];
    const selected = selectedKeysToSlots(draft && draft.selectedKeys, allSlots);
    return mergeSlotsToCandidateWindows(selected, {
        timezone: tz,
        slotMinutes: slot,
    });
}

/**
 * 比較兩份草稿選取是否相同
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
export function areDraftSelectionsEqual(a, b) {
    const keysA = [...((a && a.selectedKeys) || [])].sort();
    const keysB = [...((b && b.selectedKeys) || [])].sort();
    if (keysA.length !== keysB.length) {
        return false;
    }
    for (let i = 0; i < keysA.length; i++) {
        if (keysA[i] !== keysB[i]) {
            return false;
        }
    }
    return true;
}
