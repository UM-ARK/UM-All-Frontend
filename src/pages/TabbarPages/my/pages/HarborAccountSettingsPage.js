import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '../../../../utils/glassEffect';
import {useHeaderHeight} from '@react-navigation/elements';
import {useTranslation} from 'react-i18next';
import Ionicons from "@react-native-vector-icons/ionicons";
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {usePushRegistration} from '../../../../contexts/PushRegistrationContext';
import {openLink} from '../../../../utils/browser';
import {ARK_HARBOR} from '../../../../utils/pathMap';
import {PUSH_SERVICE_UNAVAILABLE_ERROR_CODE} from '../../../../utils/pushRegistration';
import {trigger} from '../../../../utils/trigger';

const HarborAccountSettingsPage = ({navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const {user, login, logout} = useHarborSession();
    const {
        permission,
        harborState,
        harborDisplayStatus,
        enableHarborPush,
        disableHarborPush,
        updatePermission,
    } = usePushRegistration();
    const headerHeight = useHeaderHeight();
    const scrollTopInset = isLiquidGlassSupported ? headerHeight : 0;
    const username = user?.username || '';
    const [isPushActionLoading, setIsPushActionLoading] =
        React.useState(false);
    const pushActionInFlightRef = React.useRef(false);

    React.useEffect(() => {
        navigation.setOptions({headerTitle: t('Harbor 帳號')});
    }, [navigation, t]);

    const openHarborPath = path => {
        openLink({URL: `${ARK_HARBOR}${path}`, mode: 'fullScreen'});
    };

    const showOperationError = error => {
        const pushServiceUnavailable =
            error?.code === PUSH_SERVICE_UNAVAILABLE_ERROR_CODE;
        Alert.alert(
            t(
                pushServiceUnavailable
                    ? '推送服務暫不可用'
                    : 'Harbor 操作失敗',
            ),
            t(
                pushServiceUnavailable
                    ? '此 Android 裝置無法使用 ARK ALL 目前的 Google 推送服務。Harbor 帳號、站內及電郵通知不受影響。'
                    : '無法完成 Harbor 操作，請稍後再試。',
            ),
            [{text: t('確定'), onPress: () => trigger()}],
        );
    };

    const pushStatusCopy = {
        disabled: {
            title: t('未開啟'),
            description: t('在此裝置接收 Harbor 的中性通知。'),
        },
        needs_permission: {
            title: t('需要系統權限'),
            description:
                permission?.canAskAgain === false
                    ? t('請在系統設定允許通知，返回 App 後按「檢查並繼續」。')
                    : t('請允許通知、聲音及 App 圖示角標。'),
        },
        needs_harbor_authorization: {
            title: t('需要 Harbor 授權'),
            description: t('需要重新確認 Harbor 的推送權限。'),
        },
        syncing: {
            title: t('正在同步'),
            description: t('正在安全地連接此裝置，失敗時會稍後重試。'),
        },
        [PUSH_SERVICE_UNAVAILABLE_ERROR_CODE]: {
            title: t('推送服務暫不可用'),
            description: t(
                '此 Android 裝置無法使用 ARK ALL 目前的 Google 推送服務。Harbor 帳號、站內及電郵通知不受影響。',
            ),
        },
        enabled: {
            title: t('已啟用'),
            description: t('通知內容預設不顯示私人訊息或回覆內容。'),
        },
        silent: {
            title: t('靜默通知'),
            description: t('通知已啟用，但系統目前不允許提示聲音。'),
        },
    };
    const currentPushCopy =
        pushStatusCopy[harborDisplayStatus] || pushStatusCopy.disabled;
    const pushActionLabel =
        harborDisplayStatus === 'enabled' || harborDisplayStatus === 'silent'
            ? t('關閉')
            : harborDisplayStatus === PUSH_SERVICE_UNAVAILABLE_ERROR_CODE
                ? t('重新檢查')
                : harborDisplayStatus === 'syncing'
                    ? t('重試')
                    : harborDisplayStatus === 'needs_permission' &&
                        permission?.canAskAgain === false
                        ? t('檢查並繼續')
                        : t('開啟');

    const handlePushAction = async () => {
        if (pushActionInFlightRef.current) {
            return;
        }
        pushActionInFlightRef.current = true;
        setIsPushActionLoading(true);
        trigger();
        try {
            if (
                harborDisplayStatus === 'needs_permission' &&
                permission?.canAskAgain === false
            ) {
                const currentPermission = await updatePermission();
                if (!currentPermission?.usable) {
                    await Linking.openSettings();
                    return;
                }
            }
            if (harborState.pendingAction === 'disable') {
                await disableHarborPush();
            } else if (
                harborDisplayStatus === 'enabled' ||
                harborDisplayStatus === 'silent'
            ) {
                await disableHarborPush();
            } else {
                await enableHarborPush();
            }
        } catch (error) {
            showOperationError(error);
        } finally {
            pushActionInFlightRef.current = false;
            setIsPushActionLoading(false);
        }
    };

    const handleOpenNotificationSettings = async () => {
        trigger();
        await Linking.openSettings();
    };

    const handleReauthorize = async () => {
        trigger();
        try {
            await login({
                routeName: 'HarborAccountSettings',
            });
        } catch (error) {
            showOperationError(error);
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
            title: t('Harbor 站內及電郵通知偏好'),
            description: t('調整 Harbor 網頁內的電郵及社群通知偏好'),
            icon: 'notifications-outline',
            onPress: () =>
                openHarborPath(`/u/${username}/preferences/notifications`),
        },
        {
            key: 'profile',
            title: t('編輯 Harbor 個人資料'),
            description: t('更新使用者名稱、工作狀態、簡介與公開資料'),
            icon: 'person-outline',
            onPress: () =>
                navigation.navigate('HarborProfile', {mode: 'edit'}),
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
                        styles.pushCard,
                        {backgroundColor: theme.white},
                    ]}>
                    <View
                        style={[
                            styles.rowIcon,
                            {backgroundColor: theme.tonal.primary15},
                        ]}>
                        <Ionicons
                            name="notifications-outline"
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
                            {t('Harbor 推送通知')}
                        </Text>
                        <Text
                            style={[
                                styles.pushStatus,
                                {color: theme.themeColor},
                            ]}>
                            {currentPushCopy.title}
                        </Text>
                        <Text
                            style={[
                                styles.rowDescription,
                                {color: theme.black.third},
                            ]}>
                            {currentPushCopy.description}
                        </Text>
                    </View>
                    <View style={styles.pushActions}>
                        {harborDisplayStatus === 'silent' ? (
                            <Pressable
                                accessibilityRole="button"
                                style={({pressed}) => [
                                    styles.pushButton,
                                    {
                                        backgroundColor:
                                            theme.tonal.primary15,
                                    },
                                    pressed && {opacity: 0.7},
                                ]}
                                onPress={handleOpenNotificationSettings}>
                                <Text
                                    style={[
                                        styles.pushButtonText,
                                        {color: theme.themeColor},
                                    ]}>
                                    {t('前往設定')}
                                </Text>
                            </Pressable>
                        ) : null}
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{
                                busy: isPushActionLoading,
                                disabled: isPushActionLoading,
                            }}
                            disabled={isPushActionLoading}
                            style={({pressed}) => [
                                styles.pushButton,
                                {
                                    backgroundColor:
                                        harborDisplayStatus === 'enabled' ||
                                        harborDisplayStatus === 'silent'
                                            ? theme.tonal.unread15
                                            : theme.tonal.primary15,
                                },
                                pressed && {opacity: 0.7},
                                isPushActionLoading && styles.disabled,
                            ]}
                            onPress={handlePushAction}>
                            {isPushActionLoading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={theme.themeColor}
                                />
                            ) : null}
                            <Text
                                style={[
                                    styles.pushButtonText,
                                    {
                                        color:
                                            harborDisplayStatus === 'enabled' ||
                                            harborDisplayStatus === 'silent'
                                                ? theme.unread
                                                : theme.themeColor,
                                    },
                                ]}>
                                {isPushActionLoading
                                    ? t('處理中…')
                                    : pushActionLabel}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                <View
                    style={[
                        styles.settingsCard,
                        {backgroundColor: theme.white},
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
    pushCard: {
        borderRadius: scale(20),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(11),
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(14),
    },
    pushStatus: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '650',
        marginTop: verticalScale(3),
    },
    pushActions: {
        alignItems: 'flex-end',
        gap: verticalScale(6),
    },
    pushButton: {
        borderRadius: scale(12),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
    },
    disabled: {
        opacity: 0.65,
    },
    pushButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '680',
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
