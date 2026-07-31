import React, {
    forwardRef,
    useState,
    useEffect,
    useRef,
    useContext,
    useCallback,
    useImperativeHandle,
} from 'react';
import { Text, View, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { uiStyle, ThemeContext } from '../../../components/ThemeContext';
import { UM_API_EVENT, UM_API_TOKEN } from '../../../utils/pathMap';

import NewsCard from './components/NewsCard';
import NewsListSkeleton from './components/NewsListSkeleton';

import axios from 'axios';
import moment from 'moment-timezone';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';

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
    const { theme } = useContext(ThemeContext);
    const { i18n } = useTranslation();
    const currentLanguage = i18n.resolvedLanguage || i18n.language;

    const [data, setData] = useState(undefined);
    const [isLoading, setIsLoading] = useState(true);

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
    const getData = async () => {
        try {
            axios
                .get(UM_API_EVENT, {
                    headers: {
                        Accept: 'application/json',
                        Authorization: UM_API_TOKEN,
                    },
                })
                .then(res => {
                    let result = res.data._embedded;
                    let nowTimeStamp = new Date().getTime();
                    let nowMomentDate = moment(nowTimeStamp);

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
                            nowTimeStamp -
                            new Date(a.common.dateFrom).getTime(),
                        ) >
                            Math.abs(
                                nowTimeStamp -
                                new Date(b.common.dateFrom).getTime(),
                            )
                            ? 1
                            : -1;
                    });
                    outdatedList.sort((a, b) => {
                        return Math.abs(
                            nowTimeStamp -
                            new Date(a.common.dateFrom).getTime(),
                        ) >
                            Math.abs(
                                nowTimeStamp -
                                new Date(b.common.dateFrom).getTime(),
                            )
                            ? 1
                            : -1;
                    });

                    resultList = resultList.concat(outdatedList);
                    setData(resultList);
                    setIsLoading(false);
                });
        } catch (error) {
            if (error.code == 'ERR_NETWORK' || error.code == 'ECONNABORTED') {
                setData(undefined);
                setIsLoading(false);
            } else {
                alert('澳大活動頁，未知錯誤，請聯繫開發者！');
            }
        }
    };

    useEffect(() => {
        getData();
    }, []);

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
                            refreshing={isLoading}
                            onRefresh={() => {
                                setIsLoading(true);
                                getData();
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
