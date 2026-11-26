import React, { useCallback } from 'react';
import { View } from 'react-native';

import { trigger } from '../../../utils/trigger';
import { useTheme } from '../../../components/ThemeContext';
import TopTabLabel from '../../../components/TopTabLabel';
import HomePage from './home/index';
import ClubPage from './ClubPage';
import CampusPage from './CampusPage';

import { createMaterialTopTabNavigator, MaterialTopTabBar } from '@react-navigation/material-top-tabs';
import { moderateScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const Tab = createMaterialTopTabNavigator();

// 平板只需要輕微放大，避免依短邊線性縮放後令頂部 Tab 過高
const TOP_TAB_SCALE_FACTOR = 0.1;
const TAB_INDICATOR_WIDTH = moderateScale(25, TOP_TAB_SCALE_FACTOR);
const TAB_BAR_HEIGHT = moderateScale(30, TOP_TAB_SCALE_FACTOR);

export default function NewsScreen() {
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t } = useTranslation(['common', 'home']);
    const { top } = useSafeAreaInsets();
    const topChromeHeight = top + TAB_BAR_HEIGHT;
    const renderTopTabBar = useCallback(props => (
        <View
            pointerEvents="box-none"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, paddingTop: top }}>
            <MaterialTopTabBar {...props} />
        </View>
    ), [top]);

    return (
        <View style={{ backgroundColor: bg_color, flex: 1 }}>
            <Tab.Navigator
                tabBar={renderTopTabBar}
                screenOptions={{
                    sceneStyle: { backgroundColor: bg_color },
                    tabBarLabel: TopTabLabel,
                    tabBarStyle: {
                        backgroundColor: 'transparent',
                        height: TAB_BAR_HEIGHT,
                        overflow: 'hidden',
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
                    tabBarActiveTintColor: black.second,
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
                    name="ClubPage"
                    options={{ title: t('TOPTAB_CLUB') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}>
                    {props => <ClubPage {...props} topChromeHeight={topChromeHeight} />}
                </Tab.Screen>
                <Tab.Screen
                    name="HomePage"
                    options={{ title: t('TOPTAB_MAIN') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}>
                    {props => <HomePage {...props} topChromeHeight={topChromeHeight} />}
                </Tab.Screen>
                <Tab.Screen
                    name="CampusPage"
                    options={{ title: t('TOPTAB_CAMPUS') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}>
                    {props => <CampusPage {...props} topChromeHeight={topChromeHeight} />}
                </Tab.Screen>
            </Tab.Navigator>
        </View>
    );
}
