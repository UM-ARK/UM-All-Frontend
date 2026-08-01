import * as OpenCC from 'opencc-js';

import {getLocalStorage, setLocalStorage} from '../storageKits';

export const HARBOR_SEARCH_HISTORY_STORAGE_KEY =
    'ARK_Harbor_Search_History';
export const HARBOR_SEARCH_HISTORY_LIMIT = 10;
export const HARBOR_SEARCH_FALLBACK_THRESHOLD = 10;

const traditionalToSimplified = OpenCC.Converter({from: 'tw', to: 'cn'});
const simplifiedToTraditional = OpenCC.Converter({from: 'cn', to: 'tw'});
const HAN_CHARACTER_PATTERN = /[\u3400-\u9FFF\uF900-\uFAFF]/;

const SEARCH_RANGE_DAYS = {
    week: 7,
    month: 30,
    year: 365,
};

const normalizeQueryKey = query => query.trim().toLowerCase();

export const canRunHarborKeywordSearch = query =>
    Array.from(typeof query === 'string' ? query.trim() : '').length >= 2;

export const getAlternateHarborSearchQueries = query => {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    if (!normalizedQuery || !HAN_CHARACTER_PATTERN.test(normalizedQuery)) {
        return [];
    }

    return [
        traditionalToSimplified(normalizedQuery),
        simplifiedToTraditional(normalizedQuery),
    ].filter(
        (convertedQuery, index, queries) =>
            convertedQuery !== normalizedQuery &&
            queries.indexOf(convertedQuery) === index,
    );
};

const getHarborSearchItemKey = item => {
    if (item?.postId != null) {
        return `post:${item.postId}`;
    }
    if (item?.topicId != null) {
        return `topic:${item.topicId}`;
    }
    if (item?.kind === 'user') {
        return item.user?.id != null
            ? `user:${item.user.id}`
            : `username:${String(item.user?.username || '').toLowerCase()}`;
    }
    return `item:${item?.id}`;
};

export const mergeHarborSearchItems = (originalItems, convertedItems) => {
    const mergedItems = [];
    const seenKeys = new Set();

    [...(originalItems || []), ...(convertedItems || [])].forEach(item => {
        const itemKey = getHarborSearchItemKey(item);
        if (seenKeys.has(itemKey)) {
            return;
        }
        seenKeys.add(itemKey);
        mergedItems.push(item);
    });

    return mergedItems;
};

export const countHarborSearchContentItems = items =>
    (Array.isArray(items) ? items : []).filter(item => item?.kind !== 'user')
        .length;

const normalizeTimestamp = searchedAt =>
    Number.isFinite(searchedAt) && searchedAt >= 0 ? searchedAt : 0;

const normalizeHistoryRecord = record => {
    if (typeof record === 'string') {
        const query = record.trim();
        return query ? {query, searchedAt: 0} : null;
    }

    if (!record || typeof record !== 'object') {
        return null;
    }

    const query = typeof record.query === 'string' ? record.query.trim() : '';
    if (!query) {
        return null;
    }

    return {
        query,
        searchedAt: normalizeTimestamp(record.searchedAt),
    };
};

export const sanitizeHarborSearchHistory = history => {
    if (!Array.isArray(history)) {
        return [];
    }

    const normalizedHistory = history
        .map((record, index) => {
            const normalizedRecord = normalizeHistoryRecord(record);
            return normalizedRecord
                ? {
                      record: normalizedRecord,
                      index,
                  }
                : null;
        })
        .filter(Boolean)
        .sort(
            (first, second) =>
                second.record.searchedAt - first.record.searchedAt ||
                first.index - second.index,
        );
    const seenQueries = new Set();

    return normalizedHistory
        .filter(({record}) => {
            const queryKey = normalizeQueryKey(record.query);
            if (seenQueries.has(queryKey)) {
                return false;
            }

            seenQueries.add(queryKey);
            return true;
        })
        .slice(0, HARBOR_SEARCH_HISTORY_LIMIT)
        .map(({record}) => record);
};

