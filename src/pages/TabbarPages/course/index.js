import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Alert, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-screens/experimental';
import {
    useIsFocused,
    useNavigation,
    useRoute,
} from '@react-navigation/native';
import { Dialog } from '@rneui/themed';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../components/ThemeContext';
import { trigger } from '../../../utils/trigger';
import { openLink } from '../../../utils/browser';
import { UM_PRE_ENROLMENT_EXCEL } from '../../../utils/pathMap';
import {
    COURSE_SEARCH_SEGMENT,
    COURSE_TIMETABLE_SEGMENT,
    COURSE_TOP_TAB_STORAGE_KEY,
    isCourseSegment,
} from '../../../utils/courseNavigation';
import { getLocalStorage, setLocalStorage } from '../../../utils/storageKits';
import { useWindowSizeClass } from '../../../utils/windowSizeClass';
import What2Reg from './pages/what2Reg';
import CourseSim from './pages/courseSim';
import CourseTabBar from './components/CourseTabBar';
import CoursePaneHeader from './components/CoursePaneHeader';
import SplitPaneDivider from './components/SplitPaneDivider';
import TimetableTabLabel from './components/TimetableTabLabel';
import { CoursePlanProvider, useCoursePlan } from './context/CoursePlanContext';
import {
    TAB_BAR_HEIGHT,
    TAB_INDICATOR_WIDTH,
    TAB_LABEL_FONT_SIZE,
    SEARCH_PANE_DEFAULT_WIDTH,
    SEARCH_PANE_MIN_WIDTH,
    TIMETABLE_PANE_MIN_WIDTH,
    SPLIT_PANE_WIDTH_STORAGE_KEY,
} from './constants';

const Tab = createMaterialTopTabNavigator();

/**
 * 選課頁內容：頂欄（段落 Tab + ⋯）+ 兩個段落。
 *
 * 必須是 CoursePlanProvider 的子層，因為頂欄的版本操作與衝突角標都讀共享排課狀態。
 */
