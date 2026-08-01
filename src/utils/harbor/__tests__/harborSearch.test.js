jest.mock('../../storageKits', () => ({
    getLocalStorage: jest.fn(),
    setLocalStorage: jest.fn(),
}));

import {
    addHarborSearchHistory,
    buildHarborSearchQuery,
    canRunHarborKeywordSearch,
    clearHarborSearchHistory,
    countHarborSearchContentItems,
    filterHarborSearchItems,
    getHarborSearchAfterDate,
    getHarborSearchHistory,
    getSimplifiedHarborSearchQuery,
    mergeHarborSearchItems,
    removeHarborSearchHistory,
    sanitizeHarborSearchHistory,
} from '../harborSearch';
import {getLocalStorage, setLocalStorage} from '../../storageKits';

describe('Harbor 搜尋工具', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Date, 'now').mockReturnValue(100);
    });

    afterEach(() => {
        Date.now.mockRestore();
    });

    it('保留原始 Discourse 語法並附加原生篩選', () => {
        expect(
            buildHarborSearchQuery({
                query: 'intern status:open',
                category: {slug: 'career'},
                tag: {name: 'Part Time'},
                author: '@ark-user',
                after: '2026-06-26',
                order: 'latest',
            }),
        ).toBe(
            'intern status:open category:career tags:"Part Time" @ark-user after:2026-06-26 order:latest',
        );
    });

    it('空關鍵字僅帶作者時組成 @username 查詢', () => {
        expect(
            buildHarborSearchQuery({
                query: '',
                author: 'qq_yyy',
            }),
        ).toBe('@qq_yyy');
    });

    it('按所選時間範圍建立搜尋日期', () => {
        const now = Date.parse('2026-07-26T12:00:00Z');
        expect(getHarborSearchAfterDate('week', now)).toBe('2026-07-19');
        expect(getHarborSearchAfterDate('all', now)).toBe('');
    });

    it('至少輸入兩個字才允許關鍵字搜尋', () => {
        expect(canRunHarborKeywordSearch('課')).toBe(false);
        expect(canRunHarborKeywordSearch('課程')).toBe(true);
        expect(canRunHarborKeywordSearch('ab')).toBe(true);
    });

    it('將繁體搜尋字轉為簡體版本', () => {
        expect(getSimplifiedHarborSearchQuery('課程評價')).toBe('课程评价');
    });

    it('原文結果優先並按貼文或話題 ID 合併去重', () => {
        const originalItems = [
            {id: 'original-post', kind: 'post', postId: 10, topicId: 1},
            {id: 'original-topic', kind: 'topic', topicId: 2},
            {id: 'original-user', kind: 'user', user: {id: 3}},
        ];
        const convertedItems = [
            {id: 'converted-post', kind: 'post', postId: 10, topicId: 1},
            {id: 'converted-topic', kind: 'topic', topicId: 2},
            {id: 'new-topic', kind: 'topic', topicId: 4},
            {id: 'converted-user', kind: 'user', user: {id: 3}},
        ];

        expect(
            mergeHarborSearchItems(originalItems, convertedItems).map(
                item => item.id,
            ),
        ).toEqual([
            'original-post',
            'original-topic',
            'original-user',
            'new-topic',
        ]);
        expect(countHarborSearchContentItems(originalItems)).toBe(2);
    });

    it('清理、排序及忽略大小寫去重最近搜尋', () => {
        expect(
            sanitizeHarborSearchHistory([
                {query: ' Harbor ', searchedAt: 10},
                {query: 'harbor', searchedAt: 20},
                '實習',
                null,
            ]),
        ).toEqual([
            {query: 'harbor', searchedAt: 20},
            {query: '實習', searchedAt: 0},
        ]);
    });

    it('新增、單筆刪除及全部清除最近搜尋', async () => {
        getLocalStorage
            .mockResolvedValueOnce([{query: '舊搜尋', searchedAt: 10}])
            .mockResolvedValueOnce([
                {query: '新搜尋', searchedAt: 100},
                {query: '舊搜尋', searchedAt: 10},
            ]);

        await expect(addHarborSearchHistory(' 新搜尋 ')).resolves.toEqual([
            {query: '新搜尋', searchedAt: 100},
            {query: '舊搜尋', searchedAt: 10},
        ]);
        await expect(removeHarborSearchHistory('新搜尋')).resolves.toEqual([
            {query: '舊搜尋', searchedAt: 10},
        ]);
        await expect(clearHarborSearchHistory()).resolves.toEqual([]);

        expect(setLocalStorage).toHaveBeenNthCalledWith(
            1,
            'ARK_Harbor_Search_History',
            [
                {query: '新搜尋', searchedAt: 100},
                {query: '舊搜尋', searchedAt: 10},
            ],
        );
        expect(setLocalStorage).toHaveBeenNthCalledWith(
            2,
            'ARK_Harbor_Search_History',
            [{query: '舊搜尋', searchedAt: 10}],
        );
        expect(setLocalStorage).toHaveBeenNthCalledWith(
            3,
            'ARK_Harbor_Search_History',
            [],
        );
    });

    it('破損儲存內容會安全返回空陣列', async () => {
        getLocalStorage.mockResolvedValue(new Error('broken'));
        await expect(getHarborSearchHistory()).resolves.toEqual([]);
    });

    it('即時篩選已載入的話題與用戶結果', () => {
        const items = [
            {
                id: '1',
                kind: 'topic',
                title: '可以使用 Event 功能',
                excerpt: '時間表',
                author: {username: 'qq_yyy'},
            },
            {
                id: '2',
                kind: 'topic',
                title: 'APP 開發測試',
                excerpt: '測試回复',
                author: {username: 'other'},
            },
            {
                id: '3',
                kind: 'user',
                user: {username: 'event_bot', name: 'Event Bot'},
            },
        ];

        expect(
            filterHarborSearchItems(items, 'eve').map(item => item.id),
        ).toEqual(['1', '3']);
        expect(filterHarborSearchItems(items, '')).toEqual(items);
    });
});
