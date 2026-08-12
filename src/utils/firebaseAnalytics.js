import { getAnalytics, logEvent } from '@react-native-firebase/analytics';


// 分析指標
// 頁面
/*
 * eventName    openPage
 * value        home        打開主頁
 * value        arkCourse   打開選課頁
 * value        features    打開功能頁
 */

// 傳輸到Firebase事件
export async function logToFirebase(eventName, optionObj) {
    try {
        let normalizedOptionObj = optionObj;
        if (
            eventName === 'checkCourse' &&
            optionObj &&
            Object.prototype.hasOwnProperty.call(optionObj, 'profName')
        ) {
            const profName = typeof optionObj.profName === 'string'
                ? optionObj.profName.trim()
                : '';
            normalizedOptionObj = {...optionObj};
            if (profName) {
                normalizedOptionObj.profName = profName;
            } else {
                delete normalizedOptionObj.profName;
            }
        }
        const a = getAnalytics();
        logEvent(a, eventName, normalizedOptionObj);
    } catch (_error) {
        // Analytics 失敗不可阻塞主要操作
    }
}
