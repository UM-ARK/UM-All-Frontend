import { Alert, Linking, Platform } from 'react-native';
import axios from 'axios';
import * as Application from 'expo-application';
import { APPSTORE_URL, BASE_HOST, BASE_URI, GET } from './pathMap';
import { versionStringCompare } from './versionKits';
import { trigger } from './trigger';

/**
 * 裝置上實際安裝的 APP 版本（iOS CFBundleShortVersionString / Android versionName）
 * @returns {string}
 */
export function getLocalAppVersion() {
    return Application.nativeApplicationVersion ?? '';
}

/**
 * 向伺服器取得 APP 資訊（與首頁 getAppData 相同端點）
 * @returns {Promise<{ ok: true, content: object } | { ok: false, reason: 'api' | 'network' }>}
 */
export async function fetchAppInfoFromServer() {
    const URL = BASE_URI + GET.APP_INFO;
    try {
        const res = await axios.get(URL);
        const json = res.data;
        if (json?.message === 'success' && json.content) {
            return { ok: true, content: json.content };
        }
        return { ok: false, reason: 'api' };
    } catch {
        return { ok: false, reason: 'network' };
    }
}

/**
 * 本地安裝版是否早於伺服器宣告的 app_version
 */
export function isLocalAppOlderThanServer(serverInfo) {
    if (!serverInfo?.app_version) {
        return false;
    }
    const localVersion = getLocalAppVersion();
    if (!localVersion) {
        return false;
    }
    return versionStringCompare(localVersion, serverInfo.app_version) === -1;
}

/**
 * 與首頁相同：有新版本時 Alert，並依平台開啟 App Store 或官網
 */
export function showAppStoreUpdateAlert(serverInfo) {
    const message =
        serverInfo && 'version_info' in serverInfo
            ? serverInfo.version_info
            : '新版有許多新特性，舊版APP可能會在某時刻不可用，現在前往更新嗎？🥺';
    Alert.alert(`ARK ${serverInfo.app_version} 現可更新！！`, message, [
        {
            text: 'No',
            style: 'cancel',
        },
        {
            text: 'Yes',
            style: 'default',
            isPreferred: true,
            onPress: () => {
                trigger();
                const url = Platform.OS === 'ios' ? APPSTORE_URL : BASE_HOST;
                Linking.openURL(url);
            },
        },
    ]);
}
