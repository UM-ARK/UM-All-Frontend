import React from 'react';

import { trigger } from '../../../utils/trigger';
import { useTheme } from '../../../components/ThemeContext';
import HomePage from './home/index';
import NewsPage from './NewsPage';
import ClubPage from './ClubPage';
import UMEventPage from './UMEventPage';

import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { moderateScale } from 'react-native-size-matters';
import { SafeAreaView } from 'react-native-screens/experimental';
import { useTranslation } from 'react-i18next';

const Tab = createMaterialTopTabNavigator();

// 平板只需要輕微放大，避免依短邊線性縮放後令頂部 Tab 過高
const TOP_TAB_SCALE_FACTOR = 0.1;
const TAB_INDICATOR_WIDTH = moderateScale(25, TOP_TAB_SCALE_FACTOR);
const TAB_BAR_HEIGHT = moderateScale(30, TOP_TAB_SCALE_FACTOR);
// 字體在平板上保留較明顯的放大幅度，但不影響 Tab Bar 本身高度
const TAB_LABEL_FONT_SIZE = moderateScale(11, 0.3);

export default function NewsScreen() {
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t } = useTranslation(['common', 'home']);

    return (
        <SafeAreaView style={{ backgroundColor: bg_color, flex: 1 }} edges={{ top: true }}>
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
                }}
                initialRouteName="HomePage">
                <Tab.Screen
                    name="HomePage"
                    component={HomePage}
                    options={{ title: t('TOPTAB_MAIN') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}
                />
                <Tab.Screen
                    name="ClubPage"
                    component={ClubPage}
                    options={{ title: t('TOPTAB_CLUB') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}
                />
                <Tab.Screen
                    name="UMEventPage"
                    component={UMEventPage}
                    options={{ title: t('TOPTAB_EVENT') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}
                />
                <Tab.Screen
                    name="NewsPage"
                    component={NewsPage}
                    options={{ title: t('TOPTAB_NEWS') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}
                />
            </Tab.Navigator>
        </SafeAreaView>
    );
}
