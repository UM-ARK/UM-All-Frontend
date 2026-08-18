import axios from 'axios';

import {
    getLocalStorage,
    getLocalStorageKeys,
    removeLocalStorageItems,
    setLocalStorage,
} from './storageKits';
import {
    COURSE_API_CF_WORKERS,
    UM_API_COURSE_CATALOG,
    UM_API_COURSES,
    UM_API_TOKEN,
} from './pathMap';
import { getLocalAppVersion } from './appUpdateKits';
import {
    getCoursePlanStorageKey,
    getCourseWeekPlanStorageKey,
    PROGRAMME_LEVELS,
} from './courseProgramme';
import {
    adddropCatalog as bundledAdddropCatalog,
    postgraduateCatalog as bundledPostgraduateCatalog,
    preenrollCatalog as bundledPreenrollCatalog,
} from '../static/UMCourses/courseCatalogs';

export const COURSE_CATALOG_STORAGE_KEYS = {
    preenroll: 'ARK_CourseCatalog_v2_preEnroll',
    adddrop: 'ARK_CourseCatalog_v2_addDrop',
    metadata: 'ARK_CourseCatalog_v2_metadata',
};

export const POSTGRADUATE_CATALOG_STORAGE_KEYS = {
    catalog: 'ARK_CourseCatalog_v2_postgraduate',
    metadata: 'ARK_CourseCatalog_v2_postgraduate_metadata',
};

export const HISTORICAL_COURSE_CATALOG_STORAGE_KEY_PREFIX =
    'ARK_CourseCatalog_history_v1';

const COURSE_CATALOG_MODES = ['preenroll', 'adddrop'];
export const COURSE_CATALOG_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
export const POSTGRADUATE_CATALOG_RETRY_INTERVAL_MS = 5 * 60 * 1000;
const bundledCatalogs = {
    preenroll: bundledPreenrollCatalog,
    adddrop: bundledAdddropCatalog,
};
let refreshCourseCatalogsPromise = null;
let refreshPostgraduateCatalogPromise = null;
const historicalCourseCatalogPromises = new Map();

const OPEN_DATA_PAGE_SIZE = 100;
const OPEN_DATA_PAGE_BATCH_SIZE = 4;
const DAY_NAMES = {
    1: 'MON',
    2: 'TUE',
    3: 'WED',
    4: 'THU',
    5: 'FRI',
    6: 'SAT',
    7: 'SUN',
};
const COMPONENT_TYPES = {
    L: 'Lecture',
    LA: 'Lab',
    T: 'Tutorial',
};

const getAcademicYear = year =>
    `${String(year).slice(-2)}/${String(year + 1).slice(-2)}`;

const parseAcademicYearStart = academicYear => {
    const match = String(academicYear || '').match(/^(\d{2})\/(\d{2})$/);
    return match ? 2000 + Number(match[1]) : null;
};

export const getRecentCoursePeriods = currentCatalog => {
    const currentYear = parseAcademicYearStart(currentCatalog?.academicYear);
    const currentSem = Number(currentCatalog?.sem);
    if (!Number.isInteger(currentYear) || ![1, 2].includes(currentSem)) {
        return [];
    }

    const periods = [{
        id: 'current',
        year: currentYear,
        academicYear: currentCatalog.academicYear,
        sem: String(currentSem),
        isCurrent: true,
        isHistorical: false,
    }];

    if (currentSem === 2) {
        periods.push({
            id: `${currentYear}-1`,
            year: currentYear,
            academicYear: getAcademicYear(currentYear),
            sem: '1',
            isCurrent: false,
            isHistorical: true,
        });
    }

    [2, 1].forEach(sem => {
        const year = currentYear - 1;
        periods.push({
            id: `${year}-${sem}`,
            year,
            academicYear: getAcademicYear(year),
            sem: String(sem),
            isCurrent: false,
            isHistorical: true,
        });
    });

    return periods;
};

export const getHistoricalCourseCatalogStorageKey = (
    programmeLevel,
    year,
    sem,
) => `${HISTORICAL_COURSE_CATALOG_STORAGE_KEY_PREFIX}_${programmeLevel}_${year}_${sem}`;

