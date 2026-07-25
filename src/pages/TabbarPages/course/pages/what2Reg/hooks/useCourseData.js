import { useCallback, useState } from 'react';
import offerCourses from '../../../../../../static/UMCourses/offerCourses';
import coursePlan from '../../../../../../static/UMCourses/coursePlan';
import coursePlanTime from '../../../../../../static/UMCourses/coursePlanTime';
import sourceCourseVersion from '../../../../../../static/UMCourses/courseVersion';
import { getCourseData } from '../../../../../../utils/checkCoursesKits';
import { getLocalStorage } from '../../../../../../utils/storageKits';
import { defaultFilterOptions } from '../constants/options';
import lodash from 'lodash';

/**
 * 管理課程頁的資料生命週期
 * - 初始化：讀取本地/離線資料
 * - 刷新：頁面重回前景時檢查版本差異
 */
const useCourseData = () => {
    const [courseMode, setCourseMode] = useState('ad');
    const [offerCoursesData, setOfferCoursesData] = useState(offerCourses);
    const [coursePlanData, setCoursePlanData] = useState(coursePlan);
    const [coursePlanTimeData, setCoursePlanTimeData] = useState(coursePlanTime);
    const [courseVersion, setCourseVersion] = useState(sourceCourseVersion);

    const initCourseData = useCallback(async () => {
        const storageOfferCourses = await getCourseData('pre');
        setOfferCoursesData(storageOfferCourses);

        const addDropStorageData = await getCourseData('adddrop');
        setCoursePlanData(addDropStorageData.adddrop);
        setCoursePlanTimeData(addDropStorageData.timetable);

        const localCourseVersion = await getCourseData('version');
        setCourseVersion(localCourseVersion);

        const localFilterOptions = await getLocalStorage('ARK_Courses_filterOptions');
        const nextFilterOptions = localFilterOptions || defaultFilterOptions;
        setCourseMode(nextFilterOptions.mode);
        return nextFilterOptions;
    }, []);

    const refreshCourseData = useCallback(async () => {
        const localCourseVersion = await getCourseData('version');
        if (!lodash.isEqual(localCourseVersion, courseVersion)) {
            setCourseVersion(localCourseVersion);
            const addDropStorageData = await getCourseData('adddrop');
            setCoursePlanData(addDropStorageData.adddrop);
            setCoursePlanTimeData(addDropStorageData.timetable);
        }
    }, [courseVersion]);

    return {
        courseMode,
        setCourseMode,
        offerCoursesData,
        coursePlanData,
        coursePlanTimeData,
        courseVersion,
        initCourseData,
        refreshCourseData,
    };
};

export default useCourseData;
