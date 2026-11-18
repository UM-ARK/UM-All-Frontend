import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import Ionicons from "@react-native-vector-icons/ionicons";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import TouchableScale from '../../../../components/TouchableScale';
import {
    GlassView,
    isLiquidGlassSupported,
} from '../../../../utils/glassEffect';
import {trigger} from '../../../../utils/trigger';
import {formatJoinedAt} from '../utils/harborUi';

const AVATAR_SOURCE = require('../../../../static/img/logo_round.png');

const HarborProfileCard = ({
    user,
    onProfilePress,
    onEditProfilePress,
    onChatPress,
    chatUnreadCount = 0,
    onSettingsPress,
}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('my');
    const joinedAt = formatJoinedAt(user.joinedAt, i18n.language);
    const onAvatarPress = onEditProfilePress || onProfilePress;

    return (
        <View style={styles.container}>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                    onEditProfilePress ? '編輯個人資料' : 'Harbor 個人資料',
                )}
                disabled={!onAvatarPress}
                style={({pressed}) => [
                    styles.avatarButton,
                    pressed && styles.profilePressed,
                ]}
                onPress={() => {
                    trigger();
                    onAvatarPress?.();
                }}>
                <Image
                    source={
                        user.avatarUrl ? {uri: user.avatarUrl} : AVATAR_SOURCE
                    }
                    style={styles.avatar}
                    contentFit="cover"
                />
                {onEditProfilePress ? (
                    <View
                        style={[
                            styles.avatarEditBadge,
                            {
                                backgroundColor: theme.accentForeground,
                                borderColor: theme.white,
                            },
                        ]}>
                        <Ionicons
                            name="pencil"
                            size={scale(11)}
                            color={theme.white}
                        />
                    </View>
                ) : null}
            </Pressable>

            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Harbor 個人資料')}
                disabled={!onProfilePress}
                style={({pressed}) => [
                    styles.identity,
                    pressed && styles.profilePressed,
                ]}
                onPress={() => {
                    trigger();
                    onProfilePress?.();
                }}>
                <View style={styles.nameRow}>
                    <Text
                        numberOfLines={1}
                        style={[styles.name, {color: theme.black.main}]}>
                        {user.displayName || user.username}
                    </Text>
                    {onProfilePress ? (
                        <Ionicons
                            name="chevron-forward"
                            size={scale(13)}
                            color={theme.accentForeground}
                        />
                    ) : null}
                    <View
                        style={[
                            styles.connectedPill,
                            {backgroundColor: theme.tonal.success15},
                        ]}>
                        <Ionicons
                            name="checkmark-circle"
                            size={scale(12)}
                            color={theme.successForeground}
                        />
                        <Text
                            style={[
                                styles.connectedText,
                                {color: theme.successForeground},
                            ]}>
                            {t('已連接')}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.handle, {color: theme.black.second}]}>
                    @{user.username}
                </Text>
                <View style={styles.metaRow}>
                    <MaterialCommunityIcons
                        name="forum-outline"
                        size={scale(13)}
                        color={theme.accentForeground}
                    />
                    <Text style={[styles.role, {color: theme.black.second}]}>
                        {t(user.role || 'Harbor 會員')}
                    </Text>
                    <View
                        style={[
                            styles.metaDivider,
                            {backgroundColor: theme.themeColorUltraLight},
                        ]}
                    />
                    <Text style={[styles.trust, {color: theme.black.second}]}>
                        TL{user.trustLevel ?? 0}
                    </Text>
                </View>
                {joinedAt ? (
                    <Text style={[styles.joinedAt, {color: theme.black.second}]}>
                        {t('於 {{date}} 加入', {date: joinedAt})}
                    </Text>
                ) : null}
            </Pressable>

            {onChatPress || onSettingsPress ? (
                <GlassView
                    isInteractive
                    style={[
                        styles.actions,
                        {
                            backgroundColor: isLiquidGlassSupported
                                ? null
                                : theme.white,
                        },
                        isLiquidGlassSupported
                            ? null
                            : {
                                shadowColor: theme.black.main,
                                shadowOffset: {width: 0, height: 2},
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                            },
                    ]}>
                    {onChatPress ? (
                        <TouchableScale
                            accessibilityRole="button"
                            accessibilityLabel={t('Chat')}
                            activeScale={0.92}
                            hitSlop={scale(8)}
                            style={styles.actionButton}
                            onPress={() => {
                                trigger();
                                onChatPress();
                            }}>
                            <MaterialCommunityIcons
                                name="chat-outline"
                                size={scale(18)}
                                color={theme.accentForeground}
                            />
                            {chatUnreadCount > 0 ? (
                                <View
                                    style={[
                                        styles.chatUnreadBadge,
                                        {backgroundColor: theme.unreadForeground},
                                    ]}>
                                    <Text
                                        style={[
                                            styles.chatUnreadText,
                                            {color: theme.white},
                                        ]}>
                                        {chatUnreadCount > 99
                                            ? '99+'
                                            : chatUnreadCount}
                                    </Text>
                                </View>
                            ) : null}
                        </TouchableScale>
                    ) : null}
                    {onSettingsPress ? (
                        <TouchableScale
                            accessibilityRole="button"
                            accessibilityLabel={t('設置')}
                            activeScale={0.92}
                            hitSlop={scale(8)}
                            style={styles.actionButton}
                            onPress={() => {
                                trigger();
                                onSettingsPress();
                            }}>
                            <Ionicons
                                name="settings-outline"
                                size={scale(18)}
                                color={theme.accentForeground}
                            />
                        </TouchableScale>
                    ) : null}
                </GlassView>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(10),
        paddingHorizontal: scale(7),
        paddingTop: verticalScale(4),
        paddingBottom: verticalScale(4),
    },
    profilePressed: {
        opacity: 0.7,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        height: scale(34),
        borderRadius: scale(17),
        overflow: 'hidden',
        paddingHorizontal: scale(2),
    },
    actionButton: {
        width: scale(32),
        height: scale(34),
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatUnreadBadge: {
        position: 'absolute',
        top: scale(3),
        right: scale(2),
        minWidth: scale(13),
        height: scale(13),
        borderRadius: scale(7),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(3),
    },
    chatUnreadText: {
        ...uiStyle.defaultText,
        fontSize: scale(6),
        fontWeight: '700',
    },
    avatarButton: {
        minWidth: 44,
        minHeight: 44,
    },
    avatar: {
        width: scale(58),
        height: scale(58),
        borderRadius: scale(29),
    },
    avatarEditBadge: {
        position: 'absolute',
        right: scale(-1),
        bottom: scale(-1),
        width: scale(22),
        height: scale(22),
        borderRadius: scale(11),
        borderWidth: scale(2),
        alignItems: 'center',
        justifyContent: 'center',
    },
    identity: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
    },
    name: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(18),
        fontWeight: '760',
    },
    connectedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(3),
        borderRadius: scale(20),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(3),
    },
    connectedText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '750',
    },
    handle: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(2),
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        marginTop: verticalScale(7),
    },
    role: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        fontWeight: '600',
    },
    metaDivider: {
        width: StyleSheet.hairlineWidth,
        height: verticalScale(10),
        marginHorizontal: scale(2),
    },
    trust: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '650',
    },
    joinedAt: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(4),
    },
});

export default HarborProfileCard;
