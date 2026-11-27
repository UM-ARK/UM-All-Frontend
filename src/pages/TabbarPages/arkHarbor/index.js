import React, {
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Alert,
    Animated,
    AppState,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

import { createDrawerNavigator } from '@react-navigation/drawer';
import { HeaderHeightContext } from '@react-navigation/elements';
import { useIsFocused } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import Text from '../../../components/AppText';
import NativeHeaderSegmentControl from '../../../components/NativeHeaderSegmentControl';
import ScalePressable from '../../../components/ScalePressable';
import SearchFieldContainer from '../../../components/SearchFieldContainer';
import TopScrollEdgeBackdrop, {
    SCROLL_EDGE_FADE_HEIGHT,
} from '../../../components/TopScrollEdgeBackdrop';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { isLiquidGlassSupported } from '../../../utils/glassEffect';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { useWindowSizeClass } from '../../../utils/windowSizeClass';
import {
    fetchHarborSiteCapabilities,
    getHarborTopicViews,
} from '../../../utils/harbor/harborApi';
import { trigger } from '../../../utils/trigger';
import HarborLoginConsentModal from '../my/components/HarborLoginConsentModal';
import PhosphorFeatureIcon from '../info/home/search/components/PhosphorFeatureIcon';
import HarborDrawerContent from './components/HarborDrawerContent';
import { harborTopicRowInsets } from './components/HarborTopicCard';
import HarborTopicList from './components/HarborTopicList';
import { createHarborNativeStack } from './HarborNativeStack';
import HarborTopicDetail from './HarborTopicDetail';
import searchFieldStyles, {
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
    SEARCH_FIELD_MIN_HEIGHT,
    TOP_SEGMENT_SEARCH_GAP,
} from '../../../components/searchFieldStyles';

const VIEW_CONFIG = {
    latest: { label: '最新', analytics: 'latest' },
    top: { label: '熱門', analytics: 'top' },
    unread: { label: '未讀', analytics: 'unread' },
};
// 對齊服務頁頂部液態玻璃膠囊高度；搜尋列固定顯示，不再隨滾動收合。
const STICKY_TOOLBAR_HEIGHT = verticalScale(38);
const SEARCH_BAR_ROW_HEIGHT = SEARCH_FIELD_MIN_HEIGHT + TOP_SEGMENT_SEARCH_GAP;
const Drawer = createDrawerNavigator();
const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

const HarborFeedSegmentControl = ({
    options,
    selectedIndex,
    position,
    onChange,
}) => {
    const unreadBadge = useMemo(
        () => options.find(option => option.key === 'unread')?.badge ?? null,
        [options],
    );

    return (
        <NativeHeaderSegmentControl
            options={options}
            selectedIndex={selectedIndex}
            position={position}
            onChange={onChange}
            compact
            badge={unreadBadge}
            badgeStyle={styles.nativeSegmentBadgeAnchor}
        />
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
    toolbarHeight,
    topInset,
    scrollY,
    backgroundColor,
    isCompact,
    useNativeHeader = false,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const isSignedIn = status === 'signedIn';
    const showLoginPromptBadge =
        status === 'signedOut' || status === 'expired';
    const searchBarForeground = isCompact ? theme.harborSearch.foreground : theme.black.third;

    const renderSearchButton = (liquidGlass = false) => (
        <SearchFieldContainer
            liquidGlass={liquidGlass}
            accessibilityRole="button"
            accessibilityLabel={t('搜尋 Harbor')}
            onPress={() => {
                trigger();
                onSearchPress();
            }}
            fieldStyle={{
                backgroundColor: isCompact
                    ? theme.harborSearch.background
                    : theme.white,
                borderColor: theme.themeColorUltraLight,
                borderWidth: isCompact ? 0 : StyleSheet.hairlineWidth,
            }}>
            <PhosphorFeatureIcon
                name="search"
                size={SEARCH_FIELD_ICON_SIZE}
                color={searchBarForeground}
                weight="regular"
            />
            <Text
                numberOfLines={1}
                maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                style={[
                    searchFieldStyles.text,
                    { color: searchBarForeground },
                ]}>
                {t('搜尋 Harbor')}
            </Text>
        </SearchFieldContainer>
    );

    const searchBarContent = (
        <View
            style={[
                styles.searchBarRow,
                isCompact && styles.compactSearchBarRow,
            ]}>
            {renderSearchButton(false)}
        </View>
    );

    if (useNativeHeader) {
        const useLiquidGlassSearch = isLiquidGlassSupported;
        return (
            <View pointerEvents="box-none" style={styles.stickyHeader}>
                {useLiquidGlassSearch ? null : (
                    <TopScrollEdgeBackdrop
                        headerHeight={toolbarHeight + SEARCH_BAR_ROW_HEIGHT}
                        fadeHeight={SCROLL_EDGE_FADE_HEIGHT}
                        scrollY={scrollY}
                        backgroundColor={backgroundColor}
                        zIndex={1}
                    />
                )}
                <View
                    pointerEvents="box-none"
                    style={[
                        styles.nativeStickySearchRow,
                        isCompact && styles.compactSearchBarRow,
                        { marginTop: toolbarHeight },
                    ]}>
                    {renderSearchButton(useLiquidGlassSearch)}
                </View>
            </View>
        );
    }

    return (
        <View pointerEvents="box-none" style={styles.stickyHeader}>
            <TopScrollEdgeBackdrop
                headerHeight={toolbarHeight + SEARCH_BAR_ROW_HEIGHT}
                fadeHeight={SCROLL_EDGE_FADE_HEIGHT}
                scrollY={scrollY}
                backgroundColor={backgroundColor}
                zIndex={1}
            />
            <View
                pointerEvents="box-none"
                onLayout={onToolbarLayout}
                style={[
                    styles.stickyToolbar,
                    {
                        paddingTop: topInset,
                        minHeight: topInset + STICKY_TOOLBAR_HEIGHT,
                    },
                ]}>
                <View style={[styles.toolbarSide, styles.toolbarLeft]}>
                    <ScalePressable
                        accessibilityRole="button"
                        accessibilityLabel={t('開啟選單')}
                        hitSlop={scale(8)}
                        onPress={() => {
                            trigger();
                            onMenuPress();
                        }}
                        style={styles.toolbarIconButton}>
                        <PhosphorFeatureIcon
                            name="list"
                            size={scale(20)}
                            color={theme.black.second}
                            weight="regular"
                        />
                    </ScalePressable>
                </View>

                <HarborFeedSegmentControl
                    options={segmentOptions}
                    selectedIndex={currentIndex}
                    position={tabPosition}
                    onChange={index => {
                        trigger(currentIndex === index ? 'tap' : 'selection');
                        onChange(index);
                    }}
                />

                <View style={[styles.toolbarSide, styles.toolbarRight]}>
                    <View style={styles.toolbarRightActions}>
                        {isSignedIn ? null : (
                            <ScalePressable
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
                                style={styles.sessionButton}>
                                <PhosphorFeatureIcon
                                    name="sign-in"
                                    size={scale(14)}
                                    color={theme.black.second}
                                    weight="regular"
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.sessionText,
                                        { color: theme.black.second },
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
                            </ScalePressable>
                        )}
                        {isSignedIn && chatVisible ? (
                            <ScalePressable
                                accessibilityRole="button"
                                accessibilityLabel={t('Chat')}
                                hitSlop={scale(8)}
                                onPress={() => {
                                    trigger();
                                    onChatPress();
                                }}
                                style={styles.toolbarIconButton}>
                                <PhosphorFeatureIcon
                                    name="message-circle"
                                    size={scale(19)}
                                    color={theme.black.second}
                                    weight="regular"
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
                            </ScalePressable>
                        ) : null}
                        <ScalePressable
                            accessibilityRole="button"
                            accessibilityLabel={t('建立話題')}
                            hitSlop={scale(8)}
                            onPress={() => {
                                trigger();
                                onComposePress();
                            }}
                            style={styles.toolbarIconButton}>
                            <PhosphorFeatureIcon
                                name="plus"
                                size={scale(20)}
                                color={theme.black.second}
                                weight="regular"
                            />
                        </ScalePressable>
                    </View>
                </View>
            </View>
            {searchBarContent}
        </View>
    );
};

const HarborFeedPane = ({
    view,
    navigation,
    onCapabilities,
    isTopicPressAllowed,
    contentContainerStyle,
    scrollIndicatorInsets,
    refreshProgressViewOffset,
    onTopicPress,
    isActive,
    onScrollOffset,
    onUnseenChange,
}) => {
    const source = useMemo(
        () =>
            view === 'unread'
                ? {view: 'latest', filter: 'unseen'}
                : {view},
        [view],
    );
    const handleScroll = useCallback(
        event => {
            onScrollOffset(view, event.nativeEvent.contentOffset.y);
        },
        [onScrollOffset, view],
    );

    return (
        <View style={styles.feedPage}>
            <HarborTopicList
                source={source}
                navigation={navigation}
                preserveItemsUntilRefresh
                onCapabilities={onCapabilities}
                isTopicPressAllowed={isTopicPressAllowed}
                contentContainerStyle={contentContainerStyle}
                scrollIndicatorInsets={scrollIndicatorInsets}
                refreshProgressViewOffset={refreshProgressViewOffset}
                onTopicPress={onTopicPress}
                onScroll={handleScroll}
                isActive={isActive}
                onUnseenChange={onUnseenChange}
            />
        </View>
    );
};

/**
 * Harbor 原生首頁：多視圖話題列表（分類／標籤入口在側邊抽屜）。
 */
const ForumPage = ({ navigation }) => {
    const { theme } = useTheme();
    const { isCompact, isExpanded } = useWindowSizeClass();
    const useNativeHeader = Platform.OS === 'ios' && !isExpanded;
    const useNativeLiquidGlassHeader =
        useNativeHeader && isLiquidGlassSupported;
    const nativeHeaderHeight = useContext(HeaderHeightContext) ?? 0;
    const insets = useSafeAreaInsets();
    const backgroundColor = isCompact ? theme.harbor_bg_color : theme.bg_color;
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
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollOffsetsRef = useRef({});
    const currentViewRef = useRef('latest');
    const blockTopicPressUntilRef = useRef(0);
    const capabilitiesRef = useRef(null);
    const capabilitiesControllerRef = useRef(null);
    const hasLoggedHomeRef = useRef(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [detailPaneWidth, setDetailPaneWidth] = useState(0);
    const [toolbarHeight, setToolbarHeight] = useState(
        insets.top + STICKY_TOOLBAR_HEIGHT,
    );
    const [capabilities, setCapabilities] = useState(null);
    const [capabilitiesUnavailable, setCapabilitiesUnavailable] = useState(false);
    const [mountedViews, setMountedViews] = useState({
        latest: true,
        top: false,
        unread: false,
    });
    const [consentVisible, setConsentVisible] = useState(false);
    const [hasUnseenLatest, setHasUnseenLatest] = useState(false);
    const [hasUnseenPane, setHasUnseenPane] = useState(false);
    const hasUnreadTopics =
        status === 'signedIn' && (hasUnseenLatest || hasUnseenPane);

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
                badge: view === 'unread' && hasUnreadTopics ? (
                    <View
                        pointerEvents="none"
                        style={[styles.feedTabDot, { backgroundColor: theme.unread }]}
                    />
                ) : null,
            })),
        [enabledViews, hasUnreadTopics, t, theme.unread],
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
                {
                    useNativeDriver: true,
                },
            ),
        [pageScrollOffset, pageScrollPosition],
    );
    const ensureMounted = useCallback(view => {
        setMountedViews(current =>
            current[view] ? current : { ...current, [view]: true },
        );
    }, []);
    // 各分頁各自記住滾動位置；切頁時同步 scrollY 給頂部 Scroll Edge
    const syncSearchScroll = useCallback(
        view => {
            const offset = scrollOffsetsRef.current[view] ?? 0;
            scrollY.setValue(Math.max(0, offset));
        },
        [scrollY],
    );
    const handleScrollOffset = useCallback((view, offset) => {
        scrollOffsetsRef.current[view] = offset;
        if (view !== currentViewRef.current) {
            return;
        }
        scrollY.setValue(Math.max(0, offset));
    }, [scrollY]);

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
            syncSearchScroll(view);
            setCurrentIndex(index);
            pagerRef.current?.setPage(index);
            logToFirebase('harbor_feed_view', {
                view: VIEW_CONFIG[view].analytics,
            });
        },
        [enabledViews, ensureMounted, syncSearchScroll],
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
            syncSearchScroll(view);
            setCurrentIndex(index);
            logToFirebase('harbor_feed_view', {
                view: VIEW_CONFIG[view].analytics,
            });
        },
        [enabledViews, ensureMounted, syncSearchScroll],
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

    const effectiveToolbarHeight = useNativeHeader
        ? nativeHeaderHeight || insets.top + STICKY_TOOLBAR_HEIGHT
        : toolbarHeight;
    const stickyHeaderHeight = effectiveToolbarHeight + SEARCH_BAR_ROW_HEIGHT;
    const contentContainerStyle = useMemo(
        () => ({
            paddingTop: stickyHeaderHeight + verticalScale(4),
        }),
        [stickyHeaderHeight],
    );
    const scrollIndicatorInsets = useMemo(
        () =>
            useNativeLiquidGlassHeader
                ? { top: stickyHeaderHeight }
                : undefined,
        [stickyHeaderHeight, useNativeLiquidGlassHeader],
    );
    const refreshProgressViewOffset = stickyHeaderHeight + verticalScale(8);

    const handleToolbarLayout = useCallback(event => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        setToolbarHeight(currentHeight =>
            currentHeight === nextHeight ? currentHeight : nextHeight,
        );
    }, []);

    const drawerNavigation = useNativeHeader
        ? navigation.getParent()
        : navigation;
    const handleMenuPress = useCallback(() => {
        (drawerNavigation?.openDrawer ?? navigation.openDrawer)?.();
    }, [drawerNavigation, navigation]);
    const handleChatPress = useCallback(() => {
        navigation.navigate('HarborChatList');
    }, [navigation]);
    const handleComposePress = useCallback(() => {
        navigation.navigate('HarborComposer', {
            mode: 'newTopic',
        });
    }, [navigation]);
    const handleSearchPress = useCallback(() => {
        navigation.navigate('HarborSearch');
    }, [navigation]);

    useLayoutEffect(() => {
        if (!useNativeHeader) {
            return;
        }
        const isSignedIn = status === 'signedIn';
        const showLoginPromptBadge =
            status === 'signedOut' || status === 'expired';
        const chatVisible = capabilities?.chat !== false;

        navigation.setOptions({
            headerShown: true,
            contentStyle: { backgroundColor },
            headerLeft: () => (
                <View style={styles.nativeHeaderSide}>
                    <ScalePressable
                        accessibilityRole="button"
                        accessibilityLabel={t('開啟選單')}
                        hitSlop={scale(8)}
                        onPress={() => {
                            trigger();
                            handleMenuPress();
                        }}
                        style={styles.nativeHeaderIconButton}>
                        <PhosphorFeatureIcon
                            name="list"
                            size={scale(20)}
                            color={theme.black.second}
                            weight="regular"
                        />
                    </ScalePressable>
                </View>
            ),
            headerTitle: () => (
                <HarborFeedSegmentControl
                    options={segmentOptions}
                    selectedIndex={currentIndex}
                    position={tabPosition}
                    onChange={index => {
                        trigger(currentIndex === index ? 'tap' : 'selection');
                        selectView(index);
                    }}
                />
            ),
            headerRight: () => (
                <View style={styles.nativeHeaderSide}>
                    {isSignedIn ? null : (
                        <ScalePressable
                            accessibilityRole="button"
                            accessibilityLabel={sessionLabel}
                            disabled={
                                status === 'restoring' ||
                                status === 'authorizing'
                            }
                            onPress={() => {
                                trigger();
                                handleSessionPress();
                            }}
                            style={styles.sessionButton}>
                            <PhosphorFeatureIcon
                                name="sign-in"
                                size={scale(14)}
                                color={theme.black.second}
                                weight="regular"
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.sessionText,
                                    { color: theme.black.second },
                                ]}>
                                {sessionLabel}
                            </Text>
                            {showLoginPromptBadge ? (
                                <View
                                    pointerEvents="none"
                                    style={[
                                        styles.loginPromptBadge,
                                        { backgroundColor: theme.unread },
                                    ]}
                                />
                            ) : null}
                        </ScalePressable>
                    )}
                    {isSignedIn && chatVisible ? (
                        <ScalePressable
                            accessibilityRole="button"
                            accessibilityLabel={t('Chat')}
                            hitSlop={scale(8)}
                            onPress={() => {
                                trigger();
                                handleChatPress();
                            }}
                            style={styles.nativeHeaderIconButton}>
                            <PhosphorFeatureIcon
                                name="message-circle"
                                size={scale(19)}
                                color={theme.black.second}
                                weight="regular"
                            />
                            {chatUnreadCount > 0 ? (
                                <View
                                    style={[
                                        styles.chatUnreadBadge,
                                        { backgroundColor: theme.unread },
                                    ]}>
                                    <Text
                                        style={[
                                            styles.chatUnreadText,
                                            { color: theme.trueWhite },
                                        ]}>
                                        {chatUnreadCount > 99
                                            ? '99+'
                                            : chatUnreadCount}
                                    </Text>
                                </View>
                            ) : null}
                        </ScalePressable>
                    ) : null}
                    <ScalePressable
                        accessibilityRole="button"
                        accessibilityLabel={t('建立話題')}
                        hitSlop={scale(8)}
                        onPress={() => {
                            trigger();
                            handleComposePress();
                        }}
                        style={styles.nativeHeaderIconButton}>
                        <PhosphorFeatureIcon
                            name="plus"
                            size={scale(20)}
                            color={theme.black.second}
                            weight="regular"
                        />
                    </ScalePressable>
                </View>
            ),
        });
    }, [
        backgroundColor,
        capabilities?.chat,
        chatUnreadCount,
        currentIndex,
        handleChatPress,
        handleComposePress,
        handleMenuPress,
        handleSessionPress,
        navigation,
        segmentOptions,
        selectView,
        sessionLabel,
        status,
        t,
        tabPosition,
        theme.black.second,
        theme.trueWhite,
        theme.unread,
        useNativeHeader,
    ]);

    // Drawer 側滑開合時攔截貼文點擊，避免誤進詳情後返回造成主頁刷新感
    useEffect(() => {
        if (!drawerNavigation?.addListener) {
            return undefined;
        }
        const blockTopicPress = () => {
            blockTopicPressUntilRef.current = Number.POSITIVE_INFINITY;
        };
        const releaseTopicPress = () => {
            blockTopicPressUntilRef.current = Date.now() + 180;
        };
        const unsubscribeGestureStart = drawerNavigation.addListener(
            'gestureStart',
            blockTopicPress,
        );
        const unsubscribeGestureEnd = drawerNavigation.addListener(
            'gestureEnd',
            releaseTopicPress,
        );
        const unsubscribeGestureCancel = drawerNavigation.addListener(
            'gestureCancel',
            releaseTopicPress,
        );

        return () => {
            unsubscribeGestureStart();
            unsubscribeGestureEnd();
            unsubscribeGestureCancel();
        };
    }, [drawerNavigation]);

    const handlePageScrollStateChanged = useCallback(event => {
        const pageScrollState = event.nativeEvent.pageScrollState;
        const guardDuration = pageScrollState === 'idle' ? 180 : 320;
        blockTopicPressUntilRef.current = Date.now() + guardDuration;
    }, []);

    const isTopicPressAllowed = useCallback(
        () => Date.now() >= blockTopicPressUntilRef.current,
        [],
    );
    const handleSplitTopicPress = useCallback(topic => {
        setSelectedTopic(topic);
    }, []);
    const detailNavigation =
        navigation.getParent()?.getParent() ||
        navigation.getParent() ||
        navigation;

    return (
        <View style={[styles.page, { backgroundColor }]}>
            <View
                style={[
                    styles.contentClip,
                    isExpanded ? styles.splitContentClip : null,
                ]}>
                <AnimatedPagerView
                    ref={pagerRef}
                    style={[
                        styles.pager,
                        isExpanded ? styles.splitPager : null,
                    ]}
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
                                    scrollIndicatorInsets={scrollIndicatorInsets}
                                    refreshProgressViewOffset={
                                        refreshProgressViewOffset
                                    }
                                    onTopicPress={
                                        isExpanded
                                            ? handleSplitTopicPress
                                            : undefined
                                    }
                                    isActive={
                                        enabledViews[currentIndex] === view
                                    }
                                    onScrollOffset={handleScrollOffset}
                                    onUnseenChange={
                                        view === 'latest'
                                            ? setHasUnseenLatest
                                            : view === 'unread'
                                                ? setHasUnseenPane
                                                : undefined
                                    }
                                />
                            ) : null}
                        </View>
                    ))}
                </AnimatedPagerView>
                <View
                    pointerEvents="box-none"
                    style={[
                        styles.sharedHeader,
                        isExpanded ? styles.splitSharedHeader : null,
                    ]}>
                    <HarborStickyToolbar
                        segmentOptions={segmentOptions}
                        currentIndex={currentIndex}
                        tabPosition={tabPosition}
                        onChange={selectView}
                        status={status}
                        sessionLabel={sessionLabel}
                        onSessionPress={handleSessionPress}
                        onMenuPress={handleMenuPress}
                        onChatPress={handleChatPress}
                        onComposePress={handleComposePress}
                        onSearchPress={handleSearchPress}
                        chatUnreadCount={chatUnreadCount}
                        chatVisible={capabilities?.chat !== false}
                        onToolbarLayout={handleToolbarLayout}
                        toolbarHeight={effectiveToolbarHeight}
                        topInset={insets.top}
                        scrollY={scrollY}
                        backgroundColor={backgroundColor}
                        isCompact={isCompact}
                        useNativeHeader={useNativeHeader}
                    />
                </View>
                {isExpanded ? (
                    <View
                        style={[styles.detailPane, { paddingTop: insets.top }]}
                        onLayout={event =>
                            setDetailPaneWidth(event.nativeEvent.layout.width)
                        }>
                        {selectedTopic ? (
                            <HarborTopicDetail
                                route={{
                                    params: {
                                        topicId: selectedTopic.id,
                                        topicTitle: selectedTopic.title,
                                    },
                                }}
                                navigation={detailNavigation}
                                isSplitPane
                                availableWidth={detailPaneWidth}
                            />
                        ) : null}
                    </View>
                ) : null}
            </View>
            <HarborLoginConsentModal
                visible={consentVisible}
                onCancel={() => setConsentVisible(false)}
                onConfirm={handleLoginConfirm}
            />
        </View>
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
    splitContentClip: {
        flexDirection: 'row',
    },
    splitPager: {
        width: '40%',
        flex: 0,
    },
    detailPane: {
        flex: 1,
        borderLeftWidth: StyleSheet.hairlineWidth,
    },
    stickyHeader: {
        zIndex: 2,
    },
    stickyToolbar: {
        // 蓋在 TopScrollEdgeBackdrop 之上，避免毛玻璃遮罩把工具列洗白
        zIndex: 2,
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
    toolbarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(2),
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
    nativeHeaderSide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    nativeHeaderIconButton: {
        width: scale(32),
        height: scale(32),
        borderRadius: scale(16),
        alignItems: 'center',
        justifyContent: 'center',
    },
    nativeStickySearchRow: {
        zIndex: 2,
        height: SEARCH_BAR_ROW_HEIGHT,
        paddingTop: TOP_SEGMENT_SEARCH_GAP,
        justifyContent: 'center',
        paddingHorizontal: scale(6),
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
    feedTabDot: {
        width: scale(5),
        height: scale(5),
        borderRadius: scale(2.5),
    },
    nativeSegmentBadgeAnchor: {
        right: scale(18),
    },
    searchBarRow: {
        // 與 nativeStickySearchRow／資訊頁一致，避免 Scroll Edge 遮罩蓋住實色搜尋列
        zIndex: 2,
        height: SEARCH_BAR_ROW_HEIGHT,
        paddingTop: TOP_SEGMENT_SEARCH_GAP,
        justifyContent: 'center',
        paddingHorizontal: scale(6),
    },
    compactSearchBarRow: {
        paddingHorizontal: harborTopicRowInsets.paddingHorizontal,
    },
    sharedHeader: {
        position: 'absolute',
        top: 0,
        right: 0,
        left: 0,
        zIndex: 10,
    },
    splitSharedHeader: {
        right: '60%',
    },
    pager: {
        flex: 1,
    },
    feedPage: {
        flex: 1,
    },
});

const HarborNativeStack = createHarborNativeStack(ForumPage);

const HarborDrawerNavigator = () => {
    const { theme } = useTheme();
    const { width, isCompact } = useWindowSizeClass();

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
                sceneStyle: {
                    backgroundColor: isCompact ? theme.harbor_bg_color : theme.bg_color,
                },
                swipeEdgeWidth: scale(38),
                swipeMinDistance: scale(18),
                drawerHideStatusBarOnOpen: false,
            }}>
            <Drawer.Screen
                name="HarborHome"
                component={Platform.OS === 'ios' ? HarborNativeStack : ForumPage}
                options={{ title: 'Harbor' }}
            />
        </Drawer.Navigator>
    );
};

export default HarborDrawerNavigator;
