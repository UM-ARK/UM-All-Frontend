import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import SegmentedTabControl, { SMALL_SEGMENTED_TAB_CONTROL_HEIGHT } from '../../../components/SegmentedTabControl';
import { useTheme } from '../../../components/ThemeContext';
import ScrollToTopButton from '../../../components/ScrollToTopButton';
import { trigger } from '../../../utils/trigger';
import { TOP_TAB_STRIP_MAX_WIDTH } from '../../../utils/windowSizeClass';

import UMEventPage from './UMEventPage';
import NewsPage from './NewsPage';

const SEGMENT_BAR_PADDING_TOP = verticalScale(4);
const SEGMENT_BAR_PADDING_BOTTOM = verticalScale(2);
const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

/**
 * 校園資訊頁：活動 / 新聞合併為單一 Top Tab。
 * 分段切換器對齊服務頁膠囊；左右滑仍由 PagerView 換頁。
 */
const CampusPage = ({ topChromeHeight, useNativeLiquidGlassHeader = false }) => {
    const { theme } = useTheme();
    const { bg_color } = theme;
    const { t } = useTranslation('common');
    const topHeaderHeight = topChromeHeight + SEGMENT_BAR_PADDING_TOP +
        SMALL_SEGMENTED_TAB_CONTROL_HEIGHT + SEGMENT_BAR_PADDING_BOTTOM;

    const pagerRef = useRef(null);
    const eventPageRef = useRef(null);
    const newsPageRef = useRef(null);
    const pageIndexRef = useRef(0);
    const pageScrollPosition = useRef(new Animated.Value(0)).current;
    const pageScrollOffset = useRef(new Animated.Value(0)).current;
    // 點分段時已有 selection 觸覺，落頁時不要再打一次
    const tappedIndexRef = useRef(null);
    const [pageIndex, setPageIndex] = useState(0);
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

    return (
        <View
            onLayout={event => setViewport(event.nativeEvent.layout)}
            style={[styles.container, { backgroundColor: bg_color }]}>
            <View pointerEvents="box-none" style={[styles.segmentBar, { top: topChromeHeight }]}>
                <SegmentedTabControl
                    options={segmentOptions}
                    selectedIndex={pageIndex}
                    position={tabPosition}
                    onChange={onSegmentPress}
                    small
                    glass={useNativeLiquidGlassHeader}
                    glassInteractive
                />
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
                        <UMEventPage
                            ref={eventPageRef}
                            topHeaderHeight={topHeaderHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                        />
                    ) : null}
                </View>
                <View key="news" style={styles.page} collapsable={false}>
                    {mountedPages[1] ? (
                        <NewsPage
                            ref={newsPageRef}
                            topHeaderHeight={topHeaderHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                        />
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
