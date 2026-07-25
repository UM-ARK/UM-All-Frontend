import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { SafeAreaView } from 'react-native-screens/experimental';
import { useIsFocused } from '@react-navigation/native';
import { Dialog } from '@rneui/themed';
import { moderateScale, scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { useTheme, uiStyle } from '../../../components/ThemeContext';
import { trigger } from '../../../utils/trigger';
import { openLink } from '../../../utils/browser';
import { checkCloudCourseVersion } from '../../../utils/checkCoursesKits';
import { UM_PRE_ENROLMENT_EXCEL } from '../../../utils/pathMap';
import {
    COURSE_SEARCH_SEGMENT,
    COURSE_TIMETABLE_SEGMENT,
} from '../../../utils/courseNavigation';
import What2Reg from '../what2Reg';
import CourseSim from '../courseSim';
import CourseTabHeader from './components/CourseTabHeader';
import { CoursePlanProvider, useCoursePlan } from './context/CoursePlanContext';

const Tab = createMaterialTopTabNavigator();

// 與 info/index.js 的頂部 Tab 保持同一組尺寸參數，避免兩個 Tab 頁高度不一致
const TOP_TAB_SCALE_FACTOR = 0.1;
const TAB_INDICATOR_WIDTH = moderateScale(25, TOP_TAB_SCALE_FACTOR);
const TAB_BAR_HEIGHT = moderateScale(30, TOP_TAB_SCALE_FACTOR);
const TAB_LABEL_FONT_SIZE = moderateScale(11, 0.3);

/**
 * 課表段落 Tab 上的衝突數角標。
 *
 * 衝突狀態掛在段落 Tab 而非底部 Tab：Provider 只包住 CourseTab，
 * 底部 Tab 在 Provider 之外讀不到；標在課表段落也更直接指向出問題的地方。
 */
const ConflictBadge = () => {
    const { theme } = useTheme();
    const { unread, trueWhite } = theme;
    const { conflictCount } = useCoursePlan();

    if (conflictCount === 0) {
        return null;
    }

    return (
        <View
            style={{
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
};

const renderConflictBadge = () => <ConflictBadge />;

/**
 * 選課頁內容：固定 header + 兩個段落。
 *
 * 必須是 CoursePlanProvider 的子層，因為 header 的清空要動共享排課狀態。
 */
const CourseTabContent = () => {
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t } = useTranslation(['common', 'catalog', 'timetable']);
    const isFocused = useIsFocused();

    const {
        courseVersion,
        planList,
        clearPlan,
        initCourseData,
        refreshCourseData,
    } = useCoursePlan();

    const [isUpdating, setIsUpdating] = useState(false);

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

    const handleManualUpdate = useCallback(async () => {
        setIsUpdating(true);
        try {
            await checkCloudCourseVersion();
            await initCourseData();
        } catch (error) {
            Alert.alert('ARK Courses error, 請聯繫開發者！', String(error));
        } finally {
            setIsUpdating(false);
        }
    }, [initCourseData]);

    const handleOpenSharePoint = useCallback(() => {
        openLink(UM_PRE_ENROLMENT_EXCEL);
    }, []);

    const handleClearPlan = useCallback(() => {
        Alert.alert(
            '',
            t('確定清空當前模擬課表？', { ns: 'timetable' }),
            [
                {
                    text: t('確定清空', { ns: 'timetable' }),
                    onPress: () => {
                        trigger();
                        clearPlan();
                    },
                    style: 'destructive',
                },
                { text: t('取消', { ns: 'timetable' }) },
            ],
            { cancelable: true },
        );
    }, [clearPlan, t]);

    return (
        <SafeAreaView
            style={{ backgroundColor: bg_color, flex: 1 }}
            edges={{ top: true }}>
            <CourseTabHeader
                title={t('選課')}
                courseVersion={courseVersion}
                onManualUpdate={handleManualUpdate}
                onOpenSharePoint={handleOpenSharePoint}
                onClearPlan={handleClearPlan}
                canClearPlan={planList.length > 0}
            />

            <Tab.Navigator
                screenOptions={{
                    tabBarLabelStyle: {
                        fontSize: TAB_LABEL_FONT_SIZE,
                        fontWeight: 'bold',
                    },
                    tabBarStyle: {
                        backgroundColor: bg_color,
                        height: TAB_BAR_HEIGHT,
                        overflow: 'hidden',
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
                    // 課表段落本身要橫向滑動看星期，開啟滑動切換會與它搶手勢
                    swipeEnabled: false,
                }}
                initialRouteName={COURSE_SEARCH_SEGMENT}>
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
                        tabBarBadge: renderConflictBadge,
                    }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}
                />
            </Tab.Navigator>

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
