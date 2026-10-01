import { Dimensions } from 'react-native';

/**
 * react-native-size-matters 的本地替身（metro.config.js 全平台把該包指向這裡）。
 *
 * 原版算法是「窗口短邊 ÷ 350 × 尺寸」，在 iPad（短邊 1024）與桌面瀏覽器上會把字號、間距
 * 等比放大近 3 倍。這裡沿用同一套 API 與手機上的行為，只在寬屏（短邊 ≥ 600，Material 3
 * 「緊湊」檔位以上）把係數封在 LARGE_WINDOW_SCALE_FACTOR，讓平板／桌面看起來像一台大手機，
 * 多出來的空間交給各頁面自己的寬屏佈局（見 windowSizeClass.js）消化。
 */
const { width, height } = Dimensions.get('window');
const [shortDimension, longDimension] = width < height ? [width, height] : [height, width];

// 與原版一致：基準為 ~5" 手機
const guidelineBaseWidth = 350;
const guidelineBaseHeight = 680;

/** 短邊達此值即視為寬屏，不再隨屏幕等比放大 */
const LARGE_WINDOW_SHORT_DIMENSION = 600;
/** 寬屏統一縮放係數，約等於 iPhone 16 Pro（393 / 350） */
const LARGE_WINDOW_SCALE_FACTOR = 1.15;
/**
 * 最大手機（iPhone Pro Max）的窗口尺寸。窄窗口（Mac 上的 iPad 應用、iPad 分屏）短邊落在 440–600，
 * 按原算法會放大到 1.5 倍以上，比任何手機都大，故按此封頂；真機手機不受影響。
 */
const MAX_PHONE_SHORT_DIMENSION = 440;
const MAX_PHONE_LONG_DIMENSION = 956;

const isLargeWindow = shortDimension >= LARGE_WINDOW_SHORT_DIMENSION;
const widthFactor = isLargeWindow
    ? LARGE_WINDOW_SCALE_FACTOR
    : Math.min(shortDimension, MAX_PHONE_SHORT_DIMENSION) / guidelineBaseWidth;
const heightFactor = isLargeWindow
    ? LARGE_WINDOW_SCALE_FACTOR
    : Math.min(longDimension, MAX_PHONE_LONG_DIMENSION) / guidelineBaseHeight;

export const scale = size => widthFactor * size;
export const verticalScale = size => heightFactor * size;
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;
export const moderateVerticalScale = (size, factor = 0.5) => size + (verticalScale(size) - size) * factor;

export const s = scale;
export const vs = verticalScale;
export const ms = moderateScale;
export const mvs = moderateVerticalScale;
