import React, { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-screens/experimental';
import { useIsFocused } from '@react-navigation/native';
import { Dialog } from '@rneui/themed';
import { scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../components/AppText';
import { useTheme, uiStyle } from '../../../components/ThemeContext';
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
import What2Reg from './pages/what2Reg';
import CourseSim from './pages/courseSim';
import CourseTabBar from './components/CourseTabBar';
import { CoursePlanProvider, useCoursePlan } from './context/CoursePlanContext';
import {
    TAB_BAR_HEIGHT,
    TAB_INDICATOR_WIDTH,
    TAB_LABEL_FONT_SIZE,
} from './constants';

const Tab = createMaterialTopTabNavigator();

/**
 * 課表段落 Tab 角標：
 * - 有衝突 → 顯示衝突數
 * - 尚未選課 → 小紅點提示去排課
 *
 * 必須嵌在 tabBarLabel 上並用 absolute 疊加，不可用 tabBarBadge（會貼到 ⋯），
 * 也不可佔 flex 寬度（會擠開「課表」與底線）。
 */
const TimetableTabBadge = () => {
    const { theme } = useTheme();
    const { unread, trueWhite } = theme;
    const { conflictCount, planList } = useCoursePlan();

    if (conflictCount > 0) {
        return (
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: scale(-4),
                    right: scale(-10),
                    minWidth: scale(13),
                    paddingHorizontal: scale(3),
                    borderRadius: scale(7),
                    backgroundColor: unread,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: trueWhite,
                        fontSize: scale(8),
                        fontWeight: 'bold',
                    }}>
                    {conflictCount}
                </Text>
            </View>
        );
    }

    if (planList.length === 0) {
        return (
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: scale(-2),
                    right: scale(-6),
                    width: scale(7),
                    height: scale(7),
                    borderRadius: scale(4),
                    backgroundColor: unread,
                }}
            />
        );
    }

    return null;
};

/**
 * 「課表」標籤 + 角標（衝突數／空課表紅點）。
 *
 * @param {{ color: string }} props React Navigation 傳入的標籤色
 * @returns {React.ReactElement}
 */
const TimetableTabLabel = ({ color }) => {
    const { t } = useTranslation('common');

    return (
        <View>
            <Text
                style={{
                    ...uiStyle.defaultText,
                    color,
                    fontSize: TAB_LABEL_FONT_SIZE,
                    fontWeight: 'bold',
                }}>
                {t('課表')}
            </Text>
            <TimetableTabBadge />
        </View>
    );
};

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

    const {
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

    const renderTabBar = useCallback(
        props => (
            <CourseTabBar
                {...props}
                catalogMetadata={catalogMetadata}
                onManualUpdate={handleManualUpdate}
                onOpenSharePoint={handleOpenSharePoint}
                canClear={canClear}
                onClearPress={handleClearPlan}
            />
        ),
        [
            catalogMetadata,
            handleClearPlan,
            handleManualUpdate,
            handleOpenSharePoint,
            canClear,
        ],
    );

    return (
        <SafeAreaView
            style={{ backgroundColor: bg_color, flex: 1 }}
            edges={{ top: true }}>
            {initialSegment ? (
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
