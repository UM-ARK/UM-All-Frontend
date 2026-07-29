import { useMemo } from 'react';
import lodash from 'lodash';
import { defaultTimeFilter } from '../constants/options';
import { getSectionConflicts } from '../../../hooks/useConflict';

const TIME_STRING_PATTERN = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

/**
 * 將 'HH:mm' 或 'HH:mm:ss' 轉為當日分鐘數；非法輸入回傳 null。
 * 時段比對每次會跑上萬筆課節，故用整數比較而非建立 moment 物件。
 */
export const parseTimeToMinutes = time => {
    const matched = TIME_STRING_PATTERN.exec(String(time ?? '').trim());
    if (!matched) {
        return null;
    }

    const hour = Number(matched[1]);
    const minute = Number(matched[2]);
    if (hour > 23 || minute > 59) {
        return null;
    }

    return hour * 60 + minute;
};

/**
 * 判斷課節是否與指定星期及時段有實際重疊；僅在邊界相接不算命中。
 */
export const isSlotWithinTimeFilter = (slot, timeFilter) => {
    if (!timeFilter?.day) {
        return true;
    }

    if (slot?.Day !== timeFilter.day) {
        return false;
    }

    const slotFrom = parseTimeToMinutes(slot['Time From']);
    const slotTo = parseTimeToMinutes(slot['Time To']);
    const filterFrom = parseTimeToMinutes(timeFilter.from);
    const filterTo = parseTimeToMinutes(timeFilter.to);

    if (
        slotFrom === null ||
        slotTo === null ||
        filterFrom === null ||
        filterTo === null
    ) {
        return false;
    }

    return slotFrom < slotTo &&
        filterFrom < filterTo &&
        slotFrom < filterTo &&
        filterFrom < slotTo;
};

/**
 * 取得單一 Section 在目前時段及課表下的狀態。
 */
export const getSectionFilterStatus = ({
    sectionSlots = [],
    planSlots = [],
    timeFilter = defaultTimeFilter,
}) => {
    const hasCompleteSchedule = sectionSlots.length > 0 &&
        sectionSlots.every(slot => {
            const timeFrom = parseTimeToMinutes(slot['Time From']);
            const timeTo = parseTimeToMinutes(slot['Time To']);

            return Boolean(slot.Day) &&
                timeFrom !== null &&
                timeTo !== null &&
                timeFrom < timeTo;
        });

    if (!sectionSlots.some(slot => isSlotWithinTimeFilter(slot, timeFilter))) {
        return null;
    }

    if (getSectionConflicts(sectionSlots, planSlots).length > 0) {
        return 'conflict';
    }

    return hasCompleteSchedule ? 'match' : 'time';
};

/**
 * 判斷單一 Section 是否時間完整、符合時段條件且不與目前課表衝突。
 */
export const isSectionRecommended = options => {
    return getSectionFilterStatus(options) === 'match';
};

/**
 * 判斷某課程是否至少有一個可安全排入目前課表的 Section。
 * 已加入的課程，以及時間未完整公佈的 Section，均不列入建議。
 */
export const isCourseRecommended = ({
    courseCode,
    courseSlots = [],
    planCourseCodeSet = new Set(),
    planSlots = [],
    timeFilter = defaultTimeFilter,
}) => {
    if (!courseCode || planCourseCodeSet.has(courseCode)) {
        return false;
    }

    const slotsBySection = lodash.groupBy(
        courseSlots.filter(slot => slot.Section),
        'Section',
    );

    return Object.values(slotsBySection).some(sectionSlots =>
        isSectionRecommended({
            sectionSlots,
            planSlots,
            timeFilter,
        }),
    );
};

/**
 * 管理課程篩選的衍生資料
 * 注意：此 Hook 僅負責計算，不直接寫入 state。
 */
