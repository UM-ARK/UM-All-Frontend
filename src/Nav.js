// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, { Component } from 'react';
import { Platform, Text } from "react-native";
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// 本地頁面，首字母需大寫
import Tabbar from './Tabbar';

import ClubSetting from './pages/ClubSystem/CLubSetting';
import ClubInfoEdit from './pages/ClubSystem/ClubInfoEdit';
import EventSetting from './pages/ClubSystem/EventSetting';
// import MessageSetting from './pages/ClubSystem/MessageSetting';
// import FollowersPage from './pages/ClubSystem/FollowersPage';
// import LoginSetting from './pages/TabbarPages/me/pages/Login/LoginSetting';

import ClubLogin from './pages/ClubSystem/login/ClubLogin';
import LoginIndex from './pages/ClubSystem/login/index';
// import MeScreen from './pages/TabbarPages/me';
// import MyFollow from './pages/TabbarPages/me/pages/MyFollow';
// import AppSetting from './pages/TabbarPages/me/pages/AppSetting';
// import FollowClub from './pages/TabbarPages/me/pages/Follow/FollowClub';
// import FollowEvent from './pages/TabbarPages/me/pages/Follow/FollowEvent';

import ClubDetail from './pages/TabbarPages/info/club/ClubDetail';
import EventDetail from './pages/TabbarPages/info/club/EventDetail';
import NewsDetail from './pages/TabbarPages/info/news/NewsDetail';
import UMEventDetail from './pages/TabbarPages/info/news/UMEventDetail';

// import ChatDetail from './pages/TabbarPages/message/ChatDetail';

import What2RegTabIndex from './pages/TabbarPages/what2Reg';
import What2RegCourse from './pages/TabbarPages/what2Reg/pages/Course';
import What2RegComment from './pages/TabbarPages/what2Reg/pages/Comment';
import What2RegNewComment from './pages/TabbarPages/what2Reg/pages/NewComment';
import What2RegRelateCourses from './pages/TabbarPages/what2Reg/pages/RelateCourses';
import What2RegProf from './pages/TabbarPages/what2Reg/pages/Prof';
import LocalCourse from './pages/TabbarPages/what2Reg/pages/LocalCourse';

import courseSimIndex from './pages/TabbarPages/courseSim';

import Webviewer from './components/Webviewer';
import AllEvents from './pages/TabbarPages/info/club/AllEvents';
import UMWhole from './pages/Features/UMWhole';
import What2Reg from './pages/Features/What2Reg';
import Bus from './pages/Features/Bus';
import LostAndFound from './pages/Features/LostAndFound';
import CarPark from './pages/Features/CarPark';

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

class Nav extends Component {
    render() {
        return !this.props.lock ? (
            <NavigationContainer>
                {/* initialRouteName可以指定初始頁面的組件，headerShown可以控制頂部標題顯示 */}
                <Stack.Navigator
                    initialRouteName="Tabbar"
                    screenOptions={{
                        headerShown: false,
                        gestureDirection: 'horizontal', gestureEnabled: true,
                        animationEnabled: true,
                        freezeOnBlur: true,
                    }}>
                    <Stack.Screen
                        name="Tabbar"
                        component={Tabbar}
                        options={{ headerShown: false }}
                        initialParams={{ setLock: this.props.setLock }}
                    />

                    {/* Modal動畫組 */}
                    <Stack.Group
                        screenOptions={{
                            presentation: Platform.select({ android: 'card', default: 'modal' }),
                            // Android可使用該選項啟用類iOS Modal動畫
                            // ...(Platform.OS === 'android' && TransitionPresets.ModalPresentationIOS),
                        }}
                    >
                        {/* TODO: 如需修改為Modal展現的時候，需到Header組件添加 iOSDIY={true} 屬性 */}
                        {/* 服務頁 */}
                        {/* 澳大論壇 */}
                        {/* <Stack.Screen name="UMWhole" component={UMWhole} /> */}
                        {/* 澳大選咩課 */}
                        {/* <Stack.Screen name="What2Reg" component={What2Reg} /> */}
                        {/* 校園巴士報站 */}
                        <Stack.Screen name="Bus" component={Bus} />
                        {/* 失物招領 */}
                        {/* <Stack.Screen name="LostAndFound" component={LostAndFound} /> */}
                        <Stack.Screen name="CarPark" component={CarPark} />

                        {/* 資訊頁 */}
                        <Stack.Screen name="ClubDetail" component={ClubDetail} />
                        <Stack.Screen name="EventDetail" component={EventDetail} />
                        <Stack.Screen name="NewsDetail" component={NewsDetail} />
                        <Stack.Screen name="UMEventDetail" component={UMEventDetail} />
                        <Stack.Screen name="AllEvents" component={AllEvents} />

                        {/* ARK選課 */}
                        {/* <Stack.Screen name="What2RegHome" component={What2RegTabIndex} />
                        <Stack.Screen name="What2RegCourse" component={What2RegCourse} />
                        <Stack.Screen name="What2RegComment" component={What2RegComment} />
                        <Stack.Screen name="What2RegNewComment" component={What2RegNewComment} />
                        <Stack.Screen name="What2RegRelateCourses" component={What2RegRelateCourses} />
                        <Stack.Screen name="What2RegProf" component={What2RegProf} /> */}
                        <Stack.Screen name="LocalCourse" component={LocalCourse} />

                        {/* 課表模擬 */}
                        {/* <Stack.Screen name="courseSimIndex" component={courseSimIndex} /> */}
                    </Stack.Group>


                    {/* 普通左右壓動畫組 */}
                    <Stack.Group>
                        {/* 自定義Webview */}
                        <Stack.Screen name="Webviewer" component={Webviewer} />

                        {/* 信息頁 */}
                        {/* 信息詳情 */}
                        {/* <Stack.Screen name="ChatDetail" component={ChatDetail} /> */}

                        {/* 我的頁 */}
                        <Stack.Screen name="LoginIndex" component={LoginIndex} />
                        <Stack.Screen name="ClubLogin" component={ClubLogin} />

                        {/* 社團系統 */}
                        <Stack.Screen name="ClubSetting" component={ClubSetting} />
                        <Stack.Screen name="ClubInfoEdit" component={ClubInfoEdit} />
                        <Stack.Screen name="EventSetting" component={EventSetting} />
                        {/* <Stack.Screen name="MessageSetting" component={MessageSetting}  /> */}
                        {/* <Stack.Screen name="FollowersPage" component={FollowersPage}  /> */}

                        {/* <Stack.Screen name="MyFollow" component={MyFollow} /> */}
                        {/* <Stack.Screen name="MeScreen" component={MeScreen} /> */}
                        {/* <Stack.Screen name="FollowClub" component={FollowClub} /> */}
                        {/* <Stack.Screen name="FollowEvent" component={FollowEvent} /> */}
                        {/* 設置頁 */}
                        {/* <Stack.Screen name="AppSetting" component={AppSetting} /> */}
                        {/* <Stack.Screen
                        name="LoginSetting"
                        component={LoginSetting}
                    /> */}
                    </Stack.Group>

                    {/* 測試頁 */}
                    <Stack.Screen name="TestScreen" component={TestScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        ) : null;
    }
}
export default Nav;
