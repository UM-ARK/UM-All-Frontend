import React, { useRef, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { View, Text, Platform, StyleSheet, BackHandler, TouchableOpacity, Alert, } from 'react-native';

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
import { useFocusEffect } from '@react-navigation/native';

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
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bg_color, paddingHorizontal: scale(10), }}>
                    {/* {renderFloatButton()} */}
                    <Text style={{ ...s.settingText, color: black.main, }}>{t("默認打開方式", { ns: 'harbor' })}</Text>
                    <Text style={{ ...s.settingText, color: black.main, textAlign: 'center', marginVertical: verticalScale(5), }}>{t("Webview版概率出現登錄錯誤，建議使用Browser版", { ns: 'harbor' })}</Text>

                    <TouchableScale style={{ ...s.settingButtonContainer, }}
                        onPress={() => {
                            trigger();
                            setHarborSetting({ tabbarMode: 'browser' });
                            setItem(JSON.stringify({ tabbarMode: 'browser' }));
                            openLink({ URL: ARK_HARBOR, mode: 'fullScreen' });
                            Toast.show({
                                type: 'arkToast',
                                text1: 'Set browser mode',
                                topOffset: scale(100),
                                onPress: () => Toast.hide(),
                            });
                        }}
                    >
                        <Text style={{ ...s.settingText, }}>{t("進入Browser版", { ns: 'harbor' })}{'👍🏻'}</Text>
                    </TouchableScale>

                    <TouchableScale style={{ ...s.settingButtonContainer, opacity: 0.75 }}
                        onPress={() => {
                            trigger();
                            setHarborSetting({ tabbarMode: 'webview' });
                            setItem(JSON.stringify({ tabbarMode: 'webview' }));
                            setCurrentURL(ARK_HARBOR);
                            setOpenSetting(false);
                            Toast.show({
                                type: 'arkToast',
                                text1: 'Set webview mode',
                                topOffset: scale(100),
                                onPress: () => Toast.hide(),
                            });
                        }}
                    >
                        <Text style={{ ...s.settingText, }}>{t("進入Webview版", { ns: 'harbor' })}{'(BUG)🤷🏻'}</Text>
                    </TouchableScale>

                    {/* 有保存的設定時才顯示 */}
                    {harborSetting && harborSetting.tabbarMode && (<>
                        <TouchableScale style={{ ...s.settingButtonContainer, backgroundColor: black.third }}
                            onPress={() => {
                                trigger();
                                setOpenSetting(false);
                                // 如果set了tabbarMode: 'browser'，則導航回主頁
                                if (harborSetting && harborSetting.tabbarMode === 'browser') {
                                    if (props.navigation && props.navigation.navigate) {
                                        props.navigation.navigate('Tabbar', { screen: 'NewsTabbar' });
                                    }
                                }
                            }}
                        >
                            <Text style={{ ...s.settingText, }}>{t("退出設定", { ns: 'harbor' })}</Text>
                        </TouchableScale>

                        <Text style={{ ...s.settingText, color: black.main, }}>{t("您可以隨時通過右下角的按鈕進入設定", { ns: 'harbor' })}</Text>
                    </>)}

                </View>
            )}

            {/* Browser/Webview/回主頁 導航按鈕 */}
            <View style={[s.navContainer,]}>
                {/* 主頁按鈕 */}
                <TouchableOpacity
                    style={s.button}
                    onPress={() => {
                        trigger();
                        // 跳轉到Harbor主頁
                        setCurrentURL(ARK_HARBOR);
                        // 让WebView跳转到Harbor主页
                        if (webviewRef.current) {
                            webviewRef.current.stopLoading?.();
                            webviewRef.current.injectJavaScript?.(`window.location.href = '${ARK_HARBOR}'; true;`);
                        }
                    }}
                    disabled={openSetting}
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