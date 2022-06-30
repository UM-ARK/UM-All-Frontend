// 信息頁
import React, {Component} from 'react';
import {Text, View, TouchableOpacity, FlatList} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import ChatCard from './ChatCard';

import {Header} from '@rneui/themed';
import {SpringScrollView} from 'react-native-spring-scrollview';

// 模擬服務器請求回來的data
// user.type有 普通none、官方official、學生會sa、社團club、書院college
const messages = [
    {
        user: {
            id: '1',
            name: '溫迪',
            avatar_url: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
        message_history: [
            {
                content: 'fuck u',
                time: '2022/6/26 2:30',
                // 消息未讀
                // 1：true，0：false
                unread: 1,
            },
            {
                content: 'hahahaha',
                time: '2022/6/26 1:30',
                unread: 0,
            },
        ],
    },
    {
        user: {
            id: '0',
            name: '澳大電子通告',
            avatar_url:
                'http://images.jjl.cn/ugc/2018/1129/20181129152330319.png',
        },
        message_history: [
            {
                content:
                    '請全澳居民於6月22日內進行一次快速抗原檢測。知道了嗎阿是離開打飛機拉克絲定積分了卡時代峻峰',
                time: '2022/6/26 2:30',
                unread: 1,
            },
            {
                content: 'hahahaha',
                time: '2022/6/26 1:30',
                unread: 1,
            },
        ],
    },
    {
        user: {
            id: '3',
            name: '鄭裕彤書院(CYTC)',
            avatar_url:
                'https://cytc.rc.um.edu.mo/wp-content/uploads/2019/09/CYTC-Logo-2014-Purple-1.png',
        },
        message_history: [
            {
                content:
                    '書院活動 purple dating 現已開啟，一切唉算了東風科技唉算了到科技付。',
                time: '2022/6/26 2:30',
                unread: 0,
            },
            {
                content: 'hahahaha',
                time: '2022/6/26 1:30',
                unread: 0,
            },
        ],
    },
    {
        user: {
            id: '12312312',
            name: 'test1',
            avatar_url: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
        message_history: [
            {
                content: 'fuck u',
                time: '2022/6/26 2:30',
                unread: 1,
            },
            {
                content: 'hahahaha',
                time: '2022/6/26 1:30',
                unread: 1,
            },
        ],
    },
    {
        user: {
            id: '12312312',
            name: 'test2',
            avatar_url: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
        message_history: [
            {
                content: 'fuck u',
                time: '2022/6/26 2:30',
                unread: 1,
            },
            {
                content: 'hahahaha',
                time: '2022/6/26 1:30',
                unread: 1,
            },
        ],
    },
    {
        user: {
            id: '12312312',
            name: 'test3',
            avatar_url: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
        message_history: [
            {
                content: 'fuck u',
                time: '2022/6/26 2:30',
                unread: 1,
            },
            {
                content: 'hahahaha',
                time: '2022/6/26 1:30',
                unread: 1,
            },
        ],
    },
];

class MesgScreen extends Component {
    state = {};

    render() {
        const {bg_color, themeColor, white, viewShadow} = COLOR_DIY;
        return (
            <View style={{backgroundColor: COLOR_DIY.bg_color, flex: 1}}>
                {/* 頂部標題 */}
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    centerComponent={{
                        text: '提醒訊息',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                    }}
                />
                {/* 消息內容 */}
                {/* 條件渲染，參考：https://segmentfault.com/a/1190000025135870 */}
                <SpringScrollView
                    style={{marginTop: pxToDp(5)}}
                    showsVerticalScrollIndicator={false}>
                    <FlatList
                        data={messages}
                        renderItem={({item, index}) => {
                            return <ChatCard messages={item}></ChatCard>;
                        }}
                        keyExtractor={(_, index) => index}
                        scrollEnabled={false}
                    />
                </SpringScrollView>
            </View>
        );
    }
}

export default MesgScreen;
