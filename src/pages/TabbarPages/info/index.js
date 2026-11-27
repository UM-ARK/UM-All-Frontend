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
    Animated,
    Platform,
    StyleSheet,
    View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { HeaderHeightContext } from '@react-navigation/elements';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import NativeHeaderSegmentControl from '../../../components/NativeHeaderSegmentControl';
import ScrollToTopButton from '../../../components/ScrollToTopButton';
import SegmentedTabControl, {
    SEGMENTED_TAB_CONTROL_HEIGHT,
} from '../../../components/SegmentedTabControl';
import { SEARCH_FIELD_MIN_HEIGHT } from '../../../components/searchFieldStyles';
import { useTheme } from '../../../components/ThemeContext';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { isLiquidGlassSupported } from '../../../utils/glassEffect';
import { trigger } from '../../../utils/trigger';
import { TOP_TAB_STRIP_MAX_WIDTH } from '../../../utils/windowSizeClass';

import InfoSharedSearchBar from './components/InfoSharedSearchBar';
import ClubPage from './ClubPage';
import HomePage from './home/index';
import UMEventPage from './UMEventPage';
import NewsPage from './NewsPage';

const TAB_KEYS = ['club', 'home', 'event', 'news'];
const INITIAL_TAB_INDEX = 1; // 預設進入「推薦」
const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

// 原生導覽列 + stacked 滿寬搜尋列首次量測前的高度估算
const NATIVE_HEADER_FALLBACK_HEIGHT = 96;
const SEGMENT_BAR_PADDING_BOTTOM = verticalScale(6);
const DEFAULT_ANDROID_SEGMENT_BAR_HEIGHT =
    SEGMENTED_TAB_CONTROL_HEIGHT + SEGMENT_BAR_PADDING_BOTTOM;
const DEFAULT_ANDROID_SEARCH_BAR_HEIGHT = SEARCH_FIELD_MIN_HEIGHT + verticalScale(12);
const SEARCH_NAV_RESET_MS = 600;

const InfoNativeSegmentTitle = ({
    values,
    options,
    selectedIndex,
    position,
    onSelect,
}) => (
    <NativeHeaderSegmentControl
        values={values}
        options={options}
        selectedIndex={selectedIndex}
        position={position}
        onChange={onSelect}
        compact
    />
);

