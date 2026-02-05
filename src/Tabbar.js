import React, { useState, useEffect } from 'react';
import { Dimensions, Platform, View, Text, ScrollView } from 'react-native';

import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/info';
import What2RegTabIndex from './pages/TabbarPages/what2Reg';
import ARKHarbor from './pages/TabbarPages/arkHarbor';
import CourseSim from './pages/TabbarPages/courseSim';

import { uiStyle, useTheme } from './components/ThemeContext';

import { scale, verticalScale } from 'react-native-size-matters';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';

import { inject } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';

const Tabs = createNativeBottomTabNavigator();

/**
 * 獲取 Tab Bar 圖標配置
 * 使用 React Navigation 官方的 sfSymbol 格式
 * iOS: 使用 SF Symbols | Android: 使用 drawable resource
 */
const getTabBarIcon = (routeName, focused) => {
    // 根據路由名稱獲取對應的 SF Symbol 名稱
    switch (routeName) {
        case 'NewsTabbar':
            return {
                type: 'sfSymbol',
                name: focused ? 'newspaper.fill' : 'newspaper'
            };
        case 'Harbor':
            return {
                type: 'sfSymbol',
                name: focused ? 'heart.fill' : 'heart'
            };
        case 'What2RegTab':
            return {
                type: 'sfSymbol',
                name: focused ? 'magnifyingglass.circle.fill' : 'magnifyingglass.circle'
            };
        case 'CourseSimTab':
            return {
                type: 'sfSymbol',
                name: focused ? 'calendar.badge.clock' : 'calendar'
            };
        case 'FeaturesTabbar':
            return {
                type: 'sfSymbol',
                name: focused ? 'square.grid.2x2.fill' : 'square.grid.2x2'
            };
        default:
            return {
                type: 'sfSymbol',
                name: focused ? 'questionmark.circle.fill' : 'questionmark.circle'
            };
    }
};

/**
 * 獲取 Tab Bar 樣式配置
 * 支持 iOS 26+ 液態玻璃效果和自動背景色適配
 */
const getTabBarStyle = (theme) => {
    // iOS 26+：直接設置白色背景，確保可見性
    if (Platform.OS === 'ios') {
        return {
            backgroundColor: '#FFFFFF',
            borderTopWidth: 0,
        };
    }

    // Android：使用自定義背景色
    return {
        backgroundColor: theme.bg_color,
        borderTopColor: theme.isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
        borderTopWidth: 0.5,
        // Android 陰影
        elevation: 8,
    };
};

const Tabbar = () => {
    const { theme } = useTheme();
    const { t } = useTranslation(['common', 'home']);

    // 判斷是否為橫屏
    const isLandscape = () => {
        const { width, height } = Dimensions.get('window');
        return width > height;
    };

    // 字體大小
    const labelFontSize = isLandscape() ? verticalScale(10) : scale(10);

    return (
        <Tabs.Navigator
            screenOptions={({ route }) => ({
                // 標籤樣式
                tabBarLabelStyle: {
                    ...uiStyle.defaultText,
                    fontSize: labelFontSize,
                    fontWeight: '600',
                },
                // 活躍/非活躍顏色
                tabBarActiveTintColor: theme.themeColor,
                tabBarInactiveTintColor: theme.black.main,
                // Tab Bar 樣式（支持 iOS 26+ 液態玻璃）
                tabBarStyle: getTabBarStyle(theme),
                translucent: isLiquidGlassSupported ? true : false,
                // 圖標 - 使用 React Navigation 官方的 sfSymbol 格式
                tabBarIcon: ({ focused }) => getTabBarIcon(route.name, focused),
                // 隱藏標籤（橫屏時）
                tabBarShowLabel: !isLandscape(),

                tabBarMinimizeBehavior: 'onScrollDown',
            })}
            hapticFeedbackEnabled={true}
        >
            <Tabs.Screen
                name="NewsTabbar"
                component={NewsScreen}
                options={{
                    title: t('資訊'),
                }}
            />

            <Tabs.Screen
                name="Harbor"
                component={ARKHarbor}
                options={{
                    title: t('職涯港'),
                }}
            />

            <Tabs.Screen
                name="What2RegTab"
                component={What2RegTabIndex}
                options={{
                    title: t('搵課'),
                }}
            />

            <Tabs.Screen
                name="CourseSimTab"
                component={CourseSim}
                options={{
                    title: t('課表'),
                }}
            />

            <Tabs.Screen
                name="FeaturesTabbar"
                component={FeaturesScreen}
                options={{
                    title: t('服務'),
                }}
            />
        </Tabs.Navigator>
    );
};

export default inject('RootStore')(Tabbar);