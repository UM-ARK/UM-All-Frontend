// 封裝：不用太多自定義的Webview，僅使用navigate跳轉
// 網址可以參考pathMap.js
import React, {Component} from 'react';
import {Text, View, TouchableOpacity, Linking, StyleSheet} from 'react-native';

import {COLOR_DIY} from '../utils/uiMap';
import {pxToDp} from '../utils/stylesKits';
import IntegratedWebView from './IntegratedWebView';
import {WHAT_2_REG} from '../utils/pathMap';
import ModalBottom from '../components/ModalBottom';

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';

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
            needRefresh: false,
            isShowModal: false,
        };
    }

    // 切換Webview刷新標識
    triggerRefresh = () => {
        this.setState({needRefresh: !this.state.needRefresh});
        this.setState({isShowModal: false});
    };

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        this.setState({isShowModal: !this.state.isShowModal});
    };

    render() {
        const {url, title, text_color, bg_color_diy, isBarStyleBlack} =
            this.state;

        return (
            <View style={{flex: 1}}>
                <Header
                    backgroundColor={bg_color_diy}
                    leftComponent={
                        <TouchableOpacity
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="close"
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
                    rightComponent={
                        <TouchableOpacity onPress={this.tiggerModalBottom}>
                            <Feather
                                name="more-horizontal"
                                size={pxToDp(25)}
                                color={text_color}
                            />
                        </TouchableOpacity>
                    }
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: isBarStyleBlack
                            ? 'dark-content'
                            : 'light-content',
                    }}
                />

                {this.state.isShowModal && (
                    <ModalBottom cancel={this.tiggerModalBottom}>
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-around',
                                padding: pxToDp(20),
                                marginBottom: pxToDp(10),
                            }}>
                            {/* 瀏覽器打開 */}
                            {url && (
                                <View
                                    style={{
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                    <TouchableOpacity
                                        style={{...s.iconContainer}}
                                        onPress={() => Linking.openURL(url)}>
                                        <Ionicons
                                            name="navigate-outline"
                                            size={pxToDp(30)}
                                            color={COLOR_DIY.black.second}
                                        />
                                    </TouchableOpacity>
                                    <Text
                                        style={{
                                            marginTop: pxToDp(5),
                                            color: COLOR_DIY.themeColor,
                                        }}>
                                        瀏覽器打開
                                    </Text>
                                </View>
                            )}

                            {/* 刷新頁面 */}
                            <View
                                style={{
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                <TouchableOpacity
                                    style={{...s.iconContainer}}
                                    onPress={this.triggerRefresh}>
                                    <Ionicons
                                        name="refresh"
                                        size={pxToDp(30)}
                                        color={COLOR_DIY.black.second}
                                    />
                                </TouchableOpacity>
                                <Text
                                    style={{
                                        marginTop: pxToDp(2),
                                        color: COLOR_DIY.themeColor,
                                    }}>
                                    刷新頁面
                                </Text>
                            </View>
                        </View>
                    </ModalBottom>
                )}

                <IntegratedWebView
                    source={{uri: url}}
                    needRefresh={this.state.needRefresh}
                    triggerRefresh={this.triggerRefresh}
                />
            </View>
        );
    }
}

const s = StyleSheet.create({
    iconContainer: {
        backgroundColor: COLOR_DIY.white,
        width: pxToDp(60),
        height: pxToDp(60),
        borderRadius: pxToDp(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default WebViewer;
