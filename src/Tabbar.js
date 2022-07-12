import React, {Component} from 'react';
import {Text, View} from 'react-native';

// 本地引用
import HomeScreen from './pages/TabbarPages/home';
import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/news';
import MessageScreen from './pages/TabbarPages/message';
import MeScreen from './pages/TabbarPages/me';

import ClubDetail from './pages/TabbarPages/news/pages/ClubDetail';

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

class Index extends Component {
    constructor(props) {
        super(props);
        let globalData = this.props.RootStore;
        console.log('Tabbar.js首次掛載: RootStore為', globalData);

        this.state = {
            isClub: globalData.isClub,
            isLogin: globalData.isLogin,
        };
    }

    render() {
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
                initialRouteName={'MeTabbar'}>
                {/* 社團賬號登錄，直接簡潔模式 */}
                {!this.state.isClub && (
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
                {!this.state.isClub && (
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
                {!this.state.isClub && (
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

                {this.state.isLogin && (
                    <Tabs.Screen
                        name="MessageTabbar"
                        component={MessageScreen}
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
                    component={this.state.isClub ? ClubDetail : MeScreen}
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

export default inject('RootStore')(Index);
