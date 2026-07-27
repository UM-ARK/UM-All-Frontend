import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';

import { useIsFocused } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-toast-message';

import { useTheme } from '../../../../components/ThemeContext';
import { useHarborSession } from '../../../../contexts/HarborSessionContext';
import { fetchHarborTopicList } from '../../../../utils/harbor/harborApi';
import {
    getHarborRateLimitDelayMs,
    isHarborRateLimited,
} from '../../../../utils/harbor/harborRateLimit';
import { subscribeHarborTopicUpdates } from '../../../../utils/harbor/harborTopicUpdates';
import { trigger } from '../../../../utils/trigger';
import {
    HarborFullState,
    HarborInlineRetry,
    HarborTopicSkeleton,
} from './HarborListStates';
import HarborTopicCard from './HarborTopicCard';

const SKELETON_ITEMS = ['one', 'two', 'three', 'four'];
const TOPIC_LIST_CACHE_LIMIT = 20;
const topicListCache = new Map();
let sharedRateLimit = null;

const getCachedTopicList = cacheKey => {
    const cachedResult = topicListCache.get(cacheKey);
    if (!cachedResult) {
        return null;
    }

    topicListCache.delete(cacheKey);
    topicListCache.set(cacheKey, cachedResult);
    return cachedResult;
};

const cacheTopicList = (cacheKey, result) => {
    if (!cacheKey) {
        return;
    }

    topicListCache.delete(cacheKey);
    topicListCache.set(cacheKey, {
        items: result.items,
        hasMore: result.hasMore,
        nextPage: result.nextPage,
    });

    if (topicListCache.size > TOPIC_LIST_CACHE_LIMIT) {
        const oldestKey = topicListCache.keys().next().value;
        topicListCache.delete(oldestKey);
    }
};

const getSourceKey = source =>
    [
        source.view || 'latest',
        source.categoryId || '',
        source.categorySlug || '',
        typeof source.tag === 'string'
            ? source.tag
            : source.tag?.name || source.tag?.slug || '',
    ].join(':');

const fetchTopicListPage = async source => {
    if (source.view !== 'newContent') {
        return fetchHarborTopicList(source);
    }

    const [unreadResult, newResult] = await Promise.all([
        fetchHarborTopicList({ ...source, view: 'unread' }),
        fetchHarborTopicList({ ...source, view: 'new' }),
    ]);
    const unreadIds = new Set(unreadResult.items.map(item => item.id));
    const items = [
        ...unreadResult.items.map(item => ({
            ...item,
            newContentType: 'reply',
        })),
        ...newResult.items
            .filter(item => !unreadIds.has(item.id))
            .map(item => ({
                ...item,
                newContentType: 'topic',
            })),
    ];

    return {
        ...unreadResult,
        items,
        hasMore: unreadResult.hasMore || newResult.hasMore,
        nextPage:
            unreadResult.hasMore || newResult.hasMore
                ? Math.max(
                    Number(unreadResult.nextPage || 0),
                    Number(newResult.nextPage || 0),
                )
                : null,
        capabilities: {
            canCreateTopic:
                unreadResult.capabilities.canCreateTopic ||
                newResult.capabilities.canCreateTopic,
            solved:
                unreadResult.capabilities.solved ||
                newResult.capabilities.solved,
        },
    };
};

const orderNewContentItems = items =>
    items.sort((first, second) => {
        return (
            Number(second.newContentType === 'reply') -
            Number(first.newContentType === 'reply')
        );
    });

