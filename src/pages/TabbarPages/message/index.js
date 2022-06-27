// 信息頁
import React, { Component } from "react";
import {
    Text,
    View,
    TouchableOpacity,
} from "react-native";

import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'
import ChatList from './ChatList';

import {Header} from 'react-native-elements'; // 4.0 Beta版
import { SpringScrollView } from "react-native-spring-scrollview";
const messages=[
        {
            type:2,
            user:{
                id:"12312312",
                name:"test2",
                avatar_url:"https://i03piccdn.sogoucdn.com/a04373145d4b4341"
            },
            message_history:[
                {
                    content:"fuck u",
                    time:"2022/6/26 2:30",
                    unread:1
                },
                {
                    content:"hahahaha",
                    time:"2022/6/26 1:30",
                    unread:0
                }
            ]
        },
        {
            type:2,
            user:{
                id:"12312312",
                name:"test2",
                avatar_url:"https://i03piccdn.sogoucdn.com/a04373145d4b4341"
            },
            message_history:[
                {
                    content:"fuck u",
                    time:"2022/6/26 2:30",
                    unread:1
                },
                {
                    content:"hahahaha",
                    time:"2022/6/26 1:30",
                    unread:1
                }
            ]
        },
        {
            type:1,
            user:{
                id:"12312312",
                name:"test1",
                avatar_url:"https://i03piccdn.sogoucdn.com/a04373145d4b4341"
            },
            message_history:[
                {
                    content:"fuck u",
                    time:"2022/6/26 2:30",
                    unread:0
                },
                {
                    content:"hahahaha",
                    time:"2022/6/26 1:30",
                    unread:0
                }
            ]
        },
        {
            type:1,
            user:{
                id:"12312312",
                name:"test1",
                avatar_url:"https://i03piccdn.sogoucdn.com/a04373145d4b4341"
            },
            message_history:[
                {
                    content:"fuck u",
                    time:"2022/6/26 2:30",
                    unread:1
                },
                {
                    content:"hahahaha",
                    time:"2022/6/26 1:30",
                    unread:1
                }
            ]
        },
        {
            type:2,
            user:{
                id:"12312312",
                name:"test2",
                avatar_url:"https://i03piccdn.sogoucdn.com/a04373145d4b4341"
            },
            message_history:[
                {
                    content:"fuck u",
                    time:"2022/6/26 2:30",
                    unread:1
                },
                {
                    content:"hahahaha",
                    time:"2022/6/26 1:30",
                    unread:1
                }
            ]
        },
        {
            type:3,
            user:{
                id:"12312312",
                name:"test3",
                avatar_url:"https://i03piccdn.sogoucdn.com/a04373145d4b4341"
            },
            message_history:[
                {
                    content:"fuck u",
                    time:"2022/6/26 2:30",
                    unread:1
                },
                {
                    content:"hahahaha",
                    time:"2022/6/26 1:30",
                    unread:1
                }
            ]
        },

    ]

class MesgScreen extends Component {
    constructor() {
        super();
        this.state = {
            // 點擊按鈕的下標，用於改變顯示狀態
            tagIndex : 0,
            messages:messages,
            messageList:<ChatList data={messages} tag={0}/>

        }
        this.handleClickTag=this.handleClickTag.bind(this)
    }

    // 按哪個按鈕就切換哪個按鈕的顏色
    handleClickTag = (tagIndex) => {
        console.log("Change",tagIndex)
        this.setState({
            tagIndex:tagIndex,
            messageList:<ChatList data={messages} tag={tagIndex}/>
        });
        console.log("Update",this.state.tagIndex)

    }

    render() {
        const {bg_color, themeColor, white, viewShadow} = COLOR_DIY;
        return (
            <View style={{backgroundColor:COLOR_DIY.bg_color, flex:1}}>
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
                statusBarProps={{backgroundColor:'transparent', barStyle:'dark-content'}}
            />
            {/* 1 吸頂選項卡 */}
            <View style={{backgroundColor:bg_color}}>
            <SpringScrollView directionalLockEnabled={true} showsHorizontalScrollIndicator={false} style={{flexDirection:'row'}}>
                <View style={{flexDirection:'row',}}>
                    {/* 佔位View，用於給SpringScrollView橫向滾動 */}
                    <View style={{marginLeft:pxToDp(10)}}></View>
                    {/*{this.GetMessageTab()}*/}
                    {/* 選項1 全部訊息 */}
                    <TouchableOpacity style={{
                        marginRight:pxToDp(5),
                        backgroundColor:this.state.tagIndex==0?themeColor:bg_color,
                        borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
                        padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10),
                        ...viewShadow
                    }} activeOpacity={0.7} onPress={()=>this.handleClickTag(0)}>
                        <Text style={{color:this.state.tagIndex==0?white:themeColor, fontSize:12}}>全部訊息</Text>
                    </TouchableOpacity>

                    {/*/!* 選項2 官方通告 *!/*/}
                    <TouchableOpacity style={{
                        marginRight:pxToDp(5),
                        backgroundColor:this.state.tagIndex==1?themeColor:bg_color,
                        borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
                        padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10),
                        ...viewShadow
                    }} activeOpacity={0.7} onPress={()=>this.handleClickTag(1)}>
                        <Text style={{color:this.state.tagIndex==1?white:themeColor, fontSize:12}}>官方通告</Text>
                    </TouchableOpacity>

                    {/*/!* 選項3 活動訊息 *!/*/}
                    <TouchableOpacity style={{
                        marginRight:pxToDp(5),
                        backgroundColor:this.state.tagIndex==2?themeColor:bg_color,
                        borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
                        padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10),
                        ...viewShadow
                    }} activeOpacity={0.7} onPress={()=>this.handleClickTag(2)}>
                        <Text style={{color:this.state.tagIndex==2?white:themeColor, fontSize:12}}>活動訊息</Text>
                    </TouchableOpacity>

                    {/*/!* 選項4 Deadline提醒 *!/*/}
                    <TouchableOpacity style={{
                        backgroundColor:this.state.tagIndex==3?themeColor:bg_color,
                        borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
                        padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10),
                        ...viewShadow
                    }} activeOpacity={0.7} onPress={()=>this.handleClickTag(3)}>
                        <Text style={{color:this.state.tagIndex==3?white:themeColor, fontSize:12}}>Deadline提醒</Text>
                    </TouchableOpacity>

                    {/* 佔位View，用於給SpringScrollView橫向滾動 */}
                    <View style={{marginLeft:pxToDp(20)}}></View>
                </View>
            </SpringScrollView>
            </View>
                {/* 2 消息內容 */}
                {/* 條件渲染，參考：https://segmentfault.com/a/1190000025135870 */}
                <SpringScrollView style={{marginTop:pxToDp(5)}} showsVerticalScrollIndicator={false}>
                    {this.state.messageList}
                </SpringScrollView>
            </View>
        );
    }
}

export default MesgScreen;
