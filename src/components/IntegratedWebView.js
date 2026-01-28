import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
    BackHandler,
    Linking,
    Platform,
} from 'react-native';

import { WebView } from 'react-native-webview';
import SimpleProgressBar from './SimpleProgressBar';
import Icon from 'react-native-vector-icons/AntDesign';
import CookieManager from '@react-native-cookies/cookies';
import { NavigationContext } from '@react-navigation/native';
import { scale } from 'react-native-size-matters';
import { COLOR_DIY } from '../utils/uiMap';

const IntegratedWebView = ({
    source,
    needRefresh,
    triggerRefresh,
    UmPassInfo,
    setOutsideCurrentURL,
}) => {
    // 記錄網站加載進度和是否加載完成
    const [progress, setProgress] = useState(0);
    const [isLoaded, setLoaded] = useState(false);

    // 網站能否返回前面的網址
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);

    const [currentURL, setCurrentURL] = useState(source.uri);

    // iOS前進後退按鈕的動畫參數設定
    // const scrollY = new Animated.Value(0);
    // const diffClamp = Animated.diffClamp(scrollY, 0, NAVI_HEIGHT);
    // const translateY = diffClamp.interpolate({
    //     inputRange: [0, NAVI_HEIGHT],
    //     outputRange: [0, NAVI_HEIGHT],
    // });

    // 創建對webview組件的DOM方法引用
    const webViewRef = useRef();

    const navigation = React.useContext(NavigationContext);

    // 點擊後退按鈕觸發
    const handleBackPress = () => {
        webViewRef.current.goBack();
    };

    // 點擊前進按鈕觸發
    const handleForwardPress = () => {
        webViewRef.current.goForward();
    };

    // 如果外層組件需要刷新
    if (needRefresh) {
        webViewRef.current.reload();
        // 調用外層組件傳遞的切換刷新標識
        triggerRefresh();
    }

    const onAndroidBackPress = useCallback(() => {
        if (canGoBack && webViewRef.current) {
            webViewRef.current.goBack();
            return true;
        }
        return false;
    }, [canGoBack]);

    useEffect(() => {
        // Android平台返回按鈕監聽
        if (Platform.OS === 'android') {
            const sub = BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);
            return () => {
                sub.remove();
            };
        }
    }, [onAndroidBackPress]);

    const onNavigationStateChange = (webViewState) => {
        const currentURL = webViewState.url;
        const { canGoBack, canGoForward } = webViewState;
        // TODO: 仍有部分頁面例如Github，沒有改變navigation狀態，使URL沒有及時更新
        setCurrentURL(currentURL);
        setOutsideCurrentURL(currentURL);
        setCanGoBack(canGoBack);
        setCanGoForward(canGoForward);
    }

    return (
        <>
            {/* 判斷: 網站加載完成則隱藏進度條 */}
            {!isLoaded ? (
                <SimpleProgressBar
                    progress={progress}
                    width={null} // null -> 寬度為全屏
                    height={2}
                    color={COLOR_DIY.themeColor}
                />
            ) : null}

            <WebView
                ref={webViewRef}
                source={{ uri: currentURL }}
                originWhitelist={['*']}
                startInLoadingState={true}
                onLoadProgress={event => {
                    setProgress(event.nativeEvent.progress);
                    // setCanGoBack(event.nativeEvent.canGoBack);
                    // setCanGoForward(event.nativeEvent.canGoForward);
                }}
                onLoadStart={() => {
                    setLoaded(false);
                    setProgress(0);
                }}
                onLoadEnd={e => {
                    setLoaded(true);
                    if (e.nativeEvent && (e.nativeEvent.code == -10 || e.nativeEvent.code == -1022)) {
                        Linking.openURL(currentURL);
                        navigation.goBack();
                    }
                }}
                // onScroll={e => {
                //     scrollY.setValue(e.nativeEvent.contentOffset.y);
                // }}
                onNavigationStateChange={onNavigationStateChange}
                pullToRefreshEnabled
                allowFileAccess
                allowUniversalAccessFromFileURLs
                cacheEnabled={false}
                // IOS
                sharedCookiesEnabled
                enableApplePay={true}
                // Android
                thirdPartyCookiesEnabled
                domStorageEnabled={true}
                cacheMode={'LOAD_NO_CACHE'}
                // 自動注入賬號密碼
                injectedJavaScript={`
                    document.getElementById("userNameInput").value="${UmPassInfo?.account}";
                    document.getElementById("passwordInput").value="${UmPassInfo?.password}";
                `}
            />

            {/* 吸底導航按鈕 */}
            {Platform.OS === 'android' ? null : (
                <NavigationView
                    onBackPress={handleBackPress}
                    onForwardPress={handleForwardPress}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                // translateY={translateY}
                />
            )}
        </>
    );
};

// 渲染底部前進後退導航
const NavigationView = ({
    onBackPress,
    onForwardPress,
    canGoBack,
    canGoForward,
    translateY,
}) => {
    return (
        // 判斷: 網站能前後跳轉的時候才顯示WebView底部導航欄
        (canGoBack || canGoForward) && (
            <Animated.View
                style={[
                    styles.container,
                    // { transform: [{ translateY: translateY }] },
                ]}>
                {/* 後退按鈕 */}
                <TouchableOpacity
                    style={styles.button}
                    onPress={onBackPress}
                    disabled={canGoBack ? false : true}>
                    <Icon
                        name={'leftcircle'}
                        size={22}
                        color={canGoBack ? 'black' : 'grey'}
                    />
                </TouchableOpacity>
                {/* 前進按鈕 */}
                <TouchableOpacity
                    style={styles.button}
                    onPress={onForwardPress}
                    disabled={canGoForward ? false : true}>
                    <Icon
                        name={'rightcircle'}
                        size={22}
                        color={canGoForward ? 'black' : 'grey'}
                    />
                </TouchableOpacity>
            </Animated.View>
        )
    );
};

// 取得手機螢幕的size
// const window = Dimensions.get('window');
// const NAVI_HEIGHT = window.height * 0.08;

const styles = StyleSheet.create({
    container: {
        // position: 'absolute',
        bottom: 0,
        height: scale(50),
        width: '100%',
        backgroundColor: '#d9d9d9',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        opacity: 0.9,
    },
    button: {
        // marginBottom: scale(10),
    },
});

export default IntegratedWebView;