const HarborTopicList = ({
    source,
    navigation,
    ListHeaderComponent,
    contentContainerStyle,
    contentInsetAdjustmentBehavior = 'never',
    scrollIndicatorInsets,
    refreshProgressViewOffset = 0,
    onCapabilities,
    isTopicPressAllowed,
    onScroll,
    emptyTitle,
    emptyDescription,
    isActive = true,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const { status, user, login } = useHarborSession();
    const isScreenFocused = useIsFocused();
    const isVisible = isActive && isScreenFocused;
    const controllerRef = useRef(null);
    const requestGenerationRef = useRef(0);
    const firstPageLoadingRef = useRef(false);
    const firstPageErrorRef = useRef(null);
    const loadingMoreRef = useRef(false);
    const loadMoreErrorRef = useRef(null);
    const itemsRef = useRef([]);
    const activeCacheKeyRef = useRef(null);
    const rateLimitRef = useRef(null);
    const sourceRef = useRef(source);
    sourceRef.current = source;
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextPage, setNextPage] = useState(null);
    const [firstPageError, setFirstPageError] = useState(null);
    const [loadMoreError, setLoadMoreError] = useState(null);
    const [rateLimit, setRateLimit] = useState(null);
    const [clock, setClock] = useState(() => Date.now());
    const sourceKey = getSourceKey(source);
    const sessionIdentity =
        status === 'signedIn' ? user?.username || 'member' : 'guest';
    const isSessionReady = status !== 'restoring' && status !== 'authorizing';
    const cacheKey = `${sessionIdentity}:${sourceKey}`;

    const replaceItems = useCallback(nextItems => {
        itemsRef.current = nextItems;
        setItems(nextItems);
    }, []);

    const applyRateLimit = useCallback((error, scope) => {
        const now = Date.now();
        const nextRateLimit = {
            error,
            scope,
            until: now + getHarborRateLimitDelayMs(error, now),
        };
        sharedRateLimit = nextRateLimit;
        rateLimitRef.current = nextRateLimit;
        setClock(now);
        setRateLimit(nextRateLimit);
    }, []);

    const clearRateLimit = useCallback(() => {
        if (sharedRateLimit?.until <= Date.now()) {
            sharedRateLimit = null;
        }
        rateLimitRef.current = null;
        setRateLimit(null);
    }, []);

    const getActiveRateLimit = useCallback(() => {
        const localRateLimit = rateLimitRef.current;
        const currentRateLimit =
            (localRateLimit?.until || 0) >= (sharedRateLimit?.until || 0)
                ? localRateLimit
                : sharedRateLimit;
        return currentRateLimit?.until > Date.now() ? currentRateLimit : null;
    }, []);

    const loadFirstPage = useCallback(
        async ({ refresh = false, showIndicator = refresh } = {}) => {
            const errorScope =
                refresh || itemsRef.current.length > 0 ? 'refresh' : 'initial';
            const activeRateLimit = getActiveRateLimit();
            if (activeRateLimit) {
                rateLimitRef.current = activeRateLimit;
                setClock(Date.now());
                setRateLimit(activeRateLimit);
                const nextError = {
                    error: activeRateLimit.error,
                    scope: errorScope,
                };
                firstPageErrorRef.current = nextError;
                setFirstPageError(nextError);
                setIsLoading(false);
                setIsRefreshing(false);
                return;
            }
            if (firstPageLoadingRef.current) {
                if (showIndicator) {
                    setIsRefreshing(true);
                }
                return;
            }

            firstPageLoadingRef.current = true;
            const requestGeneration = ++requestGenerationRef.current;
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;

            if (showIndicator) {
                setIsRefreshing(true);
            }
            if (itemsRef.current.length === 0) {
                setIsLoading(true);
            }
            firstPageErrorRef.current = null;
            setFirstPageError(null);

            try {
                const result = await fetchTopicListPage({
                    ...sourceRef.current,
                    page: 0,
                    signal: controller.signal,
                });
                if (
                    controller.signal.aborted ||
                    requestGeneration !== requestGenerationRef.current
                ) {
                    return;
                }
                replaceItems(result.items);
                setHasMore(result.hasMore);
                setNextPage(result.nextPage);
                loadMoreErrorRef.current = null;
                setLoadMoreError(null);
                cacheTopicList(activeCacheKeyRef.current, result);
                clearRateLimit();
                onCapabilities?.(result.capabilities);
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.warn('Harbor topic list request failed', {
                        code: error?.code,
                        status: error?.response?.status,
                        message: error?.message,
                        source: sourceKey,
                    });
                    if (itemsRef.current.length === 0) {
                        setHasMore(false);
                        setNextPage(null);
                    }
                    const nextScope =
                        itemsRef.current.length > 0 ? 'refresh' : 'initial';
                    const nextError = {
                        error,
                        scope: nextScope,
                    };
                    firstPageErrorRef.current = nextError;
                    setFirstPageError(nextError);
                    if (isHarborRateLimited(error)) {
                        applyRateLimit(error, nextScope);
                    }
                }
            } finally {
                if (requestGeneration === requestGenerationRef.current) {
                    firstPageLoadingRef.current = false;
                    setIsLoading(false);
                    setIsRefreshing(false);
                    controllerRef.current = null;
                }
            }
        },
        [
            applyRateLimit,
            clearRateLimit,
            getActiveRateLimit,
            onCapabilities,
            replaceItems,
            sourceKey,
        ],
    );

    useEffect(() => {
        if (!isSessionReady) {
            return undefined;
        }

        const cachedResult = getCachedTopicList(cacheKey);
        activeCacheKeyRef.current = cacheKey;
        firstPageErrorRef.current = null;
        setFirstPageError(null);
        loadMoreErrorRef.current = null;
        setLoadMoreError(null);

        if (cachedResult) {
            replaceItems(cachedResult.items);
            setHasMore(cachedResult.hasMore);
            setNextPage(cachedResult.nextPage);
            setIsLoading(false);
            loadFirstPage({ refresh: true, showIndicator: false });
        } else {
            replaceItems([]);
            setHasMore(false);
            setNextPage(null);
            setIsLoading(true);
            loadFirstPage();
        }

        return () => {
            requestGenerationRef.current += 1;
            firstPageLoadingRef.current = false;
            controllerRef.current?.abort();
        };
    }, [cacheKey, isSessionReady, loadFirstPage, replaceItems]);

    useEffect(() => {
        return subscribeHarborTopicUpdates((topicId, patch) => {
            const { reloadLists, removeFromLists, ...itemPatch } = patch;
            const updateItems = currentItems =>
                removeFromLists
                    ? currentItems.filter(item => item.id !== topicId)
                    : currentItems.map(item =>
                        item.id === topicId ? { ...item, ...itemPatch } : item,
                    );
            replaceItems(updateItems(itemsRef.current));
            topicListCache.forEach((cachedResult, cachedKey) => {
                topicListCache.set(cachedKey, {
                    ...cachedResult,
                    items: updateItems(cachedResult.items),
                });
            });
            if (
                reloadLists &&
                ['new', 'unread', 'newContent'].includes(
                    sourceRef.current?.view,
                )
            ) {
                loadFirstPage({ refresh: true, showIndicator: false });
            }
        });
    }, [loadFirstPage, replaceItems]);

    useEffect(() => {
        if (!rateLimit?.until) {
            return undefined;
        }

        const updateClock = () => {
            const nextClock = Date.now();
            setClock(nextClock);
            if (nextClock >= rateLimit.until) {
                rateLimitRef.current = null;
                setRateLimit(null);
            }
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, [rateLimit?.until]);

    const loadMore = useCallback(
        async ({ manual = false } = {}) => {
            if (loadMoreErrorRef.current && !manual) {
                return;
            }
            // 先確認確實能載入更多，再處理限流；避免空列表／首頁錯誤時被 onEndReached 誤設 loadMoreError
            if (
                itemsRef.current.length === 0 ||
                isLoading ||
                !hasMore ||
                nextPage == null ||
                firstPageLoadingRef.current ||
                loadingMoreRef.current ||
                isRefreshing
            ) {
                return;
            }
            const activeRateLimit = getActiveRateLimit();
            if (activeRateLimit) {
                rateLimitRef.current = activeRateLimit;
                setClock(Date.now());
                setRateLimit(activeRateLimit);
                loadMoreErrorRef.current = {
                    error: activeRateLimit.error,
                    scope: 'more',
                };
                setLoadMoreError(loadMoreErrorRef.current);
                return;
            }

            loadingMoreRef.current = true;
            const requestGeneration = requestGenerationRef.current;
            const requestedCacheKey = activeCacheKeyRef.current;
            setIsLoadingMore(true);
            loadMoreErrorRef.current = null;
            setLoadMoreError(null);
            try {
                const result = await fetchTopicListPage({
                    ...sourceRef.current,
                    page: nextPage,
                });
                if (
                    requestGeneration !== requestGenerationRef.current ||
                    requestedCacheKey !== activeCacheKeyRef.current
                ) {
                    return;
                }
                const seenIds = new Set(itemsRef.current.map(item => item.id));
                const nextItems = orderNewContentItems([
                    ...itemsRef.current,
                    ...result.items.filter(item => !seenIds.has(item.id)),
                ]);
                replaceItems(nextItems);
                setHasMore(result.hasMore);
                setNextPage(result.nextPage);
                cacheTopicList(activeCacheKeyRef.current, {
                    items: nextItems,
                    hasMore: result.hasMore,
                    nextPage: result.nextPage,
                });
                clearRateLimit();
                onCapabilities?.(result.capabilities);
            } catch (error) {
                if (
                    requestGeneration !== requestGenerationRef.current ||
                    requestedCacheKey !== activeCacheKeyRef.current
                ) {
                    return;
                }
                const nextError = { error, scope: 'more' };
                loadMoreErrorRef.current = nextError;
                setLoadMoreError(nextError);
                if (isHarborRateLimited(error)) {
                    applyRateLimit(error, 'more');
                }
            } finally {
                loadingMoreRef.current = false;
                setIsLoadingMore(false);
            }
        },
        [
            applyRateLimit,
            clearRateLimit,
            getActiveRateLimit,
            hasMore,
            isLoading,
            isRefreshing,
            nextPage,
            onCapabilities,
            replaceItems,
        ],
    );

    // 滑到此頁且限流已結束時自動重試，免手動點「重試」
    useEffect(() => {
        if (!isVisible || !isSessionReady) {
            return;
        }
        if (getActiveRateLimit()) {
            return;
        }

        const firstError = firstPageErrorRef.current;
        if (firstError && isHarborRateLimited(firstError.error)) {
            loadFirstPage({
                refresh: itemsRef.current.length > 0,
                showIndicator: false,
            });
            return;
        }

        const moreError = loadMoreErrorRef.current;
        if (moreError && isHarborRateLimited(moreError.error)) {
            if (itemsRef.current.length === 0 || !hasMore || nextPage == null) {
                loadFirstPage({ refresh: itemsRef.current.length > 0 });
                return;
            }
            loadMore({ manual: true });
        }
    }, [
        getActiveRateLimit,
        hasMore,
        isSessionReady,
        isVisible,
        loadFirstPage,
        loadMore,
        nextPage,
    ]);

    const handleTopicPress = useCallback(
        topic => {
            const lastReadPostNumber = Number(topic.lastReadPostNumber || 0);
            const unreadCount = Number(topic.unreadCount || 0);
            const highestPostNumber = Number(topic.highestPostNumber || 0);
            const resumePostNumber =
                lastReadPostNumber > 0
                    ? Math.min(
                        lastReadPostNumber + (unreadCount > 0 ? 1 : 0),
                        highestPostNumber || lastReadPostNumber,
                    )
                    : undefined;

            navigation.navigate('HarborTopicDetail', {
                topicId: topic.id,
                postNumber: resumePostNumber,
                topicTitle: topic.title,
            });
        },
        [navigation],
    );

    const handleCategoryPress = useCallback(
        category => {
            navigation.navigate('HarborCategoryTopics', {
                categoryId: category.id,
                categorySlug: category.slug,
                categoryName: category.name,
            });
        },
        [navigation],
    );

    const handleTagPress = useCallback(
        tag => {
            navigation.navigate('HarborTagTopics', {
                tag: tag.name || tag.slug,
            });
        },
        [navigation],
    );

    const renderTopic = useCallback(
        ({ item }) => (
            <HarborTopicCard
                topic={item}
                onPress={handleTopicPress}
                onCategoryPress={handleCategoryPress}
                onTagPress={handleTagPress}
                isPressAllowed={isTopicPressAllowed}
            />
        ),
        [
            handleCategoryPress,
            handleTagPress,
            handleTopicPress,
            isTopicPressAllowed,
        ],
    );

    const cooldownActive = Boolean(rateLimit?.until > clock);
    const cooldownSeconds = cooldownActive
        ? Math.max(1, Math.ceil((rateLimit.until - clock) / 1000))
        : 0;
    const cooldownActionLabel = cooldownActive
        ? t('{{count}} 秒後重試', { count: cooldownSeconds })
        : t('重試');
    const responseStatus = firstPageError?.error?.response?.status;
    const needsLogin =
        (responseStatus === 401 || responseStatus === 403) &&
        status !== 'signedIn';
    const accessDenied = responseStatus === 403 && status === 'signedIn';
    const firstPageRateLimited = isHarborRateLimited(firstPageError?.error);
    const loadMoreRateLimited = isHarborRateLimited(loadMoreError?.error);

    const showRateLimitToast = useCallback(
        activeRateLimit => {
            const now = Date.now();
            rateLimitRef.current = activeRateLimit;
            setClock(now);
            setRateLimit(activeRateLimit);
            const seconds = Math.max(
                1,
                Math.ceil((activeRateLimit.until - now) / 1000),
            );
            Toast.show({
                type: 'info',
                text1: t('請求過於頻繁'),
                text2: t('{{count}} 秒後可重試', { count: seconds }),
            });
        },
        [t],
    );

    const handleRefresh = useCallback(() => {
        trigger();
        const activeRateLimit = getActiveRateLimit();
        if (activeRateLimit) {
            showRateLimitToast(activeRateLimit);
            return;
        }
        loadFirstPage({ refresh: true });
    }, [getActiveRateLimit, loadFirstPage, showRateLimitToast]);

    const handleLoadMoreRetry = useCallback(() => {
        const activeRateLimit = getActiveRateLimit();
        if (activeRateLimit) {
            showRateLimitToast(activeRateLimit);
            return;
        }
        // 沒有可續載內容時改為重載首頁，避免重試按鈕無反應
        if (itemsRef.current.length === 0 || !hasMore || nextPage == null) {
            loadFirstPage({ refresh: itemsRef.current.length > 0 });
            return;
        }
        loadMore({ manual: true });
    }, [
        getActiveRateLimit,
        hasMore,
        loadFirstPage,
        loadMore,
        nextPage,
        showRateLimitToast,
    ]);

    const header = useMemo(
        () => (
            <>
                {ListHeaderComponent}
                {firstPageError?.scope === 'refresh' && items.length > 0 ? (
                    <HarborInlineRetry
                        message={
                            firstPageRateLimited
                                ? cooldownActive
                                    ? t(
                                        '更新太頻繁，暫時顯示上次內容。{{count}} 秒後可重試。',
                                        { count: cooldownSeconds },
                                    )
                                    : t('更新太頻繁，暫時顯示上次內容。')
                                : t('更新失敗，已保留上次載入的話題')
                        }
                        actionLabel={cooldownActionLabel}
                        disabled={firstPageRateLimited && cooldownActive}
                        onRetry={() => loadFirstPage({ refresh: true })}
                    />
                ) : null}
            </>
        ),
        [
            ListHeaderComponent,
            cooldownActionLabel,
            cooldownActive,
            cooldownSeconds,
            firstPageError?.scope,
            firstPageRateLimited,
            items.length,
            loadFirstPage,
            t,
        ],
    );

    const footer = useMemo(() => {
        // 空列表已由全頁錯誤態處理，避免與底部重試橫幅重複
        if (loadMoreError && items.length > 0) {
            return (
                <HarborInlineRetry
                    message={
                        loadMoreRateLimited
                            ? cooldownActive
                                ? t(
                                    '載入太頻繁，現有話題仍可瀏覽。{{count}} 秒後可重試。',
                                    { count: cooldownSeconds },
                                )
                                : t('載入太頻繁，現有話題仍可瀏覽。')
                            : t('暫時無法載入更多話題')
                    }
                    actionLabel={cooldownActionLabel}
                    disabled={loadMoreRateLimited && cooldownActive}
                    onRetry={handleLoadMoreRetry}
                />
            );
        }
        if (isLoadingMore) {
            return (
                <ActivityIndicator
                    style={styles.footerLoading}
                    color={theme.themeColor}
                />
            );
        }
        return <View style={styles.footerSpace} />;
    }, [
        cooldownActionLabel,
        cooldownActive,
        cooldownSeconds,
        handleLoadMoreRetry,
        isLoadingMore,
        items.length,
        loadMoreError,
        loadMoreRateLimited,
        t,
        theme.themeColor,
    ]);

    const emptyState = firstPageError ? (
        <HarborFullState
            icon={needsLogin ? 'account-lock-outline' : 'alert-circle-outline'}
            title={
                needsLogin
                    ? t('登入後查看此內容')
                    : accessDenied
                        ? t('你沒有權限查看此內容')
                        : firstPageRateLimited
                            ? t('請求過於頻繁')
                            : t('話題載入失敗')
            }
            description={
                needsLogin
                    ? t('這個話題視圖只提供給已登入的 Harbor 會員。')
                    : accessDenied
                        ? t('你的 Harbor 帳號目前沒有這個分類的瀏覽權限。')
                        : firstPageRateLimited
                            ? cooldownActive
                                ? t(
                                    'Harbor 暫時限制更新，請於 {{count}} 秒後再試。',
                                    { count: cooldownSeconds },
                                )
                                : t('現在可以重新載入。')
                            : t('請檢查網絡後再試，公開內容仍可在未登入時瀏覽。')
            }
            actionLabel={
                needsLogin
                    ? t('登入 Harbor')
                    : firstPageRateLimited && cooldownActive
                        ? cooldownActionLabel
                        : t('重新載入')
            }
            actionDisabled={firstPageRateLimited && cooldownActive}
            onAction={
                needsLogin
                    ? () => login().catch(() => { })
                    : () => loadFirstPage()
            }
        />
    ) : (
        <HarborFullState
            icon="forum-outline"
            title={emptyTitle || t('這裡暫時沒有話題')}
            description={
                emptyDescription || t('稍後再來看看，或切換到其他話題視圖。')
            }
        />
    );

    if (isLoading && items.length === 0) {
        return (
            <FlashList
                data={SKELETON_ITEMS}
                keyExtractor={item => `harbor-skeleton-${item}`}
                renderItem={() => <HarborTopicSkeleton />}
                ListHeaderComponent={ListHeaderComponent}
                contentContainerStyle={contentContainerStyle}
                contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
                scrollIndicatorInsets={scrollIndicatorInsets}
                showsVerticalScrollIndicator={true}
                onScroll={onScroll}
                scrollEventThrottle={16}
            />
        );
    }

    return (
        <FlashList
            data={items}
            keyExtractor={item => `harbor-topic-${item.id}`}
            renderItem={renderTopic}
            ListHeaderComponent={header}
            ListEmptyComponent={emptyState}
            ListFooterComponent={footer}
            contentContainerStyle={contentContainerStyle}
            contentInsetAdjustmentBehavior={contentInsetAdjustmentBehavior}
            scrollIndicatorInsets={scrollIndicatorInsets}
            showsVerticalScrollIndicator={true}
            onScroll={onScroll}
            scrollEventThrottle={16}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    tintColor={theme.themeColor}
                    colors={[theme.themeColor]}
                    progressViewOffset={refreshProgressViewOffset}
                    onRefresh={handleRefresh}
                />
            }
            onEndReached={() => loadMore()}
            onEndReachedThreshold={0.35}
            drawDistance={700}
        />
    );
};

const styles = StyleSheet.create({
    footerLoading: {
        paddingVertical: verticalScale(20),
    },
    footerSpace: {
        height: verticalScale(88),
    },
});

export default HarborTopicList;
