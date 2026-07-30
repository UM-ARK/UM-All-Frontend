import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {HeaderHeightContext} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-simple-toast';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import SegmentControl from '../../../../components/SegmentControl';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {openLink} from '../../../../utils/browser';
import {
    fetchHarborMessages,
    fetchHarborNotificationPage,
    fetchHarborUnreadNotificationCount,
    markHarborNotificationRead,
} from '../../../../utils/harbor/harborApi';
import {ARK_HARBOR_ABSOLUTE_URL} from '../../../../utils/pathMap';
import {trigger} from '../../../../utils/trigger';
import {HarborInlineRetry} from '../../arkHarbor/components/HarborListStates';
import HarborEmptyState from '../components/HarborEmptyState';
import {
    formatRelativeTime,
    getHarborNotificationPresentation,
    getHarborNotificationTarget,
} from '../utils/harborUi';

const ListSeparator = () => <View style={styles.separator} />;

const HarborInboxPage = ({
    route,
    navigation,
    embedded = false,
    combined = false,
    contentBottomInset = verticalScale(32),
    contentTopInset = 0,
    onProfileRefresh,
    onUnreadCountChange,
    onScroll,
}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('my');
    const {user} = useHarborSession();
    const headerHeight = React.useContext(HeaderHeightContext) || 0;
    const username = user?.username || '';
    const initialTab = route?.params?.initialTab === 'messages' ? 1 : 0;
    const [selectedIndex, setSelectedIndex] = React.useState(initialTab);
    const [notificationFilterIndex, setNotificationFilterIndex] =
        React.useState(0);
    const [items, setItems] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [isLoadingMore, setIsLoadingMore] = React.useState(false);
    const [loadError, setLoadError] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(false);
    const controllerRef = React.useRef(null);
    const loadingMoreRef = React.useRef(false);
    const nextOffsetRef = React.useRef(0);
    const markingIdsRef = React.useRef(new Set());
    const unreadCountRef = React.useRef(0);
    const unreadCountRequestRef = React.useRef(0);
    const options = [
        {key: 'notifications', label: t('通知')},
        {key: 'messages', label: t('站內訊息')},
    ];
    const filterOptions = [
        {key: 'all', label: t('全部消息')},
        {key: 'unread', label: t('未讀')},
    ];
    const notificationFilter =
        combined && notificationFilterIndex === 1 ? 'unread' : undefined;
    const publishUnreadCount = React.useCallback(
        count => {
            const normalizedCount = Math.max(0, Number(count) || 0);
            unreadCountRef.current = normalizedCount;
            onUnreadCountChange?.(normalizedCount);
        },
        [onUnreadCountChange],
    );

    React.useEffect(() => {
        if (!embedded) {
            navigation.setOptions({headerTitle: t('消息中心')});
        }
    }, [embedded, navigation, t]);

    const loadItems = React.useCallback(
        async ({refresh = false, append = false} = {}) => {
            if (append && loadingMoreRef.current) {
                return;
            }
            if (!append) {
                controllerRef.current?.abort();
                loadingMoreRef.current = false;
                setIsLoadingMore(false);
            }
            const controller = new AbortController();
            controllerRef.current = controller;
            const unreadCountRequestId =
                combined && !append
                    ? unreadCountRequestRef.current + 1
                    : null;
            if (unreadCountRequestId != null) {
                unreadCountRequestRef.current = unreadCountRequestId;
            }
            if (append) {
                loadingMoreRef.current = true;
                setIsLoadingMore(true);
            } else if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setLoadError(false);

            try {
                const isNotificationList = combined || selectedIndex === 0;
                let nextItems;
                if (isNotificationList) {
                    const pageRequest = fetchHarborNotificationPage({
                        filter: notificationFilter,
                        offset: append ? nextOffsetRef.current : 0,
                        signal: controller.signal,
                    });
                    const [page, unreadCount] =
                        combined && !notificationFilter && !append
                            ? await Promise.all([
                                pageRequest,
                                fetchHarborUnreadNotificationCount({
                                    signal: controller.signal,
                                }),
                            ])
                            : [await pageRequest, null];
                    nextItems = page.items;
                    nextOffsetRef.current = page.nextOffset;
                    setHasMore(page.hasMore);
                    if (
                        combined &&
                        !append &&
                        unreadCountRequestRef.current ===
                            unreadCountRequestId
                    ) {
                        publishUnreadCount(
                            notificationFilter
                                ? page.totalCount
                                : unreadCount,
                        );
                    }
                } else {
                    nextItems = await fetchHarborMessages(username, {
                        signal: controller.signal,
                    });
                    nextOffsetRef.current = 0;
                    setHasMore(false);
                }
                if (!controller.signal.aborted) {
                    setItems(currentItems =>
                        append
                            ? [
                                ...currentItems,
                                ...nextItems.filter(
                                    nextItem =>
                                        !currentItems.some(
                                            currentItem =>
                                                currentItem.id === nextItem.id,
                                        ),
                                ),
                            ]
                            : nextItems,
                    );
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setLoadError(true);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                    loadingMoreRef.current = false;
                    setIsLoadingMore(false);
                    controllerRef.current = null;
                }
            }
        },
        [
            combined,
            notificationFilter,
            publishUnreadCount,
            selectedIndex,
            username,
        ],
    );

    React.useEffect(() => {
        if (!username) {
            navigation.goBack();
            return undefined;
        }
        loadItems();
        return () => controllerRef.current?.abort();
    }, [loadItems, navigation, username]);

    const handlePress = item => {
        trigger();
        const isNotification = combined || selectedIndex === 0;
        const presentation = isNotification
            ? getHarborNotificationPresentation(item, t)
            : null;
        if (
            isNotification &&
            !item.isRead &&
            !markingIdsRef.current.has(item.id)
        ) {
            markingIdsRef.current.add(item.id);
            setItems(currentItems =>
                currentItems.map(currentItem =>
                    currentItem.id === item.id
                        ? {...currentItem, isRead: true}
                        : currentItem,
                ),
            );
            markHarborNotificationRead(item.id)
                .then(() => {
                    unreadCountRequestRef.current += 1;
                    publishUnreadCount(unreadCountRef.current - 1);
                })
                .catch(() => {
                    setItems(currentItems =>
                        currentItems.map(currentItem =>
                            currentItem.id === item.id
                                ? {...currentItem, isRead: false}
                                : currentItem,
                        ),
                    );
                    Toast.show(
                        t('通知已讀狀態更新失敗，請稍後再試。'),
                    );
                })
                .finally(() => {
                    markingIdsRef.current.delete(item.id);
                });
        }

        if (!isNotification) {
            navigation.navigate('HarborTopicDetail', {
                topicId: item.topicId,
                topicTitle: item.title,
            });
            return;
        }

        const target = getHarborNotificationTarget(item, username);
        if (target.kind === 'topic') {
            navigation.navigate('HarborTopicDetail', {
                topicId: item.topicId,
                postNumber: item.postNumber,
                topicTitle: presentation.title,
            });
        } else if (target.kind === 'badges') {
            navigation.navigate('HarborBadges');
        } else {
            openLink({
                URL: ARK_HARBOR_ABSOLUTE_URL(target.path),
                mode: 'fullScreen',
            });
        }
    };

    const renderItem = ({item}) => {
        const isNotification = combined || selectedIndex === 0;
        const presentation = isNotification
            ? getHarborNotificationPresentation(item, t)
            : null;
        const unread = isNotification ? !item.isRead : item.unreadCount > 0;
        const fallbackExcerpt =
            !isNotification
                ? t('點擊開啟私人對話')
                : presentation.excerpt;
        return (
            <Pressable
                accessibilityRole="button"
                style={({pressed}) => [
                    styles.row,
                    {
                        backgroundColor: theme.white,
                        borderColor: theme.themeColorUltraLight,
                    },
                    theme.viewShadow,
                    unread && {borderColor: theme.themeColor},
                    pressed && {backgroundColor: theme.tonal.primary08},
                ]}
                onPress={() => handlePress(item)}>
                <View
                    style={[
                        styles.iconWrap,
                        {
                            backgroundColor: unread
                                ? theme.tonal.primary30
                                : theme.tonal.primary15,
                        },
                    ]}>
                    <Ionicons
                        name={
                            isNotification
                                ? presentation.icon
                                : 'mail-outline'
                        }
                        size={scale(20)}
                        color={theme.themeColor}
                    />
                </View>
                <View style={styles.rowContent}>
                    <View style={styles.rowHeader}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.rowTitle,
                                {color: theme.black.main},
                                unread && styles.unreadTitle,
                            ]}>
                            {isNotification
                                ? presentation.title
                                : item.title || t('Harbor 通知')}
                        </Text>
                        <Text
                            style={[
                                styles.rowTime,
                                {color: theme.black.third},
                            ]}>
                            {formatRelativeTime(item.createdAt, i18n.language)}
                        </Text>
                    </View>
                    <Text
                        numberOfLines={2}
                        style={[styles.rowExcerpt, {color: theme.black.third}]}>
                        {isNotification
                            ? presentation.excerpt
                            : item.excerpt || fallbackExcerpt}
                    </Text>
                </View>
                {unread ? (
                    <View
                        style={[
                            styles.unreadDot,
                            {backgroundColor: theme.unread},
                        ]}
                    />
                ) : (
                    <Ionicons
                        name="chevron-forward"
                        size={scale(17)}
                        color={theme.black.third}
                    />
                )}
            </Pressable>
        );
    };

    const handleRefresh = () => {
        trigger();
        loadItems({refresh: true});
        onProfileRefresh?.();
    };

    const handleLoadMore = () => {
        if (
            hasMore &&
            !isLoadingMore &&
            (combined || selectedIndex === 0)
        ) {
            loadItems({append: true});
        }
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: embedded
                        ? theme.white
                        : theme.bg_color,
                },
                !embedded &&
                isLiquidGlassSupported && {paddingTop: headerHeight},
            ]}>
            {combined ? null : (
                <View style={styles.segmentWrap}>
                    <SegmentControl
                        options={options}
                        selectedIndex={selectedIndex}
                        onChange={setSelectedIndex}
                        style={styles.segment}
                        trackBackgroundColor={theme.white}
                    />
                </View>
            )}
            {isLoading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.themeColor} />
                </View>
            ) : (
                <FlashList
                    data={items}
                    keyExtractor={item => item.listId || item.id}
                    contentInsetAdjustmentBehavior={
                        embedded || isLiquidGlassSupported
                            ? 'never'
                            : 'automatic'
                    }
                    contentContainerStyle={[
                        styles.content,
                        {
                            paddingBottom: contentBottomInset,
                            paddingTop:
                                contentTopInset + verticalScale(8),
                        },
                    ]}
                    showsVerticalScrollIndicator={false}
                    onScroll={onScroll}
                    scrollEventThrottle={16}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.35}
                    renderItem={renderItem}
                    ItemSeparatorComponent={ListSeparator}
                    ListHeaderComponent={
                        combined || (loadError && items.length > 0) ? (
                            <View style={styles.listHeader}>
                                {combined ? (
                                    <SegmentControl
                                        compact
                                        options={filterOptions}
                                        selectedIndex={
                                            notificationFilterIndex
                                        }
                                        onChange={setNotificationFilterIndex}
                                        style={styles.filterSegment}
                                        trackBackgroundColor={
                                            theme.tonal.primary08
                                        }
                                    />
                                ) : null}
                                {loadError && items.length > 0 ? (
                                    <HarborInlineRetry
                                        message={t(
                                            '無法取得 Harbor 消息，請檢查網絡後再試。',
                                        )}
                                        actionLabel={t('重試')}
                                        onRetry={() =>
                                            loadItems({refresh: true})
                                        }
                                    />
                                ) : null}
                            </View>
                        ) : null
                    }
                    ListEmptyComponent={
                        <HarborEmptyState
                            icon={
                                loadError
                                    ? 'cloud-offline-outline'
                                    : combined || selectedIndex === 0
                                    ? 'notifications-off-outline'
                                    : 'mail-open-outline'
                            }
                            title={
                                loadError
                                    ? t('收件匣載入失敗')
                                    : combined &&
                                      notificationFilterIndex === 1
                                    ? t('目前沒有未讀消息')
                                    : t('目前沒有消息')
                            }
                            description={
                                loadError
                                    ? t(
                                        '無法取得 Harbor 消息，請檢查網絡後再試。',
                                    )
                                    : t(
                                        combined
                                            ? 'Harbor 的通知會集中顯示在這裡，已讀消息仍可再次查看。'
                                            : 'Harbor 的通知與站內訊息會集中顯示在這裡。',
                                    )
                            }
                            actionLabel={loadError ? t('重試') : undefined}
                            onAction={
                                loadError ? () => loadItems() : undefined
                            }
                        />
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
                    ListFooterComponent={
                        isLoadingMore ? (
                            <ActivityIndicator
                                style={styles.loadingMore}
                                color={theme.themeColor}
                            />
                        ) : null
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    segmentWrap: {
        alignItems: 'center',
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(10),
        paddingBottom: verticalScale(4),
    },
    segment: {
        alignSelf: 'center',
    },
    listHeader: {
        alignItems: 'center',
        gap: verticalScale(8),
        paddingBottom: verticalScale(10),
    },
    filterSegment: {
        alignSelf: 'center',
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(8),
        paddingBottom: verticalScale(32),
    },
    row: {
        minHeight: verticalScale(82),
        borderRadius: scale(18),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(11),
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(12),
    },
    iconWrap: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowContent: {
        flex: 1,
        minWidth: 0,
    },
    rowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    rowTitle: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(13),
        fontWeight: '600',
    },
    unreadTitle: {
        fontWeight: '760',
    },
    rowTime: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
    },
    rowExcerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
        marginTop: verticalScale(5),
    },
    unreadDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
    },
    separator: {
        height: verticalScale(10),
    },
    loadingMore: {
        paddingVertical: verticalScale(16),
    },
});

export default HarborInboxPage;
