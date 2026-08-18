import { useMemo } from 'react';
import lodash from 'lodash';
import {
    DEPARTMENT_ALL,
    DEPARTMENT_UNSPECIFIED,
    defaultTimeFilter,
} from '../constants/options';
import { PROGRAMME_LEVELS } from '../../../../../../utils/courseProgramme';
import {
    getSectionFilterStatus,
    isSlotWithinTimeFilter,
    parseTimeToMinutes,
} from '../../../hooks/useConflict';

export {
    getSectionFilterStatus,
    isSlotWithinTimeFilter,
    parseTimeToMinutes,
};

export const getFacultyDepartmentOptions = courses => {
    const departments = lodash.chain(courses)
        .uniqBy('Offering Department')
        .map('Offering Department')
        .compact()
        .sort()
        .value();
    const hasUnspecified = courses.some(
        course => !course['Offering Department'],
    );
    return [
        DEPARTMENT_ALL,
        ...departments,
        ...(hasUnspecified ? [DEPARTMENT_UNSPECIFIED] : []),
    ];
};

export const filterFacultyCoursesByDepartment = (courses, department) => {
    if (department === DEPARTMENT_ALL) {
        return courses;
    }
    if (department === DEPARTMENT_UNSPECIFIED) {
        return courses.filter(course => !course['Offering Department']);
    }
    return courses.filter(
        course => course['Offering Department'] === department,
    );
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
    programmeLevel,
    preenrollCatalog,
    adddropCourseList,
    postgraduateCourseList,
    filterOptions,
    courseTimeList = [],
    timeFilter = defaultTimeFilter,
    recommendationOnly = false,
    planCourseCodes = [],
    planSlots = [],
}) => {
    const isPostgraduate = programmeLevel === PROGRAMME_LEVELS.postgraduate;
    const offerCourseList = useMemo(() => {
        if (isPostgraduate) {
            return postgraduateCourseList;
        }
        return courseMode === 'ad' ? adddropCourseList : preenrollCatalog?.Courses || [];
    }, [courseMode, adddropCourseList, isPostgraduate, postgraduateCourseList, preenrollCatalog]);

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

    const offerCourseByGE = useMemo(() => {
        return offerGEList.reduce((acc, geName) => {
            acc[geName] = offerCourseList.filter(itm => itm['Course Code']?.substring(0, 4) === geName);
            return acc;
        }, {});
    }, [offerGEList, offerCourseList]);

    const offerFacultyDepaListObj = useMemo(() => {
        return lodash.mapValues(
            offerCourseByFaculty,
            getFacultyDepartmentOptions,
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
            if (!depaList.includes(nextOptions.depaName)) {
                nextOptions.depaName = DEPARTMENT_ALL;
            }
        }

        if (isPostgraduate) {
            nextOptions.option = 'CMRE';
            const depaList = offerFacultyDepaListObj[nextOptions.facultyName] || [];
            if (!depaList.includes(nextOptions.depaName)) {
                nextOptions.depaName = DEPARTMENT_ALL;
            }
        }

        if (nextOptions.option === 'GE') {
            if (offerGEList.length > 0 && !offerGEList.includes(nextOptions.GE)) {
                nextOptions.GE = offerGEList[0];
            }
        }

        return nextOptions;
    }, [filterOptions, isPostgraduate, offerCourseByFaculty, offerFacultyDepaListObj, offerFacultyList, offerGEList]);

    const scopedCourseList = useMemo(() => {
        if (normalizedFilterOptions.option === 'GE') {
            return offerCourseByGE[normalizedFilterOptions.GE] || [];
        }

        const facultyName = normalizedFilterOptions.facultyName;
        const facultyCourses = offerCourseByFaculty[facultyName] || [];

        return filterFacultyCoursesByDepartment(
            facultyCourses,
            normalizedFilterOptions.depaName,
        );
    }, [
        normalizedFilterOptions,
        offerCourseByGE,
        offerCourseByFaculty,
    ]);

    // 以 Course Code 建索引，避免對每個課程線性掃描數萬筆課節資料
    const slotsByCourseCode = useMemo(() => {
        return lodash.groupBy(courseTimeList, 'Course Code');
    }, [courseTimeList]);

    // 預選課資料沒有上課時間，故時段篩選只在 Add Drop／研究生模式生效
    const isTimeFilterActive =
        (isPostgraduate || courseMode === 'ad') && Boolean(timeFilter?.day);

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

    // 加課建議只適用於有 Section 時間資料的 Add Drop／研究生模式
    const isRecommendationFilterActive =
        (isPostgraduate || courseMode === 'ad') && recommendationOnly;
    const planCourseCodeSet = useMemo(
        () => new Set(planCourseCodes),
        [planCourseCodes],
    );

    // 瀏覽列表統一按 Course Code 排序，與搜尋結果一致，避免 JSON 原序亂序
    const filterCourseList = useMemo(() => {
        const list = !isRecommendationFilterActive
            ? timeFilteredCourseList
            : timeFilteredCourseList.filter(course => {
                const courseCode = course['Course Code'];

                return isCourseRecommended({
                    courseCode,
                    courseSlots: slotsByCourseCode[courseCode] || [],
                    planCourseCodeSet,
                    planSlots,
                    timeFilter: isTimeFilterActive ? timeFilter : defaultTimeFilter,
                });
            });

        return lodash.sortBy(list, ['Course Code']);
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
