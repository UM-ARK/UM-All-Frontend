jest.mock('../../../../utils/pathMap', () => ({
    ARK_WIKI: 'https://wiki.umall.one',
    ARK_WIKI_PAGE: 'https://wiki.umall.one/wiki/',
}));

import {
    buildWikiArticleUrl,
    dedupeWikiResults,
    extractWikiImageUrls,
    getWikiLinkAction,
    normalizeWikiTitle,
    sanitizeWikiHtml,
    stripWikiSnippet,
} from '../wikiModels';

describe('wikiModels', () => {
    test('normalizes encoded titles and builds article URLs', () => {
        expect(normalizeWikiTitle('%E9%81%B8%E5%92%A9%E8%AA%B2')).toBe('選咩課');
        expect(buildWikiArticleUrl('選咩課')).toBe(
            'https://wiki.umall.one/wiki/%E9%81%B8%E5%92%A9%E8%AA%B2',
        );
    });

    test('routes same-site articles while leaving external and special links outside', () => {
        expect(getWikiLinkAction('/wiki/E2_%E5%9C%96%E6%9B%B8%E9%A4%A8#服務')).toEqual({
            type: 'article',
            title: 'E2 圖書館',
            fragment: '服務',
        });
        expect(getWikiLinkAction('https://example.com')).toEqual({
            type: 'external',
            url: 'https://example.com/',
        });
        expect(getWikiLinkAction('mailto:umacark@gmail.com').type).toBe('external');
        expect(getWikiLinkAction('/wiki/Special:Random').type).toBe('external');
    });

    test('sanitizes active content and extracts unique absolute image URLs', () => {
        const html = '<script>alert(1)</script><img src="/a.png" onerror="bad()"><img src="/a.png">';
        expect(sanitizeWikiHtml(html)).not.toContain('<script');
        expect(sanitizeWikiHtml(html)).not.toContain('onerror');
        expect(extractWikiImageUrls(html)).toEqual(['https://wiki.umall.one/a.png']);
    });

    test('deduplicates titles and strips search markup', () => {
        expect(dedupeWikiResults([
            {title: '選咩課'},
            {title: '選咩課'},
            {title: '校園網'},
        ])).toHaveLength(2);
        expect(stripWikiSnippet('<span class="searchmatch">ARK</span> &amp; UM')).toBe('ARK & UM');
    });
});
