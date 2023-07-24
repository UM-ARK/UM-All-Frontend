import React, { Component } from 'react';
import { View, Platform, Text, Dimensions } from 'react-native';

import { COLOR_DIY } from '../../../utils/uiMap';
import HomePage from '../home/index';
import NewsPage from './NewsPage';
import ClubPage from './ClubPage';
import UMEventPage from './UMEventPage';

import { Header } from '@rneui/themed';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { scale } from 'react-native-size-matters';

const { bg_color, white, black, themeColor } = COLOR_DIY;
const Tab = createMaterialTopTabNavigator();

const tabWidth = scale(25);
const numOfTabs = 4;

const TestPage = () => {
    return (
        <View style={{ flex: 1 }}>
            <Text>Test</Text>
        </View>
    )
}

class NewsScreen extends Component {
    render() {
        return (
            <View style={{ backgroundColor: COLOR_DIY.bg_color, flex: 1 }}>
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
                        barStyle: 'dark-content',
                    }}
                    containerStyle={{
                        // 修復頂部空白過多問題
                        height: Platform.select({
                            android: scale(38),
                            default: scale(35),
                        }),
                        paddingTop: 0,
                    }}
                />
                {/* 能左右切換的TabPage */}
                <Tab.Navigator
                    screenOptions={{
                        tabBarLabelStyle: { fontSize: scale(10), },
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
                    />
                    {/* <Tab.Screen
                        name="EventPage"
                        component={EventPage}
                        options={{
                            title: '組織活動',
                        }}
                    /> */}
                    <Tab.Screen
                        name="ClubPage"
                        component={ClubPage}
                        options={{
                            title: '進駐組織',
                        }}
                    />
                    <Tab.Screen
                        name="NewsPage"
                        component={NewsPage}
                        options={{
                            title: '澳大新聞',
                        }}
                    />
                    <Tab.Screen
                        name="UMEventPage"
                        component={UMEventPage}
                        options={{
                            title: '澳大活動',
                        }}
                    />
                </Tab.Navigator>
            </View>
        );
    }
}

export default NewsScreen;
