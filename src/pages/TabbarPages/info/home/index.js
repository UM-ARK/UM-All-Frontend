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
import { COLOR_DIY, uiStyle, VERSION_EMOJI, isLight } from '../../../../utils/uiMap.js';
import {
    GITHUB_DONATE,
    BASE_HOST,
    BASE_URI,
    GET,
    APPSTORE_URL,
    MAIL,
    ARK_WIKI,
    ARK_WIKI_RANDOM_TITLE,
} from '../../../../utils/pathMap.js';
import EventPage from './EventPage.js';
import ModalBottom from '../../../../components/ModalBottom.js';
import { setAPPInfo, handleLogout } from '../../../../utils/storageKits.js';
import { versionStringCompare } from '../../../../utils/versionKits.js';
import packageInfo from '../../../../../package.json';
import { UMCalendar } from '../../../../static/UMCalendar/UMCalendar.js';
import HomeCard from './components/HomeCard.js';
import { screenWidth } from '../../../../utils/stylesKits.js';
import { trigger } from '../../../../utils/trigger.js';

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Interactable from 'react-native-interactable';
import { FlatGrid } from 'react-native-super-grid';
import { inject } from 'mobx-react';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { scale, verticalScale } from 'react-native-size-matters';
import FastImage from 'react-native-fast-image';
import moment from 'moment';
import TouchableScale from "react-native-touchable-scale";
import { t } from "i18next";

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

let cal = UMCalendar;

const toastTextArr = [
    `ARK ALL全力加載中!!!`,
    `點擊頂部校曆看看最近有什麼假期~`,
    `快試試底部幾個按鈕都有什麼功能~`,
    `別只看校巴啦! 也來寫寫Wiki!`,
    `Wiki在電腦上編輯更方便哦!`,
    `ARK ALL為愛發電ing...`,
    `記住我們的官網 ${BASE_HOST} !!!`,
    `記住Wiki的官網 ${ARK_WIKI} !!!`,
    `ARK 就是 方舟 !!!`,
    `ARK Wiki - 澳大人的維基百科!!!`,
    `快喊上你心愛的社團進駐ARK!!!`,
    `在關於頁找到我們的郵箱!!!`,
    `到底什麼才是ARK???`,
    `今天也要加油!!! UMer!!! `,
    `快把ARK介紹給學弟學妹學長學姐`,
    `今天你更新ARK了嗎?`,
    `澳大資訊一次看完!!!`,
    `快試試看校園巴士!!!`,
    `快試試看ARK找課!!!`,
    `快試試看ARK課表模擬!!!`,
    `快看看ARK Wiki有什麼新東西!!!`,
    `一起來加入方舟計劃!!!一起來寫Wiki!!!`,
    `前人種樹 後人乘涼 多想從前就有Wiki...`,
    `Wiki是百科、知識庫、攻略站、博客 是UM All In One!`,
    `讓我們在Wiki打造澳大最強知識庫!!!`,
    `不要讓學習的辛苦白費 共享到Wiki吧!!!`,
    `UM All In One 就在ARK ALL`,
    `又是選不上課的一天...`,
    `今天會下雨嗎`,
    `今天不能熬夜`,
    `今天又掉了多少根頭髮`,
    `週末還有多少天`,
    `我覺得和你挺有緣的 來App Store給個好評吧~`,
    `快去進駐組織頁看看有無你愛的社團!!!`,
    `你在這裡刷新多少次了???`,
    `開發者這麼努力 不向朋友推薦一下ARK嗎...`,
    `朝著UMer人手一個ARK的目標努力著... `,
    `想來開發/學習? 歡迎聯繫我們!!!`,
    `我們的郵箱是 ${MAIL} !!!`,
    `這麼良心的APP還不推薦給朋友們嗎`,
    `開發者的錢包快被掏空...`,
    `再刷新我就累了...`,
];
const toastKaomojiArr = [
    '(>ω･* )ﾉ',
    'ヾ(ｏ･ω･)ﾉ',
    '( • ̀ω•́ )✧',
    '(*/ω＼*)',
    'ヾ(❀^ω^)ﾉﾞ',
    '(~o￣3￣)~',
    '∠( °ω°)／',
    `＼\٩('ω')و/／`,
    '✧⁺⸜(●˙▾˙●)⸝⁺✧',
    '(｡◝ᴗ◜｡)',
    'ヽ(^ω^)ﾉ',
    '(ﾟωﾟ)ﾉ☆',
    '(*￣3￣)╭',
    '(ಥ_ಥ)',
    '(￣.￣)',
    '٩(๑>◡<๑)۶',
    '(T ^ T)',
    'ㄟ( ▔, ▔ )ㄏ',
    '(▼へ▼メ)',
    '￣▽￣',
    '(oﾟ▽ﾟ)o',
];

const calItemWidth = scale(44.5);

class HomeScreen extends Component {
    toastTimer = null;
    calScrollRef = React.createRef();

