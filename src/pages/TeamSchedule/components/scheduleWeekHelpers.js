/**
 * 七日時間板輔助：候選模式預設日軸、ISO 偏移格式、可選時間邊界
 */
import moment from 'moment-timezone';

import {
    DEFAULT_TIMEZONE,
    dateKeyFromStartAt,
    normalizeSlotMinutes,
    normalizeTimezone,
    parseInTimezone,
} from '../../../utils/scheduling/schedulingModels';
import {getWeekDateKeys} from '../utils/scheduleGrid';
import {expandCandidateWindowsToSlots} from '../utils/scheduleRanges';

/** 候選模式預設可選時段（澳門牆鐘） */
export const CANDIDATE_AXIS_START_HOUR = 8;
export const CANDIDATE_AXIS_END_HOUR = 22;

/** 活動建立後後端有效期（天） */
export const EVENT_EXPIRY_DAYS = 180;

/**
 * 單日候選畫布 window（半開）
 * @param {string} dateKey
 * @param {string} timezone
 * @param {number} [startHour]
 * @param {number} [endHour]
 * @returns {{date: string, startAt: string, endAt: string}}
 */
export function buildCandidateDayWindow(
    dateKey,
    timezone,
    startHour = CANDIDATE_AXIS_START_HOUR,
    endHour = CANDIDATE_AXIS_END_HOUR,
) {
    const tz = normalizeTimezone(timezone);
    const start = moment.tz(
        `${dateKey} ${String(startHour).padStart(2, '0')}:00`,
        'YYYY-MM-DD HH:mm',
        tz,
    );
    const end = moment.tz(
        `${dateKey} ${String(endHour).padStart(2, '0')}:00`,
        'YYYY-MM-DD HH:mm',
        tz,
    );
    return {
        date: dateKey,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
    };
}

/**
 * 建立一週七天候選畫布 windows
 * @param {string} weekStartDate
 * @param {string} timezone
 * @param {number} [startHour]
 * @param {number} [endHour]
 * @returns {Array}
 */
export function buildCandidateWeekWindows(
    weekStartDate,
    timezone,
    startHour = CANDIDATE_AXIS_START_HOUR,
    endHour = CANDIDATE_AXIS_END_HOUR,
) {
    const tz = normalizeTimezone(timezone);
    return getWeekDateKeys(weekStartDate, tz).map(dateKey =>
        buildCandidateDayWindow(dateKey, tz, startHour, endHour),
    );
}

/**
 * 展開一週可選 slots
 * @param {string} weekStartDate
 * @param {string} timezone
 * @param {number} slotMinutes
 * @returns {Array}
 */
export function buildCandidateWeekSlots(weekStartDate, timezone, slotMinutes) {
    const tz = normalizeTimezone(timezone);
    const windows = buildCandidateWeekWindows(weekStartDate, tz);
    return expandCandidateWindowsToSlots(
        windows,
        normalizeSlotMinutes(slotMinutes),
        tz,
    );
}

/**
 * 活動有效期上限（約建立時起 180 天）
 * @param {string} [timezone]
 * @param {import('moment').Moment|Date|string|null} [from]
 * @returns {import('moment').Moment}
 */
export function getEventExpiryMoment(timezone = DEFAULT_TIMEZONE, from = null) {
    const tz = normalizeTimezone(timezone);
    const base = from ? moment.tz(from, tz) : moment.tz(tz);
    return base.clone().add(EVENT_EXPIRY_DAYS, 'days');
}

/**
 * 合理最早可選 slot 起點（對齊 slotMinutes，略過已開始的格）
 * @param {string} timezone
 * @param {number} slotMinutes
 * @returns {import('moment').Moment}
 */
