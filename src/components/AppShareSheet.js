import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    Share,
    StyleSheet,
    View,
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import {FlashList} from '@shopify/flash-list';
import {Image} from 'expo-image';
import Ionicons from '@react-native-vector-icons/ionicons';
import ActionSheet from 'react-native-actions-sheet';
import Toast from 'react-native-simple-toast';
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useHarborSession} from '../contexts/HarborSessionContext';
import {
    getHarborAppShareMessage,
    getRecentAppShareChannels,
    getSystemAppSharePayload,
} from '../utils/appShare';
import {sendHarborChatMessage} from '../utils/harbor/harborApi';
import {trigger} from '../utils/trigger';
import Text from './AppText';
import {uiStyle, useTheme} from './ThemeContext';

const AppShareAvatar = ({channel, selected, onPress}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('common');
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [channel.avatarUrl]);

    return (
        <Pressable
            accessibilityLabel={channel.title}
            accessibilityRole="button"
            accessibilityState={{selected}}
            onPress={() => {
                trigger();
                onPress(channel);
            }}
            style={styles.chatItem}>
            <View
                style={[
                    styles.avatarRing,
                    {
                        borderColor: selected
                            ? theme.themeColor
                            : theme.themeColorUltraLight,
                    },
                ]}>
                {channel.avatarUrl && !failed ? (
                    <Image
                        contentFit="cover"
                        onError={() => setFailed(true)}
                        placeholder={theme.imagePlaceholder}
                        source={{uri: channel.avatarUrl}}
                        style={styles.avatar}
                    />
                ) : (
                    <View
                        style={[
                            styles.avatar,
                            styles.avatarFallback,
                            {backgroundColor: theme.tonal.primary15},
                        ]}>
                        <Ionicons
                            color={theme.themeColor}
                            name="person"
                            size={scale(24)}
                        />
                    </View>
                )}
                {selected ? (
                    <View
                        style={[
                            styles.selectedBadge,
                            {backgroundColor: theme.themeColor},
                        ]}>
                        <Ionicons
                            color={theme.trueWhite}
                            name="checkmark"
                            size={scale(12)}
                        />
                    </View>
                ) : null}
            </View>
            <Text
                numberOfLines={1}
                style={[styles.chatName, {color: theme.black.second}]}>
                {channel.title || t('聊天')}
            </Text>
        </Pressable>
    );
};