export const getHarborSearchHistory = async () => {
    const history = await getLocalStorage(HARBOR_SEARCH_HISTORY_STORAGE_KEY);
    return sanitizeHarborSearchHistory(history);
};

export const addHarborSearchHistory = async query => {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    if (!normalizedQuery) {
        return getHarborSearchHistory();
    }

    const history = await getHarborSearchHistory();
    const queryKey = normalizeQueryKey(normalizedQuery);
    const nextHistory = [
        {
            query: normalizedQuery,
            searchedAt: Date.now(),
        },
        ...history.filter(
            record => normalizeQueryKey(record.query) !== queryKey,
        ),
    ].slice(0, HARBOR_SEARCH_HISTORY_LIMIT);

    await setLocalStorage(HARBOR_SEARCH_HISTORY_STORAGE_KEY, nextHistory);
    return nextHistory;
};

export const removeHarborSearchHistory = async query => {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    const history = await getHarborSearchHistory();
    if (!normalizedQuery) {
        return history;
    }

    const queryKey = normalizeQueryKey(normalizedQuery);
    const nextHistory = history.filter(
        record => normalizeQueryKey(record.query) !== queryKey,
    );
    await setLocalStorage(HARBOR_SEARCH_HISTORY_STORAGE_KEY, nextHistory);
    return nextHistory;
};

export const clearHarborSearchHistory = async () => {
    await setLocalStorage(HARBOR_SEARCH_HISTORY_STORAGE_KEY, []);
    return [];
};

const quoteSearchValue = value => {
    const normalizedValue = String(value || '').trim();
    if (!normalizedValue) {
        return '';
    }
    return /\s/.test(normalizedValue)
        ? `"${normalizedValue.replace(/"/g, '\\"')}"`
        : normalizedValue;
};

export const getHarborSearchAfterDate = (range, now = Date.now()) => {
    const days = SEARCH_RANGE_DAYS[range];
    if (!days) {
        return '';
    }

    return new Date(now - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
};

export const buildHarborSearchQuery = ({
    query,
    category,
    tag,
    author,
    after,
    order,
}) => {
    const terms = [typeof query === 'string' ? query.trim() : ''];
    const categoryValue =
        category?.slug || category?.name || category?.id || '';
    const tagValue = tag?.name || tag?.slug || tag || '';
    const authorValue =
        typeof author === 'string' ? author.trim().replace(/^@+/, '') : '';

    if (categoryValue) {
        terms.push(`category:${quoteSearchValue(categoryValue)}`);
    }
    if (tagValue) {
        terms.push(`tags:${quoteSearchValue(tagValue)}`);
    }
    if (authorValue) {
        terms.push(`@${authorValue}`);
    }
    if (after) {
        terms.push(`after:${after}`);
    }
    if (order && order !== 'relevance') {
        terms.push(`order:${order}`);
    }

    return terms.filter(Boolean).join(' ');
};

/** 對已載入的搜尋結果做即時關鍵字篩選（輸入防抖完成前的本地預覽） */
export const filterHarborSearchItems = (items, query) => {
    if (!Array.isArray(items)) {
        return [];
    }
    const normalizedQuery =
        typeof query === 'string' ? query.trim().toLowerCase() : '';
    if (!normalizedQuery) {
        return items;
    }

    return items.filter(item => {
        if (!item || typeof item !== 'object') {
            return false;
        }
        if (item.kind === 'user') {
            const user = item.user || {};
            return [user.username, user.name].some(value =>
                String(value || '')
                    .toLowerCase()
                    .includes(normalizedQuery),
            );
        }

        const topic = item.topic || {};
        const author = item.author || topic.author || {};
        const haystack = [
            item.title,
            item.excerpt,
            topic.title,
            topic.excerpt,
            typeof author === 'string' ? author : author.username,
            typeof author === 'string' ? '' : author.name,
        ]
            .map(value => String(value || '').toLowerCase())
            .join(' ');
        return haystack.includes(normalizedQuery);
    });
};