export async function pruneHistoricalCourseData(programmeLevel, currentCatalog) {
    const historicalPeriods = getRecentCoursePeriods(currentCatalog)
        .filter(period => period.isHistorical);
    if (historicalPeriods.length === 0) {
        return [];
    }

    const allowedStorageKeys = new Set();
    historicalPeriods.forEach(period => {
        allowedStorageKeys.add(getHistoricalCourseCatalogStorageKey(
            programmeLevel,
            period.year,
            period.sem,
        ));
        allowedStorageKeys.add(getCoursePlanStorageKey(programmeLevel, period));
        allowedStorageKeys.add(getCourseWeekPlanStorageKey(programmeLevel, period));
    });

    const storageKeys = await getLocalStorageKeys();
    if (!Array.isArray(storageKeys)) {
        throw storageKeys;
    }
    const managedPrefixes = [
        `${HISTORICAL_COURSE_CATALOG_STORAGE_KEY_PREFIX}_${programmeLevel}_`,
        `${getCoursePlanStorageKey(programmeLevel)}_history_`,
        `${getCourseWeekPlanStorageKey(programmeLevel)}_history_`,
    ];
    const staleStorageKeys = storageKeys.filter(storageKey =>
        managedPrefixes.some(prefix => storageKey.startsWith(prefix)) &&
        !allowedStorageKeys.has(storageKey),
    );
    if (staleStorageKeys.length === 0) {
        return [];
    }

    const removeResult = await removeLocalStorageItems(staleStorageKeys);
    if (removeResult !== 'ok') {
        throw removeResult;
    }
    return staleStorageKeys;
}

export const isValidHistoricalCourseCatalog = (
    catalog,
    programmeLevel,
    year,
    sem,
) =>
    catalog?.schemaVersion === 1 &&
    catalog?.mode === 'historical' &&
    catalog?.programmeLevel === programmeLevel &&
    catalog?.year === year &&
    String(catalog?.sem) === String(sem) &&
    typeof catalog?.academicYear === 'string' &&
    typeof catalog?.updateTime === 'string' &&
    typeof catalog?.revision === 'string' &&
    Array.isArray(catalog?.Courses);

const getEmbeddedRows = payload => {
    if (Array.isArray(payload?._embedded)) {
        return payload._embedded;
    }
    if (payload?._embedded && typeof payload._embedded === 'object') {
        return Object.values(payload._embedded);
    }
    throw new Error('Invalid UM Open Data response');
};

async function fetchOpenDataPage(url, params) {
    if (!UM_API_TOKEN) {
        throw new Error('Missing UM Open Data API token');
    }
    const response = await axios.get(url, {
        params,
        headers: { Authorization: UM_API_TOKEN },
    });
    return response.data;
}

async function fetchAllOpenDataRows(url, params) {
    const firstPayload = await fetchOpenDataPage(url, {
        ...params,
        count: true,
        page: 1,
        pagesize: OPEN_DATA_PAGE_SIZE,
    });
    const firstRows = getEmbeddedRows(firstPayload);
    const totalPages = Number(firstPayload?._total_pages || 1);
    if (!Number.isInteger(totalPages) || totalPages < 1) {
        throw new Error('Invalid UM Open Data pagination');
    }

    const rows = [...firstRows];
    for (let page = 2; page <= totalPages; page += OPEN_DATA_PAGE_BATCH_SIZE) {
        const pages = Array.from(
            { length: Math.min(OPEN_DATA_PAGE_BATCH_SIZE, totalPages - page + 1) },
            (_, index) => page + index,
        );
        const payloads = await Promise.all(
            pages.map(nextPage => fetchOpenDataPage(url, {
                ...params,
                page: nextPage,
                pagesize: OPEN_DATA_PAGE_SIZE,
            })),
        );
        payloads.forEach(payload => rows.push(...getEmbeddedRows(payload)));
    }
    return rows;
}

const formatHistoricalTime = value => {
    const text = String(value || '').trim();
    return /^\d{2}:\d{2}:\d{2}$/.test(text) ? text.slice(0, 5) : text;
};

const formatHistoricalDay = value =>
    DAY_NAMES[Number(value)] || String(value || '');

const formatHistoricalComponent = value => {
    const text = String(value || '').trim();
    return COMPONENT_TYPES[text.toUpperCase()] || text;
};

