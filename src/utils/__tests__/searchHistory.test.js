jest.mock('../storageKits', () => ({
    getLocalStorage: jest.fn(),
    setLocalStorage: jest.fn(),
}));

import {getLocalStorage, setLocalStorage} from '../storageKits';
import {
    SEARCH_HISTORY_LIMIT,
    SEARCH_HISTORY_STORAGE_KEY,
    addSearchHistory,
    clearSearchHistory,
    getSearchHistory,
    removeSearchHistory,
    sanitizeSearchHistory,
} from '../searchHistory';

describe('首頁搜索歷史', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getLocalStorage.mockResolvedValue([]);
        setLocalStorage.mockResolvedValue('ok');
    });

    it('兼容舊格式並清理無效、重複及未排序的資料', async () => {
        getLocalStorage.mockResolvedValue([
            ' 校園巴士 ',
            {
                query: 'Canteen',
                selectedKey: ' 舊選項 ',
                searchedAt: 20,
            },
            {query: 'canteen', searchedAt: 30},
            {query: 'News', searchedAt: 'invalid'},
            {query: ' ', searchedAt: 50},
            null,
            new Error('broken data'),
        ]);

        await expect(getSearchHistory()).resolves.toEqual([
            {query: 'canteen', searchedAt: 30},
            {query: '校園巴士', searchedAt: 0},
            {query: 'News', searchedAt: 0},
        ]);
        expect(getLocalStorage).toHaveBeenCalledWith(
            SEARCH_HISTORY_STORAGE_KEY,
        );
    });

    it('新增時整理文字、忽略大小寫去重並置頂', async () => {
        getLocalStorage.mockResolvedValue([
            {query: 'Bus', selectedKey: '舊頁面', searchedAt: 10},
            {query: 'News', searchedAt: 5},
        ]);
        jest.spyOn(Date, 'now').mockReturnValue(100);

        await expect(addSearchHistory(' bus ', ' 校園巴士 ')).resolves.toEqual([
            {
                query: 'bus',
                selectedKey: '校園巴士',
                searchedAt: 100,
            },
            {query: 'News', searchedAt: 5},
        ]);
        expect(setLocalStorage).toHaveBeenCalledWith(
            SEARCH_HISTORY_STORAGE_KEY,
            [
                {
                    query: 'bus',
                    selectedKey: '校園巴士',
                    searchedAt: 100,
                },
                {query: 'News', searchedAt: 5},
            ],
        );
        Date.now.mockRestore();
    });

    it('最多保留十筆最新記錄', async () => {
        const history = Array.from(
            {length: SEARCH_HISTORY_LIMIT + 2},
            (_, i) => ({
                query: `搜尋 ${i}`,
                searchedAt: i,
            }),
        );
        getLocalStorage.mockResolvedValue(history);
        jest.spyOn(Date, 'now').mockReturnValue(100);

        const nextHistory = await addSearchHistory('最新搜尋');

        expect(nextHistory).toHaveLength(SEARCH_HISTORY_LIMIT);
        expect(nextHistory[0]).toEqual({
            query: '最新搜尋',
            searchedAt: 100,
        });
        expect(nextHistory.at(-1)).toEqual({
            query: '搜尋 3',
            searchedAt: 3,
        });
        Date.now.mockRestore();
    });

    it('按整理後的文字刪除單筆記錄', async () => {
        getLocalStorage.mockResolvedValue([
            {query: 'Campus Map', searchedAt: 20},
            {query: 'News', searchedAt: 10},
        ]);

        await expect(removeSearchHistory(' campus map ')).resolves.toEqual([
            {query: 'News', searchedAt: 10},
        ]);
        expect(setLocalStorage).toHaveBeenCalledWith(
            SEARCH_HISTORY_STORAGE_KEY,
            [{query: 'News', searchedAt: 10}],
        );
    });

    it('清空全部記錄', async () => {
        await expect(clearSearchHistory()).resolves.toEqual([]);
        expect(setLocalStorage).toHaveBeenCalledWith(
            SEARCH_HISTORY_STORAGE_KEY,
            [],
        );
    });

    it('非陣列資料及空白新增都不會造成錯誤', async () => {
        expect(sanitizeSearchHistory(new Error('broken storage'))).toEqual([]);
        getLocalStorage.mockResolvedValue(new Error('broken storage'));

        await expect(addSearchHistory('   ')).resolves.toEqual([]);
        expect(setLocalStorage).not.toHaveBeenCalled();
    });
});
