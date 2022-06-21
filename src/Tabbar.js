import React, {Component} from 'react';
import {Text, View} from 'react-native';

// 本地引用
import HomeScreen from './pages/TabbarPages/home';
import FeaturesScreen from './pages/TabbarPages/features';
import MessageScreen from './pages/TabbarPages/message';
import MeScreen from './pages/TabbarPages/me';

// 第三方庫
import Icon from 'react-native-vector-icons/Feather';
// 有動畫的tabbar，來源兼文檔：https://github.com/torgeadelin/react-native-animated-nav-tab-bar
import {AnimatedTabBarNavigator} from 'react-native-animated-nav-tab-bar';

const Tabs = AnimatedTabBarNavigator();

class Index extends Component {
    state = {};

    render() {
        return (
            <Tabs.Navigator
                tabBarOptions={{
                    activeTintColor: '#3498db',
                    inactiveTintColor: '#222222',
                    tabStyle: {
                        // 頂邊圓角
                        // borderTopLeftRadius:50,
                        // borderTopRightRadius:50,
                    },
                }}
                appearance={{
                    activeTabBackgrounds: '#3498db',
                    activeColors: '#ecf0f1',
                    tabBarBackground: '#fff',
                    floating: true,
                    horizontalPadding: 10,
                }}
                initialRouteName={'HomeTabbar'}>
                <Tabs.Screen
                    name="NewsTabbar"
                    // component={NewsScreen}
                    component={()=>(
                        <View><Text>新聞頁</Text></View>
                    )}
                    options={{
                        tabBarIcon: ({focused, color, size}) => (
                            <Icon
                                name="pie-chart"
                                size={size ? size : 24}
                                color={focused ? color : '#222222'}
                                focused={focused}
                                color={color}
                            />
                        ),
                        title: '新聞',
                    }}
                />
                <Tabs.Screen
                    name="FeaturesTabbar"
                    component={FeaturesScreen}
                    options={{
                        tabBarIcon: ({focused, color, size}) => (
                            <Icon
                                name="pie-chart"
                                size={size ? size : 24}
                                color={focused ? color : '#222222'}
                                focused={focused}
                                color={color}
                            />
                        ),
                        title: '服務',
                    }}
                />
                <Tabs.Screen
                    name="HomeTabbar"
                    component={HomeScreen}
                    options={{
                        tabBarIcon: ({focused, color, size}) => (
                            <Icon
                                name="home"
                                size={size ? size : 24}
                                color={focused ? color : '#222222'}
                                focused={focused}
                                color={color}
                            />
                        ),
                        title: '主頁',
                    }}
                />
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
                        title: '消息',
                    }}
                />
                <Tabs.Screen
                    name="MeTabbar"
                    component={MeScreen}
                    options={{
                        tabBarIcon: ({focused, color, size}) => (
                            <Icon
                                name="meh"
                                size={size ? size : 24}
                                color={focused ? color : '#222222'}
                                focused={focused}
                                color={color}
                            />
                        ),
                        title: '我的',
                    }}
                />
            </Tabs.Navigator>
        );
    }
}

export default Index;