const AppShareSheet = ({visible, payload, onClose}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('common');
    const insets = useSafeAreaInsets();
    const sheetRef = useRef(null);
    const pendingCloseActionRef = useRef(null);
    const {status, chatChannels, refreshChatChannels} = useHarborSession();
    const [selectedChannelId, setSelectedChannelId] = useState(null);
    const [isLoadingChats, setIsLoadingChats] = useState(false);
    const [chatLoadFailed, setChatLoadFailed] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const recentChannels = useMemo(
        () => getRecentAppShareChannels(chatChannels),
        [chatChannels],
    );
    const selectedChannel = useMemo(
        () => recentChannels.find(channel => channel.id === selectedChannelId),
        [recentChannels, selectedChannelId],
    );

    useEffect(() => {
        if (!visible) {
            sheetRef.current?.hide();
            return;
        }
        setSelectedChannelId(null);
        setChatLoadFailed(false);
        setIsSending(false);
        sheetRef.current?.show();
        if (status !== 'signedIn') {
            return;
        }
        setIsLoadingChats(recentChannels.length === 0);
        refreshChatChannels({force: false})
            .catch(() => setChatLoadFailed(true))
            .finally(() => setIsLoadingChats(false));
    }, [recentChannels.length, refreshChatChannels, status, visible]);

    const hideSheet = useCallback(afterClose => {
        pendingCloseActionRef.current =
            typeof afterClose === 'function' ? afterClose : null;
        sheetRef.current?.hide();
    }, []);

    const handleSystemShare = useCallback(() => {
        if (!payload) {
            return;
        }
        trigger();
        const sharePayload = payload;
        hideSheet(() => {
            Share.share(
                getSystemAppSharePayload(sharePayload, Platform.OS),
            ).catch(() => Toast.show(t('分享失敗，請稍後再試')));
        });
    }, [hideSheet, payload, t]);

    const handleCopyLink = useCallback(() => {
        if (!payload?.url) {
            return;
        }
        trigger();
        Clipboard.setString(payload.url);
        Toast.show(t('已複製連結'));
        hideSheet();
    }, [hideSheet, payload?.url, t]);

    const handleSend = useCallback(async () => {
        const message = getHarborAppShareMessage(payload);
        if (!message || !selectedChannel || isSending) {
            return;
        }
        trigger();
        setIsSending(true);
        try {
            await sendHarborChatMessage(selectedChannel.id, message);
            Toast.show(t('已傳送給 {{name}}', {name: selectedChannel.title}));
            hideSheet();
        } catch {
            Toast.show(t('傳送失敗，請稍後再試'));
        } finally {
            setIsSending(false);
        }
    }, [hideSheet, isSending, payload, selectedChannel, t]);

    return (
        <ActionSheet
            ref={sheetRef}
            gestureEnabled
            onClose={() => {
                onClose?.();
                const pendingAction = pendingCloseActionRef.current;
                pendingCloseActionRef.current = null;
                if (pendingAction) {
                    requestAnimationFrame(pendingAction);
                }
            }}
            containerStyle={{
                backgroundColor: theme.bg_color,
                borderTopLeftRadius: scale(18),
                borderTopRightRadius: scale(18),
            }}>
            <View
                style={[
                    styles.sheet,
                    {
                        paddingBottom:
                            verticalScale(14) +
                            Math.max(insets.bottom, verticalScale(8)),
                    },
                ]}>
                <View style={styles.header}>
                    <Text style={[styles.title, {color: theme.black.main}]}>
                        {t('分享至')}
                    </Text>
                    <Pressable
                        accessibilityLabel={t('關閉')}
                        accessibilityRole="button"
                        hitSlop={scale(8)}
                        onPress={() => {
                            trigger();
                            hideSheet();
                        }}
                        style={({pressed}) => [
                            styles.closeButton,
                            pressed && {backgroundColor: theme.tonal.primary15},
                        ]}>
                        <Ionicons
                            color={theme.black.second}
                            name="close"
                            size={scale(22)}
                        />
                    </Pressable>
                </View>

                <Text style={[styles.sectionTitle, {color: theme.black.main}]}>
                    {t('最近聊天')}
                </Text>
                {status !== 'signedIn' ? (
                    <Text style={[styles.stateText, {color: theme.black.third}]}>
                        {t('登入 Harbor 後可直接分享給最近聊天')}
                    </Text>
                ) : isLoadingChats && recentChannels.length === 0 ? (
                    <View style={styles.loadingState}>
                        <ActivityIndicator color={theme.themeColor} size="small" />
                        <Text style={[styles.stateText, {color: theme.black.third}]}>
                            {t('正在載入最近聊天…')}
                        </Text>
                    </View>
                ) : recentChannels.length > 0 ? (
                    <FlashList
                        data={recentChannels}
                        horizontal
                        keyExtractor={channel => String(channel.id)}
                        renderItem={({item}) => (
                            <AppShareAvatar
                                channel={item}
                                onPress={channel => {
                                    setSelectedChannelId(current =>
                                        current === channel.id ? null : channel.id,
                                    );
                                }}
                                selected={item.id === selectedChannelId}
                            />
                        )}
                        showsHorizontalScrollIndicator={false}
                        style={styles.chatList}
                    />
                ) : (
                    <Text style={[styles.stateText, {color: theme.black.third}]}>
                        {chatLoadFailed
                            ? t('無法載入最近聊天')
                            : t('暫時沒有最近聊天')}
                    </Text>
                )}

                <View
                    style={[
                        styles.divider,
                        {backgroundColor: theme.themeColorUltraLight},
                    ]}
                />
                <View style={styles.actionRow}>
                    <Pressable
                        accessibilityRole="button"
                        onPress={handleSystemShare}
                        style={({pressed}) => [
                            styles.actionItem,
                            pressed && {opacity: 0.68},
                        ]}>
                        <View
                            style={[
                                styles.actionIcon,
                                {backgroundColor: theme.tonal.primary15},
                            ]}>
                            <Ionicons
                                color={theme.themeColor}
                                name="share-outline"
                                size={scale(23)}
                            />
                        </View>
                        <Text style={[styles.actionText, {color: theme.black.second}]}>
                            {t('系統分享')}
                        </Text>
                    </Pressable>
                    {payload?.url ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={handleCopyLink}
                            style={({pressed}) => [
                                styles.actionItem,
                                pressed && {opacity: 0.68},
                            ]}>
                            <View
                                style={[
                                    styles.actionIcon,
                                    {backgroundColor: theme.tonal.primary15},
                                ]}>
                                <Ionicons
                                    color={theme.themeColor}
                                    name="link-outline"
                                    size={scale(23)}
                                />
                            </View>
                            <Text style={[styles.actionText, {color: theme.black.second}]}>
                                {t('複製連結')}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>

                {selectedChannel ? (
                    <Pressable
                        accessibilityRole="button"
                        disabled={isSending}
                        onPress={handleSend}
                        style={({pressed}) => [
                            styles.sendButton,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary50
                                    : theme.themeColor,
                            },
                            isSending && {opacity: 0.65},
                        ]}>
                        {isSending ? (
                            <ActivityIndicator color={theme.trueWhite} size="small" />
                        ) : (
                            <Text
                                numberOfLines={1}
                                style={[styles.sendText, {color: theme.trueWhite}]}>
                                {t('傳送給 {{name}}', {name: selectedChannel.title})}
                            </Text>
                        )}
                    </Pressable>
                ) : null}
            </View>
        </ActionSheet>
    );
};