const formatHistoricalInstructors = instructors =>
    (Array.isArray(instructors) ? instructors : [])
        .map(instructor => String(instructor?.name || '').trim())
        .filter(Boolean)
        .join('; ');

const formatHistoricalClassFor = value =>
    String(value || '').replace(/<br\s*\/?>(\r?\n)?/gi, '\n').trim();

export const buildHistoricalCourseCatalog = ({
    catalogRows,
    courseRows,
    programmeLevel,
    year,
    sem,
    cachedAt = new Date().toISOString(),
}) => {
    const catalogByCode = new Map(
        (catalogRows || [])
            .filter(row => row?.courseCode)
            .map(row => [String(row.courseCode).trim(), row]),
    );
    const Courses = [];
    let matchedCourseCount = 0;

    (courseRows || []).forEach(course => {
        const courseCode = String(course?.courseCode || '').trim();
        const catalog = catalogByCode.get(courseCode);
        if (!courseCode || !catalog) {
            return;
        }
        matchedCourseCount += 1;
        const sections = Array.isArray(course.sections) && course.sections.length > 0
            ? course.sections
            : [{}];

        sections.forEach(section => {
            const schedules = Array.isArray(section?.schedules) && section.schedules.length > 0
                ? section.schedules
                : [{}];
            schedules.forEach(schedule => {
                Courses.push({
                    'Offering Unit': String(catalog.offeringUnit || ''),
                    'Offering Department': String(catalog.offeringDept || ''),
                    'Course Code': courseCode,
                    'Course Title': String(course.courseTitleEng || catalog.courseTitle || ''),
                    'Section': String(section?.sectionCode || ''),
                    'Course Type': catalog.courseType === 'GE' ? 'GE Course' : '',
                    'Medium of Instruction': String(catalog.mediumOfInstruction || ''),
                    'Notes for Course Enrolment': '',
                    'Teacher Information': formatHistoricalInstructors(section?.instructors),
                    'Lecture / Lab': formatHistoricalComponent(schedule?.componentType),
                    'Lab Information': '',
                    'Day': formatHistoricalDay(schedule?.day),
                    'Time From': formatHistoricalTime(schedule?.timeFrom),
                    'Time To': formatHistoricalTime(schedule?.timeTo),
                    'Classroom': String(schedule?.room1 || ''),
                    '"Class For / Class Not For" Information': formatHistoricalClassFor(section?.classForDetails),
                    'Course Title Chi': String(course.courseTitleChi || ''),
                });
            });
        });
    });

    if (matchedCourseCount === 0) {
        throw new Error('No matching courses in the selected semester');
    }

    Courses.sort((left, right) => [
        left['Course Code'],
        left.Section,
        left.Day,
        left['Time From'],
        left['Lecture / Lab'],
        left.Classroom,
    ].join('\u0000').localeCompare([
        right['Course Code'],
        right.Section,
        right.Day,
        right['Time From'],
        right['Lecture / Lab'],
        right.Classroom,
    ].join('\u0000')));

    return {
        schemaVersion: 1,
        mode: 'historical',
        programmeLevel,
        year,
        academicYear: getAcademicYear(year),
        sem: String(sem),
        updateTime: cachedAt.slice(0, 10),
        cachedAt,
        revision: `historical-${programmeLevel}-${year}-${sem}-${matchedCourseCount}-${Courses.length}`,
        Courses,
    };
};

async function requestHistoricalCourseCatalog(programmeLevel, year, sem) {
    const offeringProgLevel = programmeLevel === PROGRAMME_LEVELS.postgraduate
        ? 'PG'
        : 'UG';
    const [catalogRows, courseRows] = await Promise.all([
        fetchAllOpenDataRows(UM_API_COURSE_CATALOG, {
            offering_prog_level: offeringProgLevel,
        }),
        fetchAllOpenDataRows(UM_API_COURSES, { year, sem: Number(sem) }),
    ]);
    return buildHistoricalCourseCatalog({
        catalogRows,
        courseRows,
        programmeLevel,
        year,
        sem: String(sem),
    });
}

/**
 * 讀取歷史學期課表。合法本機緩存永久優先，不作背景刷新；首次缺失才查官方 API。
 */
