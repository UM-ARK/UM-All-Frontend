import React from 'react';

import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/info';
import What2RegTabIndex from './pages/TabbarPages/what2Reg';
import ARKWiki from './pages/TabbarPages/arkwiki';
import CourseSim from './pages/TabbarPages/courseSim';

import { useTheme } from './components/ThemeContext';
import { trigger } from './utils/trigger';

import { scale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AnimatedTabBarNavigator } from 'react-native-animated-nav-tab-bar';
import { inject } from 'mobx-react';
import { t } from 'i18next';

const Tabs = AnimatedTabBarNavigator();

const Tabbar = () => {
    const { theme } = useTheme();
    return (
        <Tabs.Navigator
            tabBarOptions={{
                inactiveTintColor: theme.black.main,
            }}
            appearance={{
                activeTabBackgrounds: theme.themeColor,
                activeColors: theme.white,
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
                        <Icon
                            name="pie-chart"
                            size={scale(15)}
                            color={focused ? color : theme.black.main}
                            focused={focused}
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
                            name="file-document-edit-outline"
                            size={scale(18)}
                            color={focused ? color : theme.black.main}
                            focused={focused}
                        />
                    ),
                    title: t('百科'),
                }}
                listeners={() => ({
                    tabPress: () => trigger(),
                })}
            />

            <Tabs.Screen
                name="What2RegTab"
                component={What2RegTabIndex}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <MaterialCommunityIcons
                            name="database-search-outline"
                            size={scale(18)}
                            color={focused ? color : theme.black.main}
                            focused={focused}
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
                            name="table-clock"
                            size={scale(18)}
                            color={focused ? color : theme.black.main}
                            focused={focused}
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
                        <Icon
                            name="grid"
                            size={scale(15)}
                            color={focused ? color : theme.black.main}
                            focused={focused}
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
