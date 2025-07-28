import React, { useRef, useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, Platform, StyleSheet, BackHandler, DeviceEventEmitter, } from 'react-native';

import { WebView } from 'react-native-webview';
import { Header } from '@rneui/themed';
import { scale } from 'react-native-size-matters';
import FastImage from 'react-native-fast-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import * as Progress from 'react-native-progress';
import TouchableScale from "react-native-touchable-scale";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../components/ThemeContext';
import { ARK_WIKI, ARK_WIKI_SEARCH, ARK_WIKI_RANDOM_PAGE, ARK_HARBOR } from '../../../utils/pathMap';
import { logToFirebase } from "../../../utils/firebaseAnalytics";
import { trigger } from "../../../utils/trigger";

const iconSize = scale(25);

const ARKHarbor = (props) => {
    const { theme } = useTheme();
    const { themeColor, black, white, wiki_bg_color, barStyle, isLight, harbor_bg_color } = theme;
    const s = StyleSheet.create({
        titleText: {
            ...uiStyle.defaultText,
            fontSize: scale(18),
            color: themeColor,
            fontWeight: '600'
        }
    })

    const insets = useContext(SafeAreaInsetsContext);

    // 初始狀態
    const [currentURL, setCurrentURL] = useState(ARK_HARBOR);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    const webviewRef = useRef();

    // TODO: 基於用戶偏好是Webview
    // 未打開Harbor的狀態下從別的頁面跳轉至Harbor
    useEffect(() => {
        if (props.route.params && props.route.params.url) {
            setCurrentURL(props.route.params.url);
        }
    }, []);

    // 監聽Android返回鍵
    useEffect(() => {
        logToFirebase('openPage', { page: 'harbor' });
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

    // componentDidUpdate: 監聽 route.params 變化
    // TODO: 用戶偏好是Webview時，導航到此處
    useEffect(() => {
        if (props.route.params && props.route.params.url !== currentURL) {
            setCurrentURL(props.route.params.url);
            // webviewRef.current?.reload();
        }
    }, [props.route.params]);

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
        setCurrentURL(webViewState.url);
        setCanGoBack(webViewState.canGoBack);
        setCanGoForward(webViewState.canGoForward);
    };

    // Tabbar控制GoHome
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('harborGoHome', () => {
            // 調用 goHome
            setCurrentURL(ARK_HARBOR);
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

            {/* TODO: 用戶偏好為Browser時不顯示WebView，顯示設定選項 */}
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
        </View>
    );
};

export default ARKHarbor;