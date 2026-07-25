import { useMemo } from 'react';
import lodash from 'lodash';
import { defaultTimeFilter } from '../constants/options';

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

    const filterCourseList = useMemo(() => {
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

            return slots.some(slot => {
                if (slot.Day !== timeFilter.day) {
                    return false;
                }

                const slotFrom = parseTimeToMinutes(slot['Time From']);
                const slotTo = parseTimeToMinutes(slot['Time To']);
                if (slotFrom === null || slotTo === null) {
                    return false;
                }

                return slotFrom < filterTo && slotTo > filterFrom;
            });
        });
    }, [isTimeFilterActive, scopedCourseList, slotsByCourseCode, timeFilter]);

    return {
        offerCourseList,
        offerFacultyList,
        offerGEList,
        offerFacultyDepaListObj,
        normalizedFilterOptions,
        filterCourseList,
        isTimeFilterActive,
    };
};

export default useCourseFiltering;
