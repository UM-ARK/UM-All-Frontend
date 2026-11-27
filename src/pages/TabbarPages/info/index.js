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
import { getDefaultHeaderHeight, HeaderHeightContext } from '@react-navigation/elements';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import Text from '../../../components/AppText';
import NativeHeaderSegmentControl from '../../../components/NativeHeaderSegmentControl';
import ScrollToTopButton from '../../../components/ScrollToTopButton';
import SearchFieldContainer from '../../../components/SearchFieldContainer';
import SegmentedTabControl, {
    SEGMENTED_TAB_CONTROL_HEIGHT,
} from '../../../components/SegmentedTabControl';
import searchFieldStyles, {
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
    SEARCH_FIELD_MIN_HEIGHT,
} from '../../../components/searchFieldStyles';
import { useTheme } from '../../../components/ThemeContext';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { isLiquidGlassSupported } from '../../../utils/glassEffect';
import { trigger } from '../../../utils/trigger';
import { TOP_TAB_STRIP_MAX_WIDTH } from '../../../utils/windowSizeClass';

import InfoSharedSearchBar from './components/InfoSharedSearchBar';
import ClubPage from './ClubPage';
import HomePage from './home/index';
import PhosphorFeatureIcon from './home/search/components/PhosphorFeatureIcon';
import UMEventPage from './UMEventPage';
import NewsPage from './NewsPage';

const TAB_KEYS = ['club', 'home', 'event', 'news'];
const INITIAL_TAB_INDEX = 1; // 預設進入「推薦」
const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

