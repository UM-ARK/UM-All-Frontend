import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

import { Image } from 'expo-image';
import Clipboard from '@react-native-clipboard/clipboard';
import { MenuView } from '@expo/ui/community/menu';
import { useTranslation } from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-simple-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { uiStyle, useTheme } from '../../../components/ThemeContext';
import TouchableScale from '../../../components/TouchableScale';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { openLink } from '../../../utils/browser';
import {
    ARK_HARBOR,
    ARK_HARBOR_FEEDBACK,
    MAIL,
} from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';

const AVATAR_SOURCE = require('../../../static/img/logo_round.png');

const MyScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { black, bg_color, themeColor, tonal, trueWhite, white, viewShadow } =
        theme;
    const { t } = useTranslation(['common', 'my']);
    const { status, user, login, logout, error } = useHarborSession();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const contentWidth = Math.min(width - scale(28), scale(680));
    const isAuthorizing = status === 'authorizing';
    const username = user?.username ?? '';
    const userStats = user?.stats ?? [];
    const userActivity = user?.activity ?? [];
    const lastPresentedError = React.useRef(null);

    const presentHarborError = React.useCallback(
        sessionError => {
            if (
                !sessionError ||
                lastPresentedError.current === sessionError
            ) {
                return;
            }

            lastPresentedError.current = sessionError;
            const message = sessionError.code === 'HARBOR_SESSION_EXPIRED'
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

    React.useEffect(() => {
        if (error) {
            presentHarborError(error);
        } else {
            lastPresentedError.current = null;
        }
    }, [error, presentHarborError]);

    const feedbackActions = [
        {
            id: 'harbor',
            title: 'Harbor ⭐️',
            image: 'star.fill',
            imageColor: themeColor,
            titleColor: themeColor,
        },
        {
            id: 'email',
            title: 'Email',
            image: 'envelope',
            imageColor: themeColor,
            titleColor: themeColor,
        },
    ];

    const accountActions = [
        {
            key: 'topics',
            label: t('我的話題', { ns: 'my' }),
            icon: 'chatbox-ellipses-outline',
            path: `/u/${username}/activity/topics`,
        },
        {
            key: 'replies',
            label: t('我的回覆', { ns: 'my' }),
            icon: 'arrow-undo-outline',
            path: `/u/${username}/activity/replies`,
        },
        {
            key: 'bookmarks',
            label: t('我的收藏', { ns: 'my' }),
            icon: 'bookmark-outline',
            path: `/u/${username}/activity/bookmarks`,
        },
        {
            key: 'likes',
            label: t('我的讚好', { ns: 'my' }),
            icon: 'heart-outline',
            path: `/u/${username}/activity/likes-given`,
        },
        {
            key: 'messages',
            label: t('站內訊息', { ns: 'my' }),
            icon: 'mail-outline',
            path: `/u/${username}/messages`,
            badge: user?.unreadMessages,
        },
        {
            key: 'badges',
            label: t('我的徽章', { ns: 'my' }),
            icon: 'ribbon-outline',
            path: `/u/${username}/badges`,
        },
    ];

    const guestFeatures = [
        {
            key: 'identity',
            icon: 'person-circle-outline',
            title: t('同步論壇身份', { ns: 'my' }),
            description: t('查看等級、徽章與個人統計', { ns: 'my' }),
        },
        {
            key: 'activity',
            icon: 'pulse-outline',
            title: t('集中管理互動', { ns: 'my' }),
            description: t('快速找到話題、回覆與收藏', { ns: 'my' }),
        },
        {
            key: 'message',
            icon: 'notifications-outline',
            title: t('不錯過新消息', { ns: 'my' }),
            description: t('集中查看站內訊息與通知', { ns: 'my' }),
        },
    ];

    const handleFeedbackAction = event => {
        trigger();
        switch (event.nativeEvent.event) {
            case 'harbor':
                openLink(ARK_HARBOR_FEEDBACK);
                break;
            case 'email':
                Clipboard.setString(MAIL);
                Toast.show(t('已複製Mail到剪貼板！'));
                Linking.openURL(`mailto:${MAIL}?subject=ARK功能反饋`);
                break;
            default:
                break;
        }
    };

    const handleSettingsPress = () => {
        trigger();
        navigation.navigate('SettingPage');
    };

    const handleOpenHarbor = (path = '') => {
        trigger();
        openLink({ URL: `${ARK_HARBOR}${path}`, mode: 'fullScreen' });
    };

    const handleLoginPress = async () => {
        trigger();
        lastPresentedError.current = null;

        try {
            await login();
        } catch (sessionError) {
            presentHarborError(sessionError);
        }
    };

    const handleLogoutPress = () => {
        trigger();
        Alert.alert(
            t('登出 Harbor？', { ns: 'my' }),
            t('你將從此裝置的 Harbor 帳號登出。', { ns: 'my' }),
            [
                {
                    text: t('取消', { ns: 'my' }),
                    style: 'cancel',
                    onPress: () => trigger(),
                },
                {
                    text: t('確認登出', { ns: 'my' }),
                    style: 'destructive',
                    onPress: async () => {
                        trigger();
                        lastPresentedError.current = null;

                        try {
                            await logout();
                        } catch (sessionError) {
                            presentHarborError(sessionError);
                        }
                    },
                },
            ],
            { cancelable: false },
        );
    };

    const renderHeader = () => (
        <View style={[styles.header, { width: contentWidth }]}>
            <View>
                <Text style={[styles.eyebrow, { color: themeColor }]}>
                    ARK ALL
                </Text>
                <Text style={[styles.pageTitle, { color: black.main }]}>
                    {t('個人中心', { ns: 'my' })}
                </Text>
            </View>

            <View style={styles.headerActions}>
                <MenuView
                    actions={feedbackActions}
                    onOpenMenu={() => trigger()}
                    onPressAction={handleFeedbackAction}
                    shouldOpenOnLongPress={false}
                    style={styles.headerActionButton}>
                    <TouchableScale
                        accessibilityLabel={t('反饋')}
                        accessibilityRole="button"
                        style={[
                            styles.headerActionButton,
                            { backgroundColor: tonal.primary15 },
                        ]}>
                        <MaterialIcons
                            name="feedback"
                            size={verticalScale(22)}
                            color={themeColor}
                        />
                    </TouchableScale>
                </MenuView>

                <TouchableScale
                    accessibilityLabel={t('設置')}
                    accessibilityRole="button"
                    style={[
                        styles.headerActionButton,
                        { backgroundColor: tonal.primary15 },
                    ]}
                    onPress={handleSettingsPress}>
                    <Ionicons
                        name="settings-outline"
                        size={verticalScale(23)}
                        color={themeColor}
                    />
                </TouchableScale>
            </View>
        </View>
    );

    const renderGuestScreen = () => (
        <View style={[styles.screenContent, { width: contentWidth }]}>
            <View
                style={[
                    styles.guestHero,
                    { backgroundColor: white },
                    viewShadow,
                ]}>
                <View
                    style={[
                        styles.guestIconWrap,
                        { backgroundColor: tonal.primary15 },
                    ]}>
                    <MaterialCommunityIcons
                        name="account-lock-outline"
                        size={scale(46)}
                        color={themeColor}
                    />
                </View>

                <View
                    style={[
                        styles.harborPill,
                        { backgroundColor: tonal.secondary15 },
                    ]}>
                    <MaterialCommunityIcons
                        name="forum-outline"
                        size={scale(14)}
                        color={theme.secondThemeColor}
                    />
                    <Text
                        style={[
                            styles.harborPillText,
                            { color: theme.secondThemeColor },
                        ]}>
                        ARK Harbor
                    </Text>
                </View>

                <Text style={[styles.guestTitle, { color: black.main }]}>
                    {t('登入你的論壇帳號', { ns: 'my' })}
                </Text>
                <Text style={[styles.guestDescription, { color: black.third }]}>
                    {t('在一個地方查看你的 Harbor 身份、互動記錄與消息。', {
                        ns: 'my',
                    })}
                </Text>

                <TouchableScale
                    accessibilityRole="button"
                    accessibilityLabel={t(
                        isAuthorizing ? '處理中…' : '登入 Harbor',
                        { ns: 'my' },
                    )}
                    accessibilityState={{
                        busy: isAuthorizing,
                        disabled: isAuthorizing,
                    }}
                    activeScale={0.97}
                    disabled={isAuthorizing}
                    style={[
                        styles.primaryButton,
                        { backgroundColor: themeColor },
                        isAuthorizing && styles.disabledButton,
                    ]}
                    onPress={handleLoginPress}>
                    {isAuthorizing ? (
                        <ActivityIndicator color={trueWhite} />
                    ) : (
                        <Ionicons
                            name="log-in-outline"
                            size={scale(20)}
                            color={trueWhite}
                        />
                    )}
                    <Text
                        style={[styles.primaryButtonText, { color: trueWhite }]}>
                        {t(isAuthorizing ? '處理中…' : '登入 Harbor', {
                            ns: 'my',
                        })}
                    </Text>
                </TouchableScale>

                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('先逛逛論壇', { ns: 'my' })}
                    style={({ pressed }) => [
                        styles.secondaryButton,
                        {
                            backgroundColor: pressed
                                ? tonal.primary30
                                : tonal.primary15,
                        },
                    ]}
                    onPress={() => handleOpenHarbor()}>
                    <Text
                        style={[
                            styles.secondaryButtonText,
                            { color: themeColor },
                        ]}>
                        {t('先逛逛論壇', { ns: 'my' })}
                    </Text>
                    <Ionicons
                        name="arrow-forward"
                        size={scale(16)}
                        color={themeColor}
                    />
                </Pressable>

                <View style={styles.securityNote}>
                    <Ionicons
                        name="shield-checkmark-outline"
                        size={scale(15)}
                        color={black.third}
                    />
                    <Text style={[styles.securityText, { color: black.third }]}>
                        {t('將前往 Harbor 官方頁面安全登入', { ns: 'my' })}
                    </Text>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: black.main }]}>
                    {t('登入後可使用', { ns: 'my' })}
                </Text>
            </View>

            <View
                style={[
                    styles.featureCard,
                    { backgroundColor: white },
                    viewShadow,
                ]}>
                {guestFeatures.map((feature, index) => (
                    <View key={feature.key}>
                        <View style={styles.featureRow}>
                            <View
                                style={[
                                    styles.featureIcon,
                                    { backgroundColor: tonal.primary15 },
                                ]}>
                                <Ionicons
                                    name={feature.icon}
                                    size={scale(21)}
                                    color={themeColor}
                                />
                            </View>
                            <View style={styles.featureTextWrap}>
                                <Text
                                    style={[
                                        styles.featureTitle,
                                        { color: black.main },
                                    ]}>
                                    {feature.title}
                                </Text>
                                <Text
                                    style={[
                                        styles.featureDescription,
                                        { color: black.third },
                                    ]}>
                                    {feature.description}
                                </Text>
                            </View>
                        </View>
                        {index < guestFeatures.length - 1 ? (
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
                    </View>
                ))}
            </View>
        </View>
    );

    const renderRestoringScreen = () => (
        <View
            style={[
                styles.restoringCard,
                { width: contentWidth, backgroundColor: white },
                viewShadow,
            ]}>
            <ActivityIndicator size="large" color={themeColor} />
            <Text style={[styles.restoringText, { color: black.third }]}>
                {t('正在恢復 Harbor 登入狀態…', { ns: 'my' })}
            </Text>
        </View>
    );

    const renderLoggedInScreen = () => (
        <View style={[styles.screenContent, { width: contentWidth }]}>
            <TouchableScale
                accessibilityRole="button"
                accessibilityLabel={t('查看 Harbor 個人資料', { ns: 'my' })}
                activeScale={0.98}
                style={[
                    styles.profileCard,
                    { backgroundColor: white },
                    viewShadow,
                ]}
                onPress={() =>
                    handleOpenHarbor(username ? `/u/${username}/summary` : '')
                }>
                <View style={styles.profileTopRow}>
                    <View
                        style={[
                            styles.avatarRing,
                            { backgroundColor: tonal.primary30 },
                        ]}>
                        <Image
                            source={
                                user?.avatarUrl
                                    ? { uri: user.avatarUrl }
                                    : AVATAR_SOURCE
                            }
                            style={styles.avatar}
                            contentFit="cover"
                        />
                        <View
                            style={[
                                styles.onlineDot,
                                {
                                    backgroundColor: theme.success,
                                    borderColor: white,
                                },
                            ]}
                        />
                    </View>

                    <View style={styles.profileIdentity}>
                        <View style={styles.nameRow}>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.profileName,
                                    { color: black.main },
                                ]}>
                                {user?.displayName}
                            </Text>
                            <Ionicons
                                name="shield-checkmark"
                                size={scale(18)}
                                color={themeColor}
                            />
                        </View>
                        <Text
                            style={[
                                styles.profileHandle,
                                { color: black.third },
                            ]}>
                            @{username}
                        </Text>
                        <View style={styles.profileMetaRow}>
                            <View
                                style={[
                                    styles.roleBadge,
                                    { backgroundColor: tonal.primary15 },
                                ]}>
                                <Text
                                    style={[
                                        styles.roleBadgeText,
                                        { color: themeColor },
                                    ]}>
                                    {user?.role
                                        ? t(user.role, { ns: 'my' })
                                        : ''}
                                </Text>
                            </View>
                            <Text
                                style={[styles.joinedAt, { color: black.third }]}>
                                {user?.joinedAt
                                    ? t(user.joinedAt, { ns: 'my' })
                                    : ''}
                            </Text>
                        </View>
                    </View>

                    <Ionicons
                        name="chevron-forward"
                        size={scale(20)}
                        color={black.third}
                    />
                </View>

                <View
                    style={[
                        styles.profileStatus,
                        { backgroundColor: tonal.secondary08 },
                    ]}>
                    <MaterialCommunityIcons
                        name="forum"
                        size={scale(17)}
                        color={theme.secondThemeColor}
                    />
                    <Text
                        style={[
                            styles.profileStatusText,
                            { color: black.second },
                        ]}>
                        {t('Harbor 帳號已連接', { ns: 'my' })}
                    </Text>
                    <View style={styles.flexSpacer} />
                    <Text
                        style={[
                            styles.viewProfileText,
                            { color: theme.secondThemeColor },
                        ]}>
                        {t('查看資料', { ns: 'my' })}
                    </Text>
                </View>
            </TouchableScale>

            {userStats.length > 0 ? (
                <View
                    style={[
                        styles.statsCard,
                        { backgroundColor: white },
                        viewShadow,
                    ]}>
                    {userStats.map((stat, index) => (
                        <View key={stat.key} style={styles.statItem}>
                            <Text style={[styles.statValue, { color: black.main }]}>
                                {stat.value}
                            </Text>
                            <Text style={[styles.statLabel, { color: black.third }]}>
                                {t(stat.label, { ns: 'my' })}
                            </Text>
                            {index < userStats.length - 1 ? (
                                <View
                                    style={[
                                        styles.statDivider,
                                        {
                                            backgroundColor:
                                                theme.themeColorUltraLight,
                                        },
                                    ]}
                                />
                            ) : null}
                        </View>
                    ))}
                </View>
            ) : null}

            {username ? (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: black.main }]}>
                            {t('我的 Harbor', { ns: 'my' })}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() =>
                                handleOpenHarbor(`/u/${username}/activity`)
                            }>
                            <Text
                                style={[
                                    styles.sectionLink,
                                    { color: themeColor },
                                ]}>
                                {t('全部活動', { ns: 'my' })}
                            </Text>
                        </Pressable>
                    </View>

                    <View
                        style={[
                            styles.actionsCard,
                            { backgroundColor: white },
                            viewShadow,
                        ]}>
                        {accountActions.map(action => (
                            <TouchableScale
                                key={action.key}
                                accessibilityRole="button"
                                accessibilityLabel={action.label}
                                activeScale={0.94}
                                style={styles.actionItem}
                                onPress={() => handleOpenHarbor(action.path)}>
                                <View
                                    style={[
                                        styles.actionIcon,
                                        { backgroundColor: tonal.primary15 },
                                    ]}>
                                    <Ionicons
                                        name={action.icon}
                                        size={scale(23)}
                                        color={themeColor}
                                    />
                                    {action.badge ? (
                                        <View
                                            style={[
                                                styles.actionBadge,
                                                { backgroundColor: theme.unread },
                                            ]}>
                                            <Text
                                                style={[
                                                    styles.actionBadgeText,
                                                    { color: trueWhite },
                                                ]}>
                                                {action.badge}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.actionLabel,
                                        { color: black.second },
                                    ]}>
                                    {action.label}
                                </Text>
                            </TouchableScale>
                        ))}
                    </View>
                </>
            ) : null}

            {userActivity.length > 0 ? (
                <>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: black.main }]}>
                            {t('近期活動', { ns: 'my' })}
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.activityCard,
                            { backgroundColor: white },
                            viewShadow,
                        ]}>
                        {userActivity.map((activity, index) => (
                            <Pressable
                                key={activity.id}
                                accessibilityRole="button"
                                style={({ pressed }) => [
                                    styles.activityRow,
                                    pressed && {
                                        backgroundColor: tonal.primary08,
                                    },
                                ]}
                                onPress={() =>
                                    handleOpenHarbor(
                                        `/u/${username}/activity`,
                                    )
                                }>
                                <View
                                    style={[
                                        styles.activityMarker,
                                        {
                                            backgroundColor: tonal.primary15,
                                        },
                                    ]}>
                                    <MaterialCommunityIcons
                                        name={
                                            index === 2
                                                ? 'reply-outline'
                                                : 'post-outline'
                                        }
                                        size={scale(19)}
                                        color={themeColor}
                                    />
                                </View>
                                <View style={styles.activityTextWrap}>
                                    <Text
                                        numberOfLines={2}
                                        style={[
                                            styles.activityTitle,
                                            { color: black.main },
                                        ]}>
                                        {activity.title}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.activityMeta,
                                            { color: black.third },
                                        ]}>
                                        {t(activity.meta, { ns: 'my' })}
                                    </Text>
                                </View>
                                <Ionicons
                                    name="chevron-forward"
                                    size={scale(17)}
                                    color={black.third}
                                />
                            </Pressable>
                        ))}
                    </View>
                </>
            ) : null}

            <TouchableScale
                accessibilityRole="button"
                accessibilityLabel={t('登出 Harbor', { ns: 'my' })}
                activeScale={0.97}
                style={[
                    styles.logoutButton,
                    {
                        backgroundColor: tonal.primary08,
                        borderColor: theme.unread,
                    },
                ]}
                onPress={handleLogoutPress}>
                <Ionicons
                    name="log-out-outline"
                    size={scale(19)}
                    color={theme.unread}
                />
                <Text style={[styles.logoutButtonText, { color: theme.unread }]}>
                    {t('登出 Harbor', { ns: 'my' })}
                </Text>
            </TouchableScale>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: bg_color }]}>
            <ScrollView
                contentInsetAdjustmentBehavior="never"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: insets.top + verticalScale(8),
                        paddingBottom: insets.bottom + verticalScale(92),
                    },
                ]}>
                {renderHeader()}
                {status === 'restoring'
                    ? renderRestoringScreen()
                    : status === 'signedIn'
                      ? renderLoggedInScreen()
                      : renderGuestScreen()}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: scale(14),
    },
    header: {
        minHeight: verticalScale(54),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: verticalScale(16),
    },
    eyebrow: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
        letterSpacing: scale(1.4),
        marginBottom: verticalScale(2),
    },
    pageTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(27),
        fontWeight: '750',
        letterSpacing: scale(-0.5),
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    headerActionButton: {
        width: scale(42),
        height: scale(42),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(21),
    },
    screenContent: {
        gap: verticalScale(12),
    },
    guestHero: {
        alignItems: 'center',
        borderRadius: scale(24),
        paddingHorizontal: scale(22),
        paddingTop: verticalScale(28),
        paddingBottom: verticalScale(22),
    },
    guestIconWrap: {
        width: scale(84),
        height: scale(84),
        borderRadius: scale(42),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(14),
    },
    harborPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
        borderRadius: scale(20),
        marginBottom: verticalScale(12),
    },
    harborPillText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '650',
    },
    guestTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(23),
        fontWeight: '750',
        textAlign: 'center',
    },
    guestDescription: {
        ...uiStyle.defaultText,
        maxWidth: scale(310),
        fontSize: scale(14),
        lineHeight: verticalScale(21),
        textAlign: 'center',
        marginTop: verticalScale(8),
        marginBottom: verticalScale(20),
    },
    primaryButton: {
        width: '100%',
        minHeight: verticalScale(48),
        borderRadius: scale(15),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        paddingHorizontal: scale(18),
    },
    primaryButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '700',
    },
    disabledButton: {
        opacity: 0.65,
    },
    secondaryButton: {
        width: '100%',
        minHeight: verticalScale(44),
        borderRadius: scale(14),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        marginTop: verticalScale(9),
        paddingHorizontal: scale(18),
    },
    secondaryButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '650',
    },
    securityNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(5),
        marginTop: verticalScale(14),
    },
    securityText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
    },
    sectionHeader: {
        minHeight: verticalScale(32),
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: scale(4),
        paddingTop: verticalScale(4),
    },
    sectionTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '720',
    },
    sectionLink: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
        paddingVertical: verticalScale(4),
    },
    featureCard: {
        borderRadius: scale(20),
        paddingVertical: verticalScale(4),
        paddingHorizontal: scale(16),
    },
    featureRow: {
        minHeight: verticalScale(72),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    featureIcon: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(13),
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTextWrap: {
        flex: 1,
    },
    featureTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '650',
        marginBottom: verticalScale(3),
    },
    featureDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(17),
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: scale(54),
    },
    restoringCard: {
        minHeight: verticalScale(180),
        borderRadius: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
        gap: verticalScale(14),
        padding: scale(24),
    },
    restoringText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        textAlign: 'center',
    },
    profileCard: {
        borderRadius: scale(22),
        padding: scale(18),
    },
    profileTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarRing: {
        width: scale(70),
        height: scale(70),
        borderRadius: scale(24),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(13),
    },
    avatar: {
        width: scale(62),
        height: scale(62),
        borderRadius: scale(20),
    },
    onlineDot: {
        position: 'absolute',
        right: scale(2),
        bottom: scale(2),
        width: scale(13),
        height: scale(13),
        borderRadius: scale(7),
        borderWidth: scale(2),
    },
    profileIdentity: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
    },
    profileName: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(18),
        fontWeight: '750',
    },
    profileHandle: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        marginTop: verticalScale(2),
    },
    profileMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: scale(7),
        marginTop: verticalScale(8),
    },
    roleBadge: {
        borderRadius: scale(8),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(3),
    },
    roleBadgeText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
    },
    joinedAt: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
    },
    profileStatus: {
        minHeight: verticalScale(38),
        borderRadius: scale(12),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(7),
        paddingHorizontal: scale(12),
        marginTop: verticalScale(16),
    },
    profileStatusText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '550',
    },
    flexSpacer: {
        flex: 1,
    },
    viewProfileText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '650',
    },
    statsCard: {
        minHeight: verticalScale(78),
        borderRadius: scale(20),
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: verticalScale(12),
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(3),
    },
    statValue: {
        ...uiStyle.defaultText,
        fontSize: scale(16),
        fontWeight: '750',
        textAlign: 'center',
    },
    statLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        textAlign: 'center',
        marginTop: verticalScale(5),
    },
    statDivider: {
        position: 'absolute',
        right: 0,
        width: StyleSheet.hairlineWidth,
        height: verticalScale(34),
    },
    actionsCard: {
        borderRadius: scale(20),
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingTop: verticalScale(16),
        paddingBottom: verticalScale(4),
    },
    actionItem: {
        width: '33.333%',
        alignItems: 'center',
        paddingHorizontal: scale(4),
        paddingBottom: verticalScale(16),
    },
    actionIcon: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(16),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(7),
    },
    actionBadge: {
        position: 'absolute',
        top: scale(-4),
        right: scale(-4),
        minWidth: scale(18),
        height: scale(18),
        borderRadius: scale(9),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(4),
    },
    actionBadgeText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '800',
    },
    actionLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '550',
        textAlign: 'center',
    },
    activityCard: {
        borderRadius: scale(20),
        overflow: 'hidden',
    },
    activityRow: {
        minHeight: verticalScale(72),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(10),
        gap: scale(11),
    },
    activityMarker: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(13),
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityTextWrap: {
        flex: 1,
    },
    activityTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
        lineHeight: verticalScale(18),
    },
    activityMeta: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(4),
    },
    logoutButton: {
        minHeight: verticalScale(46),
        borderRadius: scale(14),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(7),
        paddingHorizontal: scale(18),
    },
    logoutButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '650',
    },
});

export default MyScreen;
