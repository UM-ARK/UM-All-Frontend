import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useContext,
    useMemo,
} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Pressable,
    Alert,
    StyleSheet,
    TextInput,
    Keyboard,
    Platform,
} from 'react-native';

import { scale, verticalScale } from 'react-native-size-matters';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import moment from 'moment';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
// 課表一次掛多張卡片：不可用 @expo/ui MenuView（SwiftUI Host matchContents
// 會在 Tab 切換／版面提交時反寫 Fabric ShadowTree 並 abort）。
// 改用 @react-native-menu/menu（原生 UIButton）；縮放改由 onOpenMenu/onCloseMenu 驅動。
import { MenuView } from '@react-native-menu/menu';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import Toast from 'react-native-simple-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from 'i18next';
import {
    BottomSheetTextInput,
    BottomSheetScrollView,
    BottomSheetFlatList,
    useBottomSheetScrollableCreator,
} from '@gorhom/bottom-sheet';
import { FlashList } from '@shopify/flash-list';
import { ScrollView } from 'react-native-gesture-handler';
import lodash from 'lodash';
import * as OpenCC from 'opencc-js';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

import { useTheme, uiStyle } from '../../../../../components/ThemeContext';
import { openLink } from '../../../../../utils/browser';
import {
    ARK_WIKI_SEARCH,
    OFFICIAL_COURSE_SEARCH,
    UM_ISW,
} from '../../../../../utils/pathMap';
import { getCurrentUmehHost } from '../../../../../utils/umehHost';
import { logToFirebase } from '../../../../../utils/firebaseAnalytics';
import { trigger } from '../../../../../utils/trigger';
import TouchableScale from '../../../../../components/TouchableScale';
import CustomBottomSheet from '../../../../../utils/BottomSheet';
import { useCoursePlan } from '../../context/CoursePlanContext';
import { getSlotKey } from '../../hooks/useConflict';
import { normalizeImportText } from '../../utils/parseImportData';
import AddCourseFab from '../../components/AddCourseFab';
import { COURSE_SEARCH_SEGMENT } from '../../../../../utils/courseNavigation';
import { getReplacementCourses } from './utils/replacementCourses';

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' }); // 簡體轉繁體

/** 課表單一星期欄寬 */
const DAY_COLUMN_WIDTH = scale(135);
/** 課程卡片左右邊距 */
const COURSE_CARD_MARGIN = scale(5);
const COURSE_CARD_WIDTH = DAY_COLUMN_WIDTH - COURSE_CARD_MARGIN * 2;
const dayList = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const timeFrom = '00:00';
const timeTo = '23:59';

// 將 HH:mm 時間轉為Date對象，用於排序
function toDateTime(time) {
    var [hours, minutes] = time.split(':');
    return new Date(0, 0, 0, hours, minutes); // 使用一个固定的日期
}

const daySorter = {
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
    SUN: 7,
};
// 按星期一到星期天排序
const daySort = objArr => {
    return lodash.sortBy(objArr, item => daySorter[item.Day]);
};

/** 與 TouchableScale 預設相近的彈簧參數 */
const COURSE_CARD_SPRING = {
    damping: 18,
    stiffness: 280,
    mass: 0.4,
};

/**
 * 共用課程卡片選單（@react-native-menu/menu）。
 * 原生 UIButton 會吃掉子層 Pressable 的 pressIn，故改以選單開合驅動縮放回饋。
 */
function CourseActionMenuCard({
    actions,
    onPressAction,
    onOpen,
    menuStyle,
    cardStyle,
    accessibilityLabel,
    children,
}) {
    const cardScale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
    }));

    return (
        <MenuView
            actions={actions}
            onPressAction={onPressAction}
            accessibilityLabel={accessibilityLabel}
            shouldOpenOnLongPress={false}
            onOpenMenu={() => {
                cardScale.value = withSpring(0.96, COURSE_CARD_SPRING);
                onOpen?.();
            }}
            onCloseMenu={() => {
                cardScale.value = withSpring(1, COURSE_CARD_SPRING);
            }}
            style={menuStyle}>
            <Animated.View style={[cardStyle, animatedStyle]}>
                {children}
            </Animated.View>
        </MenuView>
    );
}

/** 課表欄內使用的固定尺寸課程卡片選單。 */
function TimetableCourseMenuCard({
    actions,
    onPressAction,
    onPress,
    backgroundColor,
    children,
}) {
    return (
        <CourseActionMenuCard
            actions={actions}
            onPressAction={onPressAction}
            onOpen={onPress}
            menuStyle={{
                alignSelf: 'center',
                width: COURSE_CARD_WIDTH,
                margin: COURSE_CARD_MARGIN,
            }}
            cardStyle={{
                width: COURSE_CARD_WIDTH,
                backgroundColor,
                borderRadius: scale(10),
                padding: scale(5),
                alignItems: 'center',
                justifyContent: 'center',
            }}>
            {children}
        </CourseActionMenuCard>
    );
}

