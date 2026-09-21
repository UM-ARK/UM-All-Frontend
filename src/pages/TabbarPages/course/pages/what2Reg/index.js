import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
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
import { USER_AGREE, getOfficialCourseSearchUrl } from '../../../../../utils/pathMap';
import { refreshUmehHost, useUmehHost } from '../../../../../utils/umehHost';
import { COURSE_TIMETABLE_SEGMENT } from '../../../../../utils/courseNavigation';
import { navigateToWikiSearch } from '../../../../../utils/wikiNavigation';
import {
    WINDOW_BREAKPOINTS,
    useWindowSizeClass,
} from '../../../../../utils/windowSizeClass';
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
import {
    LANE_COLUMN_COUNT,
    getCourseCardWidth,
    getLaneCount,
    groupCourseCardsByRow,
} from './utils/courseGrid';
import TouchableScale from '../../../../../components/TouchableScale';
import {
    getCourseFilterStorageKey,
    PROGRAMME_LEVELS,
} from '../../../../../utils/courseProgramme';

const itemHeight = scale(75);
const COURSE_CARD_GAP = scale(10);
const COURSE_GRID_HORIZONTAL_PADDING = scale(10);
/** 寬屏左欄寬度：固定一台手機的寬度，讓篩選面板沿用手機排版 */
const FILTER_PANE_WIDTH = 360;

