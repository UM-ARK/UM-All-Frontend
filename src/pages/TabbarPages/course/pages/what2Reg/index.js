import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Platform, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';
import { useNavigation } from '@react-navigation/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from 'i18next';
import lodash from 'lodash';

import Text from '../../../../../components/AppText';
import { useTheme, uiStyle } from '../../../../../components/ThemeContext';
import { trigger } from '../../../../../utils/trigger';
import { logToFirebase } from '../../../../../utils/firebaseAnalytics';
import { openLink } from '../../../../../utils/browser';
import { getLocalStorage, setLocalStorage } from '../../../../../utils/storageKits';
import { USER_AGREE, ARK_WIKI_SEARCH, OFFICIAL_COURSE_SEARCH } from '../../../../../utils/pathMap';
import { refreshUmehHost, useUmehHost } from '../../../../../utils/umehHost';
import { COURSE_TIMETABLE_SEGMENT } from '../../../../../utils/courseNavigation';
import { useCoursePlan } from '../../context/CoursePlanContext';
import PlanCapsule from '../../components/PlanCapsule';

import CourseCard from './components/CourseCard';
import useCourseFiltering, {
    getSectionFilterStatus,
} from './hooks/useCourseFiltering';
import useCourseSearch from './hooks/useCourseSearch';
import useFirstLetterNav from './hooks/useFirstLetterNav';
import FilterPanel from './components/FilterPanel';
import SearchBarSection from './components/SearchBarSection';
import FirstLetterNav from './components/FirstLetterNav';
import { unitMap, depaMap, geClassMap } from './constants/maps';
import { adpeMap, CMGEList, dayList, defaultFilterOptions, defaultTimeFilter, modeENStr } from './constants/options';
import { getCourseDisplayTitle } from './utils/courseTitle';
import TouchableScale from '../../../../../components/TouchableScale';

const itemHeight = scale(75);
const COURSE_CARD_GAP = scale(10);
const COURSE_GRID_HORIZONTAL_PADDING = scale(10);
const COURSE_GRID_COLUMN_COUNT = 6;
const SHORT_COURSE_TITLE_MAX_LENGTH = 20;
const MEDIUM_COURSE_TITLE_MAX_LENGTH = 36;

/**
 * 計算課名的視覺長度；漢字按兩個拉丁字元計算。
 * 此數值只用來選擇三種離散欄寬，實際換行仍交由原生文字排版。
 */
const getVisualTextLength = text => Array.from(String(text || '')).reduce((length, character) => {
    return length + (/\p{Script=Han}/u.test(character) ? 2 : 1);
}, 0);

const getCourseCardSpan = item => {
    const courseCode = item['Course Code'] || item.New_code;
    const titleCandidates = [
        item['Course Title'],
        item['Course Title Chi'],
        item.courseTitleEng,
        item.courseTitleChi,
    ].map(title => getCourseDisplayTitle(courseCode, title)).filter(Boolean);
    const titleLength = Math.max(
        ...titleCandidates.map(getVisualTextLength),
        0,
    );

    if (titleLength <= SHORT_COURSE_TITLE_MAX_LENGTH) {
        return 2;
    }
    if (titleLength <= MEDIUM_COURSE_TITLE_MAX_LENGTH) {
        return 3;
    }
    return COURSE_GRID_COLUMN_COUNT;
};

const getCourseCardWidth = (span, availableWidth) => {
    if (span === 2) {
        return Math.floor((availableWidth - COURSE_CARD_GAP * 2) / 3);
    }
    if (span === 3) {
        return Math.floor((availableWidth - COURSE_CARD_GAP) / 2);
    }
    return Math.floor(availableWidth);
};

/**
 * 只使用三種欄寬填滿一行：單張升為全寬，兩張升為各 1/2，三張維持各 1/3。
 * 課名長度仍決定初始分組，這裡只利用分組後確定無法再放卡片的剩餘空間。
 */
