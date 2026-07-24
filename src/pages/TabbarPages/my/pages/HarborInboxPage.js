import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import SegmentControl from '../../../../components/SegmentControl';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {
    fetchHarborMessages,
    fetchHarborNotifications,
    markHarborNotificationRead,
} from '../../../../utils/harbor/harborApi';
import {trigger} from '../../../../utils/trigger';
import HarborEmptyState from '../components/HarborEmptyState';
import {formatRelativeTime} from '../utils/harborUi';

const ListSeparator = () => <View style={styles.separator} />;

const HarborInboxPage = ({route, navigation}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('my');
    const {user} = useHarborSession();
    const headerHeight = useHeaderHeight();
    const username = user?.username || '';
    const initialTab = route.params?.initialTab === 'messages' ? 1 : 0;
    const [selectedIndex, setSelectedIndex] = React.useState(initialTab);
    const [items, setItems] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const controllerRef = React.useRef(null);
    const options = [
        {key: 'notifications', label: t('通知')},
        {key: 'messages', label: t('站內訊息')},
    ];

    React.useEffect(() => {
        navigation.setOptions({headerTitle: t('Harbor 收件匣')});
    }, [navigation, t]);

    const showLoadError = React.useCallback(() => {
        Alert.alert(
            t('收件匣載入失敗'),
            t('無法取得 Harbor 消息，請檢查網絡後再試。'),
            [{text: t('確定'), onPress: () => trigger()}],
        );
    }, [t]);

    const loadItems = React.useCallback(
        async ({refresh = false} = {}) => {
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;
            if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            try {
                const nextItems =
                    selectedIndex === 0
                        ? await fetchHarborNotifications({
                              signal: controller.signal,
                          })
                        : await fetchHarborMessages(username, {
                              signal: controller.signal,
                          });
                if (!controller.signal.aborted) {
                    setItems(nextItems);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    showLoadError();
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                    controllerRef.current = null;
                }
            }
        },
        [selectedIndex, showLoadError, username],
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
        if (selectedIndex === 0 && !item.isRead) {
            setItems(currentItems =>
                currentItems.map(currentItem =>
                    currentItem.id === item.id
                        ? {...currentItem, isRead: true}
                        : currentItem,
                ),
            );
            markHarborNotificationRead(item.id).catch(() => undefined);
        }

        if (!item.topicId) {
            if (selectedIndex === 0 && item.badgeId) {
                navigation.navigate('HarborBadges');
            }
            return;
        }

        navigation.navigate('HarborTopicDetail', {
            topicId: item.topicId,
            postNumber: item.postNumber,
            topicTitle: item.title,
        });
    };

    const renderItem = ({item}) => {
        const isActionable =
            selectedIndex === 1 || Boolean(item.topicId || item.badgeId);
        const unread =
            selectedIndex === 0 ? !item.isRead : item.unreadCount > 0;
        const fallbackExcerpt =
            selectedIndex === 1
                ? t('點擊開啟私人對話')
                : item.badgeId
                  ? t('點擊查看獲得的徽章')
                  : item.topicId
                    ? t('點擊查看相關內容')
                    : t('此通知沒有可查看的相關內容');
        return (
            <Pressable
                accessibilityRole={isActionable ? 'button' : undefined}
                disabled={!isActionable}
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
                            selectedIndex === 0
                                ? 'notifications-outline'
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
                            {item.title || t('Harbor 通知')}
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
                        {item.excerpt || fallbackExcerpt}
                    </Text>
                </View>
                {unread ? (
                    <View
                        style={[
                            styles.unreadDot,
                            {backgroundColor: theme.unread},
                        ]}
                    />
                ) : isActionable ? (
                    <Ionicons
                        name="chevron-forward"
                        size={scale(17)}
                        color={theme.black.third}
                    />
                ) : null}
            </Pressable>
        );
    };

    return (
        <View
            style={[
                styles.container,
                {backgroundColor: theme.bg_color},
                isLiquidGlassSupported && {paddingTop: headerHeight},
            ]}>
            <View style={styles.segmentWrap}>
                <SegmentControl
                    options={options}
                    selectedIndex={selectedIndex}
                    onChange={setSelectedIndex}
                    style={styles.segment}
                    trackBackgroundColor={theme.white}
                />
            </View>
            {isLoading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={theme.themeColor} />
                </View>
            ) : (
                <FlashList
                    data={items}
                    keyExtractor={item => item.id}
                    contentInsetAdjustmentBehavior={
                        isLiquidGlassSupported ? 'never' : 'automatic'
                    }
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    renderItem={renderItem}
                    ItemSeparatorComponent={ListSeparator}
                    ListEmptyComponent={
                        <HarborEmptyState
                            icon={
                                selectedIndex === 0
                                    ? 'notifications-off-outline'
                                    : 'mail-open-outline'
                            }
                            title={t('目前沒有新消息')}
                            description={t(
                                'Harbor 的通知與站內訊息會集中顯示在這裡。',
                            )}
                        />
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            tintColor={theme.themeColor}
                            colors={[theme.themeColor]}
                            onRefresh={() => {
                                trigger();
                                loadItems({refresh: true});
                            }}
                        />
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
});

export default HarborInboxPage;
