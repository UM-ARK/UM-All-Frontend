import React, { Component } from 'react';

import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/news';
import MessageScreen from './pages/TabbarPages/message';
import MeScreen from './pages/TabbarPages/me';
import ClubDetail from './pages/TabbarPages/news/pages/ClubDetail';
import What2RegTabIndex from './pages/TabbarPages/what2Reg';
import TimeTableIndex from './pages/TabbarPages/TimeTable';

import { COLOR_DIY } from './utils/uiMap';
import { scale } from 'react-native-size-matters';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AnimatedTabBarNavigator } from 'react-native-animated-nav-tab-bar';
import { inject } from 'mobx-react';

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
        const { isClub, isLogin } = this.state;
        return (
            <Tabs.Navigator
                tabBarOptions={{
                    inactiveTintColor: COLOR_DIY.black.main,
                }}
                appearance={{
                    activeTabBackgrounds: COLOR_DIY.themeColor,
                    activeColors: COLOR_DIY.white,
                    tabBarBackground: 'transparent',
                }}
                initialRouteName={isClub ? 'MeTabbar' : 'NewsTabbar'}>
                {/* {isClub ? null : (
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
                        initialParams={{
                            setLock: this.props.route.params.setLock,
                        }}
                    />
                )} */}

                {/* 社團賬號登錄，進入簡潔模式 */}
                {isClub ? null : (
                    <Tabs.Screen
                        name="NewsTabbar"
                        component={NewsScreen}
                        options={{
                            tabBarIcon: ({ focused, color, size }) => (
                                <Icon
                                    name="pie-chart"
                                    size={scale(15)}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                />
                            ),
                            title: '資訊',
                        }}
                        listeners={() => ({
                            tabPress: () => ReactNativeHapticFeedback.trigger('soft')
                        })}
                    />
                )}

                {/* 選課頁 */}
                {isClub ? null : (
                    <Tabs.Screen
                        name="What2RegTab"
                        component={What2RegTabIndex}
                        options={{
                            tabBarIcon: ({ focused, color, size }) => (
                                <MaterialCommunityIcons
                                    name="database-search-outline"
                                    size={scale(18)}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                />
                            ),
                            title: '搵課',
                        }}
                        listeners={() => ({
                            tabPress: () => ReactNativeHapticFeedback.trigger('soft')
                        })}
                    />
                )}

                {/* 課表模擬頁 */}
                {isClub ? null : (
                    <Tabs.Screen
                        name="TimeTableTab"
                        component={TimeTableIndex}
                        options={{
                            tabBarIcon: ({ focused, color, size }) => (
                                <MaterialCommunityIcons
                                    name="timetable"
                                    size={scale(18)}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                />
                            ),
                            title: '課表',
                        }}
                        listeners={() => ({
                            tabPress: () => ReactNativeHapticFeedback.trigger('soft')
                        })}
                    />
                )}

                {/* 功能頁 */}
                {isClub ? null : (
                    <Tabs.Screen
                        name="FeaturesTabbar"
                        component={FeaturesScreen}
                        options={{
                            tabBarIcon: ({ focused, color, size }) => (
                                <Icon
                                    name="grid"
                                    size={scale(15)}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                />
                            ),
                            title: '服務',
                        }}
                        listeners={() => ({
                            tabPress: () => ReactNativeHapticFeedback.trigger('soft')
                        })}
                    />
                )}

                {false && isLogin && !isClub ? (
                    <Tabs.Screen
                        name="MessageTabbar"
                        component={MessageScreen}
                        options={{
                            tabBarIcon: ({ focused, color, size }) => (
                                <Icon
                                    name="message-circle"
                                    size={size ? size : 24}
                                    color={focused ? color : '#222222'}
                                    focused={focused}
                                />
                            ),
                            title: '關注',
                        }}
                    />
                ) : null}

                {isClub ? (
                    <Tabs.Screen
                        name="MeTabbar"
                        component={isClub ? ClubDetail : MeScreen}
                        options={{
                            tabBarIcon: ({ focused, color, size }) =>
                                isClub ? (
                                    <MaterialCommunityIcons
                                        name="human-queue"
                                        size={size ? size : scale(20)}
                                        color={
                                            focused ? color : COLOR_DIY.black.main
                                        }
                                        focused={focused}
                                    />
                                ) : (
                                    <Icon
                                        name="smile"
                                        size={size ? size : scale(20)}
                                        color={
                                            focused ? color : COLOR_DIY.black.main
                                        }
                                        focused={focused}
                                    />
                                ),
                            title: isClub ? '組織' : '我的',
                        }}
                        listeners={() => ({
                            tabPress: () => ReactNativeHapticFeedback.trigger('soft')
                        })}
                        initialParams={{ setLock: this.props.route.params.setLock }}
                    />
                ) : null}
            </Tabs.Navigator>
        );
    }
}

export default inject('RootStore')(Tabbar);
