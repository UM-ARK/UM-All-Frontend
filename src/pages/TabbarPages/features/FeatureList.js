import { t } from "i18next";
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
    UM_PRINT_BALANCE,
    SCAME,
    MAIL,
    NEW_REG,
    UM_LIB_USING,
    UM_PAPER_PLAN,
    UM_RC,
    UM_ALUMNI,
    ARK_HARBOR,
} from '../../../utils/pathMap';

const iconTypes = {
    ionicons: 'ionicons',
    materialCommunityIcons: 'MaterialCommunityIcons',
    img: 'img',
};

export const functionArr = [
    {
        title: t('校園資訊', { ns: 'features' }),
        fn: [
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'bus-stop',
                fn_name: t('校園巴士', { ns: 'features' }),
                needLogin: false,
                go_where: 'Bus', // a function
                describe: t('查看校巴到站情況', { ns: 'features' }),
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
                describe: t('查看澳大校曆發佈頁', { ns: 'features' }),
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
                describe: t('查看澳大校園地圖', { ns: 'features' }),
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
                describe: t('查看當前各課室佔用情況', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'car-brake-parking',
                fn_name: t('車位', { ns: 'features' }),
                needLogin: false,
                go_where: 'CarPark', // a function
                describe: t('查看當前澳大停車場剩餘車位', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'console-network',
                fn_name: t('E6電腦', { ns: 'features' }),
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
                describe: t('查看E6電腦室使用情況', { ns: 'features' }),
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
                describe: t('直接前往圖書館主頁，能查看圖書館人數和搜索資源等', { ns: 'features' }),
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
                describe: t('進入UM PASS設置頁面', { ns: 'features' }),
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
                    // text_color: white,
                    bg_color_diy: '#002c55',
                    isBarStyleBlack: false,
                },
                describe: t('查看澳大電子公告，最新的更新（未放到新聞和活動）會在這裡公示', { ns: 'features' }),
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
                describe: t('查看在澳大打印服務的餘額', { ns: 'features' }),
            },
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
                describe: t('查看澳大官方失物認領列表', { ns: 'features' }),
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
                describe: t('查看澳大和其他公司在澳大發佈的招聘', { ns: 'features' }),
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
                describe: t('查看澳大書院菜單', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'school',
                fn_name: t('學生會', { ns: 'features' }),
                needLogin: false,
                go_where: 'Webview',
                webview_param: {
                    url: 'https://info.umsu.org.mo/listdoc?_selector%5Bopen_doc_category_id%5D=1',
                    title: '學生會通告',
                    isBarStyleBlack: false,
                },
                describe: t('查看澳大學生會通告頁', { ns: 'features' }),
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
                describe: t('進入澳大MyUM網頁查看完整功能', { ns: 'features' }),
            },
        ],
    },
    {
        title: t('預約服務', { ns: 'features' }),
        fn: [
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
                describe: t('進入CMMS報修系統，可以對書院等各種設施的問題下單申請維修', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.ionicons,
                icon_name: 'book',
                fn_name: t('Lib佔用', { ns: 'features' }),
                needLogin: false,
                go_where: 'Linking',
                webview_param: {
                    url: UM_LIB_USING,
                    title: 'UM 圖書館資源佔用',
                    text_color: '#010101',
                },
                describe: t('包含圖書館的電腦、房間佔用情況、其他科技資訊等', { ns: 'features' }),
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
                describe: t('預約澳大體育場館的使用', { ns: 'features' }),
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
                describe: t('預約E6等建築的房間、場地', { ns: 'features' }),
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
                describe: t('預約圖書館房間', { ns: 'features' }),
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
                describe: t('可以線上傳文件，到E6等地方使用有Web Print標識的打印機打印', { ns: 'features' }),
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
                describe: t('為UM的各部門提意見，校方會對意見做出回應', { ns: 'features' }),
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
                describe: t('租用教學樓見到的鐵櫃儲物箱', { ns: 'features' }),
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
                describe: t('申請澳大的停車月票', { ns: 'features' }),
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
                describe: t('申請澳大相關的證明文件、學生證補辦等', { ns: 'features' }),
            },
        ],
    },
    {
        title: t('課業發展', { ns: 'features' }),
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
                describe: t('UM Moodle，不想錯過DDL就要常看，可以把TimeLine板塊移動到最上方', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'file-document-edit-outline',
                fn_name: 'Wiki',
                needLogin: false,
                go_where: 'Wiki', // a function
                describe: t('ARK Wiki，希望集成澳大的所有資訊、攻略、學習方法等', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'table-clock',
                fn_name: t('課表模擬', { ns: 'features' }),
                needLogin: false,
                go_where: 'CourseSimTab',
                describe: t('ARK課表模擬功能，選課時不用再對著Excel自己慢慢找啦！', { ns: 'features' }),
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
                describe: t('選咩課，UM Helper開發的課程評論網站', { ns: 'features' }),
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
                describe: t('舊版ISW，看分、課表、繳費、個人資料設定等重要網站', { ns: 'features' }),
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
                describe: t('全新版本的ISW，估計未來會主推這個系統', { ns: 'features' }),
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
                describe: t('預選課網站入口，一般在學期結尾進行', { ns: 'features' }),
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
                describe: t('進入澳大的預選表格、開課時間表的發佈頁', { ns: 'features' }),
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
                describe: t('Add Drop課的入口，在學期開始前', { ns: 'features' }),
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
                describe: t('查看澳大本學年的重要日期，包括預選課、增補選、考試等重要時間點', { ns: 'features' }),
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
                describe: t('全人發展計劃的入口，拿到夠多的分數還有獎品', { ns: 'features' }),
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
                describe: t('申請澳大的出外交流項目', { ns: 'features' }),
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
                describe: t('查看澳大獎學金介紹頁', { ns: 'features' }),
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
                describe: t('進入澳大圖書館的資源搜索頁，搜索澳大已購買的文獻資料、教科書等', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'typewriter',
                fn_name: t('論文計劃', { ns: 'features' }),
                needLogin: false,
                go_where: 'Linking',
                webview_param: {
                    url: UM_PAPER_PLAN,
                    title: '論文計劃',
                },
                describe: t('你的論文計劃小幫手', { ns: 'features' }),
            },
        ],
    },
    {
        title: t('新生推薦', { ns: 'features' }),
        fn: [
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'forum',
                fn_name: t('職涯港', { ns: 'features' }),
                needLogin: false,
                go_where: 'Webview',
                webview_param: {
                    url: ARK_HARBOR,
                    title: '新鮮人要知道的億些Tips',
                    // text_color: black.second,
                    bg_color_diy: '#ededed',
                },
                describe: t('ARK職涯港論壇！求職、美食、校友應有盡有！', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'ghost',
                fn_name: t('生存指南', { ns: 'features' }),
                needLogin: false,
                go_where: 'Webview',
                webview_param: {
                    url: NEW_SCZN,
                    title: '新鮮人要知道的億些Tips',
                    // text_color: black.second,
                    bg_color_diy: '#ededed',
                },
                describe: t('澳大生存指南公眾號歷史推文', { ns: 'features' }),
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
                    // text_color: black.second,
                    bg_color_diy: '#ededed',
                },
                describe: t('澳大生存指南公眾號給內地新生的一些指南建議', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'account-box',
                fn_name: t('新生註冊', { ns: 'features' }),
                needLogin: false,
                go_where: 'Webview',
                webview_param: {
                    url: NEW_REG,
                    title: '新生註冊',
                    text_color: '#012d56',
                    bg_color_diy: '#fff',
                },
                describe: t('新生註冊圖文包及相關資料', { ns: 'features' }),
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
                describe: t('澳大官方出品的新生圖文包，包括EELC等課程要求', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'account-cash',
                fn_name: t('防詐騙', { ns: 'features' }),
                needLogin: false,
                go_where: 'Webview',
                webview_param: {
                    url: SCAME,
                    title: '防詐騙',
                    text_color: '#012d56',
                    bg_color_diy: '#fff',
                },
                describe: t('防詐騙圖文包，外地同學初次到達澳門要注意！', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'account-supervisor-circle',
                fn_name: t('書院', { ns: 'features' }),
                needLogin: false,
                go_where: 'Webview',
                webview_param: {
                    url: UM_RC,
                    title: '書院',
                    text_color: '#012d56',
                    bg_color_diy: '#fff',
                },
                describe: t('書院大全，快捷找到對應書院主頁', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'account-multiple',
                fn_name: t('校友會', { ns: 'features' }),
                needLogin: false,
                go_where: 'Webview',
                webview_param: {
                    url: UM_ALUMNI,
                    title: '校友會',
                    text_color: '#012d56',
                    bg_color_diy: '#fff',
                },
                describe: t('UM校友會，也可以找到其他校友相關資訊的網站', { ns: 'features' }),
            },
            {
                icon_type: iconTypes.materialCommunityIcons,
                icon_name: 'account-multiple',
                fn_name: t('澳大部門', { ns: 'features' }),
                needLogin: false,
                go_where: 'UMOrg',
                describe: t('UM部門，提供各種校內部門的資訊', { ns: 'features' }),
            },
        ],
    },
]