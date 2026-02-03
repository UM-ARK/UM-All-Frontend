import React from 'react';
import { Dimensions, Platform, View } from 'react-native';

import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/info';
import What2RegTabIndex from './pages/TabbarPages/what2Reg';
import ARKHarbor from './pages/TabbarPages/arkHarbor';
import CourseSim from './pages/TabbarPages/courseSim';

import { uiStyle, useTheme } from './components/ThemeContext';
import { trigger } from './utils/trigger';

import { scale, verticalScale } from 'react-native-size-matters';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';

import { inject } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';

const Tabs = createNativeBottomTabNavigator();

/**
 * 獲取 Tab Bar 圖標配置
 * 使用 @bottom-tabs/react-navigation 的 sfSymbol 格式
 * iOS: 使用 SF Symbols | Android: 使用 drawable resource
 */
const getTabBarIcon = (routeName, focused) => {
    // 根據路由名稱獲取對應的 SF Symbol 名稱
    switch (routeName) {
        case 'NewsTabbar':
            return { sfSymbol: focused ? 'newspaper.fill' : 'newspaper' };
        case 'Harbor':
            return { sfSymbol: focused ? 'heart.fill' : 'heart' };
        case 'What2RegTab':
            return { sfSymbol: focused ? 'magnifyingglass.circle.fill' : 'magnifyingglass.circle' };
        case 'CourseSimTab':
            return { sfSymbol: focused ? 'calendar.badge.clock' : 'calendar' };
        case 'FeaturesTabbar':
            return { sfSymbol: focused ? 'square.grid.2x2.fill' : 'square.grid.2x2' };
        default:
            return { sfSymbol: focused ? 'questionmark.circle.fill' : 'questionmark.circle' };
    }
};

/**
 * 獲取 Tab Bar 樣式配置
 * 支持 iOS 26+ 液態玻璃效果和自動背景色適配
 */
const getTabBarStyle = (theme) => {
    // iOS 26+ 液態玻璃效果：背景透明，讓系統自動處理
    if (Platform.OS === 'ios' && isLiquidGlassSupported) {
        return {
            position: 'absolute',
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
        };
    }

    // iOS 18 及以下和 Android：使用自定義背景色
    return {
        backgroundColor: theme.bg_color,
        borderTopColor: theme.isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
        borderTopWidth: 0.5,
        // iOS 陰影
        shadowColor: theme.black.main,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        // Android 陰影
        elevation: 8,
    };
};

const Tabbar = () => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation(['common', 'home']);

    // 判斷是否為橫屏
    const isLandscape = () => {
        const { width, height } = Dimensions.get('window');
        return width > height;
    };

    // 字體大小
    const labelFontSize = isLandscape() ? verticalScale(10) : scale(10);

    // 獲取 screenOptions
    const screenOptions = ({ route }) => ({
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
        // 圖標 - 使用 @bottom-tabs/react-navigation 的 sfSymbol 格式
        tabBarIcon: ({ focused }) => getTabBarIcon(route.name, focused),
        // 隱藏標籤（橫屏時）
        tabBarShowLabel: !isLandscape(),
    });

    return (
        <Tabs.Navigator screenOptions={screenOptions}>
            <Tabs.Screen
                name="NewsTabbar"
                component={NewsScreen}
                options={{
                    title: t('資訊'),
                }}
                listeners={() => ({
                    tabPress: () => trigger(),
                })}
            />

            <Tabs.Screen
                name="Harbor"
                component={ARKHarbor}
                options={{
                    title: t('職涯港'),
                }}
                listeners={() => ({
                    tabPress: async () => trigger(),
                })}
            />

            <Tabs.Screen
                name="What2RegTab"
                component={What2RegTabIndex}
                options={{
                    title: t('搵課'),
                }}
                listeners={() => ({
                    tabPress: () => trigger(),
                })}
            />

            <Tabs.Screen
                name="CourseSimTab"
                component={CourseSim}
                options={{
                    title: t('課表'),
                }}
                listeners={() => ({
                    tabPress: () => trigger(),
                })}
            />

            <Tabs.Screen
                name="FeaturesTabbar"
                component={FeaturesScreen}
                options={{
                    title: t('服務'),
                }}
                listeners={() => ({
                    tabPress: () => trigger(),
                })}
            />
        </Tabs.Navigator>
    );
};

export default inject('RootStore')(Tabbar);
