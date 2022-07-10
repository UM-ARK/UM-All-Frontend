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
    ScrollView,
} from 'react-native';

import {pxToDp} from '../../../../utils/stylesKits';
import {COLOR_DIY} from '../../../../utils/uiMap';

import EventCard from '../components/EventCard';
import ModalBottom from '../../../../components/ModalBottom';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';

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

// 時間戳轉時間
function timeTrans(date) {
    var date = new Date(date);
    var Y = date.getFullYear();
    var M =
        date.getMonth() + 1 < 10
            ? '0' + (date.getMonth() + 1)
            : date.getMonth() + 1;
    var D = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    var h = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    var m =
        date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    var s =
        date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return M + '/' + D + ', ' + h + ':' + m;
}

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
                position: 'absolute',
                right: pxToDp(12),
                bottom: pxToDp(12),
                backgroundColor: isFollow ? black.third : themeColor,
                padding: pxToDp(10),
                borderRadius: pxToDp(12),
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
                {isFollow ? 'Del Follow' : 'Follow'}
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
        // TODO: Event需綁定相關社團資料
        let clubData = {
            clubID: 1,
            avatarUrl:
                'https://info.umsu.org.mo/storage/affiliate/images/da6f2ec4b5ec3216f9344453f796a97c.jpg',
        };

        this.state = {
            // 訪問該頁的用戶對該組織的Follow狀態
            isFollow: false,
            // 該用戶是否管理員。社團、APP管理員：true；
            isAdmin: true,
            ok: false,
            eventData,
            imageUrls: eventData.coverImgUrl,
            clubData,
        };
    }

    // 點擊Follow按鈕響應事件
    handleFollow = () => {
        const {isFollow} = this.state;
        this.setState({isFollow: !isFollow});
    };

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        this.setState({isShowModal: !this.state.isShowModal});
    };

    render() {
        // 解耦uiMap的數據
        const {bg_color, white, black, themeColor} = COLOR_DIY;

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
        const {avatarUrl} = this.state.clubData;

        // 活動基本信息
        renderEventBasicInfo = () => {
            return (
                <View
                    style={{
                        backgroundColor: white,
                        margin: pxToDp(10),
                        marginHorizontal: pxToDp(40),
                        paddingVertical: pxToDp(20),
                        paddingHorizontal: pxToDp(15),
                        borderRadius: pxToDp(10),
                        overflow: 'hidden',
                        ...COLOR_DIY.viewShadow,
                    }}>
                    {/* 文字描述 */}
                    <View>
                        {/* 活動名 */}
                        <View style={{marginBottom: pxToDp(15)}}>
                            <Text
                                style={{
                                    color: black.main,
                                    fontWeight: 'bold',
                                    fontSize: pxToDp(15),
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
                                {timeTrans(startTimeStamp)}
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
                                {timeTrans(finishTimeStamp)}
                            </Text>
                        </View>

                        {/* 舉辦方 */}
                        {/* <View
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
                        </View> */}

                        {/* 活動tag */}
                        <View style={{marginTop: pxToDp(20)}}>
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
                    <RenderFollowButton
                        isFollow={isFollow}
                        // 傳遞修改this.state.isFollow方法
                        handleFollow={this.handleFollow}
                    />
                </View>
            );
        };

        // 渲染Header前景，返回按鈕
        // TODO: 點擊查看大圖
        renderForeground = () => {
            return (
                <TouchableOpacity
                    style={{flex: 1, position: 'relative'}}
                    onPress={() => {
                        this.setState({imageUrls: coverImgUrl});
                        this.refs.imageScrollViewer.tiggerModal();
                    }}
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
                    <TouchableOpacity
                        activeOpacity={1}
                        style={{
                            bottom: 0,
                            width: '100%',
                            height: pxToDp(100),
                            backgroundColor: bg_color,
                            position: 'absolute',
                            borderTopLeftRadius: pxToDp(15),
                            borderTopRightRadius: pxToDp(15),
                        }}
                    />
                    {/* 活動基本信息 */}
                    <TouchableWithoutFeedback>
                        <View
                            style={{
                                bottom: pxToDp(5),
                                position: 'absolute',
                                width: '100%',
                            }}>
                            {renderEventBasicInfo()}
                        </View>
                    </TouchableWithoutFeedback>
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
                <View style={{backgroundColor: bg_color, flex: 1}}>
                    {/* 舉辦方頭像 */}
                    <TouchableWithoutFeedback
                        onPress={() => {
                            this.setState({imageUrls: avatarUrl});
                            this.refs.imageScrollViewer.tiggerModal();
                        }}>
                        <View
                            style={{
                                alignSelf: 'center',
                                flexDirection: 'row',
                            }}>
                            <View style={{justifyContent: 'center'}}>
                                <View style={{...styles.infoShowContainer}}>
                                    <Text
                                        style={{
                                            fontSize: pxToDp(11),
                                            color: COLOR_DIY.themeColor,
                                        }}>
                                        Created By
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        alignSelf: 'center',
                                        marginTop: pxToDp(5),
                                    }}>
                                    電腦學會
                                </Text>
                            </View>

                            <View
                                style={{
                                    width: pxToDp(CLUB_LOGO_SIZE),
                                    height: pxToDp(CLUB_LOGO_SIZE),
                                    borderRadius: 50,
                                    overflow: 'hidden',
                                    marginVertical: pxToDp(5),
                                    marginHorizontal: pxToDp(20),
                                    ...COLOR_DIY.viewShadow,
                                }}>
                                <FastImage
                                    source={{
                                        uri: avatarUrl,
                                    }}
                                    style={{width: '100%', height: '100%'}}
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>

                    {/* 1.0 詳情介紹 開始 */}
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
                        onPress={() => this.tiggerModalBottom()}>
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
                                詳情
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
                                {'活動詳情bababaldkfjalskdjflksadjflkasjdf'}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {/* 1.0 詳情介紹 結束 */}

                    {/* 2.0 相關照片 開始 */}
                    {/* TODO: 點擊查看大圖 */}
                    {relateImgUrl.length > 0 && (
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
                                    相關照片
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
                                {relateImgUrl.map(item => {
                                    return (
                                        <FastImage
                                            source={{
                                                uri: item,
                                            }}
                                            style={{
                                                width: pxToDp(CLUB_IMAGE_WIDTH),
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

                    <View style={{marginBottom: pxToDp(100)}} />
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

                {/* 展示需要的信息Modal */}
                {this.state.isShowModal && (
                    <ModalBottom cancel={this.tiggerModalBottom}>
                        <View
                            style={{
                                padding: pxToDp(20),
                                height: PAGE_HEIGHT * 0.7,
                            }}>
                            <Text
                                style={{
                                    color: black.third,
                                    fontSize: pxToDp(13),
                                }}>
                                詳情
                            </Text>
                            <ScrollView style={{marginTop: pxToDp(5)}}>
                                <Text
                                    style={{
                                        color: black.main,
                                        fontSize: pxToDp(16),
                                    }}>
                                    {'活動詳情文字babllalallalal'}
                                </Text>
                            </ScrollView>
                        </View>
                    </ModalBottom>
                )}

                {/* 彈出層展示圖片查看器 */}
                <ImageScrollViewer
                    ref={'imageScrollViewer'}
                    imageUrls={this.state.imageUrls}
                    // 父組件調用 this.refs.imageScrollViewer.tiggerModal(); 打開圖層
                    // 父組件調用 this.refs.imageScrollViewer.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
                />

                <ImageHeaderScrollView
                    // 設定透明度
                    maxOverlayOpacity={0.6}
                    minOverlayOpacity={0.3}
                    // 向上滾動的淡出效果
                    fadeOutForeground
                    // 收起時的高度
                    minHeight={pxToDp(220)}
                    // 打開時的高度
                    maxHeight={pxToDp(PAGE_HEIGHT * 0.65)}
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
                    <View style={{height: pxToDp(200)}}></View>
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
