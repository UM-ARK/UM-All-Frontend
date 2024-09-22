import React, { Component } from 'react';
import {
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    Linking,
    KeyboardAvoidingView,
    TextInput,
    Keyboard,
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
    UM_ISW_NEW,
    NEW_INFOG,
    UM_DOCUMENTS,
    NEW_SCZN,
    NEW_MAINLAND,
    UM_COMMENTS,
    UM_PRE_ENROLMENT_EXCEL,
    UM_IMPORTANT_DATE,
    UM_BULLETIN,
    UM_RC_MENU,
    UM_LOST_FOUND,
    UM_FIND_BOOKS,
    UM_LIB_BOOK,
    UM_PRINT,
    UM_PRINT_BALANCE
} from '../../../utils/pathMap';
import DialogDIY from '../../../components/DialogDIY';
import { logToFirebase } from "../../../utils/firebaseAnalytics";
import { openLink } from "../../../utils/browser";
import { trigger } from "../../../utils/trigger";

import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FlatGrid } from 'react-native-super-grid';
import FastImage from 'react-native-fast-image';
import Clipboard from '@react-native-clipboard/clipboard';
import { inject } from 'mobx-react';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from "react-native-simple-toast";
import TouchableScale from "react-native-touchable-scale";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { t } from "i18next";

// 定義可使用icon，注意大小寫
const iconTypes = {
    ionicons: 'ionicons',
    materialCommunityIcons: 'MaterialCommunityIcons',
    img: 'img',
};

const { themeColor, white, black, } = COLOR_DIY;

const iconSize = scale(25);

class Index extends Component {
    textInputRef = React.createRef(null);