export async function getHistoricalCourseCatalog({ programmeLevel, year, sem }) {
    const storageKey = getHistoricalCourseCatalogStorageKey(
        programmeLevel,
        year,
        sem,
    );
    const cachedCatalog = await getLocalStorage(storageKey);
    if (isValidHistoricalCourseCatalog(
        cachedCatalog,
        programmeLevel,
        year,
        sem,
    )) {
        return { catalog: cachedCatalog, source: 'cache' };
    }

    if (!historicalCourseCatalogPromises.has(storageKey)) {
        historicalCourseCatalogPromises.set(storageKey, (async () => {
            const catalog = await requestHistoricalCourseCatalog(
                programmeLevel,
                year,
                sem,
            );
            const saveResult = await setLocalStorage(storageKey, catalog);
            if (saveResult !== 'ok') {
                throw saveResult;
            }
            return { catalog, source: 'network' };
        })());
    }

    try {
        return await historicalCourseCatalogPromises.get(storageKey);
    } finally {
        historicalCourseCatalogPromises.delete(storageKey);
    }
}

/**
 * 驗證 v2 catalog 契約，避免把只有 Courses 的 v1 payload 寫入新緩存。
 *
 * @param {Object} catalog 待驗證的 catalog
 * @param {'preenroll'|'adddrop'|'postgraduate'} mode 預期模式
 * @returns {boolean} 是否符合 v2 catalog 契約
 */
export function isValidCourseCatalog(catalog, mode) {
    return (
        catalog?.schemaVersion === 2 &&
        catalog?.mode === mode &&
        typeof catalog?.updateTime === 'string' &&
        typeof catalog?.academicYear === 'string' &&
        ['string', 'number'].includes(typeof catalog?.sem) &&
        typeof catalog?.revision === 'string' &&
        catalog.revision.length > 0 &&
        Array.isArray(catalog?.Courses)
    );
}

const getCatalogMetadata = catalog => ({
    revision: catalog.revision,
    updateTime: catalog.updateTime,
    academicYear: catalog.academicYear,
    sem: catalog.sem,
});

/**
 * 判斷打包 catalog 是否比緩存更新。
 * 僅比對 updateTime（YYYY-MM-DD），雲端寫入的較新緩存不會被舊 bundle 覆蓋。
 *
 * @param {Object} bundled 隨 APP 打包的 catalog
 * @param {Object} cache 本地緩存 catalog
 * @returns {boolean} bundled 是否嚴格新於 cache
 */
export function isBundledCatalogNewer(bundled, cache) {
    if (
        typeof bundled?.updateTime !== 'string' ||
        typeof cache?.updateTime !== 'string'
    ) {
        return false;
    }
    return bundled.updateTime > cache.updateTime;
}

/**
 * 在合法緩存與打包 catalog 之間擇優；APP 升版種子較新時抬升為 bundled。
 *
 * @param {'preenroll'|'adddrop'} mode catalog 模式
 * @param {Object|undefined} cache 本地緩存
 * @returns {{catalog: Object, promoted: boolean}}
 */
function pickCatalogAgainstBundled(mode, cache) {
    const bundled = bundledCatalogs[mode];
    if (!isValidCourseCatalog(cache, mode)) {
        return {catalog: bundled, promoted: false};
    }
    if (isBundledCatalogNewer(bundled, cache)) {
        return {catalog: bundled, promoted: true};
    }
    return {catalog: cache, promoted: false};
}

const getResponseETag = response =>
    response?.headers?.etag || response?.headers?.get?.('etag') || null;

const getRequestHeaders = etag => {
    const headers = {
        'X-UMall-Course-Schema': '2',
    };
    const appVersion = getLocalAppVersion();
    if (appVersion) {
        headers['X-UMall-App-Version'] = appVersion;
    }
    if (etag) {
        headers['If-None-Match'] = etag;
    }
    return headers;
};

const buildLegacyFallbackCatalog = (mode, payload, currentCatalog) => ({
    schemaVersion: 2,
    mode,
    updateTime: payload?.updateTime || currentCatalog.updateTime,
    academicYear: payload?.academicYear || currentCatalog.academicYear,
    sem: payload?.sem || currentCatalog.sem,
    revision: `legacy-${mode}-${payload?.updateTime || currentCatalog.updateTime}`,
    Courses: payload.Courses,
});