    constructor(props) {
        super(props)

        this.state = {
            // 快捷功能入口
            functionArray: [
                {
                    icon_name: 'bus',
                    icon_type: iconTypes.ionicons,
                    function_name: t('校園巴士', { ns: 'home' }),
                    func: () => {
                        trigger();
                        this.props.navigation.navigate('Bus');
                    },
                },
                {
                    icon_name: 'coffee',
                    icon_type: iconTypes.materialCommunityIcons,
                    function_name: t('支持我們', { ns: 'home' }),
                    func: () => {
                        trigger();
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
                    icon_name: require('../../../../static/img/logo.png'),
                    icon_type: iconTypes.img,
                    function_name: t('澳大方舟', { ns: 'home' }),
                    func: () => {
                        trigger();
                        this.onRefresh();
                        this.getAppData();
                        this.getCal();
                        // 刷新重新請求活動頁數據
                        this.eventPage.current.onRefresh();
                    },
                },
                {
                    icon_name: 'file-document-edit',
                    icon_type: iconTypes.materialCommunityIcons,
                    function_name: t('方舟百科', { ns: 'home' }),
                    func: () => {
                        trigger();
                        this.props.navigation.navigate('Wiki');
                    },
                },
                {
                    icon_name: 'people',
                    icon_type: iconTypes.ionicons,
                    function_name: t('組織登入', { ns: 'home' }),
                    func: () => {
                        trigger();
                        this.props.navigation.navigate('LoginIndex');
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
            },
            version_info: null,
        };

        this.eventPage = React.createRef();
        this.scrollView = React.createRef();
    }

    componentDidMount() {
        let globalData = this.props.RootStore;
        // 已登錄學生賬號
        if (globalData.userInfo && globalData.userInfo.stdData) {
            this.setState({ isShowModal: false });
            this.getAppData(true);
        } else {
            this.getAppData(false);
        }
        this.getCal();

        this.toastTimer = setTimeout(() => {
            this.onRefresh();
        }, 1000);
    }

    componentWillUnmount() {
        this.toastTimer && clearTimeout(this.toastTimer);
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
                                trigger();
                                const url = Platform.OS === 'ios' ? APPSTORE_URL : BASE_HOST;
                                Linking.openURL(url);
                            },
                        },
                        {
                            text: "No",
                        },
                    ])
                if ('version_info' in serverInfo) {
                    this.setState({ version_info: serverInfo.version_info });
                }
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
        const toastKaoIdx = Math.round(Math.random() * (toastKaomojiArr.length - 1));
        Toast.show({
            type: 'arkToast',
            text1: toastKaomojiArr[toastKaoIdx],
            text2: toastTextArr[toastTextIdx],
            topOffset: scale(100),
            onPress: () => Toast.hide(),
        })

