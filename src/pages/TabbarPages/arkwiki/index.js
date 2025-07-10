import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity, BackHandler, } from 'react-native';

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
import { ARK_WIKI, ARK_WIKI_SEARCH, ARK_WIKI_RANDOM_PAGE } from '../../../utils/pathMap';
import { logToFirebase } from "../../../utils/firebaseAnalytics";
import { trigger } from "../../../utils/trigger";

const iconSize = scale(25);

const ARKWiki = (props) => {
    const { theme } = useTheme();
    const { themeColor, black, white, wiki_bg_color, barStyle, isLight } = theme;
    const s = StyleSheet.create({
        titleText: {
            ...uiStyle.defaultText,
            fontSize: scale(18),
            color: themeColor,
            fontWeight: '600'
        }
    })


    // 初始狀態
    const [currentURL, setCurrentURL] = useState(
        props.route.params && props.route.params.url ? props.route.params.url : ARK_WIKI
    );
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    const webviewRef = useRef();

    // 未打開Wiki的狀態下從別的頁面跳轉至Wiki
    useEffect(() => {
        if (props.route.params && props.route.params.url) {
            setCurrentURL(props.route.params.url);
            // webviewRef.current?.reload();
        }
    }, []);

    // componentDidMount & componentWillUnmount 對應
    useEffect(() => {
        logToFirebase('openPage', { page: 'wiki' });
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

    // 返回ARK Wiki的主頁
    const returnWikiHome = () => {
        trigger();
        setCurrentURL(ARK_WIKI);
        // webviewRef.current?.reload();
        Toast.show({
            type: 'arkToast',
            text1: '正全力返回主頁！',
            topOffset: scale(100),
            onPress: () => Toast.hide(),
        });
    };

    const goRandomPage = () => {
        trigger();
        setCurrentURL(ARK_WIKI_RANDOM_PAGE);
        // webviewRef.current?.reload();
        Toast.show({
            type: 'arkToast',
            text1: '正為你打開隨機條目！',
            topOffset: scale(100),
            onPress: () => Toast.hide(),
        });
    };

    return (
        <SafeAreaInsetsContext.Consumer>
            {(insets) => (
                <View style={{ flex: 1 }}>
                    <Header
                        // Wiki的默認配色
                        backgroundColor={white}
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

                    {/* 頂部工具欄 */}
                    <View
                        style={{
                            flexDirection: 'row',
                            width: '100%',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: white,
                            paddingVertical: scale(5),
                        }}
                    >
                        {/* 主頁按鈕 */}
                        <TouchableScale
                            style={{
                                alignSelf: 'center',
                                position: 'absolute',
                                left: scale(10),
                            }}
                            onPress={returnWikiHome}
                        >
                            <MaterialCommunityIcons
                                name="home-outline"
                                size={scale(28)}
                                color={themeColor}
                            />
                        </TouchableScale>

                        {/* 回退按鈕 */}
                        {canGoBack ? (
                            <TouchableScale
                                style={{
                                    alignSelf: 'center',
                                    position: 'absolute',
                                    left: scale(45),
                                }}
                                onPress={() => {
                                    webviewRef.current.goBack();
                                    trigger();
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="arrow-left-circle-outline"
                                    size={scale(25)}
                                    color={themeColor}
                                />
                            </TouchableScale>
                        ) : null}

                        {/* 前進按鈕 */}
                        {canGoForward ? (
                            <TouchableScale
                                style={{
                                    alignSelf: 'center',
                                    position: 'absolute',
                                    left: scale(75),
                                }}
                                onPress={() => {
                                    webviewRef.current.goForward();
                                    trigger();
                                }}
                            >
                                <MaterialCommunityIcons
                                    name="arrow-right-circle-outline"
                                    size={scale(25)}
                                    color={themeColor}
                                />
                            </TouchableScale>
                        ) : null}

                        {/* ARK Logo */}
                        <TouchableScale
                            style={{ flexDirection: 'row' }}
                            onPress={goRandomPage}
                        >
                            <FastImage
                                source={require('../../../static/img/logo.png')}
                                style={{
                                    height: iconSize,
                                    width: iconSize,
                                    borderRadius: scale(5),
                                }}
                            />
                            {/* 標題 */}
                            <View style={{ marginLeft: scale(5) }}>
                                <Text style={s.titleText}>ARK Wiki</Text>
                            </View>
                        </TouchableScale>

                        {/* 搜索按鈕 */}
                        <TouchableScale
                            style={{
                                alignSelf: 'center',
                                position: 'absolute',
                                right: scale(65),
                            }}
                            onPress={() => {
                                trigger();
                                setCurrentURL(ARK_WIKI_SEARCH);
                                // webviewRef.current?.reload();
                            }}
                        >
                            <Ionicons
                                name="search"
                                size={scale(25)}
                                color={themeColor}
                            />
                        </TouchableScale>

                        {/* 刷新按鈕 */}
                        <TouchableScale
                            style={{
                                alignSelf: 'center',
                                position: 'absolute',
                                right: scale(35),
                            }}
                            onPress={() => {
                                webviewRef.current.reload();
                                trigger();
                            }}
                        >
                            <MaterialCommunityIcons
                                name="refresh"
                                size={scale(28)}
                                color={themeColor}
                            />
                        </TouchableScale>

                        {/* 分享按鈕 */}
                        <TouchableScale
                            style={{
                                alignSelf: 'center',
                                position: 'absolute',
                                right: scale(10),
                            }}
                            onPress={() => {
                                trigger();
                                Clipboard.setString(currentURL);
                                Toast.show({
                                    type: 'arkToast',
                                    text1: '已複製當前頁面鏈接到粘貼板！',
                                    text2: '快去和小夥伴分享吧~',
                                    topOffset: scale(100),
                                    onPress: () => Toast.hide(),
                                });
                            }}
                        >
                            <MaterialCommunityIcons
                                name="share-variant"
                                size={scale(23)}
                                color={themeColor}
                            />
                        </TouchableScale>
                    </View>

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
                        sharedCookiesEnabled
                        enableApplePay={true}
                        // Android
                        thirdPartyCookiesEnabled
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
                        injectedJavaScript={`
              window.applyPref = () => {
                const a = "skin-citizen-", b = "skin-citizen-theme",
                  c = a => window.localStorage.getItem(a),
                  d = c("skin-citizen-theme"),
                  e = () => {
                    const d = {
                      fontsize: "font-size",
                      pagewidth: "--width-layout",
                      lineheight: "--line-height"
                    },
                    e = () => ["auto", "dark", "light"].map(b => a + b),
                    f = a => {
                      let b = document.getElementById("citizen-style");
                      null === b && (b = document.createElement("style"),
                        b.setAttribute("id", "citizen-style"),
                        document.head.appendChild(b)),
                        b.textContent = \`:root{\${a}}\`
                    };

                    try {
                      const g = c(b);
                      let h = "";
                      if (null !== g) {
                        const b = document.documentElement;
                        b.classList.remove(...e(a)),
                          b.classList.add(a + g)
                      }
                      for (const [b, e] of Object.entries(d)) {
                        const d = c(a + b);
                        null !== d && (h += \`\${e}:\${d};\`)
                      } h && f(h)
                    }
                    catch (a) { }
                  };

                // d==='auto' 隨著用戶設置而修改
                // true 強行按照設備深淺色模式修改Wiki的深淺色模式
                if ( true ) {
                  const a = ${isLight},
                    c = a ? "light" : "dark",
                    d = (a, b) => window.localStorage.setItem(a, b);
                    d(b, c),
                    e(),
                    a.addListener(() => { e() }), d(b, "auto")
                }
                else e()
              },

              (() => { window.applyPref() })();
            `}
                    />
                </View>
            )}
        </SafeAreaInsetsContext.Consumer>
    );
};

export default ARKWiki;