import React, {Component} from 'react';
import {
    Text,
    View,
    StyleSheet,
    Dimensions,
    FlatList,
    ScrollView,
    TouchableWithoutFeedback,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {BASE_URI, BASE_HOST, GET} from '../../../utils/pathMap';
import Loading from '../../../components/Loading';
import EventCard from './components/EventCard';

import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import Toast, {DURATION} from 'react-native-easy-toast';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');

const {black, white, themeColor, viewShadow} = COLOR_DIY;

// 返回數據的頁數
let dataPage = 1;
eventDataList = [];
class EventPage extends Component {
    state = {
        leftDataList: [],
        rightDataList: [],
        isLoading: true,
        noMoreData: false,
    };

    constructor() {
        super();
        this.getData();
    }

    async getData() {
        let URL = BASE_URI + GET.EVENT_INFO_ALL;
        let num_of_item = 10;
        await axios
            .get(URL, {
                params: {
                    num_of_item,
                    page: dataPage,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let newDataArr = json.content;
                    if (newDataArr.length < num_of_item) {
                        this.setState({noMoreData: true});
                    } else {
                        this.setState({noMoreData: false});
                    }

                    if (dataPage == 1) {
                        this.separateData(newDataArr);
                        eventDataList = newDataArr;
                        this.setState({isLoading: false});
                    } else if (eventDataList.length > 0) {
                        newDataArr = eventDataList.concat(newDataArr);
                        this.separateData(newDataArr);
                        eventDataList = newDataArr;
                        this.setState({isLoading: false});
                    }
                } else if (json.code == '2') {
                    alert('已無更多數據');
                    this.setState({noMoreData: true});
                } else {
                    alert('數據出錯，請聯繫開發者');
                }
            })
            .catch(err => console.log('err', err));
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

    // 渲染懸浮可拖動按鈕
    renderGoTopButton = () => {
        const {white, black, viewShadow} = COLOR_DIY;
        return (
            <Interactable.View
                style={{
                    zIndex: 999,
                    position: 'absolute',
                }}
                ref="headInstance"
                // 設定所有可吸附的屏幕位置 0,0為屏幕中心
                snapPoints={[
                    {x: -pxToDp(140), y: -pxToDp(220)},
                    {x: pxToDp(140), y: -pxToDp(220)},
                    {x: -pxToDp(140), y: -pxToDp(120)},
                    {x: pxToDp(140), y: -pxToDp(120)},
                    {x: -pxToDp(140), y: pxToDp(0)},
                    {x: pxToDp(140), y: pxToDp(0)},
                    {x: -pxToDp(140), y: pxToDp(120)},
                    {x: pxToDp(140), y: pxToDp(120)},
                    {x: -pxToDp(140), y: pxToDp(220)},
                    {x: pxToDp(140), y: pxToDp(220)},
                ]}
                // 設定初始吸附位置
                initialPosition={{x: pxToDp(140), y: pxToDp(220)}}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        // 回頂，需先創建ref，可以在this.refs直接找到方法引用
                        this.refs.scrollView.scrollTo({
                            x: 0,
                            y: 0,
                            duration: 500, // 回頂時間
                        });
                    }}>
                    <View
                        style={{
                            width: pxToDp(50),
                            height: pxToDp(50),
                            backgroundColor: COLOR_DIY.white,
                            borderRadius: pxToDp(50),
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...viewShadow,
                        }}>
                        <Ionicons
                            name={'chevron-up'}
                            size={pxToDp(40)}
                            color={black.main}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Interactable.View>
        );
    };

    loadMoreData = () => {
        const {noMoreData} = this.state;
        dataPage++;
        if (!noMoreData) {
            this.toast.show(`數據加載中，請稍等~`, 2000);
            this.getData();
        }
    };

    renderLoadMoreView = () => {
        const {noMoreData} = this.state;
        return (
            <View
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: pxToDp(10),
                    marginBottom: pxToDp(50),
                }}>
                {noMoreData ? (
                    <View style={{alignItems: 'center'}}>
                        <Text style={{color: black.third}}>
                            沒有更多活動了，過一段時間再來吧~
                        </Text>
                        <Text>[]~(￣▽￣)~*</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={s.loadMore}
                        activeOpacity={0.8}
                        onPress={this.loadMoreData}>
                        <Text style={{color: white, fontSize: pxToDp(14)}}>
                            Load More
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // 渲染主要內容
    renderPage = () => {
        const {leftDataList, rightDataList} = this.state;
        return (
            <View style={s.waterFlowContainer}>
                {/* 左側的列 放置雙數下標的圖片 從0開始 */}
                <View>
                    <FlatList
                        data={leftDataList}
                        renderItem={({item}) => {
                            return (
                                <EventCard
                                    data={item}
                                    style={{
                                        ...s.cardContainer,
                                        marginLeft: pxToDp(5),
                                    }}
                                />
                            );
                        }}
                        scrollEnabled={false}
                    />
                </View>
                {/* 右側的列 放置單數下標的圖片 */}
                <View style={{alignItems: 'center'}}>
                    {rightDataList.length > 0 ? (
                        <FlatList
                            data={rightDataList}
                            renderItem={({item}) => {
                                return (
                                    <EventCard
                                        data={item}
                                        style={{
                                            ...s.cardContainer,
                                            marginRight: pxToDp(5),
                                        }}
                                    />
                                );
                            }}
                            scrollEnabled={false}
                        />
                    ) : (
                        <Text>No more data</Text>
                    )}
                </View>
            </View>
        );
    };

    render() {
        const {leftDataList, rightDataList, isLoading} = this.state;
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                {/* 懸浮可拖動按鈕 */}
                {this.renderGoTopButton()}
                {/* TODO: 筛选功能 */}
                <View style={{flex: 1, width: '100%'}}>
                    {/* 加載狀態渲染骨架屏 */}
                    {isLoading ? (
                        <View
                            style={{
                                flex: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                            <Loading />
                        </View>
                    ) : (
                        <ScrollView
                            ref={'scrollView'}
                            style={{width: '100%'}}
                            refreshControl={
                                <RefreshControl
                                    colors={[themeColor]}
                                    tintColor={themeColor}
                                    refreshing={this.state.isLoading}
                                    onRefresh={() => {
                                        if (dataPage > 1) {
                                            dataPage = 1;
                                        }
                                        this.setState({isLoading: true});
                                        this.getData();
                                    }}
                                />
                            }>
                            {/* 仿瀑布屏展示 */}
                            {/* 渲染主要內容 */}
                            {(leftDataList.length > 0 ||
                                rightDataList.length > 0) &&
                                this.renderPage()}

                            {this.renderLoadMoreView()}

                            {/* 防止底部遮擋 */}
                            <View style={{marginBottom: pxToDp(50)}} />
                        </ScrollView>
                    )}
                </View>

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{color: white}}
                    style={{
                        backgroundColor: COLOR_DIY.themeColor,
                        borderRadius: pxToDp(10),
                    }}
                />
            </View>
        );
    }
}

const s = StyleSheet.create({
    waterFlowContainer: {
        flex: 1,
        flexDirection: 'row',
        width: '100%',
        backgroundColor: COLOR_DIY.bg_color,
        justifyContent: 'space-around',
        marginTop: pxToDp(5),
    },
    // 活動卡片間距
    cardContainer: {
        marginVertical: pxToDp(6),
        marginHorizontal: pxToDp(2),
    },
    loadMore: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: themeColor,
        paddingHorizontal: pxToDp(10),
        paddingVertical: pxToDp(10),
        borderRadius: pxToDp(15),
        marginBottom: pxToDp(5),
        ...viewShadow,
    },
});

export default EventPage;
