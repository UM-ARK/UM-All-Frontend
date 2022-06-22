import React, { Component } from "react";
import {
    StyleSheet,
    Text,
    View,
} from "react-native";

import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'
import {Header} from 'react-native-elements'; // 4.0 Beta版

class Index extends Component {
    state = {  } 
    render() { 
        return (
            <View>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    centerComponent={{
                        text: '服務',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(20),
                        },
                    }}
                    statusBarProps={{backgroundColor:COLOR_DIY.bg_color, barStyle:'dark-content'}}
                />
                <Text>所有服務頁</Text>
            </View>
        );
    }
}

export default Index;