const useCourseFiltering = ({
    courseMode,
    coursePlanData,
    offerCoursesData,
    filterOptions,
    coursePlanTimeData,
    timeFilter = defaultTimeFilter,
    recommendationOnly = false,
    planCourseCodes = [],
    planSlots = [],
}) => {
    const offerCourseList = useMemo(() => {
        return courseMode === 'ad' ? coursePlanData?.Courses || [] : offerCoursesData?.Courses || [];
    }, [courseMode, coursePlanData, offerCoursesData]);

    const offerFacultyList = useMemo(() => {
        return lodash.uniq(offerCourseList.map(itm => itm['Offering Unit']).filter(Boolean)).sort();
    }, [offerCourseList]);

    const offerGEList = useMemo(() => {
        return lodash.uniq(
            offerCourseList
                .filter(itm => itm['Course Code']?.startsWith('GE'))
                .map(itm => itm['Course Code'].substring(0, 4)),
        ).sort();
    }, [offerCourseList]);

    const offerCourseByFaculty = useMemo(() => {
        return lodash.groupBy(offerCourseList, 'Offering Unit');
    }, [offerCourseList]);

    const offerCourseByDepa = useMemo(() => {
        return lodash.groupBy(offerCourseList, 'Offering Department');
    }, [offerCourseList]);

    const offerCourseByGE = useMemo(() => {
        return offerGEList.reduce((acc, geName) => {
            acc[geName] = offerCourseList.filter(itm => itm['Course Code']?.substring(0, 4) === geName);
            return acc;
        }, {});
    }, [offerGEList, offerCourseList]);

    const offerFacultyDepaListObj = useMemo(() => {
        return lodash.mapValues(offerCourseByFaculty, courses =>
            lodash.chain(courses)
                .uniqBy('Offering Department')
                .map('Offering Department')
                .compact()
                .sort()
                .value(),
        );
    }, [offerCourseByFaculty]);

    /**
     * 修正非法篩選值，避免畫面因資料變更導致空狀態。
     */
    const normalizedFilterOptions = useMemo(() => {
        const nextOptions = lodash.cloneDeep(filterOptions);
        const firstFaculty = offerFacultyList[0];

        if (!firstFaculty) {
            return nextOptions;
        }

        if (!offerCourseByFaculty[nextOptions.facultyName]) {
            nextOptions.facultyName = firstFaculty;
        }

        if (nextOptions.option === 'CMRE') {
            const depaList = offerFacultyDepaListObj[nextOptions.facultyName] || [];
            if (depaList.length > 0 && !depaList.includes(nextOptions.depaName)) {
                nextOptions.depaName = depaList[0];
            }
        }

        if (nextOptions.option === 'GE') {
            if (offerGEList.length > 0 && !offerGEList.includes(nextOptions.GE)) {
                nextOptions.GE = offerGEList[0];
            }
        }

        return nextOptions;
    }, [filterOptions, offerCourseByFaculty, offerFacultyDepaListObj, offerFacultyList, offerGEList]);

    const scopedCourseList = useMemo(() => {
        if (normalizedFilterOptions.option === 'GE') {
            return offerCourseByGE[normalizedFilterOptions.GE] || [];
        }

        const facultyName = normalizedFilterOptions.facultyName;
        const depaList = offerFacultyDepaListObj[facultyName] || [];

        if (depaList.length > 0) {
            return offerCourseByDepa[normalizedFilterOptions.depaName] || [];
        }

        return offerCourseByFaculty[facultyName] || [];
    }, [
        normalizedFilterOptions,
        offerCourseByGE,
        offerFacultyDepaListObj,
        offerCourseByDepa,
        offerCourseByFaculty,
    ]);

    // 以 Course Code 建索引，避免對每個課程線性掃描數萬筆課節資料
    const slotsByCourseCode = useMemo(() => {
        return lodash.groupBy(coursePlanTimeData?.Courses || [], 'Course Code');
    }, [coursePlanTimeData]);

    // 預選課資料沒有上課時間，故時段篩選只在 Add Drop 模式生效
    const isTimeFilterActive = courseMode === 'ad' && Boolean(timeFilter?.day);

    const timeFilteredCourseList = useMemo(() => {
        if (!isTimeFilterActive) {
            return scopedCourseList;
        }

        const filterFrom = parseTimeToMinutes(timeFilter.from);
        const filterTo = parseTimeToMinutes(timeFilter.to);
        if (filterFrom === null || filterTo === null) {
            return scopedCourseList;
        }

        return scopedCourseList.filter(course => {
            const slots = slotsByCourseCode[course['Course Code']] || [];
            return slots.some(slot => isSlotWithinTimeFilter(slot, timeFilter));
        });
    }, [isTimeFilterActive, scopedCourseList, slotsByCourseCode, timeFilter]);

    // 加課建議只適用於有 Section 時間資料的 Add Drop 模式
    const isRecommendationFilterActive = courseMode === 'ad' && recommendationOnly;
    const planCourseCodeSet = useMemo(
        () => new Set(planCourseCodes),
        [planCourseCodes],
    );

    const filterCourseList = useMemo(() => {
        if (!isRecommendationFilterActive) {
            return timeFilteredCourseList;
        }

        return timeFilteredCourseList.filter(course => {
            const courseCode = course['Course Code'];

            return isCourseRecommended({
                courseCode,
                courseSlots: slotsByCourseCode[courseCode] || [],
                planCourseCodeSet,
                planSlots,
                timeFilter: isTimeFilterActive ? timeFilter : defaultTimeFilter,
            });
        });
    }, [
        isRecommendationFilterActive,
        isTimeFilterActive,
        planCourseCodeSet,
        planSlots,
        slotsByCourseCode,
        timeFilter,
        timeFilteredCourseList,
    ]);

    return {
        offerCourseList,
        offerFacultyList,
        offerGEList,
        offerFacultyDepaListObj,
        normalizedFilterOptions,
        filterCourseList,
        isTimeFilterActive,
        isRecommendationFilterActive,
    };
};

export default useCourseFiltering;
