// 處理緩存相關的工具

import RNRestart from 'react-native-restart';
import AsyncStorage from '@react-native-async-storage/async-storage';

import RootStore from '../mobx';

// 登錄，需要放入服務器返回的token
export async function handleLogin(userInfo) {
    // userInfo為對象
    try {
        const strUserInfo = JSON.stringify(userInfo);
        await AsyncStorage.setItem('userInfo', strUserInfo)
            .then(() => {
                RNRestart.Restart();
            })
            .catch(e => console.log(e));
    } catch (e) {
        console.error(e);
    }
}

// 清除緩存退出登錄
export async function handleLogout(userInfo) {
    try {
        await AsyncStorage.clear();
    } catch (e) {
        console.error(e);
    } finally {
        RNRestart.Restart();
    }
}
