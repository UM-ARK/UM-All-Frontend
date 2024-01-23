// 網站地址映射

// 服務器基地址，其他分地址可以直接寫'/bus'、'/login'
export const BASE_URI = 'https://umall.one/api/';
// 用適配API返回的圖片相對路徑
export const BASE_HOST = 'https://umall.one';

export const APPSTORE_URL = 'https://apps.apple.com/us/app/um-all/id1636670554';

export const MAIL = 'umacark@gmail.com';

export const GITHUB_PAGE = 'https://github.com/UM-ARK';

export const GITHUB_DONATE = 'https://github.com/UM-ARK/Donate';

export const GITHUB_FRONT_BASE = 'https://github.com/UM-ARK/UM-All-Frontend/';

export const GITHUB_UPDATE_PLAN = GITHUB_FRONT_BASE + 'issues';

export const GITHUB_ACTIVITY = GITHUB_FRONT_BASE + 'activity';

export const ARK_WIKI = 'https://wiki.umall.one';

export const ARK_WIKI_SEARCH = ARK_WIKI + '/wiki/Special:Search?search=';

export const ARK_WIKI_ABOUT_ARK = ARK_WIKI + '/wiki/ARK_ALL';

export const ARK_WIKI_PAGE = ARK_WIKI + '/wiki/';

export const ARK_WIKI_RANDOM_PAGE = ARK_WIKI + '/wiki/Special:Random';

export const ARK_WIKI_RANDOM_TITLE = ARK_WIKI + '/api.php?action=query&format=json&list=random&rnlimit=1&rnnamespace=0';

export const OFFICIAL_COURSE_SEARCH = 'https://isw.umac.mo/siwci/faces/courseDetailUG?courseCode=';

export function addHost(itm) {
    if (itm.length > 0) {
        return BASE_HOST + itm;
    } else {
        return itm;
    }
}

export const GET = {
    // 獲取APP info
    APP_INFO: 'get_appInfo/',
    // 社團登錄
    CLUB_SIGN_IN: 'club_signin/',

    // 獲取所有社團info
    CLUB_INFO_ALL: 'get_club_info/all',
    // 按club num獲取社團info
    CLUB_INFO_NUM: 'get_club_info/club_num/?club_num=',

    // 獲取所有活動
    EVENT_INFO_ALL: 'get_activity/all',
    // 按Club num獲取活動列表
    EVENT_INFO_CLUB_NUM: 'get_activity/club_num/?club_num=',
    EVENT_INFO_CLUB_NUM_P: 'get_activity/club_num/',
    // 按活動id獲取活動列表
    EVENT_INFO_EVENT_ID: 'get_activity/id/?id=',

    // 獲取follow的活動
    FOLLOW_EVENT: 'get_follow_activity/',
    // 獲取follow的社團
    FOLLOW_CLUB: 'get_follow_club/',

    // 獲取公告
    NOTICE: 'get_notice/',
    NOTICE_MODE: {
        event: 'activity/',
        club: 'club/',
        all: 'all/',
    },
};

export const POST = {
    // 學生登錄
    STD_LOGIN: 'student_signin/',
    // 修改社團info
    CLUB_EDIT_INFO: 'edit_club_info/',
    // 創建活動
    EVENT_CREATE: 'create_activity/',
    // 修改活動info
    EVENT_EDIT: 'edit_activity/',
    // 刪除活動
    EVENT_DEL: 'delete_activity/',

    // 學生add follow活動
    ADD_FOLLOW_EVENT: 'student_add_follow_activity/',
    // del follow活動
    DEL_FOLLOW_EVENT: 'student_del_follow_activity/',
    // add follow組織
    ADD_FOLLOW_CLUB: 'student_add_follow_club/',
    // del follow組織
    DEL_FOLLOW_CLUB: 'student_del_follow_club/',

    // 新增公告
    NOTICE_CREATE: 'create_notice/',
};

