import axios from 'axios';
import {
    COURSE_CATALOG_STORAGE_KEYS,
    getCourseCatalogs,
    isValidCourseCatalog,
    refreshCourseCatalogs,
} from '../checkCoursesKits';
import { getLocalStorage, setLocalStorage } from '../storageKits';

jest.mock('axios');
jest.mock('../pathMap', () => ({
    COURSE_API_CF_WORKERS: 'https://course-api.test',
}));
jest.mock('../appUpdateKits', () => ({
    getLocalAppVersion: () => '9.8.7',
}));
jest.mock('../storageKits', () => ({
    getLocalStorage: jest.fn(),
    setLocalStorage: jest.fn(),
    logAllStorage: jest.fn(),
}));
jest.mock('../../static/UMCourses/courseCatalogs', () => ({
    preenrollCatalog: {
        schemaVersion: 2,
        mode: 'preenroll',
        updateTime: '2026-04-22',
        academicYear: '26/27',
        sem: '1',
        revision: 'preenroll-2026-04-22-bundled',
        Courses: [{ 'Course Code': 'BUNDLED-PRE' }],
    },
    adddropCatalog: {
        schemaVersion: 2,
        mode: 'adddrop',
        updateTime: '2026-04-02',
        academicYear: '25/26',
        sem: '2',
        revision: 'adddrop-2026-04-02-bundled',
        Courses: [{ 'Course Code': 'BUNDLED-AD' }],
    },
}));

const makeCatalog = (mode, revision, courseCode = revision) => ({
    schemaVersion: 2,
    mode,
    updateTime: '2026-08-07',
    academicYear: '26/27',
    sem: '1',
    revision,
    Courses: [{ 'Course Code': courseCode }],
});

const setStorageValues = values => {
    getLocalStorage.mockImplementation(key => Promise.resolve(values[key]));
};

