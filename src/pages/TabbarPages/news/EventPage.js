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

import { COLOR_DIY } from '../../../utils/uiMap';
import { BASE_URI, BASE_HOST, GET } from '../../../utils/pathMap';
import Loading from '../../../components/Loading';
import EventCard from './components/EventCard';

import axios from 'axios';
import Toast from 'react-native-easy-toast';
import moment from 'moment-timezone';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { scale } from 'react-native-size-matters';

const { black, white, themeColor, viewShadow, bg_color } = COLOR_DIY;

// 返回數據的頁數
let dataPage = 1;
let eventDataList = [];
class EventPage extends Component {
    constructor() {
        super();
        this.state = {
            leftDataList: [],
            rightDataList: [],
            isLoading: true,
            noMoreData: false,
            needFilter: false,
        };

        this.getData();
    }

    componentWillUnmount() {
        dataPage = 1;
    }

    getData = async () => {
        let URL = BASE_URI + GET.EVENT_INFO_ALL;
        let num_of_item = 20;
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
                        this.setState({ noMoreData: true });
                    } else {
                        this.setState({ noMoreData: false });
                    }

                    if (dataPage == 1) {
                        this.separateData(newDataArr);
                        eventDataList = newDataArr;
                        this.setState({ isLoading: false });
                    } else if (eventDataList.length > 0) {
                        newDataArr = eventDataList.concat(newDataArr);
                        if (this.state.needFilter) {
                            this.eventFilter(newDataArr);
                        } else {
                            this.separateData(newDataArr);
                        }
                        eventDataList = newDataArr;
                        this.setState({ isLoading: false });
                    }
                } else if (json.code == '2') {
                    alert('已無更多數據');
                    this.setState({ noMoreData: true });
                } else {
                    alert('數據出錯，請聯繫開發者');
                }
            })
        } catch (error) {
            if (error.code == 'ERR_NETWORK') {
                // 網絡錯誤，自動重載
                this.onRefresh();
            } else {
                alert('未知錯誤，請聯繫開發者！')
            }
        }
    }

    separateData = eventDataList => {
        // 將dataList的數據分成單數和偶數列，用於模擬瀑布屏展示佈局
        let leftDataList = [];
        let rightDataList = [];
        eventDataList.map((itm, idx) => {
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

    // 篩選尚未結束的活動
    eventFilter = eventDataList => {
        let newDataArr = [];
        // 當前時刻時間戳
        let nowTimeStamp = moment(new Date()).valueOf();
        eventDataList.map(itm => {
            if (nowTimeStamp < moment(itm.enddatetime).valueOf()) {
                newDataArr.push(itm);
            }
        });
        this.separateData(newDataArr);
    };

    loadMoreData = () => {
        const { noMoreData } = this.state;
        dataPage++;
        if (!noMoreData) {
            this.toast.show('數據加載中，請稍等~', 2000);
            this.getData();
        }
        ReactNativeHapticFeedback.trigger('soft');
    };

    onRefresh = () => {
        if (dataPage > 1) {
            dataPage = 1;
        }
        this.setState({
            isLoading: true,
            needFilter: false,
        });
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
                        <Text style={{ color: black.third, textAlign: 'center', fontSize: scale(12) }}>
                            恭喜你，達成『刨根問底』成就~
                        </Text>
                        <Text style={{ color: black.third, fontSize: scale(12) }}>[]~(￣▽￣)~*</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={s.loadMore}
                        activeOpacity={0.8}
                        onPress={this.loadMoreData}>
                        <Text style={{ color: white, fontSize: scale(14) }}>
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
                        <Text>No more data</Text>
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

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{ color: white }}
                    style={{
                        backgroundColor: COLOR_DIY.themeColor,
                        borderRadius: scale(10),
                    }}
                />
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
