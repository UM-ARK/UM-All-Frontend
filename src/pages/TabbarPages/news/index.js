import React, {Component} from 'react';
import {Text, View, Dimensions} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import HomePage from '../home/index';
import NewsPage from './NewsPage';
import EventPage from './EventPage';
import ClubPage from './ClubPage';
import UMEventPage from './UMEventPage';

import {Header} from '@rneui/themed';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import { scale } from 'react-native-size-matters';

const {bg_color, white, black, themeColor} = COLOR_DIY;
const Tab = createMaterialTopTabNavigator();

class NewsScreen extends Component {
    render() {
        return (
            <View style={{backgroundColor: COLOR_DIY.bg_color, flex: 1}}>
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
                />
                {/* 能左右切換的TabPage */}
                <Tab.Navigator
                    screenOptions={{
                        tabBarLabelStyle: {fontSize: scale(10)},
                        tabBarStyle: {backgroundColor: bg_color},
                        tabBarBounces: false,
                    }}
                    initialRouteName={'HomePage'}>
                    <Tab.Screen
                        name="HomePage"
                        component={HomePage}
                        options={{
                            title: '主頁',
                        }}
                    />
                    <Tab.Screen
                        name="EventPage"
                        component={EventPage}
                        options={{
                            title: '組織活動',
                        }}
                    />
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
