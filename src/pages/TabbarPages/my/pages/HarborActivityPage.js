import React from 'react';
import {
    ActivityIndicator,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {fetchHarborUserActions} from '../../../../utils/harbor/harborApi';
import {trigger} from '../../../../utils/trigger';
import {HarborInlineRetry} from '../../arkHarbor/components/HarborListStates';
import HarborActivityRow from '../components/HarborActivityRow';
import HarborEmptyState from '../components/HarborEmptyState';

const ListSeparator = () => <View style={styles.separator} />;

const HarborActivityPage = ({route, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const {user} = useHarborSession();
    const headerHeight = useHeaderHeight();
    const kind = route.params?.kind || 'all';
    const title = route.params?.title || t('所有活動');
    const username = user?.username || '';
    const controllerRef = React.useRef(null);
    const loadingMoreRef = React.useRef(false);
    const [items, setItems] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(false);
    const [nextOffset, setNextOffset] = React.useState(0);
    const [loadError, setLoadError] = React.useState(false);
    const [loadMoreError, setLoadMoreError] = React.useState(false);

    React.useEffect(() => {
        navigation.setOptions({headerTitle: title});
    }, [navigation, title]);

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
                const result = await fetchHarborUserActions(username, {
                    kind,
                    offset: 0,
                    signal: controller.signal,
                });
                if (controller.signal.aborted) {
                    return;
                }
                setItems(result.items);
                setHasMore(result.hasMore);
                setNextOffset(result.nextOffset);
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
        [kind, username],
    );

    React.useEffect(() => {
        if (!username) {
            navigation.goBack();
            return undefined;
        }
        loadFirstPage();
        return () => controllerRef.current?.abort();
    }, [loadFirstPage, navigation, username]);

    const loadMore = React.useCallback(async ({force = false} = {}) => {
        if (
            !hasMore ||
            loadingMoreRef.current ||
            !username ||
            (loadMoreError && !force)
        ) {
            return;
        }
        loadingMoreRef.current = true;
        setIsLoadingMore(true);
        setLoadMoreError(false);
        try {
            const result = await fetchHarborUserActions(username, {
                kind,
                offset: nextOffset,
            });
            setItems(currentItems => {
                const seenIds = new Set(currentItems.map(item => item.id));
                return [
                    ...currentItems,
                    ...result.items.filter(item => !seenIds.has(item.id)),
                ];
            });
            setHasMore(result.hasMore);
            setNextOffset(result.nextOffset);
        } catch (error) {
            setLoadMoreError(true);
        } finally {
            loadingMoreRef.current = false;
            setIsLoadingMore(false);
        }
    }, [hasMore, kind, loadMoreError, nextOffset, username]);

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

    if (isLoading) {
        return (
            <View style={[styles.loading, {backgroundColor: theme.bg_color}]}>
                <ActivityIndicator size="large" color={theme.themeColor} />
            </View>
        );
    }

    return (
        <View style={[styles.container, {backgroundColor: theme.bg_color}]}>
            <FlashList
                data={items}
                keyExtractor={item => item.id}
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? {top: headerHeight} : undefined
                }
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                contentContainerStyle={[
                    styles.content,
                    isLiquidGlassSupported && {
                        paddingTop: headerHeight + verticalScale(12),
                    },
                ]}
                showsVerticalScrollIndicator={false}
                renderItem={({item}) => (
                    <View
                        style={[
                            styles.rowCard,
                            {backgroundColor: theme.white},
                            theme.viewShadow,
                        ]}>
                        <HarborActivityRow
                            item={item}
                            onPress={handleItemPress}
                        />
                    </View>
                )}
                ItemSeparatorComponent={ListSeparator}
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
                                    '你在 Harbor 的新活動會顯示在這裡。',
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
                        onRefresh={() => {
                            trigger();
                            loadFirstPage({refresh: true});
                        }}
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
