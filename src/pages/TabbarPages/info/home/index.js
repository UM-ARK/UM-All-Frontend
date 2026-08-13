import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    ScrollView,
    View,
    Pressable,
    TouchableOpacity,
    RefreshControl,
    TouchableWithoutFeedback,
    Platform,
    AppState,
    Keyboard,
    FlatList,
    useWindowDimensions,
} from 'react-native';

// 本地工具
import Text from '../../../../components/AppText';
import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import {
    GITHUB_DONATE,
    BASE_URI,
    GET,
    MAIL,
    ARK_WIKI,
    UM_Moodle,
    ARK_WIKI_DONATE_RANK,
    AFD_UMACARK,
    USUAL_Q,
} from '../../../../utils/pathMap.js';
import EventPage from './EventPage.js';
import ModalBottom from '../../../../components/ModalBottom.js';
import { setAPPInfo, handleLogout } from '../../../../utils/storageKits.js';
import { getAppUpdateChannels, getAppUpdateHint, getAppUpdateSectionTitle, getLocalAppVersion, isLocalAppOlderThanServer, openAppUpdateUrl, showAppStoreUpdateAlert } from '../../../../utils/appUpdateKits.js';
import HomeCard from './components/HomeCard.js';
import { trigger } from '../../../../utils/trigger.js';
import { logToFirebase } from '../../../../utils/firebaseAnalytics.js';
import { openLink } from '../../../../utils/browser.js';
import { getLocalStorage } from '../../../../utils/storageKits.js';
import { navigateToCourseTab } from '../../../../utils/courseNavigation.js';
import { recordFeatureUsage } from '../../../../utils/featureRecentUsage';
import { toastTextArr, toastKaomojiArr } from '../../../../static/UMARK_Assets/EasterEgg.js';
import CustomBottomSheet from '../../../../utils/BottomSheet';
import HyperlinkText from '../../../../components/HyperlinkText.js';
import SearchBar from './components/SearchBar.js';
import CalendarBar from './components/CalendarBar';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { scale, verticalScale } from 'react-native-size-matters';
import { Image } from 'expo-image';
import moment from 'moment';
import lodash from 'lodash';
import { useTranslation } from 'react-i18next';
import { BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import ScrollToTopButton from '../../../../components/ScrollToTopButton';
import TouchableScale from '../../../../components/TouchableScale';
import FeatureIcon from './search/components/FeatureIcon';
import Ionicons from '@react-native-vector-icons/ionicons';

const MIN_REFRESH_DURATION = 800;
const DONATE_PROBE_TIMEOUT_MS = 2500;
const DEBUG_SHOW_UPDATE_INFO = __DEV__ && false;
const wait = duration => new Promise(resolve => setTimeout(resolve, duration));

const openDonateLink = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DONATE_PROBE_TIMEOUT_MS);
    let url = AFD_UMACARK;

    try {
        const response = await fetch(AFD_UMACARK, {
            method: 'HEAD',
            signal: controller.signal,
        });
        if (!response.ok) {
            url = GITHUB_DONATE;
        }
    } catch {
        url = GITHUB_DONATE;
    } finally {
        clearTimeout(timer);
    }

    return openLink({ URL: url, mode: 'fullScreen' });
};

const paymentArr = [
    require('../../../../static/img/donate/boc.jpg'),
    require('../../../../static/img/donate/mpay.jpg'),
    require('../../../../static/img/donate/wechat.jpg'),
    require('../../../../static/img/donate/alipay.jpg'),
];

// FeatureIcon 支援的 icon_type（與服務頁一致）
const iconTypes = {
    ionicons: 'ionicons',
    materialCommunityIcons: 'MaterialCommunityIcons',
};

const HomeScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { white, bg_color, black, themeColor, themeColorLight, themeColorUltraLight, viewShadow, TIME_TABLE_COLOR } = theme;
    const { t, i18n } = useTranslation(['common', 'home']);
    const { width: windowWidth } = useWindowDimensions();
    const isTc = i18n.language === 'tc';
    const featureFontSize = isTc ? verticalScale(8) : verticalScale(7);

    // 狀態
    const functionArray = useMemo(() => [
        {
            icon_name: 'bus-stop',
            icon_type: iconTypes.materialCommunityIcons,
            function_name: t('校園巴士', { ns: 'home' }),
            func: () => {
                trigger();
                // 與服務頁共用常用紀錄（key_name 對齊 FeatureList）
                recordFeatureUsage('校園巴士');
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
                recordFeatureUsage('Moodle');
                openLink(UM_Moodle);
            },
        },
        // {
        //     icon_name: 'plus',
        //     icon_type: iconTypes.materialCommunityIcons,
        //     function_name: t('新想法', { ns: 'home' }),
        //     func: () => {
        //         trigger();
        //         logToFirebase('funcUse', { funcName: 'harbor_new' });
        //         navigation.navigate('HarborComposer', { mode: 'newTopic' });
        //     },
        // },
        {
            icon_name: 'hand-heart',
            icon_type: iconTypes.materialCommunityIcons,
            function_name: t('支持我們', { ns: 'home' }),
            func: () => {
                trigger();
                logToFirebase('funcUse', { funcName: 'donate' });
                // 愛發電無法連線時改用 GitHub 捐贈頁
                openDonateLink();
                // 舊版打開BottomSheet展示收款碼
                // if (sheetIndex != -1) {
                //     logToFirebase('funcUse', { funcName: 'donate' });
                //     bottomSheetRef.current?.close();
                // } else {
                //     bottomSheetRef.current?.expand();
                // }
            },
        },
        {
            icon_name: 'help-circle-outline',
            icon_type: iconTypes.ionicons,
            function_name: t('常見問題', { ns: 'home' }),
            func: () => {
                trigger();
                logToFirebase('funcUse', { funcName: 'usual_q' });
                openLink(USUAL_Q);
            },
        },
    ], [navigation, t]);
    // 快捷項固定寬度 + 固定間距，整組置中，兩側自然留白（不均分視窗寬）
    const quickFeatureItemWidth = scale(56);
    const quickFeatureGap = scale(20);
    const [calRefreshKey, setCalRefreshKey] = useState(0);
    const [isShowModal, setIsShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showUpdateInfo, setShowUpdateInfo] = useState(DEBUG_SHOW_UPDATE_INFO);
    const [app_version, setAppVersion] = useState({
        lastest: DEBUG_SHOW_UPDATE_INFO ? 'DEBUG' : '',
        local: getLocalAppVersion(),
    });
    const [version_info, setVersionInfo] = useState(DEBUG_SHOW_UPDATE_INFO ? '這是開發模式的更新提示預覽，用於檢查版面與下載入口。' : null);
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
    const refreshingRef = useRef(false);

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
            if (toastTimer.current) {clearTimeout(toastTimer.current);}
            if (appStateListener.current) {appStateListener.current.remove();}
        };
    }, []);

    // 其餘方法轉為函式
    // App 從背景回到前景時：更新 App 資訊、曆與下節課，但不自動重打活動 API，
    // 否則每次從多工或鎖定回來都會讓活動列表閃爍/重載，體感不佳。活動列表請用下拉重新整理。
    const handleAppStateChange = (nextAppState) => {
        if (AppState.currentState == 'active') {
            if (navigation?.isFocused()) {
                setIsLoading(true);
                getAppData(false);
                onRefresh();
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
            });
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

            // APP 版本滯後，提示下載新版本（與設定頁共用 appUpdateKits）
            if (isLocalAppOlderThanServer(serverInfo)) {
                setShowUpdateInfo(true);
                setAppVersion({
                    lastest: serverInfo.app_version,
                    local: getLocalAppVersion(),
                });
                showAppStoreUpdateAlert(serverInfo);
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

    const handleRefresh = async () => {
        if (refreshingRef.current) {
            return;
        }

        refreshingRef.current = true;
        setIsRefreshing(true);
        onRefresh();

        try {
            await Promise.allSettled([
                getAppData(),
                eventPage.current?.onRefresh(),
                wait(MIN_REFRESH_DURATION),
            ]);
        } finally {
            refreshingRef.current = false;
            setIsRefreshing(false);
        }
    };

    /**
     * 從緩存讀取一個星期的列表，跟現在的時間作比較，找到即將到來的課程。
     */
    const getUpcomingCourse = async () => {
        try {
            const now = moment(new Date());
            const s_allCourseAllTime = await getLocalStorage('ARK_WeekTimetable_Storage');
            const curTime = moment().format('HH:mm');
            const curDay = now.format('ddd').toUpperCase();

            const todayCourses = lodash.get(s_allCourseAllTime, curDay, []);
            const upComing = todayCourses.filter(course => moment(course['Time From'], 'HH:mm').isAfter(moment(curTime, 'HH:mm')));
            setUpcomingCourse(upComing[0]);
        } catch (error) {
            console.log('error', error);
        }
    };

    // 快捷功能：與服務頁相同的 FeatureIcon + 文字樣式
    const renderQuickFeature = useCallback(
        item => (
            <TouchableScale
                style={{
                    width: quickFeatureItemWidth,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                activeOpacity={0.7}
                onPress={item.func}
                key={item.function_name}>
                <FeatureIcon item={item} size={scale(22)} />
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: featureFontSize,
                        color: black.second,
                        textAlign: 'center',
                        marginTop: verticalScale(2),
                    }}>
                    {item.function_name}
                </Text>
            </TouchableScale>
        ),
        [black.second, featureFontSize, quickFeatureItemWidth],
    );

    // 打開/關閉底部Modal
    const tiggerModalBottom = () => setIsShowModal(!isShowModal);

    // 處理 Scroll：觸底加載更多數據
    const handleScroll = (event) => {
        const {layoutMeasurement, contentOffset, contentSize} = event.nativeEvent;

        if (isLoading || isLoadMore) {return;}
        // 僅 ARK 活動時瀑布流較短，提前約一屏觸發預載，避免滑到底才開始請求
        const bottomThreshold = Math.max(layoutMeasurement.height, verticalScale(400));
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - bottomThreshold;

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
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(10) }}>
                    <HyperlinkText linkStyle={{ color: themeColor }} navigation={navigation}>
                        <Text style={{
                            ...uiStyle.defaultText, fontWeight: '500',
                            color: black.main,
                        }}>
                            {t('捐贈UM ARK，Push開發者，讓ARK ALL更健康發展！', { ns: 'home' })}
                            {'\n'}
                            {t('原文Link：', { ns: 'home' })}
                            {GITHUB_DONATE}
                        </Text>
                    </HyperlinkText>
                    <HyperlinkText linkStyle={{ color: themeColor }} navigation={navigation}>
                        <Text style={{
                            ...uiStyle.defaultText, fontWeight: '500',
                            color: black.main,
                        }} numberOfLines={1}>
                            {t('捐贈榜：', { ns: 'home' })}
                            {ARK_WIKI_DONATE_RANK}
                        </Text>
                    </HyperlinkText>

                    <Text style={{ ...uiStyle.defaultText, color: black.third }}>
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
                                    fontWeight: '500',
                                }}>
                                    {paymentTextArr[index]}
                                </Text>
                                <Image
                                    source={item}
                                    style={{ width: '100%', height: '100%' }}
                                    contentFit="contain"
                                />
                            </View>;
                        }}
                        ListFooterComponent={<View style={{ marginBottom: verticalScale(50) }} />}
                        scrollEnabled={false}
                    />
                </View>
            </BottomSheetScrollView>
        );
    };

    const updateChannels = useMemo(() => getAppUpdateChannels(), []);
    const updateHint = useMemo(() => getAppUpdateHint(), []);
    const updateSectionTitle = useMemo(() => getAppUpdateSectionTitle(), []);

    // 主渲染
    return (
        <View style={{ flex: 1, backgroundColor: bg_color, alignItems: 'center', justifyContent: 'center' }}>
            <ScrollView
                style={{ width: windowWidth }}
                contentInsetAdjustmentBehavior="automatic"
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                    />
                }
                alwaysBounceHorizontal={false}
                ref={scrollView}
                showsVerticalScrollIndicator={true}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyboardDismissMode={Platform.OS === 'android' ? 'none' : 'on-drag'}
                keyboardShouldPersistTaps={Platform.OS === 'android' ? 'always' : 'handled'}
                contentContainerStyle={{ width: '100%', alignItems: 'center' }}
            >

                <SearchBar navigation={navigation} />

                {/* 校曆列表 */}
                <CalendarBar refreshTrigger={calRefreshKey} />

                {/** 即將到來的課程 */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center', justifyContent: 'center',
                    alignSelf: 'center',
                    width: windowWidth * 0.8,
                    marginTop: verticalScale(6),
                }}>
                    <TouchableScale
                        style={{ width: '100%' }}
                        onPress={() => {
                            trigger();
                            navigateToCourseTab(navigation, {
                                segment: 'timetable',
                            });
                        }}>
                        {upcomingCourse ? (
                            <View style={{
                                flexDirection: 'row', flex: 1,
                                alignItems: 'center', justifyContent: 'center',
                                gap: scale(3),
                                backgroundColor: `${themeColor}15`,
                                paddingHorizontal: scale(20),
                                paddingVertical: verticalScale(6),
                                borderRadius: scale(10),
                            }}>
                                <Text style={{ ...uiStyle.defaultText, color: black.main, opacity: 0.7, fontWeight: 'bold' }}>{`⏰${t('下節課：', { ns: 'timetable' })}`}</Text>
                                <Text style={{ ...uiStyle.defaultText, color: black.main, opacity: 0.7 }}>{upcomingCourse['Course Code']}</Text>
                                <Text style={{ ...uiStyle.defaultText, color: black.main, opacity: 0.7 }}>{upcomingCourse['Time From']}</Text>
                            </View>
                        ) : (
                            <View style={{
                                display: 'flex',
                                flexDirection: 'row',
                                width: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: verticalScale(6),
                                backgroundColor: `${theme.disabled}70`,
                                opacity: 0.7,
                                borderRadius: scale(10),
                            }}>
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: black.second,
                                    fontSize: i18n.resolvedLanguage === 'en' ? verticalScale(10) : verticalScale(12),
                                }}>{`☕${t('接下來無課程~ 點我看課表！', { ns: 'timetable' })}👀`}</Text>
                            </View>
                        )}
                    </TouchableScale>
                </View>

                {/* 快捷功能圖標（固定寬與間距，整組置中聚攏） */}
                <View
                    style={{
                        width: windowWidth,
                        alignSelf: 'center',
                        marginTop: verticalScale(6),
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: quickFeatureGap,
                    }}>
                    {functionArray.map(item => renderQuickFeature(item))}
                </View>

                {/* 更新提示 */}
                {showUpdateInfo ?
                    <HomeCard style={{ alignSelf: 'center' }}>
                        <View style={{ padding: scale(4) }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{
                                    width: scale(38),
                                    height: scale(38),
                                    borderRadius: scale(8),
                                    backgroundColor: themeColorUltraLight,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: scale(10),
                                }}>
                                    <Ionicons name="arrow-up-circle" size={scale(24)} color={themeColor} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        ...uiStyle.defaultText,
                                        color: black.main,
                                        fontSize: scale(16),
                                        fontWeight: 'bold',
                                    }}>
                                        新版本現已推出
                                    </Text>
                                    <Text style={{
                                        ...uiStyle.defaultText,
                                        color: black.third,
                                        fontSize: scale(11),
                                        marginTop: verticalScale(2),
                                    }}>
                                        更新以取得最新功能與修正
                                    </Text>
                                </View>
                                {DEBUG_SHOW_UPDATE_INFO ? (
                                    <Text style={{
                                        ...uiStyle.defaultText,
                                        color: theme.warning,
                                        fontSize: scale(9),
                                        fontWeight: 'bold',
                                    }}>
                                        DEBUG
                                    </Text>
                                ) : null}
                            </View>

                            <View style={{
                                flexDirection: 'row',
                                marginTop: verticalScale(12),
                                gap: scale(8),
                            }}>
                                <View style={{
                                    flex: 1,
                                    backgroundColor: bg_color,
                                    borderRadius: scale(8),
                                    padding: scale(10),
                                }}>
                                    <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(10) }}>目前版本</Text>
                                    <Text style={{ ...uiStyle.defaultText, color: black.second, fontWeight: 'bold', marginTop: verticalScale(2) }}>
                                        {app_version.local || '—'}
                                    </Text>
                                </View>
                                <View style={{
                                    flex: 1,
                                    backgroundColor: white,
                                    borderWidth: 1,
                                    borderColor: themeColor,
                                    borderRadius: scale(8),
                                    padding: scale(10),
                                }}>
                                    <Text style={{ ...uiStyle.defaultText, color: themeColor, fontSize: scale(10) }}>最新版本</Text>
                                    <Text style={{ ...uiStyle.defaultText, color: themeColor, fontWeight: 'bold', marginTop: verticalScale(2) }}>
                                        {app_version.lastest || '—'}
                                    </Text>
                                </View>
                            </View>

                            {version_info ? (
                                <View style={{ marginTop: verticalScale(12) }}>
                                    <Text style={{ ...uiStyle.defaultText, color: black.second, fontWeight: 'bold' }}>更新內容</Text>
                                    <Text style={{
                                        ...uiStyle.defaultText,
                                        color: black.third,
                                        fontSize: scale(11),
                                        lineHeight: scale(17),
                                        marginTop: verticalScale(4),
                                    }}>
                                        {version_info}
                                    </Text>
                                </View>
                            ) : null}

                            <Text style={{
                                ...uiStyle.defaultText,
                                color: black.second,
                                fontWeight: 'bold',
                                marginTop: verticalScale(12),
                                marginBottom: verticalScale(6),
                            }}>
                                {updateSectionTitle}
                            </Text>
                            {updateHint ? (
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: black.third,
                                    fontSize: scale(10),
                                    lineHeight: scale(15),
                                    marginBottom: verticalScale(4),
                                }}>
                                    {updateHint}
                                </Text>
                            ) : null}
                            {updateChannels.map(item => (
                                <Pressable
                                    key={item.label}
                                    style={({ pressed }) => ({
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        minHeight: verticalScale(48),
                                        backgroundColor: bg_color,
                                        opacity: pressed ? 0.7 : 1,
                                        borderRadius: scale(8),
                                        paddingHorizontal: scale(12),
                                        paddingVertical: verticalScale(8),
                                        marginTop: verticalScale(5),
                                    })}
                                    onPress={() => {
                                        trigger();
                                        openAppUpdateUrl(item.url);
                                    }}>
                                    <Ionicons name={item.icon} size={scale(21)} color={themeColor} />
                                    <View style={{ flex: 1, marginLeft: scale(10) }}>
                                        <Text style={{ ...uiStyle.defaultText, color: black.main, fontWeight: 'bold' }}>{item.label}</Text>
                                        <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(10), marginTop: verticalScale(1) }}>{item.detail}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={scale(18)} color={black.third} />
                                </Pressable>
                            ))}
                        </View>
                    </HomeCard>
                    : null}

                {/* 活動頁 */}
                {networkError ? (
                    <Text style={{ alignSelf: 'center', marginTop: verticalScale(3), ...uiStyle.defaultText, color: black.third }}>網絡錯誤，請手動刷新！</Text>
                ) : null}
                {/* 活動瀑布流，預留間距避免遮擋上方快捷入口 */}
                <EventPage ref={eventPage} style={{ marginTop: verticalScale(3) }} />
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

            <ScrollToTopButton virtualizedListRef={scrollView} />

            <CustomBottomSheet ref={bottomSheetRef} page={'home'} onSheetIndexChange={(idx) => setSheetIndex(idx)}>
                {renderBottomSheet()}
            </CustomBottomSheet>
        </View>
    );
};

export default HomeScreen;
