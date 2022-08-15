import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
    BackHandler,
} from 'react-native';

import {pxToDp} from '../utils/stylesKits';

import {WebView} from 'react-native-webview';
import * as Progress from 'react-native-progress';
import Icon from 'react-native-vector-icons/AntDesign';
import CookieManager from '@react-native-cookies/cookies';

const IntegratedWebView = ({
    source,
    needRefresh,
    triggerRefresh,
    UmPassInfo,
}) => {
    // 記錄網站加載進度和是否加載完成
    const [progress, setProgress] = useState(0);
    const [isLoaded, setLoaded] = useState(false);

    // 網站能否返回前面的網址
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);

    // 動畫的參數設定
    const scrollY = new Animated.Value(0);
    const diffClamp = Animated.diffClamp(scrollY, 0, window.height * 0.08);
    const translateY = diffClamp.interpolate({
        inputRange: [0, window.height * 0.08],
        outputRange: [0, window.height * 0.08],
    });

    // 創建對webview組件的DOM方法引用
    const webViewRef = useRef();

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
            BackHandler.addEventListener(
                'hardwareBackPress',
                onAndroidBackPress,
            );
            return () => {
                BackHandler.removeEventListener(
                    'hardwareBackPress',
                    onAndroidBackPress,
                );
            };
        }
    }, [onAndroidBackPress]);

    return (
        <>
            {
                // 判斷: 網站加載完成則隱藏進度條
                !isLoaded ? (
                    <Progress.Bar
                        progress={progress}
                        borderWidth={0}
                        borderRadius={0}
                        width={null} // null -> 寬度為全屏
                        height={2}
                    />
                ) : null
            }
            <WebView
                ref={webViewRef}
                source={source}
                originWhitelist={['*']}
                startInLoadingState={true}
                onLoadProgress={event => {
                    setProgress(event.nativeEvent.progress);
                    setCanGoBack(event.nativeEvent.canGoBack);
                    setCanGoForward(event.nativeEvent.canGoForward);
                }}
                onLoadStart={() => {
                    setLoaded(false);
                    setProgress(0);
                }}
                onLoadEnd={() => setLoaded(true)}
                onScroll={e => {
                    scrollY.setValue(e.nativeEvent.contentOffset.y);
                }}
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
                    document.getElementById("userNameInput").value="${UmPassInfo.account}";
                    document.getElementById("passwordInput").value="${UmPassInfo.password}";
                `}
            />

            {/* 吸底導航按鈕 */}
            {Platform.OS === 'android' ? null : (
                <NavigationView
                    onBackPress={handleBackPress}
                    onForwardPress={handleForwardPress}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    translateY={translateY}
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
                    {transform: [{translateY: translateY}]},
                ]}>
                {/* 後退按鈕 */}
                <TouchableOpacity
                    style={styles.button}
                    onPress={onBackPress}
                    disabled={canGoBack ? false : true}>
                    <Icon
                        name={'left'}
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
                        name={'right'}
                        size={22}
                        color={canGoForward ? 'black' : 'grey'}
                    />
                </TouchableOpacity>
            </Animated.View>
        )
    );
};

// 取得手機螢幕的size
const window = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        height: window.height * 0.08,
        width: window.width,
        backgroundColor: '#d9d9d9',
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        opacity: 0.9,
    },
    button: {
        marginBottom: pxToDp(10),
    },
});

export default IntegratedWebView;
