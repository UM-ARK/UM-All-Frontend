import React, { Component } from 'react';
import { View, Image, Dimensions, StyleSheet, Alert, Linking } from 'react-native';

// 本地引用
import Nav from './src/Nav';
import RootStore from './src/mobx';
import { COLOR_DIY } from './src/utils/uiMap';
// import { setAPPInfo, handleLogout } from './src/utils/storageKits';
import { BASE_HOST } from './src/utils/pathMap';
import { Provider } from 'mobx-react';

import { NativeBaseProvider } from 'native-base';
import AnimatedSplash from 'react-native-animated-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale } from 'react-native-size-matters';

const { viewShadow, bg_color, white } = COLOR_DIY;
const { width: PAGE_WIDTH } = Dimensions.get('window');
const LOGO_WIDTH = PAGE_WIDTH * 0.5;

function SafeAreaDIY(props) {
    const insets = useSafeAreaInsets();

    return (
        <View
            style={{
                backgroundColor: COLOR_DIY.bg_color,
                flex: 1,

                // Paddings to handle safe area
                //paddingTop: insets.top,
                paddingTop: insets.top == 59 ? 12 : 0,
                paddingBottom: insets.top == 59 ? insets.bottom : 0,
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
        }, 1000);

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
            console.error(e);
        }
    }

    setLock = app_version => {
        // Alert.alert(
        //     `APP版本和API更新，需使用新版本才能繼續~\n最新版本為：${app_version}\n[]~(￣▽￣)~*`,
        // );
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
                    <SafeAreaDIY>
                        <Provider RootStore={RootStore}>
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
