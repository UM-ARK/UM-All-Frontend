jest.mock('../storageKits', () => ({
    getLocalStorage: jest.fn(),
    setLocalStorageSilently: jest.fn(),
}));

import {
    getLocalStorage,
    setLocalStorageSilently,
} from '../storageKits';
import {
    readUMOpenDataCache,
    UM_EVENT_CACHE_KEY,
    writeUMOpenDataCache,
} from '../umOpenDataCache';

describe('澳大 Open Data 列表快取', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('30 分鐘內的資料標記為新鮮', async () => {
        getLocalStorage.mockResolvedValue({
            cachedAt: 1_000_000,
            items: [{ _id: 'event-1' }],
        });

        await expect(
            readUMOpenDataCache(UM_EVENT_CACHE_KEY, 1_000_000 + 29 * 60 * 1000),
        ).resolves.toEqual({
            items: [{ _id: 'event-1' }],
            isFresh: true,
        });
    });

    test('超過 30 分鐘仍可先展示並背景更新', async () => {
        getLocalStorage.mockResolvedValue({
            cachedAt: 1_000_000,
            items: [{ _id: 'event-1' }],
        });

        await expect(
            readUMOpenDataCache(UM_EVENT_CACHE_KEY, 1_000_000 + 31 * 60 * 1000),
        ).resolves.toEqual({
            items: [{ _id: 'event-1' }],
            isFresh: false,
        });
    });

    test('忽略超過 7 天或格式錯誤的資料', async () => {
        getLocalStorage.mockResolvedValueOnce({
            cachedAt: 1_000_000,
            items: [{ _id: 'event-1' }],
        });
        await expect(
            readUMOpenDataCache(UM_EVENT_CACHE_KEY, 1_000_000 + 8 * 24 * 60 * 60 * 1000),
        ).resolves.toBeNull();

        getLocalStorage.mockResolvedValueOnce({ cachedAt: 1_000_000 });
        await expect(
            readUMOpenDataCache(UM_EVENT_CACHE_KEY, 1_000_000),
        ).resolves.toBeNull();
    });

    test('成功資料會連同寫入時間保存', async () => {
        const items = [{ _id: 'event-1' }];
        jest.spyOn(Date, 'now').mockReturnValue(2_000_000);

        await writeUMOpenDataCache(UM_EVENT_CACHE_KEY, items);

        expect(setLocalStorageSilently).toHaveBeenCalledWith(
            UM_EVENT_CACHE_KEY,
            { cachedAt: 2_000_000, items },
        );
        Date.now.mockRestore();
    });
});
