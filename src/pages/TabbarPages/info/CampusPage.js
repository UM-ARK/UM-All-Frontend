import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import ScrollToTopButton from '../../../components/ScrollToTopButton';
import { useAppReducedMotion } from '../../../contexts/ReducedMotionContext';
import { GlassView, isLiquidGlassSupported } from '../../../utils/glassEffect';
import { trigger } from '../../../utils/trigger';
import { TOP_TAB_STRIP_MAX_WIDTH } from '../../../utils/windowSizeClass';

import UMEventPage from './UMEventPage';
import NewsPage from './NewsPage';

const TOP_TAB_SCALE_FACTOR = 0.1;
const SEGMENT_TRACK_PADDING = scale(2.5);
const SEGMENT_ITEM_HEIGHT = moderateScale(22, TOP_TAB_SCALE_FACTOR);
const SEGMENT_BAR_PADDING_TOP = verticalScale(4);
const SEGMENT_BAR_PADDING_BOTTOM = verticalScale(2);
const SEGMENT_CAPSULE_WIDTH = scale(140);
const SEGMENT_LABEL_FONT_SIZE = moderateScale(10, 0.25);
const TopTabTrackContainer = isLiquidGlassSupported ? GlassView : View;
const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

/**
 * 校園資訊頁：活動 / 新聞合併為單一 Top Tab。
 * 分段切換器對齊服務頁膠囊；左右滑仍由 PagerView 換頁。
 */
