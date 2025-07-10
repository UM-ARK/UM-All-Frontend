import React, { useState, useEffect } from 'react';
import { View, Image, Dimensions, Alert, Linking, Appearance, AppState, useColorScheme } from 'react-native';

// 本地引用
import Nav from './src/Nav';
import RootStore from './src/mobx';
import { uiStyle } from './src/utils/uiMap';
import { BASE_HOST } from './src/utils/pathMap';
import { setLanguage, setLocalStorage } from './src/i18n/i18n';
import { checkLocalCourseVersion } from './src/utils/checkCoursesKits';
import { ThemeProvider, themes } from "./src/components/ThemeContext";

import { Provider } from 'mobx-react';
import AnimatedSplash from 'react-native-animated-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { scale } from 'react-native-size-matters';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import RNRestart from 'react-native-restart';
import { t } from 'i18next';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const LOGO_WIDTH = PAGE_WIDTH * 0.5;

const App = () => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [languageOK, setLanguageOK] = useState(false);
    const [scheme, setScheme] = useState(Appearance.getColorScheme());
    const isLight = useColorScheme() === 'light';
    const theme = themes[isLight ? 'light' : 'dark'];

    // 開屏動畫
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoaded(true);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    // 初始化與監聽
    useEffect(() => {
        const init = async () => {
            try {
                const strUserInfo = await AsyncStorage.getItem('userInfo');
                const userInfo = strUserInfo ? JSON.parse(strUserInfo) : {};
                if (userInfo.stdData || userInfo.clubData) {
                    RootStore.setUserInfo(userInfo);
                }
                await checkLanguage();
                checkLocalCourseVersion();
            } catch (e) {
                console.error('App error', e);
            }
        };

        init();

        // Appearance 監聽器
        // const appearanceListener = Appearance.addChangeListener(({ colorScheme }) => {
        //     setScheme(colorScheme);
        //     schemeChange(colorScheme);
        // });

        // AppState 監聽器，後台返回ARK時觸發
        // const appStateListener = AppState.addEventListener('change', (nextAppState) => {
        //     schemeChange(scheme);
        // });

        return () => {
            // appearanceListener.remove();
            // appStateListener.remove();
        };
    }, [scheme]);

    // 自定義Toast外觀
    const toastConfig = {
        arkToast: (props) => (
            <BaseToast
                {...props}
                style={{
                    borderLeftColor: theme.themeColor,
                    backgroundColor: theme.white,
                    width: '80%',
                    height: scale(60),
                }}
                contentContainerStyle={{ paddingHorizontal: scale(15) }}
                text1Style={{
                    ...uiStyle.defaultText,
                    color: theme.black.main,
                    fontSize: scale(15),
                }}
                text2Style={{
                    ...uiStyle.defaultText,
                    color: theme.black.third,
                    fontSize: scale(10),
                }}
            />
        ),
        error: (props) => (
            <ErrorToast
                {...props}
                style={{
                    borderLeftColor: theme.unread,
                    backgroundColor: theme.white,
                    width: '80%',
                    height: scale(60),
                }}
                text1Style={{
                    ...uiStyle.defaultText,
                    color: theme.black.main,
                    fontSize: scale(15),
                }}
                text2Style={{
                    ...uiStyle.defaultText,
                    color: theme.black.main,
                    fontSize: scale(10),
                }}
            />
        ),
        warning: (props) => (
            <BaseToast
                {...props}
                style={{
                    borderLeftColor: theme.warning,
                    backgroundColor: theme.white,
                    width: '80%',
                    height: scale(60),
                }}
                contentContainerStyle={{ paddingHorizontal: scale(15) }}
                text1Style={{
                    ...uiStyle.defaultText,
                    color: theme.black.main,
                    fontSize: scale(15),
                }}
                text2Style={{
                    ...uiStyle.defaultText,
                    color: theme.black.third,
                    fontSize: scale(10),
                }}
            />
        ),
    };

    // 檢查語言設定
    const checkLanguage = async () => {
        try {
            const res = await AsyncStorage.getItem('language');
            const lng = res ? JSON.parse(res) : null;
            if (!lng) {
                Alert.alert(
                    '語言設定 / Language Setting',
                    '挑選您的首選語言\nPick your preferred languaeg(English version not fully translated)\n您稍後可以在關於頁再修改！\nYou can modify it later on the About page!',
                    [
                        {
                            text: '繁體中文',
                            onPress: () => {
                                setLocalStorage('tc');
                                setLanguageOK(true);
                            },
                        },
                        {
                            text: 'English',
                            onPress: () => setLanguage('en'),
                        },
                    ]
                );
            } else {
                setLanguageOK(true);
            }
        } catch (error) {
            console.error('checkLanguage error:', error);
        }
    };

    // 主題模式切換提示
    const schemeChange = (currentScheme) => {
        if (AppState.currentState === 'active' && isLight !== (currentScheme === 'light')) {
            Alert.alert(
                `ARK ALL`,
                `${t('現在重啟APP切換到')} ${currentScheme === 'light' ? t('淺色模式') : t('深色模式')} ?`,
                [
                    {
                        text: 'Yes',
                        onPress: () => { RNRestart.Restart(); },
                    },
                    { text: 'No' },
                ]
            );
        }
    };

    return (
        <AnimatedSplash
            translucent={true}
            isLoaded={isLoaded}
            customComponent={
                <Image
                    source={require('./src/static/img/logo.png')}
                    style={{
                        width: LOGO_WIDTH,
                        height: LOGO_WIDTH,
                        borderRadius: scale(40),
                    }}
                />
            }
            backgroundColor={theme.bg_color}
        >
            <SafeAreaProvider>
                {languageOK ? (
                    <Provider RootStore={RootStore}>
                        <ThemeProvider>
                            <Nav />
                        </ThemeProvider>
                        <Toast config={toastConfig} />
                    </Provider>
                ) : null}
            </SafeAreaProvider>
        </AnimatedSplash>
    );
};

export default App;
