import * as OpenCC from 'opencc-js';

const traditionalToSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });
const simplifiedToTraditional = OpenCC.Converter({ from: 'cn', to: 'tw' });

const getSearchVariants = (value) => {
    const normalized = value.toLowerCase();
    return [
        normalized,
        traditionalToSimplified(normalized),
        simplifiedToTraditional(normalized),
    ];
};

const escapeRegExp = value =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MATCH_LOCALE_ORDER = ['en_US', 'zh_TW', 'pt_PT', 'zh_CN'];

/** 標題是否命中關鍵字；簡繁與大小寫互通，語言不限 */
export function titleMatchesSearchQuery(title, searchQuery) {
    const query = String(searchQuery || '').trim();
    if (!query || typeof title !== 'string' || title.length === 0) {
        return false;
    }

    const queryVariants = getSearchVariants(query);
    const titleVariants = getSearchVariants(title);
    return queryVariants.some(queryVariant => (
        titleVariants.some(titleVariant => titleVariant.includes(queryVariant))
    ));
}

/**
 * 依 details 內全部語言標題篩選澳大活動或新聞。
 * 中文、英文都會比對；資料有葡文標題時一併比對。
 */
export function filterUMOpenDataItemsBySearchQuery(items, searchQuery) {
    const query = String(searchQuery || '').trim();
    if (!query) {
        return items || [];
    }

    return (items || []).filter(item => (
        (item?.details || []).some(detail => (
            titleMatchesSearchQuery(detail?.title, query)
        ))
    ));
}

/** 把標題切成高亮與一般片段，保留原文大小寫 */
export function buildTitleHighlightParts(text, searchQuery) {
    const source = String(text || '');
    const query = String(searchQuery || '').trim();
    if (!source || !query) {
        return [{ text: source, highlight: false }];
    }

    const candidates = Array.from(new Set(
        getSearchVariants(query).filter(variant => variant.length > 0),
    )).sort((a, b) => b.length - a.length);
    if (candidates.length === 0) {
        return [{ text: source, highlight: false }];
    }

    const pattern = new RegExp(
        `(${candidates.map(escapeRegExp).join('|')})`,
        'gi',
    );
    const parts = [];
    let lastIndex = 0;
    let match = pattern.exec(source);

    while (match) {
        if (match.index > lastIndex) {
            parts.push({
                text: source.slice(lastIndex, match.index),
                highlight: false,
            });
        }
        parts.push({ text: match[0], highlight: true });
        lastIndex = match.index + match[0].length;
        if (match[0].length === 0) {
            pattern.lastIndex += 1;
        }
        match = pattern.exec(source);
    }

    if (lastIndex < source.length) {
        parts.push({ text: source.slice(lastIndex), highlight: false });
    }

    if (!parts.some(part => part.highlight) && titleMatchesSearchQuery(source, query)) {
        return [{ text: source, highlight: true }];
    }

    return parts.length > 0 ? parts : [{ text: source, highlight: false }];
}

/**
 * 目前介面語言的標題優先。
 * 它本身未命中時，另回傳第一個命中的其他語言標題（英、繁中、葡）。
 */
export function pickDisplayedTitles(details, language, searchQuery) {
    const titleLocale = language === 'tc' ? 'zh_TW' : 'en_US';
    const list = Array.isArray(details) ? details : [];
    const primary = list.find(item => item?.locale === titleLocale)?.title;
    const title = typeof primary === 'string' ? primary : '';
    const query = String(searchQuery || '').trim();
    if (!query || titleMatchesSearchQuery(title, query)) {
        return { title, alternateTitle: '' };
    }

    const matching = list
        .filter(item => (
            typeof item?.title === 'string'
            && item.title.length > 0
            && item.title !== title
            && titleMatchesSearchQuery(item.title, query)
        ))
        .sort((a, b) => {
            const aIndex = MATCH_LOCALE_ORDER.indexOf(a.locale);
            const bIndex = MATCH_LOCALE_ORDER.indexOf(b.locale);
            return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
        });
    const alternateTitle = matching[0]?.title || '';
    if (!title) {
        return { title: alternateTitle, alternateTitle: '' };
    }
    return { title, alternateTitle };
}
