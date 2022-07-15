import React, {useState, useRef, useEffect} from 'react';
import {
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    TouchableOpacity,
} from 'react-native';

import {pxToDp} from '../utils/stylesKits';

import {WebView} from 'react-native-webview';
import * as Progress from 'react-native-progress';
import Icon from 'react-native-vector-icons/AntDesign';
import CookieManager from '@react-native-cookies/cookies';

const IntegratedWebView = ({source, needRefresh, triggerRefresh}) => {
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

    useEffect(() => {
        console.log('開啟Webview，訪問', source.uri);
        // 獲取當前頁所有的cookies
        CookieManager.get(source.uri).then(cookies => {
            console.log('CookieManager.get =>', cookies);
        });
        // 清除所有的cookies
        // CookieManager.clearAll().then(success => {
        //     console.log('CookieManager.clearAll =>', success);
        // });
    }, []);

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
                onLoadProgress={event =>
                    setProgress(event.nativeEvent.progress)
                }
                onLoadStart={() => {
                    setLoaded(false);
                    setProgress(0);
                }}
                onLoadEnd={() => setLoaded(true)}
                onNavigationStateChange={state => {
                    const back = state.canGoBack;
                    const forward = state.canGoForward;
                    setCanGoBack(back);
                    setCanGoForward(forward);
                }}
                onScroll={e => {
                    scrollY.setValue(e.nativeEvent.contentOffset.y);
                }}
                pullToRefreshEnabled={true}
                // IOS
                sharedCookiesEnabled={true}
                // Android
                thirdPartyCookiesEnabled={true}
            />

            {/* 吸底導航按鈕 */}
            <NavigationView
                onBackPress={handleBackPress}
                onForwardPress={handleForwardPress}
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                translateY={translateY}
            />
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
