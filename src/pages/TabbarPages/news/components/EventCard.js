// https://i.pinimg.com/564x/16/d6/68/16d668bd5bf00285a7e21899eb4b420f.jpg
import React, {Component} from 'react';
import {View, Text, ImageBackground, TouchableOpacity} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap'
import {pxToDp} from '../../../../utils/stylesKits'

import Ionicons from 'react-native-vector-icons/Ionicons'
import {NavigationContext} from '@react-navigation/native'


// 時間戳轉時間
function timeTrans(date){
    var date = new Date(date);
    var Y = date.getFullYear();
    var M = (date.getMonth()+1 < 10 ? '0'+(date.getMonth()+1) : date.getMonth()+1);
    var D = (date.getDate() < 10 ? '0' + (date.getDate()) : date.getDate());
    var h = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours());
    var m = (date.getMinutes() <10 ? '0' + date.getMinutes() : date.getMinutes());
    var s = (date.getSeconds() <10 ? '0' + date.getSeconds() : date.getSeconds());
    return M+'/'+D;
}

class EventCard extends Component {
	// NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

	state = {}

	render() {
		// 解構this.state數據
		const {dataList} = this.state;
		// 解構this.props.data數據
		const {imgUrl, title, timeStamp, eventID} = this.props.data;
		// 解構全局ui設計顏色
		const {white, black, viewShadow} = COLOR_DIY;

		return (
			<TouchableOpacity style={{...this.props.style}} activeOpacity={0.9} 
				onPress={()=>{
					// alert(`跳轉eventID為 ${eventID} 的活動詳情頁`)
					this.context.navigate('EventDetail', {
						eventID,
					})
				}}
				onLongPress={()=>alert('長按！！')}
			>
				<ImageBackground
					source={{uri:imgUrl}}
					style={{width:pxToDp(160), height:pxToDp(230), borderRadius:pxToDp(8), overflow:'hidden', ...viewShadow}}
				>
					{/* 標題描述 */}
					<View style={{backgroundColor:white, position:'absolute', bottom:0, width:'100%', 
						padding:pxToDp(10), flexDirection:'row', alignItems:'center'
					}}>
						{/* 標題文字 & 日期 */}
						<View style={{width:'90%'}}>
							<Text style={{color:black.main}} numberOfLines={3}>{title}</Text>
							{/* 日期 */}
							<Text style={{color:black.third }}>{timeTrans(timeStamp)}</Text>
						</View>

						{/* 點擊指示圖標 */}
						<View>
							<Ionicons name="chevron-forward-outline" color={black.third} size={pxToDp(20)}></Ionicons>
						</View>
					</View>
				</ImageBackground>
			</TouchableOpacity>
		);
	}
}

export default EventCard;