import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    adddropCatalog as bundledAdddropCatalog,
    postgraduateCatalog as bundledPostgraduateCatalog,
    preenrollCatalog as bundledPreenrollCatalog,
} from '../../../../../../static/UMCourses/courseCatalogs';
import {
    getCourseCatalogs,
    getHistoricalCourseCatalog,
    getPostgraduateCatalog,
    getRecentCoursePeriods,
    pruneHistoricalCourseData,
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
    activeCatalog,
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
    active: {
        updateTime: activeCatalog.updateTime,
        academicYear: activeCatalog.academicYear,
        sem: activeCatalog.sem,
        revision: activeCatalog.revision,
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
    const [selectedCoursePeriod, setSelectedCoursePeriod] = useState(null);
    const [historicalCatalog, setHistoricalCatalog] = useState(null);
    const [historicalCatalogStatus, setHistoricalCatalogStatus] = useState('idle');
    const historicalRequestIdRef = useRef(0);
    const currentCatalog = programmeLevel === PROGRAMME_LEVELS.postgraduate
        ? postgraduateCatalog
        : adddropCatalog;
    const coursePeriodOptions = useMemo(
        () => getRecentCoursePeriods(currentCatalog),
        [currentCatalog],
    );
    const currentCoursePeriod = coursePeriodOptions[0] || null;
    const hasActiveHistoricalPeriod = selectedCoursePeriod?.isHistorical &&
        selectedCoursePeriod.programmeLevel === programmeLevel;
    const activeCoursePeriod = hasActiveHistoricalPeriod
        ? selectedCoursePeriod
        : currentCoursePeriod;
    const activeCatalog = hasActiveHistoricalPeriod &&
        historicalCatalog?.programmeLevel === programmeLevel &&
        historicalCatalog?.year === selectedCoursePeriod.year &&
        String(historicalCatalog?.sem) === selectedCoursePeriod.sem
        ? historicalCatalog
        : currentCatalog;
    const catalogMetadata = useMemo(
        () => getCatalogMetadata(
            preenrollCatalog,
            adddropCatalog,
            postgraduateCatalog,
            activeCatalog,
        ),
        [
            adddropCatalog,
            postgraduateCatalog,
            preenrollCatalog,
            activeCatalog,
        ],
    );

    useEffect(() => {
        historicalRequestIdRef.current += 1;
        setSelectedCoursePeriod(null);
        setHistoricalCatalog(null);
        setHistoricalCatalogStatus('idle');
    }, [programmeLevel]);

    const applyCatalogs = useCallback(catalogs => {
        setPreenrollCatalog(catalogs.preenrollCatalog);
        setAdddropCatalog(catalogs.adddropCatalog);
        pruneHistoricalCourseData(
            PROGRAMME_LEVELS.undergraduate,
            catalogs.adddropCatalog,
        ).catch(() => undefined);
    }, []);

    const applyPostgraduateCatalog = useCallback(result => {
        setPostgraduateCatalog(result.catalog);
        pruneHistoricalCourseData(
            PROGRAMME_LEVELS.postgraduate,
            result.catalog,
        ).catch(() => undefined);
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
        if (hasActiveHistoricalPeriod) {
            return;
        }
        if (programmeLevel === PROGRAMME_LEVELS.postgraduate) {
            const result = await refreshPostgraduateCatalog({ force });
            applyPostgraduateCatalog(result);
            return;
        }
        const catalogs = await refreshCourseCatalogs({ force });
        applyCatalogs(catalogs);
    }, [applyCatalogs, applyPostgraduateCatalog, hasActiveHistoricalPeriod, programmeLevel]);

    const selectCoursePeriod = useCallback(async periodId => {
        const period = coursePeriodOptions.find(option => option.id === periodId);
        if (!period) {
            throw new Error('Unknown course period');
        }

        const requestId = historicalRequestIdRef.current + 1;
        historicalRequestIdRef.current = requestId;
        if (!period.isHistorical) {
            setSelectedCoursePeriod(null);
            setHistoricalCatalog(null);
            setHistoricalCatalogStatus('idle');
            return;
        }

        setHistoricalCatalogStatus('loading');
        try {
            const result = await getHistoricalCourseCatalog({
                programmeLevel,
                year: period.year,
                sem: period.sem,
            });
            if (historicalRequestIdRef.current !== requestId) {
                return;
            }
            setCourseMode('ad');
            setHistoricalCatalog(result.catalog);
            setSelectedCoursePeriod({ ...period, programmeLevel });
            setHistoricalCatalogStatus('idle');
        } catch (error) {
            if (historicalRequestIdRef.current !== requestId) {
                return;
            }
            setHistoricalCatalogStatus('error');
            throw error;
        }
    }, [coursePeriodOptions, programmeLevel]);

    return {
        courseMode,
        setCourseMode,
        preenrollCatalog,
        adddropCatalog,
        postgraduateCatalog,
        activeCatalog,
        catalogMetadata,
        coursePeriodOptions,
        activeCoursePeriod,
        isHistoricalPeriod: Boolean(hasActiveHistoricalPeriod),
        historicalCatalogStatus,
        selectCoursePeriod,
        initCourseData,
        refreshCourseData,
    };
};

export default useCourseData;
