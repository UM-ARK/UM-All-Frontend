import React from 'react';
import {
    Alert,
    RefreshControl,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';

import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Reanimated, {
    Easing,
    FadeInDown,
    ReduceMotion,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../../../components/AppText';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { trigger } from '../../../utils/trigger';
import TeamSchedulePreviewSection from '../../TeamSchedule/components/TeamSchedulePreviewSection';
import HarborGuestState from './components/HarborGuestState';
import HarborPageHeader from './components/HarborPageHeader';
import HarborProfileOverview from './components/HarborProfileOverview';
import HarborRestoringState from './components/HarborRestoringState';

const PROFILE_BACKDROP_SOURCE = require('../../../static/img/ark_brand_waves.png');
const PAGE_GUTTER = scale(16);
const PROFILE_BACKDROP_ENTRANCE = FadeInDown
    .duration(280)
    .easing(Easing.bezier(0.23, 1, 0.32, 1))
    .withInitialValues({ opacity: 0.7, translateY: verticalScale(10) })
    .reduceMotion(ReduceMotion.System);

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
        reviewCount,
        refresh,
        refreshInboxUnreadCount,
        refreshChatUnreadCount,
        refreshReviewCount,
    } = useHarborSession();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const contentWidth = Math.min(
        width - insets.left - insets.right - PAGE_GUTTER * 2,
        scale(680),
    );
    const contentTopInset = insets.top + verticalScale(8);
    const profileBackdropHeight = contentTopInset + verticalScale(92);
    const isSignedIn = status === 'signedIn' && !!user;
    const backgroundColor = theme.isLight
        ? (isSignedIn ? theme.bg_color : theme.white)
        : theme.harbor_bg_color;
    // 漸變只改變頁面底色的透明度，避免混入黑色。
    const fadeStartColor = backgroundColor.length === 4
        ? `${backgroundColor}0`
        : `${backgroundColor}00`;
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const [hasEnteredProfile, setHasEnteredProfile] = React.useState(false);
    const teamSchedulePreviewRef = React.useRef(null);
    const scrollY = useSharedValue(0);

    const handleScroll = useAnimatedScrollHandler(event => {
        scrollY.set(event.contentOffset.y);
    });
    const profileArtStyle = useAnimatedStyle(() => {
        const offset = scrollY.get();
        const pullDistance = Math.max(0, -offset);
        // 下拉時從頂部延伸海浪，底端和頭像區同步往下移。
        return {
            transform: [
                { translateY: -Math.max(0, offset) },
                { scaleY: 1 + pullDistance / profileBackdropHeight },
            ],
        };
    });
    const profileBackdropStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: -scrollY.get() }],
    }));

    useFocusEffect(
        React.useCallback(() => {
            if (isSignedIn) {
                setHasEnteredProfile(true);
            }
        }, [isSignedIn]),
    );

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

    const handleRefresh = async () => {
        trigger();
        setIsRefreshing(true);
        try {
            // Harbor 與 Scheduling 隔離：Scheduling 失敗不彈 Harbor 錯誤
            const results = await Promise.allSettled([
                refresh(),
                refreshInboxUnreadCount(),
                refreshChatUnreadCount(),
                refreshReviewCount(),
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
            // results[4] Scheduling 失敗：由 PreviewSection 自行顯示錯誤 UI
        } finally {
            setIsRefreshing(false);
        }
    };

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
        <View style={[styles.container, { backgroundColor }]}>
            {isSignedIn && hasEnteredProfile ? (
                <Reanimated.View
                    pointerEvents="none"
                    style={[
                        styles.profileBackdrop,
                        styles.profileBackdropArtClip,
                        { height: profileBackdropHeight },
                        profileArtStyle,
                    ]}>
                    <Reanimated.View
                        entering={PROFILE_BACKDROP_ENTRANCE}
                        style={styles.profileBackdropArt}>
                        <Image
                            source={PROFILE_BACKDROP_SOURCE}
                            blurRadius={16}
                            style={[
                                StyleSheet.absoluteFill,
                                { opacity: theme.isLight ? 0.36 : 0.24 },
                            ]}
                        />
                    </Reanimated.View>
                </Reanimated.View>
            ) : null}
            {isSignedIn ? (
                <Reanimated.View
                    pointerEvents="none"
                    style={[
                        styles.profileBackdrop,
                        { height: profileBackdropHeight },
                        profileBackdropStyle,
                    ]}>
                    <LinearGradient
                        colors={[fadeStartColor, backgroundColor]}
                        style={StyleSheet.absoluteFill}
                    />
                </Reanimated.View>
            ) : null}
            <Reanimated.ScrollView
                contentInsetAdjustmentBehavior="never"
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
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
                        onSettingsPress={() =>
                            navigation.navigate('SettingPage')
                        }
                    />
                    {harborError}
                    {isSignedIn ? (
                        <HarborProfileOverview
                            user={user}
                            unreadCount={inboxUnreadCount}
                            chatUnreadCount={chatUnreadCount}
                            reviewCount={reviewCount}
                            navigation={navigation}
                            onChatPress={() =>
                                navigation.navigate('HarborChatList')
                            }
                            onSettingsPress={() =>
                                navigation.navigate('SettingPage')
                            }
                            teamSchedule={
                                <TeamSchedulePreviewSection
                                    ref={teamSchedulePreviewRef}
                                    navigation={navigation}
                                />
                            }
                        />
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
            </Reanimated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
    },
    profileBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    profileBackdropArtClip: {
        transformOrigin: 'center top',
    },
    profileBackdropArt: {
        position: 'absolute',
        top: -verticalScale(12),
        bottom: -verticalScale(12),
        left: 0,
        right: 0,
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
});

export default MyScreen;