describe('v2 course catalog adapter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setLocalStorage.mockResolvedValue('ok');
    });

    test('只接受包含完整 metadata 的 v2 catalog', () => {
        expect(isValidCourseCatalog(
            makeCatalog('adddrop', 'adddrop-2026-08-07-hash'),
            'adddrop',
        )).toBe(true);
        expect(isValidCourseCatalog({ Courses: [] }, 'adddrop')).toBe(false);
        expect(isValidCourseCatalog(
            makeCatalog('preenroll', 'preenroll-2026-08-07-hash'),
            'adddrop',
        )).toBe(false);
    });

    test('v2 緩存缺失或不合法時使用 bundled catalog', async () => {
        setStorageValues({
            [COURSE_CATALOG_STORAGE_KEYS.preenroll]: { Courses: [] },
            [COURSE_CATALOG_STORAGE_KEYS.adddrop]: undefined,
            [COURSE_CATALOG_STORAGE_KEYS.metadata]: undefined,
        });

        const catalogs = await getCourseCatalogs();

        expect(catalogs.preenrollCatalog.Courses[0]['Course Code']).toBe(
            'BUNDLED-PRE',
        );
        expect(catalogs.adddropCatalog.Courses[0]['Course Code']).toBe(
            'BUNDLED-AD',
        );
    });

    test('新鮮 metadata 在六小時內不重複請求', async () => {
        const preenrollCatalog = makeCatalog('preenroll', 'pre-cache');
        const adddropCatalog = makeCatalog('adddrop', 'ad-cache');
        setStorageValues({
            [COURSE_CATALOG_STORAGE_KEYS.preenroll]: preenrollCatalog,
            [COURSE_CATALOG_STORAGE_KEYS.adddrop]: adddropCatalog,
            [COURSE_CATALOG_STORAGE_KEYS.metadata]: {
                schemaVersion: 2,
                lastCheckedAt: new Date().toISOString(),
                preenroll: { revision: 'pre-cache' },
                adddrop: { revision: 'ad-cache' },
            },
        });

        await expect(refreshCourseCatalogs()).resolves.toMatchObject({
            preenrollCatalog,
            adddropCatalog,
        });
        expect(axios.get).not.toHaveBeenCalled();
        expect(setLocalStorage).not.toHaveBeenCalled();
    });

    test('force refresh 略過六小時限制並送出版本 headers 與 ETag', async () => {
        const preenrollCatalog = makeCatalog('preenroll', 'pre-cache');
        const adddropCatalog = makeCatalog('adddrop', 'ad-cache');
        setStorageValues({
            [COURSE_CATALOG_STORAGE_KEYS.preenroll]: preenrollCatalog,
            [COURSE_CATALOG_STORAGE_KEYS.adddrop]: adddropCatalog,
            [COURSE_CATALOG_STORAGE_KEYS.metadata]: {
                schemaVersion: 2,
                lastCheckedAt: new Date().toISOString(),
                preenroll: { revision: 'pre-cache', etag: '"sha256-pre"' },
                adddrop: { revision: 'ad-cache', etag: '"sha256-ad"' },
            },
        });
        axios.get.mockResolvedValue({ status: 304, headers: {} });

        await refreshCourseCatalogs({ force: true });

        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenCalledWith(
            expect.stringContaining('/v2/catalog/preenroll'),
            expect.objectContaining({
                headers: expect.objectContaining({
                    'If-None-Match': '"sha256-pre"',
                    'X-UMall-App-Version': '9.8.7',
                    'X-UMall-Course-Schema': '2',
                }),
                validateStatus: expect.any(Function),
            }),
        );
        expect(setLocalStorage.mock.calls.map(([key]) => key)).toEqual([
            COURSE_CATALOG_STORAGE_KEYS.preenroll,
            COURSE_CATALOG_STORAGE_KEYS.adddrop,
            COURSE_CATALOG_STORAGE_KEYS.metadata,
        ]);
    });

    test('cache 缺失時不沿用舊 ETag，意外 304 會 unconditional retry', async () => {
        const adddropCatalog = makeCatalog('adddrop', 'ad-cache');
        const remotePreenroll = makeCatalog('preenroll', 'pre-remote', 'REMOTE-PRE');
        setStorageValues({
            [COURSE_CATALOG_STORAGE_KEYS.preenroll]: undefined,
            [COURSE_CATALOG_STORAGE_KEYS.adddrop]: adddropCatalog,
            [COURSE_CATALOG_STORAGE_KEYS.metadata]: {
                schemaVersion: 2,
                preenroll: { revision: 'pre-stale', etag: '"sha256-stale"' },
                adddrop: { revision: 'ad-cache', etag: '"sha256-ad"' },
            },
        });
        let preenrollRequestCount = 0;
        axios.get.mockImplementation(url => {
            if (url.endsWith('/v2/catalog/preenroll')) {
                preenrollRequestCount += 1;
                return Promise.resolve(
                    preenrollRequestCount === 1
                        ? { status: 304, headers: {} }
                        : { status: 200, data: remotePreenroll, headers: { etag: '"sha256-new"' } },
                );
            }
            return Promise.resolve({ status: 304, headers: {} });
        });

        const result = await refreshCourseCatalogs({ force: true });

        const preenrollCalls = axios.get.mock.calls.filter(([url]) =>
            url.endsWith('/v2/catalog/preenroll'),
        );
        expect(preenrollCalls).toHaveLength(2);
        expect(preenrollCalls[0][1].headers['If-None-Match']).toBeUndefined();
        expect(preenrollCalls[1][1].headers['If-None-Match']).toBeUndefined();
        expect(result.preenrollCatalog.Courses[0]['Course Code']).toBe('REMOTE-PRE');
        expect(setLocalStorage.mock.calls[2][1].preenroll.etag).toBe(
            '"sha256-new"',
        );
    });

    test('v2 失敗時只在 adapter 回退指定 v1 routes', async () => {
        setStorageValues({});
        axios.get.mockImplementation(url => {
            if (url.includes('/v2/catalog/')) {
                return Promise.reject(new Error('v2 unavailable'));
            }
            if (url.endsWith('/adddrop')) {
                return Promise.resolve({
                    status: 200,
                    data: { Courses: [{ 'Course Code': 'LEGACY-PRE' }] },
                });
            }
            if (url.endsWith('/timetable')) {
                return Promise.resolve({
                    status: 200,
                    data: { Courses: [{ 'Course Code': 'LEGACY-AD' }] },
                });
            }
            return Promise.reject(new Error(`unexpected route ${url}`));
        });

        const result = await refreshCourseCatalogs({ force: true });

        expect(result.preenrollCatalog.Courses[0]['Course Code']).toBe('LEGACY-PRE');
        expect(result.adddropCatalog.Courses[0]['Course Code']).toBe('LEGACY-AD');
        expect(axios.get.mock.calls.map(([url]) => url)).not.toEqual(
            expect.arrayContaining([
                expect.stringMatching(/\/version$/),
                expect.stringMatching(/\/pre$/),
            ]),
        );
    });
});
