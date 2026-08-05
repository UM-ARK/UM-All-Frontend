/**
 * 每週時間板輔助：固定週一至週日與分鐘軸格式
 */
import moment from 'moment-timezone';

import {
    DEFAULT_TIMEZONE,
    normalizeSlotMinutes,
    normalizeTimezone,
} from '../../../utils/scheduling/schedulingModels';

/** 建立模式可選完整 24 小時 */
export const CANDIDATE_AXIS_START_HOUR = 0;
export const CANDIDATE_AXIS_END_HOUR = 24;

/** 週一至週日短標 */
export const WEEKDAY_SHORT_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/**
 * 將分鐘數轉為 HH:mm
 * @param {number} minute
 * @returns {string}
 */
export function formatMinuteOfDay(minute) {
    const value = Math.max(0, Math.min(1440, Number(minute) || 0));
    const hours = Math.floor(value / 60);
    const minutes = value % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 將 DateTimePicker 選取的本地牆鐘解讀為活動時區瞬間
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
 * 固定七欄的每週候選 slots
 * @param {Array} candidateWindows
 * @param {number} slotMinutes
 * @returns {Array<{weekday: number, startMinute: number, endMinute: number}>}
 */
export function buildWeeklySlots(candidateWindows, slotMinutes) {
    const slot = normalizeSlotMinutes(slotMinutes);
    const windows = Array.isArray(candidateWindows) ? candidateWindows : [];
    const slots = [];
    for (let i = 0; i < windows.length; i++) {
        const window = windows[i];
        const weekday = Number(window?.weekday);
        const startMinute = Number(window?.startMinute);
        const endMinute = Number(window?.endMinute);
        if (
            weekday < 1 ||
            weekday > 7 ||
            !Number.isInteger(startMinute) ||
            !Number.isInteger(endMinute)
        ) {
            continue;
        }
        for (let minute = startMinute; minute < endMinute; minute += slot) {
            slots.push({
                weekday,
                startMinute: minute,
                endMinute: Math.min(minute + slot, endMinute),
            });
        }
    }
    return slots;
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
 * @param {{weekday: number, startMinute: number, endMinute: number}} suggestion
 * @returns {string}
 */
export function formatSuggestionLabel(suggestion) {
    if (!suggestion) {
        return '';
    }
    const weekday = WEEKDAY_SHORT_LABELS[Number(suggestion.weekday) - 1];
    if (!weekday) {
        return '';
    }
    return `週${weekday} ${formatMinuteOfDay(suggestion.startMinute)} – ${formatMinuteOfDay(suggestion.endMinute)}`;
}
