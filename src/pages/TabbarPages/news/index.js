import React, {Component} from 'react';
import {Text, View} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'
import {Header} from 'react-native-elements'; // 4.0 Beta版

import EventPage from './EventPage'
import ClubPage from './ClubPage'

// 可以嘗試使用粘性標題組件：react-native-sticky-parallax-header

class NewsScreen extends Component {
    render() {
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
                {/* 社團活動 */}
                {/* <EventPage></EventPage> */}

                {/* 社團大廳 */}
                {/* <ClubPage></ClubPage> */}
            </View>
        );
    }
}

export default NewsScreen;
