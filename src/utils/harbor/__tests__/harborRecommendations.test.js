import {fetchHarborTopicList} from '../harborApi';
import {
    composeHarborRecommendedFeed,
    fetchHarborRecommendationCandidates,
    selectHarborRecommendations,
} from '../harborRecommendations';
import {
    resetHarborQueryCache,
    writeHarborQueryCache,
} from '../harborQueryCache';

jest.mock('../harborApi', () => ({
    fetchHarborTopicList: jest.fn(),
}));

const topic = (id, extra = {}) => ({
    id,
    title: `話題 ${id}`,
    lastReadPostNumber: null,
    ...extra,
});

describe('Harbor 推薦話題', () => {
    beforeEach(() => {
        resetHarborQueryCache();
        fetchHarborTopicList.mockReset();
    });

    afterEach(() => {
        resetHarborQueryCache();
        jest.restoreAllMocks();
    });

    it('排除最新列表、已讀及不可推薦話題並保留熱門順序', () => {
        const latestItems = [topic(1), topic(2), topic(3)];
        const candidates = [
            topic(2),
            topic(4, {lastReadPostNumber: 3}),
            topic(5, {muted: true}),
            topic(6),
            topic(6),
            topic(7),
            topic(8),
        ];

        expect(
            selectHarborRecommendations(candidates, latestItems).map(
                item => item.id,
            ),
        ).toEqual([6, 7]);
    });

    it('在第 3 及第 8 篇最新話題後插入推薦並移除後續重複項', () => {
        const latestItems = Array.from({length: 10}, (_, index) =>
            topic(index + 1),
        );
        const feed = composeHarborRecommendedFeed(latestItems, [
            topic(20),
            topic(9),
        ]);

        expect(feed.map(item => item.id)).toEqual([
            1,
            2,
            3,
            20,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
        ]);
        expect(feed[3].isHarborRecommendation).toBe(true);
        expect(feed[9].isHarborRecommendation).toBe(true);
    });

    it('只有一篇候選時不建立空白的第二個推薦項', () => {
        const latestItems = Array.from({length: 10}, (_, index) =>
            topic(index + 1),
        );
        const feed = composeHarborRecommendedFeed(latestItems, [topic(20)]);

        expect(feed.filter(item => item.isHarborRecommendation)).toEqual([
            expect.objectContaining({id: 20}),
        ]);
    });

    it('同一 session 共用月度熱門候選 cache', async () => {
        fetchHarborTopicList.mockResolvedValue({items: [topic(20)]});

        await fetchHarborRecommendationCandidates(3);
        await fetchHarborRecommendationCandidates(3);

        expect(fetchHarborTopicList).toHaveBeenCalledTimes(1);
        expect(fetchHarborTopicList).toHaveBeenCalledWith({
            view: 'top',
            period: 'monthly',
            page: 0,
            signal: expect.anything(),
        });
    });

    it('不同 session 不共用候選 cache', async () => {
        fetchHarborTopicList.mockResolvedValue({items: [topic(20)]});

        await fetchHarborRecommendationCandidates(3);
        await fetchHarborRecommendationCandidates(4);

        expect(fetchHarborTopicList).toHaveBeenCalledTimes(2);
    });

    it('候選更新失敗時退回同一 session 的 stale cache', async () => {
        const now = Date.now();
        writeHarborQueryCache(
            ['topic-list', 'recommendations', 'monthly', 3],
            {items: [topic(20)]},
            {namespace: 'topic-list'},
        );
        jest.spyOn(Date, 'now').mockReturnValue(now + 10 * 60 * 1000 + 1);
        fetchHarborTopicList.mockRejectedValue(new Error('network'));

        await expect(
            fetchHarborRecommendationCandidates(3),
        ).resolves.toEqual({items: [topic(20)]});
    });
});
