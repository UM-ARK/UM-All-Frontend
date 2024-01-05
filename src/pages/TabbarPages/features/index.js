import React, { Component } from 'react';
import {
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    Alert,
    Linking,
} from 'react-native';

import { COLOR_DIY, uiStyle, } from '../../../utils/uiMap';
import {
    UM_MAP,
    UM_RBS,
    UM_COMPUTER_ROOM,
    UM_SPORT_BOOKING,
    UM_CMMS,
    UM_LOCKER,
    UM_PORTAL,
    UM_CALENDAR,
    UM_Moodle,
    WHAT_2_REG,
    UM_PRE_ENROLMENT,
    UM_ADD_DROP,
    UM_WHOLE_PERSON,
    UM_EXCHANGE,
    UM_SCHOLARSHIP,
    UM_PARK_APPLY,
    UM_JOB_SYSTEM,
    UM_CLASSROOM_MAP,
    UM_PASS,
    UM_LIBRARY,
    UM_COURSE_SIMU,
    UM_ISW,
    NEW_INFOG,
    UM_DOCUMENTS,
    NEW_SCZN,
    NEW_MAINLAND,
    UM_COMMENTS,
    UM_PRE_ENROLMENT_EXCEL,
    UM_IMPORTANT_DATE,
    UM_BULLETIN,
    UM_RC_MENU,
} from '../../../utils/pathMap';
import DialogDIY from '../../../components/DialogDIY';
import { logToFirebase } from "../../../utils/firebaseAnalytics";
import { openLink } from "../../../utils/browser";

import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { FlatGrid } from 'react-native-super-grid';
import FastImage from 'react-native-fast-image';
import Clipboard from '@react-native-clipboard/clipboard';
import { inject } from 'mobx-react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { scale } from 'react-native-size-matters';

// 定義可使用icon，注意大小寫
const iconTypes = {
    ionicons: 'ionicons',
    materialCommunityIcons: 'MaterialCommunityIcons',
    img: 'img',
};

const { themeColor } = COLOR_DIY;

const iconSize = scale(25);

