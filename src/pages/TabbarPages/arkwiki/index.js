import React, { Component } from 'react';
import {
    View,
    Text,
    Platform,
    StyleSheet,
    TouchableOpacity,
    BackHandler,
} from 'react-native';

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

import { COLOR_DIY, uiStyle, isLight } from '../../../utils/uiMap';
import { ARK_WIKI, ARK_WIKI_SEARCH, ARK_WIKI_RANDOM_PAGE } from '../../../utils/pathMap';
import { logToFirebase } from "../../../utils/firebaseAnalytics";
import { trigger } from "../../../utils/trigger";

const { themeColor, black, white, wiki_bg_color, barStyle } = COLOR_DIY;
const iconSize = scale(25);

export default class ARKWiki extends Component {
    constructor(props) {
        super(props);
        this.state = {
            currentURL: ARK_WIKI,
            canGoBack: false,
            canGoForward: false,
            progress: 0,
            isLoaded: false,
        };

        this.webviewRef = React.createRef();
        // 未打開Wiki的狀態下從別的頁面跳轉至Wiki
        const params = this.props.route.params;
        if (this.props.route.params) {
            this.state.currentURL = params.url;
            // this.setState({ currentURL: params.url })
            // this.webviewRef.current.reload();
        }
    }

    componentDidMount() {
        logToFirebase('openPage', { page: 'wiki' });
        if (Platform.OS === 'android') {
            this.AndroidOnFocus = this.props.navigation.addListener('focus', () => {
                BackHandler.addEventListener('hardwareBackPress', this.onAndroidBackPress);
            });
            this.AndroidOnBlur = this.props.navigation.addListener('blur', () => {
                BackHandler.removeEventListener('hardwareBackPress', this.onAndroidBackPress);
            });
        }
    }
    componentWillUnmount() {
        if (Platform.OS === 'android') {
            this.AndroidOnFocus();
            this.AndroidOnBlur();
        }
    }

    componentDidUpdate(prevProps) {
        const params = this.props.route.params;
        if (prevProps.route.params != params) {
            if (params && params.url) {
                this.setState({ currentURL: params.url })
                // this.webviewRef.current.reload();
            }
        }
    }

    onAndroidBackPress = () => {
        const { canGoBack } = this.state;
        if (canGoBack && this.webviewRef && this.webviewRef.current) {
            this.webviewRef.current.goBack();
            return true;
        }
        return false;
    }

    // Webview導航狀態改變時調用，能獲取當前頁面URL與是否能回退
    onNavigationStateChange = (webViewState) => {
        const currentURL = webViewState.url;
        const { canGoBack, canGoForward } = webViewState;
        this.setState({ currentURL, canGoBack, canGoForward })
    }

    // 返回ARK Wiki的主頁
    returnWikiHome = () => {
        trigger();
        this.setState({ currentURL: ARK_WIKI })
        // this.webviewRef.current.reload();
        Toast.show({
            type: 'arkToast',
            text1: '正全力返回主頁！',
            topOffset: scale(80),
        })
    }

    goRandomPage = () => {
        trigger();
        this.setState({ currentURL: ARK_WIKI_RANDOM_PAGE })
        // this.webviewRef.current.reload();
        Toast.show({
            type: 'arkToast',
            text1: '正為你打開隨機條目！',
            topOffset: scale(80),
        })
    }

    render() {
        const { canGoBack, canGoForward, currentURL, progress, isLoaded } = this.state;
        return (
            <SafeAreaInsetsContext.Consumer>{(insets) => <View style={{ flex: 1 }}>
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
                            default: insets.top >= 35 ? scale(48) : scale(10),
                        }),
                        paddingTop: 0,
                        // 修復深色模式頂部小白條問題
                        borderBottomWidth: 0,
                    }}
                />

                {/* 頂部工具欄 */}
                <View style={{
                    flexDirection: 'row', width: '100%',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: white,
                    paddingVertical: scale(5),
                }}>
                    {/* 主頁按鈕 */}
                    <TouchableScale
                        style={{
                            alignSelf: 'center',
                            position: 'absolute',
                            left: scale(10),
                        }}
                        onPress={this.returnWikiHome}
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
                                this.webviewRef.current.goBack();
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
                                this.webviewRef.current.goForward();
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
                        style={{ flexDirection: 'row', }}
                        onPress={this.goRandomPage}
                    >
                        <FastImage
                            source={require('../../../static/img/logo.png')}
                            style={{
                                height: iconSize, width: iconSize,
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
                            this.setState({ currentURL: ARK_WIKI_SEARCH })
                            // this.webviewRef.current.reload();
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
                            this.webviewRef.current.reload();
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
                                topOffset: scale(80),
                            })
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
                    ref={this.webviewRef}
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
                    onNavigationStateChange={this.onNavigationStateChange}
                    // 進度條展示
                    onLoadProgress={event => {
                        this.setState({ progress: event.nativeEvent.progress })
                    }}
                    onLoadStart={() => {
                        this.setState({ isLoaded: false, progress: 0 })
                    }}
                    onLoadEnd={() => {
                        this.setState({ isLoaded: true })
                    }}
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
            </View>}</SafeAreaInsetsContext.Consumer>
        );
    }
}

const s = StyleSheet.create({
    titleText: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        color: themeColor,
        fontWeight: '600'
    }
})