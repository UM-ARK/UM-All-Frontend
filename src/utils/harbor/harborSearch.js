import {getLocalStorage, setLocalStorage} from '../storageKits';

export const HARBOR_SEARCH_HISTORY_STORAGE_KEY =
    'ARK_Harbor_Search_History';
export const HARBOR_SEARCH_HISTORY_LIMIT = 10;

const SEARCH_RANGE_DAYS = {
    week: 7,
    month: 30,
    year: 365,
};

const normalizeQueryKey = query => query.trim().toLowerCase();

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
