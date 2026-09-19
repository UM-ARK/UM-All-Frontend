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
 * @returns {{ width: number, height: number, sizeClass: string, isExpanded: boolean }}
 *   isExpanded：達到 expanded 及以上，適合左右分欄
 */
export const useWindowSizeClass = () => {
    const { width, height } = useWindowDimensions();
    const sizeClass = getWindowSizeClass(width);
    return {
        width,
        height,
        sizeClass,
        isExpanded: width >= WINDOW_BREAKPOINTS.expanded,
    };
};
