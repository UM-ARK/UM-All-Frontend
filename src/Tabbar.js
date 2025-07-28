import React, { useEffect } from 'react';
import { Alert, DeviceEventEmitter, } from "react-native";

import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/info';
import What2RegTabIndex from './pages/TabbarPages/what2Reg';
import ARKWiki from './pages/TabbarPages/arkwiki';
import ARKHarbor from './pages/TabbarPages/arkHarbor';
import CourseSim from './pages/TabbarPages/courseSim';

import { uiStyle, useTheme } from './components/ThemeContext';
import { trigger } from './utils/trigger';
import { openLink } from './utils/browser';
import { ARK_HARBOR } from './utils/pathMap';

import { scale } from 'react-native-size-matters';
import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AnimatedTabBarNavigator } from 'react-native-animated-nav-tab-bar';
import { inject } from 'mobx-react';
import { t } from 'i18next';
import { logToFirebase } from './utils/firebaseAnalytics';
import AsyncStorage, { useAsyncStorage, } from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const Tabs = AnimatedTabBarNavigator();

const Tabbar = () => {
    const { theme } = useTheme();

    const askHarborSetting = () => {
        const { getItem, setItem } = useAsyncStorage('ARK_Harbor_Setting');

        Alert.alert(
            t("默認打開方式", { ns: 'harbor' }),
            `(${t("您可以隨時長按修改", { ns: 'harbor' })})\n${t("Webview：APP內嵌論壇(無法自動登錄、微軟登錄可能失效)", { ns: 'harbor' })}\n${t("Browser(Default)：在瀏覽器中打開論壇", { ns: 'harbor' })}`,
            [
                {
                    text: 'Browser(Default)',
                    onPress: async () => {
                        await setItem(JSON.stringify({ ...settings, tabbarMode: 'browser' }));
                        const settings = await getItem();
                        // console.log('ARK_Harbor_Setting設置為', settings);

                        Toast.show({
                            type: 'arkToast',
                            text1: 'Set browser mode',
                            topOffset: scale(100),
                            onPress: () => Toast.hide(),
                        });

                        logToFirebase('openPage', { page: 'harbor_browser' });
                        openLink({ URL: ARK_HARBOR, mode: 'fullScreen' });
                    },
                },
                {
                    text: 'Webview(App內嵌)',
                    onPress: async () => {
                        await setItem(JSON.stringify({ ...settings, tabbarMode: 'webview' }));
                        const settings = await getItem();
                        // console.log('ARK_Harbor_Setting設置為', settings);
                        Toast.show({
                            type: 'arkToast',
                            text1: 'Set webview mode',
                            topOffset: scale(100),
                            onPress: () => Toast.hide(),
                        });
                    },
                },
                {
                    text: 'Refresh to Webview Homepage',
                    onPress: () => {
                        DeviceEventEmitter.emit('harborGoHome')
                    },
                },
            ],
        );
    }

    return (
        <Tabs.Navigator
            tabBarOptions={{
                inactiveTintColor: theme.black.main,
                labelStyle: {  // 這裡設定label的字體大小
                    ...uiStyle.defaultText,
                    fontSize: scale(10),
                },
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
                name="Harbor"
                component={ARKHarbor}
                options={{
                    tabBarIcon: ({ focused, color }) => (
                        <MaterialCommunityIcons
                            name="forum-outline"
                            size={scale(18)}
                            color={focused ? color : theme.black.main}
                            focused={focused}
                        />
                    ),
                    title: t('論壇'),
                }}
                listeners={() => ({
                    tabPress: async () => {
                        trigger();
                        const { getItem, setItem } = useAsyncStorage('ARK_Harbor_Setting');
                        const harborSettingStr = await getItem();

                        if (harborSettingStr == null) {
                            askHarborSetting();
                        } else {
                            const harborSetting = harborSettingStr ? JSON.parse(harborSettingStr) : {};
                            // 存在設定，並且是browser模式
                            if (harborSetting.tabbarMode === 'browser') {
                                openLink({ URL: ARK_HARBOR, mode: 'fullScreen' });
                            }
                        }
                    },
                    tabLongPress: async () => {
                        // const { getItem, setItem } = useAsyncStorage('ARK_Harbor_Setting');
                        // const harborSettingStr = await getItem();
                        // console.log('harborSettingStr', harborSettingStr);

                        // 長按進入設定
                        askHarborSetting();
                    }
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
