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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AnimatedTabBarNavigator } from 'react-native-animated-nav-tab-bar';
import { inject } from 'mobx-react';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tabs = AnimatedTabBarNavigator();

const Tabbar = () => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation(['common', 'home',]);

    const isLandscape = () => {
        const { width, height } = Dimensions.get('window');
        return width > height;
    };

    // 統一圖標大小，方便維護
    const iconSize = isLandscape() ? verticalScale(18) : scale(18);

    return (
        <Tabs.Navigator
            tabBarOptions={{
                inactiveTintColor: theme.black.main,
                labelStyle: {
                    ...uiStyle.defaultText,
                    fontSize: isLandscape() ? verticalScale(10) : scale(10),
                    fontWeight: '600',
                },
                tabStyle: {
                    paddingBottom: insets.bottom,
                }
            }}
            appearance={{
                activeTabBackgrounds: `${theme.themeColor}15`,
                activeColors: theme.themeColor,
                tabBarBackground: theme.bg_color,
                whenInactiveShow: 'both',
                tabButtonLayout: 'vertical',
            }}
            initialRouteName={'NewsTabbar'}
        >
            <Tabs.Screen
                name="NewsTabbar"
                component={NewsScreen}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <MaterialCommunityIcons
                            name={focused ? "newspaper-variant" : "newspaper-variant-outline"}
                            size={iconSize}
                            color={focused ? color : theme.black.main}
                        />
                    ),
                    title: t('資訊'),
                }}
                listeners={() => ({
                    tabPress: () => trigger(),
                })}
            />

            <Tabs.Screen
                name="Wiki"
                component={ARKWiki}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <MaterialCommunityIcons
                            name={focused ? "file-document" : "file-document-outline"}
                            size={iconSize}
                            color={focused ? color : theme.black.main}
                        />
                    ),
                    title: t('百科'),
                }}
                listeners={() => ({
                    tabPress: () => trigger(),
                })}
            />

            <Tabs.Screen
                name="Harbor"
                component={ARKHarbor}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <MaterialCommunityIcons
                            name={focused ? "chat-processing" : "chat-processing-outline"}
                            size={iconSize}
                            color={focused ? color : theme.black.main}
                        />
                    ),
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
                    tabBarIcon: ({ focused, color }) => (
                        <MaterialCommunityIcons
                            name={focused ? "database-search" : "database-search-outline"}
                            size={iconSize}
                            color={focused ? color : theme.black.main}
                        />
                    ),
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
                    tabBarIcon: ({ focused, color }) => (
                        <MaterialCommunityIcons
                            name={focused ? "calendar-clock" : "calendar-clock-outline"}
                            size={iconSize}
                            color={focused ? color : theme.black.main}
                        />
                    ),
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
                    tabBarIcon: ({ focused, color }) => (
                        <MaterialCommunityIcons
                            name={focused ? "view-grid" : "view-grid-outline"}
                            size={iconSize}
                            color={focused ? color : theme.black.main}
                        />
                    ),
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
