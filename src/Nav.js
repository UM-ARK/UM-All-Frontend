// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, {Component} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

// 本地工具
import {pxToDp} from './utils/stylesKits';
import {COLOR_DIY} from './utils/uiMap';

// 本地頁面，首字母需大寫
import Tabbar from './Tabbar';
import HomeScreen from './pages/TabbarPages/home';
import FeaturesScreen from './pages/TabbarPages/features';
import MeScreen from './pages/TabbarPages/me';

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
                <Stack.Screen name="HomeScreen"     component={HomeScreen} />
                <Stack.Screen name="FeaturesScreen" component={FeaturesScreen} />
                <Stack.Screen name="MeScreen"       component={MeScreen} />
                <Stack.Screen name="TestScreen"     component={TestScreen} options={{title:'測試頁'}}/>

            </Stack.Navigator>
        </NavigationContainer>
        );
    }
}
export default Nav;