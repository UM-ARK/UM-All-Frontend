import { ARK_WIKI, ARK_WIKI_PAGE } from '../../../utils/pathMap';

const WIKI_HOST = new URL(ARK_WIKI).host;

export const normalizeWikiTitle = value => {
    if (typeof value !== 'string') {
        return '';
    }
    let title = value.trim().replace(/_/g, ' ');
    try {
        title = decodeURIComponent(title);
    } catch (_error) {
        // 保留 MediaWiki 傳回的原始標題
    }
    return title.replace(/\s+/g, ' ');
};

export const buildWikiArticleUrl = (title, fragment = '') => {
    const normalizedTitle = normalizeWikiTitle(title);
    if (!normalizedTitle) {
        return ARK_WIKI;
    }
    const suffix = fragment ? `#${encodeURIComponent(fragment)}` : '';
    return `${ARK_WIKI_PAGE}${encodeURIComponent(normalizedTitle.replace(/ /g, '_'))}${suffix}`;
};

export const getWikiLinkAction = value => {
    if (typeof value !== 'string' || !value.trim()) {
        return {type: 'ignore'};
    }
    let url;
    try {
        url = new URL(value, `${ARK_WIKI_PAGE}Main_Page`);
    } catch (_error) {
        return {type: 'ignore'};
    }
    if (['mailto:', 'tel:'].includes(url.protocol)) {
        return {type: 'external', url: url.toString()};
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
        return {type: 'ignore'};
    }
    if (url.host !== WIKI_HOST || !url.pathname.startsWith('/wiki/')) {
        return {type: 'external', url: url.toString()};
    }
    const rawTitle = url.pathname.slice('/wiki/'.length);
    const title = normalizeWikiTitle(rawTitle);
    if (!title || title.startsWith('Special:')) {
        return {type: 'external', url: url.toString()};
    }
    return {
        type: 'article',
        title,
        fragment: normalizeWikiTitle(url.hash.slice(1)),
    };
};

export const stripWikiSnippet = value =>
    typeof value === 'string'
        ? value
            .replace(/<[^>]*>/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim()
        : '';

export const dedupeWikiResults = results => {
    const seen = new Set();
    return (Array.isArray(results) ? results : []).filter(item => {
        const title = normalizeWikiTitle(item?.title);
        const key = title.toLocaleLowerCase();
        if (!title || seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};

export const sanitizeWikiHtml = html => {
    if (typeof html !== 'string') {
        return '';
    }
    return html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
        .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"');
};

export const extractWikiImageUrls = html => {
    const urls = [];
    const seen = new Set();
    const sanitized = sanitizeWikiHtml(html);
    const expression = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = expression.exec(sanitized))) {
        try {
            const url = new URL(match[1], ARK_WIKI).toString();
            if (!seen.has(url)) {
                seen.add(url);
                urls.push(url);
            }
        } catch (_error) {
            // 忽略無法正規化的圖片地址
        }
    }
    return urls;
};
