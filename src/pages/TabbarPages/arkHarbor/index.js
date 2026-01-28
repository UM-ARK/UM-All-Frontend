import React, { useRef, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { View, Text, Platform, StyleSheet, BackHandler, TouchableOpacity, Alert, } from 'react-native';

import { WebView } from 'react-native-webview';
import { Header } from '@rneui/themed';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-toast-message';
import SimpleProgressBar from '../../../components/SimpleProgressBar';
import TouchableScale from "react-native-touchable-scale";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { t } from "i18next";
import MaterialDesignIcons from '@react-native-vector-icons/material-design-icons';
import Share from 'react-native-share';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
            width: scale(240),
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
    const [openSetting, setOpenSetting] = useState(false);

    const webviewRef = useRef();
    const currentURLRef = useRef(ARK_HARBOR);

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

        if (props.route.params && props.route.params.url !== currentURLRef.current) {
            const { url } = props.route.params;
            setCurrentURL(url);
        }
    }, [props.route.params]);

    // 監聽Android返回鍵
    useEffect(() => {
        if (Platform.OS === 'android') {
            const onBackPress = () => {
                if (canGoBack && webviewRef.current) {
                    webviewRef.current.goBack();
                    return true; // 阻止默認返回行為
                }
                return false; // 讓系統處理（如退出頁面）
            };

            const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            // 卸載時移除監聽
            return () => {
                sub.remove();
            };
        }
    }, [canGoBack]);

    // Webview導航狀態改變時調用，能獲取當前頁面URL與是否能回退
    const onNavigationStateChange = (webViewState) => {
        setCurrentTitle(webViewState.title);
        // setCurrentURL(webViewState.url);
        currentURLRef.current = webViewState.url; // 更新當前URL引用
        setCanGoBack(webViewState.canGoBack);
        setCanGoForward(webViewState.canGoForward);
    };

    // 判斷是否有設定用戶打開偏好
    useFocusEffect(
        useCallback(() => {
            const getSettings = async () => {
                const harborSettingStr = await getItem();
                if (harborSettingStr == null) {
                    setOpenSetting(true);
                } else {
                    const harborSetting = harborSettingStr ? JSON.parse(harborSettingStr) : {};
                    if (harborSetting.tabbarMode === 'browser') {
                        openLink({ URL: ARK_HARBOR, mode: 'fullScreen' });
                    }
                }
            };
            getSettings();
        }, [])
    );

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
                <SimpleProgressBar
                        progress={progress}
                        width={null} // null -> 寬度為全屏
                        height={2}
                        color={themeColor}
                    />
            ) : null}

            {/* 用戶偏好為Browser時不顯示WebView，顯示設定選項 */}
            {!openSetting && harborSetting && harborSetting.tabbarMode === 'webview' ? (
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
                <View style={{ flex: 1, backgroundColor: bg_color, paddingHorizontal: scale(20), justifyContent: 'center' }}>

                    {/* 標題區域 */}
                    <View style={{ marginBottom: verticalScale(30), alignItems: 'center' }}>
                        <Text style={{ fontSize: scale(20), fontWeight: 'bold', color: black.main, marginBottom: verticalScale(8) }}>
                            {t("瀏覽方式偏好", { ns: 'harbor' })}
                        </Text>
                        <Text style={{ fontSize: scale(13), color: black.third, textAlign: 'center', lineHeight: scale(20) }}>
                            {t("選擇最適合您的 Harbor 論壇瀏覽體驗", { ns: 'harbor' })}
                        </Text>
                    </View>

                    {/* 選項 A: Browser (推薦) */}
                    <TouchableScale
                        activeScale={0.98}
                        style={{
                            backgroundColor: white, // 或適配深色模式的顏色
                            borderRadius: scale(16),
                            padding: scale(20),
                            marginBottom: verticalScale(15),
                            borderWidth: 1,
                            borderColor: harborSetting?.tabbarMode === 'browser' ? themeColor : 'transparent', // 選中高亮
                            ...viewShadow,
                        }}
                        onPress={() => {
                            trigger();
                            logToFirebase('clickHarbor', {
                                mode: "browser"
                            });
                            setHarborSetting({ tabbarMode: 'browser' });
                            setItem(JSON.stringify({ tabbarMode: 'browser' }));
                            openLink({ URL: ARK_HARBOR, mode: 'fullScreen' });
                            Toast.show({ type: 'success', text1: '已切換至瀏覽器模式' });
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(8) }}>
                            <Ionicons name="globe-outline" size={scale(16)} color={themeColor} />
                            <Text
                                style={{
                                    fontSize: scale(16),
                                    fontWeight: '600',
                                    color: black.main,
                                    marginLeft: scale(8),
                                    flexShrink: 1,
                                    flexGrow: 1,
                                    minWidth: 0,
                                }}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {t("系統瀏覽器 (推薦)", { ns: 'harbor' })}
                            </Text>
                            <View style={{ backgroundColor: bg_color, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: scale(8) }}>
                                <Text style={{ color: themeColor, fontSize: scale(8), fontWeight: 'bold' }}>STABLE</Text>
                            </View>
                        </View>
                        <Text style={{ fontSize: scale(13), color: black.second, lineHeight: scale(18) }}>
                            ✅ {t("支援自動填充密碼", { ns: 'harbor' })}{'\n'}
                            ✅ {t("兼容性最佳，解決舊設備錯誤", { ns: 'harbor' })}
                        </Text>
                    </TouchableScale>

                    {/* 選項 B: Webview */}
                    <TouchableScale
                        activeScale={0.98}
                        style={{
                            backgroundColor: '#fff',
                            borderRadius: scale(16),
                            padding: scale(20),
                            marginBottom: verticalScale(15),
                            borderWidth: 1,
                            borderColor: harborSetting?.tabbarMode === 'webview' ? themeColor : 'transparent',
                            opacity: 0.9,
                        }}
                        onPress={() => {
                            trigger();
                            logToFirebase('clickHarbor', {
                                mode: "webview"
                            });
                            setHarborSetting({ tabbarMode: 'webview' });
                            setItem(JSON.stringify({ tabbarMode: 'webview' }));
                            setCurrentURL(ARK_HARBOR);
                            setOpenSetting(false);
                            Toast.show({ type: 'info', text1: '已切換至嵌入模式' });
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(8) }}>
                            <Ionicons name="phone-portrait-outline" size={scale(16)} color={black.main} />
                            <Text style={{ fontSize: scale(16), fontWeight: '600', color: black.main, marginLeft: scale(8) }}>
                                {t("APP 內嵌入瀏覽", { ns: 'harbor' })}
                            </Text>
                        </View>
                        <Text style={{ fontSize: scale(13), color: black.second, lineHeight: scale(18) }}>
                            ⚡️ {t("頁面切換更流暢", { ns: 'harbor' })}{'\n'}
                            ⚠️ {t("需手動輸入密碼，舊版 Android 可能報錯", { ns: 'harbor' })}{'\n'}
                            ⚠️ {t("報錯需要自行前往應用商店更新Webview組件", { ns: 'harbor' })}
                        </Text>
                    </TouchableScale>

                    {/* 退出按鈕 */}
                    <TouchableScale
                        style={{ padding: scale(15), alignItems: 'center', marginTop: verticalScale(10) }}
                        onPress={() => {
                            trigger();
                            setOpenSetting(false);
                            if (harborSetting?.tabbarMode === 'browser') {
                                props.navigation?.navigate('Tabbar', { screen: 'NewsTabbar' });
                            }
                        }}
                    >
                        <Text style={{ fontSize: scale(14), color: black.third, }}>
                            {t("隨時通過本頁面右下角設置按鈕修改偏好", { ns: 'harbor' })}
                        </Text>
                        <Text style={{ fontSize: scale(15), color: black.third, textDecorationLine: 'underline' }}>
                            {t("暫不修改，返回", { ns: 'harbor' })}
                        </Text>
                    </TouchableScale>
                </View>
            )}

            {/* Browser/Webview/回主頁 導航按鈕 */}
            <View style={[s.navContainer,]}>
                {/* 主頁按鈕 */}
                <TouchableOpacity
                    style={s.button}
                    onPress={() => {
                        trigger();
                        setOpenSetting(false);
                        // 跳轉到Harbor主頁
                        setCurrentURL(ARK_HARBOR);
                        // 让WebView跳转到Harbor主页
                        if (webviewRef.current) {
                            webviewRef.current.stopLoading?.();
                            webviewRef.current.injectJavaScript?.(`window.location.href = '${ARK_HARBOR}'; true;`);
                        }
                    }}
                >
                    <MaterialDesignIcons
                        name={'home-circle'}
                        size={iconSize}
                        color={black.main}
                    />
                </TouchableOpacity>
                {/* 刷新按鈕 */}
                <TouchableOpacity
                    style={s.button}
                    onPress={() => {
                        trigger();
                        webviewRef.current?.reload();
                    }}
                    disabled={openSetting}
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
                    disabled={openSetting || (canGoBack ? false : true)}>
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
                    disabled={openSetting || (canGoForward ? false : true)}>
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
                            message: currentTitle + ' \n' + currentURLRef.current,
                            url: currentURLRef.current,
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
                        openLink({ URL: currentURLRef.current, mode: 'fullScreen' });
                        logToFirebase('openPage', { page: 'harbor_browser' });
                    }}
                >
                    <MaterialDesignIcons
                        name={'web'}
                        size={iconSize}
                        color={black.main}
                    />
                </TouchableOpacity>
                {/* 設置按鈕 */}
                <TouchableOpacity
                    style={s.button}
                    onPress={() => {
                        trigger();
                        setCurrentURL(currentURLRef.current); // 確保設置頁面打開時URL正確
                        // 打開ARK Harbor設置頁面
                        setOpenSetting(!openSetting);
                    }}
                >
                    <MaterialDesignIcons
                        name={'cog-outline'}
                        size={iconSize}
                        color={black.main}
                    />
                </TouchableOpacity>

            </View>

        </View>
    );
};

export default ARKHarbor;