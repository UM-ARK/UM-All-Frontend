import React, {Component, useState} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    FlatList,
} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';

import EventCard from '../components/EventCard';

import {Header} from '@rneui/themed';
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

class ClubDetail extends Component {
    constructor(props) {
        super(props);
        // 獲取上級路由傳遞的參數，用於展示頂部標題
        // const detailRoute = this.props.route.params;
        const detailRoute = {index: 14, name: '電腦學會'};
        // console.log(detailRoute);

        // 模擬從服務器返回的數據，以detailRoute傳的id或name去請求服務器返回相關組織的數據
        const clubData = {
            imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/da6f2ec4b5ec3216f9344453f796a97c.jpg',
            name: '電腦學會',
            tag: '學會',
            clubId: 1,
            // 簡介文字
            introText: `澳門大學學生會電腦學會是以電腦為主題的學會，希望透過活動提升電腦系同學的歸屬感及團體精神。我們亦歡迎所有不同學系的同學，目的是透過舉辦工作坊、踏上IT第一步等等教授同學不同的電腦知識及認識電腦行業的前景。電競也是我們的主打之一，現時電競遊戲是一個十分熱門的話題，我們透過舉辦大大小小的比賽及交流活動等等，如最近所舉辦的澳大電競日從而推廣電競文化，讓不論是有接觸過電競與否的朋友也可以透過活動來認識電競及享受遊戲的樂趣。`,
            // 聯繫方式
            contact: [
                // type會定死，讓社團在設置個人的時候可以選擇性填寫
                {
                    type: 'Wechat',
                    num: 'abcd1234',
                },
                {
                    type: 'Email',
                    num: 'abcd1234@umac.mo',
                },
                {
                    type: 'Phone',
                    num: '12345678',
                },
                {
                    type: 'IG',
                    num: 'cpsumsu',
                },
                {
                    type: 'Facebook',
                    num: 'cpsumsu',
                },
                {
                    type: 'Website',
                    num: 'www.cpsumsu.com',
                },
            ],
        };
        // 活動，最多只請求4條
        // 距離今天越近越靠前
        const event = [
            {
                eventID: 0,
                title: '活動標題可寫在此0',
                // 封面圖片
                imgUrl: 'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg',
                // 該活動相關的圖片
                relateImageUrl: [
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg',
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p3.jpg',
                    'https://www.cpsumsu.org/image/slideshow/%E6%B8%B8%E6%88%B2%E8%A8%AD%E8%A8%88%E5%B7%A5%E4%BD%9C%E5%9D%8A.jpg',
                ],
                // 1:已結束，0:進行中
                // TODO: 以當刻時間判斷是否過期
                isFinish: '1',
                timeStamp: 1658745797000,
            },
            {
                eventID: 0,
                title: '活動標題可寫在此1',
                // 封面圖片
                imgUrl: 'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
                // 該活動相關的圖片
                relateImageUrl: [
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg',
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p3.jpg',
                    'https://www.cpsumsu.org/image/slideshow/%E6%B8%B8%E6%88%B2%E8%A8%AD%E8%A8%88%E5%B7%A5%E4%BD%9C%E5%9D%8A.jpg',
                ],
                // 1:已結束，0:進行中
                isFinish: '1',
                timeStamp: 1658745797000,
            },
            {
                eventID: 0,
                title: '活動標題可寫在此2',
                // 封面圖片
                imgUrl: 'https://www.cpsumsu.org/image/slideshow/slideshow_p3.jpg',
                // 該活動相關的圖片
                relateImageUrl: [
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg',
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p3.jpg',
                    'https://www.cpsumsu.org/image/slideshow/%E6%B8%B8%E6%88%B2%E8%A8%AD%E8%A8%88%E5%B7%A5%E4%BD%9C%E5%9D%8A.jpg',
                ],
                // 1:已結束，0:進行中
                isFinish: '1',
                timeStamp: 1655018688000,
            },
            {
                eventID: 0,
                title: '活動標題可寫在此2',
                // 封面圖片
                imgUrl: 'https://www.cpsumsu.org/image/slideshow/%E6%B8%B8%E6%88%B2%E8%A8%AD%E8%A8%88%E5%B7%A5%E4%BD%9C%E5%9D%8A.jpg',
                // 該活動相關的圖片
                relateImageUrl: [
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg',
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
                    'https://www.cpsumsu.org/image/slideshow/slideshow_p3.jpg',
                    'https://www.cpsumsu.org/image/slideshow/%E6%B8%B8%E6%88%B2%E8%A8%AD%E8%A8%88%E5%B7%A5%E4%BD%9C%E5%9D%8A.jpg',
                ],
                // 1:已結束，0:進行中
                isFinish: '1',
                timeStamp: 1655018688000,
            },
        ];

        // Header的背景圖片
        const bgImg =
            'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg';

        this.state = {
            detailRoute,
            clubData,
            event,
            bgImg,
            // 訪問該頁的用戶對該組織的Follow狀態
            isFollow: false,
            // 該用戶是否管理員。社團、APP管理員：true；
            isAdmin: true,
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
        // 解構state數據
        const {detailRoute, clubData, bgImg, isFollow, isAdmin} = this.state;

        // 渲染Header前景，社團LOGO，返回按鈕
        // TODO: 點擊查看大圖
        renderForeground = () => {
            return (
                <View style={{flex: 1, position: 'relative'}}>
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
                    <View
                        style={{
                            bottom: 0,
                            width: '100%',
                            height: pxToDp(20),
                            backgroundColor: white,
                            position: 'absolute',
                            borderTopLeftRadius: pxToDp(15),
                            borderTopRightRadius: pxToDp(15),
                        }}
                    />
                    {/* 社團LOGO */}
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
                </View>
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
                <View
                    style={{
                        backgroundColor: bg_color,
                    }}>
                    {/* 1.0 社團基本資料 開始 */}
                    <View style={{alignItems: 'center'}}>
                        {/* 建議使用社團名的簡稱 */}
                        <Text
                            style={{
                                color: black.main,
                                fontSize: pxToDp(20),
                                fontWeight: '500',
                                marginTop: pxToDp(5),
                            }}
                            numberOfLines={1}>
                            {clubData.name}
                        </Text>
                        {/* 社團ID */}
                        <Text
                            style={{
                                color: black.third,
                                fontSize: pxToDp(13),
                                marginVertical: pxToDp(2),
                            }}>
                            @000{clubData.clubId}
                        </Text>
                        {/* 社團分類 */}
                        <Text
                            style={{
                                color: themeColor,
                                fontSize: pxToDp(15),
                            }}>
                            #{clubData.tag}
                        </Text>
                    </View>
                    {/* 1.0 社團基本資料 結束 */}

                    {/* Follow按鈕 */}
                    <RenderFollowButton
                        isFollow={isFollow}
                        // 傳遞修改this.state.isFollow方法
                        handleFollow={this.handleFollow}
                    />

                    {/* 2.0 過往照片 開始 */}
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
                    {/* 2.0 過往照片 結束 */}

                    {/* 3.0 簡介 開始 */}
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
                            <Text numberOfLines={3}>{clubData.introText}</Text>
                        </View>
                    </TouchableOpacity>
                    {/* 3.0 簡介 結束 */}

                    {/* 4.0 聯繫方式 開始 */}
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
                                        <View style={{flexDirection: 'row'}}>
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
                    {/* 4.0 聯繫方式 結束 */}

                    {/* 5.0 舉辦的活動 開始 */}
                    <View>
                        <FlatList
                            numColumns={2}
                            horizontal={false}
                            columnWrapperStyle={{
                                justifyContent: 'center',
                            }}
                            data={this.state.event}
                            renderItem={({item}) => {
                                return (
                                    <EventCard
                                        data={item}
                                        style={{
                                            marginVertical: pxToDp(8),
                                            marginHorizontal: pxToDp(10),
                                        }}
                                        touchDisable={false}
                                    />
                                );
                            }}
                            keyExtractor={(_, index) => index}
                            scrollEnabled={false}
                            // 在所有項目的末尾渲染，防止手勢白條遮擋
                            ListFooterComponent={() => (
                                <View
                                    style={{
                                        marginBottom: pxToDp(80),
                                    }}></View>
                            )}
                        />
                    </View>
                    {/* 5.0 舉辦的活動 結束 */}
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
                    minHeight={pxToDp(140)}
                    // 打開時的高度
                    maxHeight={pxToDp(230)}
                    // 背景內容 - 圖片 - 建議使用橫圖
                    renderHeader={() => (
                        <FastImage
                            source={{
                                uri: bgImg,
                            }}
                            style={{width: '100%', height: '100%'}}
                        />
                    )}
                    // 前景固定內容
                    renderTouchableFixedForeground={renderForeground}
                    showsVerticalScrollIndicator={false}>
                    {/* 主要頁面內容 */}
                    {renderMainContent()}
                </ImageHeaderScrollView>
            </View>
        );
    }
}

export default ClubDetail;
