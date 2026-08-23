jest.mock('../storageKits', () => ({
    getLocalStorage: jest.fn(),
    setLocalStorage: jest.fn(),
}));

import {getLocalStorage} from '../storageKits';

const loadUmehHost = () => {
    let umehHost;
    jest.isolateModules(() => {
        umehHost = require('../umehHost');
    });
    return umehHost;
};

describe('選咩課網站自動探測', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getLocalStorage.mockResolvedValue('auto');
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        delete global.fetch;
    });

    it('探測完成前先使用後備網站', () => {
        const {getCurrentUmehHost, UMEH_BACKUP_HOST} = loadUmehHost();

        expect(getCurrentUmehHost()).toBe(UMEH_BACKUP_HOST);
    });

    it('primary 回傳非成功狀態時使用後備網站', async () => {
        global.fetch.mockResolvedValue({ok: false, status: 402});
        const {
            getCurrentUmehHost,
            refreshUmehHost,
            UMEH_BACKUP_HOST,
        } = loadUmehHost();

        await refreshUmehHost();

        expect(getCurrentUmehHost()).toBe(UMEH_BACKUP_HOST);
    });

    it('primary 回傳成功狀態時使用 primary 網站', async () => {
        global.fetch.mockResolvedValue({ok: true, status: 200});
        const {
            getCurrentUmehHost,
            refreshUmehHost,
            UMEH_PRIMARY_HOST,
        } = loadUmehHost();

        await refreshUmehHost();

        expect(UMEH_PRIMARY_HOST).toBe('https://umeh.top');
        expect(getCurrentUmehHost()).toBe(UMEH_PRIMARY_HOST);
    });

    it('30 分鐘內重複刷新只探測一次', async () => {
        let now = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        global.fetch.mockResolvedValue({ok: true, status: 200});
        const {refreshUmehHost} = loadUmehHost();

        await refreshUmehHost();
        now = 29 * 60 * 1000;
        await refreshUmehHost();

        expect(global.fetch).toHaveBeenCalledTimes(1);

        now = 30 * 60 * 1000 + 1;
        await refreshUmehHost();

        expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('primary 網絡失敗時使用後備網站', async () => {
        global.fetch.mockRejectedValue(new Error('network error'));
        const {
            getCurrentUmehHost,
            refreshUmehHost,
            UMEH_BACKUP_HOST,
        } = loadUmehHost();

        await refreshUmehHost();

        expect(getCurrentUmehHost()).toBe(UMEH_BACKUP_HOST);
    });
});

describe('選咩課跳轉方式', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getLocalStorage.mockResolvedValue(undefined);
    });

    it('未設定時預設內頁瀏覽', async () => {
        const {getUmehOpenPref} = loadUmehHost();

        await expect(getUmehOpenPref()).resolves.toBe('inApp');
    });

    it('可改為系統瀏覽器並寫入緩存', async () => {
        const {setLocalStorage} = require('../storageKits');
        const {getUmehOpenPref, setUmehOpenPref} = loadUmehHost();

        await setUmehOpenPref('system');

        expect(setLocalStorage).toHaveBeenCalledWith(
            'umeh_open_pref',
            'system',
        );
        await expect(getUmehOpenPref()).resolves.toBe('system');
    });

    it('非法值回退為內頁瀏覽', async () => {
        getLocalStorage.mockResolvedValue('chrome');
        const {getUmehOpenPref} = loadUmehHost();

        await expect(getUmehOpenPref()).resolves.toBe('inApp');
    });

    it('isUmehUrl 辨識主站與後備站', () => {
        const {
            isUmehUrl,
            UMEH_PRIMARY_HOST,
            UMEH_BACKUP_HOST,
        } = loadUmehHost();

        expect(isUmehUrl(`${UMEH_PRIMARY_HOST}/course/CISG1001`)).toBe(true);
        expect(isUmehUrl(`${UMEH_BACKUP_HOST}/reviews/x`)).toBe(true);
        expect(isUmehUrl('https://um.edu.mo')).toBe(false);
        expect(isUmehUrl(null)).toBe(false);
    });
});
