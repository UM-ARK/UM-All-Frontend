/**
 * 判斷某個路由名稱是否掛在當前導航樹上（沿 navigation.getParent() 逐層向上查 routeNames）。
 * web 端 Nav.web.js 只掛了部分頁面，服務入口跳轉前先用此函數檢查，
 * 避免 navigate 到未註冊路由時無反應或報錯。
 */
export const canNavigateTo = (navigation, routeName) => {
    if (!routeName) {
        return false;
    }
    let current = navigation;
    while (current) {
        const routeNames = current.getState?.()?.routeNames;
        if (Array.isArray(routeNames) && routeNames.includes(routeName)) {
            return true;
        }
        current = current.getParent?.();
    }
    return false;
};
