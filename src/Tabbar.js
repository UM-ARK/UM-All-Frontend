import React, {Component} from 'react';
import {Text, View} from 'react-native';

import HomeScreen from './pages/TabbarPages/home';
import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/news';
import MessageScreen from './pages/TabbarPages/message';
import MeScreen from './pages/TabbarPages/me';
import ClubDetail from './pages/TabbarPages/news/pages/ClubDetail';

import {pxToDp} from './utils/stylesKits';
import {COLOR_DIY} from './utils/uiMap';

import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AnimatedTabBarNavigator} from 'react-native-animated-nav-tab-bar';
import {inject} from 'mobx-react';

// 創建Tabbar的路由棧
const Tabs = AnimatedTabBarNavigator();

class Tabbar extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isClub: false,
            isLogin: false,
        };

        let globalData = this.props.RootStore;
        if (
            globalData.userInfo &&
            JSON.stringify(globalData.userInfo) != '{}'
        ) {
            // console.log('Tabbar檢測：已登錄');
            this.state.isClub = globalData.userInfo.isClub;
            this.state.isLogin = true;
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
                    horizontalPadding: pxToDp(10),
                }}
                initialRouteName={isClub ? 'MeTabbar' : 'HomeTabbar'}>
                {/* 社團賬號登錄，進入簡潔模式 */}
                {isClub ? null : (
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
                {isClub ? null : (
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
                {isClub ? null : (
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
                        initialParams={{setLock: this.props.route.params.setLock}}
                    />
                )}

                {isLogin && !isClub ? (
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
                            title: '關注',
                        }}
                    />
                ) : null}

                <Tabs.Screen
                    name="MeTabbar"
                    component={isClub ? ClubDetail : MeScreen}
                    options={{
                        tabBarIcon: ({focused, color, size}) =>
                            isClub ? (
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
                        title: isClub ? '組織' : '我的',
                    }}
                    initialParams={{setLock: this.props.route.params.setLock}}
                />
            </Tabs.Navigator>
        );
    }
}

export default inject('RootStore')(Tabbar);