// 原生搜尋列尚未回報高度時，先在導覽列下預留 stacked 搜尋列空間。
const NATIVE_STACKED_SEARCH_FALLBACK_HEIGHT = 60;
const SEGMENT_BAR_PADDING_TOP = verticalScale(6);
const DEFAULT_ANDROID_SEGMENT_BAR_HEIGHT =
    SEGMENTED_TAB_CONTROL_HEIGHT + SEGMENT_BAR_PADDING_TOP;
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
    const frame = useSafeAreaFrame();

    const useNativeHeader = Platform.OS === 'ios';
    const useNativeLiquidGlassHeader = useNativeHeader && isLiquidGlassSupported;
    const nativeHeaderHeight = useContext(HeaderHeightContext) ?? 0;

    const pagerRef = useRef(null);
    const nativeSearchBarRef = useRef(null);
    const restoreNativeSearchQueryRef = useRef(false);
    const androidSearchBarRef = useRef(null);
    const homePageRef = useRef(null);
    const eventPageRef = useRef(null);
    const newsPageRef = useRef(null);

    const pageIndexRef = useRef(INITIAL_TAB_INDEX);
    const activeTabKeyRef = useRef(TAB_KEYS[INITIAL_TAB_INDEX]);
    const isNavigatingToSearchRef = useRef(false);
    const searchNavResetTimerRef = useRef(null);

    const pageScrollPosition = useRef(new Animated.Value(INITIAL_TAB_INDEX)).current;
    const pageScrollOffset = useRef(new Animated.Value(0)).current;

    const [pageIndex, setPageIndex] = useState(INITIAL_TAB_INDEX);
    const homeHeaderTint = useSharedValue(1);
    const [viewport, setViewport] = useState(null);
    const [nativeHeaderMeasurements, setNativeHeaderMeasurements] = useState(null);
    const [androidChromeHeight, setAndroidChromeHeight] = useState(
        insets.top + DEFAULT_ANDROID_SEGMENT_BAR_HEIGHT + DEFAULT_ANDROID_SEARCH_BAR_HEIGHT,
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
    const showNativeHomeSearchButton = useNativeHeader && activeTabKey === 'home';
    const headerTransparent = useNativeLiquidGlassHeader || activeTabKey === 'home';
    const nativeToolbarEstimate = getDefaultHeaderHeight(frame, false, insets.top);
    // 切頁後原生高度可能仍是上一個分頁的值，依高度辨認導覽列是否含搜尋列。
    const nativeHeaderKind = nativeHeaderHeight >= nativeToolbarEstimate + SEARCH_FIELD_MIN_HEIGHT / 2
        ? 'stacked'
        : 'toolbar';
    const measurements = nativeHeaderMeasurements?.toolbarEstimate === nativeToolbarEstimate
        ? nativeHeaderMeasurements
        : null;
    const nativeToolbarHeight = (nativeHeaderKind === 'toolbar' && nativeHeaderHeight)
        || measurements?.toolbar || nativeToolbarEstimate;
    const nativeStackedHeight = (nativeHeaderKind === 'stacked' && nativeHeaderHeight)
        || measurements?.stacked || (nativeToolbarHeight + NATIVE_STACKED_SEARCH_FALLBACK_HEIGHT);

    useLayoutEffect(() => {
        if (!useNativeHeader || !nativeHeaderHeight) {
            return;
        }
        setNativeHeaderMeasurements(previous => ({
            ...(previous?.toolbarEstimate === nativeToolbarEstimate ? previous : null),
            toolbarEstimate: nativeToolbarEstimate,
            [nativeHeaderKind]: nativeHeaderHeight,
        }));
    }, [nativeHeaderHeight, nativeHeaderKind, nativeToolbarEstimate, useNativeHeader]);

    const homeSeaColor = theme.homeCoast.deep;
    const homeHeaderStyle = useAnimatedStyle(() => ({ opacity: homeHeaderTint.get() }));

    const renderHomeHeaderBackground = useCallback(() => (
        <Reanimated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { height: nativeToolbarHeight }, homeHeaderStyle]}>
            <LinearGradient
                colors={[homeSeaColor, homeSeaColor, `${homeSeaColor}00`]}
                locations={[0, 0.64, 1]}
                style={StyleSheet.absoluteFill}
            />
        </Reanimated.View>
    ), [homeHeaderStyle, homeSeaColor, nativeToolbarHeight]);

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

    const handleSearchFocus = useCallback(() => {
        trigger();
    }, []);

    const handleNativeHomeSearchPress = useCallback(() => {
        trigger();
        handleHomeSearchEntry();
    }, [handleHomeSearchEntry]);

    const handleNativeSearchChangeText = useCallback(event => {
        const text = event?.nativeEvent?.text ?? '';
        const tabKey = activeTabKeyRef.current;
        if (tabKey === 'home') {
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

    const attachNativeSearchBar = useCallback(searchBar => {
        nativeSearchBarRef.current = searchBar;
        if (searchBar && restoreNativeSearchQueryRef.current) {
            restoreNativeSearchQueryRef.current = false;
            searchBar.setText(searchQueriesRef.current[activeTabKeyRef.current] ?? '');
        }
    }, []);

    const syncSearchBarForTab = useCallback(nextKey => {
        activeTabKeyRef.current = nextKey;
        if (useNativeHeader) {
            const searchBar = nativeSearchBarRef.current;
            restoreNativeSearchQueryRef.current = nextKey !== 'home' && !searchBar;
            if (nextKey === 'home') {
                searchBar?.cancelSearch();
            } else {
                searchBar?.blur();
                searchBar?.setText(searchQueriesRef.current[nextKey] ?? '');
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
            return;
        }
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
            headerTransparent,
            headerStyle: { backgroundColor: headerTransparent ? 'transparent' : bg_color },
            headerBackground: activeTabKey === 'home' ? renderHomeHeaderBackground : undefined,
            contentStyle: { backgroundColor: bg_color },
            headerSearchBarOptions: activeTabKey === 'home' ? undefined : {
                ref: attachNativeSearchBar,
                placeholder: activeSearchPlaceholder,
                hideWhenScrolling: false,
                hideNavigationBar: false,
                obscureBackground: false,
                placement: 'stacked',
                allowToolbarIntegration: false,
                tintColor: themeColor,
                textColor: black.main,
                hintTextColor: black.third,
                onFocus: handleSearchFocus,
                onChangeText: handleNativeSearchChangeText,
                onCancelButtonPress: handleNativeSearchCancel,
            },
        });
    }, [
        activeSearchPlaceholder,
        activeTabKey,
        attachNativeSearchBar,
        bg_color,
        black.main,
        black.third,
        handleNativeSearchCancel,
        handleNativeSearchChangeText,
        handleSearchFocus,
        headerTransparent,
        navigation,
        onSegmentPress,
        pageIndex,
        renderHomeHeaderBackground,
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

    const handleCalendarTouchChange = useCallback(isTouching => {
        pagerRef.current?.setScrollEnabled(!isTouching);
    }, []);

    const homeTopChromeHeight = useNativeHeader
        ? nativeToolbarHeight + SEARCH_FIELD_MIN_HEIGHT
        : androidChromeHeight;
    const listTopChromeHeight = useNativeHeader ? nativeStackedHeight : androidChromeHeight;
    const totalTopChromeHeight = activeTabKey === 'home' ? homeTopChromeHeight : listTopChromeHeight;

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
                        <View style={styles.androidSegmentWrap}>
                            <SegmentedTabControl
                                options={segmentOptions}
                                selectedIndex={pageIndex}
                                position={tabPosition}
                                onChange={onSegmentPress}
                                fullWidth
                            />
                        </View>
                        <InfoSharedSearchBar
                            ref={androidSearchBarRef}
                            mode={activeTabKey === 'home' ? 'navigate' : 'input'}
                            value={activeTabKey === 'home' ? '' : (searchQueries[activeTabKey] ?? '')}
                            onChangeText={handleAndroidSearchChangeText}
                            onFocus={handleSearchFocus}
                            onCancel={handleAndroidSearchCancel}
                            onNavigatePress={handleHomeSearchEntry}
                            placeholder={activeSearchPlaceholder}
                            cancelLabel={t('取消', { ns: 'common' })}
                            clearAccessibilityLabel={t('清除搜尋', { ns: 'common' })}
                        />
                    </View>
                </View>
            )}

            {showNativeHomeSearchButton ? (
                <View
                    pointerEvents="box-none"
                    style={[styles.nativeHomeSearchRow, { top: nativeToolbarHeight }]}>
                    <SearchFieldContainer
                        liquidGlass={useNativeLiquidGlassHeader}
                        accessibilityRole="button"
                        accessibilityLabel={t('搜索', { ns: 'common' })}
                        onPress={handleNativeHomeSearchPress}
                        fieldStyle={{ backgroundColor: theme.white }}>
                        <PhosphorFeatureIcon
                            name="search"
                            size={SEARCH_FIELD_ICON_SIZE}
                            color={black.third}
                            weight="regular"
                        />
                        <Text
                            numberOfLines={1}
                            maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                            style={[searchFieldStyles.text, { color: black.third }]}>
                            {activeSearchPlaceholder}
                        </Text>
                    </SearchFieldContainer>
                </View>
            ) : null}

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
                            topChromeHeight={listTopChromeHeight}
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
                            topChromeHeight={homeTopChromeHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                            isActive={activeTabKey === 'home'}
                            onCalendarTouchChange={handleCalendarTouchChange}
                            headerTint={useNativeHeader ? homeHeaderTint : undefined}
                        />
                    ) : null}
                </View>
                <View key="event" style={styles.page} collapsable={false}>
                    {mountedPages[2] ? (
                        <UMEventPage
                            ref={eventPageRef}
                            topHeaderHeight={listTopChromeHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                            searchQuery={searchQueries.event}
                        />
                    ) : null}
                </View>
                <View key="news" style={styles.page} collapsable={false}>
                    {mountedPages[3] ? (
                        <NewsPage
                            ref={newsPageRef}
                            topHeaderHeight={listTopChromeHeight}
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
        paddingTop: SEGMENT_BAR_PADDING_TOP,
    },
    nativeHomeSearchRow: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 2,
        paddingHorizontal: scale(12),
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
