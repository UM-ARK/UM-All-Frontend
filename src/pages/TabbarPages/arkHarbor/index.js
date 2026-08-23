import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    AppState,
    Pressable,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import { createDrawerNavigator } from '@react-navigation/drawer';
import { useIsFocused } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { SafeAreaView } from 'react-native-screens/experimental';
import { useTranslation } from 'react-i18next';

import Text from '../../../components/AppText';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import {
    fetchHarborSiteCapabilities,
    getHarborTopicViews,
} from '../../../utils/harbor/harborApi';
import { trigger } from '../../../utils/trigger';
import HarborLoginConsentModal from '../my/components/HarborLoginConsentModal';
import HarborDrawerContent from './components/HarborDrawerContent';
import HarborTopicList from './components/HarborTopicList';

const VIEW_CONFIG = {
    latest: { label: '最新', analytics: 'latest' },
    top: { label: '熱門', analytics: 'top' },
    unread: { label: '未讀', analytics: 'unread' },
};
// 對齊資訊頁 Top Tab（~30），並預留搜尋列高度
const STICKY_TOOLBAR_HEIGHT = verticalScale(36);
const SEARCH_BAR_ROW_HEIGHT = verticalScale(38);
const HARBOR_TAB_INDICATOR_WIDTH = moderateScale(25, 0.1);
const Drawer = createDrawerNavigator();
const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

const HarborFeedTabs = ({ options, selectedIndex, position, onChange }) => {
    const { theme } = useTheme();
    const [indicatorOffsets, setIndicatorOffsets] = useState({});
    const hasMeasuredAllOptions = options.every(
        option => indicatorOffsets[option.key] !== undefined,
    );
    const indicatorInputRange =
        options.length > 1 ? options.map((option, index) => index) : [0, 1];
    const indicatorOutputRange =
        options.length > 1
            ? options.map(option => indicatorOffsets[option.key] ?? 0)
            : [
                indicatorOffsets[options[0]?.key] ?? 0,
                indicatorOffsets[options[0]?.key] ?? 0,
            ];
    const translateX = position.interpolate({
        inputRange: indicatorInputRange,
        outputRange: indicatorOutputRange,
        extrapolate: 'clamp',
    });

    const handleOptionLayout = useCallback((key, event) => {
        const { x, width } = event.nativeEvent.layout;
        const nextOffset = x + (width - HARBOR_TAB_INDICATOR_WIDTH) / 2;
        setIndicatorOffsets(current =>
            current[key] === nextOffset
                ? current
                : { ...current, [key]: nextOffset },
        );
    }, []);

    return (
        <View style={styles.feedTabs}>
            {options.map((option, index) => {
                const isSelected = selectedIndex === index;

                return (
                    <Pressable
                        key={option.key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: isSelected }}
                        onLayout={event => handleOptionLayout(option.key, event)}
                        onPress={() => {
                            trigger();
                            onChange(index);
                        }}
                        style={({ pressed }) => [
                            styles.feedTab,
                            pressed && {
                                backgroundColor: theme.tonal.primary15,
                            },
                        ]}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.feedTabLabel,
                                {
                                    color: isSelected
                                        ? theme.themeColor
                                        : theme.black.third,
                                },
                                isSelected && styles.feedTabLabelSelected,
                            ]}>
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.feedTabIndicator,
                    hasMeasuredAllOptions
                        ? styles.feedTabIndicatorVisible
                        : styles.feedTabIndicatorHidden,
                    {
                        backgroundColor: theme.themeColor,
                        transform: [{ translateX }],
                    },
                ]}
            />
        </View>
    );
};

