const mockInvalidateHarborQueryCache = jest.fn();
const mockPatchHarborQueryCache = jest.fn();
const mockPatchHarborQueryCachePrefix = jest.fn();

jest.mock('../harborQueryCache', () => ({
    invalidateHarborQueryCache: (...args) =>
        mockInvalidateHarborQueryCache(...args),
    patchHarborQueryCache: (...args) => mockPatchHarborQueryCache(...args),
    patchHarborQueryCachePrefix: (...args) =>
        mockPatchHarborQueryCachePrefix(...args),
}));

import {
    isHarborTopicUnseen,
    mergeHarborTopicListItem,
    publishHarborTopicUpdate,
    reconcileHarborTopicListItems,
    subscribeHarborTopicUpdates,
} from '../harborTopicUpdates';

describe('harborTopicUpdates', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('同步更新未掛載頁面的話題與列表 cache', () => {
        publishHarborTopicUpdate(12, {
            detailPatch: {muted: true},
            muted: true,
        });

        expect(mockPatchHarborQueryCache).toHaveBeenCalledWith(
            ['topic', 12],
            expect.any(Function),
            {namespace: 'topic', preserveUpdatedAt: true},
        );
        expect(mockPatchHarborQueryCachePrefix).toHaveBeenCalledWith(
            ['topic-list'],
            expect.any(Function),
            {namespace: 'topic-list', preserveUpdatedAt: true},
        );
        const updateList = mockPatchHarborQueryCachePrefix.mock.calls[0][1];
        expect(updateList({items: [{id: 12, muted: false}]}).items).toEqual([
            {id: 12, muted: true},
        ]);
    });

    test('紅點話題讀完後同步移出未讀列表 cache', () => {
        publishHarborTopicUpdate(12, {
            lastReadPostNumber: 8,
            unreadCount: 0,
            isUnread: false,
            isNew: false,
        });

        const updateList = mockPatchHarborQueryCachePrefix.mock.calls[0][1];
        const current = {
            items: [
                {id: 12, isNew: true, isUnread: true, unreadCount: 5},
                {id: 13, isNew: true, isUnread: false, unreadCount: 0},
            ],
        };

        expect(
            updateList(current, ['topic-list', 'latest::::', 1]).items,
        ).toEqual([
            {
                id: 12,
                isNew: false,
                isUnread: false,
                lastReadPostNumber: 8,
                unreadCount: 0,
            },
            {id: 13, isNew: true, isUnread: false, unreadCount: 0},
        ]);
        expect(
            updateList(
                current,
                ['topic-list', 'latest::::unseen', 1],
            ).items,
        ).toEqual([
            {id: 13, isNew: true, isUnread: false, unreadCount: 0},
        ]);
    });

    test('未讀列表使用與最新列表紅點相同的判斷', () => {
        expect(isHarborTopicUnseen({isNew: true})).toBe(true);
        expect(
            isHarborTopicUnseen({
                isNew: false,
                newContentType: 'topic',
            }),
        ).toBe(true);
        expect(
            isHarborTopicUnseen({
                isNew: true,
                newContentType: 'reply',
            }),
        ).toBe(false);
        expect(
            isHarborTopicUnseen({
                isNew: true,
                unreadCount: 2,
            }),
        ).toBe(false);
        expect(isHarborTopicUnseen({isUnread: true})).toBe(false);
    });

    test('列表已讀樓層只前進，不因詳情缺欄位回退', () => {
        expect(
            mergeHarborTopicListItem(
                {
                    id: 12,
                    highestPostNumber: 13,
                    lastReadPostNumber: 10,
                    unreadCount: 3,
                    isUnread: true,
                },
                {
                    highestPostNumber: 10,
                    lastReadPostNumber: 1,
                    unreadCount: 0,
                    isUnread: false,
                    isNew: false,
                },
            ),
        ).toEqual({
            id: 12,
            highestPostNumber: 13,
            lastReadPostNumber: 10,
            unreadCount: 3,
            isUnread: true,
            isNew: false,
        });
    });

    test('列表有較新回覆時不套用較舊詳情的未讀數', () => {
        expect(
            mergeHarborTopicListItem(
                {
                    id: 12,
                    highestPostNumber: 13,
                    lastReadPostNumber: 3,
                    unreadCount: 10,
                    isUnread: true,
                    newContentType: 'reply',
                },
                {
                    highestPostNumber: 8,
                    lastReadPostNumber: 5,
                    unreadCount: 5,
                    isUnread: true,
                    newContentType: null,
                },
            ),
        ).toEqual({
            id: 12,
            highestPostNumber: 13,
            lastReadPostNumber: 5,
            unreadCount: 10,
            isUnread: true,
            newContentType: 'reply',
        });
    });

    test('讀完後立即清除合併列表的新內容分類', () => {
        expect(
            mergeHarborTopicListItem(
                {
                    id: 12,
                    highestPostNumber: 8,
                    lastReadPostNumber: 3,
                    unreadCount: 5,
                    isUnread: true,
                    newContentType: 'reply',
                },
                {
                    highestPostNumber: 8,
                    lastReadPostNumber: 8,
                    unreadCount: 0,
                    isUnread: false,
                    isNew: false,
                    newContentType: null,
                },
            ),
        ).toEqual({
            id: 12,
            highestPostNumber: 8,
            lastReadPostNumber: 8,
            unreadCount: 0,
            isUnread: false,
            isNew: false,
            newContentType: null,
        });
    });

    test('列表刷新時保留本地較新的已讀狀態', () => {
        expect(
            reconcileHarborTopicListItems(
                [
                    {
                        id: 12,
                        highestPostNumber: 8,
                        lastReadPostNumber: 3,
                        unreadCount: 5,
                        isUnread: true,
                        isNew: true,
                    },
                    {
                        id: 13,
                        highestPostNumber: 4,
                        lastReadPostNumber: 4,
                        unreadCount: 0,
                        isUnread: false,
                        isNew: false,
                    },
                ],
                [
                    {
                        id: 12,
                        highestPostNumber: 8,
                        lastReadPostNumber: 8,
                        unreadCount: 0,
                        isUnread: false,
                        isNew: false,
                    },
                ],
            ),
        ).toEqual([
            {
                id: 12,
                highestPostNumber: 8,
                lastReadPostNumber: 8,
                unreadCount: 0,
                isUnread: false,
                isNew: false,
            },
            {
                id: 13,
                highestPostNumber: 4,
                lastReadPostNumber: 4,
                unreadCount: 0,
                isUnread: false,
                isNew: false,
            },
        ]);
    });

    test('伺服器已讀樓層較新時不覆蓋列表刷新結果', () => {
        expect(
            reconcileHarborTopicListItems(
                [
                    {
                        id: 12,
                        highestPostNumber: 8,
                        lastReadPostNumber: 8,
                        unreadCount: 0,
                        isUnread: false,
                        isNew: false,
                    },
                ],
                [
                    {
                        id: 12,
                        highestPostNumber: 8,
                        lastReadPostNumber: 3,
                        unreadCount: 5,
                        isUnread: true,
                        isNew: true,
                    },
                ],
            ),
        ).toEqual([
            {
                id: 12,
                highestPostNumber: 8,
                lastReadPostNumber: 8,
                unreadCount: 0,
                isUnread: false,
                isNew: false,
            },
        ]);
    });

    test('需重排列表時失效列表 cache 並保留 listener 契約', () => {
        const listener = jest.fn();
        const unsubscribe = subscribeHarborTopicUpdates(listener);

        publishHarborTopicUpdate(12, {
            invalidateDetail: true,
            reloadLists: true,
        });

        expect(mockInvalidateHarborQueryCache).toHaveBeenNthCalledWith(
            1,
            ['topic', 12],
            {namespace: 'topic'},
        );
        expect(mockInvalidateHarborQueryCache).toHaveBeenNthCalledWith(
            2,
            ['topic-list'],
            {namespace: 'topic-list', prefix: true},
        );
        expect(listener).toHaveBeenCalledWith(12, {reloadLists: true});

        unsubscribe();
    });

    test('內容變更時失效搜尋與活動 cache', () => {
        publishHarborTopicUpdate(12, {
            invalidateActivity: true,
            invalidateSearch: true,
        });

        expect(mockInvalidateHarborQueryCache).toHaveBeenNthCalledWith(
            1,
            ['activity'],
            {namespace: 'activity', prefix: true},
        );
        expect(mockInvalidateHarborQueryCache).toHaveBeenNthCalledWith(
            2,
            ['search'],
            {namespace: 'search', prefix: true},
        );
    });
});
