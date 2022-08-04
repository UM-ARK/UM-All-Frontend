// 信息頁
import React, {Component} from 'react';
import {Text, View, TouchableOpacity, FlatList} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {BASE_URI, GET} from '../../../utils/pathMap';
import ChatCard from './ChatCard';
import axios from 'axios';

import {Header} from '@rneui/themed';
import {SpringScrollView} from 'react-native-spring-scrollview';

// 模擬服務器請求回來的data
// user.type有 普通none、官方official、學生會sa、社團club、書院college
const messages = [
    {
        user: {
            _id: '0',
            name: '澳大電子通告',
            avatar: 'http://images.jjl.cn/ugc/2018/1129/20181129152330319.png',
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
            _id: '3',
            name: '鄭裕彤書院(CYTC)',
            avatar: 'https://cytc.rc.um.edu.mo/wp-content/uploads/2019/09/CYTC-Logo-2014-Purple-1.png',
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
            _id: '4',
            name: '電腦學會',
            avatar: 'https://info.umsu.org.mo/storage/affiliate/images/da6f2ec4b5ec3216f9344453f796a97c.jpg',
        },
        message_history: [
            {
                content: '遊戲工作坊',
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
    constructor() {
        super();
        // this.getData();
    }

    async getData() {
        let URL = BASE_URI + GET.NOTICE + GET.NOTICE_MODE.all;
        await axios
            .get(URL)
            .then(res => {
                console.log(res.data);
            })
            .catch(err => {
                alert('請求錯誤！');
            });
    }

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
                    <Text style={{color: COLOR_DIY.black.third}}>
                        1.0.0版本將改為用戶的Follow頁，從關注的活動或社團直接查看其發佈的公告詳情。
                    </Text>
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
