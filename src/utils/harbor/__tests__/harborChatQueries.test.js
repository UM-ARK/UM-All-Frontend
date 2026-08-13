import {
    getHarborChatMessagesCacheKey,
    patchHarborChatChannelMessagesCache,
    patchHarborChatMessagesCache,
    readHarborChatMessagesCache,
    writeHarborChatMessagesCache,
} from '../harborChatQueries';
import {resetHarborQueryCache} from '../harborQueryCache';

describe('harborChatQueries', () => {
    beforeEach(() => {
        resetHarborQueryCache();
        jest.useFakeTimers().setSystemTime(new Date('2026-08-13T00:00:00Z'));
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('latest 與指定訊息使用不同 cache key', () => {
        const latestKey = getHarborChatMessagesCacheKey(' ArkUser ', 12);
        const targetKey = getHarborChatMessagesCacheKey(' ArkUser ', 12, 31);

        writeHarborChatMessagesCache(latestKey, {items: [{id: 40}]});
        writeHarborChatMessagesCache(targetKey, {items: [{id: 31}]});

        expect(readHarborChatMessagesCache(latestKey).items).toEqual([{id: 40}]);
        expect(readHarborChatMessagesCache(targetKey).items).toEqual([{id: 31}]);
    });

    test('channel patch 同步 optimistic 訊息但保留各查詢分頁狀態', () => {
        const latestKey = getHarborChatMessagesCacheKey('reader', 12);
        const targetKey = getHarborChatMessagesCacheKey('reader', 12, 31);
        writeHarborChatMessagesCache(latestKey, {
            canLoadMorePast: true,
            items: [{id: 40}],
        });
        writeHarborChatMessagesCache(targetKey, {
            canLoadMorePast: false,
            items: [{id: 31}],
        });

        patchHarborChatChannelMessagesCache('reader', 12, current => ({
            ...current,
            items: [...current.items, {id: 41}],
        }));

        expect(readHarborChatMessagesCache(latestKey)).toEqual({
            canLoadMorePast: true,
            items: [{id: 40}, {id: 41}],
        });
        expect(readHarborChatMessagesCache(targetKey)).toEqual({
            canLoadMorePast: false,
            items: [{id: 31}, {id: 41}],
        });
    });

    test('向前分頁 patch 不延長 cache freshness', () => {
        const key = getHarborChatMessagesCacheKey('reader', 12);
        writeHarborChatMessagesCache(key, {
            canLoadMorePast: true,
            items: [{id: 40}],
        });
        jest.advanceTimersByTime(4 * 60 * 1000);

        patchHarborChatMessagesCache(key, current => ({
            ...current,
            items: [{id: 20}, ...current.items],
        }));
        jest.advanceTimersByTime(61 * 1000);

        expect(readHarborChatMessagesCache(key)).toBeUndefined();
    });

    test('每個 session 最多保留十個訊息查詢', () => {
        const keys = Array.from({length: 11}, (_, index) =>
            getHarborChatMessagesCacheKey('reader', index + 1),
        );
        keys.forEach((key, index) => {
            writeHarborChatMessagesCache(key, {items: [{id: index + 1}]});
        });

        expect(readHarborChatMessagesCache(keys[0])).toBeUndefined();
        expect(readHarborChatMessagesCache(keys[10]).items).toEqual([{id: 11}]);
    });
});