const CourseTabContent = () => {
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t } = useTranslation(['common', 'catalog', 'timetable']);
    const isFocused = useIsFocused();
    const navigation = useNavigation();
    const route = useRoute();
    // 達到 large（≥ 1200）才分屏：搵課自己在 ≥ 840 已會左右分欄，再窄就是三欄擠在一起
    const { isLarge } = useWindowSizeClass();
    // 分屏左欄寬度：用戶可拖分隔線調整並持久化；右欄吃剩下的空間
    const [searchPaneWidth, setSearchPaneWidth] = useState(
        SEARCH_PANE_DEFAULT_WIDTH,
    );
    const [splitContainerWidth, setSplitContainerWidth] = useState(0);
    const dragStartWidthRef = useRef(SEARCH_PANE_DEFAULT_WIDTH);
    // 拖動中最新寬度；放手時持久化用，避免 useCallback 閉包裡的 state 落後一幀
    const dragLatestWidthRef = useRef(SEARCH_PANE_DEFAULT_WIDTH);

    const {
        programmeLevel,
        catalogMetadata,
        initCourseData,
        refreshCourseData,
        planList,
        clearPlan,
    } = useCoursePlan();

    const [isUpdating, setIsUpdating] = useState(false);
    const canClear = planList.length > 0;
    // null：尚未讀完上次段落；讀完後才掛 Navigator，避免 initialRouteName 失效閃一下
    const [initialSegment, setInitialSegment] = useState(null);

    // 課程資料初始化改由容器負責：段落是 lazy 的，若外部直接跳到課表段落，
    // 搵課段落還沒掛載，資料就永遠停在打包的 JSON
    useEffect(() => {
        initCourseData().catch(error => {
            Alert.alert('ARK Courses error, 請聯繫開發者！', String(error));
        });
    }, [initCourseData]);

    // 整個選課 Tab 回到前景時才同步版本，兩個段落不必各自檢查一次
    useEffect(() => {
        if (isFocused) {
            refreshCourseData();
        }
    }, [isFocused, refreshCourseData]);

    // 還原上次的頂欄段落（冷啟動後點選課 Tab 仍回到同一段）
    useEffect(() => {
        let cancelled = false;

        getLocalStorage(COURSE_TOP_TAB_STORAGE_KEY).then(stored => {
            if (cancelled) {
                return;
            }
            setInitialSegment(
                isCourseSegment(stored) ? stored : COURSE_SEARCH_SEGMENT,
            );
        });

        return () => {
            cancelled = true;
        };
    }, []);

    // 還原上次拖出的分屏左欄寬度
    useEffect(() => {
        let cancelled = false;

        getLocalStorage(SPLIT_PANE_WIDTH_STORAGE_KEY).then(stored => {
            if (!cancelled && typeof stored === 'number' && stored > 0) {
                setSearchPaneWidth(stored);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    // 左欄寬度上下限：左欄不小於 SEARCH_PANE_MIN_WIDTH，右欄不小於 TIMETABLE_PANE_MIN_WIDTH；
    // 容器未量到寬度前只卡下限
    const clampSearchPaneWidth = useCallback(
        width => {
            const maxWidth =
                splitContainerWidth > 0
                    ? Math.max(
                        SEARCH_PANE_MIN_WIDTH,
                        splitContainerWidth - TIMETABLE_PANE_MIN_WIDTH,
                    )
                    : Infinity;
            return Math.min(maxWidth, Math.max(SEARCH_PANE_MIN_WIDTH, width));
        },
        [splitContainerWidth],
    );

    const handleDividerDragStart = useCallback(() => {
        dragStartWidthRef.current = searchPaneWidth;
        dragLatestWidthRef.current = searchPaneWidth;
    }, [searchPaneWidth]);

    const handleDividerDrag = useCallback(
        translationX => {
            const width = clampSearchPaneWidth(
                dragStartWidthRef.current + translationX,
            );
            dragLatestWidthRef.current = width;
            setSearchPaneWidth(width);
        },
        [clampSearchPaneWidth],
    );

    const handleDividerDragEnd = useCallback(() => {
        setLocalStorage(SPLIT_PANE_WIDTH_STORAGE_KEY, dragLatestWidthRef.current);
    }, []);

    // 雙擊分隔線恢復默認寬度
    const handleDividerReset = useCallback(() => {
        trigger();
        setSearchPaneWidth(SEARCH_PANE_DEFAULT_WIDTH);
        setLocalStorage(SPLIT_PANE_WIDTH_STORAGE_KEY, SEARCH_PANE_DEFAULT_WIDTH);
    }, []);

    const handleManualUpdate = useCallback(async () => {
        setIsUpdating(true);
        try {
            await refreshCourseData({ force: true });
        } catch (error) {
            Alert.alert('ARK Courses error, 請聯繫開發者！', String(error));
        } finally {
            setIsUpdating(false);
        }
    }, [refreshCourseData]);

    const handleOpenSharePoint = useCallback(() => {
        openLink(UM_PRE_ENROLMENT_EXCEL);
    }, []);

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
    }, [clearPlan, t]);

    // 切換段落時寫入本地，供下次進選課 Tab 使用
    const handleTopTabStateChange = useCallback(e => {
        const state = e.data.state;
        const routeName = state?.routes?.[state.index]?.name;
        if (isCourseSegment(routeName)) {
            setLocalStorage(COURSE_TOP_TAB_STORAGE_KEY, routeName);
        }
    }, []);

    const menuProps = {
        programmeLevel,
        catalogMetadata,
        onManualUpdate: handleManualUpdate,
        onOpenSharePoint: handleOpenSharePoint,
        canClear,
        onClearPress: handleClearPlan,
    };

    const renderTabBar = useCallback(
        props => (
            <CourseTabBar
                {...props}
                programmeLevel={programmeLevel}
                catalogMetadata={catalogMetadata}
                onManualUpdate={handleManualUpdate}
                onOpenSharePoint={handleOpenSharePoint}
                canClear={canClear}
                onClearPress={handleClearPlan}
            />
        ),
        [
            catalogMetadata,
            programmeLevel,
            handleClearPlan,
            handleManualUpdate,
            handleOpenSharePoint,
            canClear,
        ],
    );

    // 分屏時課表不在導航器裡，navigateToCourseTab 的嵌套參數會原樣落在本頁：
    // route.params = { screen: 段落名, params: { add, check } }。
    // 這裡拆出段落層的 params 交給課表，讓它與手機版讀同一個 route.params 形狀。
    const timetableRoute = useMemo(
        () => ({ ...route, params: route.params?.params }),
        [route],
    );
    const timetableNavigation = useMemo(
        () => ({
            ...navigation,
            // 課表在同一次 focus 回呼裡依序消費 add 與 check，故直接清空整個段落參數；
            // 若逐鍵合併，第二次 setParams 會用同一份舊 closure 把第一次清掉的鍵寫回來
            setParams: () => navigation.setParams({ params: undefined }),
        }),
        [navigation],
    );

    return (
        <SafeAreaView
            style={{ backgroundColor: bg_color, flex: 1 }}
            edges={{ top: true }}>
            {isLarge ? (
                // 寬屏：左挑右看。兩個段落同時掛載，共用 CoursePlanProvider，
                // 左邊加課右邊課表即時重繪，不需要另外的同步機制。
                // 左欄寬度由用戶拖分隔線決定，課表吃剩下的；頂欄各自放在欄內，標題自然對齊所在欄
                <View
                    style={{ flex: 1, flexDirection: 'row' }}
                    onLayout={({ nativeEvent }) =>
                        setSplitContainerWidth(nativeEvent.layout.width)
                    }>
                    <View style={{ width: clampSearchPaneWidth(searchPaneWidth) }}>
                        <CoursePaneHeader segment="search" />
                        <What2Reg isSplitPane />
                    </View>
                    <SplitPaneDivider
                        onDragStart={handleDividerDragStart}
                        onDrag={handleDividerDrag}
                        onDragEnd={handleDividerDragEnd}
                        onReset={handleDividerReset}
                    />
                    <View
                        style={{
                            flex: 1,
                            minWidth: TIMETABLE_PANE_MIN_WIDTH,
                        }}>
                        <CoursePaneHeader
                            segment="timetable"
                            menuProps={menuProps}
                        />
                        <CourseSim
                            isSplitPane
                            route={timetableRoute}
                            navigation={timetableNavigation}
                        />
                    </View>
                </View>
            ) : initialSegment ? (
                <Tab.Navigator
                    tabBar={renderTabBar}
                    screenListeners={{
                        state: handleTopTabStateChange,
                    }}
                    screenOptions={{
                        tabBarLabelStyle: {
                            fontSize: TAB_LABEL_FONT_SIZE,
                            fontWeight: 'bold',
                        },
                        tabBarStyle: {
                            backgroundColor: bg_color,
                            height: TAB_BAR_HEIGHT,
                            overflow: 'hidden',
                            // TabBar 預設 elevation:4；本頁 Tab 僅佔左側 flex，
                            // Android 會在右側 ⋯ 交界投下垂直陰影，需關掉
                            elevation: 0,
                            shadowOpacity: 0,
                        },
                        tabBarItemStyle: {
                            minHeight: TAB_BAR_HEIGHT,
                            paddingVertical: 0,
                        },
                        tabBarContentContainerStyle: {
                            alignItems: 'center',
                            justifyContent: 'center',
                        },
                        tabBarBounces: false,
                        tabBarActiveTintColor: themeColor,
                        tabBarInactiveTintColor: black.third,
                        tabBarPressColor: bg_color,
                        tabBarIndicatorStyle: {
                            backgroundColor: themeColor,
                            width: TAB_INDICATOR_WIDTH,
                            marginHorizontal: 'auto',
                        },
                        lazy: true,
                    }}
                    initialRouteName={initialSegment}>
                    <Tab.Screen
                        name={COURSE_SEARCH_SEGMENT}
                        component={What2Reg}
                        options={{ title: t('搵課') }}
                        listeners={() => ({
                            tabPress: () => trigger(),
                        })}
                    />
                    <Tab.Screen
                        name={COURSE_TIMETABLE_SEGMENT}
                        component={CourseSim}
                        options={{
                            title: t('課表'),
                            tabBarLabel: TimetableTabLabel,
                        }}
                        listeners={() => ({
                            tabPress: () => trigger(),
                        })}
                    />
                </Tab.Navigator>
            ) : null}

            <Dialog
                isVisible={isUpdating}
                statusBarTranslucent
                overlayStyle={{ backgroundColor: bg_color }}>
                <Dialog.Loading />
            </Dialog>
        </SafeAreaView>
    );
};

/**
 * 選課頁容器：把「搵課」與「課表」收成同一個底部 Tab 的兩個段落，
 * 並在此掛上兩段落共用的排課狀態。
 */
export default function CourseTab() {
    return (
        <CoursePlanProvider>
            <CourseTabContent />
        </CoursePlanProvider>
    );
}
