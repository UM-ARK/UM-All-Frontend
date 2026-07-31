import {getLocalStorage, setLocalStorage} from './storageKits';

export const SEARCH_HISTORY_STORAGE_KEY = 'ARK_Home_Search_History';
export const SEARCH_HISTORY_LIMIT = 10;

const normalizeQueryKey = query => query.trim().toLowerCase();

const normalizeTimestamp = searchedAt =>
    Number.isFinite(searchedAt) && searchedAt >= 0 ? searchedAt : 0;

const normalizeRecord = record => {
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

    const normalizedRecord = {
        query,
        searchedAt: normalizeTimestamp(record.searchedAt),
    };
    const selectedKey =
        typeof record.selectedKey === 'string' ? record.selectedKey.trim() : '';

    if (selectedKey) {
        normalizedRecord.selectedKey = selectedKey;
    }

    return normalizedRecord;
};

export const sanitizeSearchHistory = history => {
    if (!Array.isArray(history)) {
        return [];
    }

    const normalizedHistory = history
        .map((record, index) => {
            const normalizedRecord = normalizeRecord(record);
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
        .slice(0, SEARCH_HISTORY_LIMIT)
        .map(({record}) => record);
};

export const getSearchHistory = async () => {
    const history = await getLocalStorage(SEARCH_HISTORY_STORAGE_KEY);
    return sanitizeSearchHistory(history);
};

export const addSearchHistory = async (query, selectedKey) => {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    if (!normalizedQuery) {
        return getSearchHistory();
    }

    const history = await getSearchHistory();
    const record = {
        query: normalizedQuery,
        searchedAt: Date.now(),
    };
    const normalizedSelectedKey =
        typeof selectedKey === 'string' ? selectedKey.trim() : '';

    if (normalizedSelectedKey) {
        record.selectedKey = normalizedSelectedKey;
    }

    const queryKey = normalizeQueryKey(normalizedQuery);
    const nextHistory = [
        record,
        ...history.filter(
            historyRecord =>
                normalizeQueryKey(historyRecord.query) !== queryKey,
        ),
    ].slice(0, SEARCH_HISTORY_LIMIT);

    await setLocalStorage(SEARCH_HISTORY_STORAGE_KEY, nextHistory);
    return nextHistory;
};

export const removeSearchHistory = async query => {
    const normalizedQuery = typeof query === 'string' ? query.trim() : '';
    const history = await getSearchHistory();

    if (!normalizedQuery) {
        return history;
    }

    const queryKey = normalizeQueryKey(normalizedQuery);
    const nextHistory = history.filter(
        record => normalizeQueryKey(record.query) !== queryKey,
    );

    await setLocalStorage(SEARCH_HISTORY_STORAGE_KEY, nextHistory);
    return nextHistory;
};

export const clearSearchHistory = async () => {
    await setLocalStorage(SEARCH_HISTORY_STORAGE_KEY, []);
    return [];
};
