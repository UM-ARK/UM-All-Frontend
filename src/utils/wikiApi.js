import { ARK_WIKI_API, ARK_WIKI_REST } from './pathMap';
import { getLocalStorage, setLocalStorage } from './storageKits';
import {
    dedupeWikiResults,
    normalizeWikiTitle,
    stripWikiSnippet,
} from '../pages/TabbarPages/arkwiki/wikiModels';

const ARTICLE_CACHE_KEY = 'ARK_WIKI_ARTICLE_CACHE_V1';
const ARTICLE_CACHE_LIMIT = 12;

const requestJson = async (url, {signal, headers} = {}) => {
    const response = await fetch(url, {signal, headers});
    if (!response.ok) {
        const error = new Error(`ARK Wiki request failed (${response.status})`);
        error.status = response.status;
        throw error;
    }
    return response.json();
};

const buildActionUrl = params => {
    const query = new URLSearchParams({
        format: 'json',
        formatversion: '2',
        origin: '*',
        ...params,
    });
    return `${ARK_WIKI_API}?${query.toString()}`;
};

const normalizeSearchResult = item => ({
    title: normalizeWikiTitle(item?.title),
    snippet: stripWikiSnippet(item?.snippet || item?.description),
    pageId: item?.pageid ?? null,
});

export const fetchWikiPrefixSearch = async (query, {signal, limit = 8} = {}) => {
    const value = typeof query === 'string' ? query.trim() : '';
    if (!value) {
        return [];
    }
    const data = await requestJson(
        buildActionUrl({
            action: 'query',
            list: 'prefixsearch',
            pssearch: value,
            pslimit: String(limit),
            psnamespace: '0',
        }),
        {signal},
    );
    return dedupeWikiResults(data?.query?.prefixsearch?.map(normalizeSearchResult));
};

export const fetchWikiFullSearch = async (query, {signal, limit = 20} = {}) => {
    const value = typeof query === 'string' ? query.trim() : '';
    if (!value) {
        return [];
    }
    const data = await requestJson(
        buildActionUrl({
            action: 'query',
            list: 'search',
            srsearch: value,
            srlimit: String(limit),
            srnamespace: '0',
            srprop: 'snippet',
        }),
        {signal},
    );
    return dedupeWikiResults(data?.query?.search?.map(normalizeSearchResult));
};

export const fetchWikiRecentChanges = async ({signal, limit = 10} = {}) => {
    const data = await requestJson(
        buildActionUrl({
            action: 'query',
            list: 'recentchanges',
            rctype: 'edit|new',
            rctoponly: '1',
            rcnamespace: '0',
            rcprop: 'title|timestamp',
            rcshow: '!bot',
            rclimit: String(limit),
        }),
        {signal},
    );
    return dedupeWikiResults(data?.query?.recentchanges?.map(item => ({
        title: normalizeWikiTitle(item?.title),
        timestamp: item?.timestamp || null,
    })));
};

export const fetchRandomWikiTitle = async ({signal} = {}) => {
    const data = await requestJson(
        buildActionUrl({
            action: 'query',
            list: 'random',
            rnlimit: '1',
            rnnamespace: '0',
        }),
        {signal},
    );
    return normalizeWikiTitle(data?.query?.random?.[0]?.title);
};

const fetchWikiArticleFallback = async (title, {signal} = {}) => {
    const data = await requestJson(
        buildActionUrl({
            action: 'parse',
            page: title,
            prop: 'text|tocdata',
        }),
        {signal},
    );
    if (!data?.parse?.text) {
        throw new Error('ARK Wiki article content is unavailable');
    }
    return {
        title: normalizeWikiTitle(data.parse.title || title),
        revisionId: null,
        timestamp: null,
        license: null,
        html: data.parse.text,
        etag: null,
        source: 'action',
    };
};

export const fetchWikiArticle = async (title, {signal, etag} = {}) => {
    const normalizedTitle = normalizeWikiTitle(title);
    if (!normalizedTitle) {
        throw new Error('Invalid ARK Wiki title');
    }
    const headers = etag ? {'If-None-Match': etag} : undefined;
    try {
        const response = await fetch(
            `${ARK_WIKI_REST}/page/${encodeURIComponent(normalizedTitle.replace(/ /g, '_'))}/with_html`,
            {signal, headers},
        );
        if (response.status === 304) {
            return {notModified: true};
        }
        if (!response.ok) {
            throw new Error(`ARK Wiki article request failed (${response.status})`);
        }
        const data = await response.json();
        if (!data?.html) {
            throw new Error('ARK Wiki article content is unavailable');
        }
        return {
            title: normalizeWikiTitle(data.title || data.key || normalizedTitle),
            revisionId: data.latest?.id ?? null,
            timestamp: data.latest?.timestamp || null,
            license: data.license || null,
            html: data.html,
            etag: response.headers.get('etag'),
            source: 'rest',
        };
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw error;
        }
        return fetchWikiArticleFallback(normalizedTitle, {signal});
    }
};

export const getCachedWikiArticle = async title => {
    const cache = await getLocalStorage(ARTICLE_CACHE_KEY);
    if (!cache || typeof cache !== 'object') {
        return null;
    }
    return cache[normalizeWikiTitle(title)] || null;
};

export const cacheWikiArticle = async article => {
    if (!article?.title || !article?.html) {
        return;
    }
    const existing = await getLocalStorage(ARTICLE_CACHE_KEY);
    const cache = existing && typeof existing === 'object' ? existing : {};
    const title = normalizeWikiTitle(article.title);
    cache[title] = {...article, cachedAt: Date.now()};
    const orderedEntries = Object.entries(cache)
        .sort(([, first], [, second]) => (second.cachedAt || 0) - (first.cachedAt || 0))
        .slice(0, ARTICLE_CACHE_LIMIT);
    await setLocalStorage(ARTICLE_CACHE_KEY, Object.fromEntries(orderedEntries));
};