export const ARK_LETTER_IMG = 'https://umall.one/static/ark_letter.png';
export const UMALL_LOGO = 'https://umall.one/static/logo.png';

// 用戶協議
export const USER_AGREE = 'https://umall.one/user_agreement.html';
// 常見問題
export const USUAL_Q = 'https://umall.one/qa.html';

// Webview 服務
// 選咩課
export const WHAT_2_REG = 'https://www.umeh.top';
// 澳大討論區
export const UM_WHOLE = 'https://umbbs.xyz';

// 選咩課API
export const UMEH_URI = "https://mpserver.umeh.top/";
export const UMEH_API = {
    GET: {
        // 根據課程編號返回信息
        COURSE_INFO: "course_info?New_code=",
        COURSE_COMMENT: {
            CODE: "comment_info/?New_code=",
            PROF: "&prof_name="
        },
        // 字母全大寫
        PROF: "prof_info?name=",
        // 模糊搜索
        // FUZZY: "fuzzy_search?text=Test&type=course/prof/title",
        FUZZY: "fuzzy_search?text=",
        // 返回統計數據
        STAT: "get_stat"
    },
    POST: {
        SUBMIT_COMMENT: "submit_comment/"
    }
};

// 澳大 - API 車位
export const UM_API_CAR_PARK =
    'https://api.data.um.edu.mo/service/facilities/car_park_availability/v1.0.0/all';
// 澳大 - API 活動
export const UM_API_EVENT =
    'https://api.data.um.edu.mo/service/media/events/v1.0.0/all';
// 澳大 - API 新聞
export const UM_API_NEWS =
    'https://api.data.um.edu.mo/service/media/news/v1.0.0/all';
// 澳大 - API token
export const UM_API_TOKEN = '';

// 澳大 Webview
// 澳大 - 環校巴士報站
export const UM_BUS_LOOP =
    'https://campusloop.cmdo.um.edu.mo/zh_TW/busstopinfo';
// 澳大 - 校曆
export const UM_CALENDAR =
    'https://reg.um.edu.mo/university-almanac/?lang=zh-hant';
// 澳大 - 校園地圖
export const UM_MAP = 'https://maps.um.edu.mo';
// 澳大 - 課室地圖
export const UM_CLASSROOM_MAP = 'https://isw.um.edu.mo/umclassroom';
// 澳大 - 資源借用 Resource Booking System，例如E6房間
export const UM_RBS = 'https://isw.um.edu.mo/umresource/schedule.php';
// 澳大 - 公共電腦室使用情況
export const UM_COMPUTER_ROOM = 'https://computerroom.icto.um.edu.mo';
// 澳大 - 儲物箱租借
export const UM_LOCKER =
    'https://isw.um.edu.mo/lockerRental/zh_TW/student/myagreement';
// 澳大 - 維修預約，例如書院房間傢私維修等
export const UM_CMMS = 'https://cmms.um.edu.mo';
// 澳大 - 體育場所預約
export const UM_SPORT_BOOKING = 'https://isw.um.edu.mo/cdweb/pages/booking';
// 澳大 - 圖書館
export const UM_LIBRARY = 'https://library.um.edu.mo';
// 澳大 - UM Pass
export const UM_PASS = 'https://umpass.um.edu.mo';
// 澳大 - 好意見計劃
export const UM_COMMENTS = 'https://isw.umac.mo/qmweb/faces/app/addComments.jspx';
// 澳大 - UM Portal
export const UM_PORTAL = 'https://myum.um.edu.mo/portal';
// 澳大 - 學生電子公告
export const UM_BULLETIN = 'https://e-bulletin.um.edu.mo/';

// 學業發展分類
// 澳大 - UM Moodle
export const UM_Moodle = 'https://ummoodle.um.edu.mo/my/';
// 澳大 - UM ISW
export const UM_ISW = 'https://isw.um.edu.mo/siweb/faces/login.jspx';
// 澳大 - UM 預選課
export const UM_PRE_ENROLMENT =
    'https://isw.um.edu.mo/sipeweb/faces/login.jspx';
