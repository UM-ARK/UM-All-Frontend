import React, {Component} from 'react';
import {Text, View} from 'react-native';

// 本地引用
import HomeScreen from './pages/TabbarPages/home';
import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/news';
import MessageScreen from './pages/TabbarPages/message';
import MeScreen from './pages/TabbarPages/me';

import ClubDetail from './pages/TabbarPages/news/pages/ClubDetail';
import MessageConsole from './pages/ClubSystem/MessageConsole';

// 本地工具
import {pxToDp} from './utils/stylesKits';
import {COLOR_DIY} from './utils/uiMap';

// 第三方庫
import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// 有動畫的tabbar，來源兼文檔：https://github.com/torgeadelin/react-native-animated-nav-tab-bar
import {AnimatedTabBarNavigator} from 'react-native-animated-nav-tab-bar';
import {inject} from 'mobx-react';

// 創建Tabbar的路由棧
const Tabs = AnimatedTabBarNavigator();

class Tabbar extends Component {
    state = {
        isClub: false,
        isLogin: false,
    };

    componentDidMount() {
        let globalData = this.props.RootStore;

        if (
            globalData.userInfo &&
            JSON.stringify(globalData.userInfo) != '{}'
        ) {
            console.log('Tabbar檢測：有token緩存');
            this.setState({
                isClub: globalData.userInfo.isClub,
                isLogin: true,
            });
        }
    }

    render() {
        const {isClub, isLogin} = this.state;
        return (
            <Tabs.Navigator
                tabBarOptions={{
                    inactiveTintColor: COLOR_DIY.black.main,
                }}
                appearance={{
                    activeTabBackgrounds: COLOR_DIY.themeColor,
                    activeColors: COLOR_DIY.white,
                    tabBarBackground: COLOR_DIY.white,
                    // 浮動式Tabbar
                    // floating            : true,
                    horizontalPadding: pxToDp(10),
                }}
                initialRouteName={isClub ? 'MeTabbar' : 'HomeTabbar'}>
                {/* 社團賬號登錄，直接簡潔模式 */}
                {!isClub && (
                    <Tabs.Screen
                        name="NewsTabbar"
                        component={NewsScreen}
                        options={{
                            tabBarIcon: ({focused, color, size}) => (
                                <Icon
                                    name="pie-chart"
                                    size={size ? size : 24}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                    color={color}
                                />
                            ),
                            title: '資訊',
                        }}
                    />
                )}
                {!isClub && (
                    <Tabs.Screen
                        name="FeaturesTabbar"
                        component={FeaturesScreen}
                        options={{
                            tabBarIcon: ({focused, color, size}) => (
                                <Icon
                                    name="grid"
                                    size={size ? size : 24}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                    color={color}
                                />
                            ),
                            title: '服務',
                        }}
                    />
                )}
                {!isClub && (
                    <Tabs.Screen
                        name="HomeTabbar"
                        component={HomeScreen}
                        options={{
                            tabBarIcon: ({focused, color, size}) => (
                                <Icon
                                    name="home"
                                    size={size ? size : 24}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                    color={color}
                                />
                            ),
                            title: '主頁',
                        }}
                    />
                )}

                {isLogin && (
                    <Tabs.Screen
                        name="MessageTabbar"
                        component={isClub ? MessageConsole : MessageScreen}
                        options={{
                            tabBarIcon: ({focused, color, size}) => (
                                <Icon
                                    name="message-circle"
                                    size={size ? size : 24}
                                    color={focused ? color : '#222222'}
                                    focused={focused}
                                    color={color}
                                />
                            ),
                            title: '提醒',
                        }}
                    />
                )}
                <Tabs.Screen
                    name="MeTabbar"
                    component={isClub ? ClubDetail : MeScreen}
                    options={{
                        tabBarIcon: ({focused, color, size}) =>
                            this.state.isClub ? (
                                <MaterialCommunityIcons
                                    name="human-queue"
                                    size={size ? size : 24}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                    color={color}
                                />
                            ) : (
                                <Icon
                                    name="smile"
                                    size={size ? size : 24}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                    color={color}
                                />
                            ),
                        title: this.state.isClub ? '組織' : '我的',
                    }}
                />
            </Tabs.Navigator>
        );
    }
}

export default inject('RootStore')(Tabbar);
