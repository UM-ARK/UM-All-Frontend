// 網站地址映射

// TODO: 服務器基地址，其他分地址可以直接寫'/bus'、'/login'
export const BASE_URI = 'https://ark.boxz.dev/api/';

export const GET = {
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
    // 按活動id獲取活動列表
    EVENT_INFO_EVENT_ID: 'get_activity/id/?id=',
}

export const POST = {
    // 修改社團info
    CLUB_EDIT_INFO : 'edit_club_info/',
    // 創建活動
    EVENT_CREATE: 'create_activity/',
    // 修改活動info
    EVENT_EDIT: 'edit_activity/',
}

export const ARK_LETTER_IMG = 'https://ark.boxz.dev/static/logo.png';


// Webview 服務
// 選咩課
export const WHAT_2_REG = 'https://www.umeh.top';
// 澳大討論區
export const UM_WHOLE = 'https://umbbs.xyz';

// 澳大 - API 車位
export const UM_API_CAR_PARK = 'https://api.data.um.edu.mo/service/facilities/car_park_availability/v1.0.0/all';
// 澳大 - API 活動
export const UM_API_EVENT = 'https://api.data.um.edu.mo/service/media/events/v1.0.0/all';

// 澳大 Webview
// 澳大 - 環校巴士報站
export const UM_BUS_LOOP = 'https://campusloop.cmdo.um.edu.mo/zh_TW/busstopinfo';
// 澳大 - 校曆
export const UM_CALENDAR = 'https://reg.um.edu.mo/university-almanac/?lang=zh-hant';
// 澳大 - 校園地圖
export const UM_MAP = 'https://maps.um.edu.mo';
// 澳大 - 課室地圖
export const UM_CLASSROOM_MAP = 'https://isw.um.edu.mo/umclassroom';
// 澳大 - 資源借用 Resource Booking System，例如E6房間
export const UM_RBS = 'https://isw.um.edu.mo/umresource/schedule.php';
// 澳大 - 公共電腦室使用情況
export const UM_COMPUTER_ROOM = 'https://computerroom.icto.um.edu.mo';
// 澳大 - 儲物箱租借
export const UM_LOCKER = 'https://isw.um.edu.mo/lockerRental/zh_TW/student/myagreement';
// 澳大 - 維修預約，例如書院房間傢私維修等
export const UM_CMMS = 'https://cmms.um.edu.mo';
// 澳大 - 體育場所預約
export const UM_SPORT_BOOKING = 'https://isw.um.edu.mo/cdweb/pages/booking';
// 澳大 - 圖書館
export const UM_LIBRARY = 'https://library.um.edu.mo';
// 澳大 - UM Pass
export const UM_PASS = 'https://umpass.um.edu.mo';
// 澳大 - UM Portal
export const UM_PORTAL = 'https://myum.um.edu.mo/portal';


// 學業發展分類
// 澳大 - UM Moodle
export const UM_Moodle = 'https://ummoodle.um.edu.mo/my';
// 澳大 - UM ISW
export const UM_ISW = 'https://isw.um.edu.mo/siapp/faces/home';
// 澳大 - UM 預選課
export const UM_PRE_ENROLMENT = 'https://isw.um.edu.mo/sipeweb/faces/login.jspx';
// 澳大 - UM 選課模擬系統
export const UM_COURSE_SIMU = 'https://kchomacau.github.io/timetable';
// 澳大 - UM Add/Drop
export const UM_ADD_DROP = 'https://isw.um.edu.mo/siwad';
// 澳大 - UM 全人發展
export const UM_WHOLE_PERSON = 'https://isw.um.edu.mo/wp/faces/app/stud/MyRecord.jspx';
// 澳大 - 交流項目
export const UM_EXCHANGE = 'https://isw.um.edu.mo/seas';
// 澳大 - 獎學金
export const UM_SCHOLARSHIP = 'https://sds.sao.um.edu.mo/whole-person-nurturing/scholarship-and-awards/?lang=zh-hant';
// 澳大 - 失物認領
export const UM_LOST_FOUND = 'https://um2.umac.mo/apps/com/umlostfound.nsf';
// 澳大 - 泊車月票
export const UM_PARK_APPLY = 'https://isw.um.edu.mo/parkmpapp/application';
// 澳大 - 職位空缺系統
export const UM_JOB_SYSTEM = 'https://isw.um.edu.mo/umsjv/zh_TW';


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
