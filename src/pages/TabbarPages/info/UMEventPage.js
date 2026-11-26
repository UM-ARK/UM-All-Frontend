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
import { Platform, View, RefreshControl } from 'react-native';
import { AnimatedFlashList } from '@shopify/flash-list';

import { ThemeContext } from '../../../components/ThemeContext';
import TopScrollEdgeBackdrop from '../../../components/TopScrollEdgeBackdrop';
import { UM_API_EVENT, UM_API_TOKEN } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import {
    readUMOpenDataCache,
    UM_EVENT_CACHE_KEY,
    writeUMOpenDataCache,
} from '../../../utils/umOpenDataCache';

import NewsCard, { NewsRowSeparator } from './components/NewsCard';
import NewsListSkeleton from './components/NewsListSkeleton';
import ClubSearchBar from './components/ClubSearchBar';
import { filterUMOpenDataItemsBySearchQuery } from './utils/umOpenDataSearch';
import { useCollapsingSearchHeader } from './utils/useCollapsingSearchHeader';

import axios from 'axios';
import moment from 'moment-timezone';
import { useTranslation } from 'react-i18next';
import Reanimated from 'react-native-reanimated';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { verticalScale } from 'react-native-size-matters';

const orderEventData = result => {
    const nowTimeStamp = new Date().getTime();
    const nowMomentDate = moment(nowTimeStamp);

    // 分隔今天/未來的活動 和 過往的活動
    let resultList = [];
    let outdatedList = [];
    result.forEach(itm => {
        let beginMomentDate = moment(itm.common.dateFrom);
        if (
            nowMomentDate.isSame(beginMomentDate, 'day') ||
            beginMomentDate.isSameOrAfter(nowMomentDate)
        ) {
            resultList.push(itm);
        } else {
            outdatedList.push(itm);
        }
    });
    // 排序：距離今天最近
    resultList.sort((a, b) => {
        return Math.abs(
            nowTimeStamp - new Date(a.common.dateFrom).getTime(),
        ) >
            Math.abs(
                nowTimeStamp - new Date(b.common.dateFrom).getTime(),
            )
            ? 1
            : -1;
    });
    outdatedList.sort((a, b) => {
        return Math.abs(
            nowTimeStamp - new Date(a.common.dateFrom).getTime(),
        ) >
            Math.abs(
                nowTimeStamp - new Date(b.common.dateFrom).getTime(),
            )
            ? 1
            : -1;
    });

    return resultList.concat(outdatedList);
};

/**
 * 澳大活動列表
 */
