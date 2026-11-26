import { moderateScale } from 'react-native-size-matters';

/** 寬屏分屏的頂欄標題字號 */
export const TAB_LABEL_FONT_SIZE = moderateScale(11, 0.3);

/**
 * 寬屏分屏時左欄搵課的默認寬度：篩選面板 360 + 一條卡片車道，剛好讓搵課自己也左右分欄
 * （其門檻 840），課表拿走其餘空間。用戶可拖分隔線調整，結果持久化。
 */
export const SEARCH_PANE_DEFAULT_WIDTH = 900;

/** 寬屏分屏時左欄搵課的最小寬度：再窄搜索欄與篩選面板就擺不下 */
export const SEARCH_PANE_MIN_WIDTH = 480;

/**
 * 寬屏分屏時右欄課表的最小寬度：課表按一台手機（scale 封頂後約 iPhone 16 Pro 的 402）設計，
 * 至少要有一台手機的寬度才能沿用手機排版。
 */
export const TIMETABLE_PANE_MIN_WIDTH = 420;

/** 分屏左欄寬度的本地存儲 key */
export const SPLIT_PANE_WIDTH_STORAGE_KEY = 'ARK_Course_SplitPaneWidth';

/** 時段篩選預設全天範圍 */
export const DEFAULT_TIME_FROM = '00:00';
export const DEFAULT_TIME_TO = '23:59';

/** 時段篩選預設：上午／下午／晚上（一鍵設定 from-to） */
export const TIME_RANGE_PRESETS = [
    {id: 'morning', labelKey: '上午', from: '00:00', to: '12:00'},
    {id: 'afternoon', labelKey: '下午', from: '12:00', to: '18:00'},
    {id: 'evening', labelKey: '晚上', from: '18:00', to: '23:59'},
];