export function getEarliestSelectableStart(timezone, slotMinutes) {
    const tz = normalizeTimezone(timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    const now = moment.tz(tz);
    const dayStart = now.clone().startOf('day');
    const minutesFromMidnight = now.diff(dayStart, 'minutes');
    const ceilSlots = Math.ceil(minutesFromMidnight / slot);
    let aligned = dayStart.clone().add(ceilSlots * slot, 'minutes');
    // 恰落在邊界但已過秒數／毫秒時，進到下一格
    if (!aligned.isAfter(now)) {
        aligned = aligned.add(slot, 'minutes');
    }
    return aligned;
}

/**
 * slot 是否仍可選（未開始且不超過有效期）
 * @param {{startAt: string, endAt: string}} slot
 * @param {object} options
 * @returns {boolean}
 */
export function isCandidateSlotSelectable(slot, options = {}) {
    const tz = normalizeTimezone(options.timezone);
    const slotMinutes = normalizeSlotMinutes(options.slotMinutes);
    const start = parseInTimezone(slot && slot.startAt, tz);
    const end = parseInTimezone(slot && slot.endAt, tz);
    if (!start || !end) {
        return false;
    }
    const earliest = options.earliestStart
        ? moment.tz(options.earliestStart, tz)
        : getEarliestSelectableStart(tz, slotMinutes);
    const expiry = options.expiryAt
        ? moment.tz(options.expiryAt, tz)
        : getEventExpiryMoment(tz);
    if (!start.isSameOrAfter(earliest)) {
        return false;
    }
    if (end.isAfter(expiry)) {
        return false;
    }
    return true;
}

/**
 * 由選取鍵還原 slots（供 commitCandidateDraft 使用）
 * @param {string[]} selectedKeys
 * @param {string} timezone
 * @returns {Array<{date: string, startAt: string, endAt: string}>}
 */
export function slotsFromSelectedKeys(selectedKeys, timezone) {
    const tz = normalizeTimezone(timezone);
    if (!Array.isArray(selectedKeys)) {
        return [];
    }
    const slots = [];
    for (let i = 0; i < selectedKeys.length; i++) {
        const key = selectedKeys[i];
        if (typeof key !== 'string' || !key.includes('|')) {
            continue;
        }
        const sep = key.indexOf('|');
        const startAt = key.slice(0, sep);
        const endAt = key.slice(sep + 1);
        const date = dateKeyFromStartAt(startAt, tz);
        if (!date) {
            continue;
        }
        slots.push({date, startAt, endAt});
    }
    return slots;
}

/**
 * 轉為帶 Asia/Macau offset 的 ISO 8601（無毫秒）
 * @param {string} iso
 * @param {string} [timezone]
 * @returns {string|null}
 */
export function formatOffsetIso(iso, timezone = DEFAULT_TIMEZONE) {
    const m = parseInTimezone(iso, timezone);
    if (!m) {
        return null;
    }
    return m.format('YYYY-MM-DDTHH:mm:ssZ');
}

/**
 * 將 DateTimePicker 選取的本地牆鐘解讀為活動時區瞬間
 * （裝置時區與澳門不同時的折衷：以 picker 顯示數字視為澳門時間）
 * @param {Date} date
 * @param {string} [timezone]
 * @returns {string}
 */
export function wallClockDateToOffsetIso(date, timezone = DEFAULT_TIMEZONE) {
    const tz = normalizeTimezone(timezone);
    const wall = moment(date).format('YYYY-MM-DD HH:mm');
    return moment.tz(wall, 'YYYY-MM-DD HH:mm', tz).format('YYYY-MM-DDTHH:mm:ssZ');
}

/**
 * 週範圍顯示文字
 * @param {string} weekStartDate
 * @param {string} weekEndDate
 * @returns {string}
 */
export function formatWeekRangeLabel(weekStartDate, weekEndDate) {
    const start = moment(weekStartDate, 'YYYY-MM-DD');
    const end = moment(weekEndDate, 'YYYY-MM-DD');
    if (!start.isValid() || !end.isValid()) {
        return '';
    }
    if (start.year() !== end.year()) {
        return `${start.format('YYYY年M月D日')} – ${end.format('YYYY年M月D日')}`;
    }
    if (start.month() !== end.month()) {
        return `${start.format('M月D日')} – ${end.format('M月D日')}`;
    }
    return `${start.format('M月D日')} – ${end.format('D日')}`;
}

/** 週一至週日短標 */
export const WEEKDAY_SHORT_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/**
 * 詳情模式：展開落在指定週內的候選 slots
 * @param {string} weekStartDate
 * @param {Array} candidateWindows
 * @param {string} timezone
 * @param {number} slotMinutes
 * @returns {Array}
 */
export function buildDetailWeekSlots(
    weekStartDate,
    candidateWindows,
    timezone,
    slotMinutes,
) {
    const tz = normalizeTimezone(timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    const dateSet = new Set(getWeekDateKeys(weekStartDate, tz));
    const all = expandCandidateWindowsToSlots(
        candidateWindows,
        slot,
        tz,
    );
    return all.filter(item => dateSet.has(item.date));
}

/**
 * 熱力深度 → theme tonal 背景色
 * @param {number} heat 0～1
 * @param {object} theme
 * @param {boolean} [dimmed]
 * @returns {string}
 */
export function heatToBackgroundColor(heat, theme, dimmed = false) {
    const value = typeof heat === 'number' ? heat : 0;
    let color = theme.white;
    if (value > 0.66) {
        color = theme.tonal.primary50;
    } else if (value > 0.33) {
        color = theme.tonal.primary30;
    } else if (value > 0) {
        color = theme.tonal.primary15;
    }
    if (dimmed && value > 0) {
        // 編輯模式降低熱力對比：退一階
        if (value > 0.66) {
            return theme.tonal.primary30;
        }
        if (value > 0.33) {
            return theme.tonal.primary15;
        }
        return theme.tonal.primary08;
    }
    return color;
}

/**
 * 建議時段顯示文字
 * @param {{startAt: string, endAt: string, date: string}} suggestion
 * @param {string} timezone
 * @returns {string}
 */
export function formatSuggestionLabel(suggestion, timezone) {
    if (!suggestion) {
        return '';
    }
    const tz = normalizeTimezone(timezone);
    const start = parseInTimezone(suggestion.startAt, tz);
    const end = parseInTimezone(suggestion.endAt, tz);
    if (!start || !end) {
        return '';
    }
    return `${start.format('M/D HH:mm')} – ${end.format('HH:mm')}`;
}
