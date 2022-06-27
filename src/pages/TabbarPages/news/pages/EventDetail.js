import React, {Component} from 'react';
import {View, Image, Text, ImageBackground, TouchableOpacity, Dimensions} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap'
import {pxToDp} from '../../../../utils/stylesKits'

import {Header} from 'react-native-elements'; // 4.0 Beta版
import Ionicons from 'react-native-vector-icons/Ionicons'

class ClubDetail extends Component {
    state = {} 
    render() {
        // 獲取上級路由傳遞的參數
        const detailRoute = this.props.route.params;
        console.log(detailRoute);

        // 解耦uiMap的數據
        const {bg_color} = COLOR_DIY;

        return (
            <View style={{backgroundColor:bg_color, flex:1}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    leftComponent={
                        <TouchableOpacity onPress={()=>this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={COLOR_DIY.black.main}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '活動詳情',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{backgroundColor:'transparent', barStyle:'dark-content'}}
                />

                <Text>{detailRoute.eventID} 活動詳情頁</Text>
            </View>
        );
    }
}

export default ClubDetail;