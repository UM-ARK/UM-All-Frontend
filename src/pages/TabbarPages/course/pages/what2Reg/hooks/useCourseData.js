import { useCallback, useMemo, useState } from 'react';
import {
    adddropCatalog as bundledAdddropCatalog,
    postgraduateCatalog as bundledPostgraduateCatalog,
    preenrollCatalog as bundledPreenrollCatalog,
} from '../../../../../../static/UMCourses/courseCatalogs';
import {
    getCourseCatalogs,
    getPostgraduateCatalog,
    refreshCourseCatalogs,
    refreshPostgraduateCatalog,
} from '../../../../../../utils/checkCoursesKits';
import { getLocalStorage } from '../../../../../../utils/storageKits';
import { useProgrammeLevel } from '../../../../../../contexts/ProgrammeLevelContext';
import {
    getCourseFilterStorageKey,
    PROGRAMME_LEVELS,
} from '../../../../../../utils/courseProgramme';
import { defaultFilterOptions } from '../constants/options';

const getCatalogMetadata = (
    preenrollCatalog,
    adddropCatalog,
    postgraduateCatalog,
    programmeLevel,
) => ({
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
    postgraduate: {
        updateTime: postgraduateCatalog.updateTime,
        academicYear: postgraduateCatalog.academicYear,
        sem: postgraduateCatalog.sem,
        revision: postgraduateCatalog.revision,
    },
    active: programmeLevel === PROGRAMME_LEVELS.postgraduate
        ? {
            updateTime: postgraduateCatalog.updateTime,
            academicYear: postgraduateCatalog.academicYear,
            sem: postgraduateCatalog.sem,
            revision: postgraduateCatalog.revision,
        }
        : {
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
    const { programmeLevel } = useProgrammeLevel();
    const [courseMode, setCourseMode] = useState('ad');
    const [preenrollCatalog, setPreenrollCatalog] = useState(
        bundledPreenrollCatalog,
    );
    const [adddropCatalog, setAdddropCatalog] = useState(
        bundledAdddropCatalog,
    );
    const [postgraduateCatalog, setPostgraduateCatalog] = useState(
        bundledPostgraduateCatalog,
    );
    const catalogMetadata = useMemo(
        () => getCatalogMetadata(
            preenrollCatalog,
            adddropCatalog,
            postgraduateCatalog,
            programmeLevel,
        ),
        [
            adddropCatalog,
            postgraduateCatalog,
            preenrollCatalog,
            programmeLevel,
        ],
    );

    const applyCatalogs = useCallback(catalogs => {
        setPreenrollCatalog(catalogs.preenrollCatalog);
        setAdddropCatalog(catalogs.adddropCatalog);
    }, []);

    const applyPostgraduateCatalog = useCallback(result => {
        setPostgraduateCatalog(result.catalog);
    }, []);

    const initCourseData = useCallback(async () => {
        const localFilterOptions = await getLocalStorage(
            getCourseFilterStorageKey(PROGRAMME_LEVELS.undergraduate),
        );
        const nextFilterOptions = localFilterOptions || defaultFilterOptions;
        setCourseMode(nextFilterOptions.mode);

        if (programmeLevel === PROGRAMME_LEVELS.postgraduate) {
            const result = await getPostgraduateCatalog();
            applyPostgraduateCatalog(result);
            refreshPostgraduateCatalog()
                .then(applyPostgraduateCatalog)
                .catch(() => undefined);
        } else {
            const catalogs = await getCourseCatalogs();
            applyCatalogs(catalogs);
            refreshCourseCatalogs()
                .then(applyCatalogs)
                .catch(() => undefined);
        }
        return nextFilterOptions;
    }, [applyCatalogs, applyPostgraduateCatalog, programmeLevel]);

    const refreshCourseData = useCallback(async ({ force = false } = {}) => {
        if (programmeLevel === PROGRAMME_LEVELS.postgraduate) {
            const result = await refreshPostgraduateCatalog({ force });
            applyPostgraduateCatalog(result);
            return;
        }
        const catalogs = await refreshCourseCatalogs({ force });
        applyCatalogs(catalogs);
    }, [applyCatalogs, applyPostgraduateCatalog, programmeLevel]);

    return {
        courseMode,
        setCourseMode,
        preenrollCatalog,
        adddropCatalog,
        postgraduateCatalog,
        catalogMetadata,
        initCourseData,
        refreshCourseData,
    };
};

export default useCourseData;
