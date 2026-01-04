import { Linking, Platform, Appearance, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { themes } from "../components/ThemeContext";

// 定義 Android 上支持 Custom Tabs 的常見瀏覽器包名
// 優先級：Chrome > Edge > Firefox > 其他
const PREFERRED_BROWSERS = [
    'com.android.chrome', // Chrome Stable
    'com.chrome.beta',    // Chrome Beta
    'com.chrome.dev',     // Chrome Dev
    'com.google.android.apps.chrome', // 某些舊版 Chrome
    'com.microsoft.emmx', // Microsoft Edge
    'org.mozilla.firefox', // Firefox
];

/**
 * 獲取最佳瀏覽器配置 (僅限 Android)
 */
async function getBestBrowserPackage() {
    if (Platform.OS !== 'android') return undefined;

    try {
        // 獲取所有支持 Custom Tabs 的瀏覽器
        const result = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
        const supportedPackages = result?.browserPackages || [];

        // 如果沒有任何瀏覽器支持 Custom Tabs，返回 null
        if (supportedPackages.length === 0) {
            return null;
        }

        // 從我們偏好的列表中尋找已安裝的瀏覽器
        const bestPackage = PREFERRED_BROWSERS.find(pkg =>
            supportedPackages.includes(pkg)
        );

        // 如果沒找到偏好的，但設備支持 Custom Tabs，就用系統默認支持的那一個
        // 否則返回 null，後續會降級處理
        return result?.preferredBrowserPackage || bestPackage || null;
    } catch (error) {
        console.log('Failed to detect browsers:', error);
        return null;
    }
}

export const openLink = async (input) => {
    let url, mode;
    if (typeof input === 'string') {
        url = input;
        mode = undefined;
    } else if (typeof input === 'object' && input !== null) {
        url = input.URL;
        mode = input.mode
    } else {
        throw new Error('openLink: Invalid input');
    }

    const colorScheme = Appearance.getColorScheme(); // 'light' 或 'dark'
    const { white, themeColor } = themes[colorScheme] || themes.light;

    try {
        // 1. 檢查 URL 有效性
        if (!url || !url.startsWith('http')) {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                return Linking.openURL(url);
            }
            throw new Error(`Invalid URL: ${url}`);
        }

        // 2. 獲取 Android 瀏覽器包名
        let browserPackage;
        if (Platform.OS === 'android') {
            browserPackage = await getBestBrowserPackage();

            // [關鍵] 如果 Android 設備不支持 Custom Tabs (如某些精簡版 ROM)，
            // 則直接使用系統默認方式打開，避免 WebBrowser 報錯或無反應
            if (!browserPackage) {
                Alert.alert(
                    'No Supported Browser',
                    'Your device does not have Chrome, Firefox, or other browsers that support Custom Tabs installed. The link will be opened with the default browser. Continue?',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                        },
                        {
                            text: 'Open',
                            onPress: () => Linking.openURL(url),
                        },
                    ],
                    { cancelable: true }
                );
                return;
            }
        }

        // mode: 'fullScreen', iOS不使用modal
        const iosStyle = mode == 'fullScreen'
            ? WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN
            : WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET; // 卡片式 (Discourse 帖子詳情等推薦用這個，方便下拉關閉)
        const androidShowTitle = !(mode == 'fullScreen');

        // 3. 調用 WebBrowser
        await WebBrowser.openBrowserAsync(url, {
            toolbarColor: white,

            // --- iOS 配置 ---
            // 使用卡片式彈窗，體驗更接近原生 Modal
            // presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
            presentationStyle: iosStyle,
            dismissButtonStyle: 'close', // 顯示關閉按鈕
            controlsColor: themeColor,

            // --- Android 配置 ---
            // 強制指定瀏覽器包名，確保使用我們篩選出的最佳瀏覽器
            browserPackage: browserPackage,
            toolbarColor: white, // 頂部欄背景色
            secondaryToolbarColor: themeColor, // 底部欄或二級顏色
            showTitle: androidShowTitle, // 顯示網頁標題
            enableBarCollapsing: true, // 滾動時隱藏地址欄

            // 動畫配置 (Android)
            // 使用系統默認動畫，通常是從右側滑入或底部滑入
        });

    } catch (error) {
        console.log('Browser Error:', error);
        // 4. 最終降級方案：如果一切都失敗了，嘗試用系統默認方式打開
        try {
            await Linking.openURL(url);
        } catch (fallbackError) {
            console.log('Linking Error:', fallbackError);
            Alert.alert('Cannot open the link!')
        }
    }
};
