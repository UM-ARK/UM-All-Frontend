import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef, useContext, useCallback, memo } from 'react';
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    Image,
    useWindowDimensions,
} from 'react-native';

import { useTheme, themes, uiStyle } from '../../../../components/ThemeContext';
import { BASE_URI, BASE_HOST, GET, ARK_HARBOR_TOP, ARK_HARBOR_LATEST, ARK_HARBOR_TOPIC, ARK_HARBOR_AVATAR, } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import Loading from '../../../../components/Loading';
import EventCard from '../components/EventCard';
import { openLink } from '../../../../utils/browser';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';

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
            alignItems: 'flex-start',
            justifyContent: 'space-between',
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
    const [columnsData, setColumnsData] = useState([]); // 動態列數據
    const [isLoading, setIsLoading] = useState(true);
    const [noMoreData, setNoMoreData] = useState(false);
    const [harborData, setHarborData] = useState([]);
    const [eventRawList, setEventRawList] = useState([]);  // 把活動原始數據也存 state
    const [numColumns, setNumColumns] = useState(2); // 橫豎屏動態列數
    const [cardWidth, setCardWidth] = useState(scale(160)); // 卡片寬度隨列數更新
    const windowLayout = useWindowDimensions();

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

    // 監聽螢幕尺寸，依據橫豎屏調整瀑布列數與卡片寬度
    useEffect(() => {
        const isLandscape = windowLayout.width > windowLayout.height;
        const targetColumns = isLandscape ? 3 : 2; // 橫屏擴充三列，豎屏維持兩列
        const gap = scale(10); // 欄間距，留白避免擁擠
        const safeWidth = Math.max(windowLayout.width, 320);
        const computedWidth = (safeWidth - gap * (targetColumns + 1)) / targetColumns;
        setNumColumns(targetColumns);
        // 卡片寬度加上上下限，避免極端螢幕尺寸過窄/過寬
        setCardWidth(Math.min(Math.max(computedWidth, scale(140)), scale(220)));
    }, [windowLayout.height, windowLayout.width]);

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

    // 橫豎屏切換時重新分配瀑布列，保留已拉取的活動
    useEffect(() => {
        if (columnsData.length > 0 || eventDataList.length > 0) {
            separateData(eventDataList.length > 0 ? eventDataList : eventRawList, { skipAppend: true });
        }
    }, [numColumns]);

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
                    const newTopic = lodash.sampleSize(topics, 12);
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

        // 随机决定是否将 harbor 插到最顶部 (40% 概率)
        const insertOnTop = Math.random() < 0.4;
        if (insertOnTop && harborArr.length > 0) {
            const randomIdx = Math.floor(Math.random() * harborArr.length);
            const [harborToTop] = harborArr.splice(randomIdx, 1);
            listCopy.unshift(harborToTop); // 顶部插入一个
        }

        // 所有活动后面都可以插入 harbor，不管结束没结束
        let insertPositions = Array.from({ length: listCopy.length + 1 }, (_, i) => i);

        // 随机打乱插入点
        for (let i = insertPositions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [insertPositions[i], insertPositions[j]] = [insertPositions[j], insertPositions[i]];
        }

        let used = 0;
        harborArr.forEach((harborItem, i) => {
            if (insertPositions.length > 0 && i < insertPositions.length) {
                listCopy.splice(insertPositions[i], 0, harborItem);
                // 插入后，所有后面的插入点都要 +1
                insertPositions = insertPositions.map(pos => pos > insertPositions[i] ? pos + 1 : pos);
                used++;
            }
        });

        // 如果还有剩余 harbor，全部插到末尾
        if (harborArr.length > used) {
            listCopy.push(...harborArr.slice(used));
        }

        return listCopy;
    };

    const separateData = (eventList, options = {}) => {
        const { skipAppend = false } = options; // skipAppend 用於橫豎屏重排，避免重複拼接
        // 依列數動態分流 event 與 harbor，模擬小紅書瀑布
        let columns = Array.from({ length: numColumns }, () => []);

        const harborChunks = lodash.chunk(harborData, Math.ceil(harborData.length / numColumns));
        // eventList 為空時，僅渲染 harbor 分段
        if (!eventList || eventList.length === 0) {
            if (harborData.length === 0) {
                return;
            }
            const filledHarbor = Array.from({ length: numColumns }, (_, idx) => harborChunks[idx] || []);
            setColumnsData(filledHarbor);
            return;
        }

        // 將圖片類型的服務器返回的相對路徑加上域名，缺字段時安全跳過（橫屏重排可能遇到空值）
        eventList.forEach((itm) => {
            if (!itm || !itm.cover_image_url || typeof itm.cover_image_url !== 'string') {
                return;
            }
            if (itm.cover_image_url.indexOf(BASE_HOST) === -1) {
                itm.cover_image_url = BASE_HOST + itm.cover_image_url;
            }
        });

        // 依 index % numColumns 均勻分佈活動卡片
        eventList.forEach((itm, idx) => {
            const targetIdx = idx % numColumns;
            columns[targetIdx].push(itm);
        });

        // 翻頁時與舊資料合併，保持瀑布累積
        if (dataPage > 1 && !skipAppend && columnsData.length === numColumns) {
            columns = columns.map((col, idx) => columnsData[idx].concat(col));
        }

        // 去重，避免重複卡片
        columns = columns.map(col => lodash.uniqBy(col, item => item._id || item.id));

        // 首頁將 harbor 隨機插入各列
        if (harborData.length > 0 && dataPage === 1) {
            columns = columns.map((col, idx) => insertToList(col, lodash.cloneDeep(harborChunks[idx] || [])));
        }

        const mergedEvents = columns.flat();
        setColumnsData(columns);
        setEventDataList(mergedEvents);
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
            setColumnsData([]);
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
                    justifyContent: 'center', alignItems: 'center',
                    marginTop: scale(10), marginBottom: scale(20),
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
                        return <EventCard data={item} cardWidth={cardWidth} />
                    }
                }}
                scrollEnabled={false}
                keyExtractor={item => item._id ? String(item._id) : String(item.id)}
            />
        </View>)
    };

    // 渲染主要內容
    const renderPage = () => {
        const columnsToRender = columnsData.length > 0 ? columnsData : Array.from({ length: numColumns }, () => []);
        return (
            <View style={s.waterFlowContainer}>
                {columnsToRender.map((col, idx) => (
                    <View key={`water-col-${idx}`} style={{ flex: 1, alignItems: 'center' }}>
                        {col.length > 0 ? (
                            renderOneList(col)
                        ) : (
                            <Text style={{ ...uiStyle.defaultText }}>No more data</Text>
                        )}
                    </View>
                ))}
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
        // highest_post_number 回復數
        // views            瀏覽數
        // pinned           是否置頂
        const pinColor = black.third;
        const cleanExcerpt = item.excerpt ? item.excerpt.replace(/:[a-zA-Z0-9_+-]+:/g, '') : '';
        const borderRadius = scale(8);
        const borderTopRadiusStyle = item.excerpt ? null : {
            borderTopStartRadius: borderRadius, borderTopEndRadius: borderRadius,
        }

        return (
            <TouchableScale style={{
                backgroundColor: `${themeColor}15`,
                borderRadius,
                margin: scale(5),
                width: cardWidth,
                alignItems: 'flex-start', justifyContent: 'center',
            }}
                onPress={async () => {
                    trigger();
                    logToFirebase('clickHarbor', {
                        title: item.title,
                    });
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
                {/* 帖子內容 */}
                {item.excerpt && (
                    <View style={{
                        marginTop: verticalScale(13), marginHorizontal: scale(8),
                        paddingHorizontal: verticalScale(5), paddingBottom: verticalScale(5),
                    }}>
                        <Text style={{
                            ...uiStyle.defaultText, fontSize: verticalScale(10), color: themeColor,
                            lineHeight: verticalScale(16),
                        }} numberOfLines={5}>
                            {cleanExcerpt}
                        </Text>
                    </View>
                )}

                <View style={{
                    marginTop: item.excerpt ? verticalScale(5) : null,
                    paddingTop: verticalScale(5),
                    backgroundColor: white,
                    paddingBottom: verticalScale(10), paddingHorizontal: scale(8),
                    borderBottomEndRadius: borderRadius, borderBottomStartRadius: borderRadius,
                    ...borderTopRadiusStyle,
                }}>
                    {/* 帖子標題 */}
                    <Text style={{
                        ...uiStyle.defaultText, fontWeight: '500', fontSize: verticalScale(11), color: black.second,
                        textAlign: 'left',
                        lineHeight: verticalScale(16),
                    }} numberOfLines={4}>
                        {item.unicode_title ? item.unicode_title : item.title}
                    </Text>

                    {/* 底部Pin */}
                    <View style={{
                        marginTop: verticalScale(5),
                        flexDirection: 'row', width: '100%',
                        alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        {/* 用戶頭像 */}
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', }}>
                            <Image
                                source={{ uri: ARK_HARBOR_AVATAR(item.last_poster_username), }}
                                style={{
                                    width: verticalScale(12), height: verticalScale(12),
                                    borderRadius: scale(50),
                                    backgroundColor: white,
                                }}
                            />
                            <Text style={{
                                marginLeft: scale(2), ...uiStyle.defaultText, color: black.third,
                                fontSize: verticalScale(8), fontStyle: 'italic',
                                flexShrink: 1, textAlign: 'left',
                            }} numberOfLines={1}>
                                {item.last_poster_username}
                            </Text>
                        </View>

                        {/* 點讚等資訊 */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', }}>
                            {/* 點讚數 回復數 瀏覽數 */}
                            <View style={{ flexDirection: 'row', }}>
                                {item?.like_count > 0 && (
                                    <View style={{
                                        marginLeft: scale(5),
                                        alignItems: 'center', justifyContent: 'center', flexDirection: 'row'
                                    }}>
                                        <MaterialCommunityIcons name="thumb-up-outline" size={verticalScale(10)} color={pinColor} style={{ marginRight: scale(1) }} />
                                        <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(8), color: pinColor, }}>
                                            {item.like_count}
                                        </Text>
                                    </View>
                                )}

                                {item?.highest_post_number > 1 && (
                                    <View style={{
                                        marginLeft: scale(5),
                                        alignItems: 'center', justifyContent: 'center', flexDirection: 'row'
                                    }}>
                                        <MaterialCommunityIcons name="comment-outline" size={verticalScale(10)} color={pinColor} style={{ marginRight: scale(1) }} />
                                        <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(8), color: pinColor, }}>
                                            {item.highest_post_number}
                                        </Text>
                                    </View>
                                )}

                                {item?.views > 0 && (
                                    <View style={{
                                        marginLeft: scale(5),
                                        alignItems: 'center', justifyContent: 'center', flexDirection: 'row'
                                    }}>
                                        <MaterialCommunityIcons name="eye-outline" size={verticalScale(10)} color={pinColor} style={{ marginRight: scale(1) }} />
                                        <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(8), color: pinColor, }}>
                                            {item.views}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

            </TouchableScale>
        );
    };

    return (
        <View style={{ ...props.style, }}>
            {isLoading ? (
                <View style={{
                    flex: 1,
                    marginBottom: Dimensions.get('window').height
                }}>
                    <Loading />
                </View>
            ) : (columnsData.some(col => col.length > 0) ? (
                <View>
                    {renderPage()}
                    {renderLoadMoreView()}
                </View>
            ) : null)}
        </View>
    );
});

export default memo(EventPage);
