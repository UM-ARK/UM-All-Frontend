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

    test('uses prefixsearch for lightweight suggestions', async () => {
        global.fetch.mockResolvedValue(jsonResponse({
            query: {prefixsearch: [{title: 'ECEN1003 Information Technology Revolution and Electronics'}]},
        }));

        const results = await fetchWikiPrefixSearch('ECEN1003');

        expect(results[0].title).toContain('ECEN1003');
        expect(global.fetch.mock.calls[0][0]).toContain('list=prefixsearch');
        expect(global.fetch.mock.calls[0][0]).toContain('psnamespace=0');
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