async function requestCourseCatalog(mode, currentCatalog, metadata) {
    const cachedETag = metadata?.[mode]?.revision === currentCatalog.revision
        ? metadata[mode].etag
        : null;
    try {
        let response = await axios.get(
            `${COURSE_API_CF_WORKERS}/v2/catalog/${mode}`,
            {
                headers: getRequestHeaders(cachedETag),
                validateStatus: status => status === 200 || status === 304,
            },
        );
        if (response.status === 304 && !cachedETag) {
            response = await axios.get(
                `${COURSE_API_CF_WORKERS}/v2/catalog/${mode}`,
                {
                    headers: getRequestHeaders(),
                    validateStatus: status => status === 200,
                },
            );
        }
        if (response.status === 304) {
            return {
                catalog: currentCatalog,
                metadata: {
                    ...getCatalogMetadata(currentCatalog),
                    ...metadata?.[mode],
                },
            };
        }
        if (!isValidCourseCatalog(response.data, mode)) {
            throw new Error('Invalid v2 course catalog');
        }
        return {
            catalog: response.data,
            metadata: {
                ...getCatalogMetadata(response.data),
                etag: getResponseETag(response),
            },
        };
    } catch (error) {
        try {
            const legacyPath = mode === 'adddrop' ? '/timetable' : '/adddrop';
            const response = await axios.get(COURSE_API_CF_WORKERS + legacyPath);
            if (!Array.isArray(response?.data?.Courses)) {
                throw error;
            }
            const catalog = buildLegacyFallbackCatalog(
                mode,
                response.data,
                currentCatalog,
            );
            return {
                catalog,
                metadata: getCatalogMetadata(catalog),
            };
        } catch {
            return {
                catalog: currentCatalog,
                metadata: {
                    ...getCatalogMetadata(currentCatalog),
                    ...metadata?.[mode],
                },
            };
        }
    }
}

/**
 * 讀取 v2 catalog 緩存；缺少或不合法時使用隨 APP 打包的 catalog。
 * 若打包種子比合法緩存更新（例如升版），抬升為 bundled 並寫回 storage、清除舊 ETag。
 * 雲端較新的緩存（updateTime 更大）維持優先，後續 refresh 仍以雲端為準。
 */
export async function getCourseCatalogs() {
    const [preenrollCache, adddropCache, metadata] = await Promise.all([
        getLocalStorage(COURSE_CATALOG_STORAGE_KEYS.preenroll),
        getLocalStorage(COURSE_CATALOG_STORAGE_KEYS.adddrop),
        getLocalStorage(COURSE_CATALOG_STORAGE_KEYS.metadata),
    ]);

    const baseMetadata = metadata?.schemaVersion === 2
        ? metadata
        : {schemaVersion: 2};
    const preenrollPick = pickCatalogAgainstBundled('preenroll', preenrollCache);
    const adddropPick = pickCatalogAgainstBundled('adddrop', adddropCache);

    let nextMetadata = baseMetadata;
    if (preenrollPick.promoted || adddropPick.promoted) {
        // 抬升後對齊 revision，並去掉 etag，避免之後用舊 ETag 誤判 304
        nextMetadata = {
            ...baseMetadata,
            schemaVersion: 2,
            preenroll: preenrollPick.promoted
                ? getCatalogMetadata(preenrollPick.catalog)
                : baseMetadata.preenroll,
            adddrop: adddropPick.promoted
                ? getCatalogMetadata(adddropPick.catalog)
                : baseMetadata.adddrop,
        };
        const persistTasks = [];
        if (preenrollPick.promoted) {
            persistTasks.push(
                setLocalStorage(
                    COURSE_CATALOG_STORAGE_KEYS.preenroll,
                    preenrollPick.catalog,
                ),
            );
        }
        if (adddropPick.promoted) {
            persistTasks.push(
                setLocalStorage(
                    COURSE_CATALOG_STORAGE_KEYS.adddrop,
                    adddropPick.catalog,
                ),
            );
        }
        persistTasks.push(
            setLocalStorage(
                COURSE_CATALOG_STORAGE_KEYS.metadata,
                nextMetadata,
            ),
        );
        // 寫入失敗仍回傳抬升結果，至少本次會話顯示新種子
        await Promise.all(persistTasks);
    }

    return {
        preenrollCatalog: preenrollPick.catalog,
        adddropCatalog: adddropPick.catalog,
        metadata: nextMetadata,
    };
}

