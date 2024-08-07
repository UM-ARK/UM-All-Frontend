import React, { Component } from 'react';
import { View, Image, Dimensions, Alert, Linking, Appearance, AppState, } from 'react-native';

// 本地引用
import Nav from './src/Nav';
import RootStore from './src/mobx';
import { COLOR_DIY, isLight, uiStyle, } from './src/utils/uiMap';
import { BASE_HOST } from './src/utils/pathMap';
import { setLanguage, setLocalStorage } from './src/i18n/i18n';
import { checkLocalCourseVersion, } from './src/utils/checkCoursesKits';

import { Provider } from 'mobx-react';

import AnimatedSplash from 'react-native-animated-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { scale } from 'react-native-size-matters';
import Toast, { BaseToast, ErrorToast, } from 'react-native-toast-message';
import RNRestart from 'react-native-restart';
import { t } from 'i18next';

// Initialize Clarity.
// import { initialize } from 'react-native-clarity';
// initialize("il9ynzl9gn");

const { bg_color } = COLOR_DIY;
const { width: PAGE_WIDTH } = Dimensions.get('window');
const LOGO_WIDTH = PAGE_WIDTH * 0.5;

// 自定義Toast外觀
const toastConfig = {
    arkToast: (props) => (
        <BaseToast
            {...props}
            style={{
                borderLeftColor: COLOR_DIY.themeColor, backgroundColor: COLOR_DIY.white,
                width: '80%', height: scale(60),
            }}
            contentContainerStyle={{ paddingHorizontal: scale(15) }}
            text1Style={{
                ...uiStyle.defaultText,
                color: COLOR_DIY.black.main,
                fontSize: scale(15),
            }}
            text2Style={{
                ...uiStyle.defaultText,
                color: COLOR_DIY.black.third,
                fontSize: scale(10),
            }}
        />
    ),
    error: (props) => (
        <ErrorToast
            {...props}
            style={{
                borderLeftColor: COLOR_DIY.unread,
                backgroundColor: COLOR_DIY.white,
                width: '80%', height: scale(60),
            }}
            text1Style={{
                ...uiStyle.defaultText,
                color: COLOR_DIY.black.main,
                fontSize: scale(15),
            }}
            text2Style={{
                ...uiStyle.defaultText,
                color: COLOR_DIY.black.main,
                fontSize: scale(10),
            }}
        />
    ),
    warning: (props) => (
        <BaseToast
            {...props}
            style={{
                borderLeftColor: COLOR_DIY.warning, backgroundColor: COLOR_DIY.white,
                width: '80%', height: scale(60),
            }}
            contentContainerStyle={{ paddingHorizontal: scale(15) }}
            text1Style={{
                ...uiStyle.defaultText,
                color: COLOR_DIY.black.main,
                fontSize: scale(15),
            }}
            text2Style={{
                ...uiStyle.defaultText,
                color: COLOR_DIY.black.third,
                fontSize: scale(10),
            }}
        />
    ),
};

class App extends Component {
    state = {
        isLoaded: false,
        isLogin: false,
        versionLock: false,

        languageOK: false,

        scheme: Appearance.getColorScheme(),
    };

    async componentDidMount() {
        // 開屏動畫
        setTimeout(() => {
            this.setState({ isLoaded: true });
        }, 500);

        // 獲取緩存中的用戶數據
        try {
            const strUserInfo = await AsyncStorage.getItem('userInfo');
            const userInfo = strUserInfo ? JSON.parse(strUserInfo) : {};
            // 判斷有無登錄token
            if (userInfo.stdData || userInfo.clubData) {
                // 把緩存中的數據存一份到mobx
                // console.log('有登錄token，需存到mobx');
                this.setState({ isLogin: true });
                RootStore.setUserInfo(userInfo);
            } else {
                // console.log('無用戶token');
                this.setState({ isLogin: false });
            }
            this.checkLanguage();
            // 檢查APP靜態文件的課程更新時間和緩存數據新舊，取最新
            checkLocalCourseVersion();
        } catch (e) {
            console.error('App error', e);
        }

        this.listener = Appearance.addChangeListener((theme) => {
            let scheme = theme.colorScheme;
            this.setState({ scheme });
            this.schemeChange();
        });
        this.screenListener = AppState.addEventListener('change', nextAppState => {
            this.schemeChange();
        })
    }

    componentWillUnmount() {
        this.listener.remove();
        this.screenListener.remove();
    }

    setLock = app_version => {
        Alert.alert(
            "Please update the app!",
            `Latest version: ${app_version}\nYou need the latest version to continue!\n\nDo you want to update it now?
            `,
            [
                // The "Yes" button
                {
                    text: "Yes",
                    onPress: () => {
                        // 跳轉到主頁下載新版本
                        Linking.openURL(BASE_HOST)
                    },
                },
                // The "No" button
                // Does nothing but dismiss the dialog when tapped
                {
                    text: "No",
                },
            ]
        );
        this.setState({ versionLock: true });
    };

    // 啟動檢查語言設置
    checkLanguage = async () => {
        await AsyncStorage.getItem('language').then(res => {
            const lng = JSON.parse(res);
            if (!lng) {
                Alert.alert('語言設定 / Language Setting', '挑選您的首選語言\nPick your preferred languaeg(English version not fully translated)\n您稍後可以在關於頁再修改！\nYou can modify it later on the About page!', [
                    {
                        text: '繁體中文', onPress: () => {
                            setLocalStorage('tc');
                            this.setState({ languageOK: true });
                        }
                    },
                    { text: 'English', onPress: () => setLanguage('en') },
                ]);
            } else {
                this.setState({ languageOK: true })
            }
        })
    }

    schemeChange = () => {
        if (AppState.currentState == 'active' && (isLight != (this.state.scheme == 'light'))) {
            Alert.alert(`ARK ALL`, `${t('現在重啟APP切換到')} ${this.state.scheme == 'light' ? t('淺色模式') : t('深色模式')} ?`, [
                {
                    text: 'Yes', onPress: () => {
                        RNRestart.Restart();
                    }
                },
                { text: 'No', },
            ])
        }
    }

    render() {
        return (
            // 開屏動畫
            <AnimatedSplash
                translucent={true}
                isLoaded={this.state.isLoaded}
                customComponent={
                    <Image
                        source={require('./src/static/img/logo.png')}
                        style={{
                            width: LOGO_WIDTH,
                            height: LOGO_WIDTH,
                            borderRadius: scale(40)
                        }}
                    />
                }
                backgroundColor={bg_color}>
                <SafeAreaProvider>
                    {/* 全局變量 */}
                    {this.state.languageOK ? (
                        <Provider RootStore={RootStore}>
                            <Nav lock={this.state.versionLock} setLock={this.setLock} />
                            <Toast config={toastConfig} />
                        </Provider>
                    ) : null}
                </SafeAreaProvider>
            </AnimatedSplash>
        );
    }
}

export default App;
