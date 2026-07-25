import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';
import { useIsFocused } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Image } from 'expo-image';
import ActionSheet from 'react-native-actions-sheet';
import { Dialog } from '@rneui/themed';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from 'i18next';
import lodash from 'lodash';

import { useTheme, uiStyle } from '../../../components/ThemeContext';
import { trigger } from '../../../utils/trigger';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { openLink } from '../../../utils/browser';
import { setLocalStorage } from '../../../utils/storageKits';
import { checkCloudCourseVersion } from '../../../utils/checkCoursesKits';
import { USER_AGREE, ARK_WIKI_SEARCH, OFFICIAL_COURSE_SEARCH, UM_PRE_ENROLMENT_EXCEL } from '../../../utils/pathMap';
import { refreshUmehHost, useUmehHost } from '../../../utils/umehHost';

import CourseCard from './components/CourseCard';
import CustomBottomSheet from '../courseSim/BottomSheet';
import useCourseData from './hooks/useCourseData';
import useCourseFiltering from './hooks/useCourseFiltering';
import useCourseSearch from './hooks/useCourseSearch';
import useFirstLetterNav from './hooks/useFirstLetterNav';
import FilterPanel from './components/FilterPanel';
import SearchBarSection from './components/SearchBarSection';
import FirstLetterNav from './components/FirstLetterNav';
import EatingScheduleSheetContent from './components/EatingScheduleSheetContent';
import { unitMap, depaMap, geClassMap } from './constants/maps';
import { adpeMap, CMGEList, dayList, defaultFilterOptions, modeENStr } from './constants/options';
import TouchableScale from '../../../components/TouchableScale';

const iconSize = scale(25);
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
    const titleCandidates = [
        item['Course Title'],
        item['Course Title Chi'],
        item.courseTitleEng,
        item.courseTitleChi,
    ].filter(Boolean);
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

const CourseCardRow = ({ entries, availableWidth, courseMode }) => {
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
                />
            ))}
        </View>
    );
};

