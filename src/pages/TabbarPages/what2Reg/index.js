import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';
import { useIsFocused } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
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
import { USER_AGREE, ARK_WIKI_SEARCH, OFFICIAL_COURSE_SEARCH, WHAT_2_REG_SEARCH } from '../../../utils/pathMap';

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

const What2Reg = props => {
    const { theme } = useTheme();
    const { themeColor, black, white, bg_color } = theme;
    const styles = useMemo(() => getStyles(themeColor, white), [themeColor, white]);

    const [dialogVisible, setDialogVisible] = useState(false);
    const [sheetIndex, setSheetIndex] = useState(-1);
    const [filterOptions, setFilterOptions] = useState(defaultFilterOptions);

    const textInputRef = useRef(null);
    const scrollViewRef = useRef(null);
    const actionSheetRef = useRef(null);
    const bottomSheetRef = useRef(null);

    const isFocused = useIsFocused();
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const stickyTopOffset = headerHeight || insets.top;

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
                props.navigation.navigate('Wiki', { url });
                break;
            }
            case 'what2reg': {
                openLink(`${WHAT_2_REG_SEARCH}${encodeURIComponent(inputText)}`);
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
    }, [inputText, props.navigation]);

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
     * 搜索結果與主列表都使用 FlatList，
     * 保留 CourseCard 的 flexWrap 佈局需求。
     */
    const renderSearchCourseCard = useCallback(({ item }) => (
        <CourseCard item={item} mode={'json'} courseMode={courseMode} />
    ), [courseMode]);

    const renderFilterCourseCard = useCallback(({ item }) => (
        <CourseCard item={item} mode={'json'} />
    ), []);

    const keyExtractor = useCallback((item, index) => item.CourseCode || item.New_code || index.toString(), []);
    const hasSearchResult = searchFilterCourse?.length > 0;

    return (
        <View style={{ flex: 1, backgroundColor: bg_color, alignItems: 'center', justifyContent: 'center' }}>
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
                contentInset={{ top: stickyTopOffset }}
                contentOffset={{ y: -stickyTopOffset }}
                scrollIndicatorInsets={{ top: stickyTopOffset }}
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
                        <FlatList
                            data={searchFilterCourse}
                            renderItem={renderSearchCourseCard}
                            keyExtractor={keyExtractor}
                            key={`flatList${searchFilterCourse.length}`}
                            contentContainerStyle={{ paddingHorizontal: scale(5) }}
                            scrollEnabled={false}   
                        />
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

                        {filterCourseList?.length > 0 ? (
                            <FlatList
                                data={filterCourseList}
                                numColumns={filterCourseList.length}
                                columnWrapperStyle={filterCourseList.length > 1 ? { flexWrap: 'wrap' } : null}
                                renderItem={renderFilterCourseCard}
                                contentContainerStyle={{ paddingHorizontal: scale(5) }}
                                keyExtractor={keyExtractor}
                                key={`flatList${courseMode}_${filterCourseList.length}`}
                                scrollEnabled={false}
                            />
                        ) : null}
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