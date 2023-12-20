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
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-easy-toast';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import * as Progress from 'react-native-progress';

import { COLOR_DIY, uiStyle, } from '../../../utils/uiMap';
import { ARK_WIKI } from '../../../utils/pathMap';
import { logToFirebase } from "../../../utils/firebaseAnalytics";

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
                this.webviewRef.current.reload();
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
        ReactNativeHapticFeedback.trigger('soft');
        this.setState({ currentURL: ARK_WIKI })
        this.webviewRef.current.reload();
        this.toast.show(`正全力返回主頁！`, 2000);
    }

    render() {
        const { canGoBack, canGoForward, currentURL, progress, isLoaded } = this.state;
        return (
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
                            default: scale(35),
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
                    {/* 回退按鈕 */}
                    {canGoBack ? (
                        <TouchableOpacity
                            style={{
                                alignSelf: 'center',
                                position: 'absolute',
                                left: scale(13),
                            }}
                            onPress={() => {
                                this.webviewRef.current.goBack();
                                ReactNativeHapticFeedback.trigger('soft');
                            }}
                        >
                            <MaterialCommunityIcons
                                name="arrow-left-circle-outline"
                                size={scale(25)}
                                color={themeColor}
                            />
                        </TouchableOpacity>
                    ) : null}
                    {/* 前進按鈕 */}
                    {canGoForward ? (
                        <TouchableOpacity
                            style={{
                                alignSelf: 'center',
                                position: 'absolute',
                                left: scale(45),
                            }}
                            onPress={() => {
                                this.webviewRef.current.goForward();
                                ReactNativeHapticFeedback.trigger('soft');
                            }}
                        >
                            <MaterialCommunityIcons
                                name="arrow-right-circle-outline"
                                size={scale(25)}
                                color={themeColor}
                            />
                        </TouchableOpacity>
                    ) : null}

                    {/* ARK Logo */}
                    <TouchableOpacity
                        style={{ flexDirection: 'row', }}
                        onPress={this.returnWikiHome}
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
                    </TouchableOpacity>

                    {/* 刷新按鈕 */}
                    <TouchableOpacity
                        style={{
                            alignSelf: 'center',
                            position: 'absolute',
                            right: scale(45),
                        }}
                        onPress={() => {
                            this.webviewRef.current.reload();
                            ReactNativeHapticFeedback.trigger('soft');
                        }}
                    >
                        <MaterialCommunityIcons
                            name="refresh"
                            size={scale(28)}
                            color={themeColor}
                        />
                    </TouchableOpacity>

                    {/* 分享按鈕 */}
                    <TouchableOpacity
                        style={{
                            alignSelf: 'center',
                            position: 'absolute',
                            right: scale(13),
                        }}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('soft');
                            Clipboard.setString(currentURL);
                            this.toast.show(`已複製當前頁面鏈接到粘貼板！\n快去和小夥伴分享吧~`, 2000);
                        }}
                    >
                        <MaterialCommunityIcons
                            name="share-variant"
                            size={scale(23)}
                            color={themeColor}
                        />
                    </TouchableOpacity>
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
                />

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{ color: white }}
                    style={{
                        backgroundColor: COLOR_DIY.themeColor,
                        borderRadius: scale(10),
                    }}
                />
            </View>
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