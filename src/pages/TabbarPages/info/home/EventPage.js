import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
} from 'react-native';

import { COLOR_DIY, uiStyle } from '../../../../utils/uiMap';
import { useTheme } from '../../../../components/ThemeContext';

import { BASE_URI, BASE_HOST, GET } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import Loading from '../../../../components/Loading';
import EventCard from '../components/EventCard';

import axios from 'axios';
import Toast from 'react-native-simple-toast';
import moment from 'moment-timezone';
import { scale } from 'react-native-size-matters';

const { black, white, themeColor, viewShadow, bg_color } = COLOR_DIY;

const EventPage = forwardRef((props, ref) => {
    const [dataPage, setDataPage] = useState(1);
    const [eventDataList, setEventDataList] = useState([]);
    const [leftDataList, setLeftDataList] = useState([]);
    const [rightDataList, setRightDataList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [noMoreData, setNoMoreData] = useState(false);

    // 暴露方法給父組件
    useImperativeHandle(ref, () => ({
        getNoMoreData: () => noMoreData,    // 返回noMoreData狀態
        loadMoreData,
        onRefresh,
    }))

    useEffect(() => {
        getData(false);
    }, []);

    // 當dataPage變化時，重新獲取數據
    // 這裡的dataPage是用來控制頁碼的，當頁碼變化時，會重新獲取數據
    // 這樣可以實現瀑布流的加載更多功能
    // 當dataPage為1時，不需要重新獲取數據，因為已經在useEffect中獲取過數據了
    useEffect(() => {
        if (dataPage === 1) return;

        if (isLoading) return;
        if (noMoreData) return;
        // 當dataPage變化時，重新獲取數據
        Toast.show('數據加載中...');
        getData(true);
    }, [dataPage]);

    const getData = async (loadMore) => {
        let URL = BASE_URI + GET.EVENT_INFO_ALL;
        let num_of_item = 10;
        let noMore = true;

        try {
            const res = await axios.get(URL, {
                params: {
                    num_of_item,
                    page: dataPage,
                },
            });
            const json = res.data;
            if (json.message === 'success') {
                let newDataArr = json.content;
                if (newDataArr.length < num_of_item) {
                    noMore = true;
                } else {
                    noMore = false;
                }

                if (dataPage === 1) {
                    const filteredData = getNotFinishEvent(newDataArr, loadMore);
                    separateData(filteredData);
                } else if (eventDataList.length > 0) {
                    let tempArr = eventDataList.concat(newDataArr);
                    const filteredData = getNotFinishEvent(tempArr, loadMore);
                    separateData(filteredData);
                }
            } else if (json.code === '2') {
                alert('已無更多數據');
                setNoMoreData(true);
            } else {
                alert('數據出錯，請聯繫開發者');
            }
        } catch (error) {
            if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
                Toast.show('網絡錯誤！請檢查網絡再試');
                setLeftDataList([]);
                setRightDataList([]);
            } else {
                alert('未知錯誤，請聯繫開發者！\n也可能是國內網絡屏蔽所導致！');
            }
        } finally {
            setIsLoading(false);
            setNoMoreData(noMore);
        }
    };

    const separateData = (eventList) => {
        // 將dataList的數據分成單數和偶數列，用於模擬瀑布屏展示佈局
        let leftList = [];
        let rightList = [];

        eventList.forEach((itm, idx) => {
            // 圖片類型服務器返回相對路徑，請記住加上域名
            if (itm.cover_image_url.indexOf(BASE_HOST) === -1) {
                itm.cover_image_url = BASE_HOST + itm.cover_image_url;
            }
            if (idx % 2 === 0) {
                leftList.push(itm);
            } else {
                rightList.push(itm);
            }
        });

        setLeftDataList(leftList);
        setRightDataList(rightList);
        setEventDataList(eventList);
    };

    // 篩選尚未結束的活動，並隨機亂序，最後與原數組合併去重
    const getNotFinishEvent = (eventList, loadMore) => {
        let notFinishEvent = [];
        let closeFinishEvent = [];
        let nowTime = moment(new Date());

        eventList.forEach((itm, idx) => {
            if (nowTime.isBefore(moment(itm.enddatetime))) {
                if (idx >= 1) {
                    notFinishEvent.push(itm);
                } else if (idx < 1) {
                    closeFinishEvent.push(itm);
                }
            }
        });

        // 如果未結束 or 將結束活動超過1個，再進行隨機排序
        if (!loadMore && (notFinishEvent.length > 1 || closeFinishEvent.length > 1)) {
            notFinishEvent.sort(() => Math.random() - 0.5);

            let newList = Array.from(new Set(
                closeFinishEvent.concat(
                    notFinishEvent.concat(eventList)
                )
            ));
            setEventDataList(newList);
            return newList;
        } else {
            setEventDataList(eventList);
            return eventList;
        }
    };

    const loadMoreData = () => {
        trigger();
        if (isLoading) return;
        if (noMoreData) return;
        setDataPage(prev => prev + 1);
    };

    const onRefresh = () => {
        trigger();
        setDataPage(1);
        setLeftDataList([]);
        setRightDataList([]);
        setIsLoading(true);

        setTimeout(() => {
            getData(false);
        }, 100);
    };

    const renderLoadMoreView = () => {
        return (
            <View
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: scale(10),
                    marginBottom: scale(20),
                }}>
                {noMoreData ? (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ ...uiStyle.defaultText, color: black.third, textAlign: 'center', fontSize: scale(12) }}>
                            恭喜你，達成『刨根問底』成就~
                        </Text>
                        <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(12) }}>[]~(￣▽￣)~*</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={s.loadMore}
                        activeOpacity={0.8}
                        onPress={loadMoreData}>
                        <Text style={{ ...uiStyle.defaultText, color: white, fontSize: scale(14) }}>
                            Load More
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // 渲染主要內容
    const renderPage = () => {
        return (
            <View style={s.waterFlowContainer}>
                {/* 左側的列 放置雙數下標的圖片 從0開始 */}
                <View>
                    <FlatList
                        data={leftDataList}
                        renderItem={({ item }) => <EventCard data={item} />}
                        scrollEnabled={false}
                        keyExtractor={item => item._id}
                    />
                </View>
                {/* 右側的列 放置單數下標的圖片 */}
                <View style={{ alignItems: 'center' }}>
                    {rightDataList.length > 0 ? (
                        <FlatList
                            data={rightDataList}
                            renderItem={({ item }) => <EventCard data={item} />}
                            scrollEnabled={false}
                            keyExtractor={item => item._id}
                        />
                    ) : (
                        <Text style={{ ...uiStyle.defaultText }}>No more data</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={{
            flex: 1, backgroundColor: bg_color,
            alignItems: 'center', justifyContent: 'center',
            ...props.style,
        }}>
            {isLoading ? (
                <View style={{
                    flex: 1,
                    marginBottom: Dimensions.get('window').height
                }}>
                    <Loading />
                </View>
            ) : (leftDataList.length > 0 || rightDataList.length > 0 ? (
                <View>
                    {renderPage()}
                    {renderLoadMoreView()}
                </View>
            ) : null)}
        </View>
    );
});

const s = StyleSheet.create({
    waterFlowContainer: {
        flexDirection: 'row',
        width: '100%',
        backgroundColor: bg_color,
    },
    loadMore: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: themeColor,
        paddingHorizontal: scale(10),
        paddingVertical: scale(10),
        borderRadius: scale(15),
        marginBottom: scale(5),
        ...viewShadow,
    },
});

export default EventPage;
