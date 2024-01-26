import React, { Component, useState } from 'react';
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
    Linking,
} from 'react-native';

import { COLOR_DIY, ToastText, uiStyle, } from '../../../../utils/uiMap';
import { clubTagMap } from '../../../../utils/clubMap';
import { setAPPInfo } from '../../../../utils/storageKits';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import {
    BASE_URI,
    BASE_HOST,
    GET,
    ARK_LETTER_IMG,
    POST,
    MAIL,
} from '../../../../utils/pathMap';
import HyperlinkText from '../../../../components/HyperlinkText';
import { handleLogout } from '../../../../utils/storageKits';
import packageInfo from '../../../../../package.json';

import EventCard from '../components/EventCard';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import ModalBottom from '../../../../components/ModalBottom';
import DialogDIY from '../../../../components/DialogDIY';
import Loading from '../../../../components/Loading';
import { updateUserInfo } from '../../../../utils/storageKits';
import { versionStringCompare } from '../../../../utils/versionKits';
import { trigger } from '../../../../utils/trigger';

import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import {
    ImageHeaderScrollView,
    TriggeringView,
} from 'react-native-image-header-scroll-view';
import FastImage from 'react-native-fast-image';
import { useToast } from 'native-base';
import { inject } from 'mobx-react';
import axios from 'axios';
import Toast, { DURATION } from 'react-native-easy-toast';
import { scale } from 'react-native-size-matters';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 解構uiMap的數據
const { bg_color, white, black, themeColor, viewShadow } = COLOR_DIY;

const { width: PAGE_WIDTH } = Dimensions.get('window');
const { height: PAGE_HEIGHT } = Dimensions.get('window');
const CLUB_LOGO_SIZE = scale(80);
const CLUB_IMAGE_WIDTH = scale(66);
const CLUB_IMAGE_HEIGHT = scale(55);

