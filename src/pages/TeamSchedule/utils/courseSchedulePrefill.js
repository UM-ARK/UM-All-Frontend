/**
 * 將本地模擬課表轉成課堂時間遮罩。
 */
import {normalizeSlotMinutes} from '../../../utils/scheduling/schedulingModels';
import {
    expandCandidateWindowsToSlots,
    slotKey,
} from './scheduleRanges';

const COURSE_DAY_TO_WEEKDAY = {
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
    SUN: 7,
};

function timeToMinute(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
        return null;
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
    }
    return hour * 60 + minute;
}

/**
 * 正規化單一課堂時間。
 */
export function normalizeCourseScheduleSlot(courseSlot) {
    if (!courseSlot || typeof courseSlot !== 'object') {
        return null;
    }
    const weekday = COURSE_DAY_TO_WEEKDAY[
        String(courseSlot.Day || '').trim().toUpperCase()
    ];
    const startMinute = timeToMinute(courseSlot['Time From']);
    const endMinute = timeToMinute(courseSlot['Time To']);
    if (
        weekday == null ||
        startMinute == null ||
        endMinute == null ||
        endMinute <= startMinute
    ) {
        return null;
    }
    return {weekday, startMinute, endMinute};
}

/**
 * 找出候選時間中與課堂重疊的格子，不修改可用時間。
 */
export function createCourseSchedulePrefill({
    candidateWindows,
    courseSlots,
    slotMinutes,
} = {}) {
    const slot = normalizeSlotMinutes(slotMinutes);
    const candidateSlots = expandCandidateWindowsToSlots(
        candidateWindows,
        slot,
    );
    const normalizedCourseSlots = (Array.isArray(courseSlots) ? courseSlots : [])
        .map(normalizeCourseScheduleSlot)
        .filter(Boolean);
    const courseConflictKeys = [];

    for (let i = 0; i < candidateSlots.length; i++) {
        const candidateSlot = candidateSlots[i];
        const hasCourseConflict = normalizedCourseSlots.some(
            courseSlot =>
                courseSlot.weekday === candidateSlot.weekday &&
                candidateSlot.startMinute < courseSlot.endMinute &&
                courseSlot.startMinute < candidateSlot.endMinute,
        );
        if (hasCourseConflict) {
            courseConflictKeys.push(slotKey(candidateSlot));
        }
    }

    return {
        courseConflictKeys,
    };
}
