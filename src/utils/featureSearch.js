import * as OpenCC from 'opencc-js';

export const toTraditionalSearchText = OpenCC.Converter({ from: 'cn', to: 'tw' });

export const normalizeSearchText = value =>
    toTraditionalSearchText(
        String(value || '')
            .trim()
            .toLowerCase(),
    );

export const getFeatureSearchText = (item, category) =>
    normalizeSearchText(
        [
            item.fn_name,
            item.describe,
            item.keywords,
            item.key_name,
            category,
        ]
            .filter(Boolean)
            .join(' '),
    );

export const getUmWebSearchUrl = query => {
    const encodedQuery = encodeURIComponent(
        `site:umall.one OR site:um.edu.mo ${query}`,
    );
    return `https://www.google.com/search?q=${encodedQuery}`;
};
