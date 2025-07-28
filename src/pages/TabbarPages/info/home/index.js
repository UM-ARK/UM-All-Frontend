import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';

// 本地工具
import { uiStyle, VERSION_EMOJI, } from '../../../../utils/uiMap.js';
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
} from '../../../../utils/pathMap.js';
import EventPage from './EventPage.js';
import ModalBottom from '../../../../components/ModalBottom.js';
import { setAPPInfo, handleLogout } from '../../../../utils/storageKits.js';
import { versionStringCompare } from '../../../../utils/versionKits.js';
import packageInfo from '../../../../../package.json';
import { UMCalendar } from '../../../../static/UMCalendar/UMCalendar.js';
import { getWeek } from '../../../../static/UMCalendar/CalendarConst.js'
import HomeCard from './components/HomeCard.js';
import { screenWidth } from '../../../../utils/stylesKits.js';
import { trigger } from '../../../../utils/trigger.js';
import { logToFirebase } from '../../../../utils/firebaseAnalytics.js';

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import Interactable from 'react-native-interactable';
import { FlatGrid } from 'react-native-super-grid';
import { inject } from 'mobx-react';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { scale, verticalScale } from 'react-native-size-matters';
import FastImage from 'react-native-fast-image';
import moment from 'moment';
import TouchableScale from "react-native-touchable-scale";
import { t } from "i18next";
import lodash from 'lodash';
import { openLink } from '../../../../utils/browser.js';
import { getLocalStorage } from '../../../../utils/storageKits.js';
import { toastTextArr, toastKaomojiArr } from '../../../../static/UMARK_Assets/EasterEgg.js';
import { useTranslation } from 'react-i18next';

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
    img: 'img',
};

let cal = UMCalendar;
const calItemWidth = verticalScale(44.5);

const HomeScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { white, bg_color, black, themeColor, themeColorLight, themeColorUltraLight, viewShadow, TIME_TABLE_COLOR } = theme;

    // 狀態
    const functionArray = [
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
            icon_type: iconTypes.img,
            function_name: t('職涯港', { ns: 'home' }),
            func: () => {
                trigger();
                // onRefresh();
                // getAppData();
                // 刷新重新請求活動頁數據
                // eventPage.current.onRefresh();
                openLink({ URL: ARK_HARBOR, mode: 'fullScreen' });
            },
        },
        {
            icon_name: 'donate',
            icon_type: iconTypes.fontAwesome5,
            function_name: t('支持我們', { ns: 'home' }),
            func: () => {
                trigger();
                let webview_param = {
                    url: GITHUB_DONATE,
                    title: '支持我們',
                    text_color: white,
                    bg_color_diy: themeColor,
                    isBarStyleBlack: false,
                };
                navigation.navigate('Webviewer', webview_param);
            },
        },
        // {
        //     icon_name: 'graduation-cap',
        //     icon_type: iconTypes.fontAwesome5,
        //     function_name: "學生會",
        //     func: () => {
        //         trigger();
        //         let webViewParam = {
        //             url: 'https://info.umsu.org.mo/listdoc?_selector%5Bopen_doc_category_id%5D=1',
        //             title: '學生會通告',
        //             text_color: white,
        //             bg_color_diy: themeColor,
        //             isBarStyleBlack: false,
        //         };
        //         navigation.navigate('Webviewer', webViewParam);
        //     }
        // },
        {
            icon_name: 'people',
            icon_type: iconTypes.ionicons,
            function_name: t('組織登入', { ns: 'home' }),
            func: () => {
                trigger();
                openLink(ARK_WEB_CLUB_SIGNIN);
            },
        },
    ];
    const [selectDay, setSelectDay] = useState(0);
    const [isShowModal, setIsShowModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showUpdateInfo, setShowUpdateInfo] = useState(false);
    const [app_version, setAppVersion] = useState({ lastest: '', local: '' });
    const [version_info, setVersionInfo] = useState(null);
    const [networkError, setNetworkError] = useState(false);
    const [isLoadMore, setIsLoadMore] = useState(false);
    const [inputText, setInputText] = useState('');
    const [upcomingCourse, setUpcomingCourse] = useState(null);

    // ref
    const calScrollRef = useRef(null);
    const eventPage = useRef(null);
    const scrollView = useRef(null);
    const textInputRef = useRef(null);
    const toastTimer = useRef(null);
    const appStateListener = useRef(null);

    const { i18n } = useTranslation();

    // 生命週期
    useEffect(() => {
        getAppData(false);
        getCal();

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
        getCal();
        const toastTextIdx = Math.round(Math.random() * (toastTextArr.length - 1));
        const toastKaoIdx = Math.round(Math.random() * (toastKaomojiArr.length - 1));
        Toast.show({
            type: 'arkToast',
            text1: toastKaomojiArr[toastKaoIdx],
            text2: toastTextArr[toastTextIdx],
            topOffset: verticalScale(120),
            onPress: () => Toast.hide(),
        });

        getUpcomingCourse();
    }, []);

    // 獲取日曆數據
    const getCal = useCallback(() => {
        // 先到網站獲取ics link，https://reg.um.edu.mo/university-almanac/?lang=zh-hant
        // 使用ical-to-json工具轉為json格式，https://github.com/cwlsn/ics-to-json/
        // 放入static/UMCalendar中覆蓋
        // ***務必注意key、value的大小寫！！**
        const nowTimeStamp = moment(new Date()); // 获取今天的开始时间
        const CAL_LENGTH = cal.length;
        let newSelectDay = selectDay;

        // 當前時間已經過去，選擇校曆最後一天
        if (nowTimeStamp.isSameOrAfter(cal[CAL_LENGTH - 1].startDate)) {
            newSelectDay = CAL_LENGTH - 1;
        }
        else if (nowTimeStamp.isSameOrAfter(cal[0].startDate)) {
            // 校曆已經開始，選擇校曆中今天或今天之後的一日
            for (let i = 0; i <= CAL_LENGTH; i++) {
                if (moment(cal[i].startDate).isSameOrAfter(nowTimeStamp)) {
                    newSelectDay = i;
                    break;
                }
            }
        }

        setSelectDay(newSelectDay);

        // 延迟滚动，确保状态更新后再滚动
        setTimeout(() => {
            calScrollRef?.current.scrollToOffset({
                offset: newSelectDay * calItemWidth,
                animated: true
            });
        }, 100);
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
    const renderCal = (item, index) => {
        const momentItm = moment(item.startDate).format("YYYYMMDD");
        // 渲染所選日期
        let isThisDateSelected = selectDay == index;
        // 是否重要日子：開Sem、完Sem、考試
        let isEssencial = item.summary.toUpperCase().indexOf('EXAM') != -1 ||
            item.summary.toUpperCase().indexOf('SEMESTER') != -1 &&
            item.summary.toUpperCase().indexOf('BREAK') == -1;
        let backgroundColor = isThisDateSelected ? themeColor : themeColorLight;
        return (
            <TouchableScale
                style={{ width: calItemWidth, margin: verticalScale(3), }}
                onPress={() => {
                    trigger();
                    setSelectDay(index);
                }}
            >
                <View style={{
                    backgroundColor,
                    borderRadius: scale(8),
                    paddingHorizontal: scale(5), paddingVertical: verticalScale(2),
                }}>
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        {/* 年份 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: theme.trueWhite,
                            fontSize: verticalScale(10),
                            fontWeight: isThisDateSelected ? 'bold' : 'normal',
                            opacity: !isThisDateSelected && !theme.isLight ? 0.5 : 1,
                        }}>
                            {momentItm.substring(0, 4)}
                        </Text>

                        {/* 月份 */}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: theme.trueWhite,
                                fontSize: verticalScale(22),
                                fontWeight: isThisDateSelected ? 'bold' : 'normal',
                                opacity: !isThisDateSelected && !theme.isLight ? 0.5 : 1,
                            }}>
                            {momentItm.substring(4, 6)}
                        </Text>

                        {/* 日期 */}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: theme.trueWhite,
                                fontSize: verticalScale(22),
                                fontWeight: isThisDateSelected ? 'bold' : 'normal',
                                opacity: !isThisDateSelected && !theme.isLight ? 0.5 : 1,
                            }}>
                            {momentItm.substring(6, 8)}
                        </Text>

                        {/* 星期幾 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: theme.trueWhite,
                            fontSize: verticalScale(10),
                            fontWeight: isThisDateSelected ? 'bold' : 'normal',
                            opacity: !isThisDateSelected && !theme.isLight ? 0.5 : 1,
                        }}>
                            {getWeek(item.startDate)}
                        </Text>
                    </View>
                </View>
                {isEssencial ? (
                    <View style={{
                        backgroundColor: theme.warning,
                        borderRadius: scale(50),
                        width: verticalScale(8), height: verticalScale(8),
                        position: 'absolute',
                        right: scale(0), top: scale(0),
                    }} />
                ) : null}
            </TouchableScale>
        );
    };

    // 渲染功能圖標
    const GetFunctionIcon = ({ icon_type, icon_name, function_name, func }) => {
        let icon = null;
        const imageSize = verticalScale(25);
        const iconSize = verticalScale(25);
        const containerSize = verticalScale(40); // 固定容器大小

        if (icon_type == 'ionicons') {
            icon = (
                <Ionicons
                    name={icon_name}
                    size={iconSize}
                    color={theme.themeColor}
                />
            );
        } else if (icon_type == 'MaterialCommunityIcons') {
            icon = (
                <MaterialCommunityIcons
                    name={icon_name}
                    size={iconSize + scale(3)}
                    color={theme.themeColor}
                />
            );
        } else if (icon_type == 'FontAwesome5') {
            icon = (
                <FontAwesome5
                    name={icon_name}
                    size={iconSize - scale(4)}
                    color={theme.themeColor}
                />
            );
        } else if (icon_type == 'img') {
            icon = (
                <FastImage
                    source={icon_name}
                    style={{
                        backgroundColor: theme.trueWhite,
                        height: imageSize, width: imageSize,
                        borderRadius: verticalScale(8),
                    }}
                />
            );
        }

        return (
            <TouchableOpacity
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: containerSize,
                    height: containerSize,
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
                    }}
                        numberOfLines={2}
                    >
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
            const thisFunc = eventPage.current;
            // 如果當前頁面有更多數據，則加載更多
            if (!thisFunc.getNoMoreData()) {
                setIsLoadMore(true);
                thisFunc.loadMoreData();
                // 延時鎖，避免到底觸發過多次
                setTimeout(() => {
                    setIsLoadMore(false);
                }, 1000);
            }
        }
    };

    // 搜索框
    const renderSearch = () => {
        const goToBrowser = (inputText) => {
            trigger();
            logToFirebase('funcUse', {
                funcName: 'searchBar_features',
                searchBarDetail: inputText,
            });
            let url = `https://www.google.com/search?q=${encodeURIComponent('site:umall.one OR site:um.edu.mo ') + encodeURIComponent(inputText)}`;
            openLink(url);
        }

        return (
            <KeyboardAvoidingView
                style={{
                    alignItems: 'center', flexDirection: 'row',
                    width: '100%', height: verticalScale(33),
                    marginTop: verticalScale(10),
                    paddingHorizontal: scale(10),
                }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* 搜索框 */}
                <View style={{
                    backgroundColor: white,
                    borderRadius: scale(6),
                    flexDirection: 'row', alignItems: 'center',
                    marginRight: scale(5),
                    flex: 1, height: '100%',
                }}>
                    <TextInput
                        style={{
                            marginLeft: scale(5),
                            ...uiStyle.defaultText,
                            color: black.main,
                            fontSize: scale(12),
                            alignItems: 'center', justifyContent: 'center',
                            flex: 1,
                        }}
                        onChangeText={(inputText) => {
                            setInputText(inputText);
                        }}
                        value={inputText}
                        selectTextOnFocus
                        textAlign='center' verticalAlign='center' textAlignVertical='center'
                        inputMode='search'
                        placeholder={t("提問：關於澳大的一切...", { ns: 'features' })}
                        placeholderTextColor={black.third}
                        ref={textInputRef}
                        onFocus={() => trigger()}
                        returnKeyType={'search'}
                        selectionColor={themeColor}
                        blurOnSubmit={true}
                        onSubmitEditing={() => {
                            Keyboard.dismiss();
                            if (inputText.length > 0) {
                                goToBrowser(inputText);
                            }
                        }}
                    />
                    {/* 清空搜索框按鈕 */}
                    {inputText.length > 0 ? (
                        <TouchableOpacity
                            onPress={() => {
                                trigger();
                                setInputText('');
                                textInputRef.current.focus();
                            }}
                            style={{ padding: scale(5), marginLeft: 'auto', paddingRight: scale(10) }}
                        >
                            <Ionicons
                                name={'close-circle'}
                                size={scale(15)}
                                color={inputText.length > 0 ? themeColor : black.third}
                            />
                        </TouchableOpacity>
                    ) : null}
                </View>
                {/* 搜索按鈕 */}
                <TouchableOpacity
                    style={{
                        backgroundColor: inputText == '' ? theme.disabled : themeColor,
                        borderRadius: scale(6),
                        padding: scale(7), paddingHorizontal: scale(8),
                        alignItems: 'center', justifyContent: 'center',
                        height: '100%',
                        flexDirection: 'row',
                    }}
                    disabled={inputText == ''}
                    onPress={() => {
                        goToBrowser(inputText);
                    }}
                >
                    <Ionicons name={'search'} size={scale(15)} color={white} />
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: white, fontWeight: 'bold' }}>{t('搜索')}</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        )
    };

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
                contentContainerStyle={{ width: '100%', alignItems: 'center', }}
            >
                {renderSearch()}

                {/* 校曆列表 */}
                {cal && cal.length > 0 ? (
                    <View style={{ backgroundColor: bg_color, width: '100%', marginTop: verticalScale(5), justifyContent: 'center', }}>
                        <VirtualizedList
                            data={cal}
                            ref={calScrollRef}
                            initialNumToRender={selectDay <= 11 ? 11 : selectDay}
                            windowSize={4}
                            initialScrollIndex={selectDay < cal.length ? selectDay : 0}
                            getItemLayout={(data, index) => {
                                const layoutSize = calItemWidth;
                                return {
                                    length: layoutSize,
                                    offset: layoutSize * index,
                                    index,
                                };
                            }}
                            // 渲染每个列表项的方法
                            renderItem={({ item, index }) => renderCal(item, index)}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            getItem={getItem}
                            // 渲染項目數量
                            getItemCount={getItemCount}
                            key={'#'}
                            // 列表primary key
                            keyExtractor={(item, index) => index}
                            ListHeaderComponent={
                                <View style={{ marginLeft: scale(20) }} />
                            }
                            ListFooterComponent={
                                <View style={{ marginRight: scale(20) }} />
                            }
                        />

                        {/* 校曆日期描述 */}
                        {cal[selectDay] && 'summary' in cal[selectDay] ? (
                            <View style={{
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                marginTop: verticalScale(5),
                            }}>
                                {/* 左Emoji */}
                                <Text selectable style={{
                                    ...uiStyle.defaultText,
                                    textAlign: 'center',
                                    fontSize: verticalScale(12),
                                }}
                                >
                                    {VERSION_EMOJI.ve_Left + '\n\n'}
                                </Text>

                                {/* 校曆內容描述 */}
                                <View style={{
                                    backgroundColor: themeColorUltraLight,
                                    borderRadius: scale(5),
                                    paddingVertical: verticalScale(2), paddingHorizontal: scale(5),
                                    width: screenWidth * 0.8,
                                }}>
                                    <Text
                                        selectable
                                        style={{ ...uiStyle.defaultText, color: themeColor, textAlign: 'center', fontSize: verticalScale(12) }}
                                    >
                                        <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), fontWeight: 'bold' }}>
                                            {'📅 校曆 Upcoming:' + '\n'}
                                        </Text>

                                        {/* 如果時間差大於1天，展示活動的時間差 */}
                                        <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), fontWeight: 'bold' }}>
                                            {moment(cal[selectDay].endDate).diff(cal[selectDay].startDate, 'day') > 1 ? (
                                                `${moment(cal[selectDay].startDate).format("YYYY-MM-DD")} ~ ${moment(cal[selectDay].endDate).subtract(1, 'days').format("YYYY-MM-DD")}\n`
                                            ) : null}
                                        </Text>

                                        <Text style={{ fontSize: verticalScale(10) }}>
                                            {cal[selectDay].summary}
                                        </Text>

                                        {'summary_cn' in cal[selectDay] ? (
                                            '\n' + cal[selectDay].summary_cn
                                        ) : null}
                                    </Text>
                                </View>

                                {/* 右Emoji */}
                                <Text selectable style={{
                                    ...uiStyle.defaultText,
                                    textAlign: 'center',
                                    fontSize: verticalScale(12)
                                }}>
                                    {'\n\n' + VERSION_EMOJI.ve_Right}
                                </Text>
                            </View>
                        ) : null}

                    </View>
                ) : null}

                {/** 即將到來的課程 */}
                <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    alignSelf: "center",
                    width: screenWidth * 0.8,
                }}>
                    <TouchableScale
                        style={{
                            width: "100%",
                        }}
                        onPress={() => {
                            navigation.navigate("CourseSimTab");
                        }}>
                        {upcomingCourse ? (
                            <View
                                style={{
                                    flexDirection: 'row', flex: 1,
                                    alignItems: "center", justifyContent: "center",
                                    gap: scale(3),
                                    backgroundColor: TIME_TABLE_COLOR[lodash.random(0, TIME_TABLE_COLOR.length - 1)],
                                    paddingHorizontal: scale(20), paddingVertical: scale(10),
                                    marginTop: verticalScale(5),
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
                                margintTop: verticalScale(5),
                                paddingVertical: scale(10),
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
                <View style={{
                    width: '100%', width: screenWidth * 0.8,
                    marginTop: verticalScale(5),
                    alignSelf: 'center', alignItems: 'center',
                }}>
                    <FlatGrid
                        style={{
                            backgroundColor: white, borderRadius: scale(10),
                            width: '100%',
                        }}
                        contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', }}
                        maxItemsPerRow={5}
                        itemDimension={scale(50)}
                        spacing={scale(3)}
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
                                    backgroundColor: themeColor,
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
                                        color: white,
                                        fontWeight: 'bold',
                                    }}>
                                    {`點我更新 😉~`}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </HomeCard>
                    : null}

                {/* 活動頁 */}
                {networkError ? (
                    <Text style={{ alignSelf: 'center', marginTop: verticalScale(3), ...uiStyle.defaultText, color: black.third, }}>網絡錯誤，請手動刷新！</Text>
                ) : null}
                <EventPage ref={eventPage} />
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
        </View>
    );
};

export default HomeScreen;
