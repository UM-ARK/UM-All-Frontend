import React, {Component, useState} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StatusBar,
    Dimensions,
    FlatList,
    ScrollView,
    Alert,
    StyleSheet,
    RefreshControl,
} from 'react-native';

import {COLOR_DIY, ToastText} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';
import {clubTagMap} from '../../../../utils/clubMap';
import {BASE_URI, GET, ARK_LETTER_IMG} from '../../../../utils/pathMap';

import EventCard from '../components/EventCard';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import ModalBottom from '../../../../components/ModalBottom';
import DialogDIY from '../../../../components/DialogDIY';
import Loading from '../../../../components/Loading';
import {updateUserInfo} from '../../../../utils/storageKits';

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    ImageHeaderScrollView,
    TriggeringView,
} from 'react-native-image-header-scroll-view';
import FastImage from 'react-native-fast-image';
import {useToast} from 'native-base';
import {inject} from 'mobx-react';
import axios from 'axios';

// 解構uiMap的數據
const {bg_color, white, black, themeColor, viewShadow} = COLOR_DIY;

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');
const CLUB_LOGO_SIZE = pxToDp(80);
const CLUB_IMAGE_WIDTH = pxToDp(75);
const CLUB_IMAGE_HEIGHT = pxToDp(55);

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
                padding: pxToDp(10),
                borderRadius: pxToDp(15),
                backgroundColor: isFollow ? black.third : themeColor,
            }}
            activeOpacity={0.7}
            onPress={() => {
                // 調用修改this.state的isFollow方法
                if (props.handleFollow()) {
                    setFollow(!isFollow);

                    // 選擇Follow，展示感謝信息，此時isFollow為Flase
                    if (!isFollow) {
                        toast.show({
                            placement: 'top',
                            render: () => (
                                <ToastText
                                    backgroundColor={success}
                                    text={`感謝 Follow ！❥(^_-)\n有最新動態會提醒您！`}
                                />
                            ),
                        });
                    }
                    // 選擇Del Follow，展示再見信息，此時isFollow為True
                    else {
                        toast.show({
                            placement: 'top',
                            render: () => (
                                <ToastText text={`有緣再見！o(╥﹏╥)o`} />
                            ),
                        });
                    }
                }
            }}>
            <Text style={{color: white}}>
                {isFollow ? 'Del Follow' : 'Follow Us'}
            </Text>
        </TouchableOpacity>
    );
}

// 模擬從服務器返回的數據，以detailRoute傳的id或name去請求服務器返回相關組織的數據
// const clubData = {
//     logo_url:
//         'https://info.umsu.org.mo/storage/affiliate/images/da6f2ec4b5ec3216f9344453f796a97c.jpg',
//     name: '電腦學會',
//     tag: 'club',
//     club_num: 1,
//     // 簡介文字
//     introText: `澳門大學學生會電腦學會是以電腦為主題的學會，希望透過活動提升電腦系同學的歸屬感及團體精神。我們亦歡迎所有不同學系的同學，目的是透過舉辦工作坊、踏上IT第一步等等教授同學不同的電腦知識及認識電腦行業的前景。電競也是我們的主打之一，現時電競遊戲是一個十分熱門的話題，我們透過舉辦大大小小的比賽及交流活動等等，如最近所舉辦的澳大電競日從而推廣電競文化，讓不論是有接觸過電競與否的朋友也可以透過活動來認識電競及享受遊戲的樂趣。`,
//     // 聯繫方式
//     contact: [
//         // type會定死，讓社團在設置個人的時候可以選擇性填寫
//         {
//             type: 'Wechat',
//             num: 'abcd1234',
//         },
//         {
//             type: 'Email',
//             num: 'abcd1234@umac.mo',
//         },
//         {
//             type: 'Phone',
//             num: '12345678',
//         },
//         {
//             type: 'IG',
//             num: 'cpsumsu',
//         },
//         {
//             type: 'Facebook',
//             num: 'cpsumsu',
//         },
//         {
//             type: 'Website',
//             num: 'www.cpsumsu.com',
//         },
//     ],
//     // 背景圖片link
//     bgImgUrl:
//         'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
// };

