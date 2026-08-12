import React, {
    forwardRef,
    useState,
    useEffect,
    useRef,
    useContext,
    useCallback,
    useImperativeHandle,
} from 'react';
import { View, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import Text from '../../../components/AppText';
import { uiStyle, ThemeContext } from '../../../components/ThemeContext';
import { UM_API_EVENT, UM_API_TOKEN } from '../../../utils/pathMap';
import {
    readUMOpenDataCache,
    UM_EVENT_CACHE_KEY,
    writeUMOpenDataCache,
} from '../../../utils/umOpenDataCache';

import NewsCard from './components/NewsCard';
import NewsListSkeleton from './components/NewsListSkeleton';

import axios from 'axios';
import moment from 'moment-timezone';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';

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
 * @param {boolean} [hideSourceLabel=false] - 嵌入校園頁時隱藏列表內來源標註
 * @param {number} [contentTopInset=0] - 懸浮頁頭所需的列表頂部間距
 * @param {(offsetY: number) => void} [onScrollOffsetChange] - 列表滾動位置回調
 */
const UMEventPage = forwardRef(function UMEventPage(
    {
        hideSourceLabel = false,
        contentTopInset = 0,
        onScrollOffsetChange,
    },
    ref,
) {
    const scrollViewRef = useRef(null);
    const mountedRef = useRef(true);
    const hasVisibleDataRef = useRef(false);
    const requestIdRef = useRef(0);
    const { theme } = useContext(ThemeContext);
    const { i18n } = useTranslation();
    const currentLanguage = i18n.resolvedLanguage || i18n.language;

    const [data, setData] = useState(undefined);
    const [isLoading, setIsLoading] = useState(true);
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

    // 渲染列表 Item
    const renderItem = useCallback(
        ({ item }) => (
            <NewsCard
                data={item}
                type={'event'}
                language={currentLanguage}
            />
        ),
        [currentLanguage],
    );

    const handleScroll = useCallback(
        e => {
            onScrollOffsetChange?.(e.nativeEvent.contentOffset.y);
        },
        [onScrollOffsetChange],
    );

    // 渲染主要內容
    const renderPage = () => {
        const { black, themeColor } = theme;
        const listHeader = hideSourceLabel ? null : (
            <View style={{ marginTop: verticalScale(8) }}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: black.third,
                        alignSelf: 'center',
                        marginTop: scale(5),
                        fontSize: verticalScale(12),
                    }}>
                    Data From: data.um.edu.mo
                </Text>
            </View>
        );

        return (
            <View style={{ flex: 1, width: '100%' }}>
                <FlashList
                    ref={scrollViewRef}
                    data={data}
                    contentInsetAdjustmentBehavior="automatic"
                    contentContainerStyle={{ paddingTop: contentTopInset }}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    drawDistance={500}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    ListHeaderComponent={listHeader}
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={isRefreshing}
                            onRefresh={() => {
                                getData({ refreshing: true });
                            }}
                        />
                    }
                />
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
                <NewsListSkeleton contentTopInset={contentTopInset} />
            ) : (
                data != undefined && renderPage()
            )}
        </View>
    );
});

export default UMEventPage;
