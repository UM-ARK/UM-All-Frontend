import React, {
    useState,
    useEffect,
    useRef,
    useContext,
    useCallback,
} from 'react';
import {Text, View, ScrollView, RefreshControl} from 'react-native';
import {FlashList} from '@shopify/flash-list';

import {uiStyle, ThemeContext} from '../../../components/ThemeContext';
import {UM_API_EVENT, UM_API_TOKEN} from '../../../utils/pathMap';

import NewsCard from './components/NewsCard';
import Loading from '../../../components/Loading';
import ScrollToTopButton from '../../../components/ScrollToTopButton';

import axios from 'axios';
import moment from 'moment-timezone';
import {scale, verticalScale} from 'react-native-size-matters';

const UMEventPage = () => {
    const scrollViewRef = useRef(null);
    const progressRef = useRef();
    const {theme} = useContext(ThemeContext);

    const [data, setData] = useState(undefined);
    const [isLoading, setIsLoading] = useState(true);

    // 獲取澳大舉辦活動的資訊
    const getData = async () => {
        try {
            axios
                .get(UM_API_EVENT, {
                    headers: {
                        Accept: 'application/json',
                        Authorization: UM_API_TOKEN,
                    },
                    onDownloadProgress: progressEvent => {
                        const loadedMB = progressEvent.loaded / 1024 / 1024;
                        let progress = loadedMB / 0.1; // 假設API返回數據大小約為2MB
                        if (progress > 1) {
                            progress = 0.95;
                        } // 確保進度不超過1
                        progressRef.current = progress; // 更新進度條
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
        ({item}) => <NewsCard data={item} type={'event'} />,
        [],
    );

    // 渲染主要內容
    const renderPage = () => {
        const {black, white, themeColor} = theme;
        const listHeader = (
            <View style={{marginTop: verticalScale(8)}}>
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
            <View style={{flex: 1, width: '100%'}}>
                <FlashList
                    ref={scrollViewRef}
                    data={data}
                    contentInsetAdjustmentBehavior="automatic"
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    drawDistance={500}
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
                <ScrollToTopButton virtualizedListRef={scrollViewRef} />
            </View>
        );
    };

    const {black, white, themeColor, bg_color} = theme;

    return (
        <View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: bg_color,
            }}>
            {isLoading ? (
                <ScrollView
                    contentInsetAdjustmentBehavior="automatic"
                    showsVerticalScrollIndicator={true}
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={isLoading}
                            onRefresh={() => {
                                // 展示Loading標識
                                setIsLoading(true);
                                getData();
                            }}
                        />
                    }>
                    <Loading progress={progressRef.current} />
                </ScrollView>
            ) : (
                data != undefined && renderPage()
            )}
        </View>
    );
};

export default UMEventPage;
