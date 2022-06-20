/**
 * GitHub地址：https://github.com/UM-ARK/UM-All-Frontend
 */
import React, {Component} from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';

// 本地引用

// 第三方庫
import Icon from 'react-native-vector-icons/Feather';
// 有動畫的tabbar，來源兼文檔：https://www.npmjs.com/package/react-native-animated-nav-tab-bar
import {AnimatedTabBarNavigator} from 'react-native-animated-nav-tab-bar';
import {NavigationContainer} from '@react-navigation/native';

const Tabs = AnimatedTabBarNavigator();

class Index extends Component {
    state = {};
    render() {
        return (
            <NavigationContainer>
                <Tabs.Navigator
                    tabBarOptions={{
                        activeTintColor: '#2F7C6E',
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
                    initialRouteName={'圈子'}>
                    <Tabs.Screen
                        name="新聞"
                        component={() => (
                            <View>
                                <Text>新聞</Text>
                            </View>
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
                        }}
                    />
                    <Tabs.Screen
                        name="服務"
                        component={() => (
                            <View>
                                <Text>交友</Text>
                            </View>
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
                        }}
                    />
                    <Tabs.Screen
                        name="主頁"
                        component={() => (
                            <View>
                                <Text>圈子</Text>
                            </View>
                        )}
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
                        }}
                    />
                    <Tabs.Screen
                        name="消息"
                        component={() => (
                            <View>
                                <Text>消息</Text>
                            </View>
                        )}
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
                        }}
                    />
                    <Tabs.Screen
                        name="我的"
                        component={() => (
                            <View>
                                <Text>我的</Text>
                            </View>
                        )}
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
                        }}
                    />
                </Tabs.Navigator>
            </NavigationContainer>
        );
    }
}

export default Index;
