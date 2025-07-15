import React, { Component, memo, useState, useCallback, useRef, useEffect, useMemo, useContext } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Platform,
    FlatList,
    KeyboardAvoidingView,
    Keyboard,
    Alert,
} from "react-native";

import { UMEH_URI, UMEH_API, WHAT_2_REG, USER_AGREE, ARK_WIKI_SEARCH, OFFICIAL_COURSE_SEARCH, WHAT_2_REG_SEARCH, } from "../../../utils/pathMap";
import { useTheme, uiStyle } from '../../../components/ThemeContext';
import { trigger } from '../../../utils/trigger';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import offerCourses from '../../../static/UMCourses/offerCourses';
import coursePlan from '../../../static/UMCourses/coursePlan';
import coursePlanTime from '../../../static/UMCourses/coursePlanTime';
import Loading from '../../../components/Loading';
import CourseCard from './component/CourseCard';
import { openLink } from '../../../utils/browser';
import { getLocalStorage, setLocalStorage, logAllStorage } from '../../../utils/storageKits';

import axios from "axios";
import { scale, verticalScale } from "react-native-size-matters";
import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TouchableScale from "react-native-touchable-scale";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { MenuView } from '@react-native-menu/menu';
import moment from 'moment';
import Toast from 'react-native-simple-toast';
import RNRestart from 'react-native-restart';
import { t } from "i18next";
import ActionSheet from '@alessiocancian/react-native-actionsheet';
import { Dialog, } from '@rneui/themed';
import lodash from 'lodash';
import OpenCC from 'opencc-js';

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' }); // 簡體轉繁體

const iconSize = scale(25);

// 學院名中文參考
const unitMap = {
    'FAH': '人文學院 - Arts and Humanities',
    'FBA': '工商管理學院 - Business Administration',
    'FED': '教育學院 - Education',
    'FST': '科技學院 - Science and Technology',
    'FHS': '健康科學學院 - Health Sciences',
    'FSS': '社會科學學院 - Social Sciences',
    'FLL': '法學院 - Law',
    'IAPME': '應用物理及材料工程研究院 - Institute of Applied Physics and Materials Engineering',
    'ICMS': '中華醫藥研究院 - Institute of Chinese Medical Sciences',
    'IME': '微電子研究院 - Institute of Microelectronics',
    'MSC': ' - ',
    'RC': '書院 - Residential College',
    'HC': '榮譽學院 - Honours College',
}

// 部門/學系名中文參考
const depaMap = {
    // FAH
    'CCHC': '中國歷史文化中心',
    'DAD': '藝術設計系',
    'DCH': '中國語言文學系',
    'DENG': '英文系',
    'DHIST': '歷史系',
    'DJP': '日文系',
    'CJS': '日本研究中心',
    'DPT': '葡文系',
    'ELC': '英語中心',
    'DPHIL': '哲學及宗教學系',
    'PHIL': '哲學及宗教學系',

    // FBA
    'AIM': '會計及資訊管理學系',
    'DRTM': '綜合度假村及旅遊管理學系',
    'FBE': '金融及商業經濟學系',
    'MMI': '管理及市場學系',

    // FHS
    'DBS': '生物醫學系',
    'DPS': '藥物科學系',
    'DPM': '藥學系',

    // FLL
    'GLS': '環球法律學系',
    'MLS': '澳門法學系',

    // FSS
    'CAD': '藝術與設計中心',
    'DCOM': '傳播系',
    'DECO': '經濟學系',
    'DGPA': '政府與行政學系',
    'DPSY': '心理學系',
    'DSOC': '社會學系',

    // FST
    'CEE': '土木及環境工程系',
    'CIS': '電腦及資訊科學系',
    'CSG': '化學支持小組',
    'DPC': '物理及化學系',
    'ECE': '電機及電腦工程系',
    'EME': '機電工程系',
    'MAT': '數學系',
    'OST': '海洋科學與技術系',
}

// GE課中文參考
const geClassMap = {
    'GEGA': '全球意識 - Global Awareness',
    'GELH': '文學與人文 - Literature and Humanities',
    'GESB': '社會與行為 - Society and Behaviour',
    'GEST': '科學和技術 - Science and Technology',
}

// add drop, pre enroll 中文參考
const adpeMap = {
    'ad': '增退選',
    'preEnroll': '預選課',
}
const modeENStr = {
    'ad': 'Add Drop',
    'preEnroll': 'Pre Enroll',
};
const defaultFilterOptions = {
    mode: 'ad', // preEnroll
    option: 'CMRE',
    facultyName: 'FST',
    depaName: 'ECE',
    GE: 'GEST',
}
const CMGEList = ['CMRE', 'GE'];

// 判斷字符串是否包含中文
function hasChinese(str) {
    return /[\u4E00-\u9FA5]+/g.test(str)
}

