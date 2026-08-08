import axios from 'axios';

import { getLocalStorage, setLocalStorage } from './storageKits';
import { COURSE_API_CF_WORKERS } from './pathMap';
import { getLocalAppVersion } from './appUpdateKits';
import {
    adddropCatalog as bundledAdddropCatalog,
    preenrollCatalog as bundledPreenrollCatalog,
} from '../static/UMCourses/courseCatalogs';

export const COURSE_CATALOG_STORAGE_KEYS = {
    preenroll: 'ARK_CourseCatalog_v2_preEnroll',
    adddrop: 'ARK_CourseCatalog_v2_addDrop',
    metadata: 'ARK_CourseCatalog_v2_metadata',
};

const COURSE_CATALOG_MODES = ['preenroll', 'adddrop'];
export const COURSE_CATALOG_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const bundledCatalogs = {
    preenroll: bundledPreenrollCatalog,
    adddrop: bundledAdddropCatalog,
};
let refreshCourseCatalogsPromise = null;

/**
 * 驗證 v2 catalog 契約，避免把只有 Courses 的 v1 payload 寫入新緩存。
 *
 * @param {Object} catalog 待驗證的 catalog
 * @param {'preenroll'|'adddrop'} mode 預期模式
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
 */
export async function getCourseCatalogs() {
    const [preenrollCache, adddropCache, metadata] = await Promise.all([
        getLocalStorage(COURSE_CATALOG_STORAGE_KEYS.preenroll),
        getLocalStorage(COURSE_CATALOG_STORAGE_KEYS.adddrop),
        getLocalStorage(COURSE_CATALOG_STORAGE_KEYS.metadata),
    ]);

    return {
        preenrollCatalog: isValidCourseCatalog(preenrollCache, 'preenroll')
            ? preenrollCache
            : bundledCatalogs.preenroll,
        adddropCatalog: isValidCourseCatalog(adddropCache, 'adddrop')
            ? adddropCache
            : bundledCatalogs.adddrop,
        metadata: metadata?.schemaVersion === 2
            ? metadata
            : { schemaVersion: 2 },
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
