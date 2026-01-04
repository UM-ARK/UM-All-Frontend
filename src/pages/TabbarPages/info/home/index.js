import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    RefreshControl,
    VirtualizedList,
    TouchableWithoutFeedback,
    Platform,
    Linking,
    Alert,
    AppState,
    KeyboardAvoidingView,
    TextInput,
    Keyboard,
    FlatList,
} from 'react-native';

// 本地工具
import { uiStyle } from '../../../../utils/uiMap.js';
import { useTheme } from '../../../../components/ThemeContext';
import {
    GITHUB_DONATE,
    BASE_HOST,
    BASE_URI,
    GET,
    APPSTORE_URL,
    MAIL,
    ARK_WIKI,
    ARK_WIKI_RANDOM_TITLE,
    UM_Moodle,
    ARK_WEB_CLUB_SIGNIN,
    ARK_HARBOR,
    ARK_HARBOR_LOGIN,
    ARK_HARBOR_NEW_TOPIC,
    ARK_WIKI_DONATE_RANK,
    AFD_UMACARK,
} from '../../../../utils/pathMap.js';
import EventPage from './EventPage.js';
import ModalBottom from '../../../../components/ModalBottom.js';
import { setAPPInfo, handleLogout } from '../../../../utils/storageKits.js';
import { versionStringCompare } from '../../../../utils/versionKits.js';
import packageInfo from '../../../../../package.json';
import HomeCard from './components/HomeCard.js';
import { screenWidth } from '../../../../utils/stylesKits.js';
import { trigger } from '../../../../utils/trigger.js';
import { logToFirebase } from '../../../../utils/firebaseAnalytics.js';
import { openLink } from '../../../../utils/browser.js';
import { getLocalStorage } from '../../../../utils/storageKits.js';
import { toastTextArr, toastKaomojiArr } from '../../../../static/UMARK_Assets/EasterEgg.js';
import CustomBottomSheet from '../../courseSim/BottomSheet';
import HyperlinkText from '../../../../components/HyperlinkText.js';
import SearchBar from './components/SearchBar.js';
import CalendarBar from './components/CalendarBar';

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Interactable from 'react-native-interactable';
import { FlatGrid } from 'react-native-super-grid';
import { inject } from 'mobx-react';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { scale, verticalScale } from 'react-native-size-matters';
import { Image } from 'expo-image';
import moment from 'moment';
import TouchableScale from "react-native-touchable-scale";
import lodash from 'lodash';
import { useTranslation } from 'react-i18next';
import { BottomSheetTextInput, BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';

const paymentArr = [
    require('../../../../static/img/donate/boc.jpg'),
    require('../../../../static/img/donate/mpay.jpg'),
    require('../../../../static/img/donate/wechat.jpg'),
    require('../../../../static/img/donate/alipay.jpg'),
]

const getItem = (data, index) => {
    // data為VirtualizedList設置的data，index為當前渲染到的下標
    return data[index];
};

// 返回數據數組的長度
const getItemCount = data => {
    return data.length;
};

// 定義可使用icon，注意大小寫
const iconTypes = {
    ionicons: 'ionicons',
    materialCommunityIcons: 'MaterialCommunityIcons',
    fontAwesome5: 'FontAwesome5',
    materialIcons: 'MaterialIcons',
    img: 'img',
    view: 'view',
};

const HomeScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { white, bg_color, black, themeColor, themeColorLight, themeColorUltraLight, viewShadow, TIME_TABLE_COLOR } = theme;
    const { t } = useTranslation(['common', 'home',]);

    // 狀態
    const functionArray = useMemo(() => [
        {
            icon_name: 'bus',
            icon_type: iconTypes.ionicons,
            function_name: t('校園巴士', { ns: 'home' }),
            func: () => {
                trigger();
                navigation.navigate('Bus');
            },
        },
        {
            icon_name: 'alpha-m-circle-outline',
            icon_type: iconTypes.materialCommunityIcons,
            function_name: t('Moodle', { ns: 'home' }),
            func: () => {
                trigger();
                logToFirebase('openPage', { page: 'moodle' });
                openLink(UM_Moodle);
            },
        },
        {
            icon_name: require('../../../../static/img/logo.png'),
            icon_type: iconTypes.view,
            function_name: t('新想法', { ns: 'home' }),
            func: () => {
                trigger();
                logToFirebase('funcUse', { funcName: 'harbor_new' });
                openLink({ URL: ARK_HARBOR_NEW_TOPIC, mode: 'fullScreen' });
            }
        },
        {
            icon_name: 'volunteer-activism',
            icon_type: iconTypes.materialIcons,
            function_name: t('支持我們', { ns: 'home' }),
            func: () => {
                trigger();
                logToFirebase('funcUse', { funcName: 'donate' });
                openLink({ URL: AFD_UMACARK, mode: 'fullScreen' });
                // if (sheetIndex != -1) {
                //     logToFirebase('funcUse', { funcName: 'donate' });
                //     bottomSheetRef.current?.close();
                // } else {
                //     bottomSheetRef.current?.expand();
                // }
            },
        },
        {
            icon_name: 'log-in',
            icon_type: iconTypes.ionicons,
            function_name: t('論壇登入', { ns: 'home' }),
            func: () => {
                trigger();
                logToFirebase('funcUse', { funcName: 'harbor_login' });
                openLink(ARK_HARBOR_LOGIN);
            },
        },
    ]);
    const [calRefreshKey, setCalRefreshKey] = useState(0);
    const [isShowModal, setIsShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showUpdateInfo, setShowUpdateInfo] = useState(false);
    const [app_version, setAppVersion] = useState({ lastest: '', local: '' });
    const [version_info, setVersionInfo] = useState(null);
    const [networkError, setNetworkError] = useState(false);
    const [isLoadMore, setIsLoadMore] = useState(false);
    const [inputText, setInputText] = useState('');
    const [upcomingCourse, setUpcomingCourse] = useState(null);
    const [sheetIndex, setSheetIndex] = useState(-1);

    // ref
    const eventPage = useRef(null);
    const scrollView = useRef(null);
    const textInputRef = useRef(null);
    const toastTimer = useRef(null);
    const appStateListener = useRef(null);
    const bottomSheetRef = useRef(null);

    const { i18n } = useTranslation();

    // 生命週期
    useEffect(() => {
        getAppData(false);
        toastTimer.current = setTimeout(() => {
            onRefresh();
        }, 1000);

        appStateListener.current = AppState.addEventListener('change', handleAppStateChange);

        getUpcomingCourse();

        return () => {
            // componentWillUnmount
            if (toastTimer.current) clearTimeout(toastTimer.current);
            if (appStateListener.current) appStateListener.current.remove();
        };
    }, []);

    // 其餘方法轉為函式
    const handleAppStateChange = (nextAppState) => {
        if (AppState.currentState == 'active') {
            if (navigation?.isFocused()) {
                setIsLoading(true);
                getAppData(false);
                onRefresh();
                eventPage.current?.onRefresh();
            }
        }
    };

    const getAppData = async (isLogin) => {
        let URL = BASE_URI + GET.APP_INFO;
        setIsLoading(true);
        await axios
            .get(URL)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    checkInfo(json.content, isLogin);
                }
            })
            .catch(err => {
                if (err.code == 'ERR_NETWORK' || err.code == 'ECONNABORTED') {
                    setNetworkError(true);
                }
            }).finally(() => {
                setIsLoading(false);
            })
    };

    const checkInfo = async (serverInfo, isLogin) => {
        try {
            const strAppInfo = await AsyncStorage.getItem('appInfo');
            if (strAppInfo == null) {
                setAPPInfo(serverInfo);
            } else {
                const appInfo = strAppInfo ? JSON.parse(strAppInfo) : {};
                // 服務器API更新，需要重新登錄
                if (
                    appInfo.API_version &&
                    appInfo.API_version != serverInfo.API_version
                ) {
                    if (isLogin) {
                        alert('服務器API更新，需要重新登錄');
                        handleLogout();
                    } else {
                        setAPPInfo(serverInfo);
                    }
                } else {
                    setAPPInfo(serverInfo);
                }
            }

            // APP版本滯後，提示下載新版本
            const shouldUpdate = versionStringCompare(packageInfo.version, serverInfo.app_version) == -1;
            if (shouldUpdate) {
                setShowUpdateInfo(shouldUpdate);
                setAppVersion({
                    lastest: serverInfo.app_version,
                    local: packageInfo.version,
                });

                Alert.alert(`ARK ${serverInfo.app_version} 現可更新！！`,
                    'version_info' in serverInfo
                        ? serverInfo.version_info
                        : `新版有許多新特性，舊版APP可能會在某時刻不可用，現在前往更新嗎？🥺`,
                    [
                        {
                            text: "Yes",
                            onPress: () => {
                                trigger();
                                const url = Platform.OS === 'ios' ? APPSTORE_URL : BASE_HOST;
                                Linking.openURL(url);
                            },
                        },
                        {
                            text: "No",
                        },
                    ])
                if ('version_info' in serverInfo) {
                    setVersionInfo(serverInfo.version_info);
                }
            }
        } catch (e) {
            // console.error(e);
        }
        finally {
            setIsLoading(false);
            setNetworkError(false);
        }
    };

    // 刷新主頁時展示隨機Toast
    const onRefresh = useCallback(() => {
        setCalRefreshKey((prev) => prev + 1);
        // const toastTextIdx = Math.round(Math.random() * (toastTextArr.length - 1));
        // const toastKaoIdx = Math.round(Math.random() * (toastKaomojiArr.length - 1));
        // Toast.show({
        //     type: 'arkToast',
        //     text1: toastKaomojiArr[toastKaoIdx],
        //     text2: toastTextArr[toastTextIdx],
        //     topOffset: verticalScale(120),
        //     onPress: () => Toast.hide(),
        // });

        getUpcomingCourse();
    }, []);

    /**
     * 從緩存讀取一個星期的列表，跟現在的時間作比較，找到即將到來的課程。
     */
    const getUpcomingCourse = async () => {
        try {
            const now = moment(new Date());
            const s_allCourseAllTime = await getLocalStorage('ARK_WeekTimetable_Storage');
            const curTime = moment().format("HH:mm");
            const curDay = now.format("ddd").toUpperCase();

            const todayCourses = lodash.get(s_allCourseAllTime, curDay, []);
            const upComing = todayCourses.filter(course => moment(course["Time From"], "HH:mm").isAfter(moment(curTime, "HH:mm")));
            setUpcomingCourse(upComing[0]);
        } catch (error) {
            console.log('error', error);
        }
    };

    // 渲染顶部校历图标
    // 渲染功能圖標
    const GetFunctionIcon = ({ icon_type, icon_name, function_name, func, }) => {
        let icon = null;
        const imageSize = verticalScale(23);
        const iconSize = verticalScale(23);
        const containerSize = verticalScale(40); // 固定容器大小
        const iconColor = theme.themeColor;

        if (icon_type == 'ionicons') {
            icon = (
                <Ionicons
                    name={icon_name}
                    size={iconSize}
                    color={iconColor}
                />
            );
        } else if (icon_type == 'MaterialCommunityIcons') {
            icon = (
                <MaterialCommunityIcons
                    name={icon_name}
                    size={iconSize + scale(3)}
                    color={iconColor}
                />
            );
        } else if (icon_type == 'FontAwesome5') {
            icon = (
                <FontAwesome5
                    name={icon_name}
                    size={iconSize - verticalScale(3)}
                    color={iconColor}
                />
            );
        } else if (icon_type == 'MaterialIcons') {
            icon = (
                <MaterialIcons
                    name={icon_name}
                    size={iconSize - verticalScale(3)}
                    color={iconColor}
                />
            )
        } else if (icon_type == 'img') {
            icon = (
                <Image
                    source={icon_name}
                    style={{
                        backgroundColor: theme.trueWhite,
                        height: imageSize, width: imageSize,
                        borderRadius: verticalScale(8),
                    }}
                />
            );
        } else if (icon_type == 'view') {
            icon = (
                <View style={{
                    width: imageSize, height: imageSize,
                    borderRadius: verticalScale(8),
                    backgroundColor: themeColor,
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    <FontAwesome5
                        name={'plus'}
                        size={imageSize - verticalScale(8)}
                        color={white}
                    />
                </View>
            )
        }

        return (
            <TouchableOpacity
                style={{
                    justifyContent: 'center', alignItems: 'center',
                    width: containerSize, height: containerSize,
                }}
                onPress={func}>
                <View style={{
                    width: verticalScale(25),
                    height: verticalScale(25),
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: verticalScale(2),
                }}>
                    {icon}
                </View>

                {function_name && (<View style={{
                    width: '100%',
                }}>
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: verticalScale(8),
                        fontWeight: 'bold',
                        color: theme.themeColor,
                        textAlign: 'center',
                        lineHeight: verticalScale(10),
                    }}>
                        {function_name}
                    </Text>
                </View>)}
            </TouchableOpacity>
        );
    };

    // 打開/關閉底部Modal
    const tiggerModalBottom = () => setIsShowModal(!isShowModal);

    // 懸浮按鈕
    const renderGoTopButton = () => {
        const { viewShadow } = theme;
        return (
            <Interactable.View
                style={{
                    zIndex: 999,
                    position: 'absolute',
                }}
                // 設定所有可吸附的屏幕位置 0,0為屏幕中心
                snapPoints={[
                    { x: -scale(140), y: -verticalScale(220) },
                    { x: scale(140), y: -verticalScale(220) },
                    { x: -scale(140), y: -verticalScale(120) },
                    { x: scale(140), y: -verticalScale(120) },
                    { x: -scale(140), y: verticalScale(0) },
                    { x: scale(140), y: verticalScale(0) },
                    { x: -scale(140), y: verticalScale(120) },
                    { x: scale(140), y: verticalScale(120) },
                    { x: -scale(140), y: verticalScale(220) },
                    { x: scale(140), y: verticalScale(220) },
                ]}
                // 設定初始吸附位置
                initialPosition={{ x: scale(140), y: verticalScale(220) }}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        trigger();
                        // 回頂
                        scrollView.current.scrollTo({ x: 0, y: 0, duration: 500 });
                    }}>
                    <View
                        style={{
                            width: scale(50),
                            height: scale(50),
                            backgroundColor: theme.white,
                            borderRadius: scale(50),
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...viewShadow,
                            margin: scale(5),
                        }}>
                        <Ionicons
                            name={'chevron-up'}
                            size={scale(40)}
                            color={theme.themeColor}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Interactable.View>
        );
    };

    // 處理 Scroll
    const handleScroll = (event) => {
        if (isLoading || isLoadMore) return;
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - verticalScale(100);

        // 接近底部時，獲取更多數據
        if (isCloseToBottom && !isLoadMore && !isLoading) {
            const thisFunc = eventPage?.current;
            // 如果當前頁面有更多數據，則加載更多
            if (thisFunc && !thisFunc.getNoMoreData()) {
                setIsLoadMore(true);
                thisFunc.loadMoreData();
                // 延時鎖，避免到底觸發過多次
                setTimeout(() => {
                    setIsLoadMore(false);
                }, 1000);
            }
        }
    };

    const paymentTextArr = useMemo(() => [
        t('中國銀行澳門↓', { ns: 'home' }),
        t('Mpay↓', { ns: 'home' }),
        t('微信↓', { ns: 'home' }),
        t('支付寶↓', { ns: 'home' }),
    ], [t]);
    const renderBottomSheet = () => {
        return (
            <BottomSheetScrollView>
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(10), }}>
                    <HyperlinkText linkStyle={{ color: themeColor }} navigation={navigation}>
                        <Text style={{
                            ...uiStyle.defaultText, fontWeight: '500',
                            color: black.main,
                        }}>
                            {t('捐贈UM ARK，Push開發者，讓ARK ALL更健康發展！', { ns: 'home' })}
                            {'\n'}
                            {t(`原文Link：`, { ns: 'home' })}
                            {GITHUB_DONATE}
                        </Text>
                    </HyperlinkText>
                    <HyperlinkText linkStyle={{ color: themeColor, }} navigation={navigation}>
                        <Text style={{
                            ...uiStyle.defaultText, fontWeight: '500',
                            color: black.main,
                        }} numberOfLines={1}>
                            {t(`捐贈榜：`, { ns: 'home' })}
                            {ARK_WIKI_DONATE_RANK}
                        </Text>
                    </HyperlinkText>

                    <Text style={{ ...uiStyle.defaultText, color: black.third, }}>
                        {t('您的寶貴贊助將用於ARK的各類應用、服務進行升級維護！', { ns: 'home' })}
                        {'\n'}
                        {t('目前每年需要的維護費用約為1.5k RMB(此數字可能更新不及時)，純為愛發電中QAQ', { ns: 'home' })}
                    </Text>

                    <HyperlinkText linkStyle={{ color: themeColor }} navigation={navigation}>
                        <Text style={{ ...uiStyle.defaultText, color: black.third, marginTop: verticalScale(10) }}>
                            {t('如您已完成捐贈，可發送成功截圖到 umacark@gmail.com 。我們將展示捐贈榜！', { ns: 'home' })}
                        </Text>
                    </HyperlinkText>

                    <BottomSheetFlatList
                        data={paymentArr}
                        renderItem={({ item, index }) => {
                            return <View style={{
                                width: scale(300), height: verticalScale(200),
                                marginTop: verticalScale(20),
                                alignItems: 'center',
                            }}>
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: themeColor,
                                    fontWeight: '500'
                                }}>
                                    {paymentTextArr[index]}
                                </Text>
                                <Image
                                    source={item}
                                    style={{ width: '100%', height: '100%', }}
                                    contentFit='contain'
                                />
                            </View>
                        }}
                        ListFooterComponent={<View style={{ marginBottom: verticalScale(50) }} />}
                        scrollEnabled={false}
                    />
                </View>
            </BottomSheetScrollView>
        )
    }

    // 主渲染
    return (
        <View style={{ flex: 1, backgroundColor: bg_color, alignItems: 'center', justifyContent: 'center' }}>
            {isLoading ? null : renderGoTopButton()}
            <ScrollView
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        refreshing={isLoading}
                        onRefresh={async () => {
                            setIsLoading(true);
                            onRefresh();
                            getAppData();
                            await eventPage.current?.onRefresh();
                        }}
                    />
                }
                alwaysBounceHorizontal={false}
                ref={scrollView}
                showsVerticalScrollIndicator={true}
                onScroll={handleScroll}
                scrollEventThrottle={400}
                keyboardDismissMode={'on-drag'}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ width: '100%', alignItems: 'center', }}
            >

                <SearchBar navigation={navigation} />

                {/* 校曆列表 */}
                <CalendarBar refreshTrigger={calRefreshKey} />

                {/** 即將到來的課程 */}
                <View style={{
                    flexDirection: "row",
                    alignItems: "center", justifyContent: "center",
                    alignSelf: "center",
                    width: screenWidth * 0.8,
                    marginTop: verticalScale(3),
                }}>
                    <TouchableScale
                        style={{ width: "100%", }}
                        onPress={() => {
                            trigger();
                            navigation.navigate("CourseSimTab");
                        }}>
                        {upcomingCourse ? (
                            <View style={{
                                flexDirection: 'row', flex: 1,
                                alignItems: "center", justifyContent: "center",
                                gap: scale(3),
                                backgroundColor: `${themeColor}15`,
                                paddingHorizontal: scale(20), paddingVertical: scale(10),
                                borderRadius: scale(5),
                            }}>
                                <Text style={{ ...uiStyle.defaultText, color: black.main, opacity: 0.7, fontWeight: "bold" }}>{`⏰${t(`下節課：`, { ns: 'timetable' })}`}</Text>
                                <Text style={{ ...uiStyle.defaultText, color: black.main, opacity: 0.7, }}>{upcomingCourse["Course Code"]}</Text>
                                <Text style={{ ...uiStyle.defaultText, color: black.main, opacity: 0.7, }}>{upcomingCourse["Time From"]}</Text>
                            </View>
                        ) : (
                            <View style={{
                                display: "flex",
                                flexDirection: "row",
                                width: "100%",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingVertical: verticalScale(8),
                                backgroundColor: `${theme.disabled}70`,
                                opacity: 0.7,
                                borderRadius: scale(5),
                            }}>
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: black.second,
                                    fontSize: i18n.resolvedLanguage === 'en' ? verticalScale(10) : verticalScale(12),
                                }}>{`☕${t(`接下來無課程~ 點我看課表！`, { ns: 'timetable' })}👀`}</Text>
                            </View>
                        )}
                    </TouchableScale>
                </View>

                {/* 快捷功能圖標 */}
                <View style={{ width: screenWidth * 0.8, marginTop: verticalScale(5), }}>
                    <FlatGrid
                        style={{
                            backgroundColor: white, borderRadius: verticalScale(5),
                        }}
                        itemContainerStyle={{ alignItems: 'center', justifyContent: 'center', }}
                        maxItemsPerRow={5}
                        itemDimension={scale(50)}
                        spacing={verticalScale(2)}
                        data={functionArray}
                        renderItem={({ item }) => GetFunctionIcon(item)}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={false}
                    />
                </View>

                {/* 更新提示 */}
                {showUpdateInfo ?
                    <HomeCard style={{ alignSelf: 'center' }}>
                        <View>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: black.second,
                                    fontWeight: 'bold',
                                    marginTop: scale(2),
                                    alignSelf: 'center',
                                    textAlign: 'center',
                                }}>
                                {`🔥🔥🔥🔥🔥新版本來了‼️🔥🔥🔥🔥🔥`}
                            </Text>
                            {/* 版本更新說明 */}
                            {version_info ? (
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: black.second,
                                    fontWeight: 'bold',
                                    marginTop: scale(2),
                                    alignSelf: 'center',
                                }}>
                                    {'\n更新內容：\n' + version_info + '\n'}
                                </Text>
                            ) : null}
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: themeColor,
                                    marginTop: scale(5),
                                    fontWeight: 'bold',
                                }}>
                                {`最新版本: ${app_version.lastest}`}
                            </Text>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: black.third,
                                    marginTop: scale(5),
                                    fontWeight: 'bold',
                                }}>
                                {`你的版本: ${app_version.local}`}
                            </Text>
                            {Platform.OS === 'ios' ? null : (
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        alignSelf: 'center', textAlign: 'center',
                                        color: themeColor,
                                        marginTop: scale(5),
                                        fontWeight: 'bold',
                                    }}>
                                    {`無Google Play Store用戶可以通過APK方式安裝~`}
                                </Text>
                            )}
                            <TouchableOpacity
                                style={{
                                    alignSelf: 'center',
                                    marginTop: scale(5),
                                    backgroundColor: `${themeColor}15`,
                                    borderRadius: scale(10),
                                    paddingVertical: scale(5), paddingHorizontal: scale(8),
                                }}
                                activeOpacity={0.8}
                                onPress={() => {
                                    trigger();
                                    const url = Platform.OS === 'ios' ? APPSTORE_URL : BASE_HOST;
                                    Linking.openURL(url);
                                }}>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        color: themeColor,
                                        fontWeight: 'bold',
                                    }}>
                                    {`${t('點我更新', { ns: 'home' })}` + '😉~'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </HomeCard>
                    : null}

                {/* 活動頁 */}
                {networkError ? (
                    <Text style={{ alignSelf: 'center', marginTop: verticalScale(3), ...uiStyle.defaultText, color: black.third, }}>網絡錯誤，請手動刷新！</Text>
                ) : null}
                {/* 活動瀑布流，預留間距避免遮擋上方快捷入口 */}
                <EventPage ref={eventPage} style={{ marginTop: verticalScale(3), }} />
            </ScrollView>

            {/* Modal */}
            {isShowModal && (
                <ModalBottom cancel={tiggerModalBottom}>
                    <View style={{
                        padding: scale(20),
                        backgroundColor: theme.white,
                    }}>
                        <ScrollView contentContainerStyle={{
                            alignItems: 'center',
                            marginBottom: scale(30),
                        }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(18),
                                    color: theme.black.third,
                                }}>
                                歡迎來到ARK ALL~
                            </Text>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(15),
                                    color: theme.black.third,
                                }}>
                                登錄後體驗完整功能，現在去嗎？
                            </Text>
                            {/* 登錄按鈕 */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={{
                                    marginTop: scale(10),
                                    backgroundColor: theme.themeColor,
                                    padding: scale(10),
                                    borderRadius: scale(10),
                                    justifyContent: 'center',
                                    alignSelf: 'center',
                                }}
                                onPress={() => {
                                    trigger();
                                    setIsShowModal(false);
                                    navigation.jumpTo(
                                        'MeTabbar',
                                    );
                                }}>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        fontSize: scale(15),
                                        color: 'white',
                                        fontWeight: '500',
                                    }}>
                                    現在登錄
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </ModalBottom>
            )}

            <CustomBottomSheet ref={bottomSheetRef} page={'home'} onSheetIndexChange={(idx) => setSheetIndex(idx)}>
                {renderBottomSheet()}
            </CustomBottomSheet>
        </View>
    );
};

export default HomeScreen;