// 活動，只請求4條
// 距離今天越近越靠前
const event = [
    {
        eventID: 0,
        type: 'activity',
        title: '活動標題可寫在此0',
        // 封面圖片
        coverImgUrl: 'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg',
        // 該活動相關的圖片
        relateImgUrl: [
            'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg',
            'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
            'https://www.cpsumsu.org/image/slideshow/slideshow_p3.jpg',
            'https://www.cpsumsu.org/image/slideshow/%E6%B8%B8%E6%88%B2%E8%A8%AD%E8%A8%88%E5%B7%A5%E4%BD%9C%E5%9D%8A.jpg',
        ],
        startTimeStamp: 1658745797000,
        finishTimeStamp: 1658745797000,
        link: '',
    },
    {
        eventID: 0,
        title: '活動標題可寫在此1',
        // 封面圖片
        coverImgUrl: 'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
        // 該活動相關的圖片
        relateImgUrl: [
            'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg',
            'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
            'https://www.cpsumsu.org/image/slideshow/slideshow_p3.jpg',
            'https://www.cpsumsu.org/image/slideshow/%E6%B8%B8%E6%88%B2%E8%A8%AD%E8%A8%88%E5%B7%A5%E4%BD%9C%E5%9D%8A.jpg',
        ],
        startTimeStamp: 1658745797000,
        finishTimeStamp: 1658745797000,
        link: '',
    },
    {
        eventID: 0,
        title: '活動標題可寫在此2',
        // 封面圖片
        coverImgUrl: 'https://www.cpsumsu.org/image/slideshow/slideshow_p3.jpg',
        // 該活動相關的圖片
        relateImgUrl: [
            'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg',
            'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
            'https://www.cpsumsu.org/image/slideshow/slideshow_p3.jpg',
            'https://www.cpsumsu.org/image/slideshow/%E6%B8%B8%E6%88%B2%E8%A8%AD%E8%A8%88%E5%B7%A5%E4%BD%9C%E5%9D%8A.jpg',
        ],
        startTimeStamp: 1658745797000,
        finishTimeStamp: 1655018688000,
        link: '',
    },
    {
        eventID: 0,
        title: '活動標題可寫在此2',
        // 封面圖片
        coverImgUrl:
            'https://www.cpsumsu.org/image/slideshow/%E6%B8%B8%E6%88%B2%E8%A8%AD%E8%A8%88%E5%B7%A5%E4%BD%9C%E5%9D%8A.jpg',
        // 該活動相關的圖片
        relateImgUrl: [
            'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg',
            'https://www.cpsumsu.org/image/slideshow/slideshow_p2.jpg',
            'https://www.cpsumsu.org/image/slideshow/slideshow_p3.jpg',
            'https://www.cpsumsu.org/image/slideshow/%E6%B8%B8%E6%88%B2%E8%A8%AD%E8%A8%88%E5%B7%A5%E4%BD%9C%E5%9D%8A.jpg',
        ],
        startTimeStamp: 1658745797000,
        finishTimeStamp: 1655018688000,
        link: '',
    },
];

class ClubDetail extends Component {
    state = {
        clubData: undefined,
        eventData: undefined,
        // 訪問該頁的用戶對該組織的Follow狀態
        isFollow: false,
        // 該用戶是否管理員。社團、APP管理員賬號。
        isAdmin: false,
        isLogin: false,
        // 默認背景大圖，默認查看大圖
        imageUrls: ARK_LETTER_IMG,
        showDialog: false,
        isLoading: true,
    };

    constructor(props) {
        super(props);
        let clubData = undefined;
        if (
            !('userInfo' in this.props.RootStore) ||
            !this.props.RootStore.userInfo.isClub
        ) {
            // 獲取上級路由傳遞的參數，得知點擊的club_num
            clubData = this.props.route.params.data;
            // 請求對應社團的info
            this.getData(clubData.club_num);
        }
    }

    // 檢查本地緩存是否已登錄
    componentDidMount() {
        let globalData = this.props.RootStore;
        if (globalData.userInfo.isClub) {
            let clubData = globalData.userInfo.clubData;
            // console.log('setState ClubData', clubData);
            this.setState({clubData, isLoading: false, isAdmin: true});
        }
    }

