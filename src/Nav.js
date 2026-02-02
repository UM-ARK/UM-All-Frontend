// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, { useCallback, useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button, HeaderBackButton, useHeaderHeight } from '@react-navigation/elements';
import { useTheme } from './components/ThemeContext';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { BlurView } from 'expo-blur';

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

const Nav = () => {
    const navigationRef = useNavigationContainerRef();
    const { theme } = useTheme();
    const { bg_color, black } = theme;

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
                    screenOptions={{
                        presentation: Platform.select({
                            android: 'card',
                            ios: Platform.isPad ? 'card' : 'modal',
                        }),
                        // animation: 'slide_from_bottom',
                        gestureEnabled: true,
                        headerShown: true,
                        headerTitleAlign: 'center',
                        headerTitle: '',
                        headerTintColor: black.main,              // 箭頭與文字顏色（使用系統樣式）[web:4]
                        // headerShadowVisible: false,           // 移除底部陰影，更貼近 iOS 26 扁平風格 [web:4]
                        // headerBackTitleVisible: false,        // 隱藏返回文字，只留箭頭（iOS）[web:8]
                        // iOS 26 原生返回按鈕配置
                        headerBackButtonMenuEnabled: false,   // 禁用返回按鈕長按菜單
                        headerBackButtonDisplayMode: 'minimal', // 只顯示返回圖標，不顯示文字
                        // 根據是否支持液態玻璃效果設置導航欄樣式
                        // headerTransparent: isLiquidGlassSupported,
                        headerBackground: isLiquidGlassSupported ? undefined : (() => (
                            <View style={{ flex: 1, backgroundColor: bg_color }} />
                        )),
                    }}
                >
                    {/* 服務頁 */}
                    <Stack.Screen name="Bus" component={Bus}
                        options={({ navigation, route }) => ({
                            headerTransparent: true,
                            headerTitle: '',
                            headerBackButtonMenuEnabled: false,
                            headerBackButtonDisplayMode: 'minimal',
                            headerBackTitleVisible: false,
                            headerLeft: (props) => (
                                <HeaderBackButton
                                    {...props}
                                    onPress={() => navigation.goBack()}
                                    label=''
                                />
                            ),
                        })}
                    />
                    <Stack.Screen name="CarPark" component={CarPark} />
                    <Stack.Screen name="UMOrg" component={UMOrg} />

                    {/* 資訊頁 */}
                    <Stack.Screen name="ClubDetail" component={ClubDetail} />
                    <Stack.Screen name="EventDetail" component={EventDetail} />
                    <Stack.Screen name="NewsDetail" component={NewsDetail} />
                    <Stack.Screen name="UMEventDetail" component={UMEventDetail} />
                    <Stack.Screen name="AllEvents" component={AllEvents} />

                    {/* ARK選課 */}
                    <Stack.Screen name="LocalCourse" component={LocalCourse} />
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
