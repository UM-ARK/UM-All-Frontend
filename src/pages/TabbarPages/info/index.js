import React, { useState, useCallback } from 'react';
import { View, Platform, Dimensions, LayoutAnimation, UIManager } from 'react-native';

import { trigger } from '../../../utils/trigger';
import { useTheme } from '../../../components/ThemeContext';
import HomePage from './home/index';
import NewsPage from './NewsPage';
import ClubPage from './ClubPage';
import UMEventPage from './UMEventPage';
import WikiPage from '../arkwiki/index';

import TabBarContext from './TabBarContext';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { scale, verticalScale } from 'react-native-size-matters';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

// Android 需要啟用 LayoutAnimation
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Tab = createMaterialTopTabNavigator();

const tabWidth = verticalScale(25);
const numOfTabs = 5;
const TAB_BAR_HEIGHT = scale(30);

export default function NewsScreen() {
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t } = useTranslation(['common', 'home']);

    // Top Tab Bar 隱藏狀態
    const [tabBarHidden, setTabBarHidden] = useState(false);

    // 帶動畫的設置方法：同時切換 Top Tabs 和 Bottom Tab Header
    const setTabBarHiddenAnimated = useCallback(hidden => {
        LayoutAnimation.configureNext(
            LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'),
        );
        setTabBarHidden(hidden);
    }, []);

    return (
        <TabBarContext.Provider value={{ setTabBarHidden: setTabBarHiddenAnimated }}>
            <SafeAreaView style={{ backgroundColor: bg_color, flex: 1 }} edges={['top']}>
                <Tab.Navigator
                    screenListeners={{
                        // 左右滑動切換 Tab 時，自動恢復 Top Tab Bar 顯示
                        state: () => {
                            if (tabBarHidden) {
                                setTabBarHiddenAnimated(false);
                            }
                        },
                    }}
                    screenOptions={{
                        tabBarLabelStyle: {
                            fontSize: verticalScale(9),
                            fontWeight: 'bold',
                        },
                        tabBarStyle: {
                            backgroundColor: bg_color,
                            minHeight: tabBarHidden ? 0 : scale(20),
                            maxHeight: tabBarHidden ? 0 : TAB_BAR_HEIGHT,
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
                    <Tab.Screen
                        name="WikiPage"
                        component={WikiPage}
                        options={{ title: t('Wiki') }}
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
        </TabBarContext.Provider>
    );
}
