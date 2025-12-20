import React, { useState, useEffect } from 'react';
import { Image, Dimensions, Alert, Appearance, AppState, useColorScheme } from 'react-native';

// 本地引用
import Nav from './src/Nav';
import RootStore from './src/mobx';
import { uiStyle } from './src/utils/uiMap';
import { setLanguage, setLocalStorage as setI18nLocalStorage } from './src/i18n/i18n';
import { checkCloudCourseVersion, needUpdate, saveCourseDataToStorage } from './src/utils/checkCoursesKits';
import { getLocalStorage, setLocalStorage } from './src/utils/storageKits';
import { ThemeProvider, themes } from "./src/components/ThemeContext";
import sourceCourseVersion from './src/static/UMCourses/courseVersion';

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
                if (userInfo.stdData || userInfo.clubData) { RootStore.setUserInfo(userInfo); }

                await checkLanguage();

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
                Alert.alert('', `App initialization error!\nPlease contact developer.`, null, { cancelable: true })
            }
        };

        init();
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
                                setI18nLocalStorage('tc');
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
