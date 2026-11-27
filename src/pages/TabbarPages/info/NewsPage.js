import React, {
    forwardRef,
    useState,
    useEffect,
    useRef,
    useContext,
    useCallback,
    useImperativeHandle,
    useMemo,
} from 'react';
import {
    Animated,
    Platform,
    View,
    VirtualizedList,
    RefreshControl,
    StyleSheet,
} from 'react-native';

import Text from '../../../components/AppText';
import TopScrollEdgeBackdrop from '../../../components/TopScrollEdgeBackdrop';
import ScalePressable from '../../../components/ScalePressable';
import ClubSearchBar from './components/ClubSearchBar';
import NewsCard, { NewsRowSeparator } from './components/NewsCard';
import NewsListSkeleton from './components/NewsListSkeleton';
import SearchHighlightText from './components/SearchHighlightText';
import {
    filterUMOpenDataItemsBySearchQuery,
    pickDisplayedTitles,
} from './utils/umOpenDataSearch';
import { useStickySearchHeader } from './utils/useCollapsingSearchHeader';

import { uiStyle, ThemeContext } from '../../../components/ThemeContext';
import { UM_API_NEWS, UM_API_TOKEN } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import {
    readUMOpenDataCache,
    UM_NEWS_CACHE_KEY,
    writeUMOpenDataCache,
} from '../../../utils/umOpenDataCache';

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { NavigationContext } from '@react-navigation/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';
import lodash from 'lodash';

const AnimatedVirtualizedList = Animated.createAnimatedComponent(VirtualizedList);

// 整理需要返回的數據給renderItem
// 此處返回的數據會成為renderItem({item})獲取到的數據。。。
// 所以data數組需要在這裡引用一下
const getItem = (data, index) => {
    // data為VirtualizedList設置的data，index為當前渲染到的下標
    return data[index];
};

// 返回數據數組的長度
const getItemCount = data => {
    return data.length;
};

const splitNewsData = result => {
    const chooseTopNewsIndex = result.findIndex(
        item => Array.isArray(item.common?.imageUrls) && item.common.imageUrls.length > 0,
    );
    const topNewsIndex = chooseTopNewsIndex === -1 ? 0 : chooseTopNewsIndex;
    const topNewsData = result[topNewsIndex] || {};
    const filteredNewsList = result.filter(
        (item, index) => index !== topNewsIndex && item.details?.length > 0,
    );

    return { topNewsData, filteredNewsList };
};

/**
 * 澳大新聞列表
 */