// 設置本地緩存
async function setLocalOptions(filterOptions) {
    try {
        const strFilterOptions = JSON.stringify(filterOptions);
        await AsyncStorage.setItem('ARK_Courses_filterOptions', strFilterOptions)
            .catch(e => console.log('AsyncStorage Error', e));
    } catch (e) {
        Alert.alert(JSON.stringify(e));
    }
}

const What2Reg = (props) => {
    const { theme } = useTheme();
    const { themeColor, themeColorUltraLight,
        black, white, viewShadow, disabled,
        secondThemeColor, what2reg_color, bg_color, barStyle } = theme;

    const s = StyleSheet.create({
        classItm: {
            borderRadius: scale(10),
            borderColor: black.third,
            marginHorizontal: scale(2),
        },
        classItmTitleText: {
            ...uiStyle.defaultText,
            fontSize: scale(13),
            color: themeColor,
            fontWeight: '600',
            alignSelf: 'center',
            marginLeft: scale(5),
            textAlign: 'center',
        }
    })

    const [inputText, setInputText] = useState("");
    const [inputOK, setInputOK] = useState(false);
    const [filterOptions, setFilterOptions] = useState(defaultFilterOptions);
    const [s_course_mode, setCourse_mode] = useState('ad'); // preEnroll
    const [scrollData, setScrollData] = useState({});

    const [s_offerCourses, setS_offerCourses] = useState(offerCourses);
    const [s_coursePlan, setS_coursePlan] = useState(coursePlan);
    const [s_coursePlanTime, setS_coursePlanTime] = useState(coursePlanTime);

    const [dialogVisible, setDialogVisible] = useState(false);

    const textInputRef = useRef(null);
    const scrollViewRef = useRef(null);
    const actionSheetRef = useRef(null);

    const insets = useContext(SafeAreaInsetsContext);

    // 3.0開始，優先使用本地緩存的offerCourses數據展示，後台對比雲端數據版本，提示更新
    useEffect(() => {
        const init = async () => {
            logToFirebase('openPage', { page: 'chooseCourses' });
            // logAllStorage();
            // await AsyncStorage.removeItem('course_file_check_date');

            try {
                // 可供預選課程
                const storageOfferCourses = await getLocalStorage('offer_courses');
                if (storageOfferCourses) {
                    setS_offerCourses(storageOfferCourses);
                } else {
                    const saveResult = await setLocalStorage('offer_courses', offerCourses);
                    if (saveResult !== 'ok') Alert.alert('Error', JSON.stringify(saveResult));
                }

                // Add Drop課程，唯一的course code數據
                const storageCoursePlan = await getLocalStorage('course_plan');
                if (storageCoursePlan) {
                    setS_coursePlan(storageCoursePlan);
                } else {
                    const saveResult = await setLocalStorage('course_plan', coursePlan);
                    if (saveResult !== 'ok') Alert.alert('Error', JSON.stringify(saveResult));
                }

                // Add Drop課程時間數據，同course code，多section
                const storageCoursePlanTime = await getLocalStorage('course_plan_time');
                if (storageCoursePlanTime) {
                    setS_coursePlanTime(storageCoursePlanTime);
                } else {
                    const saveResult = await setLocalStorage('course_plan_time', coursePlanTime);
                    if (saveResult !== 'ok') Alert.alert('Error', JSON.stringify(saveResult));
                }

                // 讀取課程類別選擇器的本地緩存
                const strFilterOptions = await AsyncStorage.getItem('ARK_Courses_filterOptions');
                const localFilterOptions = strFilterOptions ? JSON.parse(strFilterOptions) : undefined;

                const nextFilterOptions = localFilterOptions ? localFilterOptions : defaultFilterOptions;
                setCourse_mode(prev => {
                    if (prev !== nextFilterOptions.mode) {
                        return nextFilterOptions.mode;
                    }
                    return prev;
                })
                updateFilterOptions(nextFilterOptions);
            } catch (e) {
                Alert.alert('ARK Courses error, 請聯繫開發者！', e);
            }
        };
        init();
    }, []);

    // 更新Add Drop課表的數據
    const updateLocalCourseData = async (type, callback) => {
        const storageMap = {
            coursePlan: 'course_plan',
            coursePlanTime: 'course_plan_time',
            offerCourses: 'offer_courses',
        };
        const fileNameMap = {
            coursePlan: 'coursePlan',
            coursePlanTime: 'coursePlanTime',
            offerCourses: 'offerCourses',
        };
        const stateMap = {
            coursePlan: setS_coursePlan,
            coursePlanTime: setS_coursePlanTime,
            offerCourses: setS_offerCourses,
        };
        // 儲存對應資料到localStorage中
        const coverStorage = async (type, data) => {
            try {
                stateMap[type](data);
                const saveResult = await setLocalStorage(storageMap[type], data);
                if (saveResult !== 'ok') Alert.alert('Error', JSON.stringify(saveResult));
            } catch (error) {
                Alert.alert('', '儲存課表數據失敗', null, { cancelable: true });
            }
        };

        try {
            const res = await axios.get(
                `https://raw.githubusercontent.com/UM-ARK/UM-All-Frontend/master/src/static/UMCourses/${fileNameMap[type]}.json`
            );
            if (res.status === 200) {
                const { data } = res;
                let toastMes = '已拉取更新！';

                // type為coursePlan、offerCourses時檢查updateTime
                if (type === 'coursePlan' || type === 'offerCourses') {
                    const currentState =
                        type === 'coursePlan' ? s_coursePlan : s_offerCourses;
                    if (currentState.updateTime !== data.updateTime) {
                        if (type === 'coursePlan') {
                            await updateLocalCourseData('coursePlanTime')
                            // await updateLocalCourseData('coursePlanTime', () => {
                            //     Alert.alert(
                            //         `ARK搵課提示`,
                            //         `現在重啟APP以適配最新課表數據嗎？`,
                            //         [
                            //             {
                            //                 text: 'Yes',
                            //                 onPress: () => {
                            //                     RNRestart.Restart();
                            //                 },
                            //             },
                            //             { text: 'No' },
                            //         ]
                            //     );
                            // });
                        }
                    } else {
                        toastMes = '已是最新課表數據！';
                    }
                }

                // 存入緩存
                await coverStorage(type, data);

                // 最後一個拉取的數據完成，觸發提示
                Toast.show(toastMes);

                if (callback && typeof callback === 'function') {
                    callback();
                }
            }
        } catch (error) {
            Alert.alert(
                '',
                '自動連線至Github更新課程數據失敗，\n請檢查網絡再試！\n如果你正連接中國內地網絡，\n你可能需要一個梯子，\n請等待軟件更新數據或與作者反饋\nQAQ...',
                null,
                { cancelable: true }
            );
        } finally {
            // TODO: 每日更新任務的最後寫入更新日期到緩存
            // const strToday = moment().format("YYYY-MM-DD");
            // const saveResult = await setLocalStorage('course_file_check_date', strToday);
            // if (saveResult != 'ok') { Alert.alert('Error', JSON.stringify(saveResult)); }
            updateFilterOptions(defaultFilterOptions);
        }
    };

    const updateFilterOptions = async (nextOptions) => {
        try {
            if (lodash.isEqual(nextOptions, filterOptions)) { return }
            setFilterOptions(nextOptions);
            setLocalOptions(nextOptions);
        } catch (error) {
            Alert.alert('Error', JSON.stringify(error));
        }
    }

    /**
     * 開設課程列表，根據當前課程模式（Add Drop 或 Pre Enroll）選擇對應的課程數據
     * 
     * s_course_mode: 'ad' | 'preEnroll'
     * 
     * s_coursePlan: coursePlan, // Add Drop課程計劃
     * 
     * s_offerCourses: offerCourses, // Pre Enroll課程計劃
     */
    const offerCourseList = useMemo(() => {
        return s_course_mode === 'ad' ? s_coursePlan.Courses : s_offerCourses.Courses;
    }, [s_course_mode, s_coursePlan, s_offerCourses]);

    /**
     * 開設課程的學院名列表, FAH, FBA, FST, FHS, FSS, FLL, IAPME, ICMS, IME, MSC, RC, HC
     */
    const offerFacultyList = useMemo(() => {
        return lodash.uniq(offerCourseList.map(itm => itm['Offering Unit'])).sort();
    }, [offerCourseList]);

    /**
    * 開設課程的GE課程代號列表, GEGA, GELH, GESB, GEST
    */
    const offerGEList = useMemo(() => {
        return lodash.uniq(
            offerCourseList.filter(itm => itm['Course Code']?.startsWith('GE'))
                .map(itm => itm['Course Code'].substring(0, 4))
        ).sort();
    }, [offerCourseList]);

    /**
     * 對開課數據進行分類，根據學院名分組
     * 
     * {FAH: [...], FBA: [...], FST: [...], FHS: [...], FSS: [...], FLL: [...], IAPME: [...], ICMS: [...], IME: [...], MSC: [...], RC: [...], HC: [...]}
     */
    const offerCourseByFaculty = useMemo(() => {
        return lodash.groupBy(offerCourseList, 'Offering Unit');
    }, [offerCourseList]);

    /**
     * 對開課數據進行分類，根據部門/學系名分組
     * 
     * {AIM: [...], ECE: [...], CIS: [...], CEE: [...], ...}
     */
    const offerCourseByDepa = useMemo(() => {
        return lodash.groupBy(offerCourseList, 'Offering Department');
    }, [offerCourseList]);

    // 根據GE門類篩選各自開課
    const offerCourseByGE = useMemo(() => {
        return offerGEList.reduce((acc, GEName) => {
            acc[GEName] = offerCourseList.filter(itm => itm['Course Code'].substring(0, 4) === GEName);
            return acc;
        }, {});
    }, [offerGEList, offerCourseList]);

    const offerFacultyDepaListObj = useMemo(() => {
        return lodash.mapValues(offerCourseByFaculty, courses =>
            lodash.chain(courses)
                .uniqBy('Offering Department')
                .map('Offering Department')
                .compact()
                .sort()
                .value()
        );
    }, [offerCourseByFaculty]);

    const filterCourseList = useMemo(() => {
        // 還原/初始化需要渲染的課程列表
        let nextFilterCourseList = [];
        let nextFilterOptions = lodash.cloneDeep(filterOptions);
        if (nextFilterOptions.option === 'CMRE') {
            const facultyName = nextFilterOptions.facultyName;
            if (facultyName in offerFacultyDepaListObj && offerFacultyDepaListObj[facultyName].length > 0) {
                nextFilterCourseList = offerCourseByDepa[nextFilterOptions.depaName];
            } else {
                if (facultyName in offerCourseByFaculty) {
                    // 學院下無具體學係分類的情況
                    nextFilterCourseList = offerCourseByFaculty[facultyName];
                } else {
                    nextFilterCourseList = offerCourseByFaculty[offerFacultyList[0]];
                    nextFilterOptions.facultyName = offerFacultyList[0];
                    nextFilterOptions.depaName = offerFacultyDepaListObj[offerFacultyList[0]][0];
                }
            }
        } else if (nextFilterOptions.option === 'GE') {
            nextFilterCourseList = offerCourseByGE[nextFilterOptions.GE];
        }
        // 檢查nextFilterOptions的facultyName和depaName是否在offerCourseByFaculty和offerCourseByDepa中存在
        if (!offerCourseByFaculty[nextFilterOptions.facultyName]) {
            nextFilterOptions.facultyName = offerFacultyList[0];
        }
        if (!offerCourseByDepa[nextFilterOptions.depaName]) {
            nextFilterOptions.depaName = offerFacultyDepaListObj[nextFilterOptions.facultyName][0];
        }
        if (!lodash.isEqual(filterOptions, nextFilterOptions)) {
            setFilterOptions(nextFilterOptions);
        }
        return nextFilterCourseList;
    }, [offerCourseList, filterOptions]);

    // Add Drop / Pre Enroll 模式選擇
    const renderADPESwitch = () => {
        const modeList = Object.keys(adpeMap);

        return (
            <FlatList
                data={modeList}
                keyExtractor={(item, index) => index}
                numColumns={modeList.length}
                contentContainerStyle={{ alignItems: 'center' }}
                scrollEnabled={false}
                renderItem={({ item: itm }) => {
                    return (
                        <TouchableScale
                            style={{
                                ...s.classItm,
                                paddingHorizontal: scale(5), paddingVertical: verticalScale(2),
                                backgroundColor: s_course_mode === itm ? (s_course_mode === 'ad' ? themeColor : secondThemeColor) : null,
                            }}
                            onPress={async () => {
                                trigger();
                                try {
                                    setCourse_mode(itm);
                                    await updateFilterOptions({ ...filterOptions, mode: itm });
                                } catch (error) {
                                    Alert.alert(JSON.stringify(error));
                                }
                            }}
                        >
                            <Text style={{
                                ...uiStyle.defaultText,
                                color: s_course_mode === itm ? white : black.third,
                                fontWeight: s_course_mode === itm ? '900' : 'normal',
                                fontSize: scale(12),
                            }}>{modeENStr[itm]}</Text>
                        </TouchableScale>
                    )
                }}
                ListHeaderComponent={() =>
                    <Text style={{ ...s.classItmTitleText }}>
                        {adpeMap[s_course_mode]}
                    </Text>
                }
            />
        );
    };

    // CERE / GE 模式選擇
    const renderCMGESwitch = () => {
        return (
            <FlatList
                data={CMGEList}
                key={CMGEList.length}
                keyExtractor={(item, index) => index}
                numColumns={CMGEList.length}
                contentContainerStyle={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => (
                    <TouchableScale
                        style={{
                            ...s.classItm,
                            paddingHorizontal: scale(5), paddingVertical: scale(2),
                            backgroundColor: filterOptions.option === itm ? themeColor : null,
                        }}
                        onPress={() => {
                            trigger();
                            try {
                                updateFilterOptions({ ...filterOptions, option: itm });
                            } catch (error) {
                                Alert.alert(JSON.stringify(error));
                            }
                        }}
                        key={itm}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: filterOptions.option === itm ? white : black.third,
                            fontWeight: filterOptions.option === itm ? '900' : 'normal',
                            fontSize: scale(12),
                        }}>{itm}</Text>
                    </TouchableScale>
                )}
                ListHeaderComponent={() =>
                    <Text style={{ ...s.classItmTitleText }}>
                        {filterOptions.option === 'GE' ? t('通識課', { ns: 'catalog' }) : t('必修課 與 選修課', { ns: 'catalog' })}
                    </Text>
                }
                scrollEnabled={false}
            />
        );
    };

    // 學院分類選擇，例FST、FSS
    const renderFacultySwitch = () => {
        return (
            <FlatList
                data={offerFacultyList}
                key={offerFacultyList.length}
                keyExtractor={(item, index) => index}
                numColumns={offerFacultyList.length}
                columnWrapperStyle={
                    offerFacultyList.length > 1 ? {
                        flexWrap: 'wrap', justifyContent: 'center'
                    } : null
                }
                contentContainerStyle={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => (
                    <TouchableScale
                        style={{
                            ...s.classItm,
                            backgroundColor: itm === filterOptions.facultyName ? themeColor : null,
                            paddingHorizontal: scale(5), paddingVertical: scale(2),
                        }}
                        onPress={() => {
                            trigger();
                            const facultyName = itm;
                            let nextFilterOptions = { ...filterOptions, facultyName };
                            // 如果選擇的學院下有學系，則自動選擇第一個學系
                            if (offerFacultyDepaListObj[facultyName].length > 0) {
                                const depaName = offerFacultyDepaListObj[facultyName][0];
                                nextFilterOptions.depaName = depaName;
                            }
                            updateFilterOptions(nextFilterOptions);
                        }}
                        key={itm.toString()}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: itm === filterOptions.facultyName ? white : black.third,
                            fontWeight: itm === filterOptions.facultyName ? '900' : 'normal',
                            fontSize: scale(12)
                        }}>{itm}</Text>
                    </TouchableScale>
                )}
                ListHeaderComponent={() =>
                    <Text style={{ ...s.classItmTitleText }}>
                        {unitMap[filterOptions.facultyName]}
                    </Text>
                }
                scrollEnabled={false}
            />
        );
    };

    // 學系分類選擇，例ECE、CIS
    const renderDepaSwitch = (offerDepaList) => (
        <FlatList
            data={offerDepaList}
            key={offerDepaList.length}
            keyExtractor={(item, index) => index}
            horizontal
            scrollEnabled
            style={{ marginTop: scale(5) }}
            contentContainerStyle={{ alignItems: 'center' }}
            renderItem={({ item: itm }) => (
                <TouchableScale style={{
                    ...s.classItm,
                    paddingHorizontal: scale(5), paddingVertical: scale(2),
                    backgroundColor: filterOptions.depaName === itm ? themeColor : null,
                }}
                    onPress={() => {
                        trigger();
                        updateFilterOptions({ ...filterOptions, depaName: itm });
                    }}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        alignSelf: 'center',
                        color: filterOptions.depaName === itm ? white : black.third,
                        fontWeight: filterOptions.depaName === itm ? '900' : 'normal',
                        fontSize: scale(12)
                    }}>{itm}</Text>
                </TouchableScale>
            )}
        />
    );

    // 渲染篩選總列表
    const renderFilterView = () => {
        let offerDepaList = [];
        if (
            filterOptions.option !== 'GE' &&
            offerFacultyDepaListObj &&
            filterOptions.facultyName in offerFacultyDepaListObj
        ) {
            offerDepaList = offerFacultyDepaListObj[filterOptions.facultyName];
        }

        return (
            <View style={{
                backgroundColor: white, borderRadius: scale(10),
                margin: scale(5), marginHorizontal: scale(10),
                padding: scale(5),
            }}>
                {/* 渲染Add Drop，Pre Enroll選擇 */}
                {renderADPESwitch()}

                {/* 渲染CMRE GE選擇 */}
                <View style={{ width: '100%', marginTop: scale(10), }}>
                    {renderCMGESwitch()}
                </View>

                {/* 渲染分類課程選擇按鈕 */}
                {filterOptions.option === 'GE' ? (
                    <View style={{ marginTop: scale(5), alignItems: 'center', width: '100%' }}>
                        {/* GE課描述 */}
                        <Text style={{ ...s.classItmTitleText }}>
                            {geClassMap[filterOptions.GE]}
                        </Text>
                        {/* 具體GE課程分類按鈕 */}
                        <View style={{ flexDirection: 'row', marginVertical: scale(5), }}>
                            {offerGEList.length > 0 && offerGEList.map(itm =>
                                <TouchableScale
                                    key={itm}
                                    style={{
                                        ...s.classItm,
                                        paddingHorizontal: scale(5), paddingVertical: scale(3),
                                        borderColor: filterOptions.GE === itm ? themeColor : black.third,
                                        backgroundColor: filterOptions.GE === itm ? themeColor : null,
                                    }}
                                    onPress={() => {
                                        trigger();
                                        updateFilterOptions({ ...filterOptions, GE: itm });
                                    }}
                                >
                                    <Text style={{
                                        ...uiStyle.defaultText,
                                        color: filterOptions.GE === itm ? white : black.third,
                                        fontWeight: filterOptions.GE === itm ? '900' : 'normal',
                                        fontSize: scale(12)
                                    }}>{itm}</Text>
                                </TouchableScale>
                            )}
                        </View>
                    </View>
                ) : (
                    <View style={{ marginTop: scale(10), width: '100%' }}>
                        {offerFacultyDepaListObj ? renderFacultySwitch() : null}
                        {offerDepaList.length > 0 ? (
                            <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: scale(10), }}>
                                {/* 展示學系中文名稱 */}
                                {filterOptions.depaName in depaMap ?
                                    <Text style={{ ...s.classItmTitleText, marginBottom: scale(-5) }}>
                                        {depaMap[filterOptions.depaName]}
                                    </Text> : null}
                                {/* 渲染學系選項 */}
                                {renderDepaSwitch(offerFacultyDepaListObj[filterOptions.facultyName])}
                            </View>
                        ) : null}
                    </View>
                )}
            </View>
        );
    };

    // 搜索框
    const renderSearch = () => (
        <KeyboardAvoidingView
            style={{
                alignItems: 'center', flexDirection: 'row',
                width: '100%',
                marginTop: scale(5), paddingHorizontal: scale(10),
                backgroundColor: 'transparent',
            }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* 搜索框 */}
            <View style={{
                backgroundColor: white,
                borderWidth: scale(2), borderColor: themeColor, borderRadius: scale(10),
                flexDirection: 'row', alignItems: 'center',
                marginRight: scale(5),
                paddingHorizontal: scale(5), paddingVertical: scale(3),
                flex: 1,
            }}>
                {/* 搜索圖標，引導用戶 */}
                <Ionicons name={'search'} size={scale(15)} color={black.third} />
                <TextInput
                    style={{
                        ...uiStyle.defaultText,
                        paddingVertical: verticalScale(3),
                        paddingHorizontal: scale(5),
                        color: black.main,
                        fontSize: scale(12),
                        flex: 1,
                    }}
                    onChangeText={(text) => {
                        setInputText(text);
                        setInputOK(text.length > 0);
                    }}
                    value={inputText}
                    selectTextOnFocus
                    placeholder={t("試試ECE or Electrical or 電氣", { ns: 'catalog' })}
                    placeholderTextColor={black.third}
                    ref={textInputRef}
                    onFocus={() => trigger()}
                    returnKeyType={'search'}
                    selectionColor={themeColor}
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                />
                {/* 清空搜索框按鈕 */}
                {inputText.length > 0 ? (
                    <TouchableOpacity
                        onPress={() => {
                            trigger();
                            setInputText('');
                            setInputOK(false);
                            setScrollData({});
                            setTimeout(() => {
                                textInputRef.current && textInputRef.current.focus();
                            }, 0);
                        }}
                        style={{ padding: scale(3), marginLeft: 'auto' }}
                    >
                        <Ionicons
                            name={'close-circle'}
                            size={scale(15)}
                            color={inputText.length > 0 ? themeColor : black.third}
                        />
                    </TouchableOpacity>
                ) : null}
            </View>
            {/* 搜索 */}
            <MenuView
                onPressAction={({ nativeEvent }) => {
                    if (inputOK) {
                        switch (nativeEvent.event) {
                            case 'wiki':
                                trigger();
                                let URL = ARK_WIKI_SEARCH + encodeURIComponent(inputText);
                                props.navigation.navigate('Wiki', { url: URL });
                                break;
                            case 'what2reg':
                                trigger();
                                openLink(`${WHAT_2_REG_SEARCH}${encodeURIComponent(inputText)}`);
                                break;
                            case 'official':
                                trigger();
                                let courseCode = encodeURIComponent(inputText);
                                const URI = OFFICIAL_COURSE_SEARCH + courseCode;
                                logToFirebase('checkCourse', {
                                    courseCode: 'Official ' + courseCode,
                                });
                                openLink(URI);
                                break;
                            default:
                                break;
                        }
                    }
                }}
                actions={[
                    {
                        id: 'wiki',
                        title: '查 ARK Wiki !!!  ε٩(๑> ₃ <)۶з',
                        titleColor: themeColor,
                    },
                    {
                        id: 'what2reg',
                        title: '查 選咩課',
                        titleColor: black.third,
                    },
                    {
                        id: 'official',
                        title: '查 官方',
                        titleColor: black.third,
                    },
                ]}
                shouldOpenOnLongPress={false}
            >
                <TouchableOpacity
                    style={{
                        backgroundColor: inputOK ? themeColor : disabled,
                        borderRadius: scale(6),
                        padding: scale(7), paddingHorizontal: scale(8),
                        alignItems: 'center'
                    }}
                    disabled={!inputOK}
                    onPress={() => trigger()}
                >
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: white, fontWeight: 'bold' }}>{t('搜索')}</Text>
                </TouchableOpacity>
            </MenuView>
        </KeyboardAvoidingView>
    );

    // 渲染首字母側邊導航
    const renderFirstLetterNav = useCallback((filterCourseList) => {
        const firstLetterList = lodash.uniq(lodash.map(filterCourseList, itm => itm['Course Code']?.[0]).filter(Boolean));
        return firstLetterList.length > 1 ? (
            <View style={{
                position: 'absolute', right: scale(8),
                justifyContent: 'center', alignItems: 'center',
                backgroundColor: white,
                borderRadius: scale(8),
                padding: scale(3),
                ...viewShadow,
            }}>
                {firstLetterList.map(itm =>
                    <TouchableScale key={itm} style={{ padding: scale(3), }}
                        onPress={() => {
                            trigger();
                            scrollViewRef.current && scrollViewRef.current.scrollTo({
                                y: scrollData[itm],
                            });
                        }}
                    >
                        <Text style={{ ...uiStyle.defaultText, fontSize: scale(15), color: themeColor }}>{itm}</Text>
                    </TouchableScale>
                )}
            </View>
        ) : null;
    }, [scrollData, themeColor]);

    const scrollDataRef = useRef({}); // 用于存储中间状态
    const pendingUpdatesRef = useRef(0); // 用于跟踪未完成的子组件更新
    // 记录首字母对应的 scrollData
    const handleSetLetterData = (letterData, totalComponents) => {
        const letter = Object.keys(letterData)[0];
        let newScrollData = {};
        if (pendingUpdatesRef.current > 0) {
            newScrollData = lodash.cloneDeep(scrollDataRef.current);
        } else {
            newScrollData = {};
        }

        if (!(letter in newScrollData) || letterData[letter] < newScrollData[letter]) {
            newScrollData[letter] = letterData[letter];
            scrollDataRef.current = newScrollData; // 更新引用
        }
        // 更新 pendingUpdatesRef
        pendingUpdatesRef.current += 1;
        // 如果所有子组件都已更新，设置最终的 scrollData
        if (pendingUpdatesRef.current === totalComponents) {
            setScrollData(scrollDataRef.current);
            pendingUpdatesRef.current = 0; // 重置计数器
            scrollDataRef.current = {}; // 清空引用
        }
    };

    // 返回搜索候選所需的課程列表
    const handleSearchFilterCourse = (text) => {
        let inputText = text.toUpperCase();

        // 篩選所需課程
        let filterCourseList = offerCourseList.filter(itm => {
            return itm['Course Code'].toUpperCase().indexOf(inputText) !== -1
                || itm['Course Title'].toUpperCase().indexOf(inputText) !== -1
                || itm['Course Title Chi'].indexOf(inputText) !== -1
                || itm['Course Title Chi'].indexOf(converter(inputText)) !== -1;
        });

        // 篩選課表時間Excel的數據
        const coursePlanList = s_coursePlanTime.Courses;
        if (coursePlanList.length > 0) {
            let coursePlanSearchList = coursePlanList.filter(itm => {
                return itm['Course Code'].toUpperCase().indexOf(inputText) !== -1
                    || itm['Course Title'].toUpperCase().indexOf(inputText) !== -1
                    || itm['Teacher Information'].toUpperCase().indexOf(inputText) !== -1
                    || (itm['Day'] && itm['Day'].toUpperCase().indexOf(inputText) !== -1)
                    || (itm['Offering Department'] && itm['Offering Department'].toUpperCase().indexOf(inputText) !== -1)
                    || itm['Offering Unit'].toUpperCase().indexOf(inputText) !== -1
                    || itm['Course Title Chi'].indexOf(inputText) !== -1;
            });

            // 找出coursePlanSearchList有的課程，但filterCourseList沒有的課程，基於Course Code
            // const filterCoursePlanSearchList = coursePlanSearchList.filter(itm => {
            //     return !filterCourseList.some(offerItem => offerItem['Course Code'] === itm['Course Code']);
            // });
            // console.log('filterCoursePlanSearchList', filterCoursePlanSearchList);
            // 搜索合併
            filterCourseList = filterCourseList.concat(coursePlanSearchList);
            // 搜索去重
            filterCourseList = lodash.uniqBy(filterCourseList, 'Course Code');
        }

        // 搜索結果排序
        filterCourseList = lodash.sortBy(filterCourseList, ['Course Code']);

        return filterCourseList;
    };

    // ActionSheet options
    const actionSheetOptions = [
        t("更新Pre Enroll數據", { ns: 'catalog' }),
        t("更新Add Drop/Timetable數據", { ns: 'catalog' }),
        'Cancel'
    ];

    // ActionSheet onPress
    const handleActionSheet = async (index) => {
        switch (index) {
            case 0:
                setDialogVisible(true);
                await updateLocalCourseData('offerCourses');
                setDialogVisible(false);
                break;
            case 1:
                try {
                    setDialogVisible(true);
                    await updateLocalCourseData('coursePlan');
                } catch (error) {
                    alert(JSON.stringify(error));
                } finally {
                    setDialogVisible(false);
                }
                break;
            default:
                break;
        }
    };

    // Dialog 關閉
    const handleDialogClose = () => setDialogVisible(false);

    // 更新按鈕
    const handleUpdatePress = () => {
        trigger();
        actionSheetRef.current && actionSheetRef.current.show();
    };

    // 隱私政策
    const handleUserAgreePress = () => {
        openLink(USER_AGREE);
    };

    // 搜索候選課程
    const searchFilterCourse = useMemo(() => {
        return hasChinese(inputText)
            ? (inputText.length > 0 ? handleSearchFilterCourse(inputText) : null)
            : inputText.length > 2 ? handleSearchFilterCourse(inputText) : null;
    }, [inputText]);

    return (
        <View style={{
            flex: 1, backgroundColor: bg_color,
            alignItems: 'center', justifyContent: 'center'
        }}>
            <Header
                backgroundColor={bg_color}
                statusBarProps={{
                    backgroundColor: 'transparent',
                    barStyle: barStyle,
                }}
                containerStyle={{
                    height: Platform.select({
                        android: scale(38),
                        default: insets.top,
                    }),
                    paddingTop: 0,
                    borderBottomWidth: 0,
                }}
            />

            <ActionSheet
                ref={actionSheetRef}
                title={`${t('Add Drop Data Version', { ns: 'about' }) + s_coursePlan.updateTime}\n\n${t('PreEnroll Data Version', { ns: 'about' }) + s_offerCourses.updateTime}\n\n如作者已上傳最新課表數據，可直接點擊下方按鈕更新！\n或可附件最新的課表Excel，Email提醒作者更新！\n\n如日期已更新，課表數據未更新，可重啟APP再試~`}
                options={actionSheetOptions}
                cancelButtonIndex={2}
                statusBarTranslucent={true}
                theme='ios'
                onPress={handleActionSheet}
            />

            <Dialog isVisible={dialogVisible}
                onBackdropPress={handleDialogClose}
                statusBarTranslucent={true}
                overlayStyle={{
                    backgroundColor: bg_color
                }}
            >
                <Dialog.Loading />
            </Dialog>

            <ScrollView
                ref={scrollViewRef}
                style={{ width: '100%' }}
                stickyHeaderIndices={[1]}
                keyboardDismissMode='on-drag'
            >
                {/* 頁面標題欄 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: verticalScale(3), }}>
                    {/* 更新數據按鈕 */}
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            right: scale(10),
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: themeColor,
                            borderRadius: scale(5),
                            padding: scale(5),
                        }}
                        onPress={handleUpdatePress}
                    >
                        <Ionicons name={'build'} size={verticalScale(15)} color={white} />
                        <Text style={{ ...uiStyle.defaultText, color: white, fontWeight: 'bold' }}>{t('更新')}</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {/* ARK Logo */}
                        <FastImage
                            source={require('../../../static/img/logo.png')}
                            style={{
                                height: iconSize, width: iconSize,
                                borderRadius: scale(5),
                            }}
                        />
                        <View style={{ marginLeft: scale(5) }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(18), color: themeColor, fontWeight: '600' }}>{t('ARK搵課', { ns: 'catalog' })}</Text>
                        </View>
                    </View>
                </View>

                {/* 搜索框 */}
                <>
                    {renderSearch()}
                </>

                {/* 搜索候選課程 */}
                {searchFilterCourse && searchFilterCourse.length > 0 ? (<>
                    <View style={{ alignSelf: 'center' }}>
                        <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: black.third }}>ヾ(ｏ･ω･)ﾉ 拿走不謝~</Text>
                    </View>
                    <CourseCard data={searchFilterCourse} mode={'json'}
                        courseMode={s_course_mode} handleSetLetterData={handleSetLetterData} />
                </>) : (<>
                    {/* 篩選列表 */}
                    {renderFilterView()}

                    {/* 渲染篩選出的課程 */}
                    {filterCourseList && filterCourseList.length > 0 ? (
                        <View style={{ alignItems: 'center' }}>
                            <CourseCard data={filterCourseList} mode={'json'} handleSetLetterData={handleSetLetterData} />
                        </View>
                    ) : null}
                </>)}

                {/* 篩選課程功能 更新時間 */}
                <View style={{ marginTop: scale(10), alignItems: 'center' }}>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>
                        {`${s_course_mode == 'ad' ? '開設' : '預選'}課程:`}
                    </Text>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: black.third }}>
                        數據日期版本: {s_course_mode == 'ad' ? s_coursePlan.updateTime : s_offerCourses.updateTime}
                    </Text>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: themeColor }}>
                        記得更新APP或右上角手動更新以獲得最新數據~
                    </Text>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: themeColor }} selectable>
                        遇到BUG可聯繫umacark@gmail.com
                    </Text>
                </View>

                <View style={{
                    margin: scale(10),
                    padding: scale(10),
                    alignItems: 'center'
                }}>
                    <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(12) }}>知識無價，評論只供參考~</Text>
                </View>

                <TouchableOpacity style={{
                    marginTop: scale(10),
                    alignItems: 'center'
                }}
                    onPress={handleUserAgreePress}
                >
                    <Text style={{ ...uiStyle.defaultText, color: themeColor, fontSize: scale(10) }}>ARK ALL 隱私政策 & 用戶協議</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* 渲染側邊首字母導航 */}
            {searchFilterCourse && searchFilterCourse.length > 0 ? (
                renderFirstLetterNav(searchFilterCourse)
            ) : (
                filterCourseList && filterCourseList.length > 0 ?
                    renderFirstLetterNav(filterCourseList) : null
            )}

        </View>
    )
}

export default What2Reg;