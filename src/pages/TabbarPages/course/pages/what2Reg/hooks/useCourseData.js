import { useCallback, useState } from 'react';
import {
    adddropCatalog as bundledAdddropCatalog,
    preenrollCatalog as bundledPreenrollCatalog,
} from '../../../../../../static/UMCourses/courseCatalogs';
import {
    getCourseCatalogs,
    refreshCourseCatalogs,
} from '../../../../../../utils/checkCoursesKits';
import { getLocalStorage } from '../../../../../../utils/storageKits';
import { defaultFilterOptions } from '../constants/options';

const getCourseVersion = (preenrollCatalog, adddropCatalog) => ({
    pre: {
        updateTime: preenrollCatalog.updateTime,
        academicYear: preenrollCatalog.academicYear,
        sem: preenrollCatalog.sem,
        revision: preenrollCatalog.revision,
    },
    adddrop: {
        updateTime: adddropCatalog.updateTime,
        academicYear: adddropCatalog.academicYear,
        sem: adddropCatalog.sem,
        revision: adddropCatalog.revision,
    },
});

/**
 * 管理課程頁的資料生命週期
 * - 初始化：讀取本地/離線資料
 * - 刷新：頁面重回前景時檢查版本差異
 */
const useCourseData = () => {
    const [courseMode, setCourseMode] = useState('ad');
    const [preenrollCatalog, setPreenrollCatalog] = useState(
        bundledPreenrollCatalog,
    );
    const [adddropCatalog, setAdddropCatalog] = useState(
        bundledAdddropCatalog,
    );
    const [courseVersion, setCourseVersion] = useState(() =>
        getCourseVersion(bundledPreenrollCatalog, bundledAdddropCatalog),
    );

    const applyCatalogs = useCallback(catalogs => {
        setPreenrollCatalog(catalogs.preenrollCatalog);
        setAdddropCatalog(catalogs.adddropCatalog);
        setCourseVersion(
            getCourseVersion(
                catalogs.preenrollCatalog,
                catalogs.adddropCatalog,
            ),
        );
    }, []);

    const initCourseData = useCallback(async () => {
        const catalogs = await getCourseCatalogs();
        applyCatalogs(catalogs);

        const localFilterOptions = await getLocalStorage('ARK_Courses_filterOptions');
        const nextFilterOptions = localFilterOptions || defaultFilterOptions;
        setCourseMode(nextFilterOptions.mode);
        refreshCourseCatalogs().then(applyCatalogs).catch(() => undefined);
        return nextFilterOptions;
    }, [applyCatalogs]);

    const refreshCourseData = useCallback(async ({ force = false } = {}) => {
        const catalogs = await refreshCourseCatalogs({ force });
        applyCatalogs(catalogs);
    }, [applyCatalogs]);

    return {
        courseMode,
        setCourseMode,
        preenrollCatalog,
        adddropCatalog,
        courseVersion,
        initCourseData,
        refreshCourseData,
    };
};

export default useCourseData;
