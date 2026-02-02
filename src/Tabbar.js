import React from 'react';
import { Dimensions } from 'react-native';

import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/info';
import What2RegTabIndex from './pages/TabbarPages/what2Reg';
import ARKWiki from './pages/TabbarPages/arkwiki';
import ARKHarbor from './pages/TabbarPages/arkHarbor';
import CourseSim from './pages/TabbarPages/courseSim';

import { uiStyle, useTheme } from './components/ThemeContext';
import { trigger } from './utils/trigger';

import { scale, verticalScale } from 'react-native-size-matters';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { inject } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tabs = createBottomTabNavigator();

const Tabbar = () => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation(['common', 'home']);

    const isLandscape = () => {
        const { width, height } = Dimensions.get('window');
        return width > height;
    };

    // 字體大小，方便維護
    const labelFontSize = isLandscape() ? verticalScale(10) : scale(10);

    return (
        <Tabs.Navigator
            initialRouteName="NewsTabbar"
            implementation="native"
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

                // 背景色
                tabBarStyle: {
                    backgroundColor: theme.bg_color,
                    paddingBottom: insets.bottom,
                },

                // tabBarMinimizeBehavior: 'onScrollDown',
            })}
        >
            <Tabs.Screen
                name="NewsTabbar"
                component={NewsScreen}
                options={{
                    title: t('資訊'),
                    tabBarIcon: Platform.select({
                        ios: {
                            type: 'sfSymbol',
                            name: 'newspaper',
                        },
                        android: {
                            type: 'materialSymbol',
                            name: 'newspaper',
                        },
                    }),
                }}
                listeners={() => ({
                    tabPress: () => trigger(),
                })}
            />

            {/* <Tabs.Screen
                name="Wiki"
                component={ARKWiki}
                options={{
                    title: t('百科'),
                    tabBarIcon: Platform.select({
                        ios: {
                            type: 'sfSymbol',
                            name: 'doc.text',
                        },
                        android: {
                            type: 'materialSymbol',
                            name: 'description',
                        },
                    }),
                }}
                listeners={() => ({
                    tabPress: () => trigger(),
                })}
            /> */}

            <Tabs.Screen
                name="Harbor"
                component={ARKHarbor}
                options={{
                    title: t('職涯港'),
                    tabBarIcon: Platform.select({
                        ios: {
                            type: 'sfSymbol',
                            name: 'bubble.left.and.bubble.right',
                        },
                        android: {
                            type: 'materialSymbol',
                            name: 'chat',
                        },
                    }),
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
                    tabBarIcon: Platform.select({
                        ios: {
                            type: 'sfSymbol',
                            name: 'magnifyingglass',
                        },
                        android: {
                            type: 'materialSymbol',
                            name: 'search',
                        },
                    }),
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
                    tabBarIcon: Platform.select({
                        ios: {
                            type: 'sfSymbol',
                            name: 'calendar',
                        },
                        android: {
                            type: 'materialSymbol',
                            name: 'calendar_today',
                        },
                    }),
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
                    tabBarIcon: Platform.select({
                        ios: {
                            type: 'sfSymbol',
                            name: 'square.grid.2x2',
                        },
                        android: {
                            type: 'materialSymbol',
                            name: 'apps',
                        },
                    })
                }}
                listeners={() => ({
                    tabPress: () => trigger(),
                })}
            />
        </Tabs.Navigator>
    );
};

export default inject('RootStore')(Tabbar);