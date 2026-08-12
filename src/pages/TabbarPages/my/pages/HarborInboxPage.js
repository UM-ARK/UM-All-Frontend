import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {HeaderHeightContext} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-simple-toast';
import Ionicons from "@react-native-vector-icons/ionicons";
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import SegmentControl from '../../../../components/SegmentControl';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {openLink} from '../../../../utils/browser';
import {
    calculateHarborInboxUnreadCount,
    fetchHarborChatChannels,
    fetchHarborMessages,
    fetchHarborNotificationPage,
    fetchHarborUnreadNotificationCount,
    markHarborNotificationRead,
} from '../../../../utils/harbor/harborApi';
import {ARK_HARBOR_ABSOLUTE_URL, ARK_HARBOR_AVATAR} from '../../../../utils/pathMap';
import {trigger} from '../../../../utils/trigger';
import {HarborInlineRetry} from '../../arkHarbor/components/HarborListStates';
import {HarborReactionIcon} from '../../arkHarbor/topicDetail/HarborReactionControl';
import HarborEmptyState from '../components/HarborEmptyState';
import {
    formatRelativeTime,
    getHarborInboxActor,
    getHarborNotificationPresentation,
    getHarborNotificationTarget,
} from '../utils/harborUi';

const ListSeparator = () => <View style={styles.separator} />;

const HarborInboxLeading = ({
    avatarUrl,
    accentColor,
    fallbackIcon,
    reactionValue,
    unread,
    theme,
}) => {
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => {
        setFailed(false);
    }, [avatarUrl]);
    const leading =
        avatarUrl && !failed ? (
            <Image
                source={{uri: avatarUrl}}
                style={[
                    styles.avatar,
                    {backgroundColor: theme.trueWhite},
                ]}
                contentFit="cover"
                placeholder={theme.imagePlaceholder}
                placeholderContentFit="cover"
                transition={200}
                onError={() => setFailed(true)}
            />
        ) : (
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
                    name={fallbackIcon}
                    size={scale(20)}
                    color={accentColor}
                />
            </View>
        );

    return (
        <View style={styles.leadingWrap}>
            {leading}
            {reactionValue ? (
                <View style={styles.reactionBadge}>
                    <HarborReactionIcon
                        name={reactionValue}
                        size={verticalScale(20)}
                    />
                </View>
            ) : null}
        </View>
    );
};

