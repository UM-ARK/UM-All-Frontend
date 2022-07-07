// Webview跳轉測試

import React, {Component} from 'react';
import {
    Dimensions,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Button,
    Image,
} from 'react-native';

import {COLOR_DIY} from '../src/utils/uiMap';
import {pxToDp} from '../src/utils/stylesKits';
import {UM_MAP} from '../src/utils/pathMap';

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Webviewer from '../src/components/Webviewer';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('screen');

class TestScreen extends Component {
    render() {
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    leftComponent={
                        <TouchableOpacity
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={COLOR_DIY.black.main}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '測試頁',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(22),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: COLOR_DIY.bg_color,
                        barStyle: 'dark-content',
                    }}
                />

                <Button
                    title="打開Webview"
                    onPress={() => {
                        // 跳轉Webviewer組件，最好加上相關配置的跳轉參數
                        this.props.navigation.navigate('Webviewer', {
                            // import pathMap的鏈接進行跳轉
                            url: UM_MAP,
                            title: 'UM 地圖',
                            // 標題顏色，默認為black.main
                            // text_color: '#989898',
                            // 標題背景顏色，默認為bg_color
                            // bg_color_diy: 'red',
                            // 狀態欄字體是否黑色，默認true
                            // isBarStyleBlack: false,
                        });
                    }}></Button>
            </View>
        );
    }
}

export default TestScreen;