const HarborStickyToolbar = ({
    segmentOptions,
    currentIndex,
    tabPosition,
    onChange,
    status,
    sessionLabel,
    onSessionPress,
    onMenuPress,
    onChatPress,
    onComposePress,
    onSearchPress,
    chatUnreadCount,
    chatVisible,
    onToolbarLayout,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const isSignedIn = status === 'signedIn';
    const showLoginPromptBadge =
        status === 'signedOut' || status === 'expired';

    return (
        <View
            style={[styles.stickyHeader, { backgroundColor: theme.bg_color }]}>
            <View onLayout={onToolbarLayout} style={styles.stickyToolbar}>
                <View style={styles.toolbarSide}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('開啟選單')}
                        hitSlop={scale(8)}
                        onPress={() => {
                            trigger();
                            onMenuPress();
                        }}
                        style={({ pressed }) => [
                            styles.toolbarIconButton,
                            pressed && {
                                backgroundColor: theme.tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="menu"
                            size={scale(20)}
                            color={theme.themeColor}
                        />
                    </Pressable>
                </View>

                <HarborFeedTabs
                    options={segmentOptions}
                    selectedIndex={currentIndex}
                    position={tabPosition}
                    onChange={onChange}
                />

                <View style={[styles.toolbarSide, styles.toolbarRight]}>
                    <View style={styles.toolbarRightActions}>
                        {isSignedIn ? null : (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={sessionLabel}
                                disabled={
                                    status === 'restoring' ||
                                    status === 'authorizing'
                                }
                                onPress={() => {
                                    trigger();
                                    onSessionPress();
                                }}
                                style={({ pressed }) => [
                                    styles.sessionButton,
                                    pressed && {
                                        backgroundColor:
                                            theme.tonal.primary15,
                                    },
                                ]}>
                                <MaterialCommunityIcons
                                    name="login"
                                    size={scale(14)}
                                    color={theme.themeColor}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.sessionText,
                                        { color: theme.themeColor },
                                    ]}>
                                    {sessionLabel}
                                </Text>
                                {showLoginPromptBadge ? (
                                    <View
                                        pointerEvents="none"
                                        style={[
                                            styles.loginPromptBadge,
                                            {backgroundColor: theme.unread},
                                        ]}
                                    />
                                ) : null}
                            </Pressable>
                        )}
                        {isSignedIn && chatVisible ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t('Chat')}
                                hitSlop={scale(8)}
                                onPress={() => {
                                    trigger();
                                    onChatPress();
                                }}
                                style={({ pressed }) => [
                                    styles.toolbarIconButton,
                                    pressed && {
                                        backgroundColor:
                                            theme.tonal.primary15,
                                    },
                                ]}>
                                <MaterialCommunityIcons
                                    name="chat-outline"
                                    size={scale(19)}
                                    color={theme.themeColor}
                                />
                                {chatUnreadCount > 0 ? (
                                    <View
                                        style={[
                                            styles.chatUnreadBadge,
                                            {backgroundColor: theme.unread},
                                        ]}>
                                        <Text
                                            style={[
                                                styles.chatUnreadText,
                                                {color: theme.trueWhite},
                                            ]}>
                                            {chatUnreadCount > 99
                                                ? '99+'
                                                : chatUnreadCount}
                                        </Text>
                                    </View>
                                ) : null}
                            </Pressable>
                        ) : null}
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('建立話題')}
                            hitSlop={scale(8)}
                            onPress={() => {
                                trigger();
                                onComposePress();
                            }}
                            style={({ pressed }) => [
                                styles.toolbarIconButton,
                                pressed && {
                                    backgroundColor: theme.tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="plus"
                                size={scale(20)}
                                color={theme.themeColor}
                            />
                        </Pressable>
                    </View>
                </View>
            </View>
            <View style={styles.searchBarRow}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('搜尋 Harbor')}
                    onPress={() => {
                        trigger();
                        onSearchPress();
                    }}
                    style={({ pressed }) => [
                        styles.searchBar,
                        {
                            backgroundColor: theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                        pressed && { opacity: 0.85 },
                    ]}>
                    <MaterialCommunityIcons
                        name="magnify"
                        size={scale(16)}
                        color={theme.black.third}
                    />
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.searchBarText,
                            { color: theme.black.third },
                        ]}>
                        {t('搜尋 Harbor')}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

const HarborFeedPane = ({
    view,
    navigation,
    onCapabilities,
    isTopicPressAllowed,
    contentContainerStyle,
    refreshProgressViewOffset,
    isActive,
}) => {
    const source = useMemo(
        () =>
            view === 'unread'
                ? {view: 'latest', filter: 'unseen'}
                : {view},
        [view],
    );

    return (
        <View style={styles.feedPage}>
            <HarborTopicList
                source={source}
                navigation={navigation}
                onCapabilities={onCapabilities}
                isTopicPressAllowed={isTopicPressAllowed}
                contentContainerStyle={contentContainerStyle}
                refreshProgressViewOffset={refreshProgressViewOffset}
                isActive={isActive}
            />
        </View>
    );
};

/**
 * Harbor 原生首頁：多視圖話題列表（分類／標籤入口在側邊抽屜）。
 */
const ForumPage = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const {
        status,
        login,
        chatUnreadCount,
        refreshChatUnreadCount,
    } = useHarborSession();
    const isFocused = useIsFocused();
    const pagerRef = useRef(null);
    const pageScrollOffset = useRef(new Animated.Value(0)).current;
    const pageScrollPosition = useRef(new Animated.Value(0)).current;
    const currentViewRef = useRef('latest');
    const blockTopicPressUntilRef = useRef(0);
    const capabilitiesRef = useRef(null);
    const capabilitiesControllerRef = useRef(null);
    const hasLoggedHomeRef = useRef(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [toolbarHeight, setToolbarHeight] = useState(STICKY_TOOLBAR_HEIGHT);
    const [capabilities, setCapabilities] = useState(null);
    const [capabilitiesUnavailable, setCapabilitiesUnavailable] = useState(false);
    const [mountedViews, setMountedViews] = useState({
        latest: true,
        top: false,
        unread: false,
    });
    const [consentVisible, setConsentVisible] = useState(false);

    useEffect(() => {
        // 僅在首次聚焦時打點；iOS Native Tabs 會預先掛載，
        // 且從詳情頁返回也會再次聚焦，兩者都不可重複計算。
        if (!isFocused || hasLoggedHomeRef.current) {
            return;
        }
        hasLoggedHomeRef.current = true;
        logToFirebase('openPage', { page: 'HarborNativeHome' });
    }, [isFocused]);

    const loadCapabilities = useCallback(() => {
        capabilitiesControllerRef.current?.abort();
        const controller = new AbortController();
        capabilitiesControllerRef.current = controller;
        fetchHarborSiteCapabilities({ signal: controller.signal })
            .then(nextCapabilities => {
                if (!controller.signal.aborted) {
                    capabilitiesRef.current = nextCapabilities;
                    setCapabilities(nextCapabilities);
                    setCapabilitiesUnavailable(false);
                }
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    capabilitiesRef.current = null;
                    setCapabilitiesUnavailable(true);
                }
            })
            .finally(() => {
                if (capabilitiesControllerRef.current === controller) {
                    capabilitiesControllerRef.current = null;
                }
            });
    }, []);

    useEffect(() => {
        if (isFocused) {
            loadCapabilities();
            refreshChatUnreadCount().catch(() => {});
        }
    }, [isFocused, loadCapabilities, refreshChatUnreadCount, status]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            if (nextState === 'active' && isFocused) {
                loadCapabilities();
                refreshChatUnreadCount().catch(() => {});
            }
        });
        return () => subscription.remove();
    }, [isFocused, loadCapabilities, refreshChatUnreadCount]);

    useEffect(() => {
        return () => capabilitiesControllerRef.current?.abort();
    }, []);

    const enabledViews = useMemo(() => {
        const availableViews = getHarborTopicViews(capabilities, {
            signedIn: status === 'signedIn',
            unavailable: capabilitiesUnavailable,
        });
        const publicViews = availableViews.filter(
            view => view !== 'new' && view !== 'unread',
        );
        // 未讀分頁沿用最新列表的紅點判斷，只在登入後提供
        return status === 'signedIn'
            ? [...publicViews, 'unread']
            : publicViews;
    }, [capabilities, capabilitiesUnavailable, status]);

    const segmentOptions = useMemo(
        () =>
            enabledViews.map(view => ({
                key: view,
                label: t(VIEW_CONFIG[view].label),
            })),
        [enabledViews, t],
    );
    const tabPosition = useMemo(
        () => Animated.add(pageScrollPosition, pageScrollOffset),
        [pageScrollOffset, pageScrollPosition],
    );
    const handlePageScroll = useMemo(
        () =>
            Animated.event(
                [
                    {
                        nativeEvent: {
                            offset: pageScrollOffset,
                            position: pageScrollPosition,
                        },
                    },
                ],
                { useNativeDriver: true },
            ),
        [pageScrollOffset, pageScrollPosition],
    );
    const ensureMounted = useCallback(view => {
        setMountedViews(current =>
            current[view] ? current : { ...current, [view]: true },
        );
    }, []);

    const handleCapabilities = useCallback(
        nextCapabilities => {
            if (Array.isArray(nextCapabilities?.topicViews)) {
                capabilitiesRef.current = nextCapabilities;
                setCapabilities(nextCapabilities);
                setCapabilitiesUnavailable(false);
            } else if (!capabilitiesRef.current) {
                loadCapabilities();
            }
        },
        [loadCapabilities],
    );

    const selectView = useCallback(
        index => {
            const view = enabledViews[index];
            if (!view) {
                return;
            }
            ensureMounted(view);
            currentViewRef.current = view;
            setCurrentIndex(index);
            pagerRef.current?.setPage(index);
            logToFirebase('harbor_feed_view', {
                view: VIEW_CONFIG[view].analytics,
            });
        },
        [enabledViews, ensureMounted],
    );

    const handlePageSelected = useCallback(
        event => {
            const index = event.nativeEvent.position;
            const view = enabledViews[index];
            if (!view) {
                return;
            }
            ensureMounted(view);
            currentViewRef.current = view;
            setCurrentIndex(index);
            logToFirebase('harbor_feed_view', {
                view: VIEW_CONFIG[view].analytics,
            });
        },
        [enabledViews, ensureMounted],
    );

    useEffect(() => {
        const nextIndex = enabledViews.indexOf(currentViewRef.current);
        if (nextIndex >= 0) {
            if (nextIndex !== currentIndex) {
                setCurrentIndex(nextIndex);
                pageScrollPosition.setValue(nextIndex);
                pageScrollOffset.setValue(0);
                pagerRef.current?.setPageWithoutAnimation(nextIndex);
            }
            return;
        }

        currentViewRef.current = enabledViews[0] || 'latest';
        setCurrentIndex(0);
        pageScrollPosition.setValue(0);
        pageScrollOffset.setValue(0);
        pagerRef.current?.setPageWithoutAnimation(0);
    }, [
        currentIndex,
        enabledViews,
        pageScrollOffset,
        pageScrollPosition,
    ]);

    const handleSessionPress = useCallback(() => {
        if (status === 'restoring' || status === 'authorizing') {
            return;
        }
        setConsentVisible(true);
    }, [status]);

    const handleLoginConfirm = useCallback(async () => {
        setConsentVisible(false);
        if (status === 'restoring' || status === 'authorizing') {
            return;
        }
        try {
            await login({
                routeName: 'Tabbar',
                params: {screen: 'ForumTabbar'},
            });
        } catch (error) {
            Alert.alert(
                t('Harbor 登入失敗'),
                t('暫時無法登入 Harbor，請稍後再試。'),
                [{ text: t('確定'), onPress: () => trigger() }],
            );
        }
    }, [login, status, t]);

    const sessionLabel =
        status === 'restoring'
            ? t('正在同步…')
            : status === 'authorizing'
                ? t('登入中…')
                : t('登入');

    const stickyHeaderHeight = toolbarHeight + SEARCH_BAR_ROW_HEIGHT;
    const contentContainerStyle = useMemo(
        () => ({
            paddingTop: stickyHeaderHeight + verticalScale(4),
        }),
        [stickyHeaderHeight],
    );
    const refreshProgressViewOffset = stickyHeaderHeight + verticalScale(8);

    const handleToolbarLayout = useCallback(event => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        setToolbarHeight(currentHeight =>
            currentHeight === nextHeight ? currentHeight : nextHeight,
        );
    }, []);

    // Drawer 側滑開合時攔截貼文點擊，避免誤進詳情後返回造成主頁刷新感
    useEffect(() => {
        const blockTopicPress = () => {
            blockTopicPressUntilRef.current = Number.POSITIVE_INFINITY;
        };
        const releaseTopicPress = () => {
            blockTopicPressUntilRef.current = Date.now() + 180;
        };
        const unsubscribeGestureStart = navigation.addListener(
            'gestureStart',
            blockTopicPress,
        );
        const unsubscribeGestureEnd = navigation.addListener(
            'gestureEnd',
            releaseTopicPress,
        );
        const unsubscribeGestureCancel = navigation.addListener(
            'gestureCancel',
            releaseTopicPress,
        );

        return () => {
            unsubscribeGestureStart();
            unsubscribeGestureEnd();
            unsubscribeGestureCancel();
        };
    }, [navigation]);

    const handlePageScrollStateChanged = useCallback(event => {
        const pageScrollState = event.nativeEvent.pageScrollState;
        const guardDuration = pageScrollState === 'idle' ? 180 : 320;
        blockTopicPressUntilRef.current = Date.now() + guardDuration;
    }, []);

    const isTopicPressAllowed = useCallback(
        () => Date.now() >= blockTopicPressUntilRef.current,
        [],
    );

    return (
        <SafeAreaView
            style={[styles.page, { backgroundColor: theme.bg_color }]}
            edges={{ top: true }}>
            <View style={styles.contentClip}>
                <AnimatedPagerView
                    ref={pagerRef}
                    style={styles.pager}
                    initialPage={0}
                    onPageScroll={handlePageScroll}
                    onPageSelected={handlePageSelected}
                    onPageScrollStateChanged={handlePageScrollStateChanged}>
                    {enabledViews.map(view => (
                        <View
                            key={view}
                            style={styles.feedPage}
                            collapsable={false}>
                            {mountedViews[view] ? (
                                <HarborFeedPane
                                    view={view}
                                    navigation={navigation}
                                    onCapabilities={handleCapabilities}
                                    isTopicPressAllowed={isTopicPressAllowed}
                                    contentContainerStyle={contentContainerStyle}
                                    refreshProgressViewOffset={
                                        refreshProgressViewOffset
                                    }
                                    isActive={
                                        enabledViews[currentIndex] === view
                                    }
                                />
                            ) : null}
                        </View>
                    ))}
                </AnimatedPagerView>
                <View pointerEvents="box-none" style={styles.sharedHeader}>
                    <HarborStickyToolbar
                        segmentOptions={segmentOptions}
                        currentIndex={currentIndex}
                        tabPosition={tabPosition}
                        onChange={selectView}
                        status={status}
                        sessionLabel={sessionLabel}
                        onSessionPress={handleSessionPress}
                        onMenuPress={() => navigation.openDrawer()}
                        onChatPress={() => navigation.navigate('HarborChatList')}
                        onComposePress={() =>
                            navigation.navigate('HarborComposer', {
                                mode: 'newTopic',
                            })
                        }
                        onSearchPress={() => navigation.navigate('HarborSearch')}
                        chatUnreadCount={chatUnreadCount}
                        chatVisible={capabilities?.chat !== false}
                        onToolbarLayout={handleToolbarLayout}
                    />
                </View>
            </View>
            <HarborLoginConsentModal
                visible={consentVisible}
                onCancel={() => setConsentVisible(false)}
                onConfirm={handleLoginConfirm}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    contentClip: {
        flex: 1,
        overflow: 'hidden',
    },
    stickyHeader: {
        zIndex: 2,
    },
    stickyToolbar: {
        minHeight: STICKY_TOOLBAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(10),
        paddingVertical: 0,
    },
    toolbarSide: {
        flex: 1,
        minWidth: 0,
        alignItems: 'flex-start',
    },
    toolbarRight: {
        alignItems: 'flex-end',
    },
    toolbarRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: scale(2),
        maxWidth: '100%',
    },
    toolbarIconButton: {
        width: scale(30),
        height: scale(30),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatUnreadBadge: {
        position: 'absolute',
        top: scale(1),
        right: scale(0),
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
    sessionButton: {
        maxWidth: '100%',
        minHeight: scale(30),
        borderRadius: scale(8),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: scale(6),
        paddingVertical: verticalScale(2),
    },
    sessionText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        fontWeight: '700',
        marginLeft: scale(4),
    },
    loginPromptBadge: {
        position: 'absolute',
        top: scale(2),
        right: scale(1),
        width: scale(6),
        height: scale(6),
        borderRadius: scale(3),
    },
    feedTabs: {
        height: verticalScale(22),
        flexDirection: 'row',
        flexShrink: 0,
        marginHorizontal: scale(2),
        position: 'relative',
    },
    feedTab: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(8),
    },
    feedTabLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '400',
    },
    feedTabLabelSelected: {
        fontWeight: '600',
    },
    feedTabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: HARBOR_TAB_INDICATOR_WIDTH,
        height: verticalScale(2),
        borderRadius: scale(1),
    },
    feedTabIndicatorVisible: {
        opacity: 1,
    },
    feedTabIndicatorHidden: {
        opacity: 0,
    },
    searchBarRow: {
        height: SEARCH_BAR_ROW_HEIGHT,
        justifyContent: 'center',
        paddingHorizontal: scale(6),
    },
    searchBar: {
        minHeight: verticalScale(30),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(9),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(10),
    },
    searchBarText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(12),
        marginLeft: scale(6),
    },
    sharedHeader: {
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        zIndex: 10,
    },
    pager: {
        flex: 1,
    },
    feedPage: {
        flex: 1,
    },
});

const HarborDrawerNavigator = () => {
    const { theme } = useTheme();
    const { width } = useWindowDimensions();

    const renderDrawerContent = useCallback(
        props => <HarborDrawerContent {...props} />,
        [],
    );

    return (
        <Drawer.Navigator
            drawerContent={renderDrawerContent}
            screenOptions={{
                headerShown: false,
                drawerType: 'front',
                drawerStyle: {
                    width: Math.min(width * 0.88, scale(360)),
                    backgroundColor: theme.bg_color,
                },
                sceneStyle: { backgroundColor: theme.bg_color },
                swipeEdgeWidth: scale(38),
                swipeMinDistance: scale(18),
                drawerHideStatusBarOnOpen: false,
            }}>
            <Drawer.Screen
                name="HarborHome"
                component={ForumPage}
                options={{ title: 'Harbor' }}
            />
        </Drawer.Navigator>
    );
};

export default HarborDrawerNavigator;