const UMEventPage = forwardRef(function UMEventPage({ topHeaderHeight }, ref) {
    const scrollViewRef = useRef(null);
    const mountedRef = useRef(true);
    const hasVisibleDataRef = useRef(false);
    const requestIdRef = useRef(0);
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

    const [data, setData] = useState(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const {
        scrollY,
        onScroll: onSearchScroll,
        onScrollBeginDrag: onSearchScrollBeginDrag,
        onScrollEndDrag: onSearchScrollEndDrag,
        onMomentumScrollEnd: onSearchMomentumScrollEnd,
        onBarLayout: onSearchBarLayout,
        animatedStyle: searchBarAnimatedStyle,
        barHeight: searchBarHeight,
        collapsed: searchCollapsed,
    } = useCollapsingSearchHeader();
    const [isRefreshing, setIsRefreshing] = useState(false);

    useImperativeHandle(
        ref,
        () => ({
            scrollToTop: () => {
                if (scrollViewRef.current?.scrollToOffset) {
                    scrollViewRef.current.scrollToOffset({
                        offset: 0,
                        animated: true,
                    });
                } else {
                    scrollViewRef.current?.scrollTo({
                        x: 0,
                        y: 0,
                        animated: true,
                    });
                }
            },
        }),
        [],
    );

    // 獲取澳大舉辦活動的資訊
    const getData = useCallback(async ({ refreshing = false, shouldApply } = {}) => {
        const requestId = ++requestIdRef.current;
        const canApply = () =>
            (shouldApply ? shouldApply() : mountedRef.current) &&
            requestId === requestIdRef.current;
        if (refreshing) {
            setIsRefreshing(true);
        }
        try {
            const res = await axios.get(UM_API_EVENT, {
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
            });
            const result = res.data._embedded;
            if (!Array.isArray(result)) {
                throw new Error('Invalid UM event response');
            }
            if (!canApply()) {
                return;
            }
            hasVisibleDataRef.current = true;
            setData(orderEventData(result));
            writeUMOpenDataCache(UM_EVENT_CACHE_KEY, result);
        } catch (error) {
            if (!canApply()) {
                return;
            }
            if (
                error.code !== 'ERR_NETWORK' &&
                error.code !== 'ECONNABORTED' &&
                !hasVisibleDataRef.current
            ) {
                alert('澳大活動頁，未知錯誤，請聯繫開發者！');
            }
        } finally {
            if (canApply()) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        mountedRef.current = true;

        const initializeData = async () => {
            const cached = await readUMOpenDataCache(UM_EVENT_CACHE_KEY);
            if (cancelled) {
                return;
            }
            if (cached) {
                hasVisibleDataRef.current = true;
                setData(orderEventData(cached.items));
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

    const filteredData = useMemo(
        () => filterUMOpenDataItemsBySearchQuery(data, searchQuery),
        [data, searchQuery],
    );

    const handleSearchFocus = useCallback(() => {
        trigger();
    }, []);

    // 渲染列表 Item
    const renderItem = useCallback(
        ({ item }) => (
            <NewsCard
                data={item}
                type={'event'}
                language={currentLanguage}
                searchQuery={searchQuery}
            />
        ),
        [currentLanguage, searchQuery],
    );

    // 渲染主要內容
    const renderPage = () => {
        const { themeColor } = theme;
        return (
            <View style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
                <AnimatedFlashList
                    ref={scrollViewRef}
                    style={{ flex: 1, width: '100%' }}
                    data={filteredData}
                    contentContainerStyle={{
                        paddingTop: topHeaderHeight + searchBarHeight,
                        paddingBottom: listBottomPad,
                    }}
                    onScroll={onSearchScroll}
                    onScrollBeginDrag={onSearchScrollBeginDrag}
                    onScrollEndDrag={onSearchScrollEndDrag}
                    onMomentumScrollEnd={onSearchMomentumScrollEnd}
                    scrollEventThrottle={16}
                    // 只關 contentInset 不夠。指示器預設仍會把外層橫向 Pager 的
                    // safe area 疊加上去；17 Pro 貼齊右緣時，這段間距會被算到
                    // 水平方向，滾動條就落到內容裡。18 Pro Max 不會走這條計算。
                    contentInsetAdjustmentBehavior="never"
                    automaticallyAdjustsScrollIndicatorInsets={false}
                    scrollIndicatorInsets={{
                        top: topHeaderHeight,
                        bottom: tabBarHeight,
                        right: 1,
                    }}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    ItemSeparatorComponent={NewsRowSeparator}
                    drawDistance={500}
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
                />
                <TopScrollEdgeBackdrop headerHeight={topHeaderHeight} scrollY={scrollY} />
                <View
                    onLayout={onSearchBarLayout}
                    pointerEvents={searchCollapsed ? 'none' : 'auto'}
                    accessibilityElementsHidden={searchCollapsed}
                    importantForAccessibility={
                        searchCollapsed ? 'no-hide-descendants' : 'auto'
                    }
                    style={{
                        position: 'absolute',
                        top: topHeaderHeight,
                        left: 0,
                        right: 0,
                        zIndex: 2,
                        overflow: 'hidden',
                    }}>
                    <Reanimated.View style={searchBarAnimatedStyle}>
                        <ClubSearchBar
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            loading={isRefreshing}
                            onFocus={handleSearchFocus}
                            placeholder={t('搜索澳大活動')}
                            cancelLabel={t('取消')}
                            clearAccessibilityLabel={t('清除搜尋')}
                        />
                    </Reanimated.View>
                </View>
            </View>
        );
    };

    const { bg_color } = theme;

    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: bg_color,
            }}>
            {isLoading ? (
                <NewsListSkeleton contentTopInset={topHeaderHeight} />
            ) : (
                data != undefined && renderPage()
            )}
        </View>
    );
});

export default UMEventPage;
