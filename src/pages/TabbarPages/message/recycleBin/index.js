// 信息頁
import React, {Component} from 'react';
import {Text, View, TouchableOpacity, ScrollView} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import ChatList from './ChatList';

import {Header} from '@rneui/themed';
import {SpringScrollView} from 'react-native-spring-scrollview';

// 模擬服務器請求回來的data
const messages = [
    {
        // 消息類型，對應tag的index
        type: 2,
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
                unread: 0,
            },
        ],
    },
    {
        type: 2,
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
        type: 1,
        user: {
            id: '12312312',
            name: 'test1',
            avatar_url: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
        message_history: [
            {
                content: 'fuck u',
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
        type: 1,
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
        type: 2,
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
        type: 3,
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
    constructor() {
        super();
        this.state = {
            // 點擊按鈕的下標，用於改變顯示狀態
            tagIndex: 0,
            messages: messages,
            messageList: <ChatList data={messages} tag={0} />,
        };
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
                    {this.state.messageList}
                </SpringScrollView>
            </View>
        );
    }
}

export default MesgScreen;

// 棄用代碼
// {/* 2022.06.28 棄用 吸頂選項卡 */}
// 按哪個按鈕就切換哪個按鈕的顏色
// handleClickTag = (tagIndex) => {
//     // 更新前台顯示選中的tag，同時展示所需分類的聊天列表
//     this.setState({
//         tagIndex    : tagIndex,
//         messageList : <ChatList data={messages} tag={tagIndex}/>
//     })
// }

// <View style={{flexDirection:'row', height:pxToDp(26)}}>
// <ScrollView style={{backgroundColor:bg_color}} horizontal={true}>
//     {/* 選項1 全部訊息 */}
//     <TouchableOpacity style={{
//         marginLeft:pxToDp(5), marginRight:pxToDp(5),
//         // 顏色隨選中而改變，選中為填充背景色，未選中則白色
//         backgroundColor:this.state.tagIndex==0?themeColor:bg_color,
//         borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
//         paddingVertical:pxToDp(5), paddingHorizontal:pxToDp(10),
//         // marginLeft:pxToDp(100),
//         ...viewShadow
//     }} activeOpacity={0.7} onPress={()=>this.handleClickTag(0)}>
//         <Text style={{color:this.state.tagIndex==0?white:themeColor, fontSize:12}}>全部訊息</Text>
//     </TouchableOpacity>

//     {/* 選項2 官方通告 */}
//     <TouchableOpacity style={{
//         marginRight:pxToDp(5),
//         backgroundColor:this.state.tagIndex==1?themeColor:bg_color,
//         borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
//         padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10),
//         ...viewShadow
//     }} activeOpacity={0.7} onPress={()=>this.handleClickTag(1)}>
//         <Text style={{color:this.state.tagIndex==1?white:themeColor, fontSize:12}}>官方通告</Text>
//     </TouchableOpacity>

//     {/* 選項3 活動訊息 */}
//     <TouchableOpacity style={{
//         marginRight:pxToDp(5),
//         backgroundColor:this.state.tagIndex==2?themeColor:bg_color,
//         borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
//         padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10),
//         ...viewShadow
//     }} activeOpacity={0.7} onPress={()=>this.handleClickTag(2)}>
//         <Text style={{color:this.state.tagIndex==2?white:themeColor, fontSize:12}}>活動訊息</Text>
//     </TouchableOpacity>

//     {/* 選項4 Deadline提醒 */}
//     <TouchableOpacity style={{
//         backgroundColor:this.state.tagIndex==3?themeColor:bg_color,
//         borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
//         padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10),
//         ...viewShadow
//     }} activeOpacity={0.7} onPress={()=>this.handleClickTag(3)}>
//         <Text style={{color:this.state.tagIndex==3?white:themeColor, fontSize:12}}>Deadline提醒</Text>
//     </TouchableOpacity>
// </ScrollView>
// </View>
