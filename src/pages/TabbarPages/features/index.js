import React, {Component} from 'react';
import {ScrollView, Text, View, TouchableOpacity, Alert} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
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
    UM_LOST_FOUND,
    UM_PARK_APPLY,
    UM_JOB_SYSTEM,
    UM_CLASSROOM_MAP,
    UM_PASS,
    CO_EPORTFOLIO,
    CO_CKPC,
    CO_CYTC,
    CO_CKLC,
    CO_CKYC,
    CO_HFPJC,
    CO_LCWC,
    CO_MLC,
    CO_MCMC,
    CO_SPC,
    CO_SHEAC,
    OF_BASE,
    UM_LIBRARY,
    UM_WHOLE,
    UM_COURSE_SIMU,
} from '../../../utils/pathMap';
import DialogDIY from '../../../components/DialogDIY';

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {FlatGrid} from 'react-native-super-grid';
import FastImage from 'react-native-fast-image';
import Clipboard from '@react-native-clipboard/clipboard';
import {inject} from 'mobx-react';

// 定義可使用icon，注意大小寫
const iconTypes = {
    ionicons: 'ionicons',
    materialCommunityIcons: 'MaterialCommunityIcons',
    img: 'img',
};

class Index extends Component {
    state = {
        functionArr: [
            {
                title: '校园服务',
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'bus-stop',
                        fn_name: '校园巴士',
                        go_where: 'Bus', // a function
                    },
                    // TODO: 爬蟲
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'calendar-today',
                        fn_name: '校曆',
                        go_where: 'Webview',
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
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_MAP,
                            title: 'UM 校園地圖',
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
                        icon_name: 'map-marker-multiple',
                        fn_name: '課室地圖',
                        go_where: 'Webview',
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
                    // TODO: 車位用Webview還是API
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'car-brake-parking',
                        fn_name: '車位',
                        go_where: 'CarPark', // a function
                    },
                    {
                        icon_type: iconTypes.ionicons,
                        icon_name: 'logo-dropbox',
                        fn_name: '資源借用',
                        go_where: 'Webview',
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
                        go_where: 'Webview',
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
                        go_where: 'Webview',
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
                        go_where: 'Webview',
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
                    // TODO: 圖書館有東西可以爬蟲嗎
                    {
                        icon_type: iconTypes.ionicons,
                        icon_name: 'library',
                        fn_name: '圖書館',
                        go_where: 'Webview',
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
                        go_where: 'Webview',
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
                    // TODO: UM Portal，如果後期全部整合完畢就可以刪除該入口
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'view-grid-plus',
                        fn_name: '更多服務',
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_PORTAL,
                            title: 'UM Protal',
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
                        go_where: 'Webview',
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
                        icon_name: 'database-search',
                        fn_name: '選咩課',
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
                        icon_name: 'eye-plus',
                        fn_name: '預選課',
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_PRE_ENROLMENT,
                            title: '預選課(建議在電腦操作)',
                            // 標題顏色，默認為black.main
                            // text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: '#1278d1',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'bank-plus',
                        fn_name: 'Add Drop',
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_ADD_DROP,
                            title: '增補選(建議在電腦操作)',
                            // 標題顏色，默認為black.main
                            // text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: '#1278d1',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    // TODO: 或許可以學習源碼整合成手機端操作
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'clipboard-edit',
                        fn_name: '課表模擬',
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_COURSE_SIMU,
                            title: '課表模擬(建議在電腦操作)',
                            // 標題顏色，默認為black.main
                            // text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: '#1278d1',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    // TODO: 爬蟲還是Webview
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        // icon_name:"account-star",
                        icon_name: 'cow',
                        fn_name: '全人發展',
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_WHOLE_PERSON,
                            title: '全人發展',
                            // 標題顏色，默認為black.main
                            // text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: '#1278d1',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    // TODO: SIW爬蟲
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'ab-testing',
                        fn_name: '成績',
                        go_where: '', // a function
                    },
                    // TODO: SIW爬蟲
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'counter',
                        fn_name: '學分',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'dolphin',
                        fn_name: '交流',
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_EXCHANGE,
                            title: 'UM 交流機會申請',
                            // 標題顏色，默認為black.main
                            // text_color: '#fff',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: '#1278d1',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        },
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'dice-multiple',
                        fn_name: '獎學金',
                        go_where: 'Webview',
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
                ],
            },
            {
                title: '生活服務',
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'coffee-outline',
                        fn_name: '澳大論壇',
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_WHOLE,
                            title: '澳大論壇',
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
                        icon_name: 'text-box-check',
                        fn_name: '失物認領',
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
                        go_where: 'Webview',
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
                        go_where: 'Webview',
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
                ],
            },
            // {
            //     title: '書院主頁',
            //     fn: [
            //         {
            //             icon_type: iconTypes.img,
            //             icon_name:
            //                 'https://www.um.edu.mo/wp-content/uploads/2020/09/1_CKPC.png',
            //             fn_name: 'CKPC',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_CKPC,
            //                 title: 'CKPC',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#9e2a2c',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.img,
            //             icon_name:
            //                 'https://www.um.edu.mo/wp-content/uploads/2020/09/2_Cheng-Yu-Tung-College_square-1024x1024.png',
            //             fn_name: 'CYTC',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_CYTC,
            //                 title: 'CYTC',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#6f40a3',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.img,
            //             icon_name:
            //                 'https://www.um.edu.mo/wp-content/uploads/2020/09/3_Cheong-Kun-Lun-College_square-1024x1024.png',
            //             fn_name: 'CKLC',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_CKLC,
            //                 title: 'CKLC',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#880810',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.img,
            //             icon_name:
            //                 'https://rc.um.edu.mo/wp-content/uploads/2020/09/Logo_collection_2-05-1024x1024.png',
            //             fn_name: 'CKYC',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_CKYC,
            //                 title: 'CKYC',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#9bcbeb',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.img,
            //             icon_name:
            //                 'https://www.um.edu.mo/wp-content/uploads/2020/09/5_Henry-Fok-Pearl-Jubilee-College_square-1024x1024.png',
            //             fn_name: 'HFPJC',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_HFPJC,
            //                 title: 'HFPJC',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#ed7201',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.img,
            //             icon_name:
            //                 'https://www.um.edu.mo/wp-content/uploads/2020/09/6_Lui-Che-Woo-College_square-1024x1024.png',
            //             fn_name: 'LCWC',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_LCWC,
            //                 title: 'LCWC',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#1759a7',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.img,
            //             icon_name:
            //                 'https://www.um.edu.mo/wp-content/uploads/2020/09/7_Ma-Man-Kei-and-Lo-Pak-Sam-College_square-1024x1024.png',
            //             fn_name: 'MLC',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_MLC,
            //                 title: 'MLC',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#0f7562',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.img,
            //             icon_name:
            //                 'https://www.um.edu.mo/wp-content/uploads/2020/09/8_Moon-Chun-Memorial-College_square-1024x1024.png',
            //             fn_name: 'MCMC',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_MCMC,
            //                 title: 'MCMC',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#f3d54f',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.img,
            //             icon_name:
            //                 'https://www.um.edu.mo/wp-content/uploads/2020/09/9_Shiu-Pong-College_square-1024x1024.png',
            //             fn_name: 'SPC',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_SPC,
            //                 title: 'SPC',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#017b34',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.img,
            //             icon_name:
            //                 'https://www.um.edu.mo/wp-content/uploads/2020/09/10_Stanley-Ho-East-Asia-College_square-1024x1024.png',
            //             fn_name: 'SHEAC',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_SHEAC,
            //                 title: 'SHEAC',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#102e4b',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'file-document-edit',
            //             fn_name: 'ePortfolio',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: CO_EPORTFOLIO,
            //                 title: 'ePortfolio',
            //                 // 標題顏色，默認為black.main
            //                 // text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 // bg_color_diy: '#23407d',
            //                 // 狀態欄字體是否黑色，默認true
            //                 // isBarStyleBlack: false,
            //             },
            //         },
            //     ],
            // },
            // TODO: 考慮使用另一種列表展示，部門名字太長不方便
            // {
            //     title: '部門主頁',
            //     fn: [
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'web',
            //             fn_name: '官網',
            //             go_where: 'Webview',
            //             webview_param: {
            //                 // import pathMap的鏈接進行跳轉
            //                 url: OF_BASE,
            //                 title: '澳大官網',
            //                 // 標題顏色，默認為black.main
            //                 text_color: '#fff',
            //                 // 標題背景顏色，默認為bg_color
            //                 bg_color_diy: '#012d56',
            //                 // 狀態欄字體是否黑色，默認true
            //                 isBarStyleBlack: false,
            //             },
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '學務部',
            //             go_where: '', // a function
            //         },
            //     ],
            // },
            // {
            //     title: '學院主頁',
            //     fn: [
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '人文',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '工商管理',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '教育',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '健康科學',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '法學',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '科技',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '社會科學',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '人社研',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '物材研',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '中藥研',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '協創研',
            //             go_where: '', // a function
            //         },
            //         {
            //             icon_type: iconTypes.materialCommunityIcons,
            //             icon_name: 'people',
            //             fn_name: '微電研',
            //             go_where: '', // a function
            //         },
            //     ],
            // },

            // TODO: 新生推薦
            {
                title: '新生推薦',
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'coffee-outline',
                        fn_name: '澳大論壇',
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_WHOLE,
                            title: '澳大論壇',
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
                        icon_name: 'text-box-check',
                        fn_name: '失物認領',
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_LOST_FOUND,
                            title: '失物認領',
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
                        icon_name: 'car-multiple',
                        fn_name: '泊車月票',
                        go_where: 'Webview',
                        webview_param: {
                            // import pathMap的鏈接進行跳轉
                            url: UM_PARK_APPLY,
                            title: '泊車月票申請',
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
                        icon_name: 'human-dolly',
                        fn_name: '職位空缺',
                        go_where: 'Webview',
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
                ],
            },
            // 澳大圖文包：https://reg.um.edu.mo/university-almanac/?lang=zh-hant
        ],
    };

    GetFunctionCard(title, fn_list) {
        // title為分類大標題，fn_list為該分類下有的功能圖標
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: COLOR_DIY.bg_color,
                    borderRadius: pxToDp(10),
                    margin: pxToDp(15),
                    marginTop: pxToDp(5),
                    // 增加陰影
                    ...COLOR_DIY.viewShadow,
                }}>
                {/* 服務分類標題 */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: pxToDp(12),
                        paddingTop: pxToDp(12),
                    }}>
                    <Text
                        style={{
                            fontSize: pxToDp(12),
                            color: COLOR_DIY.black.main,
                            fontWeight: 'bold',
                        }}>
                        {title}
                    </Text>
                </View>

                <FlatGrid
                    maxItemsPerRow={5}
                    itemDimension={pxToDp(50)}
                    spacing={pxToDp(10)}
                    data={fn_list}
                    renderItem={({item}) => {
                        // 索引出相關服務的icon
                        let icon = null;
                        if (item.icon_type == 'ionicons') {
                            icon = (
                                <Ionicons
                                    name={item.icon_name}
                                    size={pxToDp(30)}
                                    color={COLOR_DIY.themeColor}
                                />
                            );
                        } else if (item.icon_type == 'MaterialCommunityIcons') {
                            icon = (
                                <MaterialCommunityIcons
                                    name={item.icon_name}
                                    size={pxToDp(30)}
                                    color={COLOR_DIY.themeColor}
                                />
                            );
                        } else if (item.icon_type == 'img') {
                            icon = (
                                <FastImage
                                    source={{uri: item.icon_name}}
                                    style={{
                                        height: pxToDp(60),
                                        width: pxToDp(60),
                                    }}
                                />
                            );
                        }

                        let {go_where, webview_param} = item;
                        return (
                            <TouchableOpacity
                                style={{
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                                activeOpacity={0.7}
                                // 跳轉具體頁面
                                onPress={() => {
                                    // 跳轉對應本地頁面
                                    if (go_where != 'Webview') {
                                        this.props.navigation.navigate(
                                            go_where,
                                        );
                                    }
                                    // Webview頁面，需附帶跳轉參數
                                    else {
                                        this.props.navigation.navigate(
                                            'Webviewer',
                                            webview_param,
                                        );
                                    }
                                }}
                                // 複製相關網站link
                                onLongPress={() => {
                                    if (go_where == 'Webview') {
                                        Clipboard.setString(webview_param.url);
                                        Alert.alert('已複製網站Link到剪貼板！');
                                    }
                                }}>
                                {icon}
                                <Text
                                    style={{
                                        fontSize: pxToDp(12),
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
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    centerComponent={{
                        text: '（づ￣3￣）づ',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                    }}
                />
                <ScrollView>
                    {this.state.functionArr.map(fn_card => {
                        return this.GetFunctionCard(fn_card.title, fn_card.fn);
                    })}

                    <View style={{marginBottom: pxToDp(100)}} />
                </ScrollView>
            </View>
        );
    }
}

export default inject('RootStore')(Index);
