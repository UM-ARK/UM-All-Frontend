import {parseHarborUrl} from '../harborNavigation';

const HARBOR_BASE_URL = 'https://harbor.umall.one';

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
