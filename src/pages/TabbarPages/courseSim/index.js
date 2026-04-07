import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Alert,
    StyleSheet,
    TextInput,
    Keyboard,
} from 'react-native';

import { scale, verticalScale } from 'react-native-size-matters';
import { Image } from 'expo-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import TouchableScale from '../../../components/TouchableScale';
import * as DropdownMenu from 'zeego/dropdown-menu';
import Toast from 'react-native-simple-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from 'i18next';
import { BottomSheetTextInput, BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { ScrollView } from 'react-native-gesture-handler';
import uniq from 'lodash/uniq';
import lodash from 'lodash';
import * as OpenCC from 'opencc-js';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';

import { setLocalStorage } from '../../../utils/storageKits';
import { useTheme, themes, uiStyle } from '../../../components/ThemeContext';
import coursePlanTimeFile from '../../../static/UMCourses/coursePlanTime';
import coursePlanFile from '../../../static/UMCourses/coursePlan';
import sourceCourseVersion from '../../../static/UMCourses/courseVersion';
import { openLink } from '../../../utils/browser';
import { UM_ISW, ARK_WIKI_SEARCH, WHAT_2_REG, OFFICIAL_COURSE_SEARCH } from '../../../utils/pathMap';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { trigger } from '../../../utils/trigger';
import CustomBottomSheet from './BottomSheet';
import { getCourseData } from '../../../utils/checkCoursesKits';


const converter = OpenCC.Converter({ from: 'cn', to: 'tw' }); // 簡體轉繁體
// TODO: 點擊加課會觸發屏幕上移，導致iOS26需要再往下才能點關閉

const iconSize = scale(25);
const dayList = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const timeFrom = '00:00';
const timeTo = '23:59';

function parseImportData(inputText) {
    let matchRes = inputText.match(/[A-Z]{4}[0-9]{4}((\/[0-9]{4})+)?(\s)?(\([0-9]{3}\))/g);

    if (matchRes && matchRes.length > 0) {
        // 去重
        matchRes = uniq(matchRes);

        return matchRes.map(text => {
            // Section部份左右括號的index
            const lbIdx = text.indexOf('(');
            const rbIdx = text.indexOf(')');
            // 對於特殊的 GESB1001/1002/1003，記錄 / 從左到右第一次出現的index，不存在 / 時返回 -1
            const slashIdx = text.indexOf('/');

            // 定位至CourseCode後一位的index
            // 例：GESB1001/1002，courseCodeBound = 8
            // 例：GEGA1000(001)，courseCodeBound = 8
            const courseCodeBound = slashIdx === -1 ? lbIdx : slashIdx;

            // 截取CourseCode的字符
            const courseCode = text.substring(0, courseCodeBound);
            const section = text.substring(lbIdx + 1, rbIdx);

            return {
                'Course Code': courseCode,
                'Section': section,
            };
        });
    }
    else {
        return null;
    }
}

// 將 HH:mm 時間轉為Date對象，用於排序
function toDateTime(time) {
    var [hours, minutes] = time.split(':');
    return new Date(0, 0, 0, hours, minutes); // 使用一个固定的日期
}

const daySorter = {
    'MON': 1,
    'TUE': 2,
    'WED': 3,
    'THU': 4,
    'FRI': 5,
    'SAT': 6,
    'SUN': 7,
};
// 按星期一到星期天排序
const daySort = (objArr) => {
    return lodash.sortBy(objArr, item => daySorter[item.Day]);
};

function CourseSim({ route, navigation }) {
    // state
    const [importTimeTableText, setImportTimeTableText] = useState(null); // 導入課表功能
    const [u_codeSectionList, setU_codeSectionList] = useState([]); // 用戶自己選擇的課程，唯一性：Course Code, Section
    const [allCourseAllTime, setAllCourseAllTime] = useState([]); // 用戶一周內所有課程節，唯一性：Course Code, Section, Time
    const [searchText, setSearchText] = useState(null);
    const [perSearchText, setPerSearchText] = useState(null);

    const [dayFilterChoice, setDayFilterChoice] = useState(null);
    const [timeFilterFrom, setTimeFilterFrom] = useState(timeFrom);
    const [timeFilterTo, setTimeFilterTo] = useState(timeTo);
    const [timePickerMode, setTimePickerMode] = useState('from');
    const [showTimePicker, setShowTimePicker] = useState(false);

    // 這兩個是緩存的該學期所有課程
    const [s_coursePlanFile, setSCoursePlanFile] = useState(coursePlanFile);
    const [s_coursePlanTimeFile, setSCoursePlanTimeFile] = useState(coursePlanTimeFile);
    const [s_courseVersion, setS_courseVersion] = useState(sourceCourseVersion);

    const [hasOpenCourseSearch, setHasOpenCourseSearch] = useState(false);
    const isFocused = useIsFocused();

    // ref
    const verScroll = useRef();
    const textSearchRef = useRef();
    const bottomSheetRef = useRef();

    const { theme } = useTheme();
    const { themeColor, themeColorUltraLight, secondThemeColor, tonal,
        black, white, bg_color, unread, success, trueWhite, barStyle, TIME_TABLE_COLOR, disabled } = theme;

    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    // Sticky Header 需要的吸頂偏移量，優先使用導航欄實際高度，否則根據安全區估算
    const stickyTopOffset = headerHeight || insets.top;

    const s = StyleSheet.create({
        firstUseText: {
            ...uiStyle.defaultText,
            color: black.third,
            fontWeight: 'bold',
            fontSize: scale(20),
            textAlign: 'center',
        },
        buttonContainer: {
            backgroundColor: themeColor,
            borderRadius: scale(10),
            padding: scale(10),
            margin: scale(10),
        },
        // 引導頁面樣式
        guideTitle: {
            ...uiStyle.defaultText,
            color: black.main,
            fontWeight: 'bold',
            fontSize: scale(22),
            textAlign: 'center',
            marginBottom: scale(16),
        },
        methodCard: {
            backgroundColor: white,
            borderRadius: scale(12),
            padding: scale(16),
            marginBottom: scale(12),
            borderWidth: 1,
            borderColor: themeColorUltraLight,
        },
        stepBadge: {
            backgroundColor: tonal.primary15,
            borderRadius: scale(8),
            paddingHorizontal: scale(10),
            paddingVertical: scale(4),
        },
        stepBadgeText: {
            ...uiStyle.defaultText,
            color: themeColor,
            fontWeight: 'bold',
            fontSize: scale(14),
        },
        cardDescription: {
            ...uiStyle.defaultText,
            color: black.second,
            fontSize: scale(15),
            marginLeft: scale(10),
            flex: 1,
        },
        stepButton: {
            backgroundColor: tonal.primary30,
            borderRadius: scale(10),
            paddingVertical: scale(10),
            paddingHorizontal: scale(16),
            marginBottom: scale(4),
        },
        stepButtonText: {
            ...uiStyle.defaultText,
            color: themeColor,
            fontWeight: 'bold',
            fontSize: scale(15),
        },
        guideDivider: {
            height: 1,
            backgroundColor: themeColorUltraLight,
            marginVertical: scale(12),
        },
        inputLabel: {
            ...uiStyle.defaultText,
            color: black.second,
            fontWeight: '600',
            fontSize: scale(14),
            marginBottom: scale(8),
        },
        guideTextInput: {
            ...uiStyle.defaultText,
            backgroundColor: tonal.primary08,
            borderWidth: 1,
            borderColor: themeColorUltraLight,
            padding: scale(12),
            borderRadius: scale(10),
            width: '100%',
            height: verticalScale(150),
            color: themeColor,
            fontSize: scale(12),
        },
        inputHint: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: scale(11),
            textAlign: 'center',
            marginTop: scale(6),
            marginBottom: scale(10),
        },
        importButton: {
            borderRadius: scale(10),
            paddingVertical: scale(12),
            paddingHorizontal: scale(20),
            alignItems: 'center',
        },
        importButtonText: {
            ...uiStyle.defaultText,
            fontWeight: 'bold',
            fontSize: scale(16),
        },
        footerText: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: scale(11),
            textAlign: 'center',
        },
        filterButtonContainer: {
            paddingHorizontal: scale(5), paddingVertical: verticalScale(2),
            borderRadius: verticalScale(5),
            marginHorizontal: scale(2.5),
        },
        searchResultText: {
            ...uiStyle.defaultText,
            color: black.third,
            textAlign: 'center',
        },
        courseCard: {
            margin: scale(3),
            padding: scale(5),
            borderRadius: scale(6),
            backgroundColor: tonal.primary15,
            borderWidth: 1, borderColor: themeColorUltraLight,
        },
    });

    const { i18n } = useTranslation();

    useEffect(() => {
        logToFirebase('openPage', { page: 'courseSim' });
        refresh();

        // 自己選的課
        AsyncStorage.getItem('ARK_Timetable_Storage').then(strCourseCodeList => {
            const list = strCourseCodeList ? JSON.parse(strCourseCodeList) : null;
            if (list && list.length > 0) {
                setU_codeSectionList(list);
            }
        });
    }, []);

    useEffect(() => {
        if (u_codeSectionList && u_codeSectionList.length > 0) {
            handleCourseList(u_codeSectionList);
        }
    }, [u_codeSectionList, s_coursePlanTimeFile]);

    // 頁面是否聚焦監聽
    useFocusEffect(
        useCallback(() => {
            // 當頁面聚焦時執行，如存在add課傳參
            if (route.params?.add) {
                const { add } = route.params;
                addCourse(add);
                // 執行任務後，重置參數
                navigation.setParams({ add: undefined });
            }

            // 如果有check傳參
            if (route.params?.check) {
                const { check } = route.params;
                if (check.length > 0) {
                    setSearchText(check);
                }
                setHasOpenCourseSearch(true);
                // 執行任務後，重置參數
                navigation.setParams({ check: undefined });
                bottomSheetRef?.current?.snapToIndex(1);
            }

            // 失焦時自動清理
            return () => {
            };
        }, [route, navigation])
    );

    // 在頁面聚焦時讀取緩存數據，用於同步課程數據
    useEffect(() => {
        if (isFocused) { refresh(); }
    }, [isFocused]);

    async function refresh() {
        // 課程版本
        getCourseData('version').then(localCourseVersion => {
            if (!lodash.isEqual(localCourseVersion, s_courseVersion)) {
                setS_courseVersion(localCourseVersion);
                getCourseData('adddrop').then(addDropStorageData => {
                    setSCoursePlanFile(addDropStorageData.adddrop);
                    setSCoursePlanTimeFile(addDropStorageData.timetable);
                });
            }
        });
    }

    /**
     * 輸入用戶選擇課程的列表，輸出用戶所有的課程課表。
     *
     * 輸入：課程列表，唯一性定義：Code, section. 不包含時間。
     *
     * 輸出：課程列表，唯一性定義：Code, section, time。
     *
     * @param {*} u_codeSectionList 用戶選擇課程。單個課程{"Course Code": string, "Section": string}
     */
    function handleCourseList(tempCourseSecList) {
        // Key: course code; value: List, 這周內不同時間所有的該Course Code-section的課程。
        const allCourseAllTime = lodash.chain(tempCourseSecList).map((codeSection, i) => {
            const this_courseCode = codeSection['Course Code'];
            const this_section = codeSection.Section;

            return lodash.chain(courseTimeList)
                .filter(courseTime =>
                    courseTime['Course Code'] === this_courseCode &&
                    courseTime.Section === this_section
                )
                .value();
        }).flatten().value();

        // 存儲一周的課節課表，用於在首頁展示下節課程。
        const s_allCourseAllTime = lodash.chain(allCourseAllTime).groupBy('Day')
            .mapValues(courses =>
                lodash.chain(courses)
                    .map(courseTime => ({
                        'Course Code': courseTime['Course Code'],
                        'Section': courseTime.Section,
                        'Time From': courseTime['Time From'],
                        'color': courseTime.color,
                    }))
                    .sortBy(course => moment(course['Time From'], 'HH:mm'))
                    .value()
            ).value();
        setLocalStorage('ARK_WeekTimetable_Storage', s_allCourseAllTime); // key為 Day，value為該天的所有完整課程數組

        setAllCourseAllTime(allCourseAllTime);
        setU_codeSectionList(tempCourseSecList);
        setLocalStorage('ARK_Timetable_Storage', tempCourseSecList); // 數組，僅包含courseCode和Section
    }

    // 渲染一列（一天）的課表
    const renderDay = (day) => {
        // 獲取該天所有的課程數據
        let dayCourseList = allCourseAllTime.filter(course => course.Day === day);

        if (dayCourseList.length > 0) {
            // 按上課時間Time From排序
            dayCourseList = dayCourseList.sort((a, b) => {
                return toDateTime(a['Time From']) - toDateTime(b['Time From']);
            });

            // 例如今天星期五，FRI
            // 用於高亮當天的Day文字
            let todayText = moment().format('dddd').substring(0, 3).toUpperCase();

            return (
                <View style={{ width: scale(135), marginBottom: dayCourseList.length < 4 ? ((4 - dayCourseList.length) * scale(140)) : null }}>
                    {/* 星期幾 */}
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: todayText === day ? themeColor : black.third,
                        fontSize: scale(25), fontWeight: 'bold',
                        alignSelf: 'center',
                    }}>{day}</Text>

                    {/* 渲染單一課程卡片 */}
                    <View style={{ flexDirection: 'column' }}>
                        {dayCourseList.map((course, idx) => renderCourse(course, dayCourseList, idx))}
                    </View>
                </View>
            );
        }

        return null;
    };

    const u_code_list = useMemo(() => {
        return u_codeSectionList.map(item => item['Course Code']);
    }, [u_codeSectionList]);

    /**
     * 渲染單個課表卡片
     *
     * @param {Object} course 單個課程對象，包含Course Code, Section, Time From, Time To等信息
     *
     * @param {Array} dayCourseList 當天的所有課程列表，用於計算時間差和提醒
     *
     * @param {number} idx 當天課程列表中的索引，用於計算時間差
     */
    const renderCourse = (course, dayCourseList, idx,) => {
        let timeDiffReminder = null;
        let afternoonReminder = null;
        let timeWarning = false;

        if (idx > 0) {
            let lastEnd = moment(dayCourseList[idx - 1]['Time To'], 'HH:mm:ss');
            let courseBegin = moment(course['Time From'], 'HH:mm:ss');
            let secDiff = courseBegin.diff(lastEnd, 'seconds');
            let minuteDiff = secDiff / 60;
            let hourDiff = (minuteDiff / 60).toFixed(2);

            if (secDiff < 0) {
                timeWarning = true;
            }

            if (idx < dayCourseList.length) {
                timeDiffReminder = (
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            alignSelf: 'center',
                            color: timeWarning ? unread : black.third,
                            fontWeight: timeWarning ? 'bold' : null,
                            textAlign: 'center',
                        }}
                    >
                        休息
                        <Text style={{ fontWeight: 'bold', color: timeWarning ? unread : themeColor }}>
                            {hourDiff >= 1 ? `${hourDiff}` : `${minuteDiff}`}
                        </Text>
                        {hourDiff >= 1 ? '小時' : '分鐘'}後
                        {timeWarning ? <Text>{'\n🆘課程衝突🆘'}</Text> : null}
                    </Text>
                );
            }
        }

        if (idx === 0 && dayCourseList.length > 1) {
            let firstEnd = moment(course['Time To'], 'HH:mm:ss');
            let secondBegin = moment(dayCourseList[idx + 1]['Time From'], 'HH:mm:ss');
            let secDiff = secondBegin.diff(firstEnd, 'seconds');
            if (secDiff < 0) {
                timeWarning = true;
            }
        }

        // 判斷是否下午
        let timeHH = moment(course['Time From'], 'HH').format('HH');
        let timeReminderText = null;
        timeReminderText = timeHH > 12 ? (timeHH >= 18 ?
            `🌜${t('晚上', { ns: 'timetable' })}🌛`
            : `☕️${t('下午', { ns: 'timetable' })}☕️`) : null;

        if (timeHH > 12 && dayCourseList.length > 1 && idx > 0) {
            let preTimeHH = moment(dayCourseList[idx - 1]['Time From'], 'HH').format('HH');
            if (preTimeHH >= 18 && timeHH >= 18) {
                timeReminderText = null;
            }
            if (preTimeHH > 12 && preTimeHH < 18 && timeHH < 18) {
                timeReminderText = null;
            }
        }

        afternoonReminder = timeReminderText ? (
            <Text style={{
                ...uiStyle.defaultText,
                alignSelf: 'center', textAlign: 'center',
                color: black.third,
                fontWeight: 'bold',
                fontSize: i18n.resolvedLanguage == 'en' ? scale(18) : scale(20),
            }}>
                {timeReminderText}
            </Text>) : null;

        const hasDuplicate = lodash.countBy(u_codeSectionList, 'Course Code')[course['Course Code']] > 1;

        return (<View>
            {afternoonReminder}
            {timeDiffReminder}

            <DropdownMenu.Root
                onOpenChange={(open) => {
                    if (open) {
                        trigger();
                    }
                }}
            >
                <DropdownMenu.Trigger>
                    <TouchableScale
                        style={{
                            margin: scale(5),
                            backgroundColor: timeWarning ? unread :
                                TIME_TABLE_COLOR[lodash.indexOf(u_code_list, course['Course Code']) % TIME_TABLE_COLOR.length],
                            borderRadius: scale(10),
                            padding: scale(5),
                            alignItems: 'center', justifyContent: 'center',
                        }}
                        activeOpacity={0.8}
                        onPress={() => {
                            trigger('rigid');
                            if (hasOpenCourseSearch) {
                                bottomSheetRef?.current?.snapToIndex(0);
                            }
                        }}
                    >
                        {/* 課號 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            opacity: 0.7,
                            fontSize: scale(20),
                            textAlign: 'center',
                            fontWeight: '700',
                        }}>
                            {course['Course Code'].substring(0, 4) + '\n'}
                            <Text style={{ fontSize: scale(20), fontWeight: 'bold' }}>
                                {course['Course Code'].substring(4, 8)}
                            </Text>
                        </Text>

                        {/* Section */}
                        <Text style={{ ...uiStyle.defaultText, color: black.main, opacity: 0.8 }}>
                            {course.Section}
                        </Text>

                        {/* 課程名稱 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            textAlign: 'center',
                            opacity: 0.4,
                        }} numberOfLines={4}>
                            {course['Course Title']}
                        </Text>

                        {/* 教室 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            fontWeight: 'bold',
                            opacity: 0.5,
                        }}>
                            {course.Classroom}
                        </Text>

                        {/* 上課時間 */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' }}>
                            <Text style={{ ...uiStyle.defaultText, color: black.main, fontWeight: '600', opacity: 0.8 }}>
                                {course['Time From']}
                            </Text>
                            <Ionicons name="ellipsis-horizontal" size={scale(20)} color={black.main} style={{ opacity: 0.4 }} />
                            <Text style={{ ...uiStyle.defaultText, color: black.main, fontWeight: '600', opacity: 0.8 }}>
                                {course['Time To']}
                            </Text>
                        </View>
                    </TouchableScale>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Item
                        key="wiki"
                        onSelect={() => {
                            trigger();
                            const courseCode = course['Course Code'];
                            const profName = course['Teacher Information'];
                            let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
                            if (profName) {
                                URL = ARK_WIKI_SEARCH + encodeURIComponent(profName);
                                logToFirebase('checkCourse', {
                                    courseCode,
                                    profName,
                                    action: 'ark-wiki',
                                });
                            }
                            else {
                                logToFirebase('checkCourse', {
                                    courseCode,
                                    action: 'ark-wiki',
                                });
                            }
                            openLink(URL);
                        }}
                    >
                        <DropdownMenu.ItemIcon
                            ios={{
                                name: 'book',
                                pointSize: scale(18),
                                hierarchicalColor: {
                                    dark: themeColor,
                                    light: themeColor,
                                },
                            }}
                            androidIconName="ic_menu_book"
                        />
                        <DropdownMenu.ItemTitle style={{ color: themeColor }}>
                            {`${t('寫', { ns: 'catalog' })} ARK Wiki !!!`}
                        </DropdownMenu.ItemTitle>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        key="what2reg"
                        onSelect={() => {
                            trigger();
                            const courseCode = course['Course Code'];
                            const profName = course['Teacher Information'];
                            const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(courseCode) + '/' + encodeURIComponent(lodash.deburr(profName));
                            openLink(URI);
                        }}
                    >
                        <DropdownMenu.ItemIcon
                            ios={{
                                name: 'star',
                                pointSize: scale(18),
                                hierarchicalColor: {
                                    dark: black.third,
                                    light: black.third,
                                },
                            }}
                            androidIconName="ic_menu_star"
                        />
                        <DropdownMenu.ItemTitle style={{ color: black.third }}>
                            {`${t('查', { ns: 'catalog' })} ${t('選咩課', { ns: 'catalog' })}`}
                        </DropdownMenu.ItemTitle>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        key="official"
                        onSelect={() => {
                            trigger();
                            openLink(OFFICIAL_COURSE_SEARCH + course['Course Code']);
                        }}
                    >
                        <DropdownMenu.ItemIcon
                            ios={{
                                name: 'graduationcap',
                                pointSize: scale(18),
                                hierarchicalColor: {
                                    dark: black.third,
                                    light: black.third,
                                },
                            }}
                            androidIconName="ic_menu_myplaces"
                        />
                        <DropdownMenu.ItemTitle style={{ color: black.third }}>
                            {`${t('查', { ns: 'catalog' })} ${t('官方', { ns: 'catalog' })}`}
                        </DropdownMenu.ItemTitle>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                        key="section"
                        onSelect={() => {
                            trigger();
                            navigation.navigate('LocalCourse', course['Course Code']);
                        }}
                    >
                        <DropdownMenu.ItemIcon
                            ios={{
                                name: 'list.bullet',
                                pointSize: scale(18),
                                hierarchicalColor: {
                                    dark: black.third,
                                    light: black.third,
                                },
                            }}
                            androidIconName="ic_menu_agenda"
                        />
                        <DropdownMenu.ItemTitle style={{ color: black.third }}>
                            {`${t('查', { ns: 'catalog' })} ${t('Section / 老師', { ns: 'catalog' })}`}
                        </DropdownMenu.ItemTitle>
                    </DropdownMenu.Item>
                    {hasDuplicate ? (
                        <DropdownMenu.Item
                            key="del-all-sections"
                            destructive
                            onSelect={() => {
                                trigger();
                                Alert.alert('', `要在模擬課表中刪除${course['Course Code']}的所有Section嗎？`,
                                    [
                                        {
                                            text: 'Yes',
                                            onPress: () => {
                                                trigger();
                                                const tempList = lodash.filter(u_codeSectionList,
                                                    i => course['Course Code'] !== i['Course Code']
                                                );
                                                handleCourseList(tempList);
                                                verScroll.current?.scrollTo({ y: 0 });
                                            },
                                            style: 'destructive',
                                        },
                                        {
                                            text: 'No',
                                        },
                                    ],
                                    { cancelable: true }
                                );
                            }}
                        >
                            <DropdownMenu.ItemIcon
                                ios={{
                                    name: 'trash',
                                    pointSize: scale(18),
                                    hierarchicalColor: {
                                        dark: unread,
                                        light: unread,
                                    },
                                }}
                                androidIconName="ic_menu_delete"
                            />
                            <DropdownMenu.ItemTitle style={{ color: black.third }}>
                                {`${t('刪除所有', { ns: 'timetable' })} ${course['Course Code']}`}
                            </DropdownMenu.ItemTitle>
                        </DropdownMenu.Item>
                    ) : null}
                    <DropdownMenu.Item
                        key="drop-section"
                        destructive
                        onSelect={() => {
                            trigger();
                            Alert.alert('', `要在模擬課表中刪除${course['Course Code']}-${course.Section}嗎？`,
                                [
                                    {
                                        text: 'Drop',
                                        onPress: () => {
                                            trigger();
                                            dropCourse(course);
                                        },
                                        style: 'destructive',
                                    },
                                    {
                                        text: '取消',
                                    },
                                ],
                                { cancelable: true }
                            );
                        }}
                    >
                        <DropdownMenu.ItemIcon
                            ios={{
                                name: 'trash',
                                pointSize: scale(18),
                                hierarchicalColor: {
                                    dark: unread,
                                    light: unread,
                                },
                            }}
                            androidIconName="ic_menu_delete"
                        />
                        <DropdownMenu.ItemTitle style={{ color: black.third }}>
                            {`${t('刪除', { ns: 'timetable' })} ${course['Course Code']}-${course.Section}`}
                        </DropdownMenu.ItemTitle>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </View>
        );
    };

    // 導入ISW課表數據
    const importCourseData = () => {
        trigger(); // 動效或聲音提示

        // 嘗試解析 Timetable 文本
        const parseRes = parseImportData(importTimeTableText);

        if (parseRes) {
            // 滾動到頂部
            verScroll.current?.scrollTo({ y: 0 });

            // 將解析結果導入課表
            handleCourseList(parseRes);
        } else {
            Alert.alert('', '您輸入的格式有誤，\n有正確全選複製Timetable嗎？');
        }
    };

    const addCourse = (course) => {
        trigger(); // 動效或聲音提示

        // 使用 lodash 過濾掉相同 Course Code 的課程，然後添加新課程
        const tempList = [
            ...lodash.filter(u_codeSectionList, i => i['Course Code'] !== course['Course Code']),
            {
                'Course Code': course['Course Code'],
                'Section': course.Section,
            },
        ];

        handleCourseList(tempList);
    };

    const addAllSectionCourse = (courseCode, sectionObj) => {
        // 使用 lodash 過濾掉相同 Course Code 的課程，然後添加所有新的 Section
        const tempList = [
            ...lodash.filter(u_codeSectionList, itm => itm['Course Code'] !== courseCode),
            ...lodash.map(Object.keys(sectionObj), key => ({
                'Course Code': courseCode,
                'Section': key,
            })),
        ];

        handleCourseList(tempList);
    };

    const dropCourse = (course) => {
        trigger(); // 動效或聲音提示

        // 過濾掉指定 Code + Section 的課程
        const newList = lodash.filter(u_codeSectionList, i =>
            !(i['Course Code'] === course['Course Code'] && i.Section === course.Section)
        );

        handleCourseList(newList); // 更新課表清單

        Toast.show(`已刪除 ${course['Course Code']}-${course.Section}`);
    };

    const clearCourse = () => {
        trigger(); // 動效或聲音提示

        // 關閉 BottomSheet
        bottomSheetRef?.current?.close();

        Alert.alert('', '確定要清空當前的模擬課表嗎？', [
            {
                text: '確定清空',
                onPress: () => {
                    trigger(); // 再次觸發動效

                    // 清空課表狀態
                    setAllCourseAllTime([]);
                    setU_codeSectionList([]);
                    setImportTimeTableText(null);
                    setSearchText(null);

                    // 清空本地儲存
                    setLocalStorage('ARK_Timetable_Storage', []);
                    setLocalStorage('ARK_WeekTimetable_Storage', []);

                    // 滾動到頂部
                    verScroll?.current?.scrollTo({ y: 0 });
                },
                style: 'destructive',
            },
            {
                text: 'No',
            },
        ], { cancelable: true });
    };


    // 渲染首次使用引導頁面
    const renderFirstUse = () => {
        return (
            <View style={{ paddingHorizontal: scale(16), paddingTop: scale(16) }}>
                {/* 頁面標題 */}
                <Text style={s.guideTitle}>
                    {t('如何開始使用模擬課表？', { ns: 'timetable' })}
                </Text>

                {/* 方法一卡片：手動添加 */}
                <View style={s.methodCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(10) }}>
                        <View style={s.stepBadge}>
                            <Text style={s.stepBadgeText}>{t('方法', { ns: 'timetable' })} 1</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="add-circle-outline" size={scale(28)} color={themeColor} />
                        <Text style={s.cardDescription}>
                            {t('右上角按鈕手動"Add"！', { ns: 'timetable' })}
                        </Text>
                    </View>
                </View>

                {/* 方法二卡片：ISW 導入 */}
                <View style={s.methodCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(10) }}>
                        <View style={s.stepBadge}>
                            <Text style={s.stepBadgeText}>{t('方法', { ns: 'timetable' })} 2</Text>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(12) }}>
                        <Ionicons name="clipboard-outline" size={scale(28)} color={themeColor} />
                        <Text style={s.cardDescription}>
                            {`${t('全選、複製Timetable，', { ns: 'timetable' })}\n${t('粘貼到下方輸入框，', { ns: 'timetable' })}${t('一鍵導入！', { ns: 'timetable' })}`}
                        </Text>
                    </View>

                    {/* Step 2.1: 跳轉 ISW 按鈕 */}
                    {importTimeTableText?.length > 0 ? null : (
                        <TouchableOpacity
                            style={s.stepButton}
                            onPress={() => {
                                trigger();
                                openLink(UM_ISW);
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="open-outline" size={scale(16)} color={themeColor} style={{ marginRight: scale(6) }} />
                                <Text style={s.stepButtonText}>
                                    {`2.1 ${t('進入舊ISW複製', { ns: 'timetable' })}`}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* 分隔線 */}
                    <View style={s.guideDivider} />

                    {/* Step 2.2: 輸入框 + 導入按鈕 */}
                    <Text style={s.inputLabel}>
                        {`2.2 ${t('粘貼課表數據', { ns: 'timetable' })}`}
                    </Text>
                    <TextInput
                        selectTextOnFocus
                        multiline
                        numberOfLines={6}
                        onChangeText={text => setImportTimeTableText(text)}
                        placeholder={`Click here and enter your timetable:
Example：
TimeDay  Mon  Tue  Wed  Thur  Fri  Sat  Sun
9:00  09:00-10:45 ECEN0000(001)
E11-0000
(Lecture)  -  -  09:00-10:45 ...`}
                        placeholderTextColor={black.third}
                        value={importTimeTableText}
                        style={s.guideTextInput}
                        returnKeyType={'done'}
                        blurOnSubmit={true}
                        onSubmitEditing={() => {
                            Keyboard.dismiss();
                            importCourseData();
                        }}
                        clearButtonMode="always"
                    />

                    <Text style={s.inputHint}>
                        {t('↑記得先粘貼課表數據，再點擊導入哦', { ns: 'timetable' })}
                    </Text>

                    {/* 導入課表按鈕 */}
                    <TouchableOpacity
                        style={{
                            ...s.importButton,
                            backgroundColor: importTimeTableText ? tonal.success30 : disabled,
                        }}
                        onPress={importCourseData}
                        disabled={!importTimeTableText}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="download-outline" size={scale(18)} color={importTimeTableText ? success : trueWhite} style={{ marginRight: scale(6) }} />
                            <Text style={{ ...s.importButtonText, color: importTimeTableText ? success : trueWhite }}>
                                {t('一鍵導入到模擬課表', { ns: 'timetable' })}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* 聯絡資訊與致敬 */}
                <View style={{ alignItems: 'center', marginTop: scale(20), marginBottom: scale(30) }}>
                    <Text style={s.footerText}>
                        {'如有問題，立即聯繫 umacark@gmail.com'}
                    </Text>
                    <Text style={{ ...s.footerText, marginTop: scale(8) }}>
                        {'靈感源自 kchomacau, Raywong 前輩的\n"課表模擬"開源倉庫！'}
                    </Text>
                </View>
            </View>
        );
    };

    const renderDayFilter = () => {
        return (
            <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                marginVertical: verticalScale(5),
                flexDirection: 'row',
            }}>
                {dayList.map(day => {
                    const isSelected = day === dayFilterChoice;

                    return (
                        <TouchableOpacity
                            key={day}
                            style={{
                                ...s.filterButtonContainer,
                                backgroundColor: isSelected ? secondThemeColor : white,
                                borderWidth: scale(1),
                                borderColor: isSelected ? secondThemeColor : themeColor,
                            }}
                            onPress={() => {
                                trigger();
                                if (isSelected) {
                                    // 還原時間篩選
                                    setDayFilterChoice(null);
                                    setTimeFilterFrom(timeFrom);
                                    setTimeFilterTo(timeTo);
                                } else {
                                    setDayFilterChoice(day);
                                }
                            }}
                        >
                            <Text style={{
                                ...uiStyle.defaultText,
                                color: isSelected ? white : themeColor,
                            }}>
                                {day}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    const renderTimeFilter = () => {
        const timeButton = (mode) => {
            let backgroundColor = null;
            let textColor = black.third;

            if (mode === 'from') {
                backgroundColor = timeFilterFrom === timeFrom ? null : themeColor;
                textColor = timeFilterFrom === timeFrom ? black.third : white;
            } else {
                backgroundColor = timeFilterTo === timeTo ? null : themeColor;
                textColor = timeFilterTo === timeTo ? black.third : white;
            }

            return (
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        ...s.filterButtonContainer,
                        backgroundColor,
                        borderWidth: scale(1),
                        borderColor: themeColor,
                        borderRadius: scale(5),
                    }}
                    onPress={() => {
                        trigger();
                        setTimePickerMode(mode);
                        setShowTimePicker(true);
                    }}
                >
                    <Text style={{ ...uiStyle.defaultText, color: textColor }}>
                        {mode === 'from' ? timeFilterFrom : timeFilterTo}
                    </Text>
                </TouchableOpacity>
            );
        };

        return (
            <View style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
                {/* 還原時間篩選 */}
                {(timeFilterFrom !== timeFrom || timeFilterTo !== timeTo) && (
                    <TouchableOpacity
                        style={{
                            ...s.filterButtonContainer,
                            backgroundColor: themeColorUltraLight,
                        }}
                        onPress={() => {
                            trigger();
                            setTimeFilterFrom(timeFrom);
                            setTimeFilterTo(timeTo);
                        }}
                    >
                        <Text style={{ ...uiStyle.defaultText, color: themeColor }}>Clear</Text>
                    </TouchableOpacity>
                )}

                {/* 時間選項 */}
                {timeButton('from')}
                <Text style={{ ...uiStyle.defaultText, color: black.third }}>{' - '}</Text>
                {timeButton('to')}

                {/* 時間選擇器 */}
                <DateTimePickerModal
                    isVisible={showTimePicker}
                    mode="time"
                    date={
                        timePickerMode === 'from'
                            ? moment(timeFilterFrom, 'HH:mm').toDate()
                            : moment(timeFilterTo, 'HH:mm').toDate()
                    }
                    minuteInterval={5}
                    onConfirm={(date) => {
                        const formattedTime = moment(date).format('HH:mm');
                        if (timePickerMode === 'from') {
                            if (moment(date).isSameOrAfter(moment(timeFilterTo, 'HH:mm'))) {
                                Alert.alert(t('開始時間不能晚於結束時間！', { ns: 'timetable' }));
                                return;
                            }
                            setTimeFilterFrom(formattedTime);
                        } else {
                            if (moment(date).isSameOrBefore(moment(timeFilterFrom, 'HH:mm'))) {
                                Alert.alert(t('結束時間不能早於開始時間！', { ns: 'timetable' }));
                                return;
                            }
                            setTimeFilterTo(formattedTime);
                        }
                        setShowTimePicker(false);
                    }}
                    onCancel={() => setShowTimePicker(false)}
                />
            </View>
        );
    };

    /**
     * 渲染課程搜索界面
     */
    const renderCourseSearch = () => {
        const filterCourseList = searchText ? handleSearchFilterCourse(searchText) : [];
        const haveSearchResult = searchText && filterCourseList.length > 0;

        // 整理所有候選課程的 Section
        const courseCodeObj = {};
        if (haveSearchResult) {
            filterCourseList.forEach(i => {
                const codeRes = courseTimeList.filter(itm =>
                    itm['Course Code'].toUpperCase().includes(i['Course Code'].toUpperCase())
                );
                const sectionObj = lodash.groupBy(codeRes, 'Section');
                courseCodeObj[i['Course Code']] = sectionObj;
            });
        }

        return (
            <View style={{ width: '100%', padding: scale(10) }}>
                {/* 搜索輸入框 */}
                <View style={{
                    borderColor: themeColor,
                    backgroundColor: white,
                    height: verticalScale(35),
                    borderWidth: scale(1),
                    borderRadius: scale(5),
                    flexDirection: 'row',
                    alignItems: 'center',
                }}>
                    <Ionicons
                        name="search"
                        size={scale(20)}
                        color={black.third}
                        style={{ opacity: 0.4, position: 'absolute', left: scale(10) }}
                    />
                    {perSearchText && (
                        <TouchableOpacity
                            style={{
                                borderWidth: scale(1),
                                borderRadius: scale(5),
                                borderColor: themeColor,
                                padding: scale(3),
                                position: 'absolute',
                                left: scale(40),
                                zIndex: 999,
                            }}
                            onPress={() => {
                                trigger();
                                setSearchText(perSearchText);
                                setPerSearchText(null);
                            }}
                        >
                            <Text style={{ ...uiStyle.defaultText, color: themeColor }}>Back</Text>
                        </TouchableOpacity>
                    )}
                    <BottomSheetTextInput
                        ref={textSearchRef}
                        style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            fontSize: scale(13),
                            padding: scale(5),
                            height: '100%',
                            flex: 1,
                            textAlign: 'center',
                            textAlignVertical: 'center',
                        }}
                        onChangeText={(text) => {
                            setSearchText(text);
                            if (text.length === 0) { setPerSearchText(null); }
                        }}
                        value={searchText}
                        selectTextOnFocus
                        placeholder={t('搜索課程：ECE, 電氣, AIM...', { ns: 'timetable' })}
                        placeholderTextColor={black.third}
                        returnKeyType="search"
                        selectionColor={themeColor}
                        blurOnSubmit
                        onSubmitEditing={() => Keyboard.dismiss()}
                        clearButtonMode="always"
                    />
                </View>

                <BottomSheetScrollView>
                    {/* 篩選條件（星期與時間） */}
                    {renderDayFilter()}
                    {dayFilterChoice && renderTimeFilter()}

                    {/* 搜索結果列表（多個課程） */}
                    {haveSearchResult && filterCourseList.length > 1 && (
                        <BottomSheetFlatList
                            data={filterCourseList}
                            key={`${searchText || 'search'}-cols-${filterCourseList.length}`}
                            numColumns={filterCourseList.length}
                            columnWrapperStyle={{ flexWrap: 'wrap' }}
                            style={{ marginTop: scale(5), marginLeft: scale(10) }}
                            renderItem={({ item }) => {
                                const sectionObj = courseCodeObj[item['Course Code']];
                                let dayInFilter = true;

                                if (dayFilterChoice) {
                                    dayInFilter = lodash.some(Object.keys(sectionObj), key => {
                                        const timeInFilter = lodash.some(sectionObj[key], course => {
                                            const courseStart = moment(course['Time From'], 'HH:mm');
                                            const courseEnd = moment(course['Time To'], 'HH:mm');
                                            const filterStart = moment(timeFilterFrom, 'HH:mm');
                                            const filterEnd = moment(timeFilterTo, 'HH:mm');
                                            return courseStart.isBefore(filterEnd) && courseEnd.isAfter(filterStart);
                                        });
                                        return timeInFilter && sectionObj[key].some(course => course.Day === dayFilterChoice);
                                    });
                                }

                                if (!dayInFilter) { return null; }

                                return (
                                    <TouchableOpacity
                                        style={s.courseCard}
                                        onPress={() => {
                                            trigger();
                                            setPerSearchText(searchText);
                                            setSearchText(item['Course Code']);
                                            verScroll.current?.scrollTo({ y: 0 });
                                        }}
                                    >
                                        <Text style={{
                                            ...s.searchResultText,
                                            fontSize: scale(15),
                                            color: black.third,
                                            fontWeight: 'bold',
                                        }}>{item['Course Code']}</Text>
                                        <Text style={s.searchResultText}>{item['Course Title']}</Text>
                                        <Text style={s.searchResultText}>{item['Course Title Chi']}</Text>
                                    </TouchableOpacity>
                                );
                            }}
                            ListFooterComponent={<View style={{ marginBottom: verticalScale(50) }} />}
                        />
                    )}

                    {/* 單一課程詳細 Section 顯示 */}
                    {haveSearchResult && filterCourseList.length === 1 && filterCourseList.map(i => {
                        const sectionObj = courseCodeObj[i['Course Code']];
                        return (
                            <View style={{ alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                {/* 刪除該課程所有 Section */}
                                <TouchableOpacity
                                    style={{
                                        ...s.buttonContainer,
                                        backgroundColor: tonal.unread30,
                                        borderRadius: scale(5),
                                        padding: scale(3),
                                    }}
                                    onPress={() => {
                                        trigger();
                                        const newList = lodash.filter(u_codeSectionList, itm => itm['Course Code'] !== i['Course Code']);
                                        handleCourseList(newList);
                                        verScroll.current?.scrollTo({ y: 0 });
                                    }}
                                >
                                    <Text style={{ ...s.searchResultText, color: unread, fontWeight: 'bold' }}>
                                        {`${t('刪除所有', { ns: 'timetable' })} ${i['Course Code']}`}
                                    </Text>
                                </TouchableOpacity>

                                <Text style={{ ...s.searchResultText, fontWeight: 'bold' }}>{`↓ ${t('全部放入課表', { ns: 'timetable' })}`}</Text>

                                <TouchableOpacity
                                    style={s.courseCard}
                                    onPress={() => {
                                        trigger();
                                        bottomSheetRef.current?.snapToIndex(0);
                                        addAllSectionCourse(i['Course Code'], sectionObj);
                                        setSearchText(i['Course Code']);
                                        verScroll.current?.scrollTo({ y: 0 });
                                    }}
                                >
                                    <Text style={{
                                        ...s.searchResultText,
                                        fontSize: scale(15),
                                        color: themeColor,
                                        fontWeight: 'bold',
                                    }}>{i['Course Code']}</Text>
                                    <Text style={s.searchResultText}>{i['Course Title']}</Text>
                                    <Text style={s.searchResultText}>{i['Course Title Chi']}</Text>
                                </TouchableOpacity>

                                <Text style={{ ...s.searchResultText, fontWeight: 'bold' }}>{`↓ ${t('選取單節', { ns: 'timetable' })}`}</Text>
                                <BottomSheetFlatList
                                    data={Object.keys(sectionObj)}
                                    style={{ marginTop: scale(5), width: '100%' }}
                                    numColumns={Object.keys(sectionObj).length}
                                    key={`${searchText || 'single'}-sections-${Object.keys(sectionObj).length}`}
                                    columnWrapperStyle={Object.keys(sectionObj).length > 1 ? {
                                        flexWrap: 'wrap',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    } : null}
                                    renderItem={({ item: sectionKey }) => {
                                        const courseInfo = sectionObj[sectionKey][0];
                                        const sortedSection = daySort(sectionObj[sectionKey]);

                                        let dayInFilter = true;
                                        if (dayFilterChoice) {
                                            if (timeFilterFrom !== timeFrom || timeFilterTo !== timeTo) {
                                                const filterStart = moment(timeFilterFrom, 'HH:mm');
                                                const filterEnd = moment(timeFilterTo, 'HH:mm');
                                                dayInFilter = sortedSection.some(course =>
                                                    course.Day === dayFilterChoice &&
                                                    (moment(course['Time From'], 'HH:mm').isBetween(filterStart, filterEnd, null, '[]') ||
                                                        moment(course['Time To'], 'HH:mm').isBetween(filterStart, filterEnd, null, '[]'))
                                                );
                                            } else {
                                                dayInFilter = sortedSection.some(course => course.Day === dayFilterChoice);
                                            }
                                        }

                                        if (!dayInFilter) { return null; }

                                        return (
                                            <TouchableOpacity
                                                style={{ ...s.courseCard, width: '45%' }}
                                                onPress={() => {
                                                    trigger();
                                                    addCourse(courseInfo);
                                                    bottomSheetRef.current?.snapToIndex(0);
                                                }}
                                            >
                                                {(courseInfo['Course Code'] === 'CPED1001' || courseInfo['Course Code'] === 'CPED1002') && (
                                                    <>
                                                        <Text style={s.searchResultText}>{courseInfo['Course Title']}</Text>
                                                        <Text style={s.searchResultText}>{courseInfo['Course Title Chi']}</Text>
                                                    </>
                                                )}
                                                <Text style={{ ...s.searchResultText, color: themeColor, fontSize: scale(15), fontWeight: 'bold' }}>
                                                    {sectionKey}
                                                </Text>
                                                <Text style={{ ...s.searchResultText, color: themeColor }}>
                                                    {courseInfo['Teacher Information']}
                                                </Text>
                                                {sortedSection.map(itm => (
                                                    <Text style={s.searchResultText}>
                                                        {`${itm.Day} ${itm['Time From']} ~ ${itm['Time To']}`}
                                                    </Text>
                                                ))}
                                            </TouchableOpacity>
                                        );
                                    }}
                                    ListFooterComponent={<View style={{ marginBottom: verticalScale(50) }} />}
                                    scrollEnabled={false}
                                />
                            </View>
                        );
                    })}
                </BottomSheetScrollView>
            </View>
        );
    };

    /**
     * 返回搜索候選所需的課程列表
     *
     * @param {string} inputText - 用戶輸入的搜索文本
     *
     * @returns {Array} - 符合搜索條件的課程列表
     */
    function handleSearchFilterCourse(inputText) {
        const upperInputText = inputText?.toUpperCase();

        return lodash.filter(coursePlanList, itm => {
            return itm['Course Code'].toUpperCase().includes(upperInputText) ||
                itm['Course Title'].toUpperCase().includes(upperInputText) ||
                itm['Course Title Chi'].includes(inputText) ||
                itm['Course Title Chi'].includes(converter(inputText)) ||
                itm['Teacher Information'].includes(upperInputText) ||
                (itm['Offering Department'] && itm['Offering Department'].includes(upperInputText));
        });
    }

    const renderReminder = () => {
        return (
            <View style={{ width: '100%', alignItems: 'center', marginBottom: scale(5) }}>
                <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), color: black.third, textAlign: 'center' }}>
                    {t('檢查課表版本!', { ns: 'catalog' })}
                </Text>
                <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), color: black.third, textAlign: 'center' }}>
                    {t('僅作模擬!', { ns: 'timetable' })}
                </Text>
            </View>
        );
    };

    const courseTimeList = useMemo(() => {
        return s_coursePlanTimeFile.Courses;
    }, [s_coursePlanTimeFile]);

    const coursePlanList = useMemo(() => {
        return s_coursePlanFile.Courses;
    }, [s_coursePlanFile]);

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            <ScrollView
                ref={verScroll}
                keyboardDismissMode="on-drag"
                contentInsetAdjustmentBehavior='automatic'
            >
                {/* 頁面標題列（sticky header） */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingTop: verticalScale(3),
                    paddingBottom: verticalScale(5),
                    backgroundColor: bg_color,
                }}>
                    {/* 清空課表按鈕 */}
                    {allCourseAllTime?.length > 0 && (
                        <TouchableOpacity
                            style={{
                                position: 'absolute',
                                left: scale(10),
                                backgroundColor: tonal.primary15,
                                borderRadius: scale(5),
                                padding: scale(5),
                            }}
                            onPress={clearCourse}
                        >
                            <Text style={{ ...uiStyle.defaultText, color: themeColor, fontWeight: 'bold', lineHeight: verticalScale(14) }}>
                                {t('清空', { ns: 'timetable' })}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* 標題 + Logo */}
                    <View style={{ flexDirection: 'row', alignSelf: 'center', alignItems: 'center' }}>
                        <Image
                            source={require('../../../static/img/logo.png')}
                            style={{
                                height: iconSize,
                                width: iconSize,
                                borderRadius: scale(5),
                            }}
                        />
                        <View style={{ marginLeft: scale(5) }}>
                            <Text style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(18),
                                color: themeColor,
                                fontWeight: '600',
                            }}>
                                {t('課表模擬', { ns: 'timetable' })}
                            </Text>
                        </View>
                    </View>

                    {/* Add 課按鈕 */}
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            right: scale(10),
                            backgroundColor: hasOpenCourseSearch ? tonal.secondary15 : tonal.primary15,
                            borderRadius: scale(5),
                            padding: scale(5),
                        }}
                        onPress={() => {
                            trigger();
                            if (Keyboard.isVisible()) { Keyboard.dismiss(); }

                            if (hasOpenCourseSearch) {
                                bottomSheetRef.current?.close();
                            } else {
                                if (allCourseAllTime?.length > 0) {
                                    bottomSheetRef.current?.snapToIndex(1);
                                } else {
                                    bottomSheetRef.current?.expand();
                                }
                            }

                            setHasOpenCourseSearch(!hasOpenCourseSearch);
                            verScroll.current?.scrollTo({ y: 0 });
                        }}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: hasOpenCourseSearch ? secondThemeColor : themeColor,
                            fontWeight: 'bold',
                            lineHeight: verticalScale(14),
                        }}>
                            {hasOpenCourseSearch ? t('關閉', { ns: 'timetable' }) : t('搵課/加課', { ns: 'timetable' })}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* 渲染課表或首次使用提示 */}
                <View style={{ flex: 1 }}>
                    {allCourseAllTime?.length > 0 ? (<>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {dayList.map(day => renderDay(day))}
                        </ScrollView>
                        {renderReminder()}
                    </>) : renderFirstUse()}
                </View>
            </ScrollView>

            <CustomBottomSheet
                ref={bottomSheetRef}
                setHasOpenFalse={() => {
                    if (hasOpenCourseSearch) {
                        setHasOpenCourseSearch(false);
                    }
                }}
            >
                {/* 數據版本顯示 */}
                {!searchText && (
                    <Text style={{
                        alignSelf: 'center',
                        ...uiStyle.defaultText,
                        fontSize: scale(9),
                        color: black.third,
                        textAlign: 'center',
                    }}>
                        Timetable Version: {s_courseVersion.adddrop.updateTime + '\n'}
                        {t('重啟APP或在搵課頁手動更新版本，取決於開發者是否上傳更新', { ns: 'timetable' })}
                    </Text>
                )}

                {renderCourseSearch()}
            </CustomBottomSheet>

        </View>);
}

export default CourseSim;

