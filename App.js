import React, {Component} from 'react';
import {Text, View, Image, Dimensions, StyleSheet} from 'react-native';

// 本地引用
import Nav from './src/Nav';
import RootStore from './src/mobx';
import {BASE_URI, GET} from './src/utils/pathMap';
import {COLOR_DIY} from './src/utils/uiMap';
import {setAPPInfo, handleLogout} from './src/utils/storageKits';
import {Provider} from 'mobx-react';
import packageInfo from './package.json';

import {NativeBaseProvider} from 'native-base';
import AnimatedSplash from 'react-native-animated-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import axios from 'axios';
import {pxToDp} from './src/utils/stylesKits';

const {viewShadow, bg_color, white} = COLOR_DIY;
const {width: PAGE_WIDTH} = Dimensions.get('window');
const LOGO_WIDTH = PAGE_WIDTH * 0.5;

let versionLock = false;

class App extends Component {
    state = {
        isLoaded: false,
        isLogin: false,
    };

    async componentDidMount() {
        // 開屏動畫
        setTimeout(() => {
            this.setState({isLoaded: true});
        }, 1000);

        // 獲取緩存中的用戶數據
        try {
            const strUserInfo = await AsyncStorage.getItem('userInfo');
            const userInfo = strUserInfo ? JSON.parse(strUserInfo) : {};
            // 判斷有無登錄token
            if (userInfo.stdData || userInfo.clubData) {
                // 把緩存中的數據存一份到mobx
                console.log('有登錄token，需存到mobx');
                this.setState({isLogin: true});
                RootStore.setUserInfo(userInfo);
            } else {
                console.log('無用戶token');
                this.setState({isLogin: false});
            }
        } catch (e) {
            console.error(e);
        }

        // 獲取版本和輪播圖信息
        this.getData();
    }

    async getData() {
        let URL = BASE_URI + GET.APP_INFO;
        await axios
            .get(URL)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    this.checkInfo(json.content);
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    }

    async checkInfo(serverInfo) {
        try {
            const strAppInfo = await AsyncStorage.getItem('appInfo');
            const appInfo = strAppInfo ? JSON.parse(strAppInfo) : {};
            if (strAppInfo == null) {
                setAPPInfo(serverInfo);
            } else {
                // APP版本更新，提示下載新版本
                if (packageInfo.version != serverInfo.app_version) {
                    alert(
                        `APP版本和API更新，需使用新版本才能繼續~\n[]~(￣▽￣)~*`,
                    );
                    versionLock = true;
                }
                // 服務器API更新，需要重新登錄
                if (appInfo.API_version != serverInfo.API_version) {
                    setAPPInfo(serverInfo);
                    if (this.state.isLogin) {
                        alert('服務器API更新，需要重新登錄');
                        handleLogout();
                    }
                }
            }
        } catch (e) {
            console.error(e);
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
                        source={require('./src/static/img/umallLogo.png')}
                        style={{
                            width: LOGO_WIDTH,
                            height: LOGO_WIDTH,
                            borderRadius: pxToDp(30),
                            overflow: 'hidden',
                        }}
                    />
                }
                backgroundColor={bg_color}>
                <SafeAreaProvider>
                    <Provider RootStore={RootStore}>
                        <NativeBaseProvider>
                            <View style={{flex: 1}}>
                                <Nav lock={versionLock} />
                            </View>
                        </NativeBaseProvider>
                    </Provider>
                </SafeAreaProvider>
            </AnimatedSplash>
        );
    }
}

export default App;
