import React, { Component } from 'react';

import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/info';
// import MessageScreen from './pages/TabbarPages/message';
// import MeScreen from './pages/TabbarPages/me';
import ClubDetail from './pages/TabbarPages/info/club/ClubDetail';
import What2RegTabIndex from './pages/TabbarPages/what2Reg';
import ARKWiki from './pages/TabbarPages/arkwiki';
import CourseSim from './pages/TabbarPages/courseSim';

import { COLOR_DIY } from './utils/uiMap';
import { trigger } from './utils/trigger';
import { scale } from 'react-native-size-matters';

import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { AnimatedTabBarNavigator } from 'react-native-animated-nav-tab-bar';
import { inject } from 'mobx-react';
import { t } from "i18next";

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
                    tabBarBackground: COLOR_DIY.bg_color,
                    whenInactiveShow: 'both',
                    tabButtonLayout: 'vertical',
                }}
                initialRouteName={isClub ? 'MeTabbar' : 'NewsTabbar'}>

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
                            title: t('資訊'),
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
                        })}
                    />
                )}

                {/* ARK Wiki */}
                {isClub ? null : (
                    <Tabs.Screen
                        name="Wiki"
                        component={ARKWiki}
                        options={{
                            tabBarIcon: ({ focused, color, size }) => (
                                <MaterialCommunityIcons
                                    name="file-document-edit-outline"
                                    size={scale(18)}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                />
                            ),
                            title: t('百科'),
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
                        })}
                    />
                )}

                {/* ARK選課 */}
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
                            title: t('搵課'),
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
                        })}
                    />
                )}

                {/* 課表模擬 */}
                {isClub ? null : (
                    <Tabs.Screen
                        name="CourseSimTab"
                        component={CourseSim}
                        options={{
                            tabBarIcon: ({ focused, color, size }) => (
                                <MaterialCommunityIcons
                                    name="table-clock"
                                    size={scale(18)}
                                    color={
                                        focused ? color : COLOR_DIY.black.main
                                    }
                                    focused={focused}
                                />
                            ),
                            title: t('課表'),
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
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
                            title: t('服務'),
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
                        })}
                    />
                )}

                {/* {false && isLogin && !isClub ? (
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
                ) : null} */}

                {isClub ? (
                    <Tabs.Screen
                        name="MeTabbar"
                        component={ClubDetail}
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
                            title: isClub ? t('組織') : '我的',
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
                        })}
                        initialParams={{ setLock: this.props.route.params.setLock }}
                    />
                ) : null}
            </Tabs.Navigator>
        );
    }
}

export default inject('RootStore')(Tabbar);
