import React, {Component} from 'react';
import {Text, View} from 'react-native';
import {NativeBaseProvider} from 'native-base';
import AnimatedSplash from 'react-native-animated-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 本地引用
import Nav from './src/Nav';
import RootStore from './src/mobx';
import {Provider} from 'mobx-react';

import {SafeAreaProvider} from 'react-native-safe-area-context';

class App extends Component {
    state = {
        isLoaded: false,
    };

    async componentDidMount() {
        // 開屏動畫
        setTimeout(() => {
            this.setState({isLoaded: true});
        }, 1000);

        // 獲取緩存中的用戶數據
        try {
            // await AsyncStorage.clear();  // 清除緩存
            const strUserInfo = await AsyncStorage.getItem('userInfo');
            const userInfo = strUserInfo ? JSON.parse(strUserInfo) : {};
            console.log(userInfo);
            // 判斷有無登錄token
            if (userInfo.token) {
                // 把緩存中的數據存一份到mobx
                console.log('有登錄token，需存到mobx');
                RootStore.setUserInfo(userInfo);
            } else {
                console.log('無用戶token');
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
                logoImage={require('./src/static/img/umallLogo.png')}
                backgroundColor={'#fff'}
                logoHeight={150}
                logoWidth={150}>
                <SafeAreaProvider>
                    <Provider RootStore={RootStore}>
                        <NativeBaseProvider>
                            <View style={{flex: 1}}>
                                <Nav></Nav>
                            </View>
                        </NativeBaseProvider>
                    </Provider>
                </SafeAreaProvider>
            </AnimatedSplash>
        );
    }
}

export default App;
