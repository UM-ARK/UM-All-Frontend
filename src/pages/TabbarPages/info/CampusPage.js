import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { scale, verticalScale } from 'react-native-size-matters';
import Ionicons from "@react-native-vector-icons/ionicons";
import { useTranslation } from 'react-i18next';
import {
    isLiquidGlassSupported,
    LiquidGlassView,
} from '@callstack/liquid-glass';

import Text from '../../../components/AppText';
import { useTheme, uiStyle } from '../../../components/ThemeContext';
import SegmentControl from '../../../components/SegmentControl';
import { trigger } from '../../../utils/trigger';
import { openLink } from '../../../utils/browser';
import { UM_OPEN_DATA } from '../../../utils/pathMap';

import UMEventPage from './UMEventPage';
import NewsPage from './NewsPage';

const HEADER_TOP_OFFSET = verticalScale(4);
const HEADER_CONTENT_GAP = verticalScale(4);
const DEFAULT_HEADER_INSET = verticalScale(70);
const TOP_VISIBILITY_THRESHOLD = verticalScale(4);
const DIRECTION_CHANGE_THRESHOLD = verticalScale(10);

/**
 * 校園資訊頁：活動 / 新聞合併為單一 Top Tab
 * Segment 點選 + PagerView 左右滑同步切換
 */
