import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';

import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { verticalScale } from 'react-native-size-matters';

import { useTheme } from '../../../../components/ThemeContext';
import { useHarborSession } from '../../../../contexts/HarborSessionContext';
import { fetchHarborTopicList } from '../../../../utils/harbor/harborApi';
import { trigger } from '../../../../utils/trigger';
import {
    HarborFullState,
    HarborInlineRetry,
    HarborTopicSkeleton,
} from './HarborListStates';
import HarborTopicCard from './HarborTopicCard';

const SKELETON_ITEMS = ['one', 'two', 'three', 'four'];

const getSourceKey = source =>
    [
        source.view || 'latest',
        source.categoryId || '',
        source.categorySlug || '',
        typeof source.tag === 'string'
            ? source.tag
            : source.tag?.name || source.tag?.slug || '',
    ].join(':');

const HarborTopicList = ({
    source,
    navigation,
    ListHeaderComponent,
    contentContainerStyle,
    contentInsetAdjustmentBehavior = 'never',
    scrollIndicatorInsets,
    onCapabilities,
    isTopicPressAllowed,
    onScroll,
    emptyTitle,
    emptyDescription,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const { status, user, login } = useHarborSession();
    const controllerRef = useRef(null);
    const requestGenerationRef = useRef(0);
    const loadingMoreRef = useRef(false);
    const sourceRef = useRef(source);
    sourceRef.current = source;
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextPage, setNextPage] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const sourceKey = getSourceKey(source);
    const sessionIdentity =
        status === 'signedIn' ? user?.username || 'member' : 'guest';

    const loadFirstPage = useCallback(
        async ({ refresh = false } = {}) => {
            const requestGeneration = ++requestGenerationRef.current;
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;

            if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
                setItems([]);
            }
            setLoadError(null);

            try {
                const result = await fetchHarborTopicList({
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
                setItems(result.items);
                setHasMore(result.hasMore);
                setNextPage(result.nextPage);
                if (Array.isArray(result.capabilities?.topicViews)) {
                    onCapabilities?.(result.capabilities);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.warn('Harbor topic list request failed', {
                        code: error?.code,
                        status: error?.response?.status,
                        message: error?.message,
                        source: sourceKey,
                    });
                    setLoadError({
                        error,
                        scope: refresh ? 'refresh' : 'initial',
                    });
                }
            } finally {
                if (requestGeneration === requestGenerationRef.current) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                    controllerRef.current = null;
                }
            }
        },
        [onCapabilities, sourceKey],
    );

    useEffect(() => {
        loadFirstPage();
        return () => {
            requestGenerationRef.current += 1;
            controllerRef.current?.abort();
        };
    }, [loadFirstPage, sessionIdentity, sourceKey]);

    const loadMore = useCallback(async () => {
        if (
            !hasMore ||
            nextPage == null ||
            loadingMoreRef.current ||
            isRefreshing
        ) {
            return;
        }

        loadingMoreRef.current = true;
        setIsLoadingMore(true);
        setLoadError(null);
        try {
            const result = await fetchHarborTopicList({
                ...sourceRef.current,
                page: nextPage,
            });
            setItems(currentItems => {
                const seenIds = new Set(currentItems.map(item => item.id));
                return [
                    ...currentItems,
                    ...result.items.filter(item => !seenIds.has(item.id)),
                ];
            });
            setHasMore(result.hasMore);
            setNextPage(result.nextPage);
            if (Array.isArray(result.capabilities?.topicViews)) {
                onCapabilities?.(result.capabilities);
            }
        } catch (error) {
            setLoadError({ error, scope: 'more' });
        } finally {
            loadingMoreRef.current = false;
            setIsLoadingMore(false);
        }
    }, [hasMore, isRefreshing, nextPage, onCapabilities]);

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

    const responseStatus = loadError?.error?.response?.status;
    const needsLogin =
        (responseStatus === 401 || responseStatus === 403) &&
        status !== 'signedIn';
    const accessDenied = responseStatus === 403 && status === 'signedIn';

    const header = useMemo(
        () => (
            <>
                {ListHeaderComponent}
                {loadError?.scope === 'refresh' && items.length > 0 ? (
                    <HarborInlineRetry
                        message={t('更新失敗，已保留上次載入的話題')}
                        actionLabel={t('重試')}
                        onRetry={() => loadFirstPage({ refresh: true })}
                    />
                ) : null}
            </>
        ),
        [ListHeaderComponent, items.length, loadError?.scope, loadFirstPage, t],
    );

    const footer = useMemo(() => {
        if (loadError?.scope === 'more') {
            return (
                <HarborInlineRetry
                    message={t('暫時無法載入更多話題')}
                    actionLabel={t('重試')}
                    onRetry={loadMore}
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
    }, [isLoadingMore, loadError?.scope, loadMore, t, theme.themeColor]);

    const emptyState = loadError ? (
        <HarborFullState
            icon={needsLogin ? 'account-lock-outline' : 'alert-circle-outline'}
            title={
                needsLogin
                    ? t('登入後查看此內容')
                    : accessDenied
                        ? t('你沒有權限查看此內容')
                        : t('話題載入失敗')
            }
            description={
                needsLogin
                    ? t('這個話題視圖只提供給已登入的 Harbor 會員。')
                    : accessDenied
                        ? t('你的 Harbor 帳號目前沒有這個分類的瀏覽權限。')
                        : t('請檢查網絡後再試，公開內容仍可在未登入時瀏覽。')
            }
            actionLabel={needsLogin ? t('登入 Harbor') : t('重新載入')}
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
                showsVerticalScrollIndicator={false}
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
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    tintColor={theme.themeColor}
                    colors={[theme.themeColor]}
                    onRefresh={() => {
                        trigger();
                        loadFirstPage({ refresh: true });
                    }}
                />
            }
            onEndReached={loadMore}
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
