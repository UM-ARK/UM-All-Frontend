// Web / 桌面版底部 Tab：只掛「組織活動」「選課」「服務」三個分頁
// Metro 在 web 平台自動優先選用 .web.js，手機端仍走 Tabbar.js
import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { useTranslation } from 'react-i18next';

import { useTheme, uiStyle } from './components/ThemeContext';
import ClubPage from './pages/TabbarPages/info/ClubPage';
import CourseTab from './pages/TabbarPages/course';
import FeaturesScreen from './pages/TabbarPages/features';

const Tabs = createBottomTabNavigator();

const TAB_ICON_SIZE = 24;
const TAB_BAR_HEIGHT = 56;
const TAB_LABEL_FONT_SIZE = 11;

// 分頁配置（插入順序決定由左至右排列）；名稱與手機端保持一致，方便頁面內 navigate
const tabConfig = {
    ClubTabbar: {
        component: ClubPage,
        title: '組織活動',
        icon: 'account-group',
    },
    CourseTab: {
        component: CourseTab,
        title: '選課',
        icon: 'book-open-page-variant',
    },
    FeaturesTabbar: {
        component: FeaturesScreen,
        title: '服務',
        icon: 'view-grid',
    },
};

const Tabbar = () => {
    const { theme } = useTheme();
    const { t } = useTranslation(['common', 'home']);

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg_color }}>
            <Tabs.Navigator
                initialRouteName="CourseTab"
                screenOptions={{
                    headerShown: false,
                    tabBarLabelStyle: {
                        ...uiStyle.defaultText,
                        fontSize: TAB_LABEL_FONT_SIZE,
                        fontWeight: '600',
                    },
                    tabBarActiveTintColor: theme.themeColor,
                    tabBarInactiveTintColor: theme.black.main,
                    tabBarStyle: {
                        backgroundColor: theme.bg_color,
                        borderTopColor: theme.isLight
                            ? 'rgba(0,0,0,0.1)'
                            : 'rgba(255,255,255,0.1)',
                        borderTopWidth: 0.5,
                        height: TAB_BAR_HEIGHT,
                    },
                }}>
                {Object.entries(tabConfig).map(([name, config]) => (
                    <Tabs.Screen
                        key={name}
                        name={name}
                        component={config.component}
                        options={{
                            title: t(config.title),
                            tabBarIcon: ({ focused, color }) => (
                                <MaterialCommunityIcons
                                    name={focused ? config.icon : `${config.icon}-outline`}
                                    size={TAB_ICON_SIZE}
                                    color={color}
                                />
                            ),
                        }}
                    />
                ))}
            </Tabs.Navigator>
        </View>
    );
};

export default Tabbar;