export default function NewsScreen() {
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t } = useTranslation(['common', 'club', 'features']);
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const useNativeHeader = Platform.OS === 'ios';
    const useNativeLiquidGlassHeader = useNativeHeader && isLiquidGlassSupported;
    const nativeHeaderHeight = useContext(HeaderHeightContext) ?? 0;

    const pagerRef = useRef(null);
    const nativeSearchBarRef = useRef(null);
    const androidSearchBarRef = useRef(null);
    const homePageRef = useRef(null);
    const eventPageRef = useRef(null);
    const newsPageRef = useRef(null);

    const pageIndexRef = useRef(INITIAL_TAB_INDEX);
    const activeTabKeyRef = useRef(TAB_KEYS[INITIAL_TAB_INDEX]);
    const tappedIndexRef = useRef(null);
    const isNavigatingToSearchRef = useRef(false);
    const searchNavResetTimerRef = useRef(null);

    const pageScrollPosition = useRef(new Animated.Value(INITIAL_TAB_INDEX)).current;
    const pageScrollOffset = useRef(new Animated.Value(0)).current;

    const [pageIndex, setPageIndex] = useState(INITIAL_TAB_INDEX);
    const [viewport, setViewport] = useState(null);
    const [androidChromeHeight, setAndroidChromeHeight] = useState(
        insets.top + DEFAULT_ANDROID_SEARCH_BAR_HEIGHT + DEFAULT_ANDROID_SEGMENT_BAR_HEIGHT,
    );
    // 延遲掛載未造訪分頁，避免進資訊頁就同時發起組織與 Open Data 請求
    const [mountedPages, setMountedPages] = useState({
        0: false,
        1: true,
        2: false,
        3: false,
    });
    // 按分頁各自保存搜尋關鍵字，切分頁不遺失且僅通知對應子頁重渲染
    const [searchQueries, setSearchQueries] = useState({
        club: '',
        event: '',
        news: '',
    });
    const searchQueriesRef = useRef(searchQueries);

    const activeTabKey = TAB_KEYS[pageIndex] ?? 'home';

    const segmentOptions = useMemo(
        () => [
            { key: 'club', label: t('TOPTAB_CLUB') },
            { key: 'home', label: t('TOPTAB_MAIN') },
            { key: 'event', label: t('TOPTAB_EVENT') },
            { key: 'news', label: t('TOPTAB_NEWS') },
        ],
        [t],
    );
    const segmentValues = useMemo(
        () => segmentOptions.map(option => option.label),
        [segmentOptions],
    );

    const activeSearchPlaceholder = useMemo(() => {
        switch (activeTabKey) {
            case 'club':
                return t('club:SEARCH_PLACEHOLDER');
            case 'event':
                return t('搜索澳大活動', { ns: 'common' });
            case 'news':
                return t('搜索澳大新聞', { ns: 'common' });
            case 'home':
            default:
                return `${t('搜索', { ns: 'common' })}: ${t('關於澳大的一切...', { ns: 'features' })}`;
        }
    }, [activeTabKey, t]);

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

    const updateTabQuery = useCallback((tabKey, text) => {
        if (searchQueriesRef.current[tabKey] === text) {
            return;
        }
        searchQueriesRef.current = {
            ...searchQueriesRef.current,
            [tabKey]: text,
        };
        setSearchQueries(prev => (
            prev[tabKey] === text ? prev : { ...prev, [tabKey]: text }
        ));
    }, []);

    const handleHomeSearchEntry = useCallback(() => {
        if (isNavigatingToSearchRef.current) {
            return;
        }
        isNavigatingToSearchRef.current = true;
        if (searchNavResetTimerRef.current) {
            clearTimeout(searchNavResetTimerRef.current);
        }
        searchNavResetTimerRef.current = setTimeout(() => {
            isNavigatingToSearchRef.current = false;
            searchNavResetTimerRef.current = null;
        }, SEARCH_NAV_RESET_MS);
        logToFirebase('funcUse', { funcName: 'home_search_entry' });
        navigation.navigate('Search');
    }, [navigation]);

    useFocusEffect(
        useCallback(() => {
            isNavigatingToSearchRef.current = false;
            return () => {
                isNavigatingToSearchRef.current = false;
            };
        }, []),
    );

    useEffect(() => () => {
        if (searchNavResetTimerRef.current) {
            clearTimeout(searchNavResetTimerRef.current);
            searchNavResetTimerRef.current = null;
        }
    }, []);

    const handleNativeSearchFocus = useCallback(() => {
        if (activeTabKeyRef.current === 'home') {
            nativeSearchBarRef.current?.cancelSearch();
            trigger();
            handleHomeSearchEntry();
            return;
        }
        trigger();
    }, [handleHomeSearchEntry]);

    const handleNativeSearchChangeText = useCallback(event => {
        const text = event?.nativeEvent?.text ?? '';
        const tabKey = activeTabKeyRef.current;
        if (tabKey === 'home') {
            if (text) {
                nativeSearchBarRef.current?.clearText();
            }
            return;
        }
        updateTabQuery(tabKey, text);
    }, [updateTabQuery]);

    const handleNativeSearchCancel = useCallback(() => {
        const tabKey = activeTabKeyRef.current;
        if (tabKey === 'home') {
            return;
        }
        updateTabQuery(tabKey, '');
    }, [updateTabQuery]);

    const handleAndroidSearchChangeText = useCallback(text => {
        const tabKey = activeTabKeyRef.current;
        if (tabKey === 'home') {
            return;
        }
        updateTabQuery(tabKey, text);
    }, [updateTabQuery]);

    const handleAndroidSearchCancel = useCallback(() => {
        const tabKey = activeTabKeyRef.current;
        if (tabKey === 'home') {
            return;
        }
        updateTabQuery(tabKey, '');
    }, [updateTabQuery]);

    const handleAndroidSearchFocus = useCallback(() => {
        trigger();
    }, []);

    const syncSearchBarForTab = useCallback(nextKey => {
        activeTabKeyRef.current = nextKey;
        if (useNativeHeader) {
            if (nextKey === 'home') {
                nativeSearchBarRef.current?.cancelSearch();
            } else {
                nativeSearchBarRef.current?.blur();
                nativeSearchBarRef.current?.setText(
                    searchQueriesRef.current[nextKey] ?? '',
                );
            }
            return;
        }
        androidSearchBarRef.current?.blur();
    }, [useNativeHeader]);

    const ensureMounted = useCallback(index => {
        setMountedPages(prev => (
            prev[index] ? prev : { ...prev, [index]: true }
        ));
    }, []);

    const onSegmentPress = useCallback(index => {
        const nextKey = TAB_KEYS[index];
        if (!nextKey) {
            return;
        }
        if (pageIndexRef.current === index) {
            trigger();
            return;
        }
        trigger('selection');
        tappedIndexRef.current = index;
        ensureMounted(index);
        pageIndexRef.current = index;
        syncSearchBarForTab(nextKey);
        setPageIndex(index);
        pagerRef.current?.setPage(index);
    }, [ensureMounted, syncSearchBarForTab]);

    useLayoutEffect(() => {
        if (!useNativeHeader) {
            return;
        }
        navigation.setOptions({
            headerShown: true,
            headerTitle: () => (
                <InfoNativeSegmentTitle
                    values={segmentValues}
                    options={segmentOptions}
                    selectedIndex={pageIndex}
                    position={tabPosition}
                    onSelect={onSegmentPress}
                />
            ),
            contentStyle: { backgroundColor: bg_color },
            headerSearchBarOptions: {
                ref: nativeSearchBarRef,
                placeholder: activeSearchPlaceholder,
                hideWhenScrolling: false,
                hideNavigationBar: false,
                obscureBackground: false,
                placement: 'stacked',
                allowToolbarIntegration: false,
                tintColor: themeColor,
                textColor: black.main,
                hintTextColor: black.third,
                onFocus: handleNativeSearchFocus,
                onChangeText: handleNativeSearchChangeText,
                onCancelButtonPress: handleNativeSearchCancel,
            },
        });
    }, [
        activeSearchPlaceholder,
        bg_color,
        black.main,
        black.third,
        handleNativeSearchCancel,
        handleNativeSearchChangeText,
        handleNativeSearchFocus,
        navigation,
        onSegmentPress,
        pageIndex,
        segmentOptions,
        segmentValues,
        tabPosition,
        themeColor,
        useNativeHeader,
    ]);

    const onPageSelected = useCallback(event => {
        const next = event.nativeEvent.position;
        const nextKey = TAB_KEYS[next];
        if (!nextKey) {
            return;
        }
        const fromTap = tappedIndexRef.current === next;
        tappedIndexRef.current = null;
        if (!fromTap && pageIndexRef.current !== next) {
            trigger('selection');
        }
        ensureMounted(next);
        if (pageIndexRef.current !== next) {
            pageIndexRef.current = next;
            syncSearchBarForTab(nextKey);
            setPageIndex(next);
        }
    }, [ensureMounted, syncSearchBarForTab]);

    const handleAndroidChromeLayout = useCallback(event => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        if (nextHeight <= 0) {
            return;
        }
        setAndroidChromeHeight(current => (current === nextHeight ? current : nextHeight));
    }, []);

    const onScrollToTopPress = useCallback(() => {
        if (activeTabKeyRef.current === 'home') {
            homePageRef.current?.scrollToTop();
        } else if (activeTabKeyRef.current === 'event') {
            eventPageRef.current?.scrollToTop();
        } else if (activeTabKeyRef.current === 'news') {
            newsPageRef.current?.scrollToTop();
        }
    }, []);

    const effectiveNativeHeaderHeight =
        nativeHeaderHeight || (insets.top + NATIVE_HEADER_FALLBACK_HEIGHT);
    const totalTopChromeHeight = useNativeHeader
        ? effectiveNativeHeaderHeight
        : androidChromeHeight;

    const showSharedScrollTop = activeTabKey !== 'club';

    return (
        <View
            onLayout={event => setViewport(event.nativeEvent.layout)}
            style={[styles.container, { backgroundColor: bg_color }]}>
            {useNativeHeader ? null : (
                <View
                    pointerEvents="box-none"
                    onLayout={handleAndroidChromeLayout}
                    style={[
                        styles.androidTopChrome,
                        { paddingTop: insets.top },
                    ]}>
                    <View style={styles.androidChromeInner}>
                        <InfoSharedSearchBar
                            ref={androidSearchBarRef}
                            mode={activeTabKey === 'home' ? 'navigate' : 'input'}
                            value={activeTabKey === 'home' ? '' : (searchQueries[activeTabKey] ?? '')}
                            onChangeText={handleAndroidSearchChangeText}
                            onFocus={handleAndroidSearchFocus}
                            onCancel={handleAndroidSearchCancel}
                            onNavigatePress={handleHomeSearchEntry}
                            placeholder={activeSearchPlaceholder}
                            cancelLabel={t('取消', { ns: 'common' })}
                            clearAccessibilityLabel={t('清除搜尋', { ns: 'common' })}
                        />
                        <View style={styles.androidSegmentWrap}>
                            <SegmentedTabControl
                                options={segmentOptions}
                                selectedIndex={pageIndex}
                                position={tabPosition}
                                onChange={onSegmentPress}
                                fullWidth
                            />
                        </View>
                    </View>
                </View>
            )}

            <AnimatedPagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={INITIAL_TAB_INDEX}
                onPageScroll={onPageScroll}
                onPageSelected={onPageSelected}
                overdrag
                offscreenPageLimit={1}>
                <View key="club" style={styles.page} collapsable={false}>
                    {mountedPages[0] ? (
                        <ClubPage
                            topChromeHeight={totalTopChromeHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                            searchQuery={searchQueries.club}
                        />
                    ) : null}
                </View>
                <View key="home" style={styles.page} collapsable={false}>
                    {mountedPages[1] ? (
                        <HomePage
                            ref={homePageRef}
                            navigation={navigation}
                            topChromeHeight={totalTopChromeHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                        />
                    ) : null}
                </View>
                <View key="event" style={styles.page} collapsable={false}>
                    {mountedPages[2] ? (
                        <UMEventPage
                            ref={eventPageRef}
                            topHeaderHeight={totalTopChromeHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                            searchQuery={searchQueries.event}
                        />
                    ) : null}
                </View>
                <View key="news" style={styles.page} collapsable={false}>
                    {mountedPages[3] ? (
                        <NewsPage
                            ref={newsPageRef}
                            topHeaderHeight={totalTopChromeHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                            searchQuery={searchQueries.news}
                        />
                    ) : null}
                </View>
            </AnimatedPagerView>

            {viewport ? (
                <ScrollToTopButton
                    viewport={viewport}
                    topInset={totalTopChromeHeight}
                    visible={showSharedScrollTop}
                    onScrollToTop={onScrollToTopPress}
                    style={styles.scrollTopButton}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    androidTopChrome: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        paddingHorizontal: scale(12),
    },
    androidChromeInner: {
        width: '100%',
        maxWidth: TOP_TAB_STRIP_MAX_WIDTH,
        alignSelf: 'center',
    },
    androidSegmentWrap: {
        width: '100%',
        paddingBottom: SEGMENT_BAR_PADDING_BOTTOM,
    },
    pager: {
        flex: 1,
    },
    page: {
        flex: 1,
    },
    scrollTopButton: {
        zIndex: 30,
        elevation: 30,
    },
});
