// 體育設施頁
import React, { Component } from "react";
import { Text, View, TouchableOpacity } from "react-native";

import { COLOR_DIY, uiStyle } from '../../utils/uiMap'

import { WebView } from 'react-native-webview';
import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons'
import { scale } from "react-native-size-matters";

class UMWhole extends Component {
    render() {
        return (
            <View style={{ flex: 1 }}>
                <Header
                    backgroundColor={'#ffffff'}
                    leftComponent={
                        <TouchableOpacity onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={scale(25)}
                                color={COLOR_DIY.black.main}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '澳大討論區',
                        style: {
                            ...uiStyle.defaultText,
                            color: COLOR_DIY.black.main,
                            fontSize: scale(15),
                        },
                    }}
                    statusBarProps={{ backgroundColor: 'transparent', barStyle: 'dark-content' }}
                />

                <WebView
                    source={{ uri: 'https://umbbs.xyz/' }}
                    startInLoadingState={true}
                />
            </View>
        )
    }
}

export default UMWhole;