const CampusPage = () => {
    const { theme } = useTheme();
    const { bg_color, black, white, themeColor, viewShadow } = theme;
    const { t } = useTranslation('common');

    const pagerRef = useRef(null);
    const eventPageRef = useRef(null);
    const newsPageRef = useRef(null);
    const pageIndexRef = useRef(0);
    const headerVisibleRef = useRef(true);
    const scrollStatesRef = useRef([
        {
            lastOffset: 0,
            anchorOffset: 0,
            direction: null,
            headerVisible: true,
        },
        {
            lastOffset: 0,
            anchorOffset: 0,
            direction: null,
            headerVisible: true,
        },
    ]);
    const [pageIndex, setPageIndex] = useState(0);
    const [headerInset, setHeaderInset] = useState(DEFAULT_HEADER_INSET);
    const [isHeaderInteractive, setIsHeaderInteractive] = useState(true);
    const headerProgress = useSharedValue(1);
    // 延遲掛載未造訪分頁，避免進校園就同時打兩支 Open Data API
    const [mountedPages, setMountedPages] = useState({ 0: true, 1: false });

    const segmentOptions = useMemo(
        () => [
            { key: 'event', label: t('TOPTAB_EVENT') },
            { key: 'news', label: t('TOPTAB_NEWS') },
        ],
        [t],
    );

    const ensureMounted = useCallback(index => {
        setMountedPages(prev =>
            prev[index] ? prev : { ...prev, [index]: true },
        );
    }, []);

    const setHeaderVisible = useCallback(
        visible => {
            if (headerVisibleRef.current === visible) {
                return;
            }

            headerVisibleRef.current = visible;
            setIsHeaderInteractive(visible);
            headerProgress.value = withTiming(visible ? 1 : 0, {
                duration: visible ? 180 : 150,
                easing: Easing.out(Easing.cubic),
            });
        },
        [headerProgress],
    );

    const showHeaderForPage = useCallback(
        index => {
            const scrollState = scrollStatesRef.current[index];
            scrollState.anchorOffset = scrollState.lastOffset;
            scrollState.direction = null;
            scrollState.headerVisible = true;
            setHeaderVisible(true);
        },
        [setHeaderVisible],
    );

    const onSegmentChange = useCallback(
        index => {
            ensureMounted(index);
            pageIndexRef.current = index;
            setPageIndex(index);
            showHeaderForPage(index);
            pagerRef.current?.setPage(index);
        },
        [ensureMounted, showHeaderForPage],
    );

    const onPageSelected = useCallback(
        e => {
            const next = e.nativeEvent.position;
            ensureMounted(next);
            pageIndexRef.current = next;
            setPageIndex(next);
            showHeaderForPage(next);
        },
        [ensureMounted, showHeaderForPage],
    );

    const onContentScroll = useCallback(
        (index, offsetY) => {
            const nextOffset = Math.max(0, offsetY);
            const scrollState = scrollStatesRef.current[index];

            if (nextOffset <= TOP_VISIBILITY_THRESHOLD) {
                scrollState.lastOffset = nextOffset;
                scrollState.anchorOffset = nextOffset;
                scrollState.direction = null;
                scrollState.headerVisible = true;
                if (pageIndexRef.current === index) {
                    setHeaderVisible(true);
                }
                return;
            }

            const nextDirection =
                nextOffset > scrollState.lastOffset
                    ? 'down'
                    : nextOffset < scrollState.lastOffset
                        ? 'up'
                        : scrollState.direction;

            if (nextDirection !== scrollState.direction) {
                scrollState.direction = nextDirection;
                scrollState.anchorOffset = scrollState.lastOffset;
            }

            if (
                nextDirection === 'down' &&
                nextOffset - scrollState.anchorOffset >=
                DIRECTION_CHANGE_THRESHOLD
            ) {
                scrollState.headerVisible = false;
            } else if (
                nextDirection === 'up' &&
                scrollState.anchorOffset - nextOffset >=
                DIRECTION_CHANGE_THRESHOLD
            ) {
                scrollState.headerVisible = true;
            }

            scrollState.lastOffset = nextOffset;
            if (pageIndexRef.current === index) {
                setHeaderVisible(scrollState.headerVisible);
            }
        },
        [setHeaderVisible],
    );

    const resetPageScrollState = useCallback(
        index => {
            const scrollState = scrollStatesRef.current[index];
            scrollState.anchorOffset = scrollState.lastOffset;
            scrollState.direction = 'up';
            scrollState.headerVisible = true;
            if (pageIndexRef.current === index) {
                setHeaderVisible(true);
            }
        },
        [setHeaderVisible],
    );

    const onScrollToTopPress = useCallback(() => {
        trigger();
        const currentPageIndex = pageIndexRef.current;
        if (currentPageIndex === 0) {
            eventPageRef.current?.scrollToTop();
        } else {
            newsPageRef.current?.scrollToTop();
        }
        resetPageScrollState(currentPageIndex);
    }, [resetPageScrollState]);

    const onHeaderLayout = useCallback(e => {
        const nextInset = Math.ceil(
            e.nativeEvent.layout.height + HEADER_TOP_OFFSET + HEADER_CONTENT_GAP,
        );
        setHeaderInset(currentInset =>
            currentInset === nextInset ? currentInset : nextInset,
        );
    }, []);

    const floatingHeaderStyle = useAnimatedStyle(
        () => ({
            opacity: headerProgress.value,
            transform: [
                {
                    translateY:
                        (1 - headerProgress.value) *
                        -(headerInset + HEADER_TOP_OFFSET),
                },
            ],
        }),
        [headerInset],
    );

    const onSourceInfoPress = useCallback(() => {
        trigger();
        Alert.alert(
            t('來源：UM Open Data'),
            t('資料來自澳門大學開放數據平台，轉載時請確保內容準確。'),
            [
                { text: t('取消'), style: 'cancel' },
                {
                    text: t('開啟來源'),
                    style: 'default',
                    isPreferred: true,
                    onPress: () => openLink(UM_OPEN_DATA),
                },
            ],
            { cancelable: true },
        );
    }, [t]);

    return (
        <View style={[styles.container, { backgroundColor: bg_color }]}>
            <PagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={0}
                onPageSelected={onPageSelected}
                overdrag={false}
                offscreenPageLimit={1}>
                <View key="event" style={styles.page} collapsable={false}>
                    {mountedPages[0] ? (
                        <UMEventPage
                            ref={eventPageRef}
                            hideSourceLabel
                            contentTopInset={headerInset}
                            onScrollOffsetChange={offsetY =>
                                onContentScroll(0, offsetY)
                            }
                        />
                    ) : null}
                </View>
                <View key="news" style={styles.page} collapsable={false}>
                    {mountedPages[1] ? (
                        <NewsPage
                            ref={newsPageRef}
                            hideSourceLabel
                            contentTopInset={headerInset}
                            onScrollOffsetChange={offsetY =>
                                onContentScroll(1, offsetY)
                            }
                        />
                    ) : null}
                </View>
            </PagerView>

            <Animated.View
                onLayout={onHeaderLayout}
                pointerEvents={isHeaderInteractive ? 'auto' : 'none'}
                style={[styles.floatingHeader, floatingHeaderStyle]}>
                <LiquidGlassView
                    interactive={true}
                    hover={
                        isLiquidGlassSupported ? { effect: 'highlight' } : null
                    }
                    style={[
                        styles.headerSurface,
                        {
                            backgroundColor: isLiquidGlassSupported
                                ? null
                                : white,
                        },
                        isLiquidGlassSupported ? null : viewShadow,
                    ]}>
                    <SegmentControl
                        options={segmentOptions}
                        selectedIndex={pageIndex}
                        onChange={onSegmentChange}
                        style={styles.segment}
                        trackBackgroundColor={white}
                    />
                    <Pressable
                        onPress={onSourceInfoPress}
                        hitSlop={8}
                        style={({ pressed }) => [
                            styles.sourceRow,
                            pressed && { opacity: 0.6 },
                        ]}>
                        <Text
                            style={[
                                styles.sourceText,
                                { color: black.third },
                            ]}>
                            {t('來源：UM Open Data')}
                        </Text>
                        <Ionicons
                            name="information-circle-outline"
                            size={scale(14)}
                            color={black.third}
                            style={styles.sourceIcon}
                        />
                    </Pressable>
                </LiquidGlassView>
                <LiquidGlassView
                    interactive={true}
                    hover={
                        isLiquidGlassSupported ? { effect: 'highlight' } : null
                    }
                    style={[
                        styles.scrollTopSurface,
                        {
                            backgroundColor: isLiquidGlassSupported
                                ? null
                                : white,
                        },
                        isLiquidGlassSupported ? null : viewShadow,
                    ]}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('回到頂部')}
                        onPress={onScrollToTopPress}
                        hitSlop={8}
                        style={({ pressed }) => [
                            styles.scrollTopPressable,
                            pressed && { opacity: 0.6 },
                        ]}>
                        <Ionicons
                            name="arrow-up"
                            size={scale(21)}
                            color={themeColor}
                        />
                    </Pressable>
                </LiquidGlassView>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    floatingHeader: {
        position: 'absolute',
        top: HEADER_TOP_OFFSET,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
        elevation: 10,
    },
    headerSurface: {
        alignItems: 'center',
        borderRadius: scale(18),
        paddingHorizontal: scale(10),
        paddingTop: verticalScale(5),
        paddingBottom: verticalScale(3),
        overflow: 'hidden',
    },
    scrollTopSurface: {
        position: 'absolute',
        right: scale(16),
        top: 0,
        width: scale(42),
        height: scale(42),
        borderRadius: scale(21),
        overflow: 'hidden',
    },
    scrollTopPressable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segment: {
        alignSelf: 'center',
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(3),
        paddingVertical: verticalScale(1),
    },
    sourceText: {
        ...uiStyle.defaultText,
        fontSize: verticalScale(11),
    },
    sourceIcon: {
        marginLeft: scale(2),
    },
    pager: {
        flex: 1,
    },
    page: {
        flex: 1,
    },
});

export default CampusPage;
