import React, { Component } from 'react';
import {
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    RefreshControl,
    VirtualizedList,
    TouchableWithoutFeedback,
    Platform,
    Linking,
    Alert,
} from 'react-native';

// 本地工具
import { COLOR_DIY, uiStyle, VERSION_EMOJI } from '../../../utils/uiMap';
import {
    UM_WHOLE,
    WHAT_2_REG,
    NEW_SCZN,
    UM_MAP,
    GITHUB_DONATE,
    BASE_HOST,
    BASE_URI,
    GET,
    addHost,
    APPSTORE_URL,
} from '../../../utils/pathMap';
import EventPage from '../news/EventPage.js';
import ModalBottom from '../../../components/ModalBottom';
import { setAPPInfo, handleLogout } from '../../../utils/storageKits';
import { versionStringCompare } from '../../../utils/versionKits';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import packageInfo from '../../../../package.json';
import { UMCalendar } from '../../../static/UMCalendar/UMCalendar';
import HomeCard from './components/HomeCard';

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Interactable from 'react-native-interactable';
import { FlatGrid } from 'react-native-super-grid';
import { inject } from 'mobx-react';
import Toast from 'react-native-easy-toast';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ScaledSheet, scale } from 'react-native-size-matters';
import FastImage from 'react-native-fast-image';
import moment from 'moment';
import { screenWidth } from '../../../utils/stylesKits';

const { white, bg_color, black, themeColor, themeColorLight, themeColorUltraLight, viewShadow } = COLOR_DIY;

const getItem = (data, index) => {
    // data為VirtualizedList設置的data，index為當前渲染到的下標
    return data[index];
};

// 返回數據數組的長度
const getItemCount = data => {
    return data.length;
};

// 定義可使用icon，注意大小寫
const iconTypes = {
    ionicons: 'ionicons',
    materialCommunityIcons: 'MaterialCommunityIcons',
    img: 'img',
};

const cal = UMCalendar;
const toastTextArr = [
    `ARK ALL全力加載中!!! (>ω･* )ﾉ`,
    `點擊頂部校曆看看最近有什麼假期~ ヾ(ｏ･ω･)ﾉ`,
    `多試試底部的功能頁有無驚喜更新~ ( • ̀ω•́ )✧`,
    `ARK ALL為愛發電ing... (*/ω＼*)`,
    `快喊上你心愛的社團進駐ARK!!! ヾ(❀^ω^)ﾉﾞ`,
    `在關於頁找到我們的郵箱!!! (~o￣3￣)~ `,
    `到底什麼才是ARK??? ∠( °ω°)／ `,
    `今天也要加油!!! UMer!!! ＼\٩('ω')و/／`,
    `快把ARK介紹給學弟學妹學長學姐 ✧⁺⸜(●˙▾˙●)⸝⁺✧ `,
    `今天你更新ARK了嗎? (｡◝ᴗ◜｡)`,
    `澳大資訊一次看完!!! ヽ(^ω^)ﾉ  `,
    `快試試看校園巴士!!! (ﾟωﾟ)ﾉ☆ `,
    `快試試看ARK找課!!! (*￣3￣)╭ `,
    `快試試看ARK Wiki!!! (*￣3￣)╭ `,
    `多想從前就有Wiki... (ಥ_ಥ)`,
    `又是選不上課的一天... (ಥ_ಥ) `,
    `今天會下雨嗎 (￣.￣)`,
    `我覺得和你挺有緣的，來App Store給個好評吧~\n٩(๑>◡<๑)۶ `,
    `快去進駐組織頁看看有無你愛的社團!!! (oﾟ▽ﾟ)o  `,
    `你在這裡刷新多少次了??? (▼へ▼メ)`,
    `開發者這麼努力，不向朋友推薦一下ARK嗎...\n(T ^ T) `,
    `朝著UMer人手一個ARK的目標努力著... ￣▽￣`,
    `想來開發/學習? 歡迎聯繫我們!!! (*￣3￣)╭ `,
    `再刷新我就累了... ㄟ( ▔, ▔ )ㄏ `,
];