    state = {
        functionArr: [
            {
                title: t('校園服務', { ns: 'features' }),
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'bus-stop',
                        fn_name: t('校園巴士', { ns: 'features' }),
                        needLogin: false,
                        go_where: 'Bus', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'calendar-today',
                        fn_name: t('校曆', { ns: 'features' }),
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
                        fn_name: t('校園地圖', { ns: 'features' }),
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
                        fn_name: t('課室佔用', { ns: 'features' }),
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_CLASSROOM_MAP,
                            title: 'UM 課室佔用 & 使用情況',
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
                        fn_name: t('車位', { ns: 'features' }),
                        needLogin: false,
                        go_where: 'CarPark', // a function
                    },
                    {
                        icon_type: iconTypes.ionicons,
                        icon_name: 'logo-dropbox',
                        fn_name: t('場地預約', { ns: 'features' }),
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_RBS,
                            title: 'UM 場地預約',
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
                        fn_name: t('公共電腦', { ns: 'features' }),
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
                        fn_name: t('儲物箱', { ns: 'features' }),
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
                        fn_name: t('維修預約', { ns: 'features' }),
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
                        fn_name: t('體育預訂', { ns: 'features' }),
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
                        fn_name: t('圖書館', { ns: 'features' }),
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
                        icon_name: 'clipboard-clock',
                        fn_name: t('Lib房間', { ns: 'features' }),
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_LIB_BOOK,
                            title: 'Lib房間',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'passport',
                        fn_name: t('UM Pass', { ns: 'features' }),
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
                        fn_name: t('UM提意見', { ns: 'features' }),
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
                        fn_name: t('電子公告', { ns: 'features' }),
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
                        icon_name: 'cloud-print',
                        fn_name: t('打印', { ns: 'features' }),
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_PRINT,
                            title: '打印',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'printer-search',
                        fn_name: t('打印餘額', { ns: 'features' }),
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_PRINT_BALANCE,
                            title: '打印',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'view-grid-plus',
                        fn_name: t('更多服務', { ns: 'features' }),
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
                title: t('課業 & 發展', { ns: 'features' }),
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
                        fn_name: t('課表模擬', { ns: 'features' }),
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
                        fn_name: t('選咩課', { ns: 'features' }),
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
                        icon_name: 'ab-testing',
                        fn_name: 'New ISW',
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_ISW_NEW,
                            title: 'UM ISW',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'eye-plus',
                        fn_name: t('預選課', { ns: 'features' }),
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
                        fn_name: t('預選表格', { ns: 'features' }),
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
                        fn_name: t('重要日期', { ns: 'features' }),
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
                        fn_name: t('全人發展', { ns: 'features' }),
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
                        fn_name: t('交流', { ns: 'features' }),
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
                        fn_name: t('獎學金', { ns: 'features' }),
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
                        fn_name: t('證明文件', { ns: 'features' }),
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_DOCUMENTS,
                            title: 'UM 證明文件',
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'book-search',
                        fn_name: t('資源搜索', { ns: 'features' }),
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            url: UM_FIND_BOOKS,
                            title: '資源搜索',
                        },
                    },
                ],
            },
            {
                title: t('生活服務', { ns: 'features' }),
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'text-box-check',
                        fn_name: t('失物認領', { ns: 'features' }),
                        needLogin: false,
                        go_where: 'Linking',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_LOST_FOUND,
                            title: '失物認領',
                            // 標題顏色，默認為black.main
                            text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            bg_color_diy: '#005f96',
                            // 狀態欄字體是否黑色，默認true
                            isBarStyleBlack: false,
                        },
                        // go_where: 'LostAndFound',
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
                        fn_name: t('泊車月票', { ns: 'features' }),
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
                        fn_name: t('職位空缺', { ns: 'features' }),
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
                        fn_name: t('書院餐單', { ns: 'features' }),
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
                title: t('新生推薦', { ns: 'features' }),
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'ghost',
                        fn_name: t('生存指南', { ns: 'features' }),
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
                        fn_name: t('內地生', { ns: 'features' }),
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
                        fn_name: t('圖文包', { ns: 'features' }),
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
        inputText: '',
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
                    marginTop: verticalScale(10),
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
                        paddingTop: verticalScale(12),
                    }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: verticalScale(12),
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
                                    size={verticalScale(30)}
                                    color={COLOR_DIY.themeColor}
                                />
                            );
                        } else if (item.icon_type == 'MaterialCommunityIcons') {
                            icon = (
                                <MaterialCommunityIcons
                                    name={item.icon_name}
                                    size={verticalScale(30)}
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
                                        backgroundColor: COLOR_DIY.trueWhite,
                                        height: scale(60),
                                        width: scale(60),
                                    }}
                                />
                            );
                        }

                        let { go_where, webview_param, needLogin } = item;
                        return (
                            <TouchableScale
                                style={{ justifyContent: 'center', alignItems: 'center', }}
                                activeOpacity={0.7}
                                // 跳轉具體頁面
                                onPress={() => {
                                    trigger();
                                    logToFirebase('funcUse', { funcName: item.fn_name });
                                    if (!needLogin || this.state.isLogin) {
                                        setTimeout(() => {
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
                                        }, 50);
                                    } else {
                                        this.setState({ showDialog: true });
                                    }
                                }}
                                // 複製相關網站link
                                onLongPress={() => {
                                    trigger();
                                    if (go_where == 'Webview' || go_where == 'Linking') {
                                        Clipboard.setString(webview_param.url);
                                        Toast.show('已複製Link到剪貼板！');
                                    } else {
                                        Toast.show('這個功能沒有Link可以複製哦！');
                                    }
                                }}
                            >
                                {icon}
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        fontSize: verticalScale(10),
                                        color: COLOR_DIY.black.second,
                                        textAlign: 'center',
                                    }}>
                                    {item.fn_name}
                                </Text>
                            </TouchableScale>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                />
            </View>
        );
    }

    // 搜索框
    renderSearch = () => {
        const { inputText, } = this.state;
        return (
            <KeyboardAvoidingView
                style={{
                    alignItems: 'center', flexDirection: 'row',
                    width: '100%',
                    marginTop: scale(5), paddingHorizontal: scale(10),
                    backgroundColor: 'transparent',
                }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* 搜索框 */}
                <View style={{
                    backgroundColor: white,
                    borderWidth: scale(2), borderColor: themeColor, borderRadius: scale(10),
                    flexDirection: 'row', alignItems: 'center',
                    marginRight: scale(5),
                    paddingHorizontal: scale(5), paddingVertical: scale(3),
                    flex: 1,
                }}>
                    {/* 搜索圖標，引導用戶 */}
                    <Ionicons
                        name={'search'}
                        size={scale(15)}
                        color={black.third}
                    />
                    <TextInput
                        style={{
                            ...uiStyle.defaultText,
                            paddingVertical: verticalScale(3),
                            color: black.main,
                            fontSize: scale(12),
                        }}
                        onChangeText={(inputText) => {
                            this.setState({ inputText });
                        }}
                        value={inputText}
                        selectTextOnFocus
                        placeholder={t("關於澳大的一切...", { ns: 'features' })}
                        placeholderTextColor={black.third}
                        ref={this.textInputRef}
                        onFocus={() => trigger()}
                        returnKeyType={'search'}
                        selectionColor={themeColor}
                        blurOnSubmit={true}
                        onSubmitEditing={() => Keyboard.dismiss()}
                    />
                    {/* 清空搜索框按鈕 */}
                    {inputText.length > 0 ? (
                        <TouchableOpacity
                            onPress={() => {
                                trigger();
                                this.setState({ inputText: '' }, () => {
                                    this.textInputRef.current.focus();
                                })
                            }}
                            style={{ padding: scale(3), marginLeft: 'auto' }}
                        >
                            <Ionicons
                                name={'close-circle'}
                                size={scale(15)}
                                color={inputText.length > 0 ? themeColor : black.third}
                            />
                        </TouchableOpacity>
                    ) : null}
                </View>
                {/* 搜索按鈕 */}
                <TouchableOpacity
                    style={{
                        backgroundColor: inputText == '' ? COLOR_DIY.disabled : themeColor,
                        borderRadius: scale(6),
                        padding: scale(7), paddingHorizontal: scale(8),
                        alignItems: 'center'
                    }}
                    disabled={inputText == ''}
                    onPress={() => {
                        trigger();
                        logToFirebase('funcUse', {
                            funcName: 'searchBar_features',
                            searchBarDetail: inputText,
                        });
                        openLink(`https://www.google.com/search?q=${'site:umall.one OR site:um.edu.mo ' + encodeURIComponent(inputText)}`);
                    }}
                >
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: white, fontWeight: 'bold' }}>{t('搜索')}</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        )
    }

    render() {
        return (
            <SafeAreaInsetsContext.Consumer>{(insets) => <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
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
                            default: insets.top,
                        }),
                        paddingTop: 0,
                        // 修復深色模式頂部小白條問題
                        borderBottomWidth: 0,
                    }}
                />

                <ScrollView showsVerticalScrollIndicator={true} stickyHeaderIndices={[1]} >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: verticalScale(3), }}>
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
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(18), color: themeColor, fontWeight: '600' }}>{t('服務一覽', { ns: 'features' })}</Text>
                        </View>

                        {/* 跳轉設置/關於頁按鈕 */}
                        <TouchableOpacity
                            style={{
                                position: 'absolute', right: scale(10),
                                flexDirection: 'row', alignItems: 'center',
                                backgroundColor: themeColor,
                                borderRadius: scale(5),
                                padding: scale(5),
                            }}
                            onPress={() => {
                                trigger();
                                this.props.navigation.navigate('AboutPage');
                            }}
                        >
                            <Ionicons name={'build'} size={verticalScale(15)} color={white} />
                            <Text style={{ ...uiStyle.defaultText, color: white, fontWeight: 'bold' }}>{t('設置')}</Text>
                        </TouchableOpacity>

                        {/* 組織登入按鈕 */}
                        {false && (
                            <TouchableOpacity style={{
                                position: 'absolute',
                                right: scale(10),
                                backgroundColor: themeColor,
                                borderRadius: scale(5),
                                padding: scale(5),
                            }}
                                onPress={() => {
                                    trigger();
                                    // 跳轉組織登入
                                    this.props.navigation.navigate('ClubLogin');
                                }}
                            >
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: this.state.addMode ? themeColor : white,
                                    fontWeight: 'bold'
                                }}>組織登入</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <>
                        {this.renderSearch()}
                    </>

                    {this.state.functionArr.map(fn_card => {
                        return this.GetFunctionCard(fn_card.title, fn_card.fn);
                    })}

                    <View style={{ marginHorizontal: scale(20), marginVertical: scale(10) }}>
                        {/* <Text
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
                        </Text> */}
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
            </View>}</SafeAreaInsetsContext.Consumer>
        );
    }
}

export default inject('RootStore')(Index);