/**
 * 對兩份 catalog 發 conditional request，先寫 catalog，最後才更新 metadata。
 */
export async function refreshCourseCatalogs({ force = false } = {}) {
    if (refreshCourseCatalogsPromise) {
        return refreshCourseCatalogsPromise;
    }

    refreshCourseCatalogsPromise = (async () => {
        const current = await getCourseCatalogs();
        const lastCheckedAt = Date.parse(current.metadata?.lastCheckedAt);
        const hasConsistentCatalogs = COURSE_CATALOG_MODES.every(mode => {
            const catalog = mode === 'preenroll'
                ? current.preenrollCatalog
                : current.adddropCatalog;
            return current.metadata?.[mode]?.revision === catalog.revision;
        });
        if (
            !force &&
            hasConsistentCatalogs &&
            Number.isFinite(lastCheckedAt) &&
            Date.now() - lastCheckedAt < COURSE_CATALOG_REFRESH_INTERVAL_MS
        ) {
            return current;
        }
        const results = await Promise.all(
            COURSE_CATALOG_MODES.map(mode =>
                requestCourseCatalog(
                    mode,
                    mode === 'preenroll'
                        ? current.preenrollCatalog
                        : current.adddropCatalog,
                    current.metadata,
                ),
            ),
        );
        const [preenrollResult, adddropResult] = results;

        const preenrollSaveResult = await setLocalStorage(
            COURSE_CATALOG_STORAGE_KEYS.preenroll,
            preenrollResult.catalog,
        );
        if (preenrollSaveResult !== 'ok') {
            throw preenrollSaveResult;
        }
        const adddropSaveResult = await setLocalStorage(
            COURSE_CATALOG_STORAGE_KEYS.adddrop,
            adddropResult.catalog,
        );
        if (adddropSaveResult !== 'ok') {
            throw adddropSaveResult;
        }

        const nextMetadata = {
            schemaVersion: 2,
            lastCheckedAt: new Date().toISOString(),
            preenroll: preenrollResult.metadata,
            adddrop: adddropResult.metadata,
        };
        const metadataSaveResult = await setLocalStorage(
            COURSE_CATALOG_STORAGE_KEYS.metadata,
            nextMetadata,
        );
        if (metadataSaveResult !== 'ok') {
            throw metadataSaveResult;
        }

        return {
            preenrollCatalog: preenrollResult.catalog,
            adddropCatalog: adddropResult.catalog,
            metadata: nextMetadata,
        };
    })();

    try {
        return await refreshCourseCatalogsPromise;
    } finally {
        refreshCourseCatalogsPromise = null;
    }
}

/**
 * 按模式讀取單一 v2 catalog，不觸發網絡請求。
 */
export async function getCourseCatalog(mode) {
    if (!COURSE_CATALOG_MODES.includes(mode)) {
        throw new Error('Unknown course catalog mode');
    }
    const catalogs = await getCourseCatalogs();
    return mode === 'preenroll'
        ? catalogs.preenrollCatalog
        : catalogs.adddropCatalog;
}

/**
 * 讀取研究生 catalog 緩存；只在研究生模式被選取時由頁面呼叫。
 */
export async function getPostgraduateCatalog() {
    const [cache, storedMetadata] = await Promise.all([
        getLocalStorage(POSTGRADUATE_CATALOG_STORAGE_KEYS.catalog),
        getLocalStorage(POSTGRADUATE_CATALOG_STORAGE_KEYS.metadata),
    ]);
    const metadata = storedMetadata?.schemaVersion === 2
        ? storedMetadata
        : {schemaVersion: 2};
    const hasValidCache = isValidCourseCatalog(cache, 'postgraduate');
    const shouldPromote = hasValidCache &&
        isBundledCatalogNewer(bundledPostgraduateCatalog, cache);
    const catalog = !hasValidCache || shouldPromote
        ? bundledPostgraduateCatalog
        : cache;

    if (!shouldPromote) {
        return {catalog, metadata};
    }

    const nextMetadata = {
        schemaVersion: 2,
        postgraduate: getCatalogMetadata(catalog),
    };
    const catalogSaveResult = await setLocalStorage(
        POSTGRADUATE_CATALOG_STORAGE_KEYS.catalog,
        catalog,
    );
    if (catalogSaveResult !== 'ok') {
        throw catalogSaveResult;
    }
    const metadataSaveResult = await setLocalStorage(
        POSTGRADUATE_CATALOG_STORAGE_KEYS.metadata,
        nextMetadata,
    );
    if (metadataSaveResult !== 'ok') {
        throw metadataSaveResult;
    }

    return {catalog, metadata: nextMetadata};
}