class HomeScreen extends Component {
    constructor(props) {
        super(props)

        this.state = {
            // 快捷功能入口
            functionArray: [
                {
                    icon_name: 'bus',
                    icon_type: iconTypes.ionicons,
                    function_name: '校園巴士',
                    func: () => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.props.navigation.navigate('Bus');
                    },
                },
                {
                    icon_name: 'coffee',
                    icon_type: iconTypes.materialCommunityIcons,
                    function_name: '支持我們',
                    func: () => {
                        ReactNativeHapticFeedback.trigger('soft');
                        let webview_param = {
                            url: GITHUB_DONATE,
                            title: '支持我們',
                            text_color: white,
                            bg_color_diy: themeColor,
                            isBarStyleBlack: false,
                        };
                        this.props.navigation.navigate('Webviewer', webview_param);
                    },
                },
                {
                    icon_name: require('../../../static/img/logo.png'),
                    icon_type: iconTypes.img,
                    function_name: '澳大方舟',
                    func: () => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.onRefresh();
                        this.getAppData();
                        // 刷新重新請求活動頁數據
                        this.eventPage.current.onRefresh();
                    },
                },
                {
                    icon_name: 'file-document-edit',
                    icon_type: iconTypes.materialCommunityIcons,
                    function_name: '方舟百科',
                    func: () => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.props.navigation.navigate('Wiki');
                    },
                },
                {
                    icon_name: 'people',
                    icon_type: iconTypes.ionicons,
                    function_name: '組織登入',
                    func: () => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.props.navigation.navigate('MeScreen');
                    },
                },
            ],

            selectDay: 0,

            isShowModal: false,

            isLoading: true,

            // 是否提示更新
            showUpdateInfo: false,

            app_version: {
                lastest: '',
                local: '',
            }
        };

        this.eventPage = React.createRef();
        this.scrollView = React.createRef();
    }

    componentDidMount() {
        logToFirebase('openPage', { page: 'home' });
        this.onRefresh();
        let globalData = this.props.RootStore;
        // 已登錄學生賬號
        if (globalData.userInfo && globalData.userInfo.stdData) {
            this.setState({ isShowModal: false });
            this.getAppData(true);
        } else {
            this.getAppData(false);
        }
        this.getCal();
    }

    getAppData = async isLogin => {
        let URL = BASE_URI + GET.APP_INFO;
        this.setState({ isLoading: true })
        await axios
            .get(URL)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    this.checkInfo(json.content, isLogin);
                }
            })
            .catch(err => {
                // this.toast.show(`網絡請求錯誤 TAT ...`, 2000);
                this.getAppData();
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
                    if (isLogin) {
                        alert('服務器API更新，需要重新登錄');
                        handleLogout();
                    } else {
                        setAPPInfo(serverInfo);
                    }
                } else {
                    setAPPInfo(serverInfo);
                }
            }

            // APP版本滯後，提示下載新版本
            const shouldUpdate = versionStringCompare(packageInfo.version, serverInfo.app_version) == -1;
            if (shouldUpdate) {
                this.setState({
                    showUpdateInfo: shouldUpdate,
                    app_version: {
                        lastest: serverInfo.app_version,
                        local: packageInfo.version,
                    }
                })
                Alert.alert(`ARK ${serverInfo.app_version} 現可更新！！`,
                    'version_info' in serverInfo
                        ? serverInfo.version_info
                        : `新版有許多新特性，舊版APP可能會在某時刻不可用，現在前往更新嗎？🥺`,
                    [
                        {
                            text: "Yes",
                            onPress: () => {
                                ReactNativeHapticFeedback.trigger('soft');
                                const url = Platform.OS === 'ios' ? APPSTORE_URL : BASE_HOST;
                                Linking.openURL(url);
                            },
                        },
                        {
                            text: "No",
                        },
                    ])
            }
        } catch (e) {
            // console.error(e);
        }
        finally {
            this.setState({ isLoading: false });
        }
    };

    onRefresh = () => {
        const toastTextIdx = Math.round(Math.random() * (toastTextArr.length - 1));
        this.toast.show(toastTextArr[toastTextIdx], 3500);
    }

    // 獲取日曆數據
    getCal = () => {
        // 先到網站獲取ics link，https://reg.um.edu.mo/university-almanac/?lang=zh-hant
        // 使用ical-to-json工具轉為json格式，https://github.com/cwlsn/ics-to-json/
        // 放入static/UMCalendar中覆蓋
        // ***務必注意key、value的大小寫！！**
        const nowTimeStamp = moment(new Date());
        const CAL_LENGTH = cal.length;
        // 同日或未來的重要時間設為選中日
        if (nowTimeStamp.isSameOrAfter(cal[CAL_LENGTH - 1].startDate)) {
            this.setState({ selectDay: CAL_LENGTH - 1 });
        }
        else if (nowTimeStamp.isSameOrAfter(cal[0].startDate)) {
            for (let i = 0; i < CAL_LENGTH; i++) {
                if (moment(cal[i].startDate).isSameOrAfter(nowTimeStamp)) {
                    this.setState({ selectDay: i });
                    break;
                }
            }
        }
    };

    getWeek(date) {
        // 参数时间戳
        let week = moment(date).day();
        switch (week) {
            case 1:
                return '周一';
            case 2:
                return '周二';
            case 3:
                return '周三';
            case 4:
                return '周四';
            case 5:
                return '周五';
            case 6:
                return '周六';
            case 0:
                return '周日';
        }
    }

    // 渲染顶部校历图标
    renderCal = (item, index) => {
        const { selectDay } = this.state;
        const momentItm = moment(item.startDate).format("YYYYMMDD");
        return (
            <TouchableOpacity
                style={{
                    backgroundColor: selectDay == index ? themeColor : themeColorLight,
                    borderRadius: scale(8),
                    paddingHorizontal: scale(5), paddingVertical: scale(3),
                    margin: scale(3),
                }}
                activeOpacity={0.8}
                onPress={() => {
                    ReactNativeHapticFeedback.trigger('soft');
                    this.setState({ selectDay: index });
                }}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>

                    {/* 年份 */}
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: white,
                        fontSize: scale(10),
                        fontWeight: selectDay == index ? 'bold' : 'normal',
                    }}>
                        {momentItm.substring(0, 4)}
                    </Text>

                    {/* 月份 */}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: white,
                            fontSize: scale(22),
                            fontWeight: selectDay == index ? 'bold' : 'normal',
                        }}>
                        {momentItm.substring(4, 6)}
                    </Text>

                    {/* 日期 */}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: white,
                            fontSize: scale(22),
                            fontWeight: selectDay == index ? 'bold' : 'normal',
                        }}>
                        {momentItm.substring(6, 8)}
                    </Text>

                    {/* 星期幾 */}
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: white,
                        fontSize: scale(10),
                        fontWeight: selectDay == index ? 'bold' : 'normal',
                    }}>
                        {this.getWeek(item.startDate)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // 渲染快捷功能卡片的圖標
    GetFunctionIcon = ({ icon_type, icon_name, function_name, func }) => {
        let icon = null;
        let imageSize = scale(29);
        let iconSize = scale(30);
        if (icon_type == 'ionicons') {
            icon = (
                <Ionicons
                    name={icon_name}
                    size={iconSize - 2}
                    color={COLOR_DIY.themeColor}
                />
            );
        } else if (icon_type == 'MaterialCommunityIcons') {
            icon = (
                <MaterialCommunityIcons
                    name={icon_name}
                    size={iconSize}
                    color={COLOR_DIY.themeColor}
                />
            );
        } else if (icon_type == 'img') {
            icon = (
                <FastImage
                    source={icon_name}
                    style={{
                        height: imageSize,
                        width: imageSize,
                        borderRadius: scale(10),
                        marginBottom: scale(1),
                    }}
                />
            );
        }

        return (
            <TouchableOpacity
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: scale(-5),
                }}
                onPress={func}>
                {icon}
                {function_name && (
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(10),
                            fontWeight: 'bold',
                            color: COLOR_DIY.themeColor,
                        }}>
                        {function_name}
                    </Text>
                )}
            </TouchableOpacity>
        );
    };

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        this.setState({ isShowModal: !this.state.isShowModal });
    };

    // 渲染懸浮可拖動按鈕
    renderGoTopButton = () => {
        const { viewShadow } = COLOR_DIY;
        return (
            <Interactable.View
                style={{
                    zIndex: 999,
                    position: 'absolute',
                }}
                ref="headInstance"
                // 設定所有可吸附的屏幕位置 0,0為屏幕中心
                snapPoints={[
                    { x: -scale(140), y: -scale(220) },
                    { x: scale(140), y: -scale(220) },
                    { x: -scale(140), y: -scale(120) },
                    { x: scale(140), y: -scale(120) },
                    { x: -scale(140), y: scale(0) },
                    { x: scale(140), y: scale(0) },
                    { x: -scale(140), y: scale(120) },
                    { x: scale(140), y: scale(120) },
                    { x: -scale(140), y: scale(220) },
                    { x: scale(140), y: scale(220) },
                ]}
                // 設定初始吸附位置
                initialPosition={{ x: scale(140), y: scale(220) }}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        // 回頂，需先創建ref，可以在this.refs直接找到方法引用
                        this.scrollView.current.scrollTo({
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
                            color={COLOR_DIY.themeColor}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Interactable.View>
        );
    };

    render() {
        const { selectDay, isLoading } = this.state;
        return (
            <View
                style={{
                    flex: 1, backgroundColor: bg_color,
                    alignItems: 'center', justifyContent: 'center',
                }}>

                {/* 懸浮可拖動按鈕 */}
                {isLoading ? null : this.renderGoTopButton()}

                {/* 主页本体 */}
                <ScrollView
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={this.state.isLoading}
                            onRefresh={() => {
                                this.setState({ isLoading: true });
                                this.onRefresh();
                                this.getAppData();
                                // 刷新重新請求活動頁數據
                                this.eventPage.current.onRefresh();
                            }}
                        />
                    }
                    alwaysBounceHorizontal={false}
                    ref={this.scrollView}
                    showsVerticalScrollIndicator={false}
                >

                    {/* 校曆列表 */}
                    {cal && cal.length > 0 ? (
                        <View style={{ backgroundColor: bg_color, width: '100%', marginTop: scale(8), justifyContent: 'center', }}>
                            <VirtualizedList
                                data={cal}
                                initialNumToRender={11}
                                initialScrollIndex={selectDay <= cal.length ? selectDay : 0}
                                getItemLayout={(data, index) => {
                                    const layoutSize = scale(42);
                                    return {
                                        length: selectDay,
                                        offset: layoutSize * index - selectDay,
                                        index,
                                    };
                                }}
                                // 渲染每个列表项的方法
                                renderItem={({ item, index }) => this.renderCal(item, index)}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                getItem={getItem}
                                // 渲染項目數量
                                getItemCount={getItemCount}
                                key={'#'}
                                // 列表primary key
                                keyExtractor={(item, index) => index}
                                ListHeaderComponent={
                                    <View style={{ marginLeft: scale(20) }} />
                                }
                                ListFooterComponent={
                                    <View style={{ marginRight: scale(20) }} />
                                }
                            />

                            {/* 校曆日期描述 */}
                            {cal[selectDay] && 'summary' in cal[selectDay] ? (
                                <View style={{
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'row',
                                    marginTop: scale(5),
                                }}>
                                    {/* 左Emoji */}
                                    <Text selectable style={{
                                        ...uiStyle.defaultText,
                                        textAlign: 'center',
                                        fontSize: scale(12),
                                    }}
                                    >
                                        {VERSION_EMOJI.ve_Left + '\n\n'}
                                    </Text>

                                    {/* 校曆內容描述 */}
                                    <View style={{
                                        backgroundColor: themeColorUltraLight,
                                        borderRadius: scale(5),
                                        paddingVertical: scale(2), paddingHorizontal: scale(5),
                                        width: screenWidth * 0.8,
                                    }}>
                                        <Text
                                            selectable
                                            style={{ ...uiStyle.defaultText, color: themeColor, textAlign: 'center', fontSize: scale(12) }}
                                        >
                                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), fontWeight: 'bold' }}>
                                                {'📅 Almanac 校曆' + '\n'}
                                            </Text>

                                            {cal[selectDay].summary}

                                            {'summary_cn' in cal[selectDay] ? (
                                                '\n' + cal[selectDay].summary_cn
                                            ) : null}
                                        </Text>
                                    </View>

                                    {/* 右Emoji */}
                                    <Text selectable style={{
                                        ...uiStyle.defaultText,
                                        textAlign: 'center',
                                        fontSize: scale(12)
                                    }}>
                                        {'\n\n' + VERSION_EMOJI.ve_Right}
                                    </Text>
                                </View>
                            ) : null}

                        </View>
                    ) : null
                    }

                    {/* 快捷功能圖標 */}
                    <FlatGrid
                        style={{
                            alignSelf: 'center',
                            backgroundColor: white, borderRadius: scale(10),
                            marginTop: scale(5),
                        }}
                        maxItemsPerRow={6}
                        itemDimension={scale(50)}
                        spacing={scale(5)}
                        data={this.state.functionArray}
                        renderItem={({ item }) => this.GetFunctionIcon(item)}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={false}
                    />

                    {/* 更新提示 */}
                    {
                        this.state.showUpdateInfo ?
                            <HomeCard style={{ alignSelf: 'center' }}>
                                <View>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            color: black,
                                            fontWeight: 'bold',
                                            marginTop: scale(2),
                                            alignSelf: 'center',
                                            textAlign: 'center',
                                        }}>
                                        {`🔥🔥🔥🔥🔥新版本來了‼️🔥🔥🔥🔥🔥`}
                                    </Text>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            color: themeColor,
                                            marginTop: scale(5),
                                            fontWeight: 'bold',
                                        }}>
                                        {`最新版本: ${this.state.app_version.lastest}`}
                                    </Text>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            color: black.third,
                                            marginTop: scale(5),
                                            fontWeight: 'bold',
                                        }}>
                                        {`你的版本: ${this.state.app_version.local}`}
                                    </Text>
                                    {Platform.OS === 'ios' ? null : (
                                        <Text
                                            style={{
                                                ...uiStyle.defaultText,
                                                alignSelf: 'center', textAlign: 'center',
                                                color: themeColor,
                                                marginTop: scale(5),
                                                fontWeight: 'bold',
                                            }}>
                                            {`無Google Play Store用戶可以通過APK方式安裝~`}
                                        </Text>
                                    )}
                                    <TouchableOpacity
                                        style={{
                                            alignSelf: 'center',
                                            marginTop: scale(5),
                                            backgroundColor: themeColor,
                                            borderRadius: scale(10),
                                            paddingVertical: scale(5), paddingHorizontal: scale(8),
                                        }}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            ReactNativeHapticFeedback.trigger('soft');
                                            const url = Platform.OS === 'ios' ? APPSTORE_URL : BASE_HOST;
                                            Linking.openURL(url);
                                        }}>
                                        <Text
                                            style={{
                                                ...uiStyle.defaultText,
                                                color: white,
                                                fontWeight: 'bold',
                                            }}>
                                            {`點我更新 😉~`}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </HomeCard>
                            : null
                    }

                    {/* 活動頁 */}
                    <EventPage ref={this.eventPage} />

                </ScrollView >

                {/* 彈出提示登錄的Modal */}
                {
                    this.state.isShowModal && (
                        <ModalBottom cancel={this.tiggerModalBottom}>
                            <View
                                style={{
                                    padding: scale(20),
                                    backgroundColor: COLOR_DIY.white,
                                }}>
                                <ScrollView
                                    contentContainerStyle={{
                                        alignItems: 'center',
                                        marginBottom: scale(30),
                                    }}>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            fontSize: scale(18),
                                            color: COLOR_DIY.black.third,
                                        }}>
                                        歡迎來到ARK ALL~
                                    </Text>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            fontSize: scale(15),
                                            color: COLOR_DIY.black.third,
                                        }}>
                                        登錄後體驗完整功能，現在去嗎？
                                    </Text>
                                    {/* 登錄按鈕 */}
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={{
                                            marginTop: scale(10),
                                            backgroundColor: COLOR_DIY.themeColor,
                                            padding: scale(10),
                                            borderRadius: scale(10),
                                            justifyContent: 'center',
                                            alignSelf: 'center',
                                        }}
                                        onPress={() => {
                                            ReactNativeHapticFeedback.trigger(
                                                'soft',
                                            );
                                            this.setState({ isShowModal: false });
                                            this.props.navigation.jumpTo(
                                                'MeTabbar',
                                            );
                                        }}>
                                        <Text
                                            style={{
                                                ...uiStyle.defaultText,
                                                fontSize: scale(15),
                                                color: 'white',
                                                fontWeight: '500',
                                            }}>
                                            現在登錄
                                        </Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </ModalBottom>
                    )
                }

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'7%'}
                    textStyle={{ color: COLOR_DIY.themeColor, fontWeight: 'bold', textAlign: 'center' }}
                    style={{
                        backgroundColor: COLOR_DIY.themeColorUltraLight,
                        borderRadius: scale(10),
                        borderWidth: 2,
                        borderColor: COLOR_DIY.themeColor,
                        ...viewShadow,
                    }}
                />
            </View >
        );
    }
}

export default inject('RootStore')(HomeScreen);