function CourseSim({ route, navigation }) {
    // 課程資料與排課狀態一律來自 CoursePlanProvider，本段落不再自行持有
    const {
        courseVersion,
        courseTimeList,
        coursePlanList,
        planList,
        planSlots,
        planCourseCodes,
        commitPlan,
        addCourse,
        addAllSections,
        dropCourse,
        dropAllSections,
        conflictSlotKeys,
        importFromISW,
        clearPlan,
    } = useCoursePlan();

    // state
    const [importTimeTableText, setImportTimeTableText] = useState(''); // 空課表引導的貼上導入
    const [searchText, setSearchText] = useState(null);
    const [perSearchText, setPerSearchText] = useState(null);

    const [dayFilterChoice, setDayFilterChoice] = useState(null);
    const [timeFilterFrom, setTimeFilterFrom] = useState(timeFrom);
    const [timeFilterTo, setTimeFilterTo] = useState(timeTo);
    const [timePickerMode, setTimePickerMode] = useState('from');
    const [showTimePicker, setShowTimePicker] = useState(false);

    const [hasOpenCourseSearch, setHasOpenCourseSearch] = useState(false);
    const [bottomSheetMode, setBottomSheetMode] = useState('search');
    const [replacementTarget, setReplacementTarget] = useState(null);
    const [replacementCourseCode, setReplacementCourseCode] = useState(null);
    const [replacementSearchText, setReplacementSearchText] = useState('');

    // ref
    const verScroll = useRef();
    const textSearchRef = useRef();
    const bottomSheetRef = useRef();
    const replacementListScrollable = useBottomSheetScrollableCreator({
        focusHook: useFocusEffect,
    });

    const { theme } = useTheme();
    const {
        themeColor,
        themeColorUltraLight,
        secondThemeColor,
        tonal,
        black,
        white,
        bg_color,
        unread,
        success,
        TIME_TABLE_COLOR,
    } = theme;

    const insets = useSafeAreaInsets();
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;

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
            paddingHorizontal: scale(5),
            paddingVertical: verticalScale(2),
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
            borderWidth: 1,
            borderColor: themeColorUltraLight,
        },
    });

    const { i18n } = useTranslation();
    const replacementResult = useMemo(
        () =>
            getReplacementCourses({
                targetSlot: replacementTarget,
                planSlots,
                planList,
                courseTimeList,
                coursePlanList,
            }),
        [
            replacementTarget,
            planSlots,
            planList,
            courseTimeList,
            coursePlanList,
        ],
    );

    useEffect(() => {
        logToFirebase('openPage', { page: 'courseSim' });
    }, []);

    // 頁面是否聚焦監聽
    useFocusEffect(
        useCallback(() => {
            // 當頁面聚焦時執行，如存在add課傳參
            if (route.params?.add) {
                const { add } = route.params;
                trigger();
                addCourse(add);
                // 執行任務後，重置參數
                navigation.setParams({ add: undefined });
            }

            // 如果有check傳參
            if (route.params?.check) {
                const { check } = route.params;
                setBottomSheetMode('search');
                setReplacementTarget(null);
                setReplacementCourseCode(null);
                if (check.length > 0) {
                    setSearchText(check);
                }
                setHasOpenCourseSearch(true);
                // 執行任務後，重置參數
                navigation.setParams({ check: undefined });
                bottomSheetRef?.current?.snapToIndex(1);
            }

            // 失焦時自動清理
            return () => { };
        }, [route, navigation, addCourse]),
    );

    /**
     * 從課表移除單一 section，並回饋已刪除的是哪一節。
     *
     * @param {Object} course 課節
     */
    const handleDropCourse = course => {
        trigger();
        dropCourse(course);

        Toast.show(
            t('已刪除課程', {
                ns: 'timetable',
                code: course['Course Code'],
                section: course.Section,
            }),
        );
    };

    /** 建立所有課程 Menu 共用的四個查詢選項。 */
    const getCourseInfoMenuActions = () => [
        {
            id: 'wiki',
            title: `${t('寫', { ns: 'catalog' })} ARK Wiki !!!`,
            image: Platform.select({
                ios: 'book',
                android: 'ic_menu_agenda',
            }),
            imageColor: themeColor,
            titleColor: themeColor,
        },
        {
            id: 'what2reg',
            title: `${t('查', { ns: 'catalog' })} ${t('選咩課', { ns: 'catalog' })}`,
            image: Platform.select({
                ios: 'star',
                android: 'btn_star_big_on',
            }),
            imageColor: black.third,
            titleColor: black.third,
        },
        {
            id: 'official',
            title: `${t('查', { ns: 'catalog' })} ${t('官方', { ns: 'catalog' })}`,
            image: Platform.select({
                ios: 'graduationcap',
                android: 'ic_menu_info_details',
            }),
            imageColor: black.third,
            titleColor: black.third,
        },
        {
            id: 'section',
            title: `${t('查', { ns: 'catalog' })} ${t('Section / 老師', { ns: 'catalog' })}`,
            image: Platform.select({
                ios: 'list.bullet',
                android: 'ic_menu_sort_by_size',
            }),
            imageColor: black.third,
            titleColor: black.third,
        },
    ];

    /**
     * 處理所有課程 Menu 共用的查詢選項。
     *
     * @param {string} actionId Menu action id
     * @param {Object} course 課程或課節資料
     * @returns {boolean} 是否已處理
     */
    const handleCourseInfoMenuAction = (actionId, course) => {
        const courseCode = course['Course Code'];
        const profName = course['Teacher Information'];

        switch (actionId) {
            case 'wiki': {
                let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
                if (profName) {
                    URL = ARK_WIKI_SEARCH + encodeURIComponent(profName);
                    logToFirebase('checkCourse', {
                        courseCode,
                        profName,
                        action: 'ark-wiki',
                    });
                } else {
                    logToFirebase('checkCourse', {
                        courseCode,
                        action: 'ark-wiki',
                    });
                }
                openLink(URL);
                return true;
            }
            case 'what2reg': {
                const URI =
                    getCurrentUmehHost() +
                    '/reviews/' +
                    encodeURIComponent(courseCode) +
                    '/' +
                    encodeURIComponent(lodash.deburr(profName || ''));
                openLink(URI);
                return true;
            }
            case 'official':
                openLink(OFFICIAL_COURSE_SEARCH + courseCode);
                return true;
            case 'section':
                navigation.navigate('LocalCourse', courseCode);
                return true;
            default:
                return false;
        }
    };

    // 渲染一列（一天）的課表
    const renderDay = day => {
        // 獲取該天所有的課程數據
        let dayCourseList = planSlots.filter(course => course.Day === day);

        if (dayCourseList.length > 0) {
            // 按上課時間Time From排序
            dayCourseList = dayCourseList.sort((a, b) => {
                return toDateTime(a['Time From']) - toDateTime(b['Time From']);
            });

            // 例如今天星期五，FRI
            // 用於高亮當天的Day文字
            let todayText = moment()
                .format('dddd')
                .substring(0, 3)
                .toUpperCase();

            return (
                <View
                    key={day}
                    style={{
                        width: DAY_COLUMN_WIDTH,
                        marginBottom:
                            dayCourseList.length < 4
                                ? (4 - dayCourseList.length) * scale(140)
                                : null,
                    }}>
                    {/* 星期幾 */}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: todayText === day ? themeColor : black.third,
                            fontSize: scale(25),
                            fontWeight: 'bold',
                            alignSelf: 'center',
                        }}>
                        {day}
                    </Text>

                    {/* 渲染單一課程卡片 */}
                    <View style={{ flexDirection: 'column' }}>
                        {dayCourseList.map((course, idx) =>
                            renderCourse(course, dayCourseList, idx),
                        )}
                    </View>
                </View>
            );
        }

        return null;
    };

    /**
     * 渲染單個課表卡片
     *
     * @param {Object} course 單個課程對象，包含Course Code, Section, Time From, Time To等信息
     *
     * @param {Array} dayCourseList 當天的所有課程列表，用於計算休息時間
     *
     * @param {number} idx 當天課程列表中的索引，用於計算時間差
     */
    const renderCourse = (course, dayCourseList, idx) => {
        let timeDiffReminder = null;
        let afternoonReminder = null;
        // 衝突判斷交給共享層：同一天兩兩配對比較，能抓到被中間課節隔開的跨越式重疊
        const timeWarning = conflictSlotKeys.has(getSlotKey(course));

        if (timeWarning) {
            timeDiffReminder = (
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        alignSelf: 'center',
                        color: unread,
                        fontWeight: 'bold',
                        textAlign: 'center',
                    }}>
                    {'🆘' + t('課程衝突', { ns: 'timetable' }) + '🆘'}
                </Text>
            );
        } else if (idx > 0) {
            // 未衝突才有休息時間可言，負數間隔一律由上面的衝突提示接手
            const lastEnd = moment(dayCourseList[idx - 1]['Time To'], 'HH:mm');
            const courseBegin = moment(course['Time From'], 'HH:mm');
            const minuteDiff = courseBegin.diff(lastEnd, 'minutes');
            const hourDiff = (minuteDiff / 60).toFixed(2);

            timeDiffReminder = (
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        alignSelf: 'center',
                        color: black.third,
                        textAlign: 'center',
                    }}>
                    {t('休息', { ns: 'timetable' })}
                    <Text
                        style={{
                            fontWeight: 'bold',
                            color: themeColor,
                        }}>
                        {hourDiff >= 1 ? `${hourDiff}` : `${minuteDiff}`}
                    </Text>
                    {hourDiff >= 1
                        ? t('小時後', { ns: 'timetable' })
                        : t('分鐘後', { ns: 'timetable' })}
                </Text>
            );
        }

        // 判斷是否下午
        let timeHH = moment(course['Time From'], 'HH').format('HH');
        let timeReminderText = null;
        timeReminderText =
            timeHH > 12
                ? timeHH >= 18
                    ? `🌜${t('晚上', { ns: 'timetable' })}🌛`
                    : `☕️${t('下午', { ns: 'timetable' })}☕️`
                : null;

        if (timeHH > 12 && dayCourseList.length > 1 && idx > 0) {
            let preTimeHH = moment(
                dayCourseList[idx - 1]['Time From'],
                'HH',
            ).format('HH');
            if (preTimeHH >= 18 && timeHH >= 18) {
                timeReminderText = null;
            }
            if (preTimeHH > 12 && preTimeHH < 18 && timeHH < 18) {
                timeReminderText = null;
            }
        }

        afternoonReminder = timeReminderText ? (
            <Text
                style={{
                    ...uiStyle.defaultText,
                    alignSelf: 'center',
                    textAlign: 'center',
                    color: black.third,
                    fontWeight: 'bold',
                    fontSize:
                        i18n.resolvedLanguage == 'en' ? scale(18) : scale(20),
                }}>
                {timeReminderText}
            </Text>
        ) : null;

        const hasDuplicate =
            lodash.countBy(planList, 'Course Code')[course['Course Code']] > 1;
        const courseMenuActions = [
            ...getCourseInfoMenuActions(),
            {
                id: 'replacement',
                title: t('查看平替', { ns: 'timetable' }),
                image: Platform.select({
                    ios: 'arrow.triangle.2.circlepath',
                    android: 'ic_menu_rotate',
                }),
                imageColor: themeColor,
                titleColor: themeColor,
            },
            ...(hasDuplicate
                ? [
                    {
                        id: 'del-all-sections',
                        title: `${t('刪除所有', { ns: 'timetable' })} ${course['Course Code']}`,
                        image: Platform.select({
                            ios: 'trash',
                            android: 'ic_menu_delete',
                        }),
                        // iOS 26 液態玻璃選單中，destructive 項的模板圖示不會自動渲染，
                        // 故顯式指定紅色 imageColor 以 alwaysOriginal 模式強制顯示垃圾桶。
                        imageColor: unread,
                        attributes: { destructive: true },
                    },
                ]
                : []),
            {
                id: 'drop-section',
                title: `${t('刪除', { ns: 'timetable' })} ${course['Course Code']}-${course.Section}`,
                image: Platform.select({
                    ios: 'trash',
                    android: 'ic_menu_delete',
                }),
                // iOS 26 液態玻璃選單中，destructive 項的模板圖示不會自動渲染，
                // 故顯式指定紅色 imageColor 以 alwaysOriginal 模式強制顯示垃圾桶。
                imageColor: unread,
                attributes: { destructive: true },
            },
        ];

        const handleCourseMenuOpen = () => {
            trigger('rigid');
            if (hasOpenCourseSearch) {
                bottomSheetRef?.current?.snapToIndex(0);
            }
        };

        const handleCourseMenuAction = event => {
            trigger();
            const actionId = event.nativeEvent.event;
            if (handleCourseInfoMenuAction(actionId, course)) {
                return;
            }

            switch (actionId) {
                case 'replacement':
                    openReplacementSearch(course);
                    break;
                case 'del-all-sections':
                    Alert.alert(
                        '',
                        t('刪除所有Section確認', {
                            ns: 'timetable',
                            code: course['Course Code'],
                        }),
                        [
                            {
                                text: 'No',
                                style: 'cancel',
                            },
                            {
                                text: 'Yes',
                                onPress: () => {
                                    trigger();
                                    dropAllSections(course['Course Code']);
                                    verScroll.current?.scrollTo({ y: 0 });
                                },
                                style: 'destructive',
                            },
                        ],
                        { cancelable: true },
                    );
                    break;
                case 'drop-section':
                    Alert.alert(
                        t('刪除Section確認', {
                            ns: 'timetable',
                            code: course['Course Code'],
                            section: course.Section,
                        }),
                        `還會再見嗎燕子，再見的時候你要PASS！`,
                        [
                            {
                                text: t('取消', { ns: 'timetable' }),
                                style: 'cancel',
                            },
                            {
                                text: 'Drop',
                                onPress: () => handleDropCourse(course),
                                style: 'destructive',
                            },
                        ],
                        { cancelable: true },
                    );
                    break;
                default:
                    break;
            }
        };

        return (
            <View
                key={`${course.Day}-${course['Course Code']}-${course.Section}-${course['Time From']}-${course['Time To']}`}>
                {afternoonReminder}
                {timeDiffReminder}

                <TimetableCourseMenuCard
                    actions={courseMenuActions}
                    onPressAction={handleCourseMenuAction}
                    onPress={handleCourseMenuOpen}
                    backgroundColor={
                        timeWarning
                            ? unread
                            : TIME_TABLE_COLOR[
                            lodash.indexOf(
                                planCourseCodes,
                                course['Course Code'],
                            ) % TIME_TABLE_COLOR.length
                            ]
                    }>
                    {/* 課號 */}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            opacity: 0.7,
                            fontSize: scale(20),
                            textAlign: 'center',
                            fontWeight: '700',
                        }}>
                        {course['Course Code'].substring(0, 4) + '\n'}
                        <Text
                            style={{
                                fontSize: scale(20),
                                fontWeight: 'bold',
                            }}>
                            {course['Course Code'].substring(4, 8)}
                        </Text>
                    </Text>

                    {/* Section */}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            opacity: 0.8,
                        }}>
                        {course.Section}
                    </Text>

                    {/* 課程名稱 */}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            textAlign: 'center',
                            opacity: 0.4,
                        }}
                        numberOfLines={4}>
                        {course['Course Title']}
                    </Text>

                    {/* 教室 */}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            fontWeight: 'bold',
                            opacity: 0.5,
                        }}>
                        {course.Classroom}
                    </Text>

                    {/* 上課時間 */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignSelf: 'stretch',
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.main,
                                fontWeight: '600',
                                opacity: 0.8,
                            }}>
                            {course['Time From']}
                        </Text>
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={scale(20)}
                            color={black.main}
                            style={{ opacity: 0.4 }}
                        />
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.main,
                                fontWeight: '600',
                                opacity: 0.8,
                            }}>
                            {course['Time To']}
                        </Text>
                    </View>
                </TimetableCourseMenuCard>
            </View>
        );
    };

    /** 開啟加課 sheet；空課表時直接展開到最大，讓搜尋結果一次看完 */
    const openCourseSearch = () => {
        if (Keyboard.isVisible()) {
            Keyboard.dismiss();
        }

        setBottomSheetMode('search');
        setReplacementTarget(null);
        setReplacementCourseCode(null);
        setReplacementSearchText('');

        if (planSlots.length > 0) {
            bottomSheetRef.current?.snapToIndex(1);
        } else {
            bottomSheetRef.current?.expand();
        }

        setHasOpenCourseSearch(true);
        verScroll.current?.scrollTo({ y: 0 });
    };

    /** 從課程卡片開啟平替課程 sheet。 */
    const openReplacementSearch = course => {
        if (Keyboard.isVisible()) {
            Keyboard.dismiss();
        }

        setBottomSheetMode('replacement');
        setReplacementTarget(course);
        setReplacementCourseCode(null);
        setReplacementSearchText('');
        setHasOpenCourseSearch(true);
        bottomSheetRef.current?.snapToIndex(2);
        verScroll.current?.scrollTo({ y: 0 });

        logToFirebase('checkCourseReplacement', {
            courseCode: course['Course Code'],
            section: course.Section,
            day: course.Day,
        });
    };

    const handleClearPlan = useCallback(() => {
        Alert.alert(
            '',
            t('確定清空當前模擬課表？', { ns: 'timetable' }),
            [
                {
                    text: t('取消', { ns: 'timetable' }),
                    style: 'cancel',
                },
                {
                    text: t('確定清空', { ns: 'timetable' }),
                    onPress: () => {
                        trigger();
                        clearPlan();
                    },
                    style: 'destructive',
                },
            ],
            { cancelable: true },
        );
    }, [clearPlan]);

    const closeCourseSearch = () => {
        trigger();
        if (Keyboard.isVisible()) {
            Keyboard.dismiss();
        }
        bottomSheetRef.current?.close();
    };

    /**
     * 確認後以候選 Section 替換原 Section。
     *
     * @param {Object} courseOption 候選課程
     * @param {Object} sectionOption 候選 Section 與完整課節
     */
    const confirmReplacement = (courseOption, sectionOption) => {
        const courseInfo = sectionOption.slots[0];
        if (!replacementTarget || !courseInfo) {
            return;
        }

        Alert.alert(
            t('替換課程', { ns: 'timetable' }),
            t('替換課程確認', {
                ns: 'timetable',
                fromCode: replacementTarget['Course Code'],
                fromSection: replacementTarget.Section,
                toCode: courseOption['Course Code'],
                toSection: sectionOption.section,
            }),
            [
                {
                    text: t('取消', { ns: 'timetable' }),
                    style: 'cancel',
                },
                {
                    text: t('替換', { ns: 'timetable' }),
                    // 主要確認操作：系統藍（對應危險操作用 destructive 顯示紅色）
                    style: 'default',
                    isPreferred: true,
                    onPress: () => {
                        trigger();
                        commitPlan([
                            ...lodash.filter(
                                planList,
                                item =>
                                    !(
                                        item['Course Code'] ===
                                        replacementTarget['Course Code'] &&
                                        item.Section ===
                                        replacementTarget.Section
                                    ),
                            ),
                            {
                                'Course Code': courseInfo['Course Code'],
                                Section: courseInfo.Section,
                            },
                        ]);
                        Toast.show(
                            t('已替換課程', {
                                ns: 'timetable',
                                fromCode: replacementTarget['Course Code'],
                                toCode: courseOption['Course Code'],
                                section: sectionOption.section,
                            }),
                        );
                        logToFirebase('replaceCourse', {
                            fromCourseCode:
                                replacementTarget['Course Code'],
                            fromSection: replacementTarget.Section,
                            toCourseCode: courseOption['Course Code'],
                            toSection: sectionOption.section,
                        });
                        bottomSheetRef.current?.close();
                    },
                },
            ],
            { cancelable: true },
        );
    };

    /**
     * 空課表引導的一鍵導入。
     * 優先用輸入框文字；若為空則自動讀取剪貼簿（方便用戶只複製、不手動貼上）。
     */
    const importCourseData = async () => {
        trigger();
        Keyboard.dismiss();

        let text = normalizeImportText(importTimeTableText || '').trim();
        if (!text) {
            text = normalizeImportText(
                (await Clipboard.getString()) || '',
            ).trim();
        }

        if (text && text !== importTimeTableText) {
            // 貼上／剪貼簿若出現編碼亂碼，先還原成可讀文字
            setImportTimeTableText(text);
        }

        if (!text) {
            Alert.alert(
                '',
                t('↑記得先粘貼課表數據，再點擊導入哦', { ns: 'timetable' }),
            );
            return;
        }

        if (!importFromISW(text)) {
            Alert.alert('', t('導入格式錯誤', { ns: 'timetable' }));
            return;
        }

        setImportTimeTableText('');
        Toast.show(t('已導入到模擬課表', { ns: 'timetable' }));
    };

    // 渲染首次使用引導頁面
    const renderFirstUse = () => {
        const canImport = importTimeTableText.length > 0;

        return (
            <View
                style={{ paddingHorizontal: scale(16), paddingTop: scale(16) }}>
                {/* 頁面標題 */}
                <Text style={s.guideTitle}>
                    {t('如何開始使用模擬課表？', { ns: 'timetable' })}
                </Text>

                {/* 方法一卡片：手動添加 */}
                <View style={s.methodCard}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: scale(10),
                        }}>
                        <View style={s.stepBadge}>
                            <Text style={s.stepBadgeText}>
                                {t('方法', { ns: 'timetable' })} 1
                            </Text>
                        </View>
                    </View>
                    <View
                        style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons
                            name="add-circle-outline"
                            size={scale(28)}
                            color={themeColor}
                        />
                        <Text style={s.cardDescription}>
                            {t('右下角按鈕手動加課！', { ns: 'timetable' })}
                        </Text>
                    </View>

                    <View style={s.guideDivider} />

                    <TouchableScale
                        style={s.stepButton}
                        onPress={() => {
                            trigger();
                            openCourseSearch();
                        }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                            <Ionicons
                                name="add"
                                size={scale(16)}
                                color={themeColor}
                                style={{ marginRight: scale(6) }}
                            />
                            <Text style={s.stepButtonText}>
                                {t('加課', { ns: 'timetable' })}
                            </Text>
                        </View>
                    </TouchableScale>
                </View>

                {/* 方法二卡片：ISW 導入（保留輸入框，讓用戶知道要複製什麼） */}
                <View style={s.methodCard}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: scale(10),
                        }}>
                        <View style={s.stepBadge}>
                            <Text style={s.stepBadgeText}>
                                {t('方法', { ns: 'timetable' })} 2
                            </Text>
                        </View>
                    </View>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: scale(12),
                        }}>
                        <Ionicons
                            name="clipboard-outline"
                            size={scale(28)}
                            color={themeColor}
                        />
                        <Text style={s.cardDescription}>
                            {`${t('全選、複製Timetable，', { ns: 'timetable' })}\n${t('粘貼到下方輸入框，', { ns: 'timetable' })}${t('一鍵導入！', { ns: 'timetable' })}`}
                        </Text>
                    </View>

                    {/* Step 2.1: 跳轉 ISW；已貼上內容時收起，減少干擾 */}
                    {canImport ? null : (
                        <TouchableScale
                            style={s.stepButton}
                            onPress={() => {
                                trigger();
                                openLink(UM_ISW);
                            }}>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                <Ionicons
                                    name="open-outline"
                                    size={scale(16)}
                                    color={themeColor}
                                    style={{ marginRight: scale(6) }}
                                />
                                <Text style={s.stepButtonText}>
                                    {`2.1 ${t('進入舊ISW複製', { ns: 'timetable' })}`}
                                </Text>
                            </View>
                        </TouchableScale>
                    )}

                    <View style={s.guideDivider} />

                    <Text style={s.inputLabel}>
                        {`2.2 ${t('粘貼課表數據', { ns: 'timetable' })}`}
                    </Text>
                    <TextInput
                        selectTextOnFocus
                        multiline
                        numberOfLines={6}
                        onChangeText={text =>
                            setImportTimeTableText(normalizeImportText(text))
                        }
                        placeholder={`Click here and enter your timetable:
Example：
TimeDay  Mon  Tue  Wed  Thur  Fri  Sat  Sun
9:00  09:00-10:45 ECEN0000(001)
E11-0000
(Lecture)  -  -  09:00-10:45 ...`}
                        placeholderTextColor={black.third}
                        value={importTimeTableText}
                        style={s.guideTextInput}
                        returnKeyType="done"
                        blurOnSubmit
                        onSubmitEditing={importCourseData}
                        clearButtonMode="always"
                    />

                    <Text style={s.inputHint}>
                        {t('↑記得先粘貼課表數據，再點擊導入哦', {
                            ns: 'timetable',
                        })}
                    </Text>

                    {/* 一鍵導入：輸入框有內容直接導入；空則自動讀剪貼簿 */}
                    <TouchableScale
                        style={{
                            ...s.importButton,
                            backgroundColor: canImport
                                ? tonal.success30
                                : tonal.primary30,
                        }}
                        onPress={importCourseData}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                            <Ionicons
                                name="download-outline"
                                size={scale(18)}
                                color={canImport ? success : themeColor}
                                style={{ marginRight: scale(6) }}
                            />
                            <Text
                                style={{
                                    ...s.importButtonText,
                                    color: canImport ? success : themeColor,
                                }}>
                                {t('一鍵導入到模擬課表', { ns: 'timetable' })}
                            </Text>
                        </View>
                    </TouchableScale>
                </View>

                {/* 聯絡資訊與致敬 */}
                <View
                    style={{
                        alignItems: 'center',
                        marginTop: scale(20),
                        marginBottom: scale(30),
                    }}>
                    <Text style={s.footerText}>
                        {'如有問題，立即聯繫 umacark@gmail.com'}
                    </Text>
                    <Text style={{ ...s.footerText, marginTop: scale(8) }}>
                        {
                            '靈感源自 kchomacau, Raywong 前輩的\n"課表模擬"開源倉庫！'
                        }
                    </Text>
                </View>
            </View>
        );
    };

    const renderDayFilter = () => {
        return (
            <View
                style={{
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
                                backgroundColor: isSelected
                                    ? secondThemeColor
                                    : white,
                                borderWidth: scale(1),
                                borderColor: isSelected
                                    ? secondThemeColor
                                    : themeColor,
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
                            }}>
                            <Text
                                style={{
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
        const timeButton = mode => {
            let backgroundColor = null;
            let textColor = black.third;

            if (mode === 'from') {
                backgroundColor =
                    timeFilterFrom === timeFrom ? null : themeColor;
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
                    }}>
                    <Text style={{ ...uiStyle.defaultText, color: textColor }}>
                        {mode === 'from' ? timeFilterFrom : timeFilterTo}
                    </Text>
                </TouchableOpacity>
            );
        };

        return (
            <View
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                }}>
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
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: themeColor,
                            }}>
                            Clear
                        </Text>
                    </TouchableOpacity>
                )}

                {/* 時間選項 */}
                {timeButton('from')}
                <Text style={{ ...uiStyle.defaultText, color: black.third }}>
                    {' - '}
                </Text>
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
                    onConfirm={date => {
                        const formattedTime = moment(date).format('HH:mm');
                        if (timePickerMode === 'from') {
                            if (
                                moment(date).isSameOrAfter(
                                    moment(timeFilterTo, 'HH:mm'),
                                )
                            ) {
                                Alert.alert(
                                    t('開始時間不能晚於結束時間！', {
                                        ns: 'timetable',
                                    }),
                                );
                                return;
                            }
                            setTimeFilterFrom(formattedTime);
                        } else {
                            if (
                                moment(date).isSameOrBefore(
                                    moment(timeFilterFrom, 'HH:mm'),
                                )
                            ) {
                                Alert.alert(
                                    t('結束時間不能早於開始時間！', {
                                        ns: 'timetable',
                                    }),
                                );
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
     * 一般加課與查看平替共用的 BottomSheet 搜索列。
     *
     * @param {Object} options 搜索列設定
     * @returns {React.ReactElement} 搜索列
     */
    const renderBottomSheetSearchBar = ({
        inputRef,
        value,
        onChangeText,
        placeholder,
        showBack = false,
        onBackPress,
        showClose = true,
    }) => (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
            }}>
            <View
                style={{
                    flex: 1,
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
                    style={{
                        opacity: 0.4,
                        position: 'absolute',
                        left: scale(10),
                    }}
                />
                {showBack ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('返回', {
                            ns: 'timetable',
                        })}
                        style={({ pressed }) => ({
                            borderWidth: scale(1),
                            borderRadius: scale(5),
                            borderColor: themeColor,
                            backgroundColor: pressed
                                ? tonal.primary30
                                : white,
                            padding: scale(3),
                            position: 'absolute',
                            left: scale(40),
                            zIndex: 999,
                        })}
                        onPress={() => {
                            trigger();
                            onBackPress?.();
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: themeColor,
                            }}>
                            {t('返回', { ns: 'timetable' })}
                        </Text>
                    </Pressable>
                ) : null}
                <BottomSheetTextInput
                    ref={inputRef}
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
                    onChangeText={onChangeText}
                    value={value}
                    selectTextOnFocus
                    placeholder={placeholder}
                    placeholderTextColor={black.third}
                    returnKeyType="search"
                    selectionColor={themeColor}
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                    clearButtonMode="always"
                    autoCapitalize="characters"
                />
            </View>
            {showClose ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('取消', {
                        ns: 'timetable',
                    })}
                    hitSlop={scale(8)}
                    style={({ pressed }) => ({
                        marginLeft: scale(8),
                        backgroundColor: pressed
                            ? tonal.primary30
                            : tonal.primary15,
                        borderRadius: scale(8),
                        padding: scale(6),
                    })}
                    onPress={closeCourseSearch}>
                    <Ionicons
                        name="close"
                        size={scale(18)}
                        color={themeColor}
                    />
                </Pressable>
            ) : null}
        </View>
    );

    /** 渲染由課程卡片開啟的平替課程列表。 */
    const renderReplacementSearch = () => {
        const filteredCourses = replacementSearchText.trim()
            ? replacementResult.courses.filter(course =>
                courseMatchesSearch(course, replacementSearchText),
            )
            : replacementResult.courses;
        const selectedCourse = replacementResult.courses.find(
            item => item['Course Code'] === replacementCourseCode,
        );
        const listData = selectedCourse
            ? selectedCourse.sections
            : filteredCourses;

        const renderReplacementItem = ({ item }) => {
            if (!selectedCourse) {
                return (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${item['Course Code']} ${t('個可選Section', {
                            ns: 'timetable',
                            count: item.sections.length,
                        })}`}
                        style={({ pressed }) => [
                            s.courseCard,
                            {
                                marginHorizontal: scale(10),
                                padding: scale(12),
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}
                        onPress={() => {
                            trigger();
                            setReplacementCourseCode(item['Course Code']);
                        }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                            <View style={{ flex: 1 }}>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        color: themeColor,
                                        fontSize: scale(16),
                                        fontWeight: 'bold',
                                    }}>
                                    {item['Course Code']}
                                </Text>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        color: black.second,
                                        fontSize: scale(13),
                                    }}>
                                    {item['Course Title']}
                                </Text>
                                {item['Course Title Chi'] ? (
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            color: black.third,
                                            fontSize: scale(12),
                                        }}>
                                        {item['Course Title Chi']}
                                    </Text>
                                ) : null}
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        color: themeColor,
                                        fontSize: scale(12),
                                        marginTop: verticalScale(4),
                                    }}>
                                    {t('個可選Section', {
                                        ns: 'timetable',
                                        count: item.sections.length,
                                    })}
                                </Text>
                            </View>
                            <Ionicons
                                name="chevron-forward"
                                color={black.third}
                                size={scale(18)}
                            />
                        </View>
                    </Pressable>
                );
            }

            const sortedSlots = daySort(item.slots);
            const courseInfo = item.slots[0];
            const replacementMenuActions = [
                ...getCourseInfoMenuActions(),
                {
                    id: 'replace-course',
                    title: `${t('替換', { ns: 'timetable' })} ${selectedCourse['Course Code']}-${item.section}`,
                    image: Platform.select({
                        ios: 'arrow.left.arrow.right',
                        android: 'ic_menu_rotate',
                    }),
                    imageColor: themeColor,
                    titleColor: themeColor,
                },
            ];

            return (
                <CourseActionMenuCard
                    accessibilityLabel={`${selectedCourse['Course Code']}-${item.section}`}
                    actions={replacementMenuActions}
                    onOpen={() => trigger('rigid')}
                    onPressAction={event => {
                        trigger();
                        const actionId = event.nativeEvent.event;
                        if (handleCourseInfoMenuAction(actionId, courseInfo)) {
                            return;
                        }
                        if (actionId === 'replace-course') {
                            confirmReplacement(selectedCourse, item);
                        }
                    }}
                    menuStyle={{
                        alignSelf: 'stretch',
                        marginHorizontal: scale(10),
                        marginVertical: scale(3),
                    }}
                    cardStyle={[
                        s.courseCard,
                        {
                            margin: 0,
                            padding: scale(12),
                            backgroundColor: tonal.primary15,
                        },
                    ]}>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                        }}>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: themeColor,
                                    fontSize: scale(16),
                                    fontWeight: 'bold',
                                }}>
                                {`${selectedCourse['Course Code']}-${item.section}`}
                            </Text>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: black.second,
                                    fontSize: scale(13),
                                    marginBottom: verticalScale(4),
                                }}>
                                {item.slots[0]?.['Teacher Information']}
                            </Text>
                            {sortedSlots.map(slot => (
                                <Text
                                    key={getSlotKey(slot)}
                                    style={{
                                        ...uiStyle.defaultText,
                                        color:
                                            slot.Day ===
                                                replacementResult.window?.day
                                                ? themeColor
                                                : black.third,
                                        fontSize: scale(12),
                                        fontWeight:
                                            slot.Day ===
                                                replacementResult.window?.day
                                                ? 'bold'
                                                : 'normal',
                                    }}>
                                    {`${slot.Day} ${slot['Time From']} ~ ${slot['Time To']}`}
                                </Text>
                            ))}
                        </View>
                        <Ionicons
                            name="swap-horizontal"
                            color={themeColor}
                            size={scale(20)}
                        />
                    </View>
                </CourseActionMenuCard>
            );
        };

        return (
            <View style={{ width: '100%', height: '100%' }}>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: scale(10),
                        paddingBottom: verticalScale(8),
                    }}>
                    {selectedCourse ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('返回平替課程', {
                                ns: 'timetable',
                            })}
                            hitSlop={scale(8)}
                            style={({ pressed }) => ({
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                                borderRadius: scale(8),
                                padding: scale(7),
                            })}
                            onPress={() => {
                                trigger();
                                setReplacementCourseCode(null);
                            }}>
                            <Ionicons
                                name="chevron-back"
                                size={scale(18)}
                                color={themeColor}
                            />
                        </Pressable>
                    ) : null}

                    <View
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            paddingHorizontal: scale(8),
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.main,
                                fontSize: scale(16),
                                fontWeight: 'bold',
                                textAlign: 'center',
                            }}>
                            {selectedCourse
                                ? selectedCourse['Course Code']
                                : t('查看平替', { ns: 'timetable' })}
                        </Text>
                        {replacementTarget && replacementResult.window ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: black.third,
                                    fontSize: scale(11),
                                    textAlign: 'center',
                                }}>
                                {`${replacementTarget['Course Code']}-${replacementTarget.Section} · ${replacementResult.window.day} ${replacementResult.window.from} ~ ${replacementResult.window.to}`}
                            </Text>
                        ) : null}
                    </View>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('取消', {
                            ns: 'timetable',
                        })}
                        hitSlop={scale(8)}
                        style={({ pressed }) => ({
                            backgroundColor: pressed
                                ? tonal.primary30
                                : tonal.primary15,
                            borderRadius: scale(8),
                            padding: scale(7),
                        })}
                        onPress={closeCourseSearch}>
                        <Ionicons
                            name="close"
                            size={scale(18)}
                            color={themeColor}
                        />
                    </Pressable>
                </View>

                {!selectedCourse ? (
                    <View
                        style={{
                            paddingHorizontal: scale(10),
                            paddingBottom: verticalScale(8),
                        }}>
                        {renderBottomSheetSearchBar({
                            value: replacementSearchText,
                            onChangeText: setReplacementSearchText,
                            placeholder: t('搜索平替課程', {
                                ns: 'timetable',
                            }),
                            showClose: false,
                        })}
                    </View>
                ) : null}

                <FlashList
                    key={
                        selectedCourse
                            ? `replacement-${selectedCourse['Course Code']}`
                            : 'replacement-courses'
                    }
                    data={listData}
                    keyExtractor={item =>
                        selectedCourse
                            ? item.section
                            : item['Course Code']
                    }
                    renderItem={renderReplacementItem}
                    renderScrollComponent={replacementListScrollable}
                    contentContainerStyle={{
                        paddingBottom: tabBarHeight + verticalScale(30),
                    }}
                    ListEmptyComponent={
                        <View
                            style={{
                                paddingHorizontal: scale(24),
                                paddingVertical: verticalScale(30),
                            }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: black.third,
                                    fontSize: scale(13),
                                    textAlign: 'center',
                                }}>
                                {replacementSearchText.trim()
                                    ? t('沒有符合搜索的平替課程', {
                                        ns: 'timetable',
                                    })
                                    : t('沒有可用的平替課程', {
                                        ns: 'timetable',
                                    })}
                            </Text>
                        </View>
                    }
                />
            </View>
        );
    };

    /**
     * 渲染課程搜索界面
     */
    const renderCourseSearch = () => {
        const filterCourseList = searchText
            ? handleSearchFilterCourse(searchText)
            : [];
        const haveSearchResult = searchText && filterCourseList.length > 0;

        // 整理所有候選課程的 Section
        const courseCodeObj = {};
        if (haveSearchResult) {
            filterCourseList.forEach(i => {
                const codeRes = courseTimeList.filter(itm =>
                    itm['Course Code']
                        .toUpperCase()
                        .includes(i['Course Code'].toUpperCase()),
                );
                const sectionObj = lodash.groupBy(codeRes, 'Section');
                courseCodeObj[i['Course Code']] = sectionObj;
            });
        }

        return (
            <View style={{ width: '100%', padding: scale(10) }}>
                {/* 搜索列：輸入框 + 右側關閉（FAB 被 sheet 蓋住時的關閉入口） */}
                {renderBottomSheetSearchBar({
                    inputRef: textSearchRef,
                    value: searchText,
                    onChangeText: text => {
                        setSearchText(text);
                        if (text.length === 0) {
                            setPerSearchText(null);
                        }
                    },
                    placeholder: t('搜索課程：ECE, 電氣, AIM...', {
                        ns: 'timetable',
                    }),
                    showBack: Boolean(perSearchText),
                    onBackPress: () => {
                        setSearchText(perSearchText);
                        setPerSearchText(null);
                    },
                })}

                <BottomSheetScrollView
                    contentContainerStyle={{ paddingBottom: tabBarHeight }}>
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
                            style={{
                                marginTop: scale(5),
                                marginLeft: scale(10),
                            }}
                            renderItem={({ item }) => {
                                const sectionObj =
                                    courseCodeObj[item['Course Code']];
                                let dayInFilter = true;

                                if (dayFilterChoice) {
                                    dayInFilter = lodash.some(
                                        Object.keys(sectionObj),
                                        key => {
                                            const timeInFilter = lodash.some(
                                                sectionObj[key],
                                                course => {
                                                    const courseStart = moment(
                                                        course['Time From'],
                                                        'HH:mm',
                                                    );
                                                    const courseEnd = moment(
                                                        course['Time To'],
                                                        'HH:mm',
                                                    );
                                                    const filterStart = moment(
                                                        timeFilterFrom,
                                                        'HH:mm',
                                                    );
                                                    const filterEnd = moment(
                                                        timeFilterTo,
                                                        'HH:mm',
                                                    );
                                                    return (
                                                        courseStart.isBefore(
                                                            filterEnd,
                                                        ) &&
                                                        courseEnd.isAfter(
                                                            filterStart,
                                                        )
                                                    );
                                                },
                                            );
                                            return (
                                                timeInFilter &&
                                                sectionObj[key].some(
                                                    course =>
                                                        course.Day ===
                                                        dayFilterChoice,
                                                )
                                            );
                                        },
                                    );
                                }

                                if (!dayInFilter) {
                                    return null;
                                }

                                return (
                                    <TouchableOpacity
                                        style={s.courseCard}
                                        onPress={() => {
                                            trigger();
                                            setPerSearchText(searchText);
                                            setSearchText(item['Course Code']);
                                            verScroll.current?.scrollTo({
                                                y: 0,
                                            });
                                        }}>
                                        <Text
                                            style={{
                                                ...s.searchResultText,
                                                fontSize: scale(15),
                                                color: black.third,
                                                fontWeight: 'bold',
                                            }}>
                                            {item['Course Code']}
                                        </Text>
                                        <Text style={s.searchResultText}>
                                            {item['Course Title']}
                                        </Text>
                                        <Text style={s.searchResultText}>
                                            {item['Course Title Chi']}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            }}
                            ListFooterComponent={
                                <View
                                    style={{ marginBottom: verticalScale(50) }}
                                />
                            }
                        />
                    )}

                    {/* 單一課程詳細 Section 顯示 */}
                    {haveSearchResult &&
                        filterCourseList.length === 1 &&
                        filterCourseList.map(i => {
                            const sectionObj = courseCodeObj[i['Course Code']];
                            return (
                                <View
                                    style={{
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '100%',
                                    }}>
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
                                            dropAllSections(i['Course Code']);
                                            verScroll.current?.scrollTo({
                                                y: 0,
                                            });
                                        }}>
                                        <Text
                                            style={{
                                                ...s.searchResultText,
                                                color: unread,
                                                fontWeight: 'bold',
                                            }}>
                                            {`${t('刪除所有', { ns: 'timetable' })} ${i['Course Code']}`}
                                        </Text>
                                    </TouchableOpacity>

                                    <Text
                                        style={{
                                            ...s.searchResultText,
                                            fontWeight: 'bold',
                                        }}>{`↓ ${t('全部放入課表', { ns: 'timetable' })}`}</Text>

                                    <TouchableOpacity
                                        style={s.courseCard}
                                        onPress={() => {
                                            trigger();
                                            bottomSheetRef.current?.snapToIndex(
                                                0,
                                            );
                                            addAllSections(
                                                i['Course Code'],
                                                sectionObj,
                                            );
                                            setSearchText(i['Course Code']);
                                            verScroll.current?.scrollTo({
                                                y: 0,
                                            });
                                        }}>
                                        <Text
                                            style={{
                                                ...s.searchResultText,
                                                fontSize: scale(15),
                                                color: themeColor,
                                                fontWeight: 'bold',
                                            }}>
                                            {i['Course Code']}
                                        </Text>
                                        <Text style={s.searchResultText}>
                                            {i['Course Title']}
                                        </Text>
                                        <Text style={s.searchResultText}>
                                            {i['Course Title Chi']}
                                        </Text>
                                    </TouchableOpacity>

                                    <Text
                                        style={{
                                            ...s.searchResultText,
                                            fontWeight: 'bold',
                                        }}>{`↓ ${t('選取單節', { ns: 'timetable' })}`}</Text>
                                    <BottomSheetFlatList
                                        data={Object.keys(sectionObj)}
                                        style={{
                                            marginTop: scale(5),
                                            width: '100%',
                                        }}
                                        numColumns={
                                            Object.keys(sectionObj).length
                                        }
                                        key={`${searchText || 'single'}-sections-${Object.keys(sectionObj).length}`}
                                        columnWrapperStyle={
                                            Object.keys(sectionObj).length > 1
                                                ? {
                                                    flexWrap: 'wrap',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }
                                                : null
                                        }
                                        renderItem={({ item: sectionKey }) => {
                                            const courseInfo =
                                                sectionObj[sectionKey][0];
                                            const sortedSection = daySort(
                                                sectionObj[sectionKey],
                                            );

                                            let dayInFilter = true;
                                            if (dayFilterChoice) {
                                                if (
                                                    timeFilterFrom !==
                                                    timeFrom ||
                                                    timeFilterTo !== timeTo
                                                ) {
                                                    const filterStart = moment(
                                                        timeFilterFrom,
                                                        'HH:mm',
                                                    );
                                                    const filterEnd = moment(
                                                        timeFilterTo,
                                                        'HH:mm',
                                                    );
                                                    dayInFilter =
                                                        sortedSection.some(
                                                            course =>
                                                                course.Day ===
                                                                dayFilterChoice &&
                                                                (moment(
                                                                    course[
                                                                    'Time From'
                                                                    ],
                                                                    'HH:mm',
                                                                ).isBetween(
                                                                    filterStart,
                                                                    filterEnd,
                                                                    null,
                                                                    '[]',
                                                                ) ||
                                                                    moment(
                                                                        course[
                                                                        'Time To'
                                                                        ],
                                                                        'HH:mm',
                                                                    ).isBetween(
                                                                        filterStart,
                                                                        filterEnd,
                                                                        null,
                                                                        '[]',
                                                                    )),
                                                        );
                                                } else {
                                                    dayInFilter =
                                                        sortedSection.some(
                                                            course =>
                                                                course.Day ===
                                                                dayFilterChoice,
                                                        );
                                                }
                                            }

                                            if (!dayInFilter) {
                                                return null;
                                            }

                                            return (
                                                <TouchableOpacity
                                                    style={{
                                                        ...s.courseCard,
                                                        width: '45%',
                                                    }}
                                                    onPress={() => {
                                                        trigger();
                                                        addCourse(courseInfo);
                                                        bottomSheetRef.current?.snapToIndex(
                                                            0,
                                                        );
                                                    }}>
                                                    {(courseInfo[
                                                        'Course Code'
                                                    ] === 'CPED1001' ||
                                                        courseInfo[
                                                        'Course Code'
                                                        ] === 'CPED1002') && (
                                                            <>
                                                                <Text
                                                                    style={
                                                                        s.searchResultText
                                                                    }>
                                                                    {
                                                                        courseInfo[
                                                                        'Course Title'
                                                                        ]
                                                                    }
                                                                </Text>
                                                                <Text
                                                                    style={
                                                                        s.searchResultText
                                                                    }>
                                                                    {
                                                                        courseInfo[
                                                                        'Course Title Chi'
                                                                        ]
                                                                    }
                                                                </Text>
                                                            </>
                                                        )}
                                                    <Text
                                                        style={{
                                                            ...s.searchResultText,
                                                            color: themeColor,
                                                            fontSize: scale(15),
                                                            fontWeight: 'bold',
                                                        }}>
                                                        {sectionKey}
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            ...s.searchResultText,
                                                            color: themeColor,
                                                        }}>
                                                        {
                                                            courseInfo[
                                                            'Teacher Information'
                                                            ]
                                                        }
                                                    </Text>
                                                    {sortedSection.map(itm => (
                                                        <Text
                                                            style={
                                                                s.searchResultText
                                                            }>
                                                            {`${itm.Day} ${itm['Time From']} ~ ${itm['Time To']}`}
                                                        </Text>
                                                    ))}
                                                </TouchableOpacity>
                                            );
                                        }}
                                        ListFooterComponent={
                                            <View
                                                style={{
                                                    marginBottom:
                                                        verticalScale(50),
                                                }}
                                            />
                                        }
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
     * 一般加課與平替列表共用的課程文字匹配。
     *
     * @param {Object} course 課程摘要
     * @param {string} inputText 搜索文字
     * @returns {boolean} 是否符合搜索
     */
    function courseMatchesSearch(course, inputText) {
        const normalizedText = inputText?.trim();
        if (!normalizedText) {
            return true;
        }

        const upperInputText = normalizedText.toUpperCase();
        const traditionalInputText = converter(normalizedText);

        return (
            String(course?.['Course Code'] || '')
                .toUpperCase()
                .includes(upperInputText) ||
            String(course?.['Course Title'] || '')
                .toUpperCase()
                .includes(upperInputText) ||
            String(course?.['Course Title Chi'] || '').includes(
                normalizedText,
            ) ||
            String(course?.['Course Title Chi'] || '').includes(
                traditionalInputText,
            ) ||
            String(course?.['Teacher Information'] || '')
                .toUpperCase()
                .includes(upperInputText) ||
            String(course?.['Offering Department'] || '')
                .toUpperCase()
                .includes(upperInputText)
        );
    }

    /**
     * 返回搜索候選所需的課程列表
     *
     * @param {string} inputText - 用戶輸入的搜索文本
     *
     * @returns {Array} - 符合搜索條件的課程列表
     */
    function handleSearchFilterCourse(inputText) {
        return lodash.filter(coursePlanList, course =>
            courseMatchesSearch(course, inputText),
        );
    }

    const renderReminder = () => {
        return (
            <View
                style={{
                    width: '100%',
                    alignItems: 'center',
                    marginBottom: scale(5),
                }}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: verticalScale(10),
                        color: black.third,
                        textAlign: 'center',
                    }}>
                    Timetable Version:{' '}
                    {courseVersion.adddrop.updateTime}
                </Text>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: verticalScale(10),
                        color: black.third,
                        textAlign: 'center',
                    }}>
                    {t('僅作模擬!', { ns: 'timetable' })}
                </Text>
            </View>
        );
    };

    return (
        // 頂欄由 course/index.js 容器統一提供；頂部 insets 亦在容器處理，此處不可重複扣一次
        <View
            style={{
                flex: 1,
                backgroundColor: bg_color,
            }}>
            <ScrollView
                ref={verScroll}
                keyboardDismissMode="on-drag"
                contentInsetAdjustmentBehavior="never"
                contentContainerStyle={{ paddingBottom: tabBarHeight }}>
                {/* 渲染課表或首次使用提示 */}
                <View style={{ flex: 1 }}>
                    {planSlots.length > 0 ? (
                        <>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}>
                                {dayList.map(day => renderDay(day))}
                            </ScrollView>
                            {renderReminder()}
                        </>
                    ) : (
                        renderFirstUse()
                    )}
                </View>
            </ScrollView>

            {/* sheet 展開時淡出 FAB；關閉動畫開始即淡入，避免等 onClose 才突然出現 */}
            <AddCourseFab
                bottom={tabBarHeight + verticalScale(10)}
                visible={!hasOpenCourseSearch}
                onAddPress={openCourseSearch}
                onSearchPress={() =>
                    navigation.navigate(COURSE_SEARCH_SEGMENT)
                }
                onClearPress={handleClearPlan}
                canClear={planList.length > 0}
            />

            <CustomBottomSheet
                ref={bottomSheetRef}
                page={'courseSim'}
                onAnimate={(fromIndex, toIndex) => {
                    // 開始關閉時即顯示 FAB，與 sheet 下滑並行淡入
                    if (toIndex === -1 && hasOpenCourseSearch) {
                        setHasOpenCourseSearch(false);
                    }
                }}
                setHasOpenFalse={() => {
                    if (hasOpenCourseSearch) {
                        setHasOpenCourseSearch(false);
                    }
                    setReplacementCourseCode(null);
                }}>
                {bottomSheetMode === 'replacement'
                    ? renderReplacementSearch()
                    : renderCourseSearch()}
            </CustomBottomSheet>
        </View>
    );
}

export default CourseSim;