async function requestPostgraduateCatalog(currentCatalog, metadata) {
    const cachedETag =
        metadata?.postgraduate?.revision === currentCatalog.revision
            ? metadata.postgraduate.etag
            : null;

    try {
        let response = await axios.get(
            `${COURSE_API_CF_WORKERS}/v2/catalog/postgraduate`,
            {
                headers: getRequestHeaders(cachedETag),
                validateStatus: status => status === 200 || status === 304,
            },
        );
        if (response.status === 304 && !cachedETag) {
            response = await axios.get(
                `${COURSE_API_CF_WORKERS}/v2/catalog/postgraduate`,
                {
                    headers: getRequestHeaders(),
                    validateStatus: status => status === 200,
                },
            );
        }
        if (response.status === 304) {
            return {
                succeeded: true,
                catalog: currentCatalog,
                metadata: {
                    ...getCatalogMetadata(currentCatalog),
                    ...metadata?.postgraduate,
                },
            };
        }
        if (!isValidCourseCatalog(response.data, 'postgraduate')) {
            throw new Error('Invalid postgraduate course catalog');
        }
        return {
            succeeded: true,
            catalog: response.data,
            metadata: {
                ...getCatalogMetadata(response.data),
                etag: getResponseETag(response),
            },
        };
    } catch {
        return {
            succeeded: false,
            catalog: currentCatalog,
            metadata: {
                ...getCatalogMetadata(currentCatalog),
                ...metadata?.postgraduate,
            },
        };
    }
}

/**
 * 按需刷新研究生 catalog。失敗時保留現有資料，亦不推進 lastCheckedAt。
 */
export async function refreshPostgraduateCatalog({ force = false } = {}) {
    if (refreshPostgraduateCatalogPromise) {
        return refreshPostgraduateCatalogPromise;
    }

    refreshPostgraduateCatalogPromise = (async () => {
        const current = await getPostgraduateCatalog();
        const lastCheckedAt = Date.parse(current.metadata?.lastCheckedAt);
        const lastAttemptAt = Date.parse(current.metadata?.lastAttemptAt);
        const isConsistent =
            current.metadata?.postgraduate?.revision ===
            current.catalog.revision;
        if (
            !force &&
            isConsistent &&
            Number.isFinite(lastCheckedAt) &&
            Date.now() - lastCheckedAt < COURSE_CATALOG_REFRESH_INTERVAL_MS
        ) {
            return current;
        }
        if (
            !force &&
            Number.isFinite(lastAttemptAt) &&
            Date.now() - lastAttemptAt < POSTGRADUATE_CATALOG_RETRY_INTERVAL_MS
        ) {
            return current;
        }

        const result = await requestPostgraduateCatalog(
            current.catalog,
            current.metadata,
        );
        const attemptedAt = new Date().toISOString();

        if (result.succeeded) {
            const catalogSaveResult = await setLocalStorage(
                POSTGRADUATE_CATALOG_STORAGE_KEYS.catalog,
                result.catalog,
            );
            if (catalogSaveResult !== 'ok') {
                throw catalogSaveResult;
            }
        }

        const nextMetadata = result.succeeded
            ? {
                ...current.metadata,
                schemaVersion: 2,
                lastAttemptAt: attemptedAt,
                lastCheckedAt: attemptedAt,
                postgraduate: result.metadata,
            }
            : {
                schemaVersion: 2,
                lastAttemptAt: attemptedAt,
                postgraduate: result.metadata,
            };
        const metadataSaveResult = await setLocalStorage(
            POSTGRADUATE_CATALOG_STORAGE_KEYS.metadata,
            nextMetadata,
        );
        if (metadataSaveResult !== 'ok') {
            throw metadataSaveResult;
        }

        return {
            catalog: result.catalog,
            metadata: nextMetadata,
        };
    })();

    try {
        return await refreshPostgraduateCatalogPromise;
    } finally {
        refreshPostgraduateCatalogPromise = null;
    }
}