const CourseCardRow = ({
    entries,
    availableWidth,
    columnCount,
    programmeLevel,
    courseMode,
    isHistoricalPeriod,
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
                    programmeLevel={programmeLevel}
                    courseMode={courseMode}
                    isHistoricalPeriod={isHistoricalPeriod}
                    cardWidth={getCourseCardWidth(entry.span, availableWidth, COURSE_CARD_GAP, columnCount)}
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

/**
 * 搵課段落。
 *
 * @param {boolean} [isSplitPane] 是否與課表左右分屏（course/index.js 寬屏殼子）：
 *   課表就在旁邊，不再顯示「切到課表」的排課膠囊
 */
const What2Reg = ({ isSplitPane = false }) => {
    const { theme } = useTheme();
    const { searchHost } = useUmehHost();
    const { themeColor, black, bg_color } = theme;
    const navigation = useNavigation();
    // 達到 Material 3 expanded（≥ 840）即左右分欄；內容組件兩種殼子共用。
    // 量自身寬度而非窗口：與課表分屏時本段落只佔左欄，窗口寬度會誤判
    const { isExpanded: isWindowExpanded } = useWindowSizeClass();
    const [paneWidth, setPaneWidth] = useState(0);
    const isExpanded =
        paneWidth > 0
            ? paneWidth >= WINDOW_BREAKPOINTS.expanded
            : isWindowExpanded;

    const [filterOptions, setFilterOptions] = useState(defaultFilterOptions);
    // 星期／時段篩選不持久化：若寫入 ARK_Courses_filterOptions，下次開 APP 會殘留看不見的條件而顯示空列表
    const [timeFilter, setTimeFilter] = useState(defaultTimeFilter);
    const [recommendationOnly, setRecommendationOnly] = useState(false);
    const [courseGridWidth, setCourseGridWidth] = useState(0);
    // 可用寬度每 440px 開一條「車道」，卡片仍維持手機上的 1/3、1/2、全寬三檔
    const courseGridColumnCount = getLaneCount(courseGridWidth) * LANE_COLUMN_COUNT;
    const [loadedFilterStorageKey, setLoadedFilterStorageKey] = useState(null);

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
        programmeLevel,
        courseMode,
        setCourseMode,
        preenrollCatalog,
        adddropCourseList,
        postgraduateCourseList,
        activeCourseList,
        courseTimeList,
        catalogMetadata,
        coursePeriodOptions,
        activeCoursePeriod,
        isHistoricalPeriod,
        historicalCatalogStatus,
        selectCoursePeriod,
        planCourseCodes,
        planSlots,
    } = useCoursePlan();
    const isPostgraduate = programmeLevel === PROGRAMME_LEVELS.postgraduate;
    const activeCoursePeriodLabel = activeCoursePeriod
        ? t('{{academicYear}} 第{{sem}}學期', {
            ns: 'catalog',
            academicYear: activeCoursePeriod.academicYear,
            sem: activeCoursePeriod.sem,
        })
        : '';
    const filterStorageKey = getCourseFilterStorageKey(programmeLevel);

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
        programmeLevel,
        preenrollCatalog,
        adddropCourseList,
        postgraduateCourseList,
        filterOptions,
        courseTimeList,
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
            courseTimeList,
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
        courseTimeList,
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
        adddropCourses: courseTimeList,
        adddropCourseList: activeCourseList,
    });

    const visibleCourseList = searchFilterCourse?.length > 0 ? searchFilterCourse : filterCourseList;
    const { firstLetterList, scrollData } = useFirstLetterNav({
        courseList: visibleCourseList,
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
        await setLocalStorage(filterStorageKey, nextOptions);
    }, [filterOptions, filterStorageKey]);

    const updateTimeFilter = useCallback(nextTimeFilter => {
        setTimeFilter(nextTimeFilter);
    }, []);

    // 課程資料的載入與版本同步已上移到容器，此處只還原本段落自己的篩選條件
    useEffect(() => {
        logToFirebase('openPage', { page: 'chooseCourses' });
        refreshUmehHost(); // 不 await，背景探測 host

    }, []);

    useEffect(() => {
        let cancelled = false;

        setLoadedFilterStorageKey(null);
        setFilterOptions(defaultFilterOptions);
        getLocalStorage(filterStorageKey).then(storedFilterOptions => {
            if (cancelled) {
                return;
            }
            setFilterOptions(storedFilterOptions || defaultFilterOptions);
            setLoadedFilterStorageKey(filterStorageKey);
        });

        return () => {
            cancelled = true;
        };
    }, [filterStorageKey]);

    /**
     * 當資料版本更新導致篩選值失效時，
     * 自動修正為合法值並回寫緩存，避免空列表卡死。
     */
    useEffect(() => {
        if (loadedFilterStorageKey !== filterStorageKey) {
            return;
        }
        if (!lodash.isEqual(filterOptions, normalizedFilterOptions)) {
            setFilterOptions(normalizedFilterOptions);
            setLocalStorage(filterStorageKey, normalizedFilterOptions);
        }
    }, [filterOptions, filterStorageKey, loadedFilterStorageKey, normalizedFilterOptions]);

    // 預選課沒有上課時間資料，切到該模式時清空星期／時段，避免留下不可見卻仍在生效的篩選
    useEffect(() => {
        if (!isPostgraduate && courseMode === 'preEnroll') {
            setTimeFilter(currentTimeFilter => (
                lodash.isEqual(currentTimeFilter, defaultTimeFilter)
                    ? currentTimeFilter
                    : defaultTimeFilter
            ));
            setRecommendationOnly(false);
        }
    }, [courseMode, isPostgraduate]);

    const onPressSearchAction = useCallback(eventId => {
        trigger();
        switch (eventId) {
            case 'harbor-discuss': {
                logToFirebase('checkCourse', {
                    courseCode: inputText,
                    action: 'harbor-discuss',
                });
                navigation.navigate('HarborSearch', { query: inputText });
                break;
            }
            case 'wiki': {
                logToFirebase('checkCourse', {
                    courseCode: inputText,
                    action: 'ark-wiki',
                });
                navigateToWikiSearch(navigation, inputText, { autoOpenUnique: true });
                break;
            }
            case 'what2reg': {
                openLink(`${searchHost}${encodeURIComponent(inputText)}`);
                break;
            }
            case 'official': {
                const courseCode = encodeURIComponent(inputText);
                const uri = getOfficialCourseSearchUrl(courseCode, isPostgraduate);
                logToFirebase('checkCourse', { courseCode: `Official ${courseCode}` });
                openLink(uri);
                break;
            }
            default:
                break;
        }
    }, [inputText, isPostgraduate, navigation, searchHost]);

    const onClearInput = useCallback(() => {
        trigger();
        clearInput();
        setTimeout(() => {
            textInputRef.current?.focus();
        }, 0);
    }, [clearInput]);

    const handleUserAgreePress = useCallback(() => {
        trigger();
        openLink(USER_AGREE);
    }, []);

    const handleOpenTimetable = useCallback(() => {
        trigger();
        navigation.navigate(COURSE_TIMETABLE_SEGMENT);
    }, [navigation]);

    const handleSelectCoursePeriod = useCallback(async periodId => {
        try {
            await selectCoursePeriod(periodId);
        } catch {
            Alert.alert(
                t('無法載入歷史課表', { ns: 'catalog' }),
                t('請檢查網絡後再試；已下載的歷史課表仍可離線使用。', { ns: 'catalog' }),
            );
        }
    }, [selectCoursePeriod]);

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
            }}
            // 量測網格自身而非整頁：寬屏時網格只佔右欄，iPad 側欄／分屏也不必另外扣寬度
            onLayout={({ nativeEvent }) => {
                const availableWidth = nativeEvent.layout.width - COURSE_GRID_HORIZONTAL_PADDING * 2;
                setCourseGridWidth(currentWidth => (
                    Math.abs(currentWidth - availableWidth) > 0.5
                        ? availableWidth
                        : currentWidth
                ));
            }}>
            {courseGridWidth > 0
                ? groupCourseCardsByRow(list, courseGridColumnCount).map(entries => (
                    <CourseCardRow
                        key={`${programmeLevel}-${courseMode}-${activeCoursePeriod?.id}-${Math.round(courseGridWidth)}-${entries.map(entry => `${entry.key}:${entry.span}`).join('_')}`}
                        entries={entries}
                        availableWidth={courseGridWidth}
                        columnCount={courseGridColumnCount}
                        programmeLevel={programmeLevel}
                        courseMode={courseMode}
                        isHistoricalPeriod={isHistoricalPeriod}
                        sectionStatusesByCourseCode={
                            showSectionStatuses
                                ? sectionStatusesByCourseCode
                                : null
                        }
                    />
                ))
                : null}
        </View>
    ), [activeCoursePeriod?.id, courseGridColumnCount, courseGridWidth, courseMode, isHistoricalPeriod, programmeLevel, sectionStatusesByCourseCode]);

    // 搜尋結果不套用星期／時段篩選：此時 FilterPanel 不渲染，使用者既看不到也無法清除該篩選
    const hasSearchResult = searchFilterCourse?.length > 0;

    // 以下內容在緊湊（單欄滾動）與寬屏（左右分欄）兩種殼子之間共用，不因佈局分叉
    const searchBar = (
        <SearchBarSection
            theme={theme}
            inputText={inputText}
            inputOK={inputOK}
            textInputRef={textInputRef}
            onChangeText={setInputText}
            onClear={onClearInput}
            onPressAction={onPressSearchAction}
            trigger={trigger}
        />
    );

    const filterOrHint = hasSearchResult ? (
        <View style={{ alignSelf: 'center' }}>
            <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), color: black.third }}>
                燕子，答應我，要好好上課
            </Text>
        </View>
    ) : (
        <FilterPanel
            theme={theme}
            programmeLevel={programmeLevel}
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
            coursePeriodOptions={coursePeriodOptions}
            activeCoursePeriod={activeCoursePeriod}
            catalogMetadata={catalogMetadata}
            isHistoricalPeriod={isHistoricalPeriod}
            historicalCatalogStatus={historicalCatalogStatus}
            onUpdateFilterOptions={updateFilterOptions}
            onUpdateTimeFilter={updateTimeFilter}
            onToggleRecommendation={value => {
                setRecommendationOnly(value);
            }}
            onSetCourseMode={setCourseMode}
            onSelectCoursePeriod={handleSelectCoursePeriod}
            onPressProgrammeLevel={() => {
                navigation.navigate('SettingPage');
            }}
            trigger={trigger}
        />
    );

    const courseGrid = hasSearchResult ? renderCourseCards(searchFilterCourse) : (
        <>
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
        </>
    );

    const footer = (
        <>
            <View style={{ marginTop: scale(10), alignItems: 'center' }}>
                <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>
                    {`${isPostgraduate
                        ? '研究生'
                        : courseMode === 'ad'
                            ? '開設'
                            : '預選'}課程:`}
                </Text>
                <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: black.third }}>
                    {isHistoricalPeriod
                        ? `${activeCoursePeriodLabel} · ${t('歷史課表', { ns: 'catalog' })}`
                        : `數據日期版本: ${isPostgraduate
                            ? catalogMetadata.postgraduate.updateTime
                            : courseMode === 'ad'
                                ? catalogMetadata.adddrop.updateTime
                                : catalogMetadata.pre.updateTime}`}
                </Text>
                {isHistoricalPeriod ? (
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: theme.warning, textAlign: 'center' }}>
                        {t('歷史開課資料按最新課程目錄辨認本科／研究生，僅供規劃參考。', { ns: 'catalog' })}
                    </Text>
                ) : null}
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
        </>
    );

    // 兩種殼子共用的滾動行為；scrollViewRef 必須掛在承載網格的那個滾動視圖上，字母索引才跳得到
    const courseScrollProps = {
        scrollIndicatorInsets: { bottom: floatingBottom },
        keyboardDismissMode: 'on-drag',
        contentInsetAdjustmentBehavior: 'never',
        bottomOffset: 50,
    };

    return (
        <View
            onLayout={({ nativeEvent }) => setPaneWidth(nativeEvent.layout.width)}
            style={{
                flex: 1,
                backgroundColor: bg_color,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {isExpanded ? (
                // 寬屏：左欄固定手機寬度放搜尋與篩選；右欄結果網格隨寬度增加車道
                <View style={{ flex: 1, flexDirection: 'row', width: '100%' }}>
                    <View
                        style={{
                            width: FILTER_PANE_WIDTH,
                            borderRightWidth: StyleSheet.hairlineWidth,
                            borderRightColor: black.third + '33',
                        }}>
                        {searchBar}
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{
                                paddingTop: COURSE_CARD_GAP,
                                paddingBottom: floatingBottom + verticalScale(20),
                            }}
                            keyboardDismissMode="on-drag">
                            {filterOrHint}
                        </ScrollView>
                    </View>
                    <KeyboardAwareScrollView
                        {...courseScrollProps}
                        ref={scrollViewRef}
                        style={{ flex: 1 }}
                        contentContainerStyle={{
                            paddingTop: COURSE_CARD_GAP,
                            paddingBottom: floatingBottom + verticalScale(50),
                        }}
                    >
                        {courseGrid}
                        {footer}
                    </KeyboardAwareScrollView>
                </View>
            ) : (
                <KeyboardAwareScrollView
                    {...courseScrollProps}
                    ref={scrollViewRef}
                    style={{ width: '100%', flex: 1 }}
                    contentContainerStyle={{ paddingBottom: floatingBottom + verticalScale(50) }}
                    stickyHeaderIndices={[0]}
                >
                    {searchBar}
                    <View style={{ rowGap: COURSE_CARD_GAP }}>
                        {filterOrHint}
                        {courseGrid}
                    </View>
                    {footer}
                </KeyboardAwareScrollView>
            )}

            <KeyboardToolbar />

            <FirstLetterNav
                firstLetterList={firstLetterList}
                scrollData={scrollData}
                theme={theme}
                onScrollTo={onScrollToLetter}
            />

            {/* 已排課程數與衝突提示，點擊切到課表段落；分屏時課表就在右欄，不需要 */}
            {isSplitPane ? null : (
                <PlanCapsule
                    bottom={floatingBottom}
                    onPress={handleOpenTimetable}
                />
            )}

        </View>
    );
};

export default What2Reg;
