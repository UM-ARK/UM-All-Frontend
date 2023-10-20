import analytics from '@react-native-firebase/analytics';

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
    await analytics().logEvent(eventName, optionObj)
}
