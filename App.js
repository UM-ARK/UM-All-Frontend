import React, { useState, useEffect } from 'react';
import { Dimensions, Alert, Appearance } from 'react-native';

// 本地引用
import Nav from './src/Nav';
import { uiStyle } from './src/components/ThemeContext';
import { refreshCourseCatalogs } from './src/utils/checkCoursesKits';
import { getLocalStorage } from './src/utils/storageKits';
import { ThemeProvider, themes } from './src/components/ThemeContext';
import { getPreciseDeviceName } from './src/utils/iosModel';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { scale } from 'react-native-size-matters';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { getApp } from '@react-native-firebase/app';
import { getAnalytics, setUserProperty } from '@react-native-firebase/analytics';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { HarborSessionProvider } from './src/contexts/HarborSessionContext';
import { SchedulingSessionProvider } from './src/contexts/SchedulingSessionContext';
import { AppShareProvider } from './src/contexts/AppShareContext';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const LOGO_WIDTH = PAGE_WIDTH * 0.5;

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

                refreshCourseCatalogs().catch(error => {
                    console.error('課程資料檢查失敗:', error);
                });
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
                    <HarborSessionProvider>
                        <AppShareProvider>
                            <SchedulingSessionProvider>
                                <Nav />
                            </SchedulingSessionProvider>
                        </AppShareProvider>
                    </HarborSessionProvider>
                </ThemeProvider>
                <Toast config={toastConfig} />
            </KeyboardProvider>
        </SafeAreaProvider>
    );
};

export default App;
