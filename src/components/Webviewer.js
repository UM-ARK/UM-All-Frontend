// 封裝：不用太多自定義的Webview，僅使用navigate跳轉
// 網址可以參考pathMap.js
import React, {Component} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';

import {COLOR_DIY} from '../utils/uiMap';
import {pxToDp} from '../utils/stylesKits';
import {WHAT_2_REG} from '../utils/pathMap';

import {WebView} from 'react-native-webview';
import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';

class WebViewer extends Component {
    constructor(props) {
        super(props);
        const {bg_color, black, white} = COLOR_DIY;

        // 獲取上級頁面傳遞的數據
        let data = this.props.route.params;

        // 定義默認參數
        let url = 'url' in data ? data.url : WHAT_2_REG;
        let title = 'title' in data ? data.title : '網址詳情';
        let text_color = 'text_color' in data ? data.text_color : black.main;
        let isBarStyleBlack =
            'isBarStyleBlack' in data ? data.isBarStyleBlack : true; // 狀態欄字體是否黑色
        let bg_color_diy =
            'bg_color_diy' in data ? data.bg_color_diy : bg_color;

        this.state = {
            title,
            text_color,
            bg_color_diy,
            isBarStyleBlack,
            url,
        };
    }

    render() {
        const {url, title, text_color, bg_color_diy, isBarStyleBlack} = this.state;

        return (
            <View style={{flex: 1}}>
                <Header
                    backgroundColor={bg_color_diy}
                    leftComponent={
                        <TouchableOpacity
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={text_color}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: title,
                        style: {
                            color: text_color,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: isBarStyleBlack
                            ? 'dark-content'
                            : 'light-content',
                    }}
                />

                <WebView source={{uri: url}} startInLoadingState={true} />
            </View>
        );
    }
}

export default WebViewer;
