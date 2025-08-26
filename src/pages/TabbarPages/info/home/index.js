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
    LayoutAnimation,
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
    ARK_HARBOR_LOGIN,
    ARK_HARBOR_NEW_TOPIC,
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
import { openLink } from '../../../../utils/browser.js';
import { getLocalStorage } from '../../../../utils/storageKits.js';
import { toastTextArr, toastKaomojiArr } from '../../../../static/UMARK_Assets/EasterEgg.js';
import CustomBottomSheet from '../../courseSim/BottomSheet';
import HyperlinkText from '../../../../components/HyperlinkText.js';

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
import FastImage from 'react-native-fast-image';
import moment from 'moment';
import TouchableScale from "react-native-touchable-scale";
import { t } from "i18next";
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

let cal = UMCalendar;
const calItemWidth = verticalScale(50);

const HomeScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { white, bg_color, black, themeColor, themeColorLight, themeColorUltraLight, viewShadow, TIME_TABLE_COLOR } = theme;

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
        // {
        //     icon_name: require('../../../../static/img/logo.png'),
        //     icon_type: iconTypes.img,
        //     function_name: t('ARK', { ns: 'home' }),
        //     func: () => {
        //         trigger();
        //         // onRefresh();
        //         // getAppData();
        //         // 刷新重新請求活動頁數據
        //         // eventPage.current.onRefresh();
        //         // openLink({ URL: ARK_HARBOR, mode: 'fullScreen' });
        //         openLink({ URL: BASE_HOST, mode: 'fullScreen' });
        //     },
        // },
        {
            icon_name: require('../../../../static/img/logo.png'),
            icon_type: iconTypes.view,
            function_name: t('發表新帖', { ns: 'home' }),
            func: () => {
                trigger();
                openLink({ URL: ARK_HARBOR_NEW_TOPIC, mode: 'fullScreen' });
            }
        },
        {
            icon_name: 'volunteer-activism',
            icon_type: iconTypes.materialIcons,
            function_name: t('支持我們', { ns: 'home' }),
            func: () => {
                trigger();
                bottomSheetRef.current?.expand();
            },
        },
        {
            icon_name: 'log-in',
            icon_type: iconTypes.ionicons,
            function_name: t('論壇登入', { ns: 'home' }),
            func: () => {
                trigger();
                openLink(ARK_HARBOR_LOGIN);
            },
        },
    ]);
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
    const bottomSheetRef = useRef(null);

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
            calScrollRef?.current?.scrollToOffset({
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
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                    setSelectDay(index);
                }}
            >
                <View style={{
                    backgroundColor,
                    borderRadius: verticalScale(5),
                    paddingHorizontal: scale(5), paddingVertical: verticalScale(2),
                }}>
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        {/* 年份 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: theme.trueWhite,
                            fontSize: verticalScale(8),
                            fontWeight: isThisDateSelected ? 'bold' : 'normal',
                            opacity: !isThisDateSelected && !theme.isLight ? 0.5 : 1,
                            includeFontPadding: false
                        }}>
                            {momentItm.substring(0, 4)}
                        </Text>

                        {/* 日期 */}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: theme.trueWhite,
                                fontSize: verticalScale(12),
                                fontWeight: isThisDateSelected ? 'bold' : 'normal',
                                opacity: !isThisDateSelected && !theme.isLight ? 0.5 : 1,
                                includeFontPadding: false,
                            }}>
                            {`${momentItm.substring(4, 6)}.${momentItm.substring(6, 8)}`}
                        </Text>

                        {/* 星期幾 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: theme.trueWhite,
                            fontSize: verticalScale(7),
                            fontWeight: isThisDateSelected ? 'bold' : 'normal',
                            opacity: !isThisDateSelected && !theme.isLight ? 0.5 : 1,
                            includeFontPadding: false
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
    const GetFunctionIcon = ({ icon_type, icon_name, function_name, func, }) => {
        let icon = null;
        const imageSize = verticalScale(23);
        const iconSize = verticalScale(23);
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
                    size={iconSize - verticalScale(3)}
                    color={theme.themeColor}
                />
            );
        } else if (icon_type == 'MaterialIcons') {
            icon = (
                <MaterialIcons
                    name={icon_name}
                    size={iconSize - verticalScale(3)}
                    color={theme.themeColor}
                />
            )
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
        };

        return (
            <View
                style={{
                    alignItems: 'center', flexDirection: 'row',
                    width: '100%', height: verticalScale(25),
                    marginTop: verticalScale(10),
                    paddingHorizontal: verticalScale(10),
                }}
            >
                {/* 搜索框 */}
                <View style={{
                    backgroundColor: white, borderRadius: verticalScale(6),
                    flexDirection: 'row', alignItems: 'center',
                    marginRight: verticalScale(5),
                    flex: 1, height: '100%', padding: 0,
                }}>
                    <TextInput
                        style={{
                            marginLeft: verticalScale(5),
                            ...uiStyle.defaultText,
                            color: black.main,
                            fontSize: verticalScale(12),
                            flex: 1,
                            padding: 0,
                        }}
                        onChangeText={(inputText) => {
                            setInputText(inputText);
                        }}
                        value={inputText}
                        selectTextOnFocus
                        textAlign='center'
                        textAlignVertical='center'
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
                        flexDirection: 'row', height: '100%',
                        backgroundColor: inputText == '' ? theme.disabled : themeColor,
                        borderRadius: verticalScale(6),
                        paddingHorizontal: verticalScale(5),
                        alignItems: 'center', justifyContent: 'center',
                    }}
                    disabled={inputText == ''}
                    onPress={() => {
                        goToBrowser(inputText);
                    }}
                >
                    <Ionicons name={'search'} size={verticalScale(12)} color={white} />
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: verticalScale(12), color: white, fontWeight: 'bold',
                        textAlignVertical: 'center', lineHeight: verticalScale(14),
                    }}>{t('搜索')}</Text>
                </TouchableOpacity>
            </View>
        )
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

                    <FlatList
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
                                <FastImage
                                    source={item}
                                    style={{ width: '100%', height: '100%', }}
                                    resizeMode={FastImage.resizeMode.contain}
                                />
                            </View>
                        }}
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
                            // 列表primary key
                            keyExtractor={(item, index) => item.startDate + index}
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
                            trigger();
                            navigation.navigate("CourseSimTab");
                        }}>
                        {upcomingCourse ? (
                            <View
                                style={{
                                    flexDirection: 'row', flex: 1,
                                    alignItems: "center", justifyContent: "center",
                                    gap: scale(3),
                                    // backgroundColor: TIME_TABLE_COLOR[lodash.random(0, TIME_TABLE_COLOR.length - 1)],
                                    backgroundColor: themeColorUltraLight,
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
                                marginTop: verticalScale(3),
                                paddingVertical: verticalScale(8),
                                backgroundColor: theme.disabled,
                                opacity: 0.7,
                                borderRadius: verticalScale(5),
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

            <CustomBottomSheet ref={bottomSheetRef} page={'home'}>
                {renderBottomSheet()}
            </CustomBottomSheet>
        </View>
    );
};

export default HomeScreen;
