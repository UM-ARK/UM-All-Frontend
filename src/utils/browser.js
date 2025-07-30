import { Linking, Alert, Platform, Appearance } from 'react-native';

import { InAppBrowser } from 'react-native-inappbrowser-reborn'
import { themes } from "../components/ThemeContext";

function isIOSVersion26() {
    if (Platform.OS !== 'ios') return false;

    const version = Platform.Version; // 可能是 "16.4" 或数字
    const majorVersion = typeof version === 'string' ? parseInt(version.split('.')[0], 10) : version;

    return majorVersion === 26;
}

// 使用Chrome、Safari等瀏覽器以選項卡形式打開鏈接，URL需要帶有https://
export async function openLink(props) {
    const colorScheme = Appearance.getColorScheme(); // 'light' 或 'dark'
    const { white, themeColor } = themes[colorScheme] || themes.light;
    try {
        let url = '';
        let iosModalMode = 'automatic';
        let modalEnabled = true;
        if (typeof props == 'object') {
            if (props.mode === 'fullScreen') { modalEnabled = false; }
            url = props.URL;
            if (isIOSVersion26()) {
                iosModalMode = 'fullScreen';
            } else {
                iosModalMode = props.mode || 'automatic';
            }
        } else if (typeof props == 'string') {
            url = props;
            if (isIOSVersion26()) { iosModalMode = 'fullScreen'; }
        }

        if (await InAppBrowser.isAvailable()) {
            await InAppBrowser.open(url, {
                // iOS Properties
                dismissButtonStyle: 'close',
                preferredBarTintColor: themeColor,
                preferredControlTintColor: white,
                readerMode: false,
                animated: true,
                modalPresentationStyle: Platform.isPad ? 'fullScreen' : iosModalMode,
                modalTransitionStyle: 'coverVertical',
                modalEnabled: isIOSVersion26() ? false : modalEnabled,  // TODO: 暫時iOS26沒有modal的視圖，直接push到新頁面
                enableBarCollapsing: true,
                // Android Properties
                showTitle: true,
                toolbarColor: themeColor,
                secondaryToolbarColor: themeColor,
                navigationBarColor: white,
                navigationBarDividerColor: white,
                enableUrlBarHiding: true,
                enableDefaultShare: true,
                forceCloseOnRedirection: false,
                showInRecents: true,
                // Specify full animation resource identifier(package:anim/name)
                // or only resource name(in case of animation bundled with app).
                animations: {
                    startEnter: 'slide_in_right',
                    startExit: 'slide_out_left',
                    endEnter: 'slide_in_left',
                    endExit: 'slide_out_right'
                },
                // headers: {
                //     'my-custom-header': 'my custom header value'
                // }
            })
        }
        else {
            if (Platform.OS === 'android') {
                Alert.alert(
                    "應用內瀏覽器選項卡功能",
                    '您的手機似乎沒有安裝Chrome、Firefox、Edge等瀏覽器~\n無法快速在ARK ALL內通過選項卡打開頁面~\n強烈建議使用Chrome瀏覽器！\n安裝完成再使用ARK將十分順滑！',
                    [
                        {
                            text: '前往下載Chrome(也可以在各大網站、應用商店下載)',
                            onPress: () => {
                                Linking.openURL('https://www.google.com/chrome/');
                            }
                        },
                        {
                            text: '以默認瀏覽器打開',
                            onPress: () => {
                                Linking.openURL(url);
                            }
                        },
                        {
                            text: '什麼都不做'
                        }
                    ]
                )
            }
        }
    } catch (e) {
        // 當沒有指定https、需要當前位置權限或其他情況時會觸發Unable to open url.
        try {
            Linking.openURL(URL);
        } catch (error) {
            Alert.alert(error.message);
        }
    }
}