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
