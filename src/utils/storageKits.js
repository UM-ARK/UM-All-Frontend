// 處理緩存相關的工具

import RNRestart from 'react-native-restart';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CookieManager from '@react-native-cookies/cookies';

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
            .catch(e => console.log('handleLogin error', e));
    } catch (e) {
        alert(e);
    }
}

// 清除緩存退出登錄
export async function handleLogout() {
    try {
        // await AsyncStorage.clear();
        await AsyncStorage.removeItem('userInfo');
        await AsyncStorage.removeItem('appInfo');
        // 清除所有的cookies
        await CookieManager.clearAll();
    } catch (e) {
        alert(e);
    } finally {
        RNRestart.Restart();
    }
}

// 更新本地的緩存數據
export async function updateUserInfo(userInfo) {
    // userInfo為對象
    try {
        const strUserInfo = JSON.stringify(userInfo);
        await AsyncStorage.setItem('userInfo', strUserInfo).catch(e =>
            console.log('updateUserInfo error', e),
        );
    } catch (e) {
        alert(e);
    }
}

// 寫入緩存數據
export async function setAPPInfo(appInfo) {
    try {
        const strAppInfo = JSON.stringify(appInfo);
        await AsyncStorage.setItem('appInfo', strAppInfo).catch(e => console.log('setAPPInfo error', e));
    } catch (e) {
        alert(e);
    }
}

// 獲取本地緩存
export async function getLocalStorage(itemName) {
    let localItem = null;
    try {
        const strLocalItem = await AsyncStorage.getItem(itemName);
        localItem = strLocalItem ? JSON.parse(strLocalItem) : undefined;
    } catch (error) {
        localItem = error;
    } finally {
        return localItem;
    }
}

// 存入本地緩存
export async function setLocalStorage(itemName, data) {
    try {
        const strData = JSON.stringify(data);
        await AsyncStorage.setItem(itemName, strData);
    } catch (error) {
        console.log('AsyncStorage Error', error)
        return error;
    } finally {
        console.log(itemName, '已存入緩存');
        return 'ok';
    }
}

// log出當前所有的緩存資料
export function logAllStorage() {
    AsyncStorage.getAllKeys((err, keys) => {
        AsyncStorage.multiGet(keys, (error, stores) => {
            stores.map((result, i, store) => {
                console.log({ [store[i][0]]: JSON.parse(store[i][1]) });
                return true;
            });
        });
    });
}