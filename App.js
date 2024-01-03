import React, { Component } from 'react';
import { View, Image, Dimensions, Alert, Linking } from 'react-native';

// 本地引用
import Nav from './src/Nav';
import RootStore from './src/mobx';
import { COLOR_DIY } from './src/utils/uiMap';
import { BASE_HOST } from './src/utils/pathMap';
import { Provider } from 'mobx-react';

import { NativeBaseProvider } from 'native-base';
import AnimatedSplash from 'react-native-animated-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale } from 'react-native-size-matters';

// Initialize Clarity.
// import { initialize } from 'react-native-clarity';
// initialize("il9ynzl9gn");

const { bg_color } = COLOR_DIY;
const { width: PAGE_WIDTH } = Dimensions.get('window');
const LOGO_WIDTH = PAGE_WIDTH * 0.5;

// 修復iOS靈動島的頂部底部問題
function SafeAreaDIY(props) {
    const insets = useSafeAreaInsets();
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: bg_color,
                // insets.top為59時，為iPhone 14 Pro Max機型等的靈動島區域
                paddingTop: insets.top == 59 ? 12 : 0,
                // 更新safe-area包後，bottom的padding會導致Tabbar過高
                // paddingBottom: insets.top == 59 ? insets.bottom : 0,
                paddingLeft: insets.left,
                paddingRight: insets.right,
            }}
        >
            {props.children}
        </View>
    );
}

class App extends Component {
    state = {
        isLoaded: false,
        isLogin: false,
        versionLock: false,
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
        } catch (e) {
            console.error('App error', e);
        }
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
                    {/* 修復iOS safe area問題 */}
                    <SafeAreaDIY>
                        {/* 全局變量 */}
                        <Provider RootStore={RootStore}>
                            {/* NativeBase庫需要Provider */}
                            <NativeBaseProvider>
                                <Nav
                                    lock={this.state.versionLock}
                                    setLock={this.setLock}
                                />
                            </NativeBaseProvider>
                        </Provider>
                    </SafeAreaDIY>
                </SafeAreaProvider>
            </AnimatedSplash>
        );
    }
}

export default App;
