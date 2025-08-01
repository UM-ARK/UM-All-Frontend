import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useContext, useCallback, memo } from 'react';
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
} from 'react-native';

import { useTheme, themes, uiStyle } from '../../../../components/ThemeContext';
import { BASE_URI, BASE_HOST, GET, ARK_HARBOR_TOP, ARK_HARBOR_LATEST, ARK_HARBOR_TOPIC } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import Loading from '../../../../components/Loading';
import EventCard from '../components/EventCard';
import { openLink } from '../../../../utils/browser';

import axios from 'axios';
import Toast from 'react-native-simple-toast';
import moment from 'moment-timezone';
import { scale, verticalScale } from 'react-native-size-matters';
import TouchableScale from 'react-native-touchable-scale';
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage, { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { NavigationContext } from '@react-navigation/native';
import lodash from 'lodash';

const EventPage = forwardRef((props, ref) => {
    const { theme } = useTheme();
    const { black, white, themeColor, viewShadow, bg_color } = theme;
    const navigation = useContext(NavigationContext);

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

    const [dataPage, setDataPage] = useState(1);
    const [eventDataList, setEventDataList] = useState([]);
    const [leftDataList, setLeftDataList] = useState([]);
    const [rightDataList, setRightDataList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [noMoreData, setNoMoreData] = useState(false);
    const [harborData, setHarborData] = useState([]);
    const [eventRawList, setEventRawList] = useState([]);  // 把活動原始數據也存 state

    const { getItem, setItem } = useAsyncStorage('ARK_Harbor_Setting');

    // 暴露方法給父組件
    useImperativeHandle(ref, () => ({
        getNoMoreData: () => noMoreData,    // 返回noMoreData狀態
        loadMoreData,
        onRefresh,
    }));

    // 首次加載時，獲取數據
    useEffect(() => {
        getAPIData();
    }, []);

    useEffect(() => {
        const filteredData = getNotFinishEvent(eventRawList, noMoreData);
        separateData(filteredData);
    }, [eventRawList]);

    useEffect(() => {
        // 當harborData變化時，重新分割數據
        if (dataPage === 1 && harborData.length > 0) {
            separateData(eventDataList);
        }
    }, [harborData]);

    // 監聽dataPage變化，重新獲取數據
    useEffect(() => {
        // dataPage控制頁碼，頁碼變化時，會重新獲取數據，實現瀑布流的加載更多功能
        if (dataPage === 1) return;
        if (isLoading) return;
        if (noMoreData) return;
        // 當dataPage變化時，重新獲取數據
        Toast.show('數據加載中...');
        if (!harborData || harborData.length === 0) {
            getHarborData();
        }
        setNoMoreData(true);
        getEventData();
    }, [dataPage]);


    /**
     * 請求API數據，獲取ARK組織活動數據和ARK Harbor數據
     * @returns {void}
     */
    const getAPIData = (page = dataPage) => {
        getHarborData();
        getEventData(page);
    }

    /**
     * 獲取ARK Event數據
     * @param {boolean} loadMore 
     */
    const getEventData = async (page = dataPage) => {
        let URL = BASE_URI + GET.EVENT_INFO_ALL;
        let num_of_item = 10;
        let noMore = true;

        try {
            const res = await axios.get(URL, {
                params: {
                    num_of_item,
                    page: page,
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

                // 交給分割兩列的函數處理合併
                setEventRawList(newDataArr);
            } else if (json.code === '2') {
                alert('已無更多數據');
                noMore = true;
            } else {
                alert('數據出錯，請聯繫開發者');
            }
        } catch (error) {
            if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
                Toast.show('網絡錯誤！請檢查網絡再試');
                setLeftDataList([]);
                setRightDataList([]);
            } else {
                alert('組織活動頁，未知錯誤，請聯繫開發者！\n也可能是國內網絡屏蔽所導致！');
            }
        } finally {
            setIsLoading(false);
            setNoMoreData(noMore);
        }
    };

    /**
     * 獲取ARK Harbor Latest數據
     * @returns {Promise<Array>} 返回隨機選取的10條數據
     */
    const getHarborData = async () => {
        try {
            const URL = ARK_HARBOR_LATEST;
            const res = await axios.get(URL);
            if (res.data) {
                const data = res.data;
                const topics = data.topic_list.topics || [];
                if (topics.length > 0) {
                    const newTopic = lodash.sampleSize(topics, 10);
                    let harborCopy = newTopic.map(item => ({ ...item, type: 'harbor' }));
                    harborCopy = lodash.shuffle(harborCopy);
                    setHarborData(harborCopy);
                }
            }
        } catch (error) {
            console.log('Error fetching topic data:', error);
        }
    }

    const insertToList = (list, harborArr) => {
        let listCopy = lodash.cloneDeep(list);
        const now = moment();
        // 找到所有未過期活動的插入點（前後）
        const validIndexes = listCopy
            .map((item, idx) => (item.enddatetime && now.isBefore(moment(item.enddatetime)) ? idx : -1))
            .filter(idx => idx !== -1);
        let insertPositions = Array.from(new Set(
            validIndexes.flatMap(idx => [idx, idx + 1])
        )).filter(pos => pos >= 0 && pos <= listCopy.length);

        // 隨機打亂插入點
        for (let i = insertPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [insertPositions[i], insertPositions[j]] = [insertPositions[j], insertPositions[i]];
        }

        // 只插入到未過期活動的前後，剩下的放末尾
        let used = 0;
        harborArr.forEach((harborItem, i) => {
            if (insertPositions.length > 0 && i < insertPositions.length) {
                listCopy.splice(insertPositions[i], 0, harborItem);
                // 插入後，所有後面的插入點都要+1
                insertPositions = insertPositions.map(pos => pos > insertPositions[i] ? pos + 1 : pos);
                used++;
            }
        });
        // 剩下的 harbor 插入到最後一個未過期活動的後面
        if (harborArr.length > used) {
            // 找到最後一個未過期活動的下標
            const now = moment();
            let lastValidIdx = -1;
            for (let i = listCopy.length - 1; i >= 0; i--) {
                if (listCopy[i].enddatetime && now.isBefore(moment(listCopy[i].enddatetime))) {
                    lastValidIdx = i;
                    break;
                }
            }
            // 插入到最後一個未過期活動的後面，如果沒有未過期活動則插到末尾
            const insertIdx = lastValidIdx >= 0 ? lastValidIdx + 1 : listCopy.length;
            listCopy.splice(insertIdx, 0, ...harborArr.slice(used));
        }

        return listCopy;
    };

    const separateData = (eventList) => {
        // 將dataList的數據分成單數和偶數列，用於模擬瀑布屏展示佈局
        let leftList = [];
        let rightList = [];

        const [leftHarbor, rightHarbor] = lodash.chunk(harborData, Math.ceil(harborData.length / 2));
        // eventList为空时，直接将harbor随机均分到两列
        if (!eventList || eventList.length === 0) {
            if (harborData.length === 0) {
                return;
            }
            setLeftDataList(leftHarbor);
            setRightDataList(rightHarbor);
            return;
        }

        // 將圖片類型的服務器返回的相對路徑加上域名
        eventList.forEach((itm, idx) => {
            // 圖片類型服務器返回相對路徑，請記住加上域名
            if (itm.cover_image_url.indexOf(BASE_HOST) === -1) {
                itm.cover_image_url = BASE_HOST + itm.cover_image_url;
            }
        });
        // lodash 分割 eventList 為左右兩列
        [leftList, rightList] = [
            lodash.filter(eventList, (_, idx) => idx % 2 === 0),
            lodash.filter(eventList, (_, idx) => idx % 2 === 1)
        ];

        // 併入渲染的left和rightlist
        if (dataPage > 1 && !lodash.isEqual(leftList, leftDataList)) {
            leftList = leftDataList.concat(leftList);
        }
        if (dataPage > 1 && !lodash.isEqual(rightList, rightDataList)) {
            rightList = rightDataList.concat(rightList);
        }

        // lodash對leftList和rightList進行去重
        leftList = lodash.uniqBy(leftList, item => item._id || item.id);
        rightList = lodash.uniqBy(rightList, item => item._id || item.id);

        if (harborData.length > 0 && dataPage === 1) {
            leftList = insertToList(leftList, leftHarbor);
            rightList = insertToList(rightList, rightHarbor);
        }

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
        setTimeout(() => {
            setLeftDataList([]);
            setRightDataList([]);
        }, 300);

        setTimeout(() => {
            setEventDataList([]);
            setHarborData([]);
            setEventRawList([]);
            setNoMoreData(true);
        }, 300);

        setTimeout(() => {
            getAPIData(1);
        }, 300);
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

    const renderOneList = (dataList) => {
        return (<View>
            <FlatList
                data={dataList}
                renderItem={({ item }) => {
                    if (item.type === 'harbor') {
                        if (item.pinned === false) {
                            return renderHarborMessage(item);
                        }
                    } else {
                        return <EventCard data={item} />
                    }
                }}
                scrollEnabled={false}
                keyExtractor={item => item._id ? String(item._id) : String(item.id)}
            />
        </View>)
    };

    // 渲染主要內容
    const renderPage = () => {
        return (
            <View style={s.waterFlowContainer}>
                {/* 左側的列 放置雙數下標的圖片 從0開始 */}
                <View>
                    {renderOneList(leftDataList)}
                </View>
                {/* 右側的列 放置單數下標的圖片 */}
                <View >
                    {rightDataList.length > 0 ? (
                        renderOneList(rightDataList)
                    ) : (
                        <Text style={{ ...uiStyle.defaultText }}>No more data</Text>
                    )}
                </View>
            </View>
        );
    };

    // 渲染harbor的消息
    const renderHarborMessage = (item) => {
        // unicode_title    直接返回對應的Emoji
        // title            例如:heart_eyes:以字符串形式返回
        // excerpt          主題內容
        // id               主題ID
        // like_count       點讚數
        // reply_count      回復數
        // views            瀏覽數
        // pinned           是否置頂
        return (
            <TouchableScale style={{
                backgroundColor: white, borderRadius: scale(8),
                margin: scale(5), padding: scale(10),
                width: scale(160),
                alignItems: 'flex-start'
            }}
                onPress={async () => {
                    trigger();
                    const settingStr = await getItem();
                    const setting = settingStr ? JSON.parse(settingStr) : null;
                    // 用戶偏好是Webview則導航到Tabbar
                    if (setting && setting.tabbarMode == 'webview') {
                        const URL = ARK_HARBOR_TOPIC + item.id;
                        navigation.navigate('Harbor', { url: URL });
                    } else {
                        openLink({ URL: ARK_HARBOR_TOPIC + item.id, mode: 'fullScreen' });
                    }
                }}
            >
                <Text style={{ ...uiStyle.defaultText, fontWeight: '500', fontSize: scale(12), color: black.second }} numberOfLines={2}>
                    {item.unicode_title ? item.unicode_title : item.title}
                </Text>
                <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third, marginTop: verticalScale(4), }} numberOfLines={3}>{item.excerpt}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', }}>
                    <View style={{
                        paddingHorizontal: scale(2), paddingVertical: scale(1),
                        borderColor: themeColor,
                        borderRadius: scale(20), borderWidth: scale(1),
                        marginTop: scale(2),
                    }}>
                        <Text style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(7),
                            color: themeColor
                        }}>
                            職涯港
                        </Text>
                    </View>

                    {/* 點讚數 回復數 瀏覽數 */}
                    <View style={{ marginTop: scale(2), flexDirection: 'row', alignItems: 'center' }}>
                        {item?.like_count > 0 && (
                            <Text style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(10),
                                color: themeColor,
                                marginLeft: scale(5),
                            }}>
                                <MaterialCommunityIcons name="thumb-up" size={scale(10)} />
                                {item.like_count}
                            </Text>
                        )}

                        {item?.reply_count > 0 && (
                            <Text style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(10),
                                color: themeColor,
                                marginLeft: scale(5),
                            }}>
                                <MaterialCommunityIcons name="comment" size={scale(10)} />
                                {item.reply_count}
                            </Text>
                        )}

                        {item?.views > 0 && (
                            <Text style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(10),
                                color: themeColor,
                                marginLeft: scale(5),
                            }}>
                                <MaterialCommunityIcons name="eye" size={scale(10)} />
                                {item.views}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableScale>
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

export default memo(EventPage);
