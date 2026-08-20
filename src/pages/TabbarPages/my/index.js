import React from 'react';
import {
    Alert,
    Animated,
    Pressable,
    RefreshControl,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';

import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../../../components/AppText';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { usePushRegistration } from '../../../contexts/PushRegistrationContext';
import { trigger } from '../../../utils/trigger';
import TeamSchedulePreviewSection from '../../TeamSchedule/components/TeamSchedulePreviewSection';
import HarborGuestState from './components/HarborGuestState';
import HarborPageHeader from './components/HarborPageHeader';
import HarborProfileOverview from './components/HarborProfileOverview';
import HarborRestoringState from './components/HarborRestoringState';

const MyScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation(['common', 'my']);
    const {
        status,
        user,
        login,
        error,
        inboxUnreadCount,
        chatUnreadCount,
        refresh,
        refreshInboxUnreadCount,
        refreshChatUnreadCount,
    } = useHarborSession();
    const {
        dismissHarborPushPrompt,
        harborDisplayStatus,
        harborState,
        shouldShowHarborPrompt,
    } = usePushRegistration();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const contentWidth = Math.min(width - scale(20), scale(680));
    const contentTopInset = insets.top + verticalScale(8);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const teamSchedulePreviewRef = React.useRef(null);
    // 暫時關閉下滑頂部頭像動畫
    // const scrollY = React.useRef(new Animated.Value(0)).current;
    const isSignedIn = status === 'signedIn' && !!user;
    const isHarborPushSetupIncomplete =
        harborState.desiredEnabled &&
        harborDisplayStatus !== 'enabled' &&
        harborDisplayStatus !== 'silent';

    const presentHarborError = React.useCallback(
        sessionError => {
            if (!sessionError) {
                return;
            }

            const message =
                sessionError.code === 'HARBOR_SESSION_EXPIRED'
                    ? t('Harbor 登入已失效，請重新登入。', { ns: 'my' })
                    : t('無法完成 Harbor 操作，請稍後再試。', { ns: 'my' });
            Alert.alert(
                t('Harbor 操作失敗', { ns: 'my' }),
                message,
                [
                    {
                        text: t('確定', { ns: 'my' }),
                        onPress: () => trigger(),
                    },
                ],
                { cancelable: false },
            );
        },
        [t],
    );

    const handleLogin = async () => {
        try {
            await login({
                routeName: 'Tabbar',
                params: { screen: 'MyTabbar' },
            });
        } catch (sessionError) {
            presentHarborError(sessionError);
        }
    };

    const handleBrowseForum = () => {
        navigation.navigate('ForumTabbar');
    };

    const openHarborPushSettings = () => {
        trigger();
        navigation.navigate('HarborAccountSettings');
    };

    const handleRefresh = async () => {
        trigger();
        setIsRefreshing(true);
        try {
            // Harbor 與 Scheduling 隔離：Scheduling 失敗不彈 Harbor 錯誤
            const results = await Promise.allSettled([
                refresh(),
                refreshInboxUnreadCount(),
                refreshChatUnreadCount(),
                (async () => {
                    if (
                        typeof teamSchedulePreviewRef.current?.refresh ===
                        'function'
                    ) {
                        // 下拉刷新必須強制重抓，不可吃 45s 列表 cache
                        await teamSchedulePreviewRef.current.refresh({
                            force: true,
                        });
                    }
                })(),
            ]);
            if (results[0].status === 'rejected') {
                presentHarborError(results[0].reason);
            }
            // results[3] Scheduling 失敗：由 PreviewSection 自行顯示錯誤 UI
        } finally {
            setIsRefreshing(false);
        }
    };

    // 暫時關閉下滑頂部頭像動畫
    // const handleScroll = React.useMemo(
    //     () =>
    //         Animated.event(
    //             [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    //             { useNativeDriver: false },
    //         ),
    //     [scrollY],
    // );

    const harborError = error ? (
        <View
            style={[
                styles.harborError,
                {
                    backgroundColor: theme.tonal.unread15,
                    borderColor: theme.tonal.unread30,
                },
            ]}>
            <Text
                style={[
                    styles.harborErrorText,
                    { color: theme.black.second },
                ]}>
                {error.code === 'HARBOR_SESSION_EXPIRED'
                    ? t('Harbor 登入已失效，請重新登入。', {
                        ns: 'my',
                    })
                    : t(
                        '無法完成 Harbor 操作，請稍後再試。',
                        { ns: 'my' },
                    )}
            </Text>
        </View>
    ) : null;

    return (
        <View style={[styles.container, { backgroundColor: theme.bg_color }]}>
            <Animated.ScrollView
                contentInsetAdjustmentBehavior="never"
                showsVerticalScrollIndicator={false}
                // onScroll={handleScroll}
                // scrollEventThrottle={16}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: contentTopInset,
                        paddingBottom: insets.bottom + verticalScale(92),
                    },
                ]}
                refreshControl={
                    isSignedIn ? (
                        <RefreshControl
                            refreshing={isRefreshing}
                            tintColor={theme.themeColor}
                            colors={[theme.themeColor]}
                            progressViewOffset={contentTopInset}
                            onRefresh={handleRefresh}
                        />
                    ) : undefined
                }>
                <View style={{ width: contentWidth }}>
                    <HarborPageHeader
                        compact={isSignedIn}
                        // user={isSignedIn ? user : undefined}
                        // scrollY={scrollY}
                        onSettingsPress={() =>
                            navigation.navigate('SettingPage')
                        }
                    />
                    {harborError}
                    {isSignedIn ? (
                        <>
                            {shouldShowHarborPrompt ? (
                                <View
                                    style={[
                                        styles.pushPrompt,
                                        {
                                            backgroundColor:
                                                theme.tonal.primary15,
                                            borderColor:
                                                theme.tonal.primary30,
                                        },
                                    ]}>
                                    <View
                                        style={[
                                            styles.pushPromptAccent,
                                            {
                                                backgroundColor:
                                                    theme.themeColor,
                                            },
                                        ]}
                                    />
                                    <Pressable
                                        accessibilityRole="button"
                                        style={styles.pushPromptText}
                                        onPress={openHarborPushSettings}>
                                        <Text
                                            style={[
                                                styles.pushPromptTitle,
                                                {color: theme.black.main},
                                            ]}>
                                            {t(
                                                isHarborPushSetupIncomplete
                                                    ? '完成 Harbor 推送設定'
                                                    : '開啟 Harbor 推送通知',
                                                {ns: 'my'},
                                            )}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.pushPromptDescription,
                                                {color: theme.black.second},
                                            ]}>
                                            {t(
                                                isHarborPushSetupIncomplete
                                                    ? '推送設定尚未完成，請前往查看或重試。'
                                                    : '收到新回覆時以中性內容提醒你。',
                                                {ns: 'my'},
                                            )}
                                        </Text>
                                    </Pressable>
                                    <View style={styles.pushPromptActions}>
                                        <Pressable
                                            accessibilityRole="button"
                                            style={({pressed}) => [
                                                styles.pushPromptGo,
                                                {
                                                    backgroundColor:
                                                        theme.tonal.primary30,
                                                },
                                                pressed && {
                                                    backgroundColor:
                                                        theme.tonal.primary50,
                                                },
                                            ]}
                                            onPress={openHarborPushSettings}>
                                            <Text
                                                style={[
                                                    styles.pushPromptGoText,
                                                    {color: theme.themeColor},
                                                ]}>
                                                {t('前往', {ns: 'my'})}
                                            </Text>
                                        </Pressable>
                                        {!isHarborPushSetupIncomplete ? (
                                            <Pressable
                                                accessibilityRole="button"
                                                hitSlop={8}
                                                onPress={() => {
                                                    trigger();
                                                    dismissHarborPushPrompt().catch(
                                                        () => {},
                                                    );
                                                }}>
                                                <Text
                                                    style={[
                                                        styles.pushPromptDismiss,
                                                        {color: theme.black.third},
                                                    ]}>
                                                    {t('暫不顯示', {ns: 'my'})}
                                                </Text>
                                            </Pressable>
                                        ) : null}
                                    </View>
                                </View>
                            ) : null}
                            <HarborProfileOverview
                                user={user}
                                unreadCount={inboxUnreadCount}
                                chatUnreadCount={chatUnreadCount}
                                navigation={navigation}
                                onChatPress={() =>
                                    navigation.navigate('HarborChatList')
                                }
                                onSettingsPress={() =>
                                    navigation.navigate('SettingPage')
                                }
                            />
                            <TeamSchedulePreviewSection
                                ref={teamSchedulePreviewRef}
                                navigation={navigation}
                            />
                            <Text
                                style={[
                                    styles.footnote,
                                    {color: theme.black.third},
                                ]}>
                                {t('更新可能會有延遲', {ns: 'my'})}
                            </Text>
                        </>
                    ) : status === 'restoring' ? (
                        <HarborRestoringState />
                    ) : (
                        <HarborGuestState
                            isAuthorizing={status === 'authorizing'}
                            onLogin={handleLogin}
                            onBrowse={handleBrowseForum}
                        />
                    )}
                </View>
            </Animated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: scale(10),
    },
    harborError: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(10),
        marginBottom: verticalScale(10),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(10),
    },
    harborErrorText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
    },
    pushPrompt: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(14),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        marginBottom: verticalScale(10),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(11),
    },
    pushPromptText: {
        flex: 1,
    },
    pushPromptAccent: {
        alignSelf: 'stretch',
        borderRadius: scale(2),
        width: scale(4),
    },
    pushPromptTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '680',
    },
    pushPromptDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(14),
        marginTop: verticalScale(3),
    },
    pushPromptDismiss: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
    },
    pushPromptActions: {
        alignItems: 'center',
        gap: verticalScale(6),
    },
    pushPromptGo: {
        borderRadius: scale(12),
        minWidth: scale(52),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(7),
    },
    pushPromptGoText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '680',
        textAlign: 'center',
    },
    footnote: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(13),
        textAlign: 'center',
        paddingHorizontal: scale(12),
        paddingTop: verticalScale(8),
        paddingBottom: verticalScale(2),
    },
});

export default MyScreen;
