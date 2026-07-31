import React from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import {useTranslation} from 'react-i18next';
import Ionicons from "@react-native-vector-icons/ionicons";
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {openLink} from '../../../../utils/browser';
import {ARK_HARBOR} from '../../../../utils/pathMap';
import {trigger} from '../../../../utils/trigger';

const HarborAccountSettingsPage = ({navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const {user, login, logout} = useHarborSession();
    const headerHeight = useHeaderHeight();
    const scrollTopInset = isLiquidGlassSupported ? headerHeight : 0;
    const username = user?.username || '';

    React.useEffect(() => {
        navigation.setOptions({headerTitle: t('Harbor 帳號')});
    }, [navigation, t]);

    const openHarborPath = path => {
        openLink({URL: `${ARK_HARBOR}${path}`, mode: 'fullScreen'});
    };

    const showOperationError = () => {
        Alert.alert(
            t('Harbor 操作失敗'),
            t('無法完成 Harbor 操作，請稍後再試。'),
            [{text: t('確定'), onPress: () => trigger()}],
        );
    };

    const handleReauthorize = async () => {
        trigger();
        try {
            await login({
                routeName: 'HarborAccountSettings',
            });
        } catch (error) {
            showOperationError();
        }
    };

    const handleDisconnect = () => {
        trigger();
        Alert.alert(
            t('解除 Harbor 連接？'),
            t('此裝置將移除 Harbor 登入資料，你可以隨時重新連接。'),
            [
                {
                    text: t('取消'),
                    style: 'cancel',
                    onPress: () => trigger(),
                },
                {
                    text: t('解除連接'),
                    style: 'destructive',
                    onPress: async () => {
                        trigger();
                        try {
                            await logout();
                            navigation.popToTop();
                        } catch (error) {
                            showOperationError();
                        }
                    },
                },
            ],
            {cancelable: false},
        );
    };

    const sections = [
        {
            key: 'notifications',
            title: t('Harbor 通知設定'),
            description: t('調整電郵、推送及社群通知偏好'),
            icon: 'notifications-outline',
            onPress: () =>
                openHarborPath(`/u/${username}/preferences/notifications`),
        },
        {
            key: 'profile',
            title: t('編輯 Harbor 個人資料'),
            description: t('更新頭像、簡介與公開資料'),
            icon: 'person-outline',
            onPress: () => openHarborPath(`/u/${username}/preferences/profile`),
        },
        {
            key: 'web',
            title: t('在 Harbor 網頁中開啟'),
            description: t('前往完整的 Harbor 個人主頁'),
            icon: 'open-outline',
            onPress: () => openHarborPath(`/u/${username}/summary`),
        },
        {
            key: 'reauthorize',
            title: t('重新授權 Harbor'),
            description: t('重新確認此 App 的 Harbor 存取權限'),
            icon: 'key-outline',
            onPress: handleReauthorize,
        },
    ];

    return (
        <View style={[styles.container, {backgroundColor: theme.bg_color}]}>
            <ScrollView
                contentInset={
                    isLiquidGlassSupported
                        ? {top: scrollTopInset}
                        : undefined
                }
                contentOffset={
                    isLiquidGlassSupported
                        ? {x: 0, y: -scrollTopInset}
                        : undefined
                }
                scrollIndicatorInsets={
                    isLiquidGlassSupported
                        ? {top: scrollTopInset}
                        : undefined
                }
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}>
                <View
                    style={[
                        styles.accountCard,
                        {backgroundColor: theme.tonal.primary15},
                    ]}>
                    <View
                        style={[
                            styles.accountIcon,
                            {backgroundColor: theme.tonal.primary30},
                        ]}>
                        <Ionicons
                            name="shield-checkmark-outline"
                            size={scale(24)}
                            color={theme.themeColor}
                        />
                    </View>
                    <View style={styles.accountText}>
                        <Text
                            style={[
                                styles.accountTitle,
                                {color: theme.black.main},
                            ]}>
                            {user?.displayName || username}
                        </Text>
                        <Text
                            style={[
                                styles.accountDescription,
                                {color: theme.black.third},
                            ]}>
                            {t('已安全連接至')} @{username}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.statusDot,
                            {backgroundColor: theme.success},
                        ]}
                    />
                </View>

                <View
                    style={[
                        styles.settingsCard,
                        {backgroundColor: theme.white},
                        theme.viewShadow,
                    ]}>
                    {sections.map((item, index) => (
                        <Pressable
                            key={item.key}
                            accessibilityRole="button"
                            style={({pressed}) => [
                                styles.row,
                                pressed && {
                                    backgroundColor: theme.tonal.primary08,
                                },
                            ]}
                            onPress={() => {
                                if (item.key !== 'reauthorize') {
                                    trigger();
                                }
                                item.onPress();
                            }}>
                            <View
                                style={[
                                    styles.rowIcon,
                                    {
                                        backgroundColor: theme.tonal.primary15,
                                    },
                                ]}>
                                <Ionicons
                                    name={item.icon}
                                    size={scale(19)}
                                    color={theme.themeColor}
                                />
                            </View>
                            <View style={styles.rowText}>
                                <Text
                                    style={[
                                        styles.rowTitle,
                                        {color: theme.black.main},
                                    ]}>
                                    {item.title}
                                </Text>
                                <Text
                                    style={[
                                        styles.rowDescription,
                                        {color: theme.black.third},
                                    ]}>
                                    {item.description}
                                </Text>
                            </View>
                            <Ionicons
                                name="chevron-forward"
                                size={scale(17)}
                                color={theme.black.third}
                            />
                            {index < sections.length - 1 ? (
                                <View
                                    style={[
                                        styles.divider,
                                        {
                                            backgroundColor:
                                                theme.themeColorUltraLight,
                                        },
                                    ]}
                                />
                            ) : null}
                        </Pressable>
                    ))}
                </View>

                <Pressable
                    accessibilityRole="button"
                    style={({pressed}) => [
                        styles.disconnectButton,
                        {
                            backgroundColor: theme.tonal.unread15,
                            borderColor: theme.unread,
                        },
                        pressed && {backgroundColor: theme.tonal.unread30},
                    ]}
                    onPress={handleDisconnect}>
                    <Ionicons
                        name="unlink-outline"
                        size={scale(19)}
                        color={theme.unread}
                    />
                    <Text
                        style={[styles.disconnectText, {color: theme.unread}]}>
                        {t('解除帳號連接')}
                    </Text>
                </Pressable>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(36),
        gap: verticalScale(14),
    },
    accountCard: {
        minHeight: verticalScale(88),
        borderRadius: scale(22),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(14),
    },
    accountIcon: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(16),
        alignItems: 'center',
        justifyContent: 'center',
    },
    accountText: {
        flex: 1,
    },
    accountTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '730',
    },
    accountDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(4),
    },
    statusDot: {
        width: scale(10),
        height: scale(10),
        borderRadius: scale(5),
    },
    settingsCard: {
        borderRadius: scale(20),
        overflow: 'hidden',
    },
    row: {
        minHeight: verticalScale(78),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(11),
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(11),
    },
    rowIcon: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(13),
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowText: {
        flex: 1,
    },
    rowTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '650',
    },
    rowDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(14),
        marginTop: verticalScale(4),
    },
    divider: {
        position: 'absolute',
        right: scale(15),
        bottom: 0,
        left: scale(66),
        height: StyleSheet.hairlineWidth,
    },
    disconnectButton: {
        minHeight: verticalScale(48),
        borderRadius: scale(15),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(7),
        paddingHorizontal: scale(18),
    },
    disconnectText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '680',
    },
});

export default HarborAccountSettingsPage;
