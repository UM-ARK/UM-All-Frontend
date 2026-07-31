import { scale, verticalScale } from 'react-native-size-matters';

/** 概覽模式每小時的顯示高度 */
export const OVERVIEW_HOUR_HEIGHT = verticalScale(62);
/** 概覽模式課程卡片的最大高度 */
export const OVERVIEW_MAX_COURSE_HEIGHT = verticalScale(120);
/** 概覽課卡可讀最小高度；同欄有空檔時可擴展至此以顯示課室／時間 */
export const OVERVIEW_MIN_COURSE_HEIGHT = verticalScale(56);
/** 預留頂欄、星期列、切換器及底部提示所需高度 */
export const OVERVIEW_RESERVED_HEIGHT = verticalScale(180);
/** 開始時間相差不超過 30 分鐘的課節對齊到同一列 */
export const OVERVIEW_ALIGNMENT_MINUTES = 30;
/** 概覽課卡水平／垂直間距，避免相鄰或並排課卡貼合 */
export const OVERVIEW_COURSE_H_PADDING = scale(2);
export const OVERVIEW_COURSE_H_GAP = scale(2);
export const OVERVIEW_COURSE_V_GAP = verticalScale(3);
