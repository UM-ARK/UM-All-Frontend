// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, { Component } from 'react';
import { Platform, Text } from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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

import TestScreen from './test/test';

// 創建一個頁面導航棧
const Stack = Platform.select({
    android: createStackNavigator(),
    default: createNativeStackNavigator()
});
// 頭部標題配置：http://www.himeizi.cn/reactnavigation/api/navigators/createStackNavigator.html#options

Text.defaultProps = {
    allowFontScaling: false
};

const Nav = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                initialRouteName="Tabbar"
                screenOptions={{
                    headerShown: false,
                    gestureDirection: 'horizontal',
                    gestureEnabled: true,
                    animationEnabled: true,
                    freezeOnBlur: true,
                }}
            >
                <Stack.Screen
                    name="Tabbar"
                    component={Tabbar}
                    options={{ headerShown: false }}
                />

                {/* Modal動畫組 */}
                <Stack.Group
                    screenOptions={{
                        presentation: Platform.select({
                            android: 'card',
                            ios: Platform.isPad ? 'card' : 'modal',
                        }),
                        // Android可使用該選項啟用類iOS Modal動畫
                        // ...(Platform.OS === 'android' && TransitionPresets.ModalPresentationIOS),
                    }}
                >
                    {/* TODO: 如需修改為Modal展現的時候，需到Header組件添加 iOSDIY={true} 屬性 */}
                    {/* 服務頁 */}
                    <Stack.Screen name="Bus" component={Bus} />
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
                <Stack.Group>
                    <Stack.Screen name="Webviewer" component={Webviewer} />
                </Stack.Group>

                {/* 測試頁 */}
                <Stack.Screen name="TestScreen" component={TestScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Nav;