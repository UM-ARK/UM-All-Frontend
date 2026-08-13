import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {Keyboard} from 'react-native';

import lodash from 'lodash';

import {logToFirebase} from '../../../../utils/firebaseAnalytics';
import {
    fetchHarborCategories,
    fetchHarborSearch,
    fetchHarborTags,
    readCachedHarborCategories,
    readCachedHarborTags,
} from '../../../../utils/harbor/harborApi';
import {
    fetchHarborQueryCache,
    readHarborQueryCache,
    setHarborQueryNamespaceLimit,
} from '../../../../utils/harbor/harborQueryCache';
import {
    addHarborSearchHistory,
    buildHarborSearchQuery,
    canRunHarborKeywordSearch,
    clearHarborSearchHistory,
    countHarborSearchContentItems,
    getAlternateHarborSearchQueries,
    getHarborSearchAfterDate,
    getHarborSearchHistory,
    HARBOR_SEARCH_FALLBACK_THRESHOLD,
    mergeHarborSearchItems,
    removeHarborSearchHistory,
} from '../../../../utils/harbor/harborSearch';

/** 輸入停下後才打 API；期間先用本地結果即時篩選 */
const LIVE_SEARCH_DEBOUNCE_MS = 700;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const SEARCH_CACHE_STALE_MS = 10 * 60 * 1000;

setHarborQueryNamespaceLimit('search', 30);

const fetchSearchWithFallback = async ({
    searchQuery,
    alternateSearchQueries,
    userQuery,
    page,
}) => {
    const cacheKey = [
        'search',
        searchQuery,
        alternateSearchQueries,
        userQuery,
        page,
    ];
    const cachedResult = readHarborQueryCache(cacheKey, {
        namespace: 'search',
        maxAgeMs: SEARCH_CACHE_STALE_MS,
    });
    const request = fetchHarborQueryCache(
        cacheKey,
        async ({signal}) => {
            const originalResult = await fetchHarborSearch({
                query: searchQuery,
                userQuery,
                page,
                signal,
            });
            let result = originalResult;

            if (
                alternateSearchQueries.length > 0 &&
                countHarborSearchContentItems(originalResult.items) <
                    HARBOR_SEARCH_FALLBACK_THRESHOLD
            ) {
                let mergedItems = originalResult.items;
                let hasMore = originalResult.hasMore;

                for (const alternateSearchQuery of alternateSearchQueries) {
                    if (
                        countHarborSearchContentItems(mergedItems) >=
                            HARBOR_SEARCH_FALLBACK_THRESHOLD
                    ) {
                        break;
                    }
                    let alternateResult;

                    try {
                        alternateResult = await fetchHarborSearch({
                            query: alternateSearchQuery,
                            userQuery: '',
                            page,
                            signal,
                        });
                    } catch (error) {
                        if (signal.aborted || error?.code === 'ERR_CANCELED') {
                            throw error;
                        }
                        continue;
                    }

                    mergedItems = mergeHarborSearchItems(
                        mergedItems,
                        alternateResult.items,
                    );
                    hasMore = hasMore || alternateResult.hasMore;
                }

                result = {
                    ...originalResult,
                    items: mergedItems,
                    hasMore,
                    nextPage: hasMore ? page + 1 : null,
                };
            }
            return result;
        },
        {
            namespace: 'search',
            freshMs: SEARCH_CACHE_TTL_MS,
            staleMs: SEARCH_CACHE_STALE_MS,
        },
    );
    return {cachedResult, request};
};