    // 獲取指定id的社團信息
    async getData(club_num) {
        await axios
            .get(BASE_URI + GET.CLUB_INFO_NUM + club_num)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let clubData = json.content;
                    this.getEventData(club_num);
                    this.setState({clubData, isLoading: false});

                    // 如果是社團賬號登錄，則刷新mobx和緩存的數據
                    if (this.state.isAdmin) {
                        let clubDataUpdate = {
                            isClub: true,
                            clubData,
                        };
                        updateUserInfo(clubDataUpdate);
                        this.props.RootStore.setUserInfo(clubDataUpdate);
                    }
                } else {
                    alert('Warning:', json.message);
                }
            })
            .catch(err => {
                console.error(err);
            });
    }

    // 按組織號碼獲取活動
    async getEventData(club_num) {
        let URL = BASE_URI + GET.EVENT_INFO_CLUB_NUM_P;
        await axios
            .get(URL, {
                params: {
                    club_num,
                    // 獲取最多5條數據
                    num_of_item: 5,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    this.setState({eventData: json.content});
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    }

    // 點擊Follow按鈕響應事件
    handleFollow = () => {
        const {isLogin, showDialog, isFollow} = this.state;
        // 如果沒有登錄，觸發登錄提示
        if (!isLogin) {
            this.setState({showDialog: true});
            return false;
        } else {
            // TODO: 請求數據庫返回是否follow成功
            this.setState({isFollow: !isFollow});
            return true;
        }
    };

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        this.setState({isShow: !this.state.isShow});
    };

    // 下拉刷新組件
    renderRefreshCompo = () => (
        <RefreshControl
            colors={[themeColor]}
            tintColor={themeColor}
            refreshing={this.state.isLoading}
            progressViewOffset={150}
            onRefresh={() => {
                this.setState({isLoading: true});
                this.getData(this.state.clubData.club_num);
            }}
        />
    );

    render() {
        // 解構state數據
        const {clubData, isFollow, isAdmin, isLoading} = this.state;
        let logo_url,
            name,
            tag,
            club_num,
            intro,
            contact = undefined;
        let bgImgUrl = ARK_LETTER_IMG;
        // 解構出“照片”欄的最多4張照片
        let eventImgUrls = [];

        // 已接收clubData
        if (clubData != undefined) {
            if (
                'club_photos_list' in clubData &&
                clubData.club_photos_list.length > 0
            ) {
                // 背景圖選擇數組第一張
                bgImgUrl = clubData.club_photos_list[0];
                clubData.club_photos_list.map(item => {
                    eventImgUrls.push(item.coverImgUrl);
                });
            }
            logo_url = clubData.logo_url;
            name = clubData.name;
            tag = clubData.tag;
            club_num = clubData.club_num;
            intro = clubData.intro;
            contact = clubData.contact;
        }

        // 渲染Header前景，社團LOGO，返回按鈕
        renderForeground = () => {
            return (
                <TouchableOpacity
                    style={{flex: 1, position: 'relative'}}
                    onPress={() => {
                        // 查看背景圖片大圖
                        if (
                            'club_photos_list' in clubData &&
                            clubData.club_photos_list.length > 0
                        ) {
                            this.setState({
                                imageUrls: clubData.club_photos_list,
                            });
                        } else {
                            this.setState({imageUrls: bgImgUrl});
                        }
                        this.refs.imageScrollViewer.handleOpenImage(0);
                    }}
                    activeOpacity={1}>
                    {/* 返回按鈕 */}
                    {!isAdmin && (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => this.props.navigation.goBack()}
                            style={{
                                position: 'absolute',
                                top: pxToDp(65),
                                left: pxToDp(10),
                            }}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={white}
                            />
                        </TouchableOpacity>
                    )}
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
                                    this.props.navigation.navigate(
                                        'ClubSetting',
                                        {
                                            refresh: this.getData.bind(
                                                this,
                                                clubData.club_num,
                                            ), // 傳遞回調函數
                                            test: true,
                                        },
                                    )
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
                        style={styles.clubLogoWhiteSpace}
                    />
                    {/* 社團LOGO */}
                    <TouchableWithoutFeedback
                        onPress={() => {
                            this.setState({imageUrls: logo_url});
                            this.refs.imageScrollViewer.tiggerModal();
                        }}>
                        <View style={styles.clubLogoContainer}>
                            <FastImage
                                source={{
                                    uri: logo_url,
                                    cache: FastImage.cacheControl.web,
                                }}
                                style={{width: '100%', height: '100%'}}
                                resizeMode={FastImage.resizeMode.contain}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            );
        };

        // 渲染頁面主要內容
        renderMainContent = () => {
            const {eventData, clubData} = this.state;
            return (
                <View style={{backgroundColor: bg_color}}>
                    {/* 1.0 社團基本資料 */}
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
                            {name}
                        </Text>
                        {/* 社團ID */}
                        <Text
                            style={{
                                color: black.third,
                                fontSize: pxToDp(13),
                                marginVertical: pxToDp(2),
                            }}>
                            @
                            {'000'.substr(club_num.toString().length) +
                                club_num}
                        </Text>
                        {/* 社團分類 */}
                        <Text
                            style={{
                                color: themeColor,
                                fontSize: pxToDp(15),
                            }}>
                            #{clubTagMap(tag)}
                        </Text>
                    </View>

                    {/* Follow按鈕 帶Toast */}
                    {!isAdmin && (
                        <RenderFollowButton
                            isFollow={isFollow}
                            // 傳遞修改this.state.isFollow方法
                            handleFollow={this.handleFollow}
                        />
                    )}

                    {/* 2.0 照片 */}
                    <View style={styles.cardContainer}>
                        {/* 卡片標題 */}
                        <TouchableOpacity
                            style={styles.cardTitleContainer}
                            activeOpacity={0.8}
                            onPress={() => {
                                if (
                                    'club_photos_list' in clubData &&
                                    clubData.club_photos_list.length > 0
                                ) {
                                    this.setState({
                                        imageUrls: clubData.club_photos_list,
                                    });
                                    this.refs.imageScrollViewer.tiggerModal();
                                }
                            }}>
                            <Text style={styles.cardTitleText}>照片</Text>
                            <Ionicons
                                name="chevron-forward-outline"
                                size={pxToDp(14)}
                                color={COLOR_DIY.black.main}></Ionicons>
                        </TouchableOpacity>
                        {/* 卡片內容 */}
                        {'club_photos_list' in clubData &&
                            clubData.club_photos_list.length > 0 && (
                                <View
                                    style={{
                                        justifyContent: 'space-around',
                                        alignItems: 'flex-start',
                                        flexDirection: 'row',
                                        margin: pxToDp(10),
                                        marginTop: pxToDp(0),
                                    }}>
                                    {/* 圖片相冊 最多4張 */}
                                    {clubData.club_photos_list.map(
                                        (item, index) => {
                                            if (index != 0) {
                                                return (
                                                    <TouchableOpacity
                                                        style={
                                                            styles.imageContainer
                                                        }
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            this.setState({
                                                                imageUrls:
                                                                    clubData.club_photos_list,
                                                            });
                                                            this.refs.imageScrollViewer.handleOpenImage(
                                                                index,
                                                            );
                                                        }}>
                                                        <FastImage
                                                            source={{
                                                                uri: item,
                                                                cache: FastImage
                                                                    .cacheControl
                                                                    .web,
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                            }}
                                                        />
                                                    </TouchableOpacity>
                                                );
                                            }
                                        },
                                    )}
                                </View>
                            )}
                    </View>

                    {/* 3.0 簡介 */}
                    <TouchableOpacity
                        style={styles.cardContainer}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (intro != undefined && intro.length > 0) {
                                this.tiggerModalBottom();
                            }
                        }}>
                        {/* 卡片標題 */}
                        <View style={{...styles.cardTitleContainer}}>
                            <Text style={styles.cardTitleText}>簡介</Text>
                            <Ionicons
                                name="chevron-forward-outline"
                                size={pxToDp(14)}
                                color={COLOR_DIY.black.main}></Ionicons>
                        </View>
                        {/* 卡片內容 */}
                        {intro != undefined && intro.length > 0 && (
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
                                    numberOfLines={5}
                                    style={{color: black.second}}>
                                    {intro}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* 4.0 聯繫方式 */}
                    <View style={styles.cardContainer}>
                        {/* 卡片標題 */}
                        <TouchableOpacity
                            style={styles.cardTitleContainer}
                            activeOpacity={0.7}
                            onPress={() =>
                                Alert.alert('聯繫方式可以自行複製~')
                            }>
                            <Text style={styles.cardTitleText}>聯繫方式</Text>
                            <Ionicons
                                name="chevron-forward-outline"
                                size={pxToDp(14)}
                                color={COLOR_DIY.black.main}></Ionicons>
                        </TouchableOpacity>
                        {/* 卡片內容 */}
                        {contact != undefined && contact.length > 0 && (
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
                                    {contact.map(item => {
                                        if (item.num.length > 0) {
                                            return (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                    }}>
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
                                        }
                                    })}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* 5.0 舉辦的活動 */}
                    {eventData != undefined && eventData.length > 0 && (
                        <FlatList
                            numColumns={2}
                            columnWrapperStyle={{
                                justifyContent: 'center',
                            }}
                            data={eventData}
                            renderItem={({item}) => {
                                return (
                                    <EventCard
                                        data={item}
                                        style={{
                                            marginVertical: pxToDp(8),
                                            marginHorizontal: pxToDp(10),
                                        }}
                                    />
                                );
                            }}
                            scrollEnabled={false}
                            // 在所有項目的末尾渲染
                            ListFooterComponent={() =>
                                eventData.length > 4 && (
                                    <TouchableOpacity
                                        style={styles.checkMoreButton}
                                        activeOpacity={0.8}
                                        onPress={() =>
                                            this.props.navigation.navigate(
                                                'AllEvents',
                                                {clubData},
                                            )
                                        }>
                                        <Text style={{color: white}}>
                                            查看全部
                                        </Text>
                                    </TouchableOpacity>
                                )
                            }
                        />
                    )}

                    <View
                        style={{height: pxToDp(50), backgroundColor: bg_color}}
                    />
                </View>
            );
        };

        return (
            <View style={{flex: 1, backgroundColor: bg_color}}>
                <StatusBar
                    barStyle="light-content"
                    backgroundColor={'transparent'}
                    translucent={true}
                />

                {/* 渲染主要內容 */}
                {!isLoading && clubData ? (
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
                                    uri: bgImgUrl,
                                    cache: FastImage.cacheControl.web,
                                }}
                                style={{width: '100%', height: '100%'}}
                            />
                        )}
                        // 前景固定內容
                        renderTouchableFixedForeground={renderForeground}
                        showsVerticalScrollIndicator={false}
                        refreshControl={this.renderRefreshCompo()}>
                        {/* 主要頁面內容 */}
                        {renderMainContent()}
                    </ImageHeaderScrollView>
                ) : (
                    // Loading屏幕
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: bg_color,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                        <Loading />
                    </View>
                )}

                {/* 彈出層展示圖片查看器 */}
                <ImageScrollViewer
                    ref={'imageScrollViewer'}
                    imageUrls={this.state.imageUrls}
                    // 父組件調用 this.refs.imageScrollViewer.tiggerModal(); 打開圖層
                    // 父組件調用 this.refs.imageScrollViewer.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
                />

                {/* 彈出層提示 */}
                <DialogDIY
                    showDialog={this.state.showDialog}
                    text={
                        'Follow社團可以接收最新消息，需要登錄操作，現在去登錄嗎？'
                    }
                    handleConfirm={() => {
                        this.setState({showDialog: false});
                        this.props.navigation.navigate('MeTabbar');
                    }}
                    handleCancel={() => this.setState({showDialog: false})}
                />

                {/* 展示簡介的Modal */}
                {this.state.isShow && (
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
                                簡介
                            </Text>
                            <ScrollView style={{marginTop: pxToDp(5)}}>
                                <Text
                                    style={{
                                        color: black.main,
                                        fontSize: pxToDp(16),
                                    }}>
                                    {intro}
                                </Text>
                            </ScrollView>
                        </View>
                    </ModalBottom>
                )}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLOR_DIY.white,
        borderRadius: pxToDp(10),
        marginHorizontal: pxToDp(15),
        // 增加陰影
        marginBottom: pxToDp(8),
        marginTop: pxToDp(10),
        ...COLOR_DIY.viewShadow,
    },
    cardTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: pxToDp(10),
        paddingHorizontal: pxToDp(10),
    },
    cardTitleText: {
        fontSize: pxToDp(12),
        color: black.main,
        fontWeight: 'bold',
    },
    clubLogoContainer: {
        position: 'absolute',
        bottom: pxToDp(5),
        alignSelf: 'center',
        width: pxToDp(CLUB_LOGO_SIZE),
        height: pxToDp(CLUB_LOGO_SIZE),
        borderRadius: 50,
        overflow: 'hidden',
        ...COLOR_DIY.viewShadow,
        backgroundColor: bg_color,
    },
    clubLogoWhiteSpace: {
        bottom: 0,
        width: '100%',
        height: pxToDp(20),
        backgroundColor: bg_color,
        position: 'absolute',
        borderTopLeftRadius: pxToDp(15),
        borderTopRightRadius: pxToDp(15),
    },
    imageContainer: {
        width: pxToDp(CLUB_IMAGE_WIDTH),
        height: pxToDp(CLUB_IMAGE_HEIGHT),
        borderRadius: pxToDp(5),
        overflow: 'hidden',
        ...viewShadow,
    },
    checkMoreButton: {
        marginTop: pxToDp(5),
        alignSelf: 'center',
        padding: pxToDp(10),
        borderRadius: pxToDp(15),
        backgroundColor: themeColor,
    },
});

export default inject('RootStore')(ClubDetail);
