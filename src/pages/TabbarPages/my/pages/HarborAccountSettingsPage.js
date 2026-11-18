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
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {usePushRegistration} from '../../../../contexts/PushRegistrationContext';
import {openLink} from '../../../../utils/browser';
import {ARK_HARBOR} from '../../../../utils/pathMap';
import {PUSH_SERVICE_UNAVAILABLE_ERROR_CODE} from '../../../../utils/pushRegistration';
import {trigger} from '../../../../utils/trigger';
import {
    SettingItem,
    SettingSection,
    SettingSectionCard,
} from '../../../Features/components/SettingPrimitives';

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
    const accountHandle = username ? `@${username}` : '';
    const displayName = user?.displayName;
    const hasDisplayName = displayName && displayName !== username;
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
            description: t('推送通知預設不顯示私人訊息或回覆內容。'),
        },
        silent: {
            title: t('靜默通知'),
            description: t('推送通知已啟用，但系統目前不允許提示聲音。'),
        },
    };
    const currentPushCopy =
        pushStatusCopy[harborDisplayStatus] || pushStatusCopy.disabled;
    const isPushEnabled =
        harborDisplayStatus === 'enabled' || harborDisplayStatus === 'silent';
    const pushActionLabel =
        isPushEnabled
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

    const handleReauthorize = async () => {
        try {
            await login({
                routeName: 'HarborAccountSettings',
            });
        } catch (error) {
            showOperationError(error);
        }
    };

    const handleDisconnect = () => {
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
                <SettingSection title={t('個人資料')} icon="person-circle" />
                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="person-circle-outline"
                        iconColor={theme.themeColor}
                        title={hasDisplayName ? displayName : accountHandle}
                        subtitle={hasDisplayName ? accountHandle : undefined}
                        showArrow={false}
                    />
                    <SettingItem
                        grouped
                        icon="create-outline"
                        iconColor={theme.themeColor}
                        title={t('編輯個人資料')}
                        onPress={() =>
                            navigation.navigate('HarborProfile', {mode: 'edit'})
                        }
                    />
                    <SettingItem
                        grouped
                        icon="open-outline"
                        iconColor={theme.themeColor}
                        title={t('網頁版個人主頁')}
                        onPress={() => openHarborPath(`/u/${username}/summary`)}
                    />
                </SettingSectionCard>

                <SettingSection title={t('通知')} icon="notifications" />
                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="notifications-outline"
                        iconColor={theme.secondThemeColor}
                        title={t('推送通知')}
                        subtitle={currentPushCopy.title}
                        showArrow={false}
                        rightElement={
                            <Pressable
                                accessibilityRole="button"
                                hitSlop={8}
                                accessibilityState={{
                                    busy: isPushActionLoading,
                                    disabled: isPushActionLoading,
                                }}
                                disabled={isPushActionLoading}
                                style={({pressed}) => [
                                    styles.pushButton,
                                    {
                                        backgroundColor: isPushEnabled
                                            ? theme.bg_color
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
                                            color: isPushEnabled
                                                ? theme.black.third
                                                : theme.themeColor,
                                        },
                                    ]}>
                                    {isPushActionLoading
                                        ? t('處理中…')
                                        : pushActionLabel}
                                </Text>
                            </Pressable>
                        }
                    />
                    {harborDisplayStatus === 'silent' ? (
                        <SettingItem
                            grouped
                            icon="settings-outline"
                            iconColor={theme.themeColor}
                            title={t('前往設定')}
                            onPress={() => Linking.openSettings()}
                        />
                    ) : null}
                    <SettingItem
                        grouped
                        icon="mail-outline"
                        iconColor={theme.themeColor}
                        title={t('站內及電郵通知')}
                        onPress={() =>
                            openHarborPath(`/u/${username}/preferences/notifications`)
                        }
                    />
                </SettingSectionCard>
                <Text style={[styles.pushHint, {color: theme.black.third}]}>
                    {currentPushCopy.description}
                </Text>

                <SettingSection title={t('帳戶連接')} icon="shield-checkmark" />
                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="key-outline"
                        iconColor={theme.black.third}
                        title={t('重新授權')}
                        onPress={handleReauthorize}
                    />
                    <SettingItem
                        grouped
                        icon="unlink-outline"
                        iconColor={theme.unread}
                        title={t('解除連接')}
                        onPress={handleDisconnect}
                    />
                </SettingSectionCard>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingBottom: verticalScale(36),
    },
    pushHint: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginHorizontal: scale(15),
        paddingHorizontal: scale(15),
    },
    pushButton: {
        minHeight: 32,
        maxWidth: '48%',
        marginLeft: scale(8),
        borderRadius: scale(20),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(5),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(5),
    },
    disabled: {
        opacity: 0.65,
    },
    pushButtonText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(11),
        textAlign: 'center',
    },
});

export default HarborAccountSettingsPage;
