import React, { useRef, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { View, Text, Platform, StyleSheet, BackHandler, DeviceEventEmitter, TouchableOpacity, } from 'react-native';

import { WebView } from 'react-native-webview';
import { Header } from '@rneui/themed';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-toast-message';
import * as Progress from 'react-native-progress';
import TouchableScale from "react-native-touchable-scale";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { t } from "i18next";
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import Share from 'react-native-share';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../components/ThemeContext';
import { ARK_HARBOR } from '../../../utils/pathMap';
import { logToFirebase } from "../../../utils/firebaseAnalytics";
import { trigger } from "../../../utils/trigger";
import { useAsyncStorage } from '@react-native-async-storage/async-storage';
import { openLink } from '../../../utils/browser';


const ARKHarbor = (props) => {
    const { theme } = useTheme();
    const { themeColor, black, white, wiki_bg_color, barStyle, isLight, harbor_bg_color, bg_color, viewShadow, } = theme;
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
        navContainer: {
            // position: 'absolute',
            bottom: 0,
            height: verticalScale(25),
            width: '100%',
            backgroundColor: bg_color,
            flexDirection: 'row',
            justifyContent: 'space-evenly',
            alignItems: 'center',
            opacity: 0.9,
        },
        button: {
            // marginBottom: scale(10),
        },
    });
    const iconSize = useMemo(() => verticalScale(20), []);

    const insets = useContext(SafeAreaInsetsContext);

    // 初始狀態
    const [currentURL, setCurrentURL] = useState(ARK_HARBOR);
    const [currentTitle, setCurrentTitle] = useState('ARK Harbor');
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);
    const [harborSetting, setHarborSetting] = useState(null);
    const [needRefresh, setNeedRefresh] = useState(false);

    const webviewRef = useRef();

    const { getItem, setItem } = useAsyncStorage('ARK_Harbor_Setting');

    // 點擊後退按鈕觸發
    const handleBackPress = () => {
        trigger();
        webviewRef.current.goBack();
    };

    // 點擊前進按鈕觸發
    const handleForwardPress = () => {
        trigger();
        webviewRef.current.goForward();
    };

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

    // TODO: 待測試，似乎有問題
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
        setCurrentTitle(webViewState.title);
        setCurrentURL(webViewState.url);
        setCanGoBack(webViewState.canGoBack);
        setCanGoForward(webViewState.canGoForward);
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
    }, []);

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
                    {/* {renderFloatButton()} */}
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
            {/* Browser/Webview/回主頁 按鈕 */}
            <View style={[s.navContainer,]}>
                {/* 刷新按鈕 */}
                <TouchableOpacity
                    style={s.button}
                    onPress={() => {
                        trigger();
                        webviewRef.current?.reload();
                    }}
                >
                    <MaterialDesignIcons
                        name={'refresh-circle'}
                        size={iconSize}
                        color={black.main}
                    />
                </TouchableOpacity>
                {/* 後退按鈕 */}
                <TouchableOpacity
                    style={s.button}
                    onPress={handleBackPress}
                    disabled={canGoBack ? false : true}>
                    <MaterialDesignIcons
                        name={'arrow-left-circle'}
                        size={iconSize}
                        color={canGoBack ? black.main : 'grey'}
                    />
                </TouchableOpacity>
                {/* 前進按鈕 */}
                <TouchableOpacity
                    style={s.button}
                    onPress={handleForwardPress}
                    disabled={canGoForward ? false : true}>
                    <MaterialDesignIcons
                        name={'arrow-right-circle'}
                        size={iconSize}
                        color={canGoForward ? black.main : 'grey'}
                    />
                </TouchableOpacity>
                {/* 分享按鈕 */}
                <TouchableOpacity
                    style={s.button}
                    onPress={() => {
                        trigger();
                        const shareOptions = {
                            title: 'ARK職涯港',
                            message: currentTitle + ' \n' + currentURL,
                            url: currentURL,
                        };

                        Share.open(shareOptions)
                            .then(res => { console.log(res); })
                            .catch(err => { err && console.log(err); });
                    }}
                >
                    <MaterialDesignIcons
                        name={'share-circle'}
                        size={iconSize}
                        color={black.main}
                    />
                </TouchableOpacity>
                {/* 打開瀏覽器 */}
                <TouchableOpacity
                    style={s.button}
                    onPress={() => {
                        trigger();
                        openLink({ URL: currentURL, mode: 'fullScreen' });
                        logToFirebase('openPage', { page: 'harbor_browser' });
                    }}
                >
                    <MaterialDesignIcons
                        name={'open-in-app'}
                        size={iconSize}
                        color={black.main}
                    />
                </TouchableOpacity>
            </View>

        </View>
    );
};

export default ARKHarbor;