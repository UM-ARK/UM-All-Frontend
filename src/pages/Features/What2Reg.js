// 體育設施頁
import React, { Component } from "react";
import { Text, View, TouchableOpacity } from "react-native";

import {COLOR_DIY} from '../../utils/uiMap'
import {pxToDp} from '../../utils/stylesKits'

import { WebView } from 'react-native-webview';
import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons'

class UMWhole extends Component{
    render() {
        return (
            <View style={{flex:1}}>
                <Header
                    backgroundColor={'#1f5288'}
                    leftComponent={
                        <TouchableOpacity onPress={()=>this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={COLOR_DIY.white}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '澳大選咩課',
                        style: {
                            color: COLOR_DIY.white,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{backgroundColor:'transparent', barStyle:'dark-content'}}
                />

                <WebView 
                    source={{ uri:'https://www.umeh.top/' }} 
                    startInLoadingState={true}
                />
            </View>
        )
    }
}

export default UMWhole;