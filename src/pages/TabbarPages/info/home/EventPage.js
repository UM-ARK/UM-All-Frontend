import React, { Component } from 'react';
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Linking,
} from 'react-native';

import { COLOR_DIY, uiStyle } from '../../../../utils/uiMap';
import { BASE_URI, BASE_HOST, GET } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import Loading from '../../../../components/Loading';
import EventCard from '../components/EventCard';

import axios from 'axios';
import Toast from 'react-native-simple-toast';
import moment from 'moment-timezone';
import { scale } from 'react-native-size-matters';

const { black, white, themeColor, viewShadow, bg_color } = COLOR_DIY;

// 返回數據的頁數
let dataPage = 1;
let eventDataList = [];
class EventPage extends Component {
    state = {
        leftDataList: [],
        rightDataList: [],
        isLoading: true,
        noMoreData: false,
    };

    componentDidMount() {
        this.getData();
    }

    componentWillUnmount() {
        dataPage = 1;
    }

    getData = async () => {
        let URL = BASE_URI + GET.EVENT_INFO_ALL;
        let num_of_item = 10;
        let noMoreData = true;
        try {
            await axios.get(URL, {
                params: {
                    num_of_item,
                    page: dataPage,
                },
            }).then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let newDataArr = json.content;
                    if (newDataArr.length < num_of_item) {
                        noMoreData = true;
                    } else {
                        noMoreData = false;
                    }

                    if (dataPage == 1) {
                        this.separateData(this.getNotFinishEvent(newDataArr));
                        eventDataList = newDataArr;
                    } else if (eventDataList.length > 0) {
                        newDataArr = eventDataList.concat(newDataArr);
                        this.separateData(this.getNotFinishEvent(newDataArr));
                        eventDataList = newDataArr;
                    }
                } else if (json.code == '2') {
                    alert('已無更多數據');
                    this.setState({ noMoreData: true });
                } else {
                    alert('數據出錯，請聯繫開發者');
                }
            })
        } catch (error) {
            if (error.code == 'ERR_NETWORK' || error.code == "ECONNABORTED") {
                Toast.show('網絡錯誤！請檢查網絡再試');
                this.setState({ leftDataList: [], rightDataList: [], });
            } else {
                alert('未知錯誤，請聯繫開發者！\n也可能是國內網絡屏蔽所導致！')
            }
        } finally {
            this.setState({
                isLoading: false,
                noMoreData,
            });
        }
    }

    separateData = eventList => {
        // 將dataList的數據分成單數和偶數列，用於模擬瀑布屏展示佈局
        let leftDataList = [];
        let rightDataList = [];

        eventList.map((itm, idx) => {
            // 圖片類型服務器返回相對路徑，請記住加上域名
            if (itm.cover_image_url.indexOf(BASE_HOST) == -1) {
                itm.cover_image_url = BASE_HOST + itm.cover_image_url;
            }
            if (idx % 2 == 0) {
                leftDataList.push(itm);
            } else {
                rightDataList.push(itm);
            }
        });
        this.setState({
            leftDataList,
            rightDataList,
        });
    };

    // 篩選尚未結束的活動，並隨機亂序，最後與原數組合併去重
    getNotFinishEvent = eventList => {
        let notFinishEvent = [];
        let closeFinishEvent = [];
        // 當前時刻時間戳
        let nowTime = moment(new Date());

        eventList.map((itm, idx) => {
            if (nowTime.isBefore(moment(itm.enddatetime))) {
                if (idx >= 1) {
                    notFinishEvent.push(itm);
                }
                // 使將結束的頭兩個活動置頂，後面合併數組
                else if (idx < 1) {
                    closeFinishEvent.push(itm);
                }
            }
        });

        // 如果未結束活動超過1個，再進行隨機排序
        if (notFinishEvent.length > 1) {
            notFinishEvent.sort(() => {
                return Math.random() - 0.5
            })
        }
        // 如果將結束活動超過1個，再進行隨機排序
        if (closeFinishEvent.length > 1) {
            closeFinishEvent.sort(() => {
                return Math.random() - 0.5
            })
        }
        return Array.from(
            new Set(
                closeFinishEvent.concat(
                    notFinishEvent.concat(eventList)
                )
            ))
    };

    loadMoreData = () => {
        const { noMoreData } = this.state;
        dataPage++;
        if (!noMoreData) {
            Toast.show('數據加載中...')
            this.getData();
        }
        trigger();
    };

    onRefresh = () => {
        if (dataPage > 1) {
            dataPage = 1;
        }
        this.setState({ isLoading: true });
        this.getData();
    };

    renderLoadMoreView = () => {
        const { noMoreData } = this.state;
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
                        onPress={this.loadMoreData}>
                        <Text style={{ ...uiStyle.defaultText, color: white, fontSize: scale(14) }}>
                            Load More
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // 渲染主要內容
    renderPage = () => {
        const { leftDataList, rightDataList } = this.state;
        return (
            <View style={s.waterFlowContainer}>
                {/* 左側的列 放置雙數下標的圖片 從0開始 */}
                <View>
                    <FlatList
                        data={leftDataList}
                        renderItem={({ item }) => {
                            return <EventCard data={item} />;
                        }}
                        scrollEnabled={false}
                        keyExtractor={item => item._id}
                    />
                </View>
                {/* 右側的列 放置單數下標的圖片 */}
                <View style={{ alignItems: 'center' }}>
                    {rightDataList.length > 0 ? (
                        <FlatList
                            data={rightDataList}
                            renderItem={({ item }) => {
                                return <EventCard data={item} />;
                            }}
                            scrollEnabled={false}
                            keyExtractor={item => item._id}
                        />
                    ) : (
                        <Text style={{ ...uiStyle.defaultText, }}>No more data</Text>
                    )}
                </View>
            </View>
        );
    };

    render() {
        const { leftDataList, rightDataList, isLoading } = this.state;
        return (
            <View
                style={{
                    flex: 1, backgroundColor: bg_color,
                    alignItems: 'center', justifyContent: 'center',
                    ...this.props.style,
                }}>
                {/* 加載狀態渲染骨架屏 */}
                {this.state.isLoading ? (
                    <Loading />
                ) : (leftDataList.length > 0 || rightDataList.length > 0 ?
                    <ScrollView
                        ref={'scrollView'}
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={isLoading}
                                onRefresh={this.onRefresh}
                            />
                        }
                        directionalLockEnabled
                        alwaysBounceHorizontal={false}>
                        <View>
                            {/* 瀑布流渲染主要內容 */}
                            {this.renderPage()}

                            {this.renderLoadMoreView()}
                        </View>
                    </ScrollView> : null
                )}
            </View>
        );
    }
}

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
