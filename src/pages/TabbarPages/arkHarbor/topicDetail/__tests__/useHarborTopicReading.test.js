jest.mock('@react-navigation/native', () => ({
    useFocusEffect: jest.fn(),
}));
jest.mock('../../../../../utils/glassEffect', () => ({
    isLiquidGlassSupported: false,
}));
jest.mock('react-native-simple-toast', () => ({
    show: jest.fn(),
}));
jest.mock('react-native-size-matters', () => ({
    verticalScale: value => value,
}));
jest.mock('../../../../../utils/harbor/harborApi', () => ({
    fetchHarborTopic: jest.fn(),
    saveHarborTopicTimings: jest.fn(),
}));
jest.mock('../harborTopicModels', () => ({
    isCanceledRequest: jest.fn(),
    mergeTopicWindow: jest.fn(),
}));

import {
    getHighestVisiblePostNumber,
    getReadingPostNumber,
    getTopicReadStateAfterVisit,
} from '../useHarborTopicReading';

describe('Harbor 話題閱讀樓層', () => {
    const visiblePosts = [
        {
            index: 1,
            item: {post_number: 2},
        },
        {
            index: 2,
            item: {post_number: 3},
        },
    ];
    const getLayout = index => {
        return {
            y: index === 1 ? 500 : 900,
            height: 400,
        };
    };

    it('一般滾動以閱讀線所在樓層上報', () => {
        expect(
            getReadingPostNumber({
                atTopicEnd: false,
                firstItemOffset: 0,
                getLayout,
                readingLineOffset: 700,
                visiblePosts,
            }),
        ).toBe(2);
    });

    it('到達底部且最後兩樓同屏時上報最後一樓', () => {
        expect(
            getReadingPostNumber({
                atTopicEnd: true,
                firstItemOffset: 0,
                getLayout,
                readingLineOffset: 700,
                visiblePosts,
            }),
        ).toBe(3);
    });
});

describe('Harbor 話題返回列表已讀狀態', () => {
    it('已讀帖即使只看到 1 樓也不會憑空造出新回覆', () => {
        expect(
            getTopicReadStateAfterVisit({
                highestPostNumber: 10,
                lastReadPostNumber: 0,
                lastVisiblePostNumber: 1,
                postsCount: 10,
                unreadPosts: 0,
            }),
        ).toEqual({
            highestPostNumber: 10,
            lastReadPostNumber: 1,
            unreadCount: 0,
            isUnread: false,
            isNew: false,
            shouldReloadLists: false,
        });
    });

    it('同屏可見多樓時以上報最高樓層', () => {
        expect(
            getHighestVisiblePostNumber([
                {item: {post_number: 1}},
                {item: {post_number: 4}},
                {item: {post_number: 3}},
            ]),
        ).toBe(4);
    });

    it('未讀帖往前讀時下修未讀數，而不是整段保留', () => {
        expect(
            getTopicReadStateAfterVisit({
                highestPostNumber: 8,
                lastReadPostNumber: 3,
                lastVisiblePostNumber: 5,
                unreadPosts: 5,
            }),
        ).toEqual({
            highestPostNumber: 8,
            lastReadPostNumber: 5,
            unreadCount: 3,
            isUnread: true,
            isNew: false,
            shouldReloadLists: false,
        });
    });

    it('未讀帖沒有往前讀時保留伺服器未讀數', () => {
        expect(
            getTopicReadStateAfterVisit({
                highestPostNumber: 8,
                lastReadPostNumber: 5,
                lastVisiblePostNumber: 1,
                unreadPosts: 3,
            }),
        ).toEqual({
            highestPostNumber: 8,
            lastReadPostNumber: 5,
            unreadCount: 3,
            isUnread: true,
            isNew: false,
            shouldReloadLists: false,
        });
    });

    it('讀到最後一樓時清未讀並重排未讀／新帖視圖', () => {
        expect(
            getTopicReadStateAfterVisit({
                highestPostNumber: 8,
                lastReadPostNumber: 3,
                lastVisiblePostNumber: 8,
                unreadPosts: 5,
            }),
        ).toEqual({
            highestPostNumber: 8,
            lastReadPostNumber: 8,
            unreadCount: 0,
            isUnread: false,
            isNew: false,
            shouldReloadLists: true,
        });
    });

    it('新帖看過後清 isNew，並重排新帖視圖', () => {
        expect(
            getTopicReadStateAfterVisit({
                highestPostNumber: 6,
                lastReadPostNumber: 0,
                lastVisiblePostNumber: 1,
                unreadPosts: 0,
                unseen: true,
            }),
        ).toEqual({
            highestPostNumber: 6,
            lastReadPostNumber: 1,
            unreadCount: 0,
            isUnread: false,
            isNew: false,
            shouldReloadLists: true,
        });
    });

    it('詳情沒有未讀欄位時不覆蓋列表未讀狀態', () => {
        expect(
            getTopicReadStateAfterVisit({
                highestPostNumber: 10,
                lastReadPostNumber: null,
                lastVisiblePostNumber: 1,
            }),
        ).toEqual({
            highestPostNumber: 10,
            lastReadPostNumber: 1,
            unreadCount: null,
            isUnread: null,
            isNew: false,
            shouldReloadLists: false,
        });
    });

    it('詳情連最高樓層也缺少時不把目前樓層當成結尾', () => {
        expect(
            getTopicReadStateAfterVisit({
                lastReadPostNumber: null,
                lastVisiblePostNumber: 1,
            }),
        ).toEqual({
            highestPostNumber: null,
            lastReadPostNumber: 1,
            unreadCount: null,
            isUnread: null,
            isNew: false,
            shouldReloadLists: false,
        });
    });
});
