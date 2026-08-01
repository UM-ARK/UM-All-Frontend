import React from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {HeaderHeightContext} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {
    fetchHarborUserActions,
    fetchHarborUserCreatedTopics,
} from '../../../../utils/harbor/harborApi';
import {trigger} from '../../../../utils/trigger';
import {HarborInlineRetry} from '../../arkHarbor/components/HarborListStates';
import HarborTopicCard from '../../arkHarbor/components/HarborTopicCard';
import HarborActivityRow from '../components/HarborActivityRow';
import HarborEmptyState from '../components/HarborEmptyState';

const ListSeparator = () => <View style={styles.separator} />;

const HarborActivityPage = ({
    route,
    navigation,
    kind: embeddedKind,
    title: embeddedTitle,
    embedded = false,
    contentBottomInset = verticalScale(32),
    contentTopInset = 0,
    onProfileRefresh,
    onScroll,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const {user} = useHarborSession();
    const headerHeight = React.useContext(HeaderHeightContext) || 0;
    const kind = embeddedKind || route?.params?.kind || 'all';
    const isTopicsKind = kind === 'topics';
    const title = embeddedTitle || route?.params?.title || t('所有活動');
    // 可從 route 指定用戶名（個人資料頁查看他人活動）；否則用當前登入用戶
    const username =
        (typeof route?.params?.username === 'string' &&
            route.params.username.trim()) ||
        user?.username ||
        '';
    const controllerRef = React.useRef(null);
    const loadingMoreRef = React.useRef(false);
    const [items, setItems] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(false);
    const [nextCursor, setNextCursor] = React.useState(0);
    const [loadError, setLoadError] = React.useState(false);
    const [loadMoreError, setLoadMoreError] = React.useState(false);

    React.useEffect(() => {
        if (!embedded) {
            navigation.setOptions({headerTitle: title});
        }
    }, [embedded, navigation, title]);

    const loadFirstPage = React.useCallback(
        async ({refresh = false} = {}) => {
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;
            if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setLoadError(false);

            try {
                const result = isTopicsKind
                    ? await fetchHarborUserCreatedTopics(username, {
                          page: 0,
                          signal: controller.signal,
                      })
                    : await fetchHarborUserActions(username, {
                          kind,
                          offset: 0,
                          signal: controller.signal,
                      });
                if (controller.signal.aborted) {
                    return;
                }
                setItems(result.items);
                setHasMore(result.hasMore);
                setNextCursor(
                    isTopicsKind ? result.nextPage : result.nextOffset,
                );
                setLoadMoreError(false);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setLoadError(true);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                    controllerRef.current = null;
                }
            }
        },
        [isTopicsKind, kind, username],
    );

    React.useEffect(() => {
        if (!username) {
            navigation.goBack();
            return undefined;
        }
        loadFirstPage();
        return () => controllerRef.current?.abort();
    }, [loadFirstPage, navigation, username]);

    const loadMore = React.useCallback(
        async ({force = false} = {}) => {
            if (
                !hasMore ||
                loadingMoreRef.current ||
                !username ||
                nextCursor == null ||
                (loadMoreError && !force)
            ) {
                return;
            }
            loadingMoreRef.current = true;
            setIsLoadingMore(true);
            setLoadMoreError(false);
            try {
                const result = isTopicsKind
                    ? await fetchHarborUserCreatedTopics(username, {
                          page: nextCursor,
                      })
                    : await fetchHarborUserActions(username, {
                          kind,
                          offset: nextCursor,
                      });
                setItems(currentItems => {
                    const seenIds = new Set(currentItems.map(item => item.id));
                    return [
                        ...currentItems,
                        ...result.items.filter(item => !seenIds.has(item.id)),
                    ];
                });
                setHasMore(result.hasMore);
                setNextCursor(
                    isTopicsKind ? result.nextPage : result.nextOffset,
                );
            } catch (error) {
                setLoadMoreError(true);
            } finally {
                loadingMoreRef.current = false;
                setIsLoadingMore(false);
            }
        },
        [
            hasMore,
            isTopicsKind,
            kind,
            loadMoreError,
            nextCursor,
            username,
        ],
    );

    const handleItemPress = React.useCallback(
        item => {
            if (!item.topicId) {
                return;
            }
            navigation.navigate('HarborTopicDetail', {
                topicId: item.topicId,
                postNumber: item.postNumber,
                topicTitle: item.title,
            });
        },
        [navigation],
    );

    const handleTopicPress = React.useCallback(
        topic => {
            if (!topic?.id) {
                return;
            }
            navigation.navigate('HarborTopicDetail', {
                topicId: topic.id,
                topicTitle: topic.title,
            });
        },
        [navigation],
    );

    const handleAuthorPress = React.useCallback(
        profileUsername => {
            if (!profileUsername) {
                return;
            }
            navigation.navigate('HarborProfile', {
                username: profileUsername,
                mode: 'preview',
            });
        },
        [navigation],
    );

    const handleCategoryPress = React.useCallback(
        category => {
            navigation.navigate('HarborCategoryTopics', {
                categoryId: category.id,
                categorySlug: category.slug,
                categoryName: category.name,
            });
        },
        [navigation],
    );

    const handleRefresh = React.useCallback(() => {
        trigger();
        loadFirstPage({refresh: true});
        onProfileRefresh?.();
    }, [loadFirstPage, onProfileRefresh]);

    const renderItem = React.useCallback(
        ({item}) => {
            if (isTopicsKind) {
                return (
                    <HarborTopicCard
                        topic={item}
                        onPress={handleTopicPress}
                        onAuthorPress={handleAuthorPress}
                        onCategoryPress={handleCategoryPress}
                    />
                );
            }
            return (
                <View
                    style={[
                        styles.rowCard,
                        {backgroundColor: theme.white},
                        theme.viewShadow,
                    ]}>
                    <HarborActivityRow
                        item={item}
                        onPress={handleItemPress}
                        onAvatarPress={handleAuthorPress}
                    />
                </View>
            );
        },
        [
            handleCategoryPress,
            handleAuthorPress,
            handleItemPress,
            handleTopicPress,
            isTopicsKind,
            theme.viewShadow,
            theme.white,
        ],
    );

    if (isLoading) {
        return (
            <View
                style={[
                    styles.loading,
                    {
                        backgroundColor: embedded
                            ? theme.white
                            : theme.bg_color,
                    },
                ]}>
                <ActivityIndicator size="large" color={theme.themeColor} />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: embedded
                        ? theme.white
                        : theme.bg_color,
                },
            ]}>
            <FlashList
                data={items}
                keyExtractor={item => String(item.id)}
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? {top: headerHeight} : undefined
                }
                contentInsetAdjustmentBehavior={
                    embedded || isLiquidGlassSupported ? 'never' : 'automatic'
                }
                contentContainerStyle={[
                    styles.content,
                    isTopicsKind && styles.topicsContent,
                    {
                        paddingBottom: contentBottomInset,
                        paddingTop: contentTopInset + verticalScale(12),
                    },
                    !embedded && isLiquidGlassSupported && {
                        paddingTop: headerHeight + verticalScale(12),
                    },
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={renderItem}
                ItemSeparatorComponent={
                    isTopicsKind ? undefined : ListSeparator
                }
                ListHeaderComponent={
                    loadError && items.length > 0 ? (
                        <HarborInlineRetry
                            message={t(
                                '無法取得 Harbor 活動，請檢查網絡後再試。',
                            )}
                            actionLabel={t('重試')}
                            onRetry={() => loadFirstPage({refresh: true})}
                        />
                    ) : null
                }
                ListEmptyComponent={
                    <HarborEmptyState
                        icon={
                            loadError
                                ? 'cloud-offline-outline'
                                : 'sparkles-outline'
                        }
                        title={
                            loadError
                                ? t('活動載入失敗')
                                : t('這裡暫時沒有內容')
                        }
                        description={
                            loadError
                                ? t(
                                    '無法取得 Harbor 活動，請檢查網絡後再試。',
                                )
                                : t(
                                    isTopicsKind
                                        ? '你建立的話題會顯示在這裡。'
                                        : kind === 'likesReceived'
                                          ? '別人給你的讚會顯示在這裡。'
                                          : '你在 Harbor 的新活動會顯示在這裡。',
                                )
                        }
                        actionLabel={loadError ? t('重試') : undefined}
                        onAction={loadError ? () => loadFirstPage() : undefined}
                    />
                }
                ListFooterComponent={
                    loadMoreError ? (
                        <HarborInlineRetry
                            message={t(
                                '無法取得 Harbor 活動，請檢查網絡後再試。',
                            )}
                            actionLabel={t('重試')}
                            onRetry={() => loadMore({force: true})}
                        />
                    ) : isLoadingMore ? (
                        <ActivityIndicator
                            style={styles.footer}
                            color={theme.themeColor}
                        />
                    ) : null
                }
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        tintColor={theme.themeColor}
                        colors={[theme.themeColor]}
                        progressViewOffset={contentTopInset}
                        onRefresh={handleRefresh}
                    />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.35}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(32),
    },
    topicsContent: {
        paddingHorizontal: scale(6),
    },
    rowCard: {
        borderRadius: scale(18),
        overflow: 'hidden',
    },
    separator: {
        height: verticalScale(10),
    },
    footer: {
        paddingVertical: verticalScale(20),
    },
});

export default HarborActivityPage;
