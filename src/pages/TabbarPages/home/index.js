import React, {Component, Fragment} from 'react';
import {
    StatusBar,
    Button,
    View,
    Text,
    Image,
    SafeAreaView,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Header} from 'react-native-elements'; // 4.0 Beta版

// 本地工具
import {COLOR_DIY} from '../../../utils/uiMap';
import { pxToDp } from '../../../utils/stylesKits';

export default class HomeScreen extends Component {
    state = {
        entries: [
            {
                title: '1',
                thumbnail:
                    'http://up.deskcity.org/pic_360/202203/sl/0h3tbuaaqak3413.jpg',
            },
            {
                title: '2',
                thumbnail:
                    'http://up.deskcity.org/pic_360/202203/sl/rhufva2zhw43023.jpg',
            },
            {
                title: '3',
                thumbnail:
                    'http://up.deskcity.org/pic_360/202010/sl/nbcfqns2b3n3440.jpg',
            },
        ],
        activeSlide: 0,
    };

    // 接收搜索框輸入文本
    handleSearchBarInput = text => {
        console.log('搜索框輸入的文本為', text);
    };

    handleNaviMe = () => {
        // Tabbar跳轉(保留底下Tabbar的跳轉)需要遵循Tabbar.js的Tabs.Screen裡的name
        // 因為Tabbar與全局不是同一個路由棧,但只要在全局路由棧註冊的頁面仍可以跳轉,只是失去了底部Tabbar
        this.props.navigation.navigate('FeaturesTabbar');
    };

    render() {
        const {entries, activeSlide} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    centerComponent={{
                        text: 'UM ALL',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(20),
                        },
                    }}
                    statusBarProps={{backgroundColor:COLOR_DIY.bg_color, barStyle:'dark-content'}}
                />

                {/* <Text>主頁內容xxxxxxxxxxxx</Text> */}

                {/* 搜索框組件 */}

                {/* 輪播圖組件 */}

                <Text>{'\n'}</Text>
                <Text>{'\n'}</Text>
                <Text>{'\n'}</Text>
                <Text>{'\n'}</Text>
                <Text>{'\n'}</Text>
                <Button
                    title="跳轉所有服務頁"
                    color={COLOR_DIY.themeColor}
                    onPress={this.handleNaviMe}></Button>
                <Text>{'\n'}</Text>
                <Button
                    title="跳轉測試頁"
                    color={COLOR_DIY.themeColor}
                    onPress={() =>
                        this.props.navigation.navigate('TestScreen')
                    }></Button>
            </View>
        );
    }
}