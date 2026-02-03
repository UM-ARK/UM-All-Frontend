// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, { useCallback, useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button, HeaderBackButton, useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from './components/ThemeContext';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { BlurView } from 'expo-blur';
import { trigger } from './utils/trigger';
import { useTranslation } from 'react-i18next';

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

import TestScreen from './test/test';

const Stack = createNativeStackNavigator();

Text.defaultProps = {
    allowFontScaling: false,
};

// 創建通用 Header 配置
const createHeaderOptions = (theme) => {
    const { bg_color, black } = theme;

    return {
        headerShown: true,
        headerTitleAlign: 'center',
        headerTintColor: black.main,
        headerBackButtonDisplayMode: 'minimal',
        headerBackButtonMenuEnabled: false,

        // iOS 26+ 液態玻璃效果
        headerTransparent: isLiquidGlassSupported,
        headerBlurEffect: isLiquidGlassSupported ? null : 'systemThinMaterial',
        // Fallback 背景
        headerBackground: isLiquidGlassSupported ? null : (() => (
            <View style={{ flex: 1, backgroundColor: bg_color }} />
        )),
    };
};

const Nav = () => {
    const navigationRef = useNavigationContainerRef();
    const { theme } = useTheme();
    const { t } = useTranslation(['features']);

    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
                initialRouteName="Tabbar"
                screenOptions={{
                    headerShown: false,
                    gestureDirection: 'horizontal',
                    gestureEnabled: true,
                    animation: 'default',
                    freezeOnBlur: true,
                    animationTypeForReplace: 'push',
                    headerBackButtonMenuEnabled: false,
                }}
            >
                <Stack.Screen
                    name="Tabbar"
                    component={Tabbar}
                    options={{ headerShown: false }}
                />

                {/* 服務頁保持原有 Modal 配置 */}
                <Stack.Group
                    screenOptions={({ navigation }) => ({
                        ...createHeaderOptions(theme),
                        presentation: Platform.select({
                            android: 'card',
                            ios: Platform.isPad ? 'card' : 'modal',
                        }),
                        gestureEnabled: true,
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
                    <Stack.Screen name="Bus" component={Bus}
                        options={{
                            headerTitle: t('校園巴士', { ns: 'features' }),
                            headerBlurEffect: null,
                        }}
                    />
                    <Stack.Screen name="CarPark" component={CarPark}
                        options={{
                            headerTitle: t('車位', { ns: 'features' }),
                        }}
                    />
                    <Stack.Screen name="UMOrg" component={UMOrg}
                        options={{
                            headerTitle: t('澳大部門', { ns: 'features' }),
                        }}
                    />


                    {/* 資訊頁 */}
                    <Stack.Screen name="ClubDetail" component={ClubDetail}
                        options={{
                            headerTitle: '',
                        }}
                    />
                    <Stack.Screen name="EventDetail" component={EventDetail} />
                    <Stack.Screen name="NewsDetail" component={NewsDetail} />
                    <Stack.Screen name="UMEventDetail" component={UMEventDetail}
                        options={{
                            headerTransparent: true,
                            headerBackground: undefined,
                        }}
                    />
                    <Stack.Screen name="AllEvents" component={AllEvents} />

                    {/* ARK選課 */}
                    <Stack.Screen name="LocalCourse" component={LocalCourse}
                        options={{
                            headerTitle: '',
                        }}
                    />
                </Stack.Group>

                {/* 普通左右壓動畫組 */}
                <Stack.Group
                    screenOptions={{
                        animation: 'default',
                        gestureEnabled: true,
                    }}
                >
                    <Stack.Screen name="Webviewer" component={Webviewer} />
                    <Stack.Screen name="SettingPage" component={SettingPage} />
                </Stack.Group>

                {/* 測試頁 */}
                <Stack.Screen name="TestScreen" component={TestScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Nav;
