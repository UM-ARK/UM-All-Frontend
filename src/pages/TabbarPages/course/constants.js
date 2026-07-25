import { moderateScale, verticalScale } from 'react-native-size-matters';

// 與 info/index.js 的頂部 Tab 保持同一組尺寸參數，避免兩個 Tab 頁高度不一致
export const TOP_TAB_SCALE_FACTOR = 0.1;
export const TAB_INDICATOR_WIDTH = moderateScale(25, TOP_TAB_SCALE_FACTOR);
export const TAB_BAR_HEIGHT = moderateScale(30, TOP_TAB_SCALE_FACTOR);
export const TAB_LABEL_FONT_SIZE = moderateScale(11, 0.3);

/** 頂欄總高度（段落 Tab + 輕微內邊距，給右側 ⋯ 留觸控空間） */
export const COURSE_TOP_BAR_HEIGHT = TAB_BAR_HEIGHT + verticalScale(4);
