import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    AppState,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

import { createDrawerNavigator } from '@react-navigation/drawer';
import { useIsFocused } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';
import Reanimated, {
    cancelAnimation,
    Easing,
    Extrapolation,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { SafeAreaView } from 'react-native-screens/experimental';
import { useTranslation } from 'react-i18next';

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
};
// 對齊資訊頁 Top Tab（~30），並預留搜尋列高度
const STICKY_TOOLBAR_HEIGHT = verticalScale(36);
const SEARCH_BAR_ROW_HEIGHT = verticalScale(38);
const TOP_VISIBILITY_THRESHOLD = verticalScale(4);
const SEARCH_SNAP_THRESHOLD = 0.5;
const SEARCH_INTERACTIVE_THRESHOLD = 0.85;
const SEARCH_SHOW_TIMING = {
    duration: 280,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
};
const SEARCH_HIDE_TIMING = {
    duration: 220,
    easing: Easing.bezier(0.4, 0, 0.2, 1),
};
const HARBOR_TAB_INDICATOR_WIDTH = moderateScale(25, 0.1);
const Drawer = createDrawerNavigator();
const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

const createScrollState = () => ({
    lastOffset: 0,
    progress: 1,
});

const clampSearchProgress = value => Math.min(1, Math.max(0, value));

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
    onComposePress,
    onSearchPress,
    onToolbarLayout,
    searchBarCollapseStyle,
    searchBarContentStyle,
    isSearchInteractive,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const isSignedIn = status === 'signedIn';

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
                            </Pressable>
                        )}
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
            <Reanimated.View
                pointerEvents={isSearchInteractive ? 'auto' : 'none'}
                style={[styles.searchBarCollapse, searchBarCollapseStyle]}>
                <Reanimated.View
                    style={[styles.searchBarRow, searchBarContentStyle]}>
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
                </Reanimated.View>
            </Reanimated.View>
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
    onScroll,
    onScrollEndDrag,
    onMomentumScrollEnd,
}) => {
    const source = useMemo(() => ({ view }), [view]);

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
                onScroll={onScroll}
                onScrollEndDrag={onScrollEndDrag}
                onMomentumScrollEnd={onMomentumScrollEnd}
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
    const { status, login } = useHarborSession();
    const isFocused = useIsFocused();
    const pagerRef = useRef(null);
    const pageScrollOffset = useRef(new Animated.Value(0)).current;
    const pageScrollPosition = useRef(new Animated.Value(0)).current;
    const currentViewRef = useRef('latest');
    const blockTopicPressUntilRef = useRef(0);
    const capabilitiesRef = useRef(null);
    const capabilitiesControllerRef = useRef(null);
    const scrollStatesRef = useRef({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [toolbarHeight, setToolbarHeight] = useState(STICKY_TOOLBAR_HEIGHT);
    const [isSearchInteractive, setIsSearchInteractive] = useState(true);
    const [capabilities, setCapabilities] = useState(null);
    const [capabilitiesUnavailable, setCapabilitiesUnavailable] = useState(false);
    const [mountedViews, setMountedViews] = useState({
        latest: true,
        top: false,
    });
    const [consentVisible, setConsentVisible] = useState(false);
    const searchProgress = useSharedValue(1);

    useEffect(() => {
        logToFirebase('openPage', { page: 'HarborNativeHome' });
    }, []);

    const getScrollState = useCallback(view => {
        if (!scrollStatesRef.current[view]) {
            scrollStatesRef.current[view] = createScrollState();
        }
        return scrollStatesRef.current[view];
    }, []);

    const syncSearchInteractive = useCallback(progress => {
        const nextInteractive = progress >= SEARCH_INTERACTIVE_THRESHOLD;
        setIsSearchInteractive(current =>
            current === nextInteractive ? current : nextInteractive,
        );
    }, []);

    const setSearchProgress = useCallback(
        (progress, { animated = false, view } = {}) => {
            const nextProgress = clampSearchProgress(progress);
            if (view) {
                getScrollState(view).progress = nextProgress;
            }
            cancelAnimation(searchProgress);
            if (animated) {
                const timing =
                    nextProgress >= searchProgress.value
                        ? SEARCH_SHOW_TIMING
                        : SEARCH_HIDE_TIMING;
                searchProgress.value = withTiming(nextProgress, timing);
            } else {
                searchProgress.value = nextProgress;
            }
            syncSearchInteractive(nextProgress);
        },
        [getScrollState, searchProgress, syncSearchInteractive],
    );

    const showSearchForView = useCallback(
        view => {
            setSearchProgress(1, { animated: true, view });
        },
        [setSearchProgress],
    );

    const onContentScroll = useCallback(
        (view, offsetY) => {
            const nextOffset = Math.max(0, offsetY);
            const scrollState = getScrollState(view);
            const delta = nextOffset - scrollState.lastOffset;
            scrollState.lastOffset = nextOffset;

            if (currentViewRef.current !== view) {
                return;
            }

            if (nextOffset <= TOP_VISIBILITY_THRESHOLD) {
                if (scrollState.progress !== 1) {
                    setSearchProgress(1, { view });
                }
                return;
            }

            if (delta === 0) {
                return;
            }

            // 上滑／下滑進度與位移 1:1；列表 translateY 同步補償，避免 padding 跳動
            cancelAnimation(searchProgress);
            const nextProgress = clampSearchProgress(
                searchProgress.value - delta / SEARCH_BAR_ROW_HEIGHT,
            );
            scrollState.progress = nextProgress;
            searchProgress.value = nextProgress;
            syncSearchInteractive(nextProgress);
        },
        [
            getScrollState,
            searchProgress,
            setSearchProgress,
            syncSearchInteractive,
        ],
    );

    const snapSearchProgress = useCallback(
        view => {
            if (currentViewRef.current !== view) {
                return;
            }
            const target =
                searchProgress.value >= SEARCH_SNAP_THRESHOLD ? 1 : 0;
            if (Math.abs(searchProgress.value - target) < 0.001) {
                getScrollState(view).progress = target;
                syncSearchInteractive(target);
                return;
            }
            setSearchProgress(target, { animated: true, view });
        },
        [
            getScrollState,
            searchProgress,
            setSearchProgress,
            syncSearchInteractive,
        ],
    );

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
        }
    }, [isFocused, loadCapabilities, status]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            if (nextState === 'active' && isFocused) {
                loadCapabilities();
            }
        });
        return () => subscription.remove();
    }, [isFocused, loadCapabilities]);

    useEffect(() => {
        return () => capabilitiesControllerRef.current?.abort();
    }, []);

    const enabledViews = useMemo(() => {
        const availableViews = getHarborTopicViews(capabilities, {
            signedIn: status === 'signedIn',
            unavailable: capabilitiesUnavailable,
        });
        // 不提供新話題／未讀分頁；錯過即略過，角標仍獨立計算
        return availableViews.filter(
            view => view !== 'new' && view !== 'unread',
        );
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
    const searchBarCollapseStyle = useAnimatedStyle(() => ({
        height: interpolate(
            searchProgress.value,
            [0, 1],
            [0, SEARCH_BAR_ROW_HEIGHT],
            Extrapolation.CLAMP,
        ),
    }));
    const searchBarContentStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            searchProgress.value,
            [0, 0.2, 1],
            [0, 0.7, 1],
            Extrapolation.CLAMP,
        ),
        transform: [
            {
                translateY: interpolate(
                    searchProgress.value,
                    [0, 1],
                    [-SEARCH_BAR_ROW_HEIGHT * 0.45, 0],
                    Extrapolation.CLAMP,
                ),
            },
        ],
    }));
    // 列表上移量與搜尋列收起量相同；同時以負 marginBottom 拉高佈局，避免底部騰空
    const feedTranslateStyle = useAnimatedStyle(() => {
        const collapseOffset = interpolate(
            searchProgress.value,
            [0, 1],
            [SEARCH_BAR_ROW_HEIGHT, 0],
            Extrapolation.CLAMP,
        );
        return {
            marginBottom: -collapseOffset,
            transform: [{ translateY: -collapseOffset }],
        };
    });

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
            showSearchForView(view);
            pagerRef.current?.setPage(index);
            logToFirebase('harbor_feed_view', {
                view: VIEW_CONFIG[view].analytics,
            });
        },
        [enabledViews, ensureMounted, showSearchForView],
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
            showSearchForView(view);
            logToFirebase('harbor_feed_view', {
                view: VIEW_CONFIG[view].analytics,
            });
        },
        [enabledViews, ensureMounted, showSearchForView],
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
            {/*
              裁切必須在 top inset 下方：列表下滑時 translateY 若畫進
              SafeAreaView padding 區，Android edge-to-edge 透明狀態欄圖示會被蓋住
            */}
            <View style={styles.contentClip}>
                <Reanimated.View style={[styles.pager, feedTranslateStyle]}>
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
                                        contentContainerStyle={
                                            contentContainerStyle
                                        }
                                        refreshProgressViewOffset={
                                            refreshProgressViewOffset
                                        }
                                        isActive={
                                            enabledViews[currentIndex] === view
                                        }
                                        onScroll={event =>
                                            onContentScroll(
                                                view,
                                                event.nativeEvent.contentOffset.y,
                                            )
                                        }
                                        onScrollEndDrag={() =>
                                            snapSearchProgress(view)
                                        }
                                        onMomentumScrollEnd={() =>
                                            snapSearchProgress(view)
                                        }
                                    />
                                ) : null}
                            </View>
                        ))}
                    </AnimatedPagerView>
                </Reanimated.View>
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
                        onComposePress={() =>
                            navigation.navigate('HarborComposer', {
                                mode: 'newTopic',
                            })
                        }
                        onSearchPress={() => navigation.navigate('HarborSearch')}
                        onToolbarLayout={handleToolbarLayout}
                        searchBarCollapseStyle={searchBarCollapseStyle}
                        searchBarContentStyle={searchBarContentStyle}
                        isSearchInteractive={isSearchInteractive}
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
    searchBarCollapse: {
        overflow: 'hidden',
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
