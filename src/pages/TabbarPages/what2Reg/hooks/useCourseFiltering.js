import { useMemo } from 'react';
import lodash from 'lodash';

/**
 * 管理課程篩選的衍生資料
 * 注意：此 Hook 僅負責計算，不直接寫入 state。
 */
const useCourseFiltering = ({ courseMode, coursePlanData, offerCoursesData, filterOptions }) => {
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

    const filterCourseList = useMemo(() => {
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

    return {
        offerCourseList,
        offerFacultyList,
        offerGEList,
        offerFacultyDepaListObj,
        normalizedFilterOptions,
        filterCourseList,
    };
};

export default useCourseFiltering;
