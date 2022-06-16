// 使用WebView組件
// https://juejin.cn/post/6978299338795532302

import React, { Component } from "react";
import { Text, View } from "react-native";
import { WebView } from 'react-native-webview';

class Map extends Component{
    render() {
        return (
            <WebView 
                source={{ uri:'https://maps.um.edu.mo/' }} 
            />
        )
    }
}

export default Map;