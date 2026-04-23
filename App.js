import React, { useState, useEffect } from 'react';
import { Dimensions, Alert, Appearance } from 'react-native';

// 本地引用
import Nav from './src/Nav';
import { uiStyle } from './src/components/ThemeContext';
import { checkCloudCourseVersion, needUpdate, saveCourseDataToStorage } from './src/utils/checkCoursesKits';
import { getLocalStorage, setLocalStorage } from './src/utils/storageKits';
import { ThemeProvider, themes } from './src/components/ThemeContext';
import sourceCourseVersion from './src/static/UMCourses/courseVersion';
import { getPreciseDeviceName } from './src/utils/iosModel';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { scale } from 'react-native-size-matters';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { getApp } from '@react-native-firebase/app';
import { getAnalytics, setUserProperty } from '@react-native-firebase/analytics';
import { KeyboardProvider } from 'react-native-keyboard-controller';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const LOGO_WIDTH = PAGE_WIDTH * 0.5;

// Workers API 分時請求
const LAST_CHECK_KEY = 'last_version_check_timestamp';
const CHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 小時
// 檢查時間間隔，是否需要檢查Version
const performCheck = async () => {
    try {
        const lastCheckTimestamp = await AsyncStorage.getItem(LAST_CHECK_KEY);
        const now = Date.now();

        if (lastCheckTimestamp && (now - parseInt(lastCheckTimestamp, 10)) < CHECK_INTERVAL) {
            // console.log('仍在 6 小時冷卻時間內，跳過版本檢查。');
            return;
        }

        // 執行檢查並更新時間戳
        // console.log('檢查雲端課程數據');
        await checkCloudCourseVersion();
        await AsyncStorage.setItem(LAST_CHECK_KEY, now.toString());

    } catch (error) {
        console.error('版本檢查失敗:', error);
    }
};

const App = () => {
    const [appTheme, setAppTheme] = useState(themes.light);
    const [isThemeLoaded, setIsThemeLoaded] = useState(false);

    // 加載保存的主題偏好
    useEffect(() => {
        const loadSavedTheme = async () => {
            try {
                const savedMode = await getLocalStorage('themePreference');
                const systemColorScheme = Appearance.getColorScheme();
                let effectiveTheme;

                if (savedMode !== undefined && savedMode !== null) {
                    const parsedMode = parseInt(savedMode, 10);
                    switch (parsedMode) {
                        case 1: // 強制淺色
                            effectiveTheme = themes.light;
                            break;
                        case 2: // 強制深色
                            effectiveTheme = themes.dark;
                            break;
                        case 0: // 跟隨系統
                        default:
                            effectiveTheme = themes[systemColorScheme] || themes.light;
                    }
                } else {
                    // 默認跟隨系統
                    effectiveTheme = themes[systemColorScheme] || themes.light;
                }

                setAppTheme(effectiveTheme);
            } catch (error) {
                console.error('Failed to load theme in App:', error);
            } finally {
                setIsThemeLoaded(true);
            }
        };

        loadSavedTheme();
    }, []);

    const theme = appTheme;

    // 開屏動畫
    useEffect(() => {
        // 等待主題加載完成後再開始計時消失開屏
        if (!isThemeLoaded) { return; }

        return () => { };
    }, [isThemeLoaded]);

    // 初始化與監聽
    useEffect(() => {
        const init = async () => {
            try {
                const strUserInfo = await AsyncStorage.getItem('userInfo');
                const userInfo = strUserInfo ? JSON.parse(strUserInfo) : {};

                let localCourseVersion = await getLocalStorage('course_version');
                // 首次啟動，優先用本地打包的 sourceCourseVersion
                if (!localCourseVersion) {
                    const saveResult = await setLocalStorage('course_version', sourceCourseVersion);
                    if (saveResult !== 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
                    localCourseVersion = sourceCourseVersion;
                }
                // 新APP將先覆蓋舊版APP的本地緩存
                let needSave = false;
                let newVersion = { ...localCourseVersion };
                if (needUpdate(localCourseVersion.adddrop, sourceCourseVersion.adddrop)) {
                    needSave = true;
                    newVersion.adddrop = sourceCourseVersion.adddrop;
                    saveCourseDataToStorage('adddrop', 'source');
                }
                if (needUpdate(localCourseVersion.pre, sourceCourseVersion.pre)) {
                    needSave = true;
                    newVersion.pre = sourceCourseVersion.pre;
                    saveCourseDataToStorage('pre', 'source');
                }
                if (needSave) {
                    const saveResult = await setLocalStorage('course_version', newVersion);
                    if (saveResult !== 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
                }

                // 在時間差內檢查雲端數據更新
                performCheck();
            } catch (e) {
                Alert.alert('', 'App initialization error!\nPlease contact developer.', null, { cancelable: true });
            } finally {
                // 報告Firebase準確的iPhone型號
                const modelName = getPreciseDeviceName();
                const analyticsInstance = getAnalytics(getApp());
                await setUserProperty(analyticsInstance, 'device_market_name', modelName);
            }
        };

        init();
    }, []);

    // 從 theme 提取常用顏色
    const { themeColor, white, black, unread, warning, } = theme;

    // 自定義Toast外觀
    const toastConfig = {
        arkToast: (props) => (
            <BaseToast
                {...props}
                style={{
                    borderLeftColor: themeColor,
                    backgroundColor: white,
                    width: '80%',
                    height: scale(60),
                }}
                contentContainerStyle={{ paddingHorizontal: scale(15) }}
                text1Style={{
                    ...uiStyle.defaultText,
                    color: black.main,
                    fontSize: scale(15),
                }}
                text2Style={{
                    ...uiStyle.defaultText,
                    color: black.third,
                    fontSize: scale(10),
                }}
            />
        ),
        error: (props) => (
            <ErrorToast
                {...props}
                style={{
                    borderLeftColor: unread,
                    backgroundColor: white,
                    width: '80%',
                    height: scale(60),
                }}
                text1Style={{
                    ...uiStyle.defaultText,
                    color: black.main,
                    fontSize: scale(15),
                }}
                text2Style={{
                    ...uiStyle.defaultText,
                    color: black.main,
                    fontSize: scale(10),
                }}
            />
        ),
        warning: (props) => (
            <BaseToast
                {...props}
                style={{
                    borderLeftColor: warning,
                    backgroundColor: white,
                    width: '80%',
                    height: scale(60),
                }}
                contentContainerStyle={{ paddingHorizontal: scale(15) }}
                text1Style={{
                    ...uiStyle.defaultText,
                    color: black.main,
                    fontSize: scale(15),
                }}
                text2Style={{
                    ...uiStyle.defaultText,
                    color: black.third,
                    fontSize: scale(10),
                }}
            />
        ),
    };

    // TODO:  使用加載屏splash-screen
    return (
        <SafeAreaProvider>
            <KeyboardProvider>
                <ThemeProvider>
                    <Nav />
                </ThemeProvider>
                <Toast config={toastConfig} />
            </KeyboardProvider>
        </SafeAreaProvider>
    );
};

export default App;
