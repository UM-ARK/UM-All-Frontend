import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

// 定義 Android 上支持 Custom Tabs 的常見瀏覽器包名
// 優先級：Chrome > Edge > Firefox > 其他
const PREFERRED_BROWSERS = [
    'com.android.chrome', // Chrome Stable
    'com.chrome.beta', // Chrome Beta
    'com.chrome.dev', // Chrome Dev
    'com.google.android.apps.chrome', // 某些舊版 Chrome
    'com.microsoft.emmx', // Microsoft Edge
    'org.mozilla.firefox', // Firefox
];

/**
 * 獲取最佳瀏覽器配置 (僅限 Android)
 * iOS 回傳 undefined；無可支援 Custom Tabs 瀏覽器時回傳 null。
 */
export async function getBestBrowserPackage() {
    if (Platform.OS !== 'android') {
        return undefined;
    }

    try {
        const result =
            await WebBrowser.getCustomTabsSupportingBrowsersAsync();

        const browserPackages = result?.browserPackages ?? [];
        const servicePackages = result?.servicePackages ?? [];

        // 同時具有瀏覽器 Activity 和 Custom Tabs Service 的套件
        const fullySupportedPackages = browserPackages.filter(pkg =>
            servicePackages.includes(pkg),
        );

        const bestPackage = PREFERRED_BROWSERS.find(pkg =>
            fullySupportedPackages.includes(pkg),
        );

        return (
            bestPackage ??
            result?.preferredBrowserPackage ??
            fullySupportedPackages[0] ??
            null
        );
    } catch (error) {
        console.log('Failed to detect browsers:', error);
        return null;
    }
}