const CampusPage = ({ topChromeHeight }) => {
    const { theme } = useTheme();
    const { bg_color, isLight, white, black, featuresScreen, pressOverlay, viewShadow } = theme;
    const { t } = useTranslation('common');
    const reducedMotion = useAppReducedMotion();
    const topHeaderHeight = topChromeHeight + SEGMENT_BAR_PADDING_TOP + SEGMENT_ITEM_HEIGHT +
        SEGMENT_TRACK_PADDING * 2 + SEGMENT_BAR_PADDING_BOTTOM;

    const pagerRef = useRef(null);
    const eventPageRef = useRef(null);
    const newsPageRef = useRef(null);
    const pageIndexRef = useRef(0);
    const pageScrollPosition = useRef(new Animated.Value(0)).current;
    const pageScrollOffset = useRef(new Animated.Value(0)).current;
    // 點分段時已有 selection 觸覺，落頁時不要再打一次
    const tappedIndexRef = useRef(null);
    const [pageIndex, setPageIndex] = useState(0);
    const [trackWidth, setTrackWidth] = useState(0);
    const [viewport, setViewport] = useState(null);
    // 延遲掛載未造訪分頁，避免進校園就同時打兩支 Open Data API
    const [mountedPages, setMountedPages] = useState({ 0: true, 1: false });

    const segmentOptions = useMemo(
        () => [
            { key: 'event', label: t('TOPTAB_EVENT') },
            { key: 'news', label: t('TOPTAB_NEWS') },
        ],
        [t],
    );
    const tabPosition = useMemo(
        () => Animated.add(pageScrollPosition, pageScrollOffset),
        [pageScrollOffset, pageScrollPosition],
    );
    const onPageScroll = useMemo(
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

    const ensureMounted = useCallback(index => {
        setMountedPages(prev =>
            prev[index] ? prev : { ...prev, [index]: true },
        );
    }, []);

    const onSegmentPress = useCallback(
        index => {
            if (pageIndexRef.current === index) {
                trigger();
                return;
            }
            trigger('selection');
            tappedIndexRef.current = index;
            ensureMounted(index);
            pageIndexRef.current = index;
            setPageIndex(index);
            pagerRef.current?.setPage(index);
        },
        [ensureMounted],
    );

    const onPageSelected = useCallback(
        e => {
            const next = e.nativeEvent.position;
            const fromTap = tappedIndexRef.current === next;
            tappedIndexRef.current = null;
            if (!fromTap && pageIndexRef.current !== next) {
                trigger('selection');
            }
            ensureMounted(next);
            pageIndexRef.current = next;
            setPageIndex(next);
        },
        [ensureMounted],
    );

    const onScrollToTopPress = useCallback(() => {
        const currentPageIndex = pageIndexRef.current;
        if (currentPageIndex === 0) {
            eventPageRef.current?.scrollToTop();
        } else {
            newsPageRef.current?.scrollToTop();
        }
    }, []);

    const routeCount = segmentOptions.length;
    const segmentWidth =
        trackWidth > 0 && routeCount > 0
            ? (trackWidth - SEGMENT_TRACK_PADDING * 2) / routeCount
            : 0;
    const thumbTranslateX =
        reducedMotion || routeCount <= 1
            ? pageIndex * segmentWidth
            : tabPosition.interpolate({
                inputRange: segmentOptions.map((_, index) => index),
                outputRange: segmentOptions.map((_, index) => index * segmentWidth),
                extrapolate: 'clamp',
            });

    return (
        <View
            onLayout={event => setViewport(event.nativeEvent.layout)}
            style={[styles.container, { backgroundColor: bg_color }]}>
            <View pointerEvents="box-none" style={[styles.segmentBar, { top: topChromeHeight }]}>
                <TopTabTrackContainer
                    {...(isLiquidGlassSupported ? { isInteractive: true } : {})}
                    onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
                    style={[
                        styles.segmentTrack,
                        !isLiquidGlassSupported && { backgroundColor: white },
                        !isLiquidGlassSupported && isLight && viewShadow,
                    ]}>
                    {segmentWidth > 0 ? (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.segmentThumb,
                                {
                                    width: segmentWidth,
                                    backgroundColor: isLight
                                        ? featuresScreen.divider
                                        : pressOverlay,
                                    transform: [{ translateX: thumbTranslateX }],
                                },
                            ]}
                        />
                    ) : null}
                    {segmentOptions.map((option, index) => {
                        const isFocused = pageIndex === index;

                        return (
                            <ScalePressable
                                key={option.key}
                                accessibilityRole="tab"
                                accessibilityState={{ selected: isFocused }}
                                accessibilityLabel={option.label}
                                onPress={() => onSegmentPress(index)}
                                style={styles.segmentButton}>
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.segmentLabel,
                                        isFocused && styles.segmentLabelActive,
                                        { color: isFocused ? black.main : black.third },
                                    ]}>
                                    {option.label}
                                </Text>
                            </ScalePressable>
                        );
                    })}
                </TopTabTrackContainer>
            </View>
            <AnimatedPagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={0}
                onPageScroll={onPageScroll}
                onPageSelected={onPageSelected}
                overdrag
                offscreenPageLimit={1}>
                <View key="event" style={styles.page} collapsable={false}>
                    {mountedPages[0] ? (
                        <UMEventPage ref={eventPageRef} topHeaderHeight={topHeaderHeight} />
                    ) : null}
                </View>
                <View key="news" style={styles.page} collapsable={false}>
                    {mountedPages[1] ? (
                        <NewsPage ref={newsPageRef} topHeaderHeight={topHeaderHeight} />
                    ) : null}
                </View>
            </AnimatedPagerView>

            {viewport && (
                <ScrollToTopButton
                    viewport={viewport}
                    topInset={topChromeHeight}
                    onScrollToTop={onScrollToTopPress}
                    style={styles.scrollTopButton}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    segmentBar: {
        position: 'absolute',
        zIndex: 2,
        width: '100%',
        maxWidth: TOP_TAB_STRIP_MAX_WIDTH,
        alignSelf: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        paddingTop: SEGMENT_BAR_PADDING_TOP,
        paddingBottom: SEGMENT_BAR_PADDING_BOTTOM,
    },
    segmentTrack: {
        width: SEGMENT_CAPSULE_WIDTH,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(999),
        padding: SEGMENT_TRACK_PADDING,
        overflow: 'hidden',
    },
    segmentThumb: {
        position: 'absolute',
        top: SEGMENT_TRACK_PADDING,
        bottom: SEGMENT_TRACK_PADDING,
        left: SEGMENT_TRACK_PADDING,
        borderRadius: scale(999),
    },
    segmentButton: {
        flex: 1,
        height: SEGMENT_ITEM_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(999),
    },
    segmentLabel: {
        ...uiStyle.defaultText,
        fontSize: SEGMENT_LABEL_FONT_SIZE,
        fontWeight: '400',
    },
    segmentLabelActive: {
        fontWeight: '600',
    },
    scrollTopButton: {
        zIndex: 30,
        elevation: 30,
    },
    pager: {
        flex: 1,
    },
    page: {
        flex: 1,
    },
});

export default CampusPage;
