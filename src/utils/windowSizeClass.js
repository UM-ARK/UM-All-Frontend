import { useWindowDimensions } from 'react-native';

/**
 * 窗口尺寸等級，斷點取 Material 3 window size classes：
 * compact < 600、medium 600–839、expanded 840–1199、large ≥ 1200（單位：dp / CSS px）。
 *
 * 頁面只應該問「是否達到某個等級」，不要各自散落魔法數字；
 * 寬屏差異放在佈局殼子（左右分欄、欄數），內容組件保持一套。
 */
export const WINDOW_SIZE_CLASS = {
    compact: 'compact',
    medium: 'medium',
    expanded: 'expanded',
    large: 'large',
};

export const WINDOW_BREAKPOINTS = {
    medium: 600,
    expanded: 840,
    large: 1200,
};

/** 頂部段落 Tab 條（搵課／課表、服務／百科）最大寬度：寬屏時不再把兩個 Tab 拉到左右兩端 */
export const TOP_TAB_STRIP_MAX_WIDTH = 480;

/** 列表型頁面內容最大寬度：超寬屏（外接顯示器）居中，避免卡片欄無限變寬 */
export const WIDE_CONTENT_MAX_WIDTH = 1440;

export const getWindowSizeClass = width => {
    if (width >= WINDOW_BREAKPOINTS.large) {
        return WINDOW_SIZE_CLASS.large;
    }
    if (width >= WINDOW_BREAKPOINTS.expanded) {
        return WINDOW_SIZE_CLASS.expanded;
    }
    if (width >= WINDOW_BREAKPOINTS.medium) {
        return WINDOW_SIZE_CLASS.medium;
    }
    return WINDOW_SIZE_CLASS.compact;
};

/**
 * 隨窗口尺寸（旋轉、iPad 分屏、瀏覽器拖動）即時更新的尺寸等級。
 *
 * @returns {{ width: number, height: number, sizeClass: string, isCompact: boolean, isExpanded: boolean, isLarge: boolean }}
 *   isCompact：手機寬度，維持現有單欄排版
 *   isExpanded：達到 expanded 及以上，適合左右分欄
 *   isLarge：達到 large 及以上，可再多開一欄
 */
export const useWindowSizeClass = () => {
    const { width, height } = useWindowDimensions();
    const sizeClass = getWindowSizeClass(width);
    return {
        width,
        height,
        sizeClass,
        isCompact: sizeClass === WINDOW_SIZE_CLASS.compact,
        isExpanded: width >= WINDOW_BREAKPOINTS.expanded,
        isLarge: width >= WINDOW_BREAKPOINTS.large,
    };
};