const NewsPage = forwardRef(function NewsPage({
    topHeaderHeight,
    useNativeLiquidGlassHeader = false,
}, ref) {
    const { theme } = useContext(ThemeContext);
    const insets = useSafeAreaInsets();
    // 指示器底部要停在底欄之上；原生 Tab 沒給高度時用安全區加底欄估算
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;
    // 自動 contentInset 已關掉；iOS 浮動 Tab 需列表自行留白
    const listBottomPad = Platform.OS === 'ios'
        ? tabBarHeight + verticalScale(10)
        : verticalScale(10);
    const { t, i18n } = useTranslation('common');
    const currentLanguage = i18n.resolvedLanguage || i18n.language;
    const { white, bg_color, black, themeColor, trueWhite, trueBlack, imagePlaceholder } = theme;
    const styles = StyleSheet.create({
        topNewsContainer: {
            borderRadius: scale(12),
            overflow: 'hidden',
            marginHorizontal: scale(16),
            marginTop: verticalScale(4),
            marginBottom: verticalScale(2),
            height: verticalScale(188),
            backgroundColor: white,
        },
        topNewsOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: scale(14),
            paddingBottom: verticalScale(12),
            justifyContent: 'flex-end',
        },
        topNewsText: {
            ...uiStyle.defaultText,
            color: trueWhite,
            fontWeight: '600',
            fontSize: verticalScale(12),
            lineHeight: verticalScale(16),
            marginBottom: verticalScale(4),
        },
    });

    const navigation = useContext(NavigationContext);
    const virtualizedList = useRef(null);
    const mountedRef = useRef(true);
    const hasVisibleDataRef = useRef(false);
    const requestIdRef = useRef(0);

    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [newsItems, setNewsItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const {
        scrollY,
        onScroll: onSearchScroll,
        onBarLayout: onSearchBarLayout,
        barHeight: searchBarHeight,
    } = useStickySearchHeader();

    const filteredNewsItems = useMemo(
        () => filterUMOpenDataItemsBySearchQuery(newsItems, searchQuery),
        [newsItems, searchQuery],
    );
    const { topNewsData: topNews, filteredNewsList: newsList } = useMemo(
        () => splitNewsData(filteredNewsItems),
        [filteredNewsItems],
    );

    useImperativeHandle(
        ref,
        () => ({
            scrollToTop: () => {
                if (virtualizedList.current?.scrollToOffset) {
                    virtualizedList.current.scrollToOffset({
                        offset: 0,
                        animated: true,
                    });
                } else {
                    virtualizedList.current?.scrollTo({
                        x: 0,
                        y: 0,
                        animated: true,
                    });
                }
            },
        }),
        [],
    );

    // VirtualizedList 列寬有時不撐滿，外層需固定寬度 NewsCard 內層才能正確留白
    const renderNewsItem = useCallback(
        ({ item }) => (
            <View style={{ width: '100%' }}>
                <NewsCard
                    data={item}
                    language={currentLanguage}
                    searchQuery={searchQuery}
                />
            </View>
        ),
        [currentLanguage, searchQuery],
    );

    // 請求澳大api返回新聞數據
    const getData = useCallback(async ({ refreshing = false, shouldApply } = {}) => {
        const requestId = ++requestIdRef.current;
        const canApply = () =>
            (shouldApply ? shouldApply() : mountedRef.current) &&
            requestId === requestIdRef.current;
        if (refreshing) {
            setIsRefreshing(true);
        }
        try {
            const res = await axios.get(UM_API_NEWS, {
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
            });
            const result = res.data._embedded;
            if (!Array.isArray(result)) {
                throw new Error('Invalid UM news response');
            }
            if (!canApply()) {
                return;
            }
            hasVisibleDataRef.current = true;
            setNewsItems(result);
            writeUMOpenDataCache(UM_NEWS_CACHE_KEY, result);
        } catch (error) {
            if (!canApply()) {
                return;
            }
            if (
                error.code !== 'ERR_NETWORK' &&
                error.code !== 'ECONNABORTED' &&
                !hasVisibleDataRef.current
            ) {
                alert('澳大新聞頁，未知錯誤，請聯繫開發者！');
            }
        } finally {
            if (canApply()) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, []);

    // 請求澳大新聞API
    useEffect(() => {
        let cancelled = false;
        mountedRef.current = true;

        const initializeData = async () => {
            const cached = await readUMOpenDataCache(UM_NEWS_CACHE_KEY);
            if (cancelled) {
                return;
            }
            if (cached) {
                hasVisibleDataRef.current = true;
                setNewsItems(cached.items);
                setIsLoading(false);
                if (cached.isFresh) {
                    return;
                }
            }
            getData({ shouldApply: () => !cancelled });
        };

        initializeData();
        return () => {
            cancelled = true;
            mountedRef.current = false;
        };
    }, [getData]);

    const topNewsContent = useMemo(
        () => pickDisplayedTitles(topNews.details, currentLanguage, searchQuery),
        [currentLanguage, searchQuery, topNews.details],
    );

    // 多圖時隨機取一張；依頭條 id 固定，避免語言切換或重渲染時換圖
    const topNewsImage = useMemo(() => {
        const imageUrls = topNews.common?.imageUrls || [];
        if (imageUrls.length === 0) {
            return null;
        }
        const picked =
            imageUrls.length > 1 ? lodash.sample(imageUrls) : imageUrls[0];
        return typeof picked === 'string'
            ? picked.replace('http:', 'https:')
            : null;
    }, [topNews.common?.imageUrls]);

    // 頭條新聞的渲染
    const renderTopNews = useMemo(() => {
        if (!topNews?._id) {
            return null;
        }
        const { title, alternateTitle } = topNewsContent;
        const heroHighlightStyle = {
            color: black.main,
            backgroundColor: trueWhite,
            fontWeight: 'bold',
        };

        return (
            <View style={{ marginTop: verticalScale(5) }}>
                <ScalePressable
                    style={styles.topNewsContainer}
                    onPress={() => {
                        trigger();
                        navigation.navigate('NewsDetail', { data: topNews });
                    }}>
                    <Image
                        source={topNewsImage ? { uri: topNewsImage } : null}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        recyclingKey={topNews?._id || 'top-news'}
                        placeholder={imagePlaceholder}
                        placeholderContentFit="cover"
                        transition={200}
                        priority="high"
                    />
                    <LinearGradient
                        colors={[`${trueBlack}00`, `${trueBlack}E0`]}
                        locations={[0.42, 1]}
                        style={styles.topNewsOverlay}>
                        <Text style={styles.topNewsText}>
                            {t('澳大焦點')}
                        </Text>
                        <View style={{ width: '100%' }}>
                            <SearchHighlightText
                                text={title}
                                query={searchQuery}
                                highlightStyle={heroHighlightStyle}
                                numberOfLines={2}
                                style={{
                                    ...uiStyle.defaultText,
                                    color: trueWhite,
                                    fontWeight: 'bold',
                                    fontSize: verticalScale(17),
                                    lineHeight: verticalScale(23),
                                }}
                            />
                            {alternateTitle ? (
                                <SearchHighlightText
                                    text={alternateTitle}
                                    query={searchQuery}
                                    highlightStyle={heroHighlightStyle}
                                    numberOfLines={1}
                                    style={{
                                        ...uiStyle.defaultText,
                                        color: trueWhite,
                                        fontSize: verticalScale(13),
                                        lineHeight: verticalScale(18),
                                        marginTop: verticalScale(4),
                                    }}
                                />
                            ) : null}
                        </View>
                    </LinearGradient>
                </ScalePressable>
            </View >
        );
    }, [black.main, imagePlaceholder, navigation, searchQuery, styles.topNewsContainer, styles.topNewsOverlay, styles.topNewsText, t, topNews, topNewsContent, topNewsImage, trueBlack, trueWhite]);

    const handleSearchFocus = useCallback(() => {
        trigger();
    }, []);

    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            // 勿用 alignItems: 'center'：橫向不拉伸會讓 VirtualizedList 列寬塌縮，
            // NewsCard 內 row 的 flex:1 文字欄變成極窄直排
            alignItems: 'stretch',
            backgroundColor: bg_color,
        }}>
            {/* 懸浮可拖動按鈕 */}
            {/* {isLoading ? null : renderGoTopButton()} */}

            {isLoading ? (
                <NewsListSkeleton showTopNews contentTopInset={topHeaderHeight} />
            ) : (
                <View style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
                    <AnimatedVirtualizedList
                        data={newsList}
                        ref={virtualizedList}
                        style={{ flex: 1, width: '100%' }}
                        onScroll={onSearchScroll}
                        scrollEventThrottle={16}
                        // 只關 contentInset 不夠。指示器預設仍會把外層橫向 Pager 的
                        // safe area 疊加上去；17 Pro 貼齊右緣時，這段間距會被算到
                        // 水平方向，滾動條就落到內容裡。18 Pro Max 不會走這條計算。
                        contentInsetAdjustmentBehavior="never"
                        automaticallyAdjustsScrollIndicatorInsets={false}
                        scrollIndicatorInsets={{
                            top: topHeaderHeight + searchBarHeight,
                            bottom: tabBarHeight,
                            right: 1,
                        }}
                        // 初始渲染的元素，設置為剛好覆蓋屏幕
                        initialNumToRender={4}
                        windowSize={8}
                        maxToRenderPerBatch={8}
                        updateCellsBatchingPeriod={50}
                        renderItem={renderNewsItem}
                        ItemSeparatorComponent={NewsRowSeparator}
                        contentContainerStyle={{
                            width: '100%',
                            paddingTop: topHeaderHeight + searchBarHeight + verticalScale(8),
                            paddingBottom: listBottomPad,
                        }}
                        keyExtractor={item => item._id}
                        // 整理item數據
                        getItem={getItem}
                        // 渲染項目數量
                        getItemCount={getItemCount}
                        // 列表頭部渲染的組件 - 頭條新聞
                        ListHeaderComponent={renderTopNews}
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={isRefreshing}
                                progressViewOffset={topHeaderHeight + searchBarHeight}
                                onRefresh={() => {
                                    getData({ refreshing: true });
                                }}
                            />
                        }
                        directionalLockEnabled
                        alwaysBounceHorizontal={false}
                        removeClippedSubviews
                    />
                    {useNativeLiquidGlassHeader ? null : (
                        <TopScrollEdgeBackdrop
                            headerHeight={topHeaderHeight + searchBarHeight}
                            scrollY={scrollY}
                        />
                    )}
                    <View
                        onLayout={onSearchBarLayout}
                        style={{
                            position: 'absolute',
                            top: topHeaderHeight,
                            left: 0,
                            right: 0,
                            zIndex: 2,
                        }}>
                        <ClubSearchBar
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            loading={isRefreshing}
                            onFocus={handleSearchFocus}
                            onCancel={() => setSearchQuery('')}
                            containerStyle={{ paddingBottom: 0 }}
                            placeholder={t('搜索澳大新聞')}
                            cancelLabel={t('取消')}
                            clearAccessibilityLabel={t('清除搜尋')}
                            liquidGlass={useNativeLiquidGlassHeader}
                        />
                    </View>
                </View>
            )}
        </View>
    );
});

export default NewsPage;
