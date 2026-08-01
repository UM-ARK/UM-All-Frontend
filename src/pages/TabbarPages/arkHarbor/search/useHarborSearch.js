import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {Keyboard} from 'react-native';

import {logToFirebase} from '../../../../utils/firebaseAnalytics';
import {
    fetchHarborCategories,
    fetchHarborSearch,
    fetchHarborTags,
} from '../../../../utils/harbor/harborApi';
import {
    addHarborSearchHistory,
    buildHarborSearchQuery,
    clearHarborSearchHistory,
    getHarborSearchAfterDate,
    getHarborSearchHistory,
    removeHarborSearchHistory,
} from '../../../../utils/harbor/harborSearch';

const useHarborSearch = ({initialQuery, onSearchStart}) => {
    const controllerRef = useRef(null);
    const requestGenerationRef = useRef(0);
    const activeSearchRef = useRef(null);
    const loadingMoreRef = useRef(false);
    const [query, setQuery] = useState(
        typeof initialQuery === 'string' ? initialQuery : '',
    );
    const [history, setHistory] = useState([]);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
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
            fetchHarborCategories({signal: controller.signal}),
            fetchHarborTags({signal: controller.signal}),
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
        requestGenerationRef.current += 1;
        controllerRef.current?.abort();
        controllerRef.current = null;
        loadingMoreRef.current = false;
        setHasSearched(false);
        setItems([]);
        setIsLoading(false);
        setIsLoadingMore(false);
        setHasMore(false);
        setNextPage(null);
        setError(null);
        setLoadMoreError(null);
    }, []);

    const handleQueryChange = useCallback(
        nextQuery => {
            setQuery(nextQuery);
            invalidateSearchResults();
        },
        [invalidateSearchResults],
    );

    const runSearch = useCallback(
        async ({
            queryOverride,
            authorOverride,
            orderOverride,
            page = 0,
            append = false,
        } = {}) => {
            const normalizedQuery = (
                queryOverride === undefined ? query : queryOverride
            ).trim();
            const normalizedAuthor =
                authorOverride === undefined ? author : authorOverride;
            const normalizedOrder =
                orderOverride === undefined ? order : orderOverride;
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
            const userQuery = append
                ? activeSearchRef.current?.userQuery
                : normalizedQuery;
            if (!searchQuery || (append && !activeSearchRef.current)) {
                return;
            }

            Keyboard.dismiss();
            onSearchStart();

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
                setIsLoading(true);
                setIsLoadingMore(false);
                setError(null);
                setLoadMoreError(null);
                setItems([]);
                setHasMore(false);
                setNextPage(null);
                activeSearchRef.current = {
                    searchQuery,
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
                if (historyQuery) {
                    addHarborSearchHistory(historyQuery).then(setHistory);
                }
                logToFirebase('harbor_search', {
                    hasCategory: Boolean(category),
                    hasTag: Boolean(tag),
                    hasAuthor: Boolean(normalizedAuthor),
                    timeRange,
                    order: normalizedOrder,
                    resultTab,
                });
            }

            const requestGeneration = ++requestGenerationRef.current;
            const controller = new AbortController();
            controllerRef.current = controller;

            try {
                const result = await fetchHarborSearch({
                    query: searchQuery,
                    userQuery,
                    page,
                    signal: controller.signal,
                });
                if (
                    controller.signal.aborted ||
                    requestGeneration !== requestGenerationRef.current
                ) {
                    return;
                }
                setItems(currentItems => {
                    if (!append) {
                        return result.items;
                    }
                    const seenIds = new Set(
                        currentItems.map(item => item.id),
                    );
                    return [
                        ...currentItems,
                        ...result.items.filter(item => !seenIds.has(item.id)),
                    ];
                });
                setHasMore(result.hasMore);
                setNextPage(result.nextPage);
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

    const selectOrder = useCallback(
        nextOrder => {
            if (nextOrder === order) {
                return;
            }
            if (hasSearched && activeSearchRef.current) {
                runSearch({orderOverride: nextOrder});
                return;
            }
            setOrder(nextOrder);
        },
        [hasSearched, order, runSearch],
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
        invalidateSearchResults();
        setCategory(null);
        setTag(null);
        setAuthor('');
        setTimeRange('all');
        setOrder('relevance');
    }, [invalidateSearchResults]);

    const clearHistory = useCallback(async () => {
        setHistory(await clearHarborSearchHistory());
    }, []);

    const removeHistory = useCallback(async queryToRemove => {
        setHistory(await removeHarborSearchHistory(queryToRemove));
    }, []);

    const cancelSearch = useCallback(() => {
        requestGenerationRef.current += 1;
        controllerRef.current?.abort();
    }, []);

    // 排序已獨立為第二層，不計入篩選徽章
    const activeFilterCount =
        Number(Boolean(category)) +
        Number(Boolean(tag)) +
        Number(Boolean(author.trim())) +
        Number(timeRange !== 'all');

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
            runSearch,
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
