import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useFocusEffect} from '@react-navigation/native';
import {useHeaderHeight} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {Image} from 'expo-image';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import Text from '../../../components/AppText';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {fetchHarborChatChannels} from '../../../utils/harbor/harborApi';
import {formatHarborChatListTime} from '../../../utils/harbor/harborChat';
import {trigger} from '../../../utils/trigger';
import {HarborFullState} from './components/HarborListStates';

const ChatAvatar = ({channel}) => {
    const {theme} = useTheme();
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [channel.avatarUrl]);

    if (channel.avatarUrl && !failed) {
        return (
            <Image
                contentFit="cover"
                onError={() => setFailed(true)}
                placeholder={theme.imagePlaceholder}
                placeholderContentFit="cover"
                source={{uri: channel.avatarUrl}}
                style={styles.avatar}
                transition={160}
            />
        );
    }

    return (
        <View
            style={[
                styles.avatar,
                styles.avatarFallback,
                {backgroundColor: theme.tonal.primary15},
            ]}>
            <MaterialCommunityIcons
                color={theme.themeColor}
                name={channel.isGroup ? 'account-group' : 'account'}
                size={scale(25)}
            />
        </View>
    );
};

const HarborChatRow = ({channel, onPress}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('harbor');
    const unreadLabel = channel.unreadCount > 99 ? '99+' : String(channel.unreadCount);

    return (
        <Pressable
            accessibilityLabel={channel.title}
            accessibilityRole="button"
            onPress={() => {
                trigger();
                onPress(channel);
            }}
            style={({pressed}) => [
                styles.row,
                {
                    backgroundColor: pressed
                        ? theme.tonal.primary08
                        : theme.white,
                },
            ]}>
            <ChatAvatar channel={channel} />
            <View
                style={[
                    styles.rowBody,
                    {borderBottomColor: theme.disabled},
                ]}>
                <View style={styles.rowMain}>
                    <Text
                        numberOfLines={1}
                        style={[styles.title, {color: theme.black.main}]}>
                        {channel.title}
                    </Text>
                    <Text
                        numberOfLines={1}
                        style={[styles.time, {color: theme.black.third}]}>
                        {formatHarborChatListTime(
                            channel.lastMessageAt,
                            i18n.language,
                        )}
                    </Text>
                </View>
                <View style={styles.rowMain}>
                    <Text
                        numberOfLines={1}
                        style={[styles.preview, {color: theme.black.third}]}>
                        {channel.lastMessage || t('尚未有訊息')}
                    </Text>
                    {channel.unreadCount > 0 ? (
                        <View
                            style={[
                                styles.unreadBadge,
                                {backgroundColor: theme.unread},
                            ]}>
                            <Text
                                style={[
                                    styles.unreadText,
                                    {color: theme.trueWhite},
                                ]}>
                                {unreadLabel}
                            </Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </Pressable>
    );
};

const HarborChatListPage = ({navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const [channels, setChannels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(false);

    const findSomeone = useCallback(() => {
        navigation.navigate('HarborSearch', {resultTab: 'users'});
    }, [navigation]);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: t('Chat'),
            // React Navigation 的標題操作需要由函式提供
            // eslint-disable-next-line react/no-unstable-nested-components
            headerRight: () => (
                <Pressable
                    accessibilityLabel={t('找人聊天')}
                    accessibilityRole="button"
                    hitSlop={scale(8)}
                    onPress={() => {
                        trigger();
                        findSomeone();
                    }}
                    style={({pressed}) => [
                        styles.headerButton,
                        pressed && {backgroundColor: theme.tonal.primary15},
                    ]}>
                    <MaterialCommunityIcons
                        color={theme.themeColor}
                        name="plus-circle-outline"
                        size={scale(23)}
                    />
                </Pressable>
            ),
        });
    }, [findSomeone, navigation, t, theme.themeColor, theme.tonal.primary15]);

    const loadChannels = useCallback(async ({refresh = false} = {}) => {
        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        try {
            const result = await fetchHarborChatChannels();
            setChannels(result.items);
            setError(false);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadChannels();
        }, [loadChannels]),
    );

    const openChannel = useCallback(
        channel => {
            navigation.navigate('HarborChatChannel', {
                channelId: channel.id,
                channelTitle: channel.title,
                channelAvatarUrl: channel.avatarUrl,
                channelUsers: channel.users,
                isGroup: channel.isGroup,
            });
        },
        [navigation],
    );

    const contentContainerStyle = useMemo(
        () => ({
            paddingTop: isLiquidGlassSupported ? headerHeight : 0,
        }),
        [headerHeight],
    );

    if (isLoading && channels.length === 0) {
        return (
            <View
                style={[
                    styles.center,
                    {backgroundColor: theme.white},
                    isLiquidGlassSupported && {paddingTop: headerHeight},
                ]}>
                <ActivityIndicator color={theme.themeColor} size="small" />
            </View>
        );
    }

    if (error && channels.length === 0) {
        return (
            <View
                style={[
                    styles.page,
                    {backgroundColor: theme.white},
                    isLiquidGlassSupported && {paddingTop: headerHeight},
                ]}>
                <HarborFullState
                    actionLabel={t('重試')}
                    description={t('暫時無法取得 Chat，請檢查網絡後再試。')}
                    icon="chat-alert-outline"
                    onAction={loadChannels}
                    title={t('無法載入 Chat')}
                />
            </View>
        );
    }

    return (
        <View style={[styles.page, {backgroundColor: theme.white}]}>
            <FlashList
                contentContainerStyle={contentContainerStyle}
                data={channels}
                keyExtractor={item => String(item.id)}
                ListEmptyComponent={
                    <HarborFullState
                        actionLabel={t('去找人聊聊')}
                        description={t('找到對方的 Harbor 個人資料，就可以開始 Chat。')}
                        icon="chat-processing-outline"
                        onAction={findSomeone}
                        title={t('暫時沒有聊天')}
                    />
                }
                refreshControl={
                    <RefreshControl
                        colors={[theme.themeColor]}
                        onRefresh={() => loadChannels({refresh: true})}
                        refreshing={isRefreshing}
                        tintColor={theme.themeColor}
                    />
                }
                renderItem={({item}) => (
                    <HarborChatRow channel={item} onPress={openChannel} />
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    avatar: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(12),
        marginLeft: scale(14),
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerButton: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    page: {
        flex: 1,
    },
    preview: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
        marginRight: scale(8),
    },
    row: {
        minHeight: verticalScale(76),
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowBody: {
        flex: 1,
        minHeight: verticalScale(76),
        borderBottomWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        marginLeft: scale(12),
        paddingRight: scale(14),
        paddingVertical: verticalScale(10),
    },
    rowMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    time: {
        ...uiStyle.defaultText,
        flexShrink: 0,
        fontSize: scale(9),
        marginLeft: scale(8),
    },
    title: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(14),
        fontWeight: '620',
        lineHeight: verticalScale(20),
    },
    unreadBadge: {
        minWidth: scale(18),
        height: scale(18),
        borderRadius: scale(9),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(5),
    },
    unreadText: {
        ...uiStyle.defaultText,
        fontSize: scale(8),
        fontWeight: '700',
    },
});

export default HarborChatListPage;
