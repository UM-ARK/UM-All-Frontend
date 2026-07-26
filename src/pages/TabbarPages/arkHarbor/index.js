import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';

import { createDrawerNavigator } from '@react-navigation/drawer';
import PagerView from 'react-native-pager-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import { SafeAreaView } from 'react-native-screens/experimental';
import { useTranslation } from 'react-i18next';

import SegmentControl from '../../../components/SegmentControl';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { fetchHarborSiteCapabilities } from '../../../utils/harbor/harborApi';
import { trigger } from '../../../utils/trigger';
import HarborDrawerContent from './components/HarborDrawerContent';
import HarborTopicList from './components/HarborTopicList';

const VIEW_CONFIG = {
    latest: { label: '最新', analytics: 'latest' },
    top: { label: '熱門', analytics: 'top' },
    new: { label: '新話題', analytics: 'new' },
    unread: { label: '未讀', analytics: 'unread' },
};
// 對齊資訊頁 Top Tab（~30），避免 Harbor 頂欄過高、視覺上不夠貼頂
const DEFAULT_STICKY_HEADER_HEIGHT = verticalScale(36);
const Drawer = createDrawerNavigator();

const HarborStickyToolbar = ({
    segmentOptions,
    currentIndex,
    onChange,
    status,
    sessionLabel,
    onSessionPress,
    onMenuPress,
    onLayout,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const isSignedIn = status === 'signedIn';

    return (
        <View
            onLayout={onLayout}
            style={[styles.stickyToolbar, { backgroundColor: theme.bg_color }]}>
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

            <SegmentControl
                options={segmentOptions}
                selectedIndex={currentIndex}
                onChange={onChange}
                trackBackgroundColor="transparent"
                selectedBackgroundColor="transparent"
                compact
                style={styles.toolbarSegment}
            />

            <View style={[styles.toolbarSide, styles.toolbarRight]}>
                <View style={styles.toolbarRightActions}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('搜索')}
                        hitSlop={scale(8)}
                        onPress={() => {
                            trigger();
                            // TODO: 接入 Harbor 搜索功能
                        }}
                        style={({ pressed }) => [
                            styles.toolbarIconButton,
                            pressed && {
                                backgroundColor: theme.tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="magnify"
                            size={scale(20)}
                            color={theme.themeColor}
                        />
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                            isSignedIn ? t('已登入') : sessionLabel
                        }
                        disabled={
                            status === 'restoring' || status === 'authorizing'
                        }
                        onPress={() => {
                            trigger();
                            onSessionPress();
                        }}
                        style={({ pressed }) => [
                            isSignedIn
                                ? styles.toolbarIconButton
                                : styles.sessionButton,
                            pressed && {
                                backgroundColor: theme.tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name={
                                isSignedIn ? 'account-check-outline' : 'login'
                            }
                            size={scale(isSignedIn ? 20 : 14)}
                            color={theme.themeColor}
                        />
                        {isSignedIn ? null : (
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.sessionText,
                                    { color: theme.themeColor },
                                ]}>
                                {sessionLabel}
                            </Text>
                        )}
                    </Pressable>
                </View>
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
    const pagerRef = useRef(null);
    const currentViewRef = useRef('latest');
    const blockTopicPressUntilRef = useRef(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [stickyHeaderHeight, setStickyHeaderHeight] = useState(
        DEFAULT_STICKY_HEADER_HEIGHT,
    );
    const [capabilities, setCapabilities] = useState(null);
    const [mountedViews, setMountedViews] = useState({
        latest: true,
        top: false,
    });

    useEffect(() => {
        logToFirebase('openPage', { page: 'HarborNativeHome' });
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchHarborSiteCapabilities({ signal: controller.signal })
            .then(setCapabilities)
            .catch(() => { });
        return () => controller.abort();
    }, []);

    const enabledViews = useMemo(() => {
        const fallbackViews = ['latest', 'top'];
        if (!capabilities) {
            return fallbackViews;
        }

        const available =
            status === 'signedIn'
                ? capabilities.topicViews
                : capabilities.anonymousTopicViews;
        const supportedViews = Array.isArray(available)
            ? available.filter(view => VIEW_CONFIG[view])
            : fallbackViews;
        return supportedViews.length > 0 ? supportedViews : fallbackViews;
    }, [capabilities, status]);

    const segmentOptions = useMemo(
        () =>
            enabledViews.map(view => ({
                key: view,
                label: t(VIEW_CONFIG[view].label),
            })),
        [enabledViews, t],
    );

    const ensureMounted = useCallback(view => {
        setMountedViews(current =>
            current[view] ? current : { ...current, [view]: true },
        );
    }, []);

    const handleCapabilities = useCallback(nextCapabilities => {
        setCapabilities(nextCapabilities);
    }, []);

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
                pagerRef.current?.setPageWithoutAnimation(nextIndex);
            }
            return;
        }

        currentViewRef.current = enabledViews[0] || 'latest';
        setCurrentIndex(0);
        pagerRef.current?.setPageWithoutAnimation(0);
    }, [currentIndex, enabledViews]);

    const handleSessionPress = useCallback(async () => {
        if (status === 'signedIn') {
            navigation.navigate('MyTabbar');
            return;
        }
        if (status === 'restoring' || status === 'authorizing') {
            return;
        }
        try {
            await login();
        } catch (error) {
            Alert.alert(
                t('Harbor 登入失敗'),
                t('暫時無法登入 Harbor，請稍後再試。'),
                [{ text: t('確定'), onPress: () => trigger() }],
            );
        }
    }, [login, navigation, status, t]);

    const sessionLabel =
        status === 'signedIn'
            ? t('已登入')
            : status === 'restoring'
                ? t('正在同步…')
                : status === 'authorizing'
                    ? t('登入中…')
                    : t('登入');

    const contentContainerStyle = useMemo(
        () => ({
            paddingTop: stickyHeaderHeight + verticalScale(4),
        }),
        [stickyHeaderHeight],
    );
    const refreshProgressViewOffset = stickyHeaderHeight + verticalScale(8);

    const handleStickyHeaderLayout = useCallback(event => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        setStickyHeaderHeight(currentHeight =>
            currentHeight === nextHeight ? currentHeight : nextHeight,
        );
    }, []);

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
            <PagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={0}
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
                            />
                        ) : null}
                    </View>
                ))}
            </PagerView>
            <View pointerEvents="box-none" style={styles.sharedHeader}>
                <HarborStickyToolbar
                    segmentOptions={segmentOptions}
                    currentIndex={currentIndex}
                    onChange={selectView}
                    status={status}
                    sessionLabel={sessionLabel}
                    onSessionPress={handleSessionPress}
                    onMenuPress={() => navigation.openDrawer()}
                    onLayout={handleStickyHeaderLayout}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    stickyToolbar: {
        minHeight: DEFAULT_STICKY_HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(10),
        paddingVertical: 0,
        zIndex: 2,
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
    toolbarSegment: {
        flexShrink: 0,
        marginHorizontal: scale(2),
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
                swipeEdgeWidth: scale(28),
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