const sortInboxItems = items => {
    return [...items].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

const HarborInboxPage = ({
    navigation,
    embedded = false,
    contentBottomInset = verticalScale(32),
    contentTopInset = 0,
    onProfileRefresh,
    onUnreadCountChange,
    onScroll,
}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('my');
    const {
        user,
        inboxUnreadCount,
        patchInboxUnreadCount,
    } = useHarborSession();
    const headerHeight = React.useContext(HeaderHeightContext) || 0;
    const username = user?.username || '';
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
    const unreadCountRef = React.useRef(inboxUnreadCount);
    const unreadCountRequestRef = React.useRef(0);
    const filterOptions = [
        {key: 'all', label: t('全部消息')},
        {
            key: 'unread',
            label: t('未讀'),
            showDot: inboxUnreadCount > 0,
        },
    ];
    const notificationFilter =
        notificationFilterIndex === 1 ? 'unread' : undefined;
    const publishUnreadCount = React.useCallback(
        count => {
            const normalizedCount = Math.max(0, Number(count) || 0);
            unreadCountRef.current = normalizedCount;
            patchInboxUnreadCount(normalizedCount);
            onUnreadCountChange?.(normalizedCount);
        },
        [onUnreadCountChange, patchInboxUnreadCount],
    );

    React.useEffect(() => {
        unreadCountRef.current = inboxUnreadCount;
    }, [inboxUnreadCount]);

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
                !append
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
                const pageRequest = fetchHarborNotificationPage({
                    filter: notificationFilter,
                    offset: append ? nextOffsetRef.current : 0,
                    signal: controller.signal,
                });
                let nextItems;
                if (append) {
                    const page = await pageRequest;
                    nextItems = page.items.map(item => ({
                        ...item,
                        inboxType: 'notification',
                        listId: `notification:${item.id}`,
                    }));
                    nextOffsetRef.current = page.nextOffset;
                    setHasMore(page.hasMore);
                } else {
                    const unreadCountRequest =
                        !notificationFilter
                            ? fetchHarborUnreadNotificationCount({
                                signal: controller.signal,
                            })
                            : Promise.resolve(null);
                    const [pageResult, messagesResult, unreadCountResult] =
                        await Promise.allSettled([
                            pageRequest,
                            fetchHarborMessages(username, {
                                signal: controller.signal,
                            }),
                            unreadCountRequest,
                        ]);
                    if (pageResult.status === 'rejected') {
                        throw pageResult.reason;
                    }

                    const page = pageResult.value;
                    const notifications = page.items.map(item => ({
                        ...item,
                        inboxType: 'notification',
                        listId: `notification:${item.id}`,
                    }));
                    const messages =
                        messagesResult.status === 'fulfilled'
                            ? messagesResult.value
                                .filter(
                                    item =>
                                        !notificationFilter ||
                                        item.unreadCount > 0,
                                )
                                .map(item => ({
                                    ...item,
                                    inboxType: 'message',
                                    listId: `message:${item.id}`,
                                }))
                            : [];
                    nextItems = sortInboxItems([
                        ...notifications,
                        ...messages,
                    ]);
                    nextOffsetRef.current = page.nextOffset;
                    setHasMore(page.hasMore);
                    setLoadError(messagesResult.status === 'rejected');
                    const canPublishUnreadCount =
                        messagesResult.status === 'fulfilled' &&
                        (notificationFilter ||
                            unreadCountResult.status === 'fulfilled');
                    if (
                        canPublishUnreadCount &&
                        unreadCountRequestRef.current ===
                            unreadCountRequestId
                    ) {
                        const unreadNotificationCount =
                            notificationFilter
                                ? page.totalCount
                                : unreadCountResult.status === 'fulfilled'
                                ? unreadCountResult.value
                                : 0;
                        const nextUnreadCount =
                            calculateHarborInboxUnreadCount(
                                unreadNotificationCount,
                                messages,
                            );
                        publishUnreadCount(nextUnreadCount);
                    }
                }
                if (!controller.signal.aborted) {
                    setItems(currentItems =>
                        append
                            ? sortInboxItems([
                                ...currentItems,
                                ...nextItems.filter(
                                    nextItem =>
                                        !currentItems.some(
                                            currentItem =>
                                                currentItem.listId ===
                                                nextItem.listId,
                                        ),
                                ),
                            ])
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
            notificationFilter,
            publishUnreadCount,
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

    const handlePress = async item => {
        trigger();
        const isNotification = item.inboxType === 'notification';
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
                    currentItem.inboxType === 'notification' &&
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
                            currentItem.inboxType === 'notification' &&
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
            if (item.unreadCount > 0) {
                setItems(currentItems =>
                    currentItems.map(currentItem =>
                        currentItem.listId === item.listId
                            ? {...currentItem, unreadCount: 0}
                            : currentItem,
                    ),
                );
                publishUnreadCount(unreadCountRef.current - 1);
            }
            navigation.navigate('HarborTopicDetail', {
                topicId: item.topicId,
                topicTitle: item.title,
            });
            return;
        }

        const target = getHarborNotificationTarget(item, username);
        if (target.kind === 'topic') {
            navigation.navigate('HarborTopicDetail', {
                topicId: target.topicId,
                postNumber: target.postNumber,
                topicTitle: presentation.title,
            });
        } else if (target.kind === 'badges') {
            navigation.navigate('HarborBadges');
        } else if (target.kind === 'messages') {
            return;
        } else if (target.kind === 'category') {
            navigation.navigate('HarborCategoryTopics', {
                categoryId: target.categoryId,
                categorySlug: target.categorySlug,
            });
        } else if (target.kind === 'tag') {
            navigation.navigate('HarborTagTopics', {tag: target.tag});
        } else if (target.kind === 'search') {
            navigation.navigate('HarborSearch', {query: target.query});
        } else if (target.kind === 'chat') {
            try {
                const result = await fetchHarborChatChannels();
                const channel = result.items.find(
                    candidate => candidate.id === target.channelId,
                );
                if (channel) {
                    navigation.navigate('HarborChatChannel', {
                        channelId: channel.id,
                        messageId: target.messageId,
                        channelTitle: channel.title,
                        channelAvatarUrl: channel.avatarUrl,
                        channelUsers: channel.users,
                        isGroup: channel.isGroup,
                    });
                    return;
                }
            } catch {}
            openLink({
                URL: ARK_HARBOR_ABSOLUTE_URL(
                    `/chat/c/-/${target.channelId}` +
                    (target.messageId ? `/${target.messageId}` : ''),
                ),
                mode: 'fullScreen',
            });
        } else if (target.kind === 'web') {
            const url = ARK_HARBOR_ABSOLUTE_URL(target.path);
            console.warn('[HarborInbox] Web fallback link:', url);
            openLink({
                URL: url,
                mode: 'fullScreen',
            });
        } else {
            Toast.show(t('此通知沒有可查看的相關內容'));
        }
    };

    const renderItem = ({item}) => {
        const isNotification = item.inboxType === 'notification';
        const presentation = isNotification
            ? getHarborNotificationPresentation(item, t)
            : null;
        const unread = isNotification ? !item.isRead : item.unreadCount > 0;
        const fallbackExcerpt =
            !isNotification
                ? t('點擊開啟私人對話')
                : presentation.excerpt;
        const accentColor =
            isNotification && presentation.isAdmin
                ? theme.warning
                : theme.themeColor;
        const avatarActor = getHarborInboxActor(item);
        const avatarUrl =
            avatarActor.avatarUrl ||
            (avatarActor.username
                ? ARK_HARBOR_AVATAR(avatarActor.username, 72)
                : '');
        return (
            <Pressable
                accessibilityRole="button"
                style={({pressed}) => [
                    styles.row,
                    {
                        backgroundColor: theme.white,
                        borderColor: theme.themeColorUltraLight,
                    },
                    unread && {borderColor: theme.themeColor},
                    pressed && {backgroundColor: theme.tonal.primary08},
                ]}
                onPress={() => handlePress(item)}>
                <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={avatarActor.username}
                    disabled={!avatarActor.username}
                    onPress={event => {
                        event.stopPropagation?.();
                        trigger();
                        navigation.navigate('HarborProfile', {
                            username: avatarActor.username,
                            mode: 'preview',
                        });
                    }}
                    style={({pressed}) => [
                        pressed && styles.avatarPressed,
                    ]}>
                    <HarborInboxLeading
                        avatarUrl={avatarUrl}
                        accentColor={accentColor}
                        fallbackIcon={
                            isNotification
                                ? presentation.icon
                                : 'mail-outline'
                        }
                        reactionValue={
                            isNotification ? item.reactionValue : ''
                        }
                        unread={unread}
                        theme={theme}
                    />
                </Pressable>
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
                        numberOfLines={1}
                        style={[
                            styles.rowType,
                            {color: accentColor},
                        ]}>
                        {isNotification
                            ? presentation.isAdmin
                                ? `${t('管理員')} · ${presentation.label}`
                                : presentation.label
                            : t('私人訊息')}
                    </Text>
                    {isNotification && !presentation.excerpt ? null : (
                        <Text
                            numberOfLines={2}
                            style={[
                                styles.rowExcerpt,
                                {color: theme.black.third},
                            ]}>
                            {isNotification
                                ? presentation.excerpt
                                : item.excerpt || fallbackExcerpt}
                        </Text>
                    )}
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
        if (hasMore && !isLoadingMore) {
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
                        <View style={styles.listHeader}>
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
                    }
                    ListEmptyComponent={
                        <HarborEmptyState
                            icon={
                                loadError
                                    ? 'cloud-offline-outline'
                                    : 'notifications-off-outline'
                            }
                            title={
                                loadError
                                    ? t('收件匣載入失敗')
                                    : notificationFilterIndex === 1
                                    ? t('目前沒有未讀消息')
                                    : t('目前沒有消息')
                            }
                            description={
                                loadError
                                    ? t(
                                        '無法取得 Harbor 消息，請檢查網絡後再試。',
                                    )
                                    : t(
                                        'Harbor 的通知與站內訊息會集中顯示在這裡。',
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
    listHeader: {
        alignItems: 'center',
        gap: verticalScale(8),
        paddingBottom: verticalScale(8),
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
        minHeight: verticalScale(68),
        borderRadius: scale(16),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(9),
    },
    leadingWrap: {
        width: scale(38),
        height: scale(38),
    },
    iconWrap: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(19),
    },
    reactionBadge: {
        position: 'absolute',
        right: scale(-6),
        bottom: verticalScale(-6),
        width: scale(22),
        height: scale(22),
        borderRadius: scale(11),
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarPressed: {
        opacity: 0.65,
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
    rowType: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '600',
        marginTop: verticalScale(4),
    },
    rowExcerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
        marginTop: verticalScale(2),
    },
    unreadDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
    },
    separator: {
        height: verticalScale(8),
    },
    loadingMore: {
        paddingVertical: verticalScale(16),
    },
});

export default HarborInboxPage;
