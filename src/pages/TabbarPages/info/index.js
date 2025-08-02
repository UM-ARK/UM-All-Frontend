import React, { useContext } from 'react';
import { View, Platform, Dimensions } from 'react-native';

import { trigger } from '../../../utils/trigger';
import { useTheme } from '../../../components/ThemeContext';
import HomePage from './home/index';
import NewsPage from './NewsPage';
import ClubPage from './ClubPage';
import UMEventPage from './UMEventPage';
import AboutPage from './AboutPage';

import { Header } from '@rneui/themed';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { scale, verticalScale } from 'react-native-size-matters';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { t } from 'i18next';

const Tab = createMaterialTopTabNavigator();

const tabWidth = verticalScale(25);
const numOfTabs = 5;

export default function NewsScreen() {
    const insets = useContext(SafeAreaInsetsContext);
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;

    return (
        <View style={{ backgroundColor: bg_color, flex: 1 }}>
            <Header
                backgroundColor={bg_color}
                statusBarProps={{
                    backgroundColor: 'transparent',
                    barStyle: theme.barStyle,
                }}
                containerStyle={{
                    height: Platform.select({
                        android: scale(38),
                        default: insets?.top || 0,
                    }),
                    paddingTop: 0,
                    borderBottomWidth: 0,
                }}
            />
            <Tab.Navigator
                screenOptions={{
                    tabBarLabelStyle: {
                        fontSize: verticalScale(9),
                        fontWeight: 'bold',
                    },
                    tabBarStyle: {
                        backgroundColor: bg_color,
                        minHeight: scale(20),
                        maxHeight: scale(30),
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
                        width: tabWidth,
                        left: (Dimensions.get('window').width / numOfTabs - tabWidth) / 2,
                    },
                    lazy: true,
                }}
                initialRouteName="HomePage"
            >
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
                <Tab.Screen
                    name="AboutPage"
                    component={AboutPage}
                    options={{ title: t('TOPTAB_ABOUT') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}
                />
            </Tab.Navigator>
        </View>
    );
};