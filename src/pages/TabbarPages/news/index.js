import React, {Component} from 'react';
import { Text, TouchableOpacity, View } from "react-native";

import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'

import {Header} from '@rneui/themed';
import SegmentedControlTab from "react-native-segmented-control-tab";

import EventPage from './EventPage'
import ClubPage from './ClubPage'
import { NewsPage } from "./NewsPage";
import { SpringScrollView } from "react-native-spring-scrollview";

class GetPage extends Component{
    constructor(props) {
        super(props);
        this.state={
            tag:props.tag,
            content:<NewsPage/>
        }
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            tag:nextProps.tag
        })
    }

    render() {
        const arr=[<NewsPage/>,<EventPage/>,<ClubPage/>]
        return arr[this.state.tag];
    }
}

class NewsScreen extends Component{
    constructor() {
        super();
        this.state = {
            tagIndex : 0,
        };
    }

    handleClickTag = (tagIndex) => {
        console.log("Change",tagIndex)
        this.setState({
            tagIndex:tagIndex,
        });
        console.log("Update",this.state.tagIndex)

    }

    render() {
        const {bg_color, themeColor, white, viewShadow} = COLOR_DIY;
        return (
            <View style={{backgroundColor:COLOR_DIY.bg_color, flex:1}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    centerComponent={{
                        text: '資訊',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{backgroundColor:'transparent', barStyle:'dark-content'}}
                />
                <View style={{backgroundColor:COLOR_DIY.bg_color}}>
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

                            {/* 佔位View，用於給SpringScrollView橫向滾動 */}
                            <View style={{marginLeft:pxToDp(20)}}></View>
                        </View>
                    </SpringScrollView>
                </View>
                <GetPage tag={this.state.tagIndex}/>
            </View>
        );
    }
}

export default NewsScreen;