const styles = StyleSheet.create({
    sheet: {paddingHorizontal: scale(18), paddingTop: verticalScale(8)},
    header: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between'},
    title: {...uiStyle.defaultText, fontSize: scale(19), fontWeight: '700'},
    closeButton: {alignItems: 'center', borderRadius: scale(18), height: scale(36), justifyContent: 'center', width: scale(36)},
    sectionTitle: {...uiStyle.defaultText, fontSize: scale(13), fontWeight: '700', marginTop: verticalScale(12)},
    chatList: {height: verticalScale(82), marginTop: verticalScale(10)},
    chatItem: {alignItems: 'center', marginRight: scale(12), width: scale(66)},
    avatarRing: {borderRadius: scale(29), borderWidth: scale(2), padding: scale(2)},
    avatar: {borderRadius: scale(25), height: scale(50), width: scale(50)},
    avatarFallback: {alignItems: 'center', justifyContent: 'center'},
    selectedBadge: {alignItems: 'center', borderRadius: scale(9), bottom: scale(-1), height: scale(18), justifyContent: 'center', position: 'absolute', right: scale(-1), width: scale(18)},
    chatName: {...uiStyle.defaultText, fontSize: scale(11), marginTop: verticalScale(5), textAlign: 'center', width: '100%'},
    loadingState: {alignItems: 'center', flexDirection: 'row', gap: scale(8)},
    stateText: {...uiStyle.defaultText, fontSize: scale(12), marginTop: verticalScale(12)},
    divider: {height: StyleSheet.hairlineWidth, marginTop: verticalScale(16)},
    actionRow: {flexDirection: 'row', gap: scale(18), marginTop: verticalScale(14)},
    actionItem: {alignItems: 'center', width: scale(68)},
    actionIcon: {alignItems: 'center', borderRadius: scale(25), height: scale(50), justifyContent: 'center', width: scale(50)},
    actionText: {...uiStyle.defaultText, fontSize: scale(11), marginTop: verticalScale(5), textAlign: 'center'},
    sendButton: {alignItems: 'center', borderRadius: scale(11), justifyContent: 'center', marginTop: verticalScale(16), minHeight: verticalScale(44), paddingHorizontal: scale(14)},
    sendText: {...uiStyle.defaultText, fontSize: scale(13), fontWeight: '700'},
});

export default AppShareSheet;
