import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Switch,
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
import {useHarborSession} from '../../../contexts/HarborSessionContext';
import {
    fetchHarborChatChannels,
    fetchHarborDirectMessagePreference,
    updateHarborDirectMessagePreference,
} from '../../../utils/harbor/harborApi';
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

const HarborDirectMessageSettingsModal = ({onClose, username, visible}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const requestGeneration = React.useRef(0);
    const [savedPreference, setSavedPreference] = useState(null);
    const [pendingPreference, setPendingPreference] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [saveError, setSaveError] = useState(false);

    const loadPreference = useCallback(async () => {
        const generation = requestGeneration.current + 1;
        requestGeneration.current = generation;
        setIsLoading(true);
        setLoadError(false);
        setSaveError(false);
        setSavedPreference(null);
        setPendingPreference(null);
        try {
            const result = await fetchHarborDirectMessagePreference(username);
            if (requestGeneration.current !== generation) {
                return;
            }
            setSavedPreference(result);
            setPendingPreference(result);
        } catch {
            if (requestGeneration.current === generation) {
                setLoadError(true);
            }
        } finally {
            if (requestGeneration.current === generation) {
                setIsLoading(false);
            }
        }
    }, [username]);

    useEffect(() => {
        if (visible) {
            loadPreference();
        } else {
            requestGeneration.current += 1;
        }
    }, [loadPreference, visible]);

    const handleClose = () => {
        if (isSaving) {
            return;
        }
        trigger();
        requestGeneration.current += 1;
        onClose();
    };

    const handleSave = async () => {
        if (
            isLoading ||
            isSaving ||
            pendingPreference == null ||
            pendingPreference === savedPreference
        ) {
            return;
        }
        trigger();
        setIsSaving(true);
        setSaveError(false);
        try {
            await updateHarborDirectMessagePreference(
                username,
                pendingPreference,
            );
            setSavedPreference(pendingPreference);
            onClose();
        } catch {
            setSaveError(true);
        } finally {
            setIsSaving(false);
        }
    };

    const canSave =
        !isLoading &&
        !isSaving &&
        !loadError &&
        pendingPreference != null &&
        pendingPreference !== savedPreference;

    return (
        <Modal
            animationType="fade"
            onRequestClose={handleClose}
            transparent
            visible={visible}>
            <View style={styles.modalPage}>
                <Pressable
                    accessibilityLabel={t('取消')}
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={handleClose}
                    style={[
                        StyleSheet.absoluteFill,
                        styles.modalBackdrop,
                        {backgroundColor: theme.black.main},
                    ]}
                />
                <View
                    style={[
                        styles.settingsSheet,
                        {
                            backgroundColor: theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    <View style={styles.settingsHeader}>
                        <View
                            style={[
                                styles.settingsIcon,
                                {backgroundColor: theme.tonal.primary15},
                            ]}>
                            <MaterialCommunityIcons
                                color={theme.themeColor}
                                name="message-cog-outline"
                                size={scale(22)}
                            />
                        </View>
                        <Text
                            style={[
                                styles.settingsTitle,
                                {color: theme.black.main},
                            ]}>
                            {t('私訊設定')}
                        </Text>
                    </View>

                    {isLoading || (!loadError && pendingPreference == null) ? (
                        <View style={styles.settingsState}>
                            <ActivityIndicator
                                color={theme.themeColor}
                                size="small"
                            />
                            <Text
                                style={[
                                    styles.settingsStateText,
                                    {color: theme.black.third},
                                ]}>
                                {t('正在載入私訊設定…')}
                            </Text>
                        </View>
                    ) : loadError ? (
                        <View style={styles.settingsState}>
                            <MaterialCommunityIcons
                                color={theme.unread}
                                name="cloud-alert-outline"
                                size={scale(25)}
                            />
                            <Text
                                style={[
                                    styles.settingsStateText,
                                    {color: theme.black.third},
                                ]}>
                                {t('無法載入私訊設定，請檢查網絡後再試。')}
                            </Text>
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => {
                                    trigger();
                                    loadPreference();
                                }}
                                style={({pressed}) => [
                                    styles.retryButton,
                                    {backgroundColor: theme.tonal.primary15},
                                    pressed && {opacity: 0.78},
                                ]}>
                                <Text
                                    style={[
                                        styles.retryText,
                                        {color: theme.themeColor},
                                    ]}>
                                    {t('重試')}
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.preferenceContent}>
                            <View style={styles.preferenceRow}>
                                <View style={styles.preferenceText}>
                                    <Text
                                        style={[
                                            styles.preferenceTitle,
                                            {color: theme.black.main},
                                        ]}>
                                        {t('允許其他使用者向我發送私人訊息')}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.preferenceDescription,
                                            {color: theme.black.third},
                                        ]}>
                                        {t(
                                            '關閉後，你和其他一般使用者將無法互相傳送新的私人訊息。',
                                        )}
                                    </Text>
                                </View>
                                <Switch
                                    accessibilityLabel={t(
                                        '允許其他使用者向我發送私人訊息',
                                    )}
                                    disabled={isSaving}
                                    ios_backgroundColor={theme.disabled}
                                    onValueChange={value => {
                                        trigger();
                                        setPendingPreference(value);
                                        setSaveError(false);
                                    }}
                                    thumbColor={
                                        pendingPreference
                                            ? theme.themeColor
                                            : theme.black.third
                                    }
                                    trackColor={{
                                        false: theme.disabled,
                                        true: theme.themeColorUltraLight,
                                    }}
                                    value={Boolean(pendingPreference)}
                                />
                            </View>
                            {saveError ? (
                                <Text
                                    style={[
                                        styles.saveError,
                                        {color: theme.unread},
                                    ]}>
                                    {t('無法儲存私訊設定，請稍後再試。')}
                                </Text>
                            ) : null}
                        </View>
                    )}

                    <View
                        style={[
                            styles.settingsActions,
                            {borderTopColor: theme.themeColorUltraLight},
                        ]}>
                        <Pressable
                            accessibilityRole="button"
                            disabled={isSaving}
                            onPress={handleClose}
                            style={({pressed}) => [
                                styles.settingsAction,
                                {backgroundColor: theme.tonal.primary08},
                                pressed && {opacity: 0.78},
                            ]}>
                            <Text
                                style={[
                                    styles.settingsActionText,
                                    {color: theme.black.second},
                                ]}>
                                {t('取消')}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            disabled={!canSave}
                            onPress={handleSave}
                            style={({pressed}) => [
                                styles.settingsAction,
                                {
                                    backgroundColor: canSave
                                        ? theme.themeColor
                                        : theme.disabled,
                                },
                                pressed && canSave && {opacity: 0.78},
                            ]}>
                            {isSaving ? (
                                <ActivityIndicator
                                    color={theme.trueWhite}
                                    size="small"
                                />
                            ) : (
                                <Text
                                    style={[
                                        styles.settingsActionText,
                                        {color: theme.trueWhite},
                                    ]}>
                                    {t('儲存')}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const HarborChatListPage = ({navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const {patchChatUnreadCount, user} = useHarborSession();
    const username = user?.username || '';
    const headerHeight = useHeaderHeight();
    const [channels, setChannels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(false);
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);

    const findSomeone = useCallback(() => {
        navigation.navigate('HarborSearch', {resultTab: 'users'});
    }, [navigation]);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: t('Chat'),
            // React Navigation 的標題操作需要由函式提供
            // eslint-disable-next-line react/no-unstable-nested-components
            headerRight: () => (
                <View style={styles.headerActions}>
                    <Pressable
                        accessibilityLabel={t('私訊設定')}
                        accessibilityRole="button"
                        hitSlop={scale(8)}
                        onPress={() => {
                            trigger();
                            setIsSettingsVisible(true);
                        }}
                        style={({pressed}) => [
                            styles.headerButton,
                            pressed && {
                                backgroundColor: theme.tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            color={theme.themeColor}
                            name="cog-outline"
                            size={scale(22)}
                        />
                    </Pressable>
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
                            pressed && {
                                backgroundColor: theme.tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            color={theme.themeColor}
                            name="plus-circle-outline"
                            size={scale(23)}
                        />
                    </Pressable>
                </View>
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
            patchChatUnreadCount(result.unreadCount, username);
            setError(false);
        } catch {
            setError(true);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [patchChatUnreadCount, username]);

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
    const settingsModal = (
        <HarborDirectMessageSettingsModal
            onClose={() => setIsSettingsVisible(false)}
            username={username}
            visible={isSettingsVisible}
        />
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
                {settingsModal}
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
                {settingsModal}
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
                        progressViewOffset={
                            isLiquidGlassSupported ? headerHeight : undefined
                        }
                        refreshing={isRefreshing}
                        tintColor={theme.themeColor}
                    />
                }
                renderItem={({item}) => (
                    <HarborChatRow channel={item} onPress={openChannel} />
                )}
            />
            {settingsModal}
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    modalBackdrop: {
        opacity: 0.55,
    },
    modalPage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(20),
    },
    page: {
        flex: 1,
    },
    preferenceContent: {
        paddingHorizontal: scale(16),
        paddingBottom: verticalScale(18),
    },
    preferenceDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(15),
        marginTop: verticalScale(5),
    },
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(14),
    },
    preferenceText: {
        flex: 1,
    },
    preferenceTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '650',
        lineHeight: verticalScale(19),
    },
    preview: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
        marginRight: scale(8),
    },
    row: {
        minHeight: verticalScale(64),
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowBody: {
        flex: 1,
        minHeight: verticalScale(64),
        borderBottomWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        marginLeft: scale(12),
        paddingRight: scale(14),
        paddingVertical: verticalScale(6),
    },
    rowMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    retryButton: {
        minHeight: verticalScale(36),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(18),
    },
    retryText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '650',
    },
    saveError: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(15),
        marginTop: verticalScale(12),
    },
    settingsAction: {
        flex: 1,
        minHeight: verticalScale(42),
        borderRadius: scale(13),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(14),
    },
    settingsActions: {
        flexDirection: 'row',
        gap: scale(10),
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(12),
    },
    settingsActionText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '680',
    },
    settingsHeader: {
        minHeight: verticalScale(64),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        paddingHorizontal: scale(16),
    },
    settingsIcon: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(13),
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingsSheet: {
        width: '100%',
        maxWidth: scale(420),
        borderRadius: scale(18),
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    settingsState: {
        minHeight: verticalScale(132),
        alignItems: 'center',
        justifyContent: 'center',
        gap: verticalScale(10),
        paddingHorizontal: scale(24),
        paddingBottom: verticalScale(16),
    },
    settingsStateText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
        textAlign: 'center',
    },
    settingsTitle: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(16),
        fontWeight: '730',
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