const fillCourseCardRow = row => {
    if (row.length === 1) {
        return row.map(entry => ({ ...entry, span: COURSE_GRID_COLUMN_COUNT }));
    }
    if (row.length === 2 && row.every(entry => entry.span < COURSE_GRID_COLUMN_COUNT)) {
        return row.map(entry => ({ ...entry, span: COURSE_GRID_COLUMN_COUNT / 2 }));
    }
    return row;
};

const groupCourseCardsByRow = list => {
    const rows = [];
    let currentRow = [];
    let occupiedColumns = 0;

    list.forEach((item, index) => {
        const span = getCourseCardSpan(item);
        if (occupiedColumns > 0 && occupiedColumns + span > COURSE_GRID_COLUMN_COUNT) {
            rows.push(currentRow);
            currentRow = [];
            occupiedColumns = 0;
        }

        currentRow.push({
            item,
            span,
            key: `${item['Course Code'] || item.New_code || 'course'}-${index}`,
        });
        occupiedColumns += span;

        if (occupiedColumns === COURSE_GRID_COLUMN_COUNT) {
            rows.push(currentRow);
            currentRow = [];
            occupiedColumns = 0;
        }
    });

    if (currentRow.length > 0) {
        rows.push(currentRow);
    }
    return rows.map(fillCourseCardRow);
};

const CourseCardRow = ({
    entries,
    availableWidth,
    courseMode,
    sectionStatusesByCourseCode,
}) => {
    const [measuredHeights, setMeasuredHeights] = useState({});
    const isRowMeasured = entries.every(entry => measuredHeights[entry.key] > 0);
    const rowHeight = isRowMeasured
        ? Math.max(...entries.map(entry => measuredHeights[entry.key]))
        : undefined;

    const handleMeasureHeight = useCallback((key, height) => {
        setMeasuredHeights(currentHeights => {
            if (Math.abs((currentHeights[key] || 0) - height) <= 0.5) {
                return currentHeights;
            }
            return { ...currentHeights, [key]: height };
        });
    }, []);

    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', columnGap: COURSE_CARD_GAP }}>
            {entries.map(entry => (
                <CourseCard
                    key={entry.key}
                    item={entry.item}
                    mode={'json'}
                    courseMode={courseMode}
                    cardWidth={getCourseCardWidth(entry.span, availableWidth)}
                    cardHeight={rowHeight}
                    onMeasureHeight={height => handleMeasureHeight(entry.key, height)}
                    sectionStatuses={
                        sectionStatusesByCourseCode?.[
                        entry.item['Course Code'] || entry.item.New_code
                        ]
                    }
                />
            ))}
        </View>
    );
};

