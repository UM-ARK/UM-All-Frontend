// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, { useCallback, useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef, createStaticNavigation, DefaultTheme, } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button, HeaderBackButton, useHeaderHeight } from '@react-navigation/elements';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { BlurView } from 'expo-blur';
import { trigger } from './utils/trigger';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 本地頁面，首字母需大寫
import Tabbar from './Tabbar';

import ClubDetail from './pages/TabbarPages/info/club/ClubDetail';
import EventDetail from './pages/TabbarPages/info/club/EventDetail';
import NewsDetail from './pages/TabbarPages/info/news/NewsDetail';
import UMEventDetail from './pages/TabbarPages/info/news/UMEventDetail';

import LocalCourse from './pages/TabbarPages/what2Reg/pages/LocalCourse';

import Webviewer from './components/Webviewer';
import AllEvents from './pages/TabbarPages/info/club/AllEvents';
import Bus from './pages/Features/Bus';
import CarPark from './pages/Features/CarPark';
import UMOrg from './pages/Features/UMOrg';
import SettingPage from './pages/TabbarPages/SettingPage';
import { useTheme } from './components/ThemeContext';

const Stack = createNativeStackNavigator();

const Nav = () => {
    const { theme } = useTheme();
    const { bg_color, black } = theme;
    const { t } = useTranslation(['common', 'features', 'event']);
    const navigationRef = useNavigationContainerRef();

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
                initialRouteName="Tabbar"
                screenOptions={{
                    freezeOnBlur: true,
                    headerTransparent: isLiquidGlassSupported ? true : false,
                    headerTitleAlign: 'center',
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackButtonMenuEnabled: false,
                    gestureEnabled: true,
                    headerTintColor: black.main,
                }}
            >
                <Stack.Screen name="Tabbar" component={Tabbar} options={{ headerShown: false }} />

                {/* 服務頁保持原有 Modal 配置 */}
                <Stack.Group
                    screenOptions={({ navigation }) => ({
                        presentation: Platform.select({
                            android: 'card',
                            ios: Platform.isPad ? 'card' : 'modal',
                        }),
                        headerLeft: (props) => (
                            <HeaderBackButton
                                {...props}
                                onPress={() => {
                                    trigger();
                                    navigation.goBack();
                                }}
                                label=''
                            />
                        ),
                    })}
                >
                    {/* 服務頁 */}
                    <Stack.Screen name="Bus" component={Bus} options={{ headerTitle: t('校園巴士', { ns: 'features' }) }} />
                    <Stack.Screen name="CarPark" component={CarPark} options={{ headerTitle: t('車位', { ns: 'features' }) }} />
                    <Stack.Screen name="UMOrg" component={UMOrg} options={{ headerTitle: t('澳大部門', { ns: 'features' }) }} />


                    {/* 資訊頁 */}
                    <Stack.Screen name="ClubDetail" component={ClubDetail} options={{ headerTitle: '', }} />
                    <Stack.Screen name="EventDetail" component={EventDetail} />
                    <Stack.Screen name="NewsDetail" component={NewsDetail} />
                    <Stack.Screen name="UMEventDetail" component={UMEventDetail} options={{ headerTitle: '' }} />
                    <Stack.Screen name="AllEvents" component={AllEvents} />

                    {/* ARK選課 */}
                    <Stack.Screen name="LocalCourse" component={LocalCourse} options={{ headerTitle: '', }} />
                </Stack.Group>

                {/* 普通左右壓動畫組 */}
                <Stack.Group
                    screenOptions={{
                    }}
                >
                    <Stack.Screen name="Webviewer" component={Webviewer} />
                    <Stack.Screen name="SettingPage" component={SettingPage} options={{ headerTitle: t('設置') }} />
                </Stack.Group>
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Nav;