const What2Reg = props => {
    const { theme } = useTheme();
    const { searchHost } = useUmehHost();
    const { themeColor, black, white, bg_color } = theme;
    const styles = useMemo(() => getStyles(themeColor, white), [themeColor, white]);

    const [dialogVisible, setDialogVisible] = useState(false);
    const [sheetIndex, setSheetIndex] = useState(-1);
    const [filterOptions, setFilterOptions] = useState(defaultFilterOptions);
    const [courseGridWidth, setCourseGridWidth] = useState(0);

    const textInputRef = useRef(null);
    const scrollViewRef = useRef(null);
    const actionSheetRef = useRef(null);
    const bottomSheetRef = useRef(null);

    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    // 與課表頁一致：優先讀 Tab Bar 實際高度，否則回退 safe area + 預設高度
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;
    // iOS：用 contentInset + contentOffset 避開導航列/狀態列；Android 上該組合常不生效，改由外層 paddingTop
    const stickyTopOffset = headerHeight || insets.top;
    const scrollTopInset = Platform.OS === 'android' ? 0 : stickyTopOffset;

    const {
        courseMode,
        setCourseMode,
        offerCoursesData,
        coursePlanData,
        coursePlanTimeData,
        courseVersion,
        initCourseData,
        refreshCourseData,
    } = useCourseData();

    const {
        offerCourseList,
        offerFacultyList,
        offerGEList,
        offerFacultyDepaListObj,
        normalizedFilterOptions,
        filterCourseList,
    } = useCourseFiltering({
        courseMode,
        coursePlanData,
        offerCoursesData,
        filterOptions,
    });

    const {
        inputText,
        inputOK,
        setInputText,
        clearInput,
        searchFilterCourse,
    } = useCourseSearch({
        offerCourseList,
        coursePlanTimeCourses: coursePlanTimeData?.Courses || [],
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

    /**
     * 初始化頁面資料：
     * 1) 記錄頁面打點
     * 2) 載入本地課程與版本資料
     * 3) 恢復上次篩選選項
     */
    const initPageData = useCallback(async () => {
        try {
            logToFirebase('openPage', { page: 'chooseCourses' });
            refreshUmehHost(); // 不 await，背景探測 host
            const nextFilterOptions = await initCourseData();
            setFilterOptions(nextFilterOptions);
        } catch (e) {
            Alert.alert('ARK Courses error, 請聯繫開發者！', String(e));
        }
    }, [initCourseData]);

    useEffect(() => {
        initPageData();
    }, [initPageData]);

    // 頁面回到前景時同步版本資料
    useEffect(() => {
        if (isFocused) {
            refreshCourseData();
        }
    }, [isFocused, refreshCourseData]);

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

    const handleDialogClose = useCallback(() => {
        setDialogVisible(false);
    }, []);

    const handleUpdatePress = useCallback(() => {
        trigger();
        actionSheetRef.current?.show();
    }, []);

    const handleUserAgreePress = useCallback(() => {
        trigger();
        openLink(USER_AGREE);
    }, []);

    const handleManualUpdate = useCallback(() => {
        trigger();
        actionSheetRef.current?.hide();
        setDialogVisible(true);
        checkCloudCourseVersion()
            .then(async () => {
                const nextFilterOptions = await initCourseData();
                setFilterOptions(nextFilterOptions);
                handleDialogClose();
            })
            .catch(() => {
                handleDialogClose();
            });
    }, [handleDialogClose, initCourseData]);

    const handleOfficialSharePointPress = useCallback(() => {
        trigger();
        actionSheetRef.current?.hide();
        openLink(UM_PRE_ENROLMENT_EXCEL);
    }, []);

    const onScrollToLetter = useCallback(letter => {
        trigger();
        const offsetY = scrollData[letter];
        if (typeof offsetY === 'number') {
            scrollViewRef.current?.scrollTo({ y: offsetY });
        }
    }, [scrollData]);

    const reminderView = useMemo(() => (
        <View style={{ width: '100%', alignItems: 'center', marginBottom: scale(5) }}>
            <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), color: black.third, textAlign: 'center' }}>
                {t('檢查課表版本!', { ns: 'catalog' })}
            </Text>
            <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), color: black.third, textAlign: 'center' }}>
                {t('以官網課表Excel為準!', { ns: 'catalog' })}
            </Text>
        </View>
    ), [black.third]);

    /**
     * 課程卡片以 flexWrap 容器渲染（非 FlatList）。
     * 先按課名視覺長度分配全寬、1/2 或 1/3，再把卡片分組成實際行。
     * 每行量測所有卡片的自然高度後統一使用最大值，避免 Expo MenuView
     * 的 SwiftUI Host 無法繼承 React Native Flexbox 拉伸高度。
     */
    const renderCourseCards = useCallback(list => (
        <View
            style={{
                rowGap: COURSE_CARD_GAP,
                paddingHorizontal: COURSE_GRID_HORIZONTAL_PADDING,
            }}
            onLayout={({ nativeEvent }) => {
                const availableWidth = nativeEvent.layout.width - COURSE_GRID_HORIZONTAL_PADDING * 2;
                setCourseGridWidth(currentWidth => (
                    Math.abs(currentWidth - availableWidth) > 0.5
                        ? availableWidth
                        : currentWidth
                ));
            }}>
            {courseGridWidth > 0
                ? groupCourseCardsByRow(list).map(entries => (
                    <CourseCardRow
                        key={`${courseMode}-${Math.round(courseGridWidth)}-${entries.map(entry => `${entry.key}:${entry.span}`).join('_')}`}
                        entries={entries}
                        availableWidth={courseGridWidth}
                        courseMode={courseMode}
                    />
                ))
                : null}
        </View>
    ), [courseGridWidth, courseMode]);

    const hasSearchResult = searchFilterCourse?.length > 0;

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: bg_color,
                alignItems: 'center',
                justifyContent: 'center',
                paddingTop: Platform.OS === 'android' ? insets.top : 0,
            }}
        >
            <ActionSheet
                ref={actionSheetRef}
                containerStyle={{
                    borderRadius: scale(10),
                    padding: scale(10),
                    backgroundColor: bg_color,
                }}
            >
                <View style={{ padding: scale(10) }}>
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(14),
                        color: black.main,
                        textAlign: 'center',
                        marginBottom: scale(15),
                    }}>
                        {`${t('Add Drop Data Version', { ns: 'about' }) + courseVersion.adddrop.updateTime}\n${courseVersion.adddrop.academicYear} - Sem ${courseVersion.adddrop.sem}\n\n${t('PreEnroll Data Version', { ns: 'about' }) + courseVersion.pre.updateTime}\n${courseVersion.pre.academicYear} - Sem ${courseVersion.pre.sem}\n\n${t('點擊下方按鈕更新！檢查作者是否上傳最新數據~', { ns: 'catalog' })}\n${t('或可附件最新的課表Excel，Email提醒作者更新！', { ns: 'catalog' })}\n\n${t('如日期已更新，課表數據未更新，可重啟APP再試~', { ns: 'catalog' })}`}
                    </Text>
                    <TouchableScale style={styles.actionButton(themeColor)} onPress={handleManualUpdate}>
                        <Text style={styles.actionButtonText}>
                            {t('手動檢查課表數據更新', { ns: 'catalog' })}
                        </Text>
                    </TouchableScale>
                    <TouchableScale style={styles.actionButton(themeColor)} onPress={handleOfficialSharePointPress}>
                        <Text style={styles.actionButtonText}>
                            {t('檢查官方SharePoint版本', { ns: 'catalog' })}
                        </Text>
                    </TouchableScale>
                    <TouchableScale
                        style={styles.actionButton(black.third)}
                        onPress={() => {
                            trigger();
                            actionSheetRef.current?.hide();
                        }}
                    >
                        <Text style={styles.actionButtonText}>
                            {t('Cancel')}
                        </Text>
                    </TouchableScale>
                </View>
            </ActionSheet>

            <Dialog
                isVisible={dialogVisible}
                onBackdropPress={handleDialogClose}
                statusBarTranslucent
                overlayStyle={{ backgroundColor: bg_color }}
            >
                <Dialog.Loading />
            </Dialog>

            <KeyboardAwareScrollView
                ref={scrollViewRef}
                style={{ width: '100%', flex: 1 }}
                contentInset={{ top: scrollTopInset }}
                contentOffset={{ y: -scrollTopInset }}
                scrollIndicatorInsets={{ top: scrollTopInset, bottom: tabBarHeight }}
                contentContainerStyle={{ paddingBottom: tabBarHeight + verticalScale(10) }}
                stickyHeaderIndices={[1]}
                keyboardDismissMode="on-drag"
                contentInsetAdjustmentBehavior="never"
                bottomOffset={50}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: verticalScale(3) }}>
                    <TouchableScale style={styles.titleRightButton} onPress={handleUpdatePress}>
                        <Ionicons name={'build'} size={verticalScale(14)} color={themeColor} />
                        <Text style={styles.titleButtonText}>{t('更新')}</Text>
                    </TouchableScale>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Image
                            source={require('../../../static/img/logo.png')}
                            style={{ height: iconSize, width: iconSize, borderRadius: scale(5) }}
                        />
                        <View style={{ marginLeft: scale(5) }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(18), color: themeColor, fontWeight: '600' }}>
                                {t('ARK搵課', { ns: 'catalog' })}
                            </Text>
                        </View>
                    </View>

                    <TouchableScale
                        style={styles.titleLeftButton}
                        onPress={() => {
                            trigger();
                            if (sheetIndex !== -1) {
                                bottomSheetRef.current?.close();
                                return;
                            }
                            logToFirebase('funcUse', { funcName: 'eating_schedule' });
                            bottomSheetRef.current?.expand();
                        }}
                    >
                        <Ionicons name={'alarm'} size={verticalScale(14)} color={themeColor} />
                        <Text style={styles.titleButtonText}>{t('幹飯', { ns: 'catalog' })}</Text>
                    </TouchableScale>
                </View>

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
                    <View>
                        {reminderView}
                        <View style={{ alignSelf: 'center' }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), color: black.third }}>
                                拿走不謝
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
                            onUpdateFilterOptions={updateFilterOptions}
                            onSetCourseMode={setCourseMode}
                            trigger={trigger}
                        />

                        {filterCourseList?.length > 0
                            ? renderCourseCards(filterCourseList)
                            : null}
                    </View>
                )}

                <View style={{ marginTop: scale(10), alignItems: 'center' }}>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>
                        {`${courseMode === 'ad' ? '開設' : '預選'}課程:`}
                    </Text>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: black.third }}>
                        數據日期版本: {courseMode === 'ad' ? courseVersion.adddrop.updateTime : courseVersion.pre.updateTime}
                    </Text>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: themeColor }}>
                        記得提醒開發者最新Excel課表版本
                    </Text>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: themeColor }} selectable>
                        遇到BUG可聯繫umacark@gmail.com
                    </Text>
                </View>

                <View style={{ margin: scale(10), padding: scale(10), alignItems: 'center' }}>
                    <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(12) }}>
                        知識無價，評論只供參考
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

            <CustomBottomSheet ref={bottomSheetRef} page={'home'} onSheetIndexChange={idx => setSheetIndex(idx)}>
                {sheetIndex !== -1 ? (
                    <EatingScheduleSheetContent
                        theme={theme}
                        dayList={dayList}
                        courses={coursePlanTimeData?.Courses || []}
                    />
                ) : null}
            </CustomBottomSheet>
        </View>
    );
};

const getStyles = (themeColor, white) => ({
    actionButton: backgroundColor => ({
        backgroundColor,
        borderRadius: scale(8),
        paddingVertical: verticalScale(10),
        alignItems: 'center',
        marginBottom: scale(10),
    }),
    actionButtonText: {
        ...uiStyle.defaultText,
        color: white,
        fontWeight: 'bold',
        fontSize: scale(16),
    },
    titleRightButton: {
        position: 'absolute',
        right: scale(10),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${themeColor}15`,
        borderRadius: scale(5),
        padding: scale(5),
    },
    titleLeftButton: {
        position: 'absolute',
        left: scale(10),
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: `${themeColor}15`,
        borderRadius: scale(5),
        padding: scale(5),
    },
    titleButtonText: {
        ...uiStyle.defaultText,
        color: themeColor,
        fontWeight: 'bold',
        lineHeight: verticalScale(14),
    },
});

export default What2Reg;