const What2Reg = () => {
    const { theme } = useTheme();
    const { searchHost } = useUmehHost();
    const { themeColor, black, bg_color } = theme;
    const navigation = useNavigation();

    const [filterOptions, setFilterOptions] = useState(defaultFilterOptions);
    // 星期／時段篩選不持久化：若寫入 ARK_Courses_filterOptions，下次開 APP 會殘留看不見的條件而顯示空列表
    const [timeFilter, setTimeFilter] = useState(defaultTimeFilter);
    const [recommendationOnly, setRecommendationOnly] = useState(false);
    const [courseGridWidth, setCourseGridWidth] = useState(0);

    const textInputRef = useRef(null);
    const scrollViewRef = useRef(null);

    const insets = useSafeAreaInsets();
    // 與課表頁一致：優先讀 Tab Bar 實際高度，否則回退 safe area + 預設高度
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;
    // Android：JS Bottom Tab 與內容分欄，場景底邊已在 Tab Bar 上方，勿再扣 tabBarHeight
    // iOS：原生 Tab 多為半透明疊層，內容延伸至螢幕底，需扣 tabBarHeight 才不會被擋住
    const floatingBottom =
        Platform.OS === 'android'
            ? verticalScale(10)
            : tabBarHeight + verticalScale(10);
    // 頂部 insets 由 course/index.js 容器的 SafeAreaView + 頂欄統一處理，段落不可重複扣一次

    // 課程資料、模擬課表與衝突狀態一律取自容器的 CoursePlanProvider，
    // 段落不再自行持有 useCourseData，避免與課表段落各自抓一份而不同步
    const {
        courseMode,
        setCourseMode,
        preenrollCatalog,
        adddropCatalog,
        adddropCourseList,
        catalogMetadata,
        planCourseCodes,
        planSlots,
    } = useCoursePlan();

    const {
        offerCourseList,
        offerFacultyList,
        offerGEList,
        offerFacultyDepaListObj,
        normalizedFilterOptions,
        filterCourseList,
        isTimeFilterActive,
        isRecommendationFilterActive,
    } = useCourseFiltering({
        courseMode,
        preenrollCatalog,
        adddropCourseList,
        filterOptions,
        adddropCatalog,
        timeFilter,
        recommendationOnly,
        planCourseCodes,
        planSlots,
    });

    const sectionStatusesByCourseCode = useMemo(() => {
        if (!isTimeFilterActive && !isRecommendationFilterActive) {
            return {};
        }

        const slotsByCourseCode = lodash.groupBy(
            adddropCatalog?.Courses || [],
            'Course Code',
        );
        return filterCourseList.reduce((result, course) => {
            const courseCode = course['Course Code'];
            const courseSlots = slotsByCourseCode[courseCode] || [];
            result[courseCode] = Object.fromEntries(
                Object.entries(lodash.groupBy(courseSlots, 'Section'))
                    .map(([section, sectionSlots]) => {
                        const status = getSectionFilterStatus({
                            sectionSlots,
                            planSlots,
                            timeFilter: isTimeFilterActive
                                ? timeFilter
                                : defaultTimeFilter,
                        });

                        if (!status) {
                            return null;
                        }
                        if (
                            status === 'time' &&
                            isRecommendationFilterActive
                        ) {
                            return null;
                        }
                        return [
                            section,
                            status === 'conflict'
                                ? 'conflict'
                                : isRecommendationFilterActive
                                    ? 'recommended'
                                    : 'time',
                        ];
                    })
                    .filter(Boolean),
            );
            return result;
        }, {});
    }, [
        adddropCatalog,
        filterCourseList,
        isRecommendationFilterActive,
        isTimeFilterActive,
        planSlots,
        timeFilter,
    ]);

    const {
        inputText,
        inputOK,
        setInputText,
        clearInput,
        searchFilterCourse,
    } = useCourseSearch({
        offerCourseList,
        adddropCourses: adddropCatalog?.Courses || [],
        adddropCourseList,
    });

    const activeCourseList = searchFilterCourse?.length > 0 ? searchFilterCourse : filterCourseList;
    const { firstLetterList, scrollData } = useFirstLetterNav({
        courseList: activeCourseList,
        itemHeight,
    });

    /**
     * 更新篩選選項並同步到本地緩存
     */
    const updateFilterOptions = useCallback(async nextOptions => {
        if (lodash.isEqual(nextOptions, filterOptions)) {
            return;
        }
        setFilterOptions(nextOptions);
        await setLocalStorage('ARK_Courses_filterOptions', nextOptions);
    }, [filterOptions]);

    const updateTimeFilter = useCallback(nextTimeFilter => {
        setTimeFilter(nextTimeFilter);
    }, []);

    // 課程資料的載入與版本同步已上移到容器，此處只還原本段落自己的篩選條件
    useEffect(() => {
        logToFirebase('openPage', { page: 'chooseCourses' });
        refreshUmehHost(); // 不 await，背景探測 host

        getLocalStorage('ARK_Courses_filterOptions').then(storedFilterOptions => {
            if (storedFilterOptions) {
                setFilterOptions(storedFilterOptions);
            }
        });
    }, []);

    /**
     * 當資料版本更新導致篩選值失效時，
     * 自動修正為合法值並回寫緩存，避免空列表卡死。
     */
    useEffect(() => {
        if (!lodash.isEqual(filterOptions, normalizedFilterOptions)) {
            setFilterOptions(normalizedFilterOptions);
            setLocalStorage('ARK_Courses_filterOptions', normalizedFilterOptions);
        }
    }, [filterOptions, normalizedFilterOptions]);

    // 預選課沒有上課時間資料，切到該模式時清空星期／時段，避免留下不可見卻仍在生效的篩選
    useEffect(() => {
        if (courseMode === 'preEnroll') {
            setTimeFilter(currentTimeFilter => (
                lodash.isEqual(currentTimeFilter, defaultTimeFilter)
                    ? currentTimeFilter
                    : defaultTimeFilter
            ));
            setRecommendationOnly(false);
        }
    }, [courseMode]);

    const onPressSearchAction = useCallback(eventId => {
        trigger();
        switch (eventId) {
            case 'wiki': {
                const url = ARK_WIKI_SEARCH + encodeURIComponent(inputText);
                openLink(url);
                break;
            }
            case 'what2reg': {
                openLink(`${searchHost}${encodeURIComponent(inputText)}`);
                break;
            }
            case 'official': {
                const courseCode = encodeURIComponent(inputText);
                const uri = OFFICIAL_COURSE_SEARCH + courseCode;
                logToFirebase('checkCourse', { courseCode: `Official ${courseCode}` });
                openLink(uri);
                break;
            }
            default:
                break;
        }
    }, [inputText, searchHost]);

    const onClearInput = useCallback(() => {
        trigger();
        clearInput();
        setTimeout(() => {
            textInputRef.current?.focus();
        }, 0);
    }, [clearInput]);

    const onPressSearchButton = useCallback(() => {
        trigger();
    }, []);

    const handleUserAgreePress = useCallback(() => {
        trigger();
        openLink(USER_AGREE);
    }, []);

    const handleOpenTimetable = useCallback(() => {
        trigger();
        navigation.navigate(COURSE_TIMETABLE_SEGMENT);
    }, [navigation]);

    const onScrollToLetter = useCallback(letter => {
        trigger();
        const offsetY = scrollData[letter];
        if (typeof offsetY === 'number') {
            scrollViewRef.current?.scrollTo({ y: offsetY });
        }
    }, [scrollData]);

    /**
     * 課程卡片以 flexWrap 容器渲染（非 FlatList）。
     * 先按課名視覺長度分配全寬、1/2 或 1/3，再把卡片分組成實際行。
     * 每行量測所有卡片的自然高度後統一使用最大值，避免 Expo MenuView
     * 的 SwiftUI Host 無法繼承 React Native Flexbox 拉伸高度。
     */
    const renderCourseCards = useCallback((list, showSectionStatuses = false) => (
        <View
            style={{
                rowGap: COURSE_CARD_GAP,
                paddingHorizontal: COURSE_GRID_HORIZONTAL_PADDING,
            }}>
            {courseGridWidth > 0
                ? groupCourseCardsByRow(list).map(entries => (
                    <CourseCardRow
                        key={`${courseMode}-${Math.round(courseGridWidth)}-${entries.map(entry => `${entry.key}:${entry.span}`).join('_')}`}
                        entries={entries}
                        availableWidth={courseGridWidth}
                        courseMode={courseMode}
                        sectionStatusesByCourseCode={
                            showSectionStatuses
                                ? sectionStatusesByCourseCode
                                : null
                        }
                    />
                ))
                : null}
        </View>
    ), [courseGridWidth, courseMode, sectionStatusesByCourseCode]);

    // 搜尋結果不套用星期／時段篩選：此時 FilterPanel 不渲染，使用者既看不到也無法清除該篩選
    const hasSearchResult = searchFilterCourse?.length > 0;

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: bg_color,
                alignItems: 'center',
                justifyContent: 'center',
            }}
            onLayout={({ nativeEvent }) => {
                const availableWidth = nativeEvent.layout.width - COURSE_GRID_HORIZONTAL_PADDING * 2;
                setCourseGridWidth(currentWidth => (
                    Math.abs(currentWidth - availableWidth) > 0.5
                        ? availableWidth
                        : currentWidth
                ));
            }}
        >
            <KeyboardAwareScrollView
                ref={scrollViewRef}
                style={{ width: '100%', flex: 1 }}
                scrollIndicatorInsets={{ bottom: floatingBottom }}
                contentContainerStyle={{ paddingBottom: floatingBottom + verticalScale(50) }}
                stickyHeaderIndices={[0]}
                keyboardDismissMode="on-drag"
                contentInsetAdjustmentBehavior="never"
                bottomOffset={50}
            >
                <SearchBarSection
                    theme={theme}
                    inputText={inputText}
                    inputOK={inputOK}
                    textInputRef={textInputRef}
                    onChangeText={setInputText}
                    onClear={onClearInput}
                    onPressAction={onPressSearchAction}
                    onPressSearchButton={onPressSearchButton}
                    trigger={trigger}
                />

                {hasSearchResult ? (
                    <View style={{ width: '100%' }}>
                        <View style={{ alignSelf: 'center' }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), color: black.third }}>
                                燕子，答應我，要好好上課
                            </Text>
                        </View>
                        {renderCourseCards(searchFilterCourse)}
                    </View>
                ) : (
                    <View>
                        <FilterPanel
                            theme={theme}
                            courseMode={courseMode}
                            filterOptions={filterOptions}
                            offerFacultyList={offerFacultyList}
                            offerGEList={offerGEList}
                            offerFacultyDepaListObj={offerFacultyDepaListObj}
                            unitMap={unitMap}
                            depaMap={depaMap}
                            geClassMap={geClassMap}
                            adpeMap={adpeMap}
                            modeENStr={modeENStr}
                            CMGEList={CMGEList}
                            dayList={dayList}
                            timeFilter={timeFilter}
                            recommendationOnly={recommendationOnly}
                            onUpdateFilterOptions={updateFilterOptions}
                            onUpdateTimeFilter={updateTimeFilter}
                            onToggleRecommendation={() => {
                                setRecommendationOnly(currentValue => !currentValue);
                            }}
                            onSetCourseMode={setCourseMode}
                            trigger={trigger}
                        />

                        {filterCourseList?.length > 0
                            ? renderCourseCards(
                                filterCourseList,
                                isTimeFilterActive ||
                                isRecommendationFilterActive,
                            )
                            : null}

                        {(isTimeFilterActive || isRecommendationFilterActive) &&
                            filterCourseList?.length === 0 ? (
                            <View style={{ paddingHorizontal: scale(20), paddingVertical: scale(20) }}>
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(12),
                                    color: black.third,
                                    textAlign: 'center',
                                }}>
                                    {isRecommendationFilterActive
                                        ? t('目前沒有可排入且不衝突的課程，可調整篩選或已排課表。', { ns: 'catalog' })
                                        : t('該時段沒有符合的課程，可調整或清除星期與時段篩選。', { ns: 'catalog' })}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                )}

                <View style={{ marginTop: scale(10), alignItems: 'center' }}>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>
                        {`${courseMode === 'ad' ? '開設' : '預選'}課程:`}
                    </Text>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: black.third }}>
                        數據日期版本: {courseMode === 'ad' ? catalogMetadata.adddrop.updateTime : catalogMetadata.pre.updateTime}
                    </Text>
                </View>

                <View style={{ margin: scale(10), padding: scale(10), alignItems: 'center' }}>
                    <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(12) }}>
                        知識無價，評論只供參考
                    </Text>
                    <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(12) }}>
                        選咩課與ARK ALL是兩個獨立項目
                    </Text>
                </View>

                <TouchableScale style={{ marginTop: scale(10), alignItems: 'center' }} onPress={handleUserAgreePress}>
                    <Text style={{ ...uiStyle.defaultText, color: themeColor, fontSize: scale(10) }}>
                        ARK ALL 隱私政策 & 用戶協議
                    </Text>
                </TouchableScale>
            </KeyboardAwareScrollView>

            <KeyboardToolbar />

            <FirstLetterNav
                firstLetterList={firstLetterList}
                scrollData={scrollData}
                theme={theme}
                onScrollTo={onScrollToLetter}
            />

            {/* 已排課程數與衝突提示，點擊切到課表段落 */}
            <PlanCapsule
                bottom={floatingBottom}
                onPress={handleOpenTimetable}
            />

        </View>
    );
};

export default What2Reg;
