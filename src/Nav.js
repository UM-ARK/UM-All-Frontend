// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, {Component} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

// 本地頁面，首字母需大寫
import Tabbar from './Tabbar';

import ClubSetting from './pages/ClubSystem/CLubSetting'
import MessageConsole from './pages/ClubSystem/MessageConsole'
import EventSetting from './pages/ClubSystem/EventSetting'
import MessageSetting from './pages/ClubSystem/MessageSetting'

import ClubLogin from './pages/TabbarPages/me/pages/Login/ClubLogin'
import MeScreen from './pages/TabbarPages/me'
import MeSetting from './pages/TabbarPages/me/pages/MeSetting'
import MyFollow from './pages/TabbarPages/me/pages/MyFollow'
import AppSetting from './pages/TabbarPages/me/pages/AppSetting'
import AboutUs from './pages/TabbarPages/me/pages/AboutUs'
import UsualQuestion from './pages/TabbarPages/me/pages/UsualQuestion'

import ClubDetail from './pages/TabbarPages/news/pages/ClubDetail'
import EventDetail from './pages/TabbarPages/news/pages/EventDetail'
import NewsDetail from './pages/TabbarPages/news/pages/NewsDetail'

import ChatDetail from './pages/TabbarPages/message/ChatDetail'

import Webviewer from './components/Webviewer';
import UMWhole from './pages/Features/UMWhole';
import What2Reg from './pages/Features/What2Reg';
import Bus from './pages/Features/Bus';
import LostAndFound from './pages/Features/LostAndFound';
import CarPark from './pages/Features/CarPark';

import TestScreen from '../test/test'

// 創建一個頁面導航棧
const Stack = createStackNavigator();
// 頭部標題配置：http://www.himeizi.cn/reactnavigation/api/navigators/createStackNavigator.html#options

class Nav extends Component {
    render() {
        return (
        <NavigationContainer>
            {/* initialRouteName可以指定初始頁面的組件，headerShown可以控制頂部標題顯示 */}
            <Stack.Navigator
                initialRouteName="Tabbar"
                screenOptions={{ headerShown:false }}
                >
                <Stack.Screen name="Tabbar"         component={Tabbar} options={{headerShown:false}}/>

                {/* 資訊頁 */}
                <Stack.Screen name="ClubDetail"     component={ClubDetail} />
                <Stack.Screen name="EventDetail"     component={EventDetail} />
                <Stack.Screen name="NewsDetail"     component={NewsDetail} />

                {/* 信息頁 */}
                {/* 信息詳情 */}
                <Stack.Screen name="ChatDetail"         component={ChatDetail}/>

                {/* 我的頁 */}
                <Stack.Screen name="ClubLogin"         component={ClubLogin}/>
                <Stack.Screen name="AboutUs"         component={AboutUs}/>
                <Stack.Screen name="MyFollow"        component={MyFollow}/>
                <Stack.Screen name="MeScreen"        component={MeScreen}/>
                <Stack.Screen name="UsualQuestion"        component={UsualQuestion}/>
                {/* 設置頁 */}
                <Stack.Screen name="MeSetting"     component={MeSetting} />
                <Stack.Screen name="AppSetting"     component={AppSetting} />

                {/* 服務頁 */}
                {/* 自定義Webview */}
                <Stack.Screen name="Webviewer"     component={Webviewer} />
                {/* 澳大論壇 */}
                <Stack.Screen name="UMWhole"     component={UMWhole} />
                {/* 澳大選咩課 */}
                <Stack.Screen name="What2Reg"     component={What2Reg} />
                {/* 校園巴士報站 */}
                <Stack.Screen name="Bus"     component={Bus} />
                {/* 失物招領 */}
                <Stack.Screen name="LostAndFound"     component={LostAndFound} />
                <Stack.Screen name="CarPark"     component={CarPark} />

                {/* 社團系統 */}
                <Stack.Screen name="ClubSetting"     component={ClubSetting} />
                <Stack.Screen name="MessageConsole"     component={MessageConsole} />
                <Stack.Screen name="EventSetting"     component={EventSetting} />
                <Stack.Screen name="MessageSetting"     component={MessageSetting} />

                {/* 測試頁 */}
                <Stack.Screen name="TestScreen"     component={TestScreen} />
            </Stack.Navigator>
        </NavigationContainer>
        );
    }
}
export default Nav;