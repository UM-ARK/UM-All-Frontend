// 信息頁
import React, { Component } from "react";
import {
    Text,
    View,
    ScrollView,
    TouchableOpacity,
} from "react-native";

import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'
import ChatList from './ChatList';

import {Header} from 'react-native-elements'; // 4.0 Beta版

class MesgScreen extends Component {
    state = {
        // 點擊按鈕的下標，用於改變顯示狀態
        tagIndex : 0,
    }

    // 按哪個按鈕就切換哪個按鈕的顏色
    handleClickTag = (tagIndex) => {
        this.setState({ tagIndex:tagIndex });
    }

    render() {
        const {tagIndex} = this.state;
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
            <View style={{backgroundColor:bg_color, justifyContent:'center', alignItems:'center',}}>
            <ScrollView horizontal={true}>
                {/* 選項1 全部訊息 */}
                <TouchableOpacity style={{
                    marginRight:pxToDp(5),
                    backgroundColor:tagIndex==0?themeColor:bg_color, 
                    borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
                    padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10), 
                    ...viewShadow
                }} activeOpacity={0.7} onPress={()=>this.handleClickTag(0)}>
                    <Text style={{color:tagIndex==0?white:themeColor}}>全部訊息</Text>
                </TouchableOpacity>

                {/* 官方通告 */}
                <TouchableOpacity style={{
                    marginRight:pxToDp(5),
                    backgroundColor:tagIndex==1?themeColor:bg_color, 
                    borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
                    padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10), 
                    ...viewShadow
                }} activeOpacity={0.7} onPress={()=>this.handleClickTag(1)}>
                    <Text style={{color:tagIndex==1?white:themeColor}}>官方通告</Text>
                </TouchableOpacity>

                {/* 活動訊息 */}
                <TouchableOpacity style={{
                    marginRight:pxToDp(5),
                    backgroundColor:tagIndex==2?themeColor:bg_color, 
                    borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
                    padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10), 
                    ...viewShadow
                }} activeOpacity={0.7} onPress={()=>this.handleClickTag(2)}>
                    <Text style={{color:tagIndex==2?white:themeColor}}>活動訊息</Text>
                </TouchableOpacity>

                {/* Deadline提醒 */}
                <TouchableOpacity style={{
                    backgroundColor:tagIndex==3?themeColor:bg_color,
                    borderRadius:pxToDp(20), borderWidth:pxToDp(1), borderColor:themeColor,
                    padding:pxToDp(5), paddingLeft:pxToDp(10), paddingRight:pxToDp(10), 
                    ...viewShadow
                }} activeOpacity={0.7} onPress={()=>this.handleClickTag(3)}>
                    <Text style={{color:tagIndex==3?white:themeColor}}>Deadline提醒</Text>
                </TouchableOpacity>
            </ScrollView>
            </View>

            {/* 2 消息內容 */}
            <ScrollView style={{marginTop:pxToDp(5), backgroundColor:bg_color}}>

                {/* 條件渲染，參考：https://segmentfault.com/a/1190000025135870 */}
                {(() => {
                    switch (tagIndex) {
                        case 0:
                        return (
                            <View>
                                {/* <Text style={{ fontSize: 30, }}>全部訊息</Text> */}
                                <ChatList></ChatList>
                            </View>
                        )
                        case 1:
                        return <Text style={{ fontSize: 30, }}>官方通告</Text>
                        case 2:
                        return <Text style={{ fontSize: 30, }}>活動訊息</Text>
                        case 3:
                        return <Text style={{ fontSize: 30, }}>Deadline 提醒</Text>
                    }
                })()}


                <Text>{'\n'}</Text>
                <Text>{'\n'}</Text>
                <Text>{'\n'}</Text>
            </ScrollView>
            </View>
        );
    }
}

export default MesgScreen;