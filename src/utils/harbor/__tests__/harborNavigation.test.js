import {
    isSameHarborComposerTarget,
    openHarborComposer,
    parseHarborUrl,
} from '../harborNavigation';

const HARBOR_BASE_URL = 'https://harbor.umall.one';

describe('isSameHarborComposerTarget', () => {
    it('比對同一話題與同一回覆樓層', () => {
        expect(
            isSameHarborComposerTarget(
                {
                    mode: 'reply',
                    topicId: 12,
                    replyToPostNumber: 4,
                    draftKey: 'topic_12',
                },
                {
                    mode: 'reply',
                    topicId: 12,
                    replyToPostNumber: 4,
                },
            ),
        ).toBe(true);
    });

    it('不同樓層不算同一目標', () => {
        expect(
            isSameHarborComposerTarget(
                {mode: 'reply', topicId: 12, replyToPostNumber: 4},
                {mode: 'reply', topicId: 12, replyToPostNumber: 5},
            ),
        ).toBe(false);
    });

    it('編輯模式以 postId 比對', () => {
        expect(
            isSameHarborComposerTarget(
                {mode: 'edit', topicId: 12, postId: 99},
                {mode: 'edit', topicId: 12, postId: 99},
            ),
        ).toBe(true);
        expect(
            isSameHarborComposerTarget(
                {mode: 'edit', topicId: 12, postId: 99},
                {mode: 'edit', topicId: 12, postId: 100},
            ),
        ).toBe(false);
    });
});

describe('openHarborComposer', () => {
    it('stack 已有同一回覆目標時 pop 回去，不另開新頁', () => {
        const pop = jest.fn();
        const navigate = jest.fn();
        const navigation = {
            pop,
            navigate,
            getState: () => ({
                index: 2,
                routes: [
                    {name: 'HarborDrafts'},
                    {
                        name: 'HarborComposer',
                        params: {
                            mode: 'reply',
                            topicId: 12,
                            replyToPostNumber: 4,
                            draftKey: 'topic_12',
                            fromDraftBox: true,
                        },
                    },
                    {name: 'HarborTopicDetail', params: {topicId: 12}},
                ],
            }),
        };

        openHarborComposer(navigation, {
            mode: 'reply',
            topicId: 12,
            replyToPostNumber: 4,
        });

        expect(pop).toHaveBeenCalledWith(1);
        expect(navigate).not.toHaveBeenCalled();
    });

    it('目標不同時仍 navigate 新 Composer', () => {
        const pop = jest.fn();
        const navigate = jest.fn();
        const params = {
            mode: 'reply',
            topicId: 12,
            replyToPostNumber: 5,
        };
        const navigation = {
            pop,
            navigate,
            getState: () => ({
                index: 2,
                routes: [
                    {name: 'HarborDrafts'},
                    {
                        name: 'HarborComposer',
                        params: {
                            mode: 'reply',
                            topicId: 12,
                            replyToPostNumber: 4,
                        },
                    },
                    {name: 'HarborTopicDetail', params: {topicId: 12}},
                ],
            }),
        };

        openHarborComposer(navigation, params);

        expect(pop).not.toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith('HarborComposer', params);
    });
});

describe('parseHarborUrl', () => {
    it.each([
        [
            '/t/native-harbor/123/4',
            {type: 'topic', topicId: 123, postNumber: 4},
        ],
        [
            'https://harbor.umall.one/t/native-harbor/123',
            {type: 'topic', topicId: 123},
        ],
        ['/t/123/8', {type: 'topic', topicId: 123, postNumber: 8}],
    ])('辨識話題連結 %s', (url, expected) => {
        expect(parseHarborUrl(url, HARBOR_BASE_URL)).toEqual(expected);
    });

    it('辨識含子分類路徑的分類連結', () => {
        expect(parseHarborUrl('/c/campus/food/27', HARBOR_BASE_URL)).toEqual({
            type: 'category',
            categoryId: 27,
            categorySlug: 'campus/food',
        });
    });

    it('辨識並解碼標籤連結', () => {
        expect(
            parseHarborUrl(
                '/tag/%E6%A0%A1%E5%9C%92%E7%94%9F%E6%B4%BB',
                HARBOR_BASE_URL,
            ),
        ).toEqual({type: 'tag', tag: '校園生活'});
    });

    it('辨識使用者連結並保留 Harbor Web fallback 網址', () => {
        expect(parseHarborUrl('/u/ark-member', HARBOR_BASE_URL)).toEqual({
            type: 'user',
            username: 'ark-member',
            url: 'https://harbor.umall.one/u/ark-member',
        });
    });

    it('辨識並解碼 Harbor 搜尋連結', () => {
        expect(parseHarborUrl('/search?q=harbor', HARBOR_BASE_URL)).toEqual({
            type: 'search',
            query: 'harbor',
        });
    });

    it('讓尚未原生支援的 Harbor 頁面使用 Web fallback', () => {
        expect(parseHarborUrl('/badges', HARBOR_BASE_URL)).toEqual({
            type: 'web',
            url: 'https://harbor.umall.one/badges',
        });
    });

    it.each([
        'https://example.com/t/topic/123',
        'mailto:member@example.com',
        'http://[',
        '',
        null,
    ])('不把外部或無效網址誤認為 Harbor 連結：%s', url => {
        expect(parseHarborUrl(url, HARBOR_BASE_URL)).toBeNull();
    });
});
