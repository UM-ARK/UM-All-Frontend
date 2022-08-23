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
import ActionSheet from 'react-native-actionsheet';
import axios from 'axios';
import Toast, {DURATION} from 'react-native-easy-toast';
import moment from 'moment-timezone';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {scale} from 'react-native-size-matters';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');

const {black, white, themeColor, viewShadow, bg_color} = COLOR_DIY;

// 返回數據的頁數
let dataPage = 1;
eventDataList = [];
class EventPage extends Component {
    state = {
        leftDataList: [],
        rightDataList: [],
        isLoading: true,
        noMoreData: false,
        needFilter: false,
    };

    constructor() {
        super();
        this.getData();
    }

    componentWillUnmount() {
        dataPage = 1;
    }

    async getData() {
        let URL = BASE_URI + GET.EVENT_INFO_ALL;
        let num_of_item = 20;
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
                        if (this.state.needFilter) {
                            this.eventFilter(newDataArr);
                        } else {
                            this.separateData(newDataArr);
                        }
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
            .catch(err => alert('請求錯誤!'));
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

    renderFilter = () => {
        let optionsList = ['進行中', '全部', '取消'];
        return (
            <View>
                <TouchableOpacity
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.ActionSheet.show();
                    }}
                    activeOpacity={0.8}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: pxToDp(8),
                        width: '100%',
                        backgroundColor: bg_color,
                    }}>
                    <Text style={{color: black.third}}>篩選</Text>
                    <Ionicons
                        name={
                            this.state.applyFilter
                                ? 'md-funnel'
                                : 'md-funnel-outline'
                        }
                        size={pxToDp(10)}
                        color={black.third}
                        style={{marginLeft: pxToDp(5)}}
                    />
                </TouchableOpacity>

                {/* 選擇彈窗 */}
                <ActionSheet
                    ref={o => (this.ActionSheet = o)}
                    options={optionsList}
                    cancelButtonIndex={optionsList.length - 1}
                    destructiveButtonIndex={optionsList.length - 1}
                    onPress={index => {
                        if (index == 1) {
                            // 全部mode
                            this.setState({needFilter: false});
                            this.separateData(eventDataList);
                        } else if (index == 0) {
                            // 篩選未結束mode
                            this.setState({needFilter: true});
                            this.eventFilter(eventDataList);
                        }
                    }}
                />
            </View>
        );
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
                    {x: -scale(140), y: -scale(220)},
                    {x: scale(140), y: -scale(220)},
                    {x: -scale(140), y: -scale(120)},
                    {x: scale(140), y: -scale(120)},
                    {x: -scale(140), y: scale(0)},
                    {x: scale(140), y: scale(0)},
                    {x: -scale(140), y: scale(120)},
                    {x: scale(140), y: scale(120)},
                    {x: -scale(140), y: scale(220)},
                    {x: scale(140), y: scale(220)},
                ]}
                // 設定初始吸附位置
                initialPosition={{x: scale(140), y: scale(220)}}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        // 回頂，需先創建ref，可以在this.refs直接找到方法引用
                        this.refs.scrollView.scrollTo({
                            x: 0,
                            y: 0,
                            duration: 500, // 回頂時間
                        });
                    }}>
                    <View
                        style={{
                            width: scale(50),
                            height: scale(50),
                            backgroundColor: COLOR_DIY.white,
                            borderRadius: scale(50),
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...viewShadow,
                        }}>
                        <Ionicons
                            name={'chevron-up'}
                            size={scale(40)}
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
        ReactNativeHapticFeedback.trigger('soft');
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
                        <Text style={{color: black.third}}>[]~(￣▽￣)~*</Text>
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
                            return <EventCard data={item} />;
                        }}
                        scrollEnabled={false}
                        keyExtractor={item => item._id}
                    />
                </View>
                {/* 右側的列 放置單數下標的圖片 */}
                <View style={{alignItems: 'center'}}>
                    {rightDataList.length > 0 ? (
                        <FlatList
                            data={rightDataList}
                            renderItem={({item}) => {
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
        const {leftDataList, rightDataList, isLoading} = this.state;
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: bg_color,
                }}>
                {/* 懸浮可拖動按鈕 */}
                {this.renderGoTopButton()}

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
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={this.state.isLoading}
                                onRefresh={() => {
                                    if (dataPage > 1) {
                                        dataPage = 1;
                                    }
                                    this.setState({
                                        isLoading: true,
                                        needFilter: false,
                                    });
                                    this.getData();
                                }}
                            />
                        }
                        directionalLockEnabled
                        alwaysBounceHorizontal={false}
                        // bounces={false}
                    >
                        {/* 篩選 */}
                        {this.renderFilter()}
                        {/* 仿瀑布屏展示 */}
                        {/* 渲染主要內容 */}
                        {leftDataList.length > 0 || rightDataList.length > 0
                            ? this.renderPage()
                            : null}

                        {this.renderLoadMoreView()}

                        {/* 防止底部遮擋 */}
                        <View style={{marginBottom: pxToDp(50)}} />
                    </ScrollView>
                )}

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
        flexDirection: 'row',
        width: '100%',
        backgroundColor: bg_color,
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
