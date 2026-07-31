import lodash from 'lodash';

import {
    getSectionConflicts,
    parseTimeToMinutes,
} from '../../../hooks/useConflict';

const START_OF_DAY = '00:00';
const END_OF_DAY = '23:59';

/**
 * 判斷兩筆資料是否屬於同一個 Course Code + Section。
 *
 * @param {Object} first 第一筆課節
 * @param {Object} second 第二筆課節
 * @returns {boolean} 是否為同一 Section
 */
const isSameSection = (first, second) =>
    first?.['Course Code'] === second?.['Course Code'] &&
    first?.Section === second?.Section;

/**
 * 取得被替代課節前後相鄰課程所形成的空檔。
 *
 * @param {Object} targetSlot 被替代課節
 * @param {Array<Object>} planSlots 目前課表課節
 * @returns {{day: string, from: string, to: string}|null} 可放入平替的空檔
 */
export const getReplacementWindow = (targetSlot, planSlots = []) => {
    const targetStart = parseTimeToMinutes(targetSlot?.['Time From']);
    if (!targetSlot?.Day || targetStart === null) {
        return null;
    }

    const daySlots = planSlots
        .filter(
            slot =>
                slot?.Day === targetSlot.Day &&
                !isSameSection(slot, targetSlot),
        )
        .map(slot => ({
            slot,
            start: parseTimeToMinutes(slot['Time From']),
        }))
        .filter(item => item.start !== null)
        .sort((first, second) => first.start - second.start);

    const previousSlot = lodash.findLast(
        daySlots,
        item => item.start < targetStart,
    )?.slot;
    const nextSlot = daySlots.find(item => item.start >= targetStart)?.slot;

    const from = previousSlot?.['Time To'] || START_OF_DAY;
    const to = nextSlot?.['Time From'] || END_OF_DAY;
    const fromMinutes = parseTimeToMinutes(from);
    const toMinutes = parseTimeToMinutes(to);

    if (
        fromMinutes === null ||
        toMinutes === null ||
        fromMinutes >= toMinutes
    ) {
        return null;
    }

    return {
        day: targetSlot.Day,
        from,
        to,
    };
};

/**
 * 找出可替代指定課節的課程與 Section。
 *
 * 候選 Section 必須在目標星期完整落入相鄰課程空檔，且其一週內所有課節
 * 均不會與移除目標 Section 後的課表衝突。
 *
 * @param {Object} params 篩選參數
 * @param {Object} params.targetSlot 被替代課節
 * @param {Array<Object>} params.planSlots 目前課表課節
 * @param {Array<Object>} params.planList 目前已選 Course Code + Section
 * @param {Array<Object>} params.courseTimeList 全部含時間課節
 * @param {Array<Object>} params.coursePlanList 課程摘要資料
 * @returns {{window: Object|null, courses: Array<Object>}} 平替空檔與候選課程
 */
export const getReplacementCourses = ({
    targetSlot,
    planSlots = [],
    planList = [],
    courseTimeList = [],
    coursePlanList = [],
}) => {
    const window = getReplacementWindow(targetSlot, planSlots);
    if (!window) {
        return {window: null, courses: []};
    }

    const windowFrom = parseTimeToMinutes(window.from);
    const windowTo = parseTimeToMinutes(window.to);
    const targetCourseCode = targetSlot?.['Course Code'];
    const plannedCourseCodes = new Set(
        planList.map(item => item?.['Course Code']).filter(Boolean),
    );
    const remainingPlanSlots = planSlots.filter(
        slot => !isSameSection(slot, targetSlot),
    );
    const summariesByCourseCode = lodash.keyBy(coursePlanList, 'Course Code');

    const courses = lodash
        .chain(courseTimeList)
        .filter(
            slot =>
                slot?.['Course Code'] &&
                slot['Course Code'] !== targetCourseCode &&
                slot.Section,
        )
        .groupBy('Course Code')
        .map((courseSlots, courseCode) => {
            if (plannedCourseCodes.has(courseCode)) {
                return null;
            }

            const sections = lodash
                .chain(courseSlots)
                .groupBy('Section')
                .map((sectionSlots, section) => {
                    const normalizedSlots = sectionSlots
                        .map(slot => ({
                            slot,
                            from: parseTimeToMinutes(slot['Time From']),
                            to: parseTimeToMinutes(slot['Time To']),
                        }))
                        .filter(
                            item =>
                                item.slot.Day &&
                                item.from !== null &&
                                item.to !== null &&
                                item.from < item.to,
                        );

                    if (normalizedSlots.length !== sectionSlots.length) {
                        return null;
                    }

                    const targetDaySlots = normalizedSlots.filter(
                        item => item.slot.Day === window.day,
                    );
                    const fitsWindow =
                        targetDaySlots.length > 0 &&
                        targetDaySlots.every(
                            item =>
                                item.from >= windowFrom && item.to <= windowTo,
                        );

                    if (
                        !fitsWindow ||
                        getSectionConflicts(sectionSlots, remainingPlanSlots)
                            .length > 0
                    ) {
                        return null;
                    }

                    return {
                        section,
                        slots: lodash.sortBy(sectionSlots, [
                            slot => slot.Day,
                            slot => parseTimeToMinutes(slot['Time From']),
                        ]),
                    };
                })
                .compact()
                .sortBy('section')
                .value();

            if (sections.length === 0) {
                return null;
            }

            const summary = summariesByCourseCode[courseCode] || courseSlots[0];

            return {
                ...summary,
                'Course Code': courseCode,
                sections,
            };
        })
        .compact()
        .sortBy('Course Code')
        .value();

    return {window, courses};
};
