import { Alert } from "react-native";
import i18n, { changeLanguage } from "i18next";
import { initReactI18next } from "react-i18next";
import RNRestart from 'react-native-restart';
import AsyncStorage from '@react-native-async-storage/async-storage';

import EN_US from './en-us';
import ZH_HK from './zh-hk';

// 參考 IETF 語言標籤
// https://en.wikipedia.org/wiki/IETF_language_tag
// 但這裡的key無法使用 - ，故沒有使用 zh-hk
const resources = {
    en: EN_US,
    tc: ZH_HK
};

// 讀取緩存中的語言設定
initLanguage();
async function initLanguage() {
    try {
        await AsyncStorage.getItem('language').then(res => {
            let lng = JSON.parse(res);
            i18n.use(initReactI18next).init({
                resources,
                // 讀取本地緩存中的語言設置，默認 英文 en
                // TODO: 首次打開時設定語言
                lng: lng ? lng : 'tc',
                interpolation: {
                    escapeValue: false
                }
            });
        })
    } catch (error) {
        console.log('error', error);
        Alert.alert('', 'i18n error, Please contact developer');
        // 如果出錯，直接使用 en 作為默認語言
        i18n.use(initReactI18next).init({
            resources,
            lng: 'tc',
            interpolation: {
                escapeValue: false
            }
        });
    }
}

// 設置語言，並重啟
export async function setLanguage(lng) {
    try {
        // 設置i18n的語言
        await changeLanguage(lng).then(e => {
            // 把語言設置放入本地緩存中
            setLocalStorage(lng);
            // 重啟
            RNRestart.Restart();
        }).catch(err => {
            alert(JSON.stringify(err));
        })
    } catch (error) {
        alert(JSON.stringify(error));
    }

}

// 設置本地緩存
async function setLocalStorage(lng) {
    try {
        const strCourseCodeList = JSON.stringify(lng);
        await AsyncStorage.setItem('language', strCourseCodeList)
            .catch(e => console.log('AsyncStorage Language Error', e));
    } catch (e) {
        alert(e);
    }
}

// 用法：
// import { t } from 'i18next';
// 需要翻譯的地方使用 t('key')
// 這裡的 key 需要對應 resources 內多語言的 key，t函數會返回該key的value

// 修改語言
// import { setLanguage } from '../xxxxxxxxx/i18n.js';
// setLanguage('en');

export default i18n;