const useHarborSearch = ({initialQuery, onSearchStart}) => {
    const initialQueryText =
        typeof initialQuery === 'string' ? initialQuery : '';
    const controllerRef = useRef(null);
    const requestGenerationRef = useRef(0);
    const activeSearchRef = useRef(null);
    const loadingMoreRef = useRef(false);
    const runSearchRef = useRef(null);
    const debouncedLiveSearchRef = useRef(null);
    const queryRef = useRef(initialQueryText);
    const [query, setQuery] = useState(initialQueryText);
    const [committedQuery, setCommittedQuery] = useState(
        initialQueryText.trim(),
    );
    const [history, setHistory] = useState([]);
    const [items, setItems] = useState([]);
    const cachedCategories = readCachedHarborCategories();
    const cachedTags = readCachedHarborTags();
    const [categories, setCategories] = useState(
        () => cachedCategories?.items || [],
    );
    const [tags, setTags] = useState(() => cachedTags?.items || []);
    const [category, setCategory] = useState(null);
    const [tag, setTag] = useState(null);
    const [author, setAuthor] = useState('');
    const [timeRange, setTimeRange] = useState('all');
    const [order, setOrder] = useState('relevance');
    const [resultTab, setResultTab] = useState('topics');
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextPage, setNextPage] = useState(null);
    const [error, setError] = useState(null);
    const [loadMoreError, setLoadMoreError] = useState(null);
    const [filterOptionsError, setFilterOptionsError] = useState(false);
    queryRef.current = query;

    useEffect(() => {
        let active = true;
        getHarborSearchHistory().then(savedHistory => {
            if (active) {
                setHistory(savedHistory);
            }
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        Promise.allSettled([
            fetchHarborCategories(),
            fetchHarborTags(),
        ]).then(([categoryResult, tagResult]) => {
            if (controller.signal.aborted) {
                return;
            }
            if (categoryResult.status === 'fulfilled') {
                setCategories(categoryResult.value.items);
            }
            if (tagResult.status === 'fulfilled') {
                setTags(tagResult.value.items);
            }
            setFilterOptionsError(
                categoryResult.status === 'rejected' ||
                    tagResult.status === 'rejected',
            );
        });
        return () => controller.abort();
    }, []);

    const invalidateSearchResults = useCallback(() => {
        debouncedLiveSearchRef.current?.cancel();
        requestGenerationRef.current += 1;
        controllerRef.current?.abort();
        controllerRef.current = null;
        loadingMoreRef.current = false;
        setHasSearched(false);
        setCommittedQuery('');
        setItems([]);
        setIsLoading(false);
        setIsLoadingMore(false);
        setHasMore(false);
        setNextPage(null);
        setError(null);
        setLoadMoreError(null);
    }, []);

    const runSearch = useCallback(
        async ({
            queryOverride,
            authorOverride,
            orderOverride,
            page = 0,
            append = false,
            // 防抖即時搜尋：不收鍵盤、不清空現有結果、不寫入歷史
            silent = false,
            skipHistory = false,
        } = {}) => {
            const normalizedQuery = (
                queryOverride === undefined ? query : queryOverride
            ).trim();
            const normalizedAuthor =
                authorOverride === undefined ? author : authorOverride;
            const normalizedOrder =
                orderOverride === undefined ? order : orderOverride;
            if (
                normalizedQuery &&
                !canRunHarborKeywordSearch(normalizedQuery)
            ) {
                return;
            }
            // 允許空關鍵字：僅作者／分類等篩選時仍組出有效 Discourse 查詢（如 @username）
            const searchQuery = append
                ? activeSearchRef.current?.searchQuery
                : buildHarborSearchQuery({
                    query: normalizedQuery,
                    category,
                    tag,
                    author: normalizedAuthor,
                    after: getHarborSearchAfterDate(timeRange),
                    order: normalizedOrder,
                });
            const alternateUserQueries = append
                ? activeSearchRef.current?.alternateUserQueries
                : getAlternateHarborSearchQueries(normalizedQuery);
            const alternateSearchQueries = append
                ? activeSearchRef.current?.alternateSearchQueries
                : alternateUserQueries.map(alternateUserQuery =>
                      buildHarborSearchQuery({
                        query: alternateUserQuery,
                        category,
                        tag,
                        author: normalizedAuthor,
                        after: getHarborSearchAfterDate(timeRange),
                        order: normalizedOrder,
                      }),
                  );
            const userQuery = append
                ? activeSearchRef.current?.userQuery
                : normalizedQuery;
            if (!searchQuery || (append && !activeSearchRef.current)) {
                return;
            }

            if (!silent) {
                Keyboard.dismiss();
                onSearchStart();
            }

            if (append) {
                if (loadingMoreRef.current) {
                    return;
                }
                loadingMoreRef.current = true;
                setIsLoadingMore(true);
                setLoadMoreError(null);
            } else {
                controllerRef.current?.abort();
                loadingMoreRef.current = false;
                setHasSearched(true);
                // 手動搜尋立刻對齊；防抖搜尋等結果回來再更新，避免本地篩選閃爍
                if (!silent) {
                    setCommittedQuery(normalizedQuery);
                }
                setIsLoading(true);
                setIsLoadingMore(false);
                setError(null);
                setLoadMoreError(null);
                // 保留現有結果，待 cache 或網絡結果返回後一次替換
                setHasMore(false);
                setNextPage(null);
                activeSearchRef.current = {
                    searchQuery,
                    alternateSearchQueries,
                    alternateUserQueries,
                    userQuery,
                };
                setQuery(normalizedQuery);
                if (authorOverride !== undefined) {
                    setAuthor(normalizedAuthor);
                }
                if (orderOverride !== undefined) {
                    setOrder(normalizedOrder);
                }
                const historyQuery =
                    normalizedQuery ||
                    (normalizedAuthor
                        ? `@${String(normalizedAuthor)
                              .trim()
                              .replace(/^@+/, '')}`
                        : '');
                if (historyQuery && !skipHistory) {
                    addHarborSearchHistory(historyQuery).then(setHistory);
                }
                logToFirebase('harbor_search', {
                    hasCategory: Boolean(category),
                    hasTag: Boolean(tag),
                    hasAuthor: Boolean(normalizedAuthor),
                    timeRange,
                    order: normalizedOrder,
                    resultTab,
                    silent,
                });
            }

            const requestGeneration = ++requestGenerationRef.current;
            const controller = new AbortController();
            controllerRef.current = controller;

            try {
                const {cachedResult, request} =
                    await fetchSearchWithFallback({
                        searchQuery,
                        alternateSearchQueries,
                        userQuery,
                        page,
                    });
                const applyResult = result => {
                    if (
                        controller.signal.aborted ||
                        requestGeneration !== requestGenerationRef.current
                    ) {
                        return false;
                    }
                    // 防抖期間若又繼續輸入，丟棄過期回應，等待下一輪
                    if (
                        !append &&
                        userQuery.trim() !== queryRef.current.trim()
                    ) {
                        return false;
                    }
                    if (!append) {
                        setCommittedQuery(userQuery);
                    }
                    setItems(currentItems => {
                        if (!append) {
                            return result.items;
                        }
                        return mergeHarborSearchItems(
                            currentItems,
                            result.items,
                        );
                    });
                    setHasMore(result.hasMore);
                    setNextPage(result.nextPage);
                    return true;
                };
                if (cachedResult && !applyResult(cachedResult)) {
                    return;
                }
                const result = await request;
                applyResult(result);
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    if (append) {
                        setLoadMoreError(requestError);
                    } else {
                        setError(requestError);
                    }
                }
            } finally {
                if (requestGeneration === requestGenerationRef.current) {
                    controllerRef.current = null;
                    setIsLoading(false);
                    setIsLoadingMore(false);
                    loadingMoreRef.current = false;
                }
            }
        },
        [
            author,
            category,
            onSearchStart,
            order,
            query,
            resultTab,
            tag,
            timeRange,
        ],
    );
    runSearchRef.current = runSearch;

    const debouncedLiveSearch = useMemo(
        () =>
            lodash.debounce(nextQuery => {
                runSearchRef.current?.({
                    queryOverride: nextQuery,
                    silent: true,
                    skipHistory: true,
                });
            }, LIVE_SEARCH_DEBOUNCE_MS),
        [],
    );
    debouncedLiveSearchRef.current = debouncedLiveSearch;

    useEffect(
        () => () => {
            debouncedLiveSearch.cancel();
        },
        [debouncedLiveSearch],
    );

    // 輸入時立即更新 query（供本地篩選）；停下後防抖打 API
    const handleQueryChange = useCallback(
        nextQuery => {
            setQuery(nextQuery);
            debouncedLiveSearch.cancel();
            if (!canRunHarborKeywordSearch(nextQuery)) {
                invalidateSearchResults();
                return;
            }
            debouncedLiveSearch(nextQuery);
        },
        [debouncedLiveSearch, invalidateSearchResults],
    );

    const selectOrder = useCallback(
        nextOrder => {
            if (nextOrder === order) {
                return;
            }
            debouncedLiveSearch.cancel();
            if (hasSearched && activeSearchRef.current) {
                runSearch({orderOverride: nextOrder});
                return;
            }
            setOrder(nextOrder);
        },
        [debouncedLiveSearch, hasSearched, order, runSearch],
    );

    const selectResultTab = useCallback(nextTab => {
        setResultTab(nextTab);
    }, []);

    const handleLoadMore = useCallback(() => {
        if (
            !hasMore ||
            nextPage == null ||
            isLoading ||
            isLoadingMore ||
            error
        ) {
            return;
        }
        runSearch({
            page: nextPage,
            append: true,
        });
    }, [
        error,
        hasMore,
        isLoading,
        isLoadingMore,
        nextPage,
        runSearch,
    ]);

    const resetFilters = useCallback(() => {
        debouncedLiveSearch.cancel();
        invalidateSearchResults();
        setCategory(null);
        setTag(null);
        setAuthor('');
        setTimeRange('all');
        setOrder('relevance');
    }, [debouncedLiveSearch, invalidateSearchResults]);

    const clearHistory = useCallback(async () => {
        setHistory(await clearHarborSearchHistory());
    }, []);

    const removeHistory = useCallback(async queryToRemove => {
        setHistory(await removeHarborSearchHistory(queryToRemove));
    }, []);

    const cancelSearch = useCallback(() => {
        debouncedLiveSearch.cancel();
        requestGenerationRef.current += 1;
        controllerRef.current?.abort();
    }, [debouncedLiveSearch]);

    const runSearchAction = useCallback(
        (options = {}) => {
            debouncedLiveSearch.cancel();
            return runSearch(options);
        },
        [debouncedLiveSearch, runSearch],
    );

    // 排序已獨立為第二層，不計入篩選徽章
    const activeFilterCount =
        Number(Boolean(category)) +
        Number(Boolean(tag)) +
        Number(Boolean(author.trim())) +
        Number(timeRange !== 'all');
    const isQueryDirty = query.trim() !== committedQuery.trim();
    const canSearch =
        canRunHarborKeywordSearch(query) ||
        (!query.trim() && Boolean(author.trim()));

    return {
        criteria: {
            query,
            category,
            tag,
            author,
            timeRange,
            order,
            resultTab,
            activeFilterCount,
            canSearch,
        },
        options: {
            categories,
            tags,
            filterOptionsError,
        },
        results: {
            items,
            hasSearched,
            isLoading,
            isLoadingMore,
            hasMore,
            nextPage,
            error,
            loadMoreError,
            isQueryDirty,
        },
        history: {
            items: history,
        },
        actions: {
            setQuery,
            handleQueryChange,
            setCategory,
            setTag,
            setAuthor,
            setTimeRange,
            setOrder,
            selectOrder,
            selectResultTab,
            runSearch: runSearchAction,
            invalidateSearchResults,
            resetFilters,
            handleLoadMore,
            clearHistory,
            removeHistory,
            cancelSearch,
        },
    };
};

export default useHarborSearch;
