jest.mock('../pathMap', () => ({
    ARK_WIKI_API: 'https://wiki.umall.one/api.php',
    ARK_WIKI_REST: 'https://wiki.umall.one/rest.php/v1',
}));

jest.mock('../storageKits', () => ({
    getLocalStorage: jest.fn(),
    setLocalStorage: jest.fn(),
}));

jest.mock('../../pages/TabbarPages/arkwiki/wikiModels', () => ({
    dedupeWikiResults: results => results,
    normalizeWikiTitle: value => typeof value === 'string' ? value.trim().replace(/_/g, ' ') : '',
    stripWikiSnippet: value => value || '',
}));

import {
    fetchWikiArticle,
    fetchWikiFullSearch,
    fetchWikiPrefixSearch,
    fetchWikiRecentChanges,
} from '../wikiApi';

const jsonResponse = (data, options = {}) => ({
    ok: options.ok ?? true,
    status: options.status ?? 200,
    headers: {get: key => key === 'etag' ? options.etag || null : null},
    json: jest.fn().mockResolvedValue(data),
});

describe('wikiApi', () => {
    beforeEach(() => {
        global.fetch = jest.fn();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('resolves prefix search aliases in one request and keeps the best hit rank', async () => {
        global.fetch.mockResolvedValue(jsonResponse({
            query: {
                pages: [
                    {title: 'ECE Digital System', pageid: 5, index: 2},
                    {title: 'ECE 電機及計算機工程系', pageid: 7, index: 3},
                ],
                redirects: [{from: 'ECE 電機及電腦工程系', to: 'ECE 電機及計算機工程系', index: 1}],
            },
        }));

        const results = await fetchWikiPrefixSearch('ece');

        expect(results.map(item => item.pageId)).toEqual([7, 5]);
        expect(results[0].aliases).toEqual(['ECE 電機及電腦工程系']);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch.mock.calls[0][0]).toContain('generator=prefixsearch');
        expect(global.fetch.mock.calls[0][0]).toContain('gpsnamespace=0');
        expect(global.fetch.mock.calls[0][0]).toContain('redirects=1');
    });

    test('keeps the article snippet and only shows matched aliases in a redirect chain', async () => {
        global.fetch.mockResolvedValue(jsonResponse({
            query: {
                pages: [{pageid: 7, title: 'ECE 電機及計算機工程系', snippet: 'Electrical and Computer Engineering'}],
                redirects: [
                    {from: 'ECE', to: 'ECE 電機及電腦工程系', index: 1},
                    {from: 'ECE 電機及電腦工程系', to: 'ECE 電機及計算機工程系'},
                ],
            },
        }));

        expect(await fetchWikiFullSearch('ece')).toEqual([{
            title: 'ECE 電機及計算機工程系',
            snippet: 'Electrical and Computer Engineering',
            pageId: 7,
            aliases: ['ECE'],
        }]);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(global.fetch.mock.calls[0][0]).toContain('generator=search');
        expect(global.fetch.mock.calls[0][0]).toContain('gsrprop=snippet');
        expect(global.fetch.mock.calls[0][0]).toContain('redirects=1');
    });

    test('requests only the latest change per page', async () => {
        global.fetch.mockResolvedValue(jsonResponse({query: {recentchanges: []}}));

        await fetchWikiRecentChanges();

        expect(global.fetch.mock.calls[0][0]).toContain('rctoponly=1');
    });

    test('sends ETag and accepts a not-modified article response', async () => {
        global.fetch.mockResolvedValue(jsonResponse(null, {ok: false, status: 304}));

        const result = await fetchWikiArticle('選咩課', {etag: '"revision-597"'});

        expect(result).toEqual({notModified: true});
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/page/%E9%81%B8%E5%92%A9%E8%AA%B2/with_html'),
            expect.objectContaining({headers: {'If-None-Match': '"revision-597"'}}),
        );
    });
});
