import React, { Component } from 'react';
import { View, Platform, Text, Dimensions } from 'react-native';

import { COLOR_DIY } from '../../../utils/uiMap';
import { trigger } from '../../../utils/trigger';
import HomePage from '../home/index';
import NewsPage from './NewsPage';
import ClubPage from './ClubPage';
import UMEventPage from './UMEventPage';
import AboutPage from './AboutPage';

import { Header } from '@rneui/themed';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { scale } from 'react-native-size-matters';
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

const { bg_color, white, black, themeColor } = COLOR_DIY;
const Tab = createMaterialTopTabNavigator();

const tabWidth = scale(25);
const numOfTabs = 5;

class NewsScreen extends Component {
    render() {
        return (
            <SafeAreaInsetsContext.Consumer>{(insets) => <View style={{ backgroundColor: COLOR_DIY.bg_color, flex: 1 }}>
                <Header
                    backgroundColor={bg_color}
                    // centerComponent={{
                    //     text: 'ARK ALL',
                    //     style: {
                    //         color: COLOR_DIY.black.main,
                    //         fontSize: scale(12),
                    //     },
                    // }}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: COLOR_DIY.barStyle,
                    }}
                    containerStyle={{
                        // 修復頂部空白過多問題
                        height: Platform.select({
                            android: scale(38),
                            default: insets.top,
                        }),
                        paddingTop: 0,
                        // 修復深色模式頂部小白條問題
                        borderBottomWidth: 0,
                    }}
                />
                {/* 能左右切換的TabPage */}
                <Tab.Navigator
                    screenOptions={{
                        tabBarLabelStyle: {
                            fontSize: scale(10),
                            fontWeight: 'bold',
                        },
                        tabBarStyle: {
                            backgroundColor: bg_color,
                            minHeight: scale(20),
                            maxHeight: scale(30),
                        },
                        tabBarContentContainerStyle: {
                            alignItems: 'center',
                            justifyContent: 'center',
                        },
                        tabBarBounces: false,
                        tabBarActiveTintColor: COLOR_DIY.themeColor,
                        tabBarInactiveTintColor: COLOR_DIY.black.third,
                    }}
                    tabBarOptions={{
                        pressColor: bg_color,
                        indicatorStyle: {
                            backgroundColor: COLOR_DIY.themeColor,
                            width: tabWidth,
                            left: (Dimensions.get('window').width / numOfTabs - tabWidth) / 2,
                        },
                    }}
                    initialRouteName={'HomePage'}
                >
                    <Tab.Screen
                        name="HomePage"
                        component={HomePage}
                        options={{
                            title: '主頁',
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
                        })}
                    />
                    <Tab.Screen
                        name="ClubPage"
                        component={ClubPage}
                        options={{
                            title: '組織',
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
                        })}
                    />
                    <Tab.Screen
                        name="UMEventPage"
                        component={UMEventPage}
                        options={{
                            title: '活動',
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
                        })}
                    />
                    <Tab.Screen
                        name="NewsPage"
                        component={NewsPage}
                        options={{
                            title: '新聞',
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
                        })}
                    />
                    <Tab.Screen
                        name="AboutPage"
                        component={AboutPage}
                        options={{
                            title: '關於',
                        }}
                        listeners={() => ({
                            tabPress: () => trigger()
                        })}
                    />
                </Tab.Navigator>
            </View>}</SafeAreaInsetsContext.Consumer>
        );
    }
}

export default NewsScreen;