// 澳大 - UM 選課模擬系統
export const UM_COURSE_SIMU = 'https://kchomacau.github.io/timetable';
// 澳大 - UM Add/Drop
export const UM_ADD_DROP = 'https://isw.um.edu.mo/siwad';
// 澳大 - UM 全人發展
export const UM_WHOLE_PERSON =
    'https://isw.um.edu.mo/wp/faces/app/stud/MyRecord.jspx';
// 澳大 - 交流項目
export const UM_EXCHANGE = 'https://isw.um.edu.mo/seas';
// 澳大 - 獎學金
export const UM_SCHOLARSHIP =
    'https://sds.sao.um.edu.mo/whole-person-nurturing/scholarship-and-awards/?lang=zh-hant';
// 澳大 - 證明文件
export const UM_DOCUMENTS = 'https://ops.fo.um.edu.mo/services/?lang=zh-hant';
// 澳大 - 預選課Excel表格
export const UM_PRE_ENROLMENT_EXCEL = 'https://reg.um.edu.mo/current-students/enrolment-and-examinations/course-enrolment/pre-enrolment/?lang=zh-hant';
// 澳大 - 重要日期
export const UM_IMPORTANT_DATE = 'https://reg.um.edu.mo/current-students/enrolment-and-examinations/important-dates/?lang=zh-hant';

// 澳大 - 失物認領
export const UM_LOST_FOUND = 'https://um2.umac.mo/apps/com/umlostfound.nsf';
// 澳大 - 泊車月票
export const UM_PARK_APPLY = 'https://isw.um.edu.mo/parkmpapp/application';
// 澳大 - 職位空缺系統
export const UM_JOB_SYSTEM = 'https://isw.um.edu.mo/umsjv/zh_TW';
// 澳大 - 書院餐單
export const UM_RC_MENU = 'https://rc.um.edu.mo/rcmenu/';

// 書院 - 職位空缺系統
export const CO_EPORTFOLIO = 'https://eportfolio.um.edu.mo';
// 書院 - 曹光彪
export const CO_CKPC = 'https://ckpc.rc.um.edu.mo';
// 書院 - 鄭裕彤
export const CO_CYTC = 'https://cytc.rc.um.edu.mo';
// 書院 - 張昆侖
export const CO_CKLC = 'https://cklc.rc.um.edu.mo';
// 書院 - 蔡繼有
export const CO_CKYC = 'https://ckyc.rc.um.edu.mo';
// 書院 - 霍英東
export const CO_HFPJC = 'https://hfpjc.rc.um.edu.mo';
// 書院 - 呂誌和
export const CO_LCWC = 'https://lcwc.rc.um.edu.mo';
// 書院 - 馬萬祺羅柏心
export const CO_MLC = 'https://mlc.rc.um.edu.mo';
// 書院 - 滿珍
export const CO_MCMC = 'https://mcmc.rc.um.edu.mo';
// 書院 - 邵邦
export const CO_SPC = 'https://spc.rc.um.edu.mo';
// 書院 - 何鴻燊
export const CO_SHEAC = 'https://sheac.rc.um.edu.mo';

// 學校行政 - 官網
export const OF_BASE = 'https://www.um.edu.mo';

// 迎新推薦 - 官網圖文包
export const NEW_INFOG = 'https://reg.um.edu.mo/infographic/?lang=zh-hant';
// 生存指南
export const NEW_SCZN =
    'https://mp.weixin.qq.com/mp/appmsgalbum?action=getalbum&album_id=1463637399816323072';
// 內地生指南
export const NEW_MAINLAND =
    'https://mp.weixin.qq.com/mp/appmsgalbum?action=getalbum&album_id=2476350502922977281';
