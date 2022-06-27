// https://i.pinimg.com/564x/16/d6/68/16d668bd5bf00285a7e21899eb4b420f.jpg
import React, {Component} from 'react';
import {View, Image, Text, ImageBackground, TouchableOpacity, Dimensions} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap'
import {pxToDp} from '../../../../utils/stylesKits'

import Ionicons from 'react-native-vector-icons/Ionicons'


const {width:PAGE_WIDTH}    = Dimensions.get('window');
const COMPONENT_WIDTH       = PAGE_WIDTH*0.25;

class EventCard extends Component {
	state = {
        dataList : this.props.data,
    }
    
	render() {
        // 解構this.state數據
        const {dataList} = this.state;
        // 解構dataList數據
        const {imgUrl, name, tag} = dataList;
        // 解構全局ui設計顏色
        const {white, black, viewShadow, themeColor} = COLOR_DIY;
        return (
			<TouchableOpacity style={{...this.props.style}} activeOpacity={0.9} >
                <View style={{width:pxToDp(COMPONENT_WIDTH), height:pxToDp(COMPONENT_WIDTH/0.8), backgroundColor:white, borderRadius:pxToDp(8),
                    justifyContent:'space-around', alignItems:'center', padding:pxToDp(10), paddingLeft:pxToDp(4), paddingRight:pxToDp(4), 
                    ...viewShadow
                }}>
                    {/* 社團 / 組織 Logo */}
                    <View>
                        <Image source={{uri:imgUrl}} style={{width:pxToDp(70),height:pxToDp(70), borderRadius:50}} resizeMode={'contain'} />
                    </View>

                    {/* 組織名 */}
                    <View style={{flexDirection:'row', justifyContent:'center', alignItems:'center', marginTop:pxToDp(5)}}>
                        <Text style={{color:black.main, fontSize:pxToDp(12)}} numberOfLines={1}>{name}</Text>
                    </View>

                    {/* 組織標籤 */}
                    <Text style={{color:themeColor, fontSize:pxToDp(10), marginTop:pxToDp(5)}}>#{tag}</Text>
                </View>
			</TouchableOpacity>
		);
	}
}

export default EventCard;