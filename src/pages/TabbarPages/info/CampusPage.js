import React, {useCallback, useMemo, useRef, useState} from 'react';
import {View, Text, StyleSheet, Pressable, Alert} from 'react-native';
import PagerView from 'react-native-pager-view';
import {scale, verticalScale} from 'react-native-size-matters';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';

import {useTheme, uiStyle} from '../../../components/ThemeContext';
import SegmentControl from '../../../components/SegmentControl';
import {trigger} from '../../../utils/trigger';
import {openLink} from '../../../utils/browser';
import {UM_OPEN_DATA} from '../../../utils/pathMap';

import UMEventPage from './UMEventPage';
import NewsPage from './NewsPage';

/**
 * 校園資訊頁：活動 / 新聞合併為單一 Top Tab
 * Segment 點選 + PagerView 左右滑同步切換
 */
const CampusPage = () => {
    const {theme} = useTheme();
    const {bg_color, black, white} = theme;
    const {t} = useTranslation('common');

    const pagerRef = useRef(null);
    const [pageIndex, setPageIndex] = useState(0);
    // 延遲掛載未造訪分頁，避免進校園就同時打兩支 Open Data API
    const [mountedPages, setMountedPages] = useState({0: true, 1: false});

    const segmentOptions = useMemo(
        () => [
            {key: 'event', label: t('TOPTAB_EVENT')},
            {key: 'news', label: t('TOPTAB_NEWS')},
        ],
        [t],
    );

    const ensureMounted = useCallback(index => {
        setMountedPages(prev =>
            prev[index] ? prev : {...prev, [index]: true},
        );
    }, []);

    const onSegmentChange = useCallback(
        index => {
            ensureMounted(index);
            setPageIndex(index);
            pagerRef.current?.setPage(index);
        },
        [ensureMounted],
    );

    const onPageSelected = useCallback(
        e => {
            const next = e.nativeEvent.position;
            ensureMounted(next);
            setPageIndex(next);
        },
        [ensureMounted],
    );

    const onSourceInfoPress = useCallback(() => {
        trigger();
        Alert.alert(
            t('來源：UM Open Data'),
            t('資料來自澳門大學開放數據平台，轉載時請確保內容準確。'),
            [
                {text: t('取消'), style: 'cancel'},
                {
                    text: t('開啟來源'),
                    onPress: () => openLink(UM_OPEN_DATA),
                },
            ],
            {cancelable: true},
        );
    }, [t]);

    return (
        <View style={[styles.container, {backgroundColor: bg_color}]}>
            {/* 頁頭：Segment + 弱化來源列 */}
            <View style={styles.header}>
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
                    style={({pressed}) => [
                        styles.sourceRow,
                        pressed && {opacity: 0.6},
                    ]}>
                    <Text style={[styles.sourceText, {color: black.third}]}>
                        {t('來源：UM Open Data')}
                    </Text>
                    <Ionicons
                        name="information-circle-outline"
                        size={scale(14)}
                        color={black.third}
                        style={styles.sourceIcon}
                    />
                </Pressable>
            </View>

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
                            hideSourceLabel
                            showScrollToTop={pageIndex === 0}
                        />
                    ) : null}
                </View>
                <View key="news" style={styles.page} collapsable={false}>
                    {mountedPages[1] ? (
                        <NewsPage
                            hideSourceLabel
                            showScrollToTop={pageIndex === 1}
                        />
                    ) : null}
                </View>
            </PagerView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(8),
        paddingBottom: verticalScale(4),
    },
    segment: {
        alignSelf: 'center',
    },
    sourceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(6),
        paddingVertical: verticalScale(2),
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
