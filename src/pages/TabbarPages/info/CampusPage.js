import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../components/ThemeContext';
import SegmentControl from '../../../components/SegmentControl';
import ScrollToTopButton from '../../../components/ScrollToTopButton';
import { trigger } from '../../../utils/trigger';

import UMEventPage from './UMEventPage';
import NewsPage from './NewsPage';

/**
 * 校園資訊頁：活動 / 新聞合併為單一 Top Tab。
 * 分段控制與頂部 Tab 同屬一塊實色表面；左右滑仍由 PagerView 換頁。
 */
const CampusPage = () => {
    const { theme } = useTheme();
    const { bg_color, tonal } = theme;
    const { t } = useTranslation('common');

    const pagerRef = useRef(null);
    const eventPageRef = useRef(null);
    const newsPageRef = useRef(null);
    const pageIndexRef = useRef(0);
    // 點分段時已有 selection 觸覺，落頁時不要再打一次
    const tappedIndexRef = useRef(null);
    const [pageIndex, setPageIndex] = useState(0);
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

    const onSegmentChange = useCallback(
        index => {
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
        <View style={[styles.container, { backgroundColor: bg_color }]}>
            <View style={[styles.segmentBar, { backgroundColor: bg_color }]}>
                <SegmentControl
                    fill
                    options={segmentOptions}
                    selectedIndex={pageIndex}
                    onChange={onSegmentChange}
                    trackBackgroundColor={tonal.primary08}
                    style={styles.segment}
                />
            </View>
            <PagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={0}
                onPageSelected={onPageSelected}
                overdrag
                offscreenPageLimit={1}>
                <View key="event" style={styles.page} collapsable={false}>
                    {mountedPages[0] ? (
                        <UMEventPage ref={eventPageRef} />
                    ) : null}
                </View>
                <View key="news" style={styles.page} collapsable={false}>
                    {mountedPages[1] ? (
                        <NewsPage ref={newsPageRef} />
                    ) : null}
                </View>
            </PagerView>

            <ScrollToTopButton onScrollToTop={onScrollToTopPress} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    segmentBar: {
        paddingLeft: scale(8),
        paddingRight: scale(14),
        paddingTop: verticalScale(6),
        paddingBottom: verticalScale(2),
    },
    segment: {
        alignSelf: 'stretch',
    },
    pager: {
        flex: 1,
    },
    page: {
        flex: 1,
    },
});

export default CampusPage;