class Index extends Component {
    state = {
        functionArr: [
            {
                title: '校園服務',
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'bus-stop',
                        fn_name: '校園巴士',
                        needLogin: false,
                        go_where: 'Bus', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'calendar-today',
                        fn_name: '校曆',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_CALENDAR,
                            title: 'UM 校曆',
                            // 標題顏色，默認為black.main
                            text_color: '#002c55',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#fff',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'map',
                        fn_name: '校園地圖',
                        needLogin: false,
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_MAP,
                            title: 'UM 校園地圖',
                            // 標題顏色，默認為black.main
                            text_color: '#002c55',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#fff',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'map-marker-multiple',
                        fn_name: '課室地圖',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_CLASSROOM_MAP,
                            title: 'UM 課室地圖 & 使用情況',
                            // 標題顏色，默認為black.main
                            text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#005f96',
                            // 狀態欄字體是否黑色，默認true
                            isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'car-brake-parking',
                        fn_name: '車位',
                        needLogin: false,
                        go_where: 'CarPark', // a function
                    },
                    {
                        icon_type: iconTypes.ionicons,
                        icon_name: 'logo-dropbox',
                        fn_name: '資源借用',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_RBS,
                            title: 'UM 資源借用',
                            // 標題顏色，默認為black.main
                            // text_color: '#989898',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#f8f8f8',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'console-network',
                        fn_name: '公共電腦',
                        needLogin: false,
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_COMPUTER_ROOM,
                            title: '電腦室使用情況',
                            // 標題顏色，默認為black.main
                            // text_color: '#989898',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#f8f9fa',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'door-closed-lock',
                        fn_name: '儲物箱',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_LOCKER,
                            title: 'UM 儲物箱租借',
                            // 標題顏色，默認為black.main
                            text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#347bb7',
                            // 狀態欄字體是否黑色，默認true
                            isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'hammer-wrench',
                        fn_name: '維修預約',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_CMMS,
                            title: '維修預約(需澳大校園網)',
                            // 標題顏色，默認為black.main
                            // text_color: '#989898',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: 'red',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'basketball',
                        fn_name: '體育預訂',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_SPORT_BOOKING,
                            title: 'UM 體育預訂',
                            // 標題顏色，默認為black.main
                            text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#005f96',
                            // 狀態欄字體是否黑色，默認true
                            isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.ionicons,
                        icon_name: 'library',
                        fn_name: '圖書館',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_LIBRARY,
                            title: 'UM 圖書館',
                            // 標題顏色，默認為black.main
                            text_color: '#010101',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: '#005f96',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'passport',
                        fn_name: 'UM Pass',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_PASS,
                            title: 'UM Pass系統',
                            // 標題顏色，默認為black.main
                            // text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: '#005f96',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'account-question',
                        fn_name: 'UM提意見',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_COMMENTS,
                            title: 'UM 好意見',
                            // 標題顏色，默認為black.main
                            // text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: '#005f96',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'bullhorn',
                        fn_name: '電子公告',
                        needLogin: false,
                        go_where: 'Webview',
                        webview_param: {
                            url: UM_BULLETIN,
                            title: '學生電子公告',
                            text_color: COLOR_DIY.white,
                            bg_color_diy: '#002c55',
                            isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'view-grid-plus',
                        fn_name: '更多服務',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_PORTAL,
                            title: 'UM Portal',
                            // 標題顏色，默認為black.main
                            // text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: '#005f96',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                ],
            },
            {
                title: '課業 & 發展',
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'alpha-m-circle-outline',
                        fn_name: 'Moodle',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_Moodle,
                            title: 'UM Moodle',
                            // 標題顏色，默認為black.main
                            text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#1278d1',
                            // 狀態欄字體是否黑色，默認true
                            isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'file-document-edit-outline',
                        fn_name: 'Wiki',
                        needLogin: false,
                        go_where: 'Wiki', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'table-clock',
                        fn_name: '課表模擬',
                        needLogin: false,
                        go_where: 'CourseSimTab',
                        // webview_param: {
                        //     url: UM_COURSE_SIMU,
                        //     title: '課表模擬(建議在電腦操作)',
                        // },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'database-search',
                        fn_name: '選咩課',
                        needLogin: false,
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: WHAT_2_REG,
                            title: '澳大選咩課',
                            // 標題顏色，默認為black.main
                            text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#1e558c',
                            // 狀態欄字體是否黑色，默認true
                            isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'ab-testing',
                        fn_name: 'ISW',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_ISW,
                            title: 'UM ISW',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'eye-plus',
                        fn_name: '預選課',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_PRE_ENROLMENT,
                            title: '預選課(建議在電腦操作)',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'file-table',
                        fn_name: '預選表格',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_PRE_ENROLMENT_EXCEL,
                            title: '預選課(建議在電腦操作)',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'bank-plus',
                        fn_name: 'Add Drop',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_ADD_DROP,
                            title: '增補選(建議在電腦操作)',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'timeline-alert',
                        fn_name: '重要日期',
                        needLogin: false,
                        go_where: 'Webview',
                        webview_param: {
                            url: UM_IMPORTANT_DATE,
                            title: '重要日期',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'cow',
                        fn_name: '全人發展',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_WHOLE_PERSON,
                            title: '全人發展',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'dolphin',
                        fn_name: '交流',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_EXCHANGE,
                            title: 'UM 交流機會申請',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'dice-multiple',
                        fn_name: '獎學金',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_SCHOLARSHIP,
                            title: '獎學金',
                            // 標題顏色，默認為black.main
                            text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#23407d',
                            // 狀態欄字體是否黑色，默認true
                            isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'badge-account',
                        fn_name: '證明文件',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_DOCUMENTS,
                            title: 'UM 證明文件',
                        },
                    },
                ],
            },
            {
                title: '生活服務',
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'text-box-check',
                        fn_name: '失物認領',
                        needLogin: false,
                        go_where: 'LostAndFound',
                        // go_where: 'Webview',
                        // webview_param: {
                        //     // import pathMap的鏈接進行跳轉
                        //     url: UM_LOST_FOUND,
                        //     title: '失物認領',
                        //     // 標題顏色，默認為black.main
                        //     // text_color: '#fff',
                        //     // 標題背景顏色，默認為bg_color
                        //     // bg_color_diy: '#23407d',
                        //     // 狀態欄字體是否黑色，默認true
                        //     // isBarStyleBlack: false,
                        // },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'car-multiple',
                        fn_name: '泊車月票',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_PARK_APPLY,
                            title: '泊車月票系統',
                            // 標題顏色，默認為black.main
                            text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#005f96',
                            // 狀態欄字體是否黑色，默認true
                            isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'human-dolly',
                        fn_name: '職位空缺',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_JOB_SYSTEM,
                            title: '職位空缺',
                            // 標題顏色，默認為black.main
                            // text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: '#23407d',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'food',
                        fn_name: '書院餐單',
                        needLogin: false,
                        go_where: 'Webview',
                        webview_param: {
                            url: UM_RC_MENU,
                            title: '書院餐單',
                        },
                    },
                ],
            },
            {
                title: '新生推薦',
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'ghost',
                        fn_name: '生存指南',
                        needLogin: false,
                        go_where: 'Webview',
                        webview_param: {
                            url: NEW_SCZN,
                            title: '新鮮人要知道的億些Tips',
                            text_color: COLOR_DIY.black.second,
                            bg_color_diy: '#ededed',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'bag-suitcase',
                        fn_name: '內地生',
                        needLogin: false,
                        go_where: 'Webview',
                        webview_param: {
                            url: NEW_MAINLAND,
                            title: '成為賭王前的億些入學須知',
                            text_color: COLOR_DIY.black.second,
                            bg_color_diy: '#ededed',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'account-heart',
                        fn_name: '圖文包',
                        needLogin: false,
                        go_where: 'Webview',
                        webview_param: {
                            url: NEW_INFOG,
                            title: '澳大圖文包',
                            text_color: '#012d56',
                            bg_color_diy: '#fff',
                        },
                    },
                ],
            },
        ],
        isLogin: false,
        showDialog: false,
    };

    componentDidMount() {
        let globalData = this.props.RootStore;
        // 已登錄學生賬號
        if (globalData.userInfo && globalData.userInfo.stdData) {
            this.setState({ isLogin: true });
        }
    }

    GetFunctionCard(title, fn_list) {
        // title為分類大標題，fn_list為該分類下有的功能圖標
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: COLOR_DIY.white,
                    borderRadius: scale(10),
                    marginHorizontal: scale(10),
                    marginTop: scale(10),
                    // 增加陰影
                    // ...COLOR_DIY.viewShadow,
                }}>
                {/* 服務分類標題 */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: scale(12),
                        paddingTop: scale(12),
                    }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(12),
                            color: COLOR_DIY.black.main,
                            fontWeight: 'bold',
                        }}>
                        {title}
                    </Text>
                </View>

                <FlatGrid
                    maxItemsPerRow={5}
                    itemDimension={scale(50)}
                    spacing={scale(10)}
                    data={fn_list}
                    renderItem={({ item }) => {
                        // 索引出相關服務的icon
                        let icon = null;
                        if (item.icon_type == 'ionicons') {
                            icon = (
                                <Ionicons
                                    name={item.icon_name}
                                    size={scale(30)}
                                    color={COLOR_DIY.themeColor}
                                />
                            );
                        } else if (item.icon_type == 'MaterialCommunityIcons') {
                            icon = (
                                <MaterialCommunityIcons
                                    name={item.icon_name}
                                    size={scale(30)}
                                    color={COLOR_DIY.themeColor}
                                />
                            );
                        } else if (item.icon_type == 'img') {
                            icon = (
                                <FastImage
                                    source={{
                                        uri: item.icon_name,
                                        // cache: FastImage.cacheControl.web,
                                    }}
                                    style={{
                                        height: scale(60),
                                        width: scale(60),
                                    }}
                                />
                            );
                        }

                        let { go_where, webview_param, needLogin } = item;
                        return (
                            <TouchableOpacity
                                style={{
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                                activeOpacity={0.7}
                                // 跳轉具體頁面
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('soft');
                                    logToFirebase('funcUse', { funcName: item.fn_name });
                                    if (!needLogin || this.state.isLogin) {
                                        // Webview頁面，需附帶跳轉參數
                                        if (go_where == 'Webview') {
                                            // this.props.navigation.navigate(
                                            //     'Webviewer',
                                            //     webview_param,
                                            // );
                                            openLink(webview_param.url);
                                        } else if (go_where == 'Linking') {
                                            // 使用默認瀏覽器打開
                                            // Linking.openURL(webview_param.url);
                                            // 使用應用內瀏覽器選項卡打開
                                            openLink(webview_param.url);
                                        }
                                        // 跳轉對應本地頁面
                                        else {
                                            this.props.navigation.navigate(
                                                go_where,
                                            );
                                        }
                                    } else {
                                        this.setState({ showDialog: true });
                                    }
                                }}
                                // 複製相關網站link
                                onLongPress={() => {
                                    ReactNativeHapticFeedback.trigger('soft');
                                    if (go_where == 'Webview' || go_where == 'Linking') {
                                        Clipboard.setString(webview_param.url);
                                        Alert.alert('已複製網站Link到剪貼板！');
                                    }
                                }}>
                                {icon}
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        fontSize: scale(10),
                                        color: COLOR_DIY.black.second,
                                    }}>
                                    {item.fn_name}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                />
            </View>
        );
    }

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: COLOR_DIY.barStyle,
                    }}
                    containerStyle={{
                        // 修復頂部空白過多問題
                        height: Platform.select({
                            android: scale(38),
                            default: scale(35),
                        }),
                        paddingTop: 0,
                        // 修復深色模式頂部小白條問題
                        borderBottomWidth: 0,
                    }}
                />

                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', }}>
                        {/* ARK Logo */}
                        <FastImage
                            source={require('../../../static/img/logo.png')}
                            style={{
                                height: iconSize, width: iconSize,
                                borderRadius: scale(5),
                            }}
                        />
                        {/* 標題 */}
                        <View style={{ marginLeft: scale(5), }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(18), color: themeColor, fontWeight: '600' }}>服務一覽</Text>
                        </View>
                    </View>

                    {this.state.functionArr.map(fn_card => {
                        return this.GetFunctionCard(fn_card.title, fn_card.fn);
                    })}

                    <View style={{ marginHorizontal: scale(20), marginVertical: scale(10) }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                alignSelf: 'center',
                                color: COLOR_DIY.black.third,
                            }}>
                            一切內容以官網為準！
                        </Text>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                alignSelf: 'center',
                                color: COLOR_DIY.black.third,
                            }}>
                            長按圖標可複製對應的link ~
                        </Text>
                    </View>
                </ScrollView>

                {/* 彈出層提示 */}
                <DialogDIY
                    showDialog={this.state.showDialog}
                    text={`此功能需要登錄後操作，現在去登錄嗎？\n[]~(￣▽￣)~*`}
                    handleConfirm={() => {
                        this.setState({ showDialog: false });
                        this.props.navigation.navigate('MeTabbar');
                    }}
                    handleCancel={() => this.setState({ showDialog: false })}
                />
            </View>
        );
    }
}

export default inject('RootStore')(Index);