class ClubDetail extends Component {
    imageScrollViewer = React.createRef(null);

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
        reportChoice: false,
        isLoading: true,
        toastColor: themeColor,
    };

    // 由ClubPage跳轉
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

    componentDidMount() {
        let globalData = this.props.RootStore;
        // 管理員賬號登錄
        if (globalData.userInfo && globalData.userInfo.isClub) {
            let clubData = globalData.userInfo.clubData;
            this.setState({ isAdmin: true });
            this.getData(clubData.club_num);
            this.getAppData();
        }
        // 已登錄學生賬號
        if (globalData.userInfo && globalData.userInfo.stdData) {
            this.setState({ isLogin: true });
        }
    }

    componentWillUnmount() {
        FastImage.clearMemoryCache();
    }

    // 獲取指定id的社團信息
    async getData(club_num) {
        await axios
            .get(BASE_URI + GET.CLUB_INFO_NUM + club_num)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let clubData = json.content;
                    clubData.logo_url = BASE_HOST + clubData.logo_url;
                    if (
                        clubData.club_photos_list &&
                        clubData.club_photos_list.length > 0
                    ) {
                        let addHostArr = [];
                        clubData.club_photos_list.map(itm => {
                            addHostArr.push(BASE_HOST + itm);
                        });
                        clubData.club_photos_list = addHostArr;
                    }
                    this.setState({
                        clubData,
                        isLoading: false,
                        isFollow: clubData.isFollow,
                    });
                    this.getEventData(club_num);

                    // 如果是社團賬號登錄，則刷新mobx和緩存的數據
                    if (this.state.isAdmin) {
                        let clubDataUpdate = {
                            isClub: true,
                            clubData,
                        };
                        updateUserInfo(clubDataUpdate);
                        this.props.RootStore.setUserInfo(clubDataUpdate);
                        logToFirebase('clubLogin', { club: clubData.name });
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
                    let eventData = json.content;
                    let addHostArr = [];
                    // 圖片類型服務器返回相對路徑，請記住加上域名
                    if (eventData.length > 0) {
                        eventData.map(itm => {
                            itm.cover_image_url =
                                BASE_HOST + itm.cover_image_url;
                        });
                    }
                    this.setState({ eventData });
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    }

    async postAddFollow(club_num) {
        let URL = BASE_URI + POST.ADD_FOLLOW_CLUB;
        let data = new FormData();
        data.append('club', club_num);
        await axios
            .post(URL, data, {
                headers: {
                    'Content-Type': `multipart/form-data`,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    // 關注成功
                    this.setState({
                        toastColor: COLOR_DIY.success,
                        isFollow: true,
                    });
                    this.toast.show(
                        `感謝 Follow ！❥(^_-)\n有最新動態會提醒您！`,
                        2000,
                    );
                } else if (json.code == '400') {
                    // json.code=="400" 已經關注
                    this.setState({ toastColor: COLOR_DIY.warning });
                    this.toast.show(`您已經關注過了~`, 2000);
                }
            })
            .catch(err => {
                console.log('err', err);
                alert('錯誤', err.message);
            });
    }

    async postDelFollow(club_num) {
        let URL = BASE_URI + POST.DEL_FOLLOW_CLUB;
        let data = new FormData();
        data.append('club', club_num);
        await axios
            .post(URL, data, {
                headers: {
                    'Content-Type': `multipart/form-data`,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    // del follow成功
                    this.setState({
                        toastColor: themeColor,
                        isFollow: false,
                    });
                    this.toast.show(`有緣再見！o(╥﹏╥)o`, 2000);
                }
            })
            .catch(err => {
                console.log('err', err);
                alert('錯誤', err.message);
            });
    }

    getAppData = async () => {
        let URL = BASE_URI + GET.APP_INFO;
        await axios
            .get(URL)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    this.checkInfo(json.content);
                }
            })
            .catch(err => {
                // console.log('err', err);
            });
    };

    checkInfo = async (serverInfo, isLogin) => {
        try {
            const strAppInfo = await AsyncStorage.getItem('appInfo');
            if (strAppInfo == null) {
                setAPPInfo(serverInfo);
            } else {
                const appInfo = strAppInfo ? JSON.parse(strAppInfo) : {};
                // 服務器API更新，需要重新登錄
                if (
                    appInfo.API_version &&
                    appInfo.API_version != serverInfo.API_version
                ) {
                    alert('服務器API更新，需要重新登錄');
                    handleLogout();
                } else {
                    setAPPInfo(serverInfo);
                }
            }
            // APP版本滯後，提示下載新版本
            if (
                versionStringCompare(
                    packageInfo.version,
                    serverInfo.app_version,
                ) == -1
            ) {
                this.props.route.params.setLock(serverInfo.app_version);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // 點擊Follow按鈕響應事件
    handleFollow = () => {
        const { isFollow, isLogin, showDialog, clubData } = this.state;
        let club_num = clubData.club_num;
        // 如果沒有登錄，觸發登錄提示
        if (!isLogin) {
            this.setState({ showDialog: true });
        } else {
            // 未follow，addFollow
            if (!isFollow) {
                this.postAddFollow(club_num);
            } else {
                this.postDelFollow(club_num);
            }
        }
        trigger();
    };

    renderFollowButton = () => {
        const { isFollow } = this.state;
        return (
            <TouchableOpacity
                style={{
                    ...styles.followButton,
                    backgroundColor: isFollow ? black.third : themeColor,
                }}
                activeOpacity={0.8}
                onPress={this.handleFollow}>
                <Text style={{ ...uiStyle.defaultText, color: white }}>
                    {isFollow ? 'Del Follow' : 'Follow'}
                </Text>
            </TouchableOpacity>
        );
    };

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        this.setState({ isShow: !this.state.isShow });
    };

    // 下拉刷新組件
    renderRefreshCompo = () => (
        <RefreshControl
            colors={[themeColor]}
            tintColor={themeColor}
            refreshing={this.state.isLoading}
            progressViewOffset={scale(150)}
            onRefresh={() => {
                this.setState({ isLoading: true });
                this.getData(this.state.clubData.club_num);
            }}
        />
    );

    // 渲染卡片標題
    renderCardTitle(title) {
        return (
            <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitleText}>{title}</Text>
            </View>
        );
    }

    render() {
        // 解構state數據
        const { clubData, isFollow, isAdmin, isLoading, imageUrls, isLogin } =
            this.state;
        let logo_url,
            name,
            tag,
            club_num,
            intro,
            contact = undefined;
        let bgImgUrl = ARK_LETTER_IMG;

        // 已接收clubData
        if (clubData != undefined) {
            if (
                'club_photos_list' in clubData &&
                clubData.club_photos_list.length > 0
            ) {
                // 背景圖選擇數組第一張
                bgImgUrl = clubData.club_photos_list[0];
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
                    style={{ flex: 1, position: 'relative' }}
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
                            this.setState({ imageUrls: bgImgUrl });
                        }
                        this.imageScrollViewer.current.handleOpenImage(0);
                    }}
                    activeOpacity={1}>
                    {/* 返回按鈕 */}
                    {!isAdmin ? (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                trigger();
                                this.props.navigation.goBack()
                            }}
                            style={{
                                position: 'absolute',
                                top: scale(65),
                                left: scale(15),
                                zIndex: 999
                            }}>
                            <Ionicons
                                name="chevron-back-circle"
                                size={scale(35)}
                                color={white}
                            />
                        </TouchableOpacity>
                    ) : null}

                    {/* 編輯資料按鈕 只有管理員可見 */}
                    {/* {isAdmin ? (
                        <View
                            style={{
                                position: 'absolute',
                                top: scale(65),
                                right: scale(15),
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
                                            ),
                                        },
                                    )
                                }>
                                <Ionicons
                                    name="settings-outline"
                                    size={scale(25)}
                                    color={white}
                                />
                            </TouchableOpacity>
                        </View>
                    ) : null} */}
                    {/* // 公告入口
                    <View
                        style={{
                            position: 'absolute',
                            top: scale(65),
                            right: scale(15),
                        }}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                this.props.navigation.navigate(
                                    'ChatDetail',
                                    {get: 'club', id: clubData.club_num},
                                );
                            }}>
                            <Feather
                                name="message-circle"
                                size={scale(25)}
                                color={white}
                            />
                        </TouchableOpacity>
                    </View> */}

                    {/* 白邊，凸顯立體感 */}
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.clubLogoWhiteSpace}
                    />
                    {/* 社團LOGO */}
                    <TouchableWithoutFeedback
                        onPress={() => {
                            trigger();
                            this.setState({ imageUrls: logo_url });
                            this.imageScrollViewer.current.tiggerModal();
                        }}>
                        <View style={styles.clubLogoContainer}>
                            <FastImage
                                source={{
                                    uri: logo_url,
                                    // cache: FastImage.cacheControl.web,
                                }}
                                style={{ backgroundColor: COLOR_DIY.trueWhite, width: '100%', height: '100%' }}
                                resizeMode={FastImage.resizeMode.contain}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            );
        };

        // 渲染頁面主要內容
        renderMainContent = () => {
            const { eventData } = this.state;
            // 是否需要展示聯繫信息
            let showContact = false;
            if (contact && contact.length > 0) {
                for (let i = 0; i < contact.length; i++) {
                    if (contact[i].num.length > 0) {
                        showContact = true;
                        break;
                    }
                }
            }
            return (
                <View style={{ backgroundColor: bg_color }}>
                    {/* 社團基本資料 */}
                    <View style={{ alignItems: 'center' }}>
                        {/* 建議使用社團名的簡稱 */}
                        <Text style={styles.clubNameText}>{name}</Text>
                        {/* 社團ID */}
                        {/* <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.third,
                                fontSize: scale(13),
                                marginVertical: scale(2),
                            }}>
                            {'@' +
                                '000'.substr(club_num.toString().length) +
                                club_num}
                        </Text> */}
                        {/* 社團分類 */}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: themeColor,
                                fontSize: scale(15),
                            }}>
                            {'#' + clubTagMap(tag)}
                        </Text>

                        {/* 編輯資料按鈕 只有管理員可見 */}
                        {isAdmin ? (
                            <>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() =>
                                        this.props.navigation.navigate(
                                            'ClubSetting',
                                            {
                                                refresh: this.getData.bind(
                                                    this,
                                                    clubData.club_num,
                                                ),
                                            },
                                        )
                                    }
                                    style={{
                                        flexDirection: 'row', alignItems: 'center',
                                        backgroundColor: themeColor, borderRadius: scale(15), padding: scale(10),
                                        marginVertical: scale(10)
                                    }}>
                                    <Text style={{ ...uiStyle.defaultText, color: white, fontSize: scale(20) }}>賬號設置&新增活動 </Text>
                                    <Ionicons
                                        name="settings-outline"
                                        size={scale(25)}
                                        color={white}
                                    />
                                </TouchableOpacity>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: COLOR_DIY.unread }}>Update組織資料&發佈新資訊請點我！↑</Text>
                                </View>
                            </>
                        ) : null}
                    </View>

                    {/* Follow按鈕 */}
                    {/* {!isAdmin && false ? this.renderFollowButton() : null} */}

                    {/* 照片 */}
                    {clubData.club_photos_list &&
                        clubData.club_photos_list.length > 1 ? (
                        <View style={styles.cardContainer}>
                            {/* 卡片標題 */}
                            {this.renderCardTitle('照片')}
                            {/* 卡片內容 */}
                            <View
                                style={{
                                    justifyContent: 'space-around',
                                    alignItems: 'flex-start',
                                    flexDirection: 'row',
                                    margin: scale(10),
                                    marginTop: scale(0),
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
                                                        this.imageScrollViewer.current.handleOpenImage(
                                                            index,
                                                        );
                                                    }}>
                                                    <FastImage
                                                        source={{
                                                            uri: item,
                                                            // cache: FastImage
                                                            //     .cacheControl
                                                            //     .web,
                                                        }}
                                                        style={{
                                                            backgroundColor: COLOR_DIY.trueWhite,
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
                        </View>
                    ) : null}

                    {/* 聯繫方式 */}
                    <View style={styles.cardContainer}>
                        {/* 卡片標題 */}
                        {this.renderCardTitle('聯繫方式')}
                        {/* 卡片內容 */}
                        {showContact ? (
                            <View
                                style={{
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    flexDirection: 'row',
                                    margin: scale(10),
                                    marginTop: scale(0),
                                }}>
                                {/* 聯繫方式 */}
                                <View>
                                    {contact.map(item => {
                                        if (item.num.length > 0) {
                                            return (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        marginBottom: scale(3),
                                                    }}>
                                                    {/* 聯繫Type */}
                                                    <View
                                                        style={{ width: '22%' }}>
                                                        <Text
                                                            style={{
                                                                ...uiStyle.defaultText,
                                                                color: black.second,
                                                                fontSize: scale(13),
                                                            }}>
                                                            {item.type + ': '}
                                                        </Text>
                                                    </View>
                                                    {/* 相關號碼、id */}
                                                    <View
                                                        style={{ width: '78%' }}>
                                                        <HyperlinkText
                                                            linkStyle={{ color: COLOR_DIY.themeColor, }}
                                                            navigation={this.props.navigation}>
                                                            <Text style={{
                                                                ...uiStyle.defaultText,
                                                                color: black.third,
                                                                fontSize: scale(12.5),
                                                            }} selectable={true}>
                                                                {item.num}
                                                            </Text>
                                                        </HyperlinkText>
                                                    </View>
                                                </View>
                                            );
                                        }
                                    })}
                                </View>
                            </View>
                        ) : (
                            <View
                                style={{
                                    marginLeft: scale(10),
                                    marginBottom: scale(10),
                                }}>
                                <Text style={{ ...uiStyle.defaultText, color: black.third }}>
                                    這個組織還未留下聯繫方式~
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* 簡介 */}
                    {intro && intro.length > 0 ? (
                        <View style={styles.cardContainer}>
                            {/* 卡片標題 */}
                            {this.renderCardTitle('簡介')}
                            {/* 卡片內容 */}
                            <View
                                style={{
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    flexDirection: 'row',
                                    margin: scale(10),
                                    marginTop: scale(0),
                                }}>
                                {/* 服務圖標與文字 */}
                                <HyperlinkText
                                    linkStyle={{ color: themeColor }}
                                    navigation={this.props.navigation}>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            color: black.second,
                                            fontSize: scale(13),
                                        }}
                                        selectable>
                                        {intro}
                                    </Text>
                                </HyperlinkText>
                            </View>
                        </View>
                    ) : null}

                    {isAdmin && eventData != undefined && eventData.length > 0 && (
                        <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: COLOR_DIY.unread, alignSelf: 'center' }}>Update活動資料請進入具體活動頁內修改！↓</Text>
                    )}

                    {/* 舉辦的活動 */}
                    {eventData != undefined && eventData.length > 0 ? (
                        <FlatList
                            numColumns={2}
                            columnWrapperStyle={{
                                justifyContent: 'center',
                            }}
                            data={eventData}
                            renderItem={({ item, index }) => {
                                if (index != 4) {
                                    return <EventCard data={item} />;
                                }
                            }}
                            scrollEnabled={false}
                            // 在所有項目的末尾渲染
                            ListFooterComponent={() =>
                                eventData.length > 4 && (
                                    <TouchableOpacity
                                        style={styles.checkMoreButton}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            trigger();
                                            this.props.navigation.navigate(
                                                'AllEvents',
                                                { clubData },
                                            );
                                        }}>
                                        <Text style={{ ...uiStyle.defaultText, color: white }}>
                                            查看全部
                                        </Text>
                                    </TouchableOpacity>
                                )
                            }
                        />
                    ) : null}

                    {/* 舉報活動 */}
                    <TouchableOpacity
                        style={{
                            alignSelf: 'center',
                            marginTop: scale(20),
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        activeOpacity={0.8}
                        onPress={() => {
                            this.setState({ reportChoice: true });
                        }}>
                        <EvilIcons
                            name="exclamation"
                            size={scale(20)}
                            color={black.third}
                        />
                        <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(13) }}>
                            向管理員舉報該組織
                        </Text>
                    </TouchableOpacity>

                    <View
                        style={{ height: scale(400), backgroundColor: bg_color }}
                    />
                    <Text style={{ ...uiStyle.defaultText, color: black.third, alignSelf: 'center', }}>快催催這個組織多發活動｡:.ﾟヽ(*´∀`)ﾉﾟ.:｡</Text>
                </View>
            );
        };

        return (
            <View style={{ flex: 1, backgroundColor: bg_color }}>
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
                        minHeight={scale(140)}
                        // 打開時的高度
                        maxHeight={scale(230)}
                        // 背景內容
                        renderHeader={() => (
                            <FastImage
                                source={{
                                    uri: bgImgUrl,
                                    // cache: FastImage.cacheControl.web,
                                }}
                                style={{ backgroundColor: COLOR_DIY.trueWhite, width: '100%', height: '100%' }}
                            />
                        )}
                        // 前景固定內容
                        renderTouchableFixedForeground={renderForeground}
                        showsVerticalScrollIndicator={false}
                        refreshControl={this.renderRefreshCompo()}
                        alwaysBounceHorizontal={false}
                    // bounces={false}
                    >
                        {/* 渲染主要頁面內容 */}
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
                    ref={this.imageScrollViewer}
                    imageUrls={imageUrls}
                // 父組件調用 this.imageScrollViewer.current.tiggerModal(); 打開圖層
                // 父組件調用 this.imageScrollViewer.current.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
                />

                {/* 彈出層提示 */}
                <DialogDIY
                    showDialog={this.state.showDialog}
                    text={'登錄後能Follow社團和接收最新消息，現在去登錄嗎？'}
                    handleConfirm={() => {
                        this.setState({ showDialog: false });
                        this.props.navigation.navigate('MeTabbar');
                    }}
                    handleCancel={() => this.setState({ showDialog: false })}
                />
                <DialogDIY
                    showDialog={this.state.reportChoice}
                    text={'請在郵件中說明需舉報組織、舉報的原因。'}
                    handleConfirm={() => {
                        Linking.openURL('mailto:' + MAIL);
                        this.setState({ reportChoice: false });
                    }}
                    handleCancel={() => this.setState({ reportChoice: false })}
                />

                {/* 展示簡介的Modal */}
                {this.state.isShow && (
                    <ModalBottom cancel={this.tiggerModalBottom}>
                        <View
                            style={{
                                padding: scale(20),
                                height: PAGE_HEIGHT * 0.7,
                            }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: black.third,
                                    fontSize: scale(13),
                                }}>
                                簡介
                            </Text>
                            <ScrollView style={{ marginTop: scale(5) }}>
                                <HyperlinkText
                                    linkStyle={{ color: themeColor }}
                                    navigation={this.props.navigation}
                                    beforeJump={this.tiggerModalBottom}>
                                    <Text style={{
                                        ...uiStyle.defaultText,
                                        color: black.main,
                                        fontSize: scale(16),
                                    }} selectable>
                                        {intro}
                                    </Text>
                                </HyperlinkText>
                            </ScrollView>
                        </View>
                    </ModalBottom>
                )}

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{ color: white }}
                    style={{
                        backgroundColor: this.state.toastColor,
                        borderRadius: scale(10),
                    }}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLOR_DIY.white,
        borderRadius: scale(10),
        marginHorizontal: scale(15),
        // 增加陰影
        marginBottom: scale(8),
        marginTop: scale(10),
        // ...COLOR_DIY.viewShadow,
    },
    cardTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: scale(10),
        paddingHorizontal: scale(10),
    },
    cardTitleText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        color: themeColor,
        fontWeight: 'bold',
    },
    clubLogoContainer: {
        position: 'absolute',
        bottom: scale(5),
        alignSelf: 'center',
        width: scale(CLUB_LOGO_SIZE),
        height: scale(CLUB_LOGO_SIZE),
        borderRadius: scale(50),
        overflow: 'hidden',
        ...COLOR_DIY.viewShadow,
        backgroundColor: white,
    },
    clubLogoWhiteSpace: {
        bottom: 0,
        width: '100%',
        height: scale(20),
        backgroundColor: bg_color,
        position: 'absolute',
        borderTopLeftRadius: scale(15),
        borderTopRightRadius: scale(15),
    },
    clubNameText: {
        ...uiStyle.defaultText,
        color: black.main,
        fontSize: scale(20),
        fontWeight: '500',
        marginTop: scale(5),
        alignSelf: 'center',
    },
    imageContainer: {
        width: CLUB_IMAGE_WIDTH,
        height: CLUB_IMAGE_HEIGHT,
        borderRadius: scale(5),
        overflow: 'hidden',
        ...viewShadow,
    },
    checkMoreButton: {
        marginTop: scale(5),
        alignSelf: 'center',
        padding: scale(10),
        borderRadius: scale(15),
        backgroundColor: themeColor,
    },
    followButton: {
        marginTop: scale(5),
        alignSelf: 'center',
        padding: scale(10),
        borderRadius: scale(12),
    },
});

export default inject('RootStore')(ClubDetail);
