// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, {Component} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

// 本地工具
import {pxToDp} from './utils/stylesKits';
import {COLOR_DIY} from './utils/uiMap';

// 本地頁面，首字母需大寫
import Tabbar from './Tabbar';
import MeSetting from './pages/TabbarPages/me/pages/MeSetting'
import AppSetting from './pages/TabbarPages/me/pages/AppSetting'

import ClubDetail from './pages/TabbarPages/news/pages/ClubDetail'
import EventDetail from './pages/TabbarPages/news/pages/EventDetail'

import SportFacility from './pages/Features/SportFacility';
import Map from './pages/Features/Map';
import UMWhole from './pages/Features/UMWhole';
import What2Reg from './pages/Features/What2Reg';
import Scholarship from './pages/Features/Scholarship';
import Exchange from './pages/Features/Exchange';

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

                {/* 我的頁 */}
                {/* 設置頁 */}
                <Stack.Screen name="MeSetting"     component={MeSetting} />
                <Stack.Screen name="AppSetting"     component={AppSetting} />

                {/* 服務頁 */}
                {/* 體育設施 */}
                <Stack.Screen name="SportFacility"     component={SportFacility} />
                {/* 校園地圖 */}
                <Stack.Screen name="Map"     component={Map} />
                {/* 澳大獎學金 */}
                <Stack.Screen name="Scholarship"     component={Scholarship} />
                {/* 澳大交流 */}
                <Stack.Screen name="Exchange"     component={Exchange} />
                {/* 澳大論壇 */}
                <Stack.Screen name="UMWhole"     component={UMWhole} />
                {/* 澳大選咩課 */}
                <Stack.Screen name="What2Reg"     component={What2Reg} />

                {/* 測試頁 */}
                <Stack.Screen name="TestScreen"     component={TestScreen} />
            </Stack.Navigator>
        </NavigationContainer>
        );
    }
}
export default Nav;