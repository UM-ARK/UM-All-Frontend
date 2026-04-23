import React from 'react';
import { View, Platform, Dimensions } from 'react-native';

import { trigger } from '../../../utils/trigger';
import { useTheme } from '../../../components/ThemeContext';
import HomePage from './home/index';
import NewsPage from './NewsPage';
import ClubPage from './ClubPage';
import UMEventPage from './UMEventPage';
import WikiPage from '../arkwiki/index';

import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { scale, verticalScale } from 'react-native-size-matters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const Tab = createMaterialTopTabNavigator();

const tabWidth = verticalScale(25);
const numOfTabs = 4;
const TAB_BAR_HEIGHT = scale(30);

export default function NewsScreen() {
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t } = useTranslation(['common', 'home']);

    return (
        <SafeAreaView style={{ backgroundColor: bg_color, flex: 1 }} edges={['top']}>
            <Tab.Navigator
                screenOptions={{
                    tabBarLabelStyle: {
                        fontSize: verticalScale(9),
                        fontWeight: 'bold',
                    },
                    tabBarStyle: {
                        backgroundColor: bg_color,
                        height: TAB_BAR_HEIGHT,
                        overflow: 'hidden',
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
                        marginLeft:
                            (Dimensions.get('window').width / numOfTabs -
                                tabWidth) /
                            2,
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
                    {/* <Tab.Screen
                        name="WikiPage"
                        component={WikiPage}
                        options={{ title: t('Wiki') }}
                        listeners={() => ({
                            tabPress: () => trigger(),
                        })}
                    /> */}
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
