import React, {Component, useState} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StatusBar,
    Dimensions,
    FlatList,
    StyleSheet,
} from 'react-native';

import {pxToDp} from '../../../../utils/stylesKits';
import {COLOR_DIY} from '../../../../utils/uiMap';

import EventCard from '../components/EventCard';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    ImageHeaderScrollView,
    TriggeringView,
} from 'react-native-image-header-scroll-view';
import FastImage from 'react-native-fast-image';
import {useToast} from 'native-base';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');
const CLUB_LOGO_SIZE = 80;
const CLUB_IMAGE_WIDTH = 75;
const CLUB_IMAGE_HEIGHT = 55;

// 渲染Follow按鈕
// 因需使用Toast的Hook，被迫使用func組件QAQ
function RenderFollowButton(props) {
    const {white, themeColor, success, black} = COLOR_DIY;
    let [isFollow, setFollow] = useState(props.isFollow);

    const toast = useToast();

    return (
        <TouchableOpacity
            style={{
                marginTop: pxToDp(5),
                alignSelf: 'center',
                backgroundColor: isFollow ? black.third : themeColor,
                padding: pxToDp(10),
                borderRadius: pxToDp(15),
            }}
            activeOpacity={0.7}
            onPress={() => {
                setFollow(!isFollow);
                // 調用修改this.state的isFollow方法
                props.handleFollow();
                // 選擇Follow，展示感謝信息，此時isFollow為Flase
                if (!isFollow) {
                    toast.show({
                        placement: 'top',
                        render: () => {
                            return (
                                <View
                                    style={{
                                        backgroundColor: success,
                                        padding: pxToDp(10),
                                        borderRadius: pxToDp(10),
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                    <Text style={{color: white}}>
                                        感謝 Follow ！❥(^_-)
                                    </Text>
                                    <Text style={{color: white}}>
                                        有最新動態會提醒您！
                                    </Text>
                                </View>
                            );
                        },
                    });
                }
                // 選擇Del Follow，展示再見信息，此時isFollow為True
                else {
                    toast.show({
                        placement: 'top',
                        render: () => {
                            return (
                                <View
                                    style={{
                                        backgroundColor: themeColor,
                                        padding: pxToDp(10),
                                        borderRadius: pxToDp(10),
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                    <Text style={{color: white}}>
                                        有緣再見！o(╥﹏╥)o
                                    </Text>
                                </View>
                            );
                        },
                    });
                }
            }}>
            <Text style={{color: white}}>
                {isFollow ? 'Del Follow' : 'Follow Us'}
            </Text>
        </TouchableOpacity>
    );
}

class EventDetail extends Component {
    constructor(props) {
        super(props);
        // 獲取上級路由傳遞的參數，展示活動詳情
        const detailRoute = this.props.route.params;

        // TODO: 通過detailRoute的內容，請求對應活動在服務器儲存的資料
        // TODO: 從服務器判斷是否有follow
        let eventData = detailRoute.data;

        // Header的背景圖片
        const bgImg =
            'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg';

        this.state = {
            // 訪問該頁的用戶對該組織的Follow狀態
            isFollow: false,
            // 該用戶是否管理員。社團、APP管理員：true；
            isAdmin: true,
            ok: false,
            eventData,
        };
    }

    // 點擊Follow按鈕響應事件
    handleFollow = () => {
        const {isFollow} = this.state;
        this.setState({isFollow: !isFollow});
    };

    render() {
        // 解耦uiMap的數據
        const {bg_color, white, black, themeColor} = COLOR_DIY;

        console.log(this.state.eventData);
        // 解構state數據
        const {
            coverImgUrl,
            title,
            startTimeStamp,
            finishTimeStamp,
            eventID,
            link,
            relateImgUrl,
            type,
        } = this.state.eventData;
        const {isFollow, isAdmin} = this.state;

        // 渲染Header前景，返回按鈕
        // TODO: 點擊查看大圖
        renderForeground = () => {
            return (
                <TouchableOpacity
                    style={{flex: 1, position: 'relative'}}
                    onPress={() => alert('Test')}
                    activeOpacity={1}>
                    {/* 返回按鈕 */}
                    <View
                        style={{
                            position: 'absolute',
                            top: pxToDp(65),
                            left: pxToDp(10),
                        }}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={white}
                            />
                        </TouchableOpacity>
                    </View>
                    {/* 編輯資料按鈕 只有管理員可見 */}
                    {isAdmin && (
                        <View
                            style={{
                                position: 'absolute',
                                top: pxToDp(65),
                                right: pxToDp(10),
                            }}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() =>
                                    alert('管理員身份，進入設置資料頁面')
                                }>
                                <Ionicons
                                    name="settings-outline"
                                    size={pxToDp(25)}
                                    color={white}
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* 白邊，凸顯立體感 */}
                    {/* <TouchableOpacity
                        activeOpacity={1}
                        style={{
                            bottom: 0,
                            width: '100%',
                            height: pxToDp(20),
                            backgroundColor: white,
                            position: 'absolute',
                            borderTopLeftRadius: pxToDp(15),
                            borderTopRightRadius: pxToDp(15),
                        }}
                    /> */}
                    {/* 社團LOGO */}
                    {/* <TouchableWithoutFeedback>
                        <View
                            style={{
                                position: 'absolute',
                                bottom: pxToDp(5),
                                alignSelf: 'center',
                                width: pxToDp(CLUB_LOGO_SIZE),
                                height: pxToDp(CLUB_LOGO_SIZE),
                                borderRadius: 50,
                                overflow: 'hidden',
                                ...COLOR_DIY.viewShadow,
                            }}>
                            <FastImage
                                source={{
                                    uri: 'https://info.umsu.org.mo/storage/affiliate/images/da6f2ec4b5ec3216f9344453f796a97c.jpg',
                                }}
                                style={{width: '100%', height: '100%'}}
                            />
                        </View>
                    </TouchableWithoutFeedback> */}
                </TouchableOpacity>
            );
        };

        // 渲染Follow按鈕，主題色為未Follow，Follow改為灰色
        renderFollowButton = () => {
            return (
                <TouchableOpacity
                    style={{
                        marginTop: pxToDp(5),
                        alignSelf: 'center',
                        backgroundColor: isFollow ? black.third : themeColor,
                        padding: pxToDp(10),
                        borderRadius: pxToDp(15),
                    }}
                    activeOpacity={0.7}
                    onPress={this.handleFollow}>
                    <Text style={{color: white}}>
                        {isFollow ? 'Del Follow' : 'Follow Us'}
                    </Text>
                </TouchableOpacity>
            );
        };

        // 渲染頁面主要內容
        renderMainContent = () => {
            return (
                <View style={{backgroundColor: bg_color}}>
                    {/* 1.0 活動基本資料 開始 */}
                    <View
                        style={{
                            backgroundColor: white,
                            margin: pxToDp(10),
                            paddingVertical: pxToDp(20),
                            paddingHorizontal: pxToDp(15),
                            borderRadius: pxToDp(10),
                            overflow: 'hidden',
                            ...COLOR_DIY.viewShadow,
                        }}>
                        {/* 文字描述 */}
                        <View>
                            {/* 活動名 */}
                            <View style={{marginBottom: pxToDp(5)}}>
                                <Text
                                    style={{
                                        color: black.main,
                                        fontWeight: 'bold',
                                    }}>
                                    {title}
                                </Text>
                            </View>

                            {/* 活動地點 */}
                            <View style={{flexDirection: 'row'}}>
                                <View style={{...styles.infoShowContainer}}>
                                    <Text
                                        style={{
                                            fontSize: pxToDp(11),
                                            color: COLOR_DIY.themeColor,
                                        }}>
                                        @
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        marginLeft: pxToDp(5),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    {'活動地點'}
                                </Text>
                            </View>

                            {/* 活動時間 */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    marginTop: pxToDp(5),
                                }}>
                                <View style={{...styles.infoShowContainer}}>
                                    <Text
                                        style={{
                                            fontSize: pxToDp(11),
                                            color: COLOR_DIY.themeColor,
                                        }}>
                                        from
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        marginHorizontal: pxToDp(5),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    {startTimeStamp}
                                </Text>
                                <View style={{...styles.infoShowContainer}}>
                                    <Text
                                        style={{
                                            fontSize: pxToDp(11),
                                            color: COLOR_DIY.themeColor,
                                        }}>
                                        to
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        marginLeft: pxToDp(5),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    {finishTimeStamp}
                                </Text>
                            </View>

                            {/* 舉辦方 */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    marginTop: pxToDp(5),
                                }}>
                                <View style={{...styles.infoShowContainer}}>
                                    <Text
                                        style={{
                                            fontSize: pxToDp(11),
                                            color: COLOR_DIY.themeColor,
                                        }}>
                                        by
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        marginLeft: pxToDp(5),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    {'誰舉辦的'}
                                </Text>
                            </View>

                            {/* 活動tag */}
                            <View style={{marginTop: pxToDp(5)}}>
                                <Text
                                    style={{
                                        marginLeft: pxToDp(5),
                                        color: COLOR_DIY.themeColor,
                                        fontSize: pxToDp(14),
                                    }}>
                                    {'#' + '活動的tag'}
                                </Text>
                            </View>
                        </View>
                        {/* Follow按鈕 帶Toast */}
                        <View>
                            {/* <RenderFollowButton
                                isFollow={isFollow}
                                // 傳遞修改this.state.isFollow方法
                                handleFollow={this.handleFollow}
                            /> */}
                        </View>
                    </View>
                    {/* 1.0 活動基本資料 結束 */}

                    {/* 3.0 簡介 開始 */}
                    {this.state.ok && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: COLOR_DIY.white,
                                borderRadius: pxToDp(10),
                                marginHorizontal: pxToDp(15),
                                // 增加陰影
                                marginBottom: pxToDp(8),
                                marginTop: pxToDp(10),
                                ...COLOR_DIY.viewShadow,
                            }}
                            activeOpacity={0.7}
                            onPress={() => alert('查看全部簡介')}>
                            {/* 卡片標題 */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingVertical: pxToDp(10),
                                    paddingHorizontal: pxToDp(10),
                                }}
                                activeOpacity={0.6}>
                                <Text
                                    style={{
                                        fontSize: pxToDp(12),
                                        color: COLOR_DIY.black.main,
                                        fontWeight: 'bold',
                                    }}>
                                    簡介
                                </Text>
                                <Ionicons
                                    name="chevron-forward-outline"
                                    size={pxToDp(14)}
                                    color={COLOR_DIY.black.main}></Ionicons>
                            </View>
                            {/* 卡片內容 */}
                            <View
                                style={{
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    flexDirection: 'row',
                                    margin: pxToDp(10),
                                    marginTop: pxToDp(0),
                                }}>
                                {/* 服務圖標與文字 */}
                                <Text
                                    numberOfLines={3}
                                    style={{color: black.second}}>
                                    {clubData.introText}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    {/* 3.0 簡介 結束 */}

                    {/* 4.0 聯繫方式 開始 */}
                    {this.state.ok && (
                        <View
                            style={{
                                backgroundColor: COLOR_DIY.white,
                                borderRadius: pxToDp(10),
                                marginHorizontal: pxToDp(15),
                                // 增加陰影
                                marginBottom: pxToDp(8),
                                marginTop: pxToDp(10),
                                ...COLOR_DIY.viewShadow,
                            }}>
                            {/* 卡片標題 */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingVertical: pxToDp(10),
                                    paddingHorizontal: pxToDp(10),
                                }}
                                activeOpacity={0.6}>
                                <Text
                                    style={{
                                        fontSize: pxToDp(12),
                                        color: COLOR_DIY.black.main,
                                        fontWeight: 'bold',
                                    }}>
                                    聯繫方式
                                </Text>
                                <Ionicons
                                    name="chevron-forward-outline"
                                    size={pxToDp(14)}
                                    color={COLOR_DIY.black.main}></Ionicons>
                            </View>
                            {/* 卡片內容 */}
                            <View
                                style={{
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    flexDirection: 'row',
                                    margin: pxToDp(10),
                                    marginTop: pxToDp(0),
                                }}>
                                {/* 聯繫方式 */}
                                <View>
                                    {clubData.contact.map(item => {
                                        return (
                                            <View
                                                style={{flexDirection: 'row'}}>
                                                {/* 聯繫Type */}
                                                <Text
                                                    style={{
                                                        color: black.second,
                                                    }}>
                                                    {item.type}:{' '}
                                                </Text>
                                                {/* 相關號碼、id */}
                                                <Text
                                                    style={{
                                                        color: black.third,
                                                    }}
                                                    // 允許用戶複製
                                                    selectable={true}>
                                                    {item.num}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    )}
                    {/* 4.0 聯繫方式 結束 */}

                    {/* 2.0 相關照片 開始 */}
                    {this.state.ok && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: COLOR_DIY.white,
                                borderRadius: pxToDp(10),
                                marginHorizontal: pxToDp(15),
                                // 增加陰影
                                marginBottom: pxToDp(8),
                                marginTop: pxToDp(10),
                                ...COLOR_DIY.viewShadow,
                            }}
                            activeOpacity={0.7}
                            onPress={() => alert('查看更多圖片')}>
                            {/* 卡片標題 */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingVertical: pxToDp(10),
                                    paddingHorizontal: pxToDp(10),
                                }}
                                activeOpacity={0.6}>
                                <Text
                                    style={{
                                        fontSize: pxToDp(12),
                                        color: COLOR_DIY.black.main,
                                        fontWeight: 'bold',
                                    }}>
                                    過往照片
                                </Text>
                                <Ionicons
                                    name="chevron-forward-outline"
                                    size={pxToDp(14)}
                                    color={COLOR_DIY.black.main}></Ionicons>
                            </View>
                            {/* 卡片內容 */}
                            <View
                                style={{
                                    justifyContent: 'space-around',
                                    alignItems: 'flex-start',
                                    flexDirection: 'row',
                                    margin: pxToDp(10),
                                    marginTop: pxToDp(0),
                                }}>
                                {/* 圖片相冊 最多4張 */}
                                {this.state.event.length > 0 &&
                                    this.state.event.map(item => {
                                        return (
                                            <FastImage
                                                source={{
                                                    uri: item.imgUrl,
                                                }}
                                                style={{
                                                    width: pxToDp(
                                                        CLUB_IMAGE_WIDTH,
                                                    ),
                                                    height: pxToDp(
                                                        CLUB_IMAGE_HEIGHT,
                                                    ),
                                                    borderRadius: pxToDp(5),
                                                    ...COLOR_DIY.viewShadow,
                                                }}
                                            />
                                        );
                                    })}
                            </View>
                        </TouchableOpacity>
                    )}
                    {/* 2.0 相關照片 結束 */}
                </View>
            );
        };

        return (
            <View style={{flex: 1}}>
                <StatusBar
                    barStyle="light-content"
                    backgroundColor={'transparent'}
                    translucent={true}
                />

                <ImageHeaderScrollView
                    // 設定透明度
                    maxOverlayOpacity={0.6}
                    minOverlayOpacity={0.3}
                    // 向上滾動的淡出效果
                    fadeOutForeground
                    // 收起時的高度
                    // minHeight={pxToDp(140)}
                    minHeight={pxToDp(110)}
                    // 打開時的高度
                    // maxHeight={pxToDp(230)}
                    maxHeight={pxToDp(PAGE_HEIGHT * 0.45)}
                    // 背景內容 - 圖片 - 建議使用橫圖
                    renderHeader={() => (
                        <FastImage
                            source={{
                                uri: coverImgUrl,
                            }}
                            style={{width: '100%', height: '100%'}}
                        />
                    )}
                    // 前景固定內容
                    renderTouchableFixedForeground={renderForeground}
                    showsVerticalScrollIndicator={false}>
                    {/* 主要頁面內容 */}
                    {renderMainContent()}
                    <View style={{height: pxToDp(900)}}></View>
                </ImageHeaderScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    // 展示 from to，在哪裡舉辦的文字的樣式
    infoShowContainer: {
        borderColor: COLOR_DIY.themeColor,
        borderWidth: pxToDp(1),
        paddingHorizontal: pxToDp(3),
        paddingVertical: pxToDp(0),
        borderRadius: pxToDp(6),
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoShowText: {},
});

export default EventDetail;
