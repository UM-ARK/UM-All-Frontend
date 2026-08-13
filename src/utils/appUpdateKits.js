import { Alert, Linking, Platform } from 'react-native';
import axios from 'axios';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { APPSTORE_URL, ARK_APP_LINK, BASE_URI, GET, GITHUB_RELEASE_URL, PLAYSTORE_URL } from './pathMap';
import { openLink } from './browser';
import { versionStringCompare } from './versionKits';
import { trigger } from './trigger';

const HUAWEI_LIKE_PATTERN = /huawei|honor|harmony/;

function readDeviceField(deviceInfo, key) {
    let fallback = Device.modelName;
    if (key === 'brand') {
        fallback = Device.brand ?? Platform.constants?.Brand;
    } else if (key === 'manufacturer') {
        fallback = Device.manufacturer ?? Platform.constants?.Manufacturer;
    }
    return String(deviceInfo?.[key] ?? fallback ?? '').toLowerCase();
}

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
 * 華為／榮耀／Harmony 等通常沒有 Google Play 的裝置
 */
export function isHuaweiLikeDevice(deviceInfo) {
    return ['brand', 'manufacturer', 'modelName'].some(key =>
        HUAWEI_LIKE_PATTERN.test(readDeviceField(deviceInfo, key)),
    );
}

/**
 * 首頁更新卡片的下載入口（華為等無 GMS 裝置隱藏 Play Store，改以官網 APK 為主）
 */
export function getAppUpdateChannels(options = {}) {
    const os = options.platform ?? Platform.OS;
    if (os === 'ios') {
        return [
            {
                label: 'App Store',
                detail: '官方商店更新',
                icon: 'logo-apple',
                url: APPSTORE_URL,
            },
        ];
    }

    const official = {
        label: '官網 APK',
        detail: '從 ARK ALL 官網下載安裝，適用華為等無 Google 服務裝置',
        icon: 'globe-outline',
        url: ARK_APP_LINK,
    };
    const github = {
        label: 'GitHub Release APK',
        detail: '從 GitHub 下載最新版 APK',
        icon: 'logo-github',
        url: GITHUB_RELEASE_URL,
    };
    const play = {
        label: 'Google Play Store',
        detail: '推薦，自動接收後續更新',
        icon: 'logo-google-playstore',
        url: PLAYSTORE_URL,
    };

    const huaweiLike =
        options.huaweiLike ?? isHuaweiLikeDevice(options.deviceInfo);
    return huaweiLike ? [official, github] : [play, official, github];
}

export function getAppUpdateSectionTitle(options = {}) {
    const os = options.platform ?? Platform.OS;
    return os === 'ios' ? '前往 App Store 更新' : '選擇安裝方式';
}

export function getAppUpdateHint(options = {}) {
    const os = options.platform ?? Platform.OS;
    if (os === 'ios') {
        return null;
    }
    const huaweiLike =
        options.huaweiLike ?? isHuaweiLikeDevice(options.deviceInfo);
    return huaweiLike
        ? '此裝置可能沒有 Google Play。請使用官網 APK 或 GitHub 下載，並允許瀏覽器安裝外部應用。'
        : '若無法開啟 Google Play（例如華為 Harmony），請改用官網 APK。';
}

/**
 * 開啟更新連結：商店優先走系統 Intent，失敗或一般網址改走 openLink，避免華為上無聲失敗
 */
export async function openAppUpdateUrl(url) {
    const fallbackUrl = Platform.OS === 'ios' ? APPSTORE_URL : ARK_APP_LINK;
    const preferSystemLinking =
        url === APPSTORE_URL || url === PLAYSTORE_URL;

    if (preferSystemLinking) {
        try {
            await Linking.openURL(url);
            return;
        } catch {
            // 無對應商店（如華為無 GMS）時改開官網下載頁
        }
    }

    try {
        await openLink(preferSystemLinking ? fallbackUrl : url);
    } catch {
        Alert.alert(
            '無法開啟連結',
            `請用系統瀏覽器手動開啟：\n${fallbackUrl}`,
        );
    }
}

/**
 * 與首頁相同：有新版本時 Alert，並依平台開啟 App Store 或官網 APK 下載頁
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
                const url = Platform.OS === 'ios' ? APPSTORE_URL : ARK_APP_LINK;
                openAppUpdateUrl(url);
            },
        },
    ]);
}
