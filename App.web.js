// Web / 桌面版入口：Metro 在 web 平台自動優先選用 .web.js，手機端仍走 App.js
// 只保留四個功能區需要的 Provider，去掉 Firebase、推送註冊等純原生初始化
import React, { useState, useEffect } from 'react';
import { Appearance, StyleSheet, View } from 'react-native';

// 本地引用
import Nav from './src/Nav';
import { uiStyle, ThemeProvider, themes } from './src/components/ThemeContext';
import { refreshCourseCatalogs } from './src/utils/checkCoursesKits';
import { getLocalStorage } from './src/utils/storageKits';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { scale } from 'react-native-size-matters';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { HarborSessionProvider } from './src/contexts/HarborSessionContext';
import { SchedulingSessionProvider } from './src/contexts/SchedulingSessionContext';
import { AppShareProvider } from './src/contexts/AppShareContext';
import { ProgrammeLevelProvider } from './src/contexts/ProgrammeLevelContext';
import HarborAuthorizationLoadingOverlay from './src/components/HarborAuthorizationLoadingOverlay';

const App = () => {
    const [appTheme, setAppTheme] = useState(themes.light);

    // 加載保存的主題偏好（與 App.js 邏輯一致）
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
            }
        };

        loadSavedTheme();
    }, []);

    // 初始化：只做課程目錄檢查，web 端不上報 Firebase
    useEffect(() => {
        refreshCourseCatalogs().catch(error => {
            console.error('課程資料檢查失敗:', error);
        });
    }, []);

    const theme = appTheme;
    const { themeColor, white, black, unread, warning } = theme;

    // 自定義 Toast 外觀（與 App.js 一致）
    const toastConfig = {
        arkToast: props => (
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
        error: props => (
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
        warning: props => (
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

    return (
        <SafeAreaProvider>
            <KeyboardProvider>
                <ThemeProvider>
                    <ProgrammeLevelProvider>
                        <HarborSessionProvider>
                            <AppShareProvider>
                                <SchedulingSessionProvider>
                                    <View style={styles.appContainer}>
                                        <Nav />
                                        <HarborAuthorizationLoadingOverlay />
                                    </View>
                                </SchedulingSessionProvider>
                            </AppShareProvider>
                        </HarborSessionProvider>
                    </ProgrammeLevelProvider>
                </ThemeProvider>
                <Toast config={toastConfig} />
            </KeyboardProvider>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    appContainer: {
        flex: 1,
    },
});

export default App;
