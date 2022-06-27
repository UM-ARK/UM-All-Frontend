import React, {Component} from 'react';
import {Text, View, StyleSheet, Dimensions} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'

import EventCard from './components/EventCard';

import { SpringScrollView } from "react-native-spring-scrollview";
import {NormalRefresh} from "react-native-spring-scrollview/NormalRefresh";
import {WithLastDateHeader} from "react-native-spring-scrollview/Customize";


const {width:PAGE_WIDTH} = Dimensions.get('window');

// 模擬數據庫data
dataList = [
	{
        // 該活動在數據庫中的id
        eventID:0,
        // 海報鏈接
		imgUrl:'https://info.umsu.org.mo/storage/activity_covers/images/7332b858246993976a892b229e5942ab.jpg',
        // 活動標題
		title:'3月福利',
		// 13位毫秒級時間戳
		timeStamp:1655018688000,
	},
	{
        // 該活動在數據庫中的id
        eventID:1,
        // 海報鏈接
		imgUrl:'https://info.umsu.org.mo/storage/activity_covers/images/13a5158b6a890818615af9bcff8bc81b.png',
        // 活動標題
		title:'校園Vlog大賽',
		// 13位毫秒級時間戳
		timeStamp:1655018688000,
	},
	{
        // 該活動在數據庫中的id
        eventID:2,
        // 海報鏈接
		imgUrl:'https://info.umsu.org.mo/storage/activity_covers/images/c8049bf0ebd8ea081e75f1c1573631f2.png',
        // 活動標題
		title:'香水工作坊',
		// 13位毫秒級時間戳
		timeStamp:1655018688000,
	},
	{
        // 該活動在數據庫中的id
        eventID:3,
        // 海報鏈接
		imgUrl:'https://www.cpsumsu.org/_announcement/CPSUMSU_Web_Crawler_Workshop2022/poster.jpg',
        // 活動標題
		title:'網絡爬蟲工作坊',
		// 13位毫秒級時間戳
		timeStamp:1655018688000,
	},
	{
        // 該活動在數據庫中的id
        eventID:4,
        // 海報鏈接
		imgUrl:'https://www.cpsumsu.org/_announcement/CPSUMSU_UMEF2022_postpone/279037122_5018677904858794_5613582783794191615_n.jpg',
        // 活動標題
		title:'澳大電競節2022',
		// 13位毫秒級時間戳
		timeStamp:1655018688000,
	},
	{
        // 該活動在數據庫中的id
        eventID:5,
        // 海報鏈接
		imgUrl:'https://www.cpsumsu.org/_announcement/Game_Design_Workshop2022/img/poster.jpg',
        // 活動標題
		title:'遊戲設計工作坊',
		// 13位毫秒級時間戳
		timeStamp:1655018688000,
	},
]

class EventPage extends Component {
    _scrollView;
    state = {}

    _onRefresh = () => {
        // fetch(...).then(() => {
        //     this._scrollView.endRefresh();
        //     this.setState({...});
        // })
        console.log('觸發刷新');
        this._scrollView.endRefresh();
    };

    render() {
        return (
            <SpringScrollView directionalLockEnabled={true} showsHorizontalScrollIndicator={false}
            ref={(ref) => (this._scrollView = ref)}
            onRefresh={this._onRefresh}
            refreshHeader={WithLastDateHeader}
            >
            <View style={{flex:1, flexDirection:'row', backgroundColor:COLOR_DIY.bg_color, justifyContent:'space-around'}}>
                {/* 左側的列 放置雙數下標的圖片 從0開始 */}
                <View style={{...s.columnContainer, marginLeft:pxToDp(10)}}>
                    <EventCard data={dataList[0]} style={s.cardContainer}></EventCard>
                    <EventCard data={dataList[2]} style={s.cardContainer}></EventCard>
                    <EventCard data={dataList[4]} style={s.cardContainer}></EventCard>
                    <EventCard data={dataList[4]} style={s.cardContainer}></EventCard>
                    <EventCard data={dataList[4]} style={s.cardContainer}></EventCard>
                </View>

                {/* 右側的列 放置單數下標的圖片 */}
                <View style={{...s.columnContainer, marginRight:pxToDp(10)}}>
                    {/* <View style={{height:pxToDp(80), width:'100%'}}>
                        <Text>點擊卡片可以看到更詳細的說明哦~</Text>
                    </View> */}
                    <EventCard data={dataList[1]} style={s.cardContainer}></EventCard>
                    <EventCard data={dataList[3]} style={s.cardContainer}></EventCard>
                    <EventCard data={dataList[5]} style={s.cardContainer}></EventCard>
                    <EventCard data={dataList[5]} style={s.cardContainer}></EventCard>
                    <EventCard data={dataList[5]} style={s.cardContainer}></EventCard>
                </View>
            </View>
            <Text>{'\n'}</Text>
            <Text>{'\n'}</Text>
            </SpringScrollView>
        );
    }
}

const s = StyleSheet.create({
    // 列容器的樣式
    columnContainer:{
        // flex:1,
        // alignItems:'center',
    },
    // 活動卡片
    cardContainer:{
        marginTop:pxToDp(15)
    }
})

export default EventPage;