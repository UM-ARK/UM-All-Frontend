import React, { useRef, useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, Platform, StyleSheet, BackHandler, DeviceEventEmitter, } from 'react-native';

import { WebView } from 'react-native-webview';
import { Header } from '@rneui/themed';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-toast-message';
import * as Progress from 'react-native-progress';
import TouchableScale from "react-native-touchable-scale";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { t } from "i18next";

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../components/ThemeContext';
import { ARK_HARBOR } from '../../../utils/pathMap';
import { logToFirebase } from "../../../utils/firebaseAnalytics";
import { trigger } from "../../../utils/trigger";
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { openLink } from '../../../utils/browser';

const iconSize = scale(25);

const ARKHarbor = (props) => {
    const { theme } = useTheme();
    const { themeColor, black, white, wiki_bg_color, barStyle, isLight, harbor_bg_color, bg_color } = theme;
    const s = StyleSheet.create({
        titleText: {
            ...uiStyle.defaultText,
            fontSize: scale(18),
            color: themeColor,
            fontWeight: '600'
        },
        settingButtonContainer: {
            width: scale(200),
            margin: scale(10),
            padding: scale(5), paddingVertical: scale(10),
            borderRadius: scale(5),
            backgroundColor: themeColor,
            alignItems: 'center',
            justifyContent: 'center',
        },
        settingText: {
            ...uiStyle.defaultText,
            fontSize: scale(16),
            color: white,
        },
    })

    const insets = useContext(SafeAreaInsetsContext);

    // 初始狀態
    const [currentURL, setCurrentURL] = useState(ARK_HARBOR);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [harborSetting, setHarborSetting] = useState(null);

    const webviewRef = useRef();

    const { getItem, setItem } = useAsyncStorage('ARK_Harbor_Setting');

    const readItemFromStorage = async () => {
        const item = await getItem();
        const parsedItem = item ? JSON.parse(item) : null;
        setHarborSetting(parsedItem);

        if (parsedItem.tabbarMode === 'webview') {
            logToFirebase('openPage', { page: 'harbor_webview' });
        }
    };

    // componentDidUpdate: 監聽 route.params 變化
    useEffect(() => {
        readItemFromStorage();

        if (props.route.params && props.route.params.url !== currentURL) {
            const { url } = props.route.params;
            setCurrentURL(url);
            // webviewRef.current?.reload();
        }
    }, [props.route.params]);

    // TODO: 待測試
    // 監聽Android返回鍵
    useEffect(() => {
        let focusListener, blurListener;
        if (Platform.OS === 'android') {
            focusListener = props.navigation.addListener('focus', () => {
                BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);
            });
            blurListener = props.navigation.addListener('blur', () => {
                BackHandler.removeEventListener('hardwareBackPress', onAndroidBackPress);
            });
        }
        return () => {
            if (Platform.OS === 'android') {
                focusListener && focusListener();
                blurListener && blurListener();
            }
        };
    }, []);

    // Android 返回鍵處理
    const onAndroidBackPress = useCallback(() => {
        if (canGoBack && webviewRef.current) {
            webviewRef.current.goBack();
            return true;
        }
        return false;
    }, [canGoBack]);

    // Webview導航狀態改變時調用，能獲取當前頁面URL與是否能回退
    const onNavigationStateChange = (webViewState) => {
        // setCurrentURL(webViewState.url);
        // currentURL.current = webViewState.url; // 更新當前URL
        setCanGoBack(webViewState.canGoBack);
        // setCanGoForward(webViewState.canGoForward);
    };

    // Tabbar控制GoHome
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('harborGoHome', () => {
            // 調用 goHome
            setCurrentURL(ARK_HARBOR);
            webviewRef.current?.reload();
            Toast.show({
                type: 'arkToast',
                text1: '正全力返回主頁！',
                topOffset: scale(100),
                onPress: () => Toast.hide(),
            });
        });
        return () => sub.remove();
    }, [])

    return (
        <View style={{ flex: 1 }}>
            <Header
                // harbor的默認配色
                backgroundColor={harbor_bg_color}
                statusBarProps={{
                    backgroundColor: 'transparent',
                    barStyle: barStyle,
                }}
                containerStyle={{
                    // 修復頂部空白過多問題
                    height: Platform.select({
                        android: scale(38),
                        default: insets.top,
                    }),
                    paddingTop: 0,
                    // 修復深色模式頂部小白條問題
                    borderBottomWidth: 0,
                }}
            />

            {!isLoaded ? (
                <Progress.Bar
                    progress={progress}
                    borderWidth={0}
                    borderRadius={0}
                    width={null} // null -> 寬度為全屏
                    height={2}
                    color={themeColor}
                />
            ) : null}

            {/* 用戶偏好為Browser時不顯示WebView，顯示設定選項 */}
            {harborSetting && harborSetting.tabbarMode === 'webview' ? (
                <WebView
                    ref={webviewRef}
                    source={{ uri: currentURL }}
                    originWhitelist={['*']}
                    startInLoadingState={true}
                    pullToRefreshEnabled
                    allowFileAccess
                    allowUniversalAccessFromFileURLs
                    cacheEnabled={true}
                    // IOS
                    sharedCookiesEnabled={true}              // iOS
                    // enableApplePay={true}
                    // Android
                    thirdPartyCookiesEnabled
                    javaScriptCanOpenWindowsAutomatically
                    domStorageEnabled={true}
                    // 前進、回退按鈕所需判斷邏輯
                    onNavigationStateChange={onNavigationStateChange}
                    // 進度條展示
                    onLoadProgress={event => setProgress(event.nativeEvent.progress)}
                    onLoadStart={() => {
                        setIsLoaded(false);
                        setProgress(0);
                    }}
                    onLoadEnd={() => setIsLoaded(true)}
                />
            ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg_color, }}>
                    <Text style={{ ...s.settingText, color: black.main, }}>{t("長按底部論壇Tabbar打開偏好設置", { ns: 'harbor' })}</Text>
                    <Text style={{ ...s.settingText, color: black.main, textAlign: 'center', marginVertical: verticalScale(5), }}>{t("Webview版概率出現登錄錯誤，建議使用Browser版", { ns: 'harbor' })}</Text>

                    <TouchableScale style={{ ...s.settingButtonContainer, }}
                        onPress={() => {
                            trigger();
                            openLink({ URL: ARK_HARBOR, mode: 'fullScreen' });
                        }}
                    >
                        <Text style={{ ...s.settingText, }}>{t("進入Browser版論壇", { ns: 'harbor' })}</Text>
                    </TouchableScale>

                    <TouchableScale style={{ ...s.settingButtonContainer, }}
                        onPress={() => {
                            trigger();
                            setHarborSetting({ tabbarMode: 'webview' });
                            // setCurrentURL(ARK_HARBOR);
                            currentURL.current = ARK_HARBOR;
                            webviewRef.current?.reload();
                        }}
                    >
                        <Text style={{ ...s.settingText, }}>{t("進入Webview版論壇", { ns: 'harbor' })}</Text>
                    </TouchableScale>
                </View>
            )}
        </View>
    );
};

export default ARKHarbor;