        // TODO: 會出現教授的名字，暫且擱置
        // const URL = ARK_WIKI_RANDOM_TITLE;
        // await axios.get(URL)
        //     .then(res => {
        //         let result = res.data;
        //         if (result) {
        //             let randomTitle = result.query.random[0].title;
        //             console.log(randomTitle);
        //         }
        //     })
        //     .catch(err => {
        //         Alert.alert('', 'Wiki請求錯誤' + JSON.stringify(err))
        //     })
    }

    // 獲取日曆數據
    getCal = () => {
        // 先到網站獲取ics link，https://reg.um.edu.mo/university-almanac/?lang=zh-hant
        // 使用ical-to-json工具轉為json格式，https://github.com/cwlsn/ics-to-json/
        // 放入static/UMCalendar中覆蓋
        // ***務必注意key、value的大小寫！！**
        const nowTimeStamp = moment(new Date());
        const CAL_LENGTH = cal.length;
        let { selectDay } = this.state;
        // 同日或未來的重要時間設為選中日
        if (nowTimeStamp.isSameOrAfter(cal[CAL_LENGTH - 1].startDate)) {
            selectDay = CAL_LENGTH - 1;
            this.setState({ selectDay });
        }
        else if (nowTimeStamp.isSameOrAfter(cal[0].startDate)) {
            for (let i = 0; i < CAL_LENGTH; i++) {
                if (moment(cal[i].startDate).isSameOrAfter(nowTimeStamp)) {
                    selectDay = i;
                    this.setState({ selectDay });
                    break;
                }
            }
        }
        // 自動滾動到校曆的selectDay
        if (this.calScrollRef) {
            this.calScrollRef.current.scrollToOffset({ offset: selectDay * calItemWidth });
        }
    };

    getWeek(date) {
        // 参数时间戳
        let week = moment(date).day();
        switch (week) {
            case 1:
                return t('周一', { ns: 'home' });
            case 2:
                return t('周二', { ns: 'home' });
            case 3:
                return t('周三', { ns: 'home' });
            case 4:
                return t('周四', { ns: 'home' });
            case 5:
                return t('周五', { ns: 'home' });
            case 6:
                return t('周六', { ns: 'home' });
            case 0:
                return t('周日', { ns: 'home' });
        }
    }

    // 渲染顶部校历图标
    renderCal = (item, index) => {
        const { selectDay } = this.state;
        const momentItm = moment(item.startDate).format("YYYYMMDD");
        // 渲染所選日期
        let isThisDateSelected = selectDay == index;
        // 是否重要日子：開Sem、完Sem、考試
        let isEssencial = item.summary.toUpperCase().indexOf('EXAM') != -1 ||
            item.summary.toUpperCase().indexOf('SEMESTER') != -1 &&
            item.summary.toUpperCase().indexOf('BREAK') == -1;
        let backgroundColor = isThisDateSelected ? themeColor : themeColorLight;
        return (
            <TouchableScale
                style={{ width: calItemWidth, margin: scale(3), }}
                onPress={() => {
                    trigger();
                    this.setState({ selectDay: index });
                }}
            >
                <View style={{
                    backgroundColor,
                    borderRadius: scale(8),
                    paddingHorizontal: scale(5), paddingVertical: scale(3),
                }}>
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        {/* 年份 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: COLOR_DIY.trueWhite,
                            fontSize: scale(10),
                            fontWeight: isThisDateSelected ? 'bold' : 'normal',
                            opacity: !isThisDateSelected && !isLight ? 0.5 : 1,
                        }}>
                            {momentItm.substring(0, 4)}
                        </Text>

                        {/* 月份 */}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: COLOR_DIY.trueWhite,
                                fontSize: scale(22),
                                fontWeight: isThisDateSelected ? 'bold' : 'normal',
                                opacity: !isThisDateSelected && !isLight ? 0.5 : 1,
                            }}>
                            {momentItm.substring(4, 6)}
                        </Text>

                        {/* 日期 */}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: COLOR_DIY.trueWhite,
                                fontSize: scale(22),
                                fontWeight: isThisDateSelected ? 'bold' : 'normal',
                                opacity: !isThisDateSelected && !isLight ? 0.5 : 1,
                            }}>
                            {momentItm.substring(6, 8)}
                        </Text>

                        {/* 星期幾 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: COLOR_DIY.trueWhite,
                            fontSize: scale(10),
                            fontWeight: isThisDateSelected ? 'bold' : 'normal',
                            opacity: !isThisDateSelected && !isLight ? 0.5 : 1,
                        }}>
                            {this.getWeek(item.startDate)}
                        </Text>
                    </View>
                </View>
                {isEssencial ? (
                    <View style={{
                        backgroundColor: COLOR_DIY.warning,
                        borderRadius: scale(50),
                        width: scale(10), height: scale(10),
                        position: 'absolute',
                        right: scale(0), top: scale(0),
                    }} />
                ) : null}
            </TouchableScale>
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
                        backgroundColor: COLOR_DIY.trueWhite,
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
                    { x: -scale(140), y: -verticalScale(220) },
                    { x: scale(140), y: -verticalScale(220) },
                    { x: -scale(140), y: -verticalScale(120) },
                    { x: scale(140), y: -verticalScale(120) },
                    { x: -scale(140), y: verticalScale(0) },
                    { x: scale(140), y: verticalScale(0) },
                    { x: -scale(140), y: verticalScale(120) },
                    { x: scale(140), y: verticalScale(120) },
                    { x: -scale(140), y: verticalScale(220) },
                    { x: scale(140), y: verticalScale(220) },
                ]}
                // 設定初始吸附位置
                initialPosition={{ x: scale(140), y: verticalScale(220) }}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        trigger();
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
                            margin: scale(5),
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
                                this.getCal();
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
                                ref={this.calScrollRef}
                                initialNumToRender={selectDay <= 11 ? 11 : selectDay}
                                windowSize={4}
                                initialScrollIndex={selectDay < cal.length ? selectDay : 0}
                                getItemLayout={(data, index) => {
                                    const layoutSize = calItemWidth;
                                    return {
                                        length: layoutSize,
                                        offset: layoutSize * index,
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
                                                {'📅 校曆 Upcoming:' + '\n'}
                                            </Text>

                                            {/* 如果時間差大於1天，展示活動的時間差 */}
                                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), fontWeight: 'bold' }}>
                                                {moment(cal[selectDay].endDate).diff(cal[selectDay].startDate, 'day') > 1 ? (
                                                    `${moment(cal[selectDay].startDate).format("YYYY-MM-DD")} ~ ${moment(cal[selectDay].endDate).subtract(1, 'days').format("YYYY-MM-DD")}\n`
                                                ) : null}
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
                                            color: black.second,
                                            fontWeight: 'bold',
                                            marginTop: scale(2),
                                            alignSelf: 'center',
                                            textAlign: 'center',
                                        }}>
                                        {`🔥🔥🔥🔥🔥新版本來了‼️🔥🔥🔥🔥🔥`}
                                    </Text>
                                    {/* 版本更新說明 */}
                                    {this.state.version_info ? (
                                        <Text style={{
                                            ...uiStyle.defaultText,
                                            color: black.second,
                                            fontWeight: 'bold',
                                            marginTop: scale(2),
                                            alignSelf: 'center',
                                        }}>
                                            {'\n更新內容：\n' + this.state.version_info + '\n'}
                                        </Text>
                                    ) : null}
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
                                            trigger();
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
                                            trigger();
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
                {/* <Toast
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
                /> */}
            </View >
        );
    }
}

export default inject('RootStore')(HomeScreen);
