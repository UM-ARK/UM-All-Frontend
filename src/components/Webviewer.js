// 封裝：不用太多自定義的Webview，僅使用navigate跳轉
// 網址可以參考pathMap.js
import React, { Component } from 'react';
import { Text, View, TouchableOpacity, Linking, StyleSheet, Appearance, } from 'react-native';

import { COLOR_DIY, uiStyle, } from '../utils/uiMap';
import IntegratedWebView from './IntegratedWebView';
import { ARK_WIKI } from '../utils/pathMap';
import { trigger } from '../utils/trigger';
import ModalBottom from '../components/ModalBottom';

import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale } from 'react-native-size-matters';

const isLight = Appearance.getColorScheme() == 'light';

class WebViewer extends Component {
    constructor(props) {
        super(props);
        const { bg_color, black, white } = COLOR_DIY;

        // 獲取上級頁面傳遞的數據
        let data = this.props.route.params;

        // 定義默認參數
        let url = 'url' in data ? data.url : ARK_WIKI;
        let title = 'title' in data ? data.title : '網址詳情';
        let text_color = 'text_color' in data ? data.text_color : black.main;
        let isBarStyleBlack =
            'isBarStyleBlack' in data ? data.isBarStyleBlack : (isLight ? true : false); // 狀態欄字體是否黑色
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
            UmPassInfo: {
                account: '',
                password: '',
            },
        };
    }

    async componentDidMount() {
        try {
            const strUmPassInfo = await AsyncStorage.getItem('umPass');
            const UmPassInfo = strUmPassInfo ? JSON.parse(strUmPassInfo) : {};
            if (JSON.stringify(UmPassInfo) != '{}') {
                this.setState({ UmPassInfo });
            }
        } catch (e) {
            alert(e);
        }
    }

    // 切換Webview刷新標識
    triggerRefresh = () => {
        trigger();
        this.setState({ needRefresh: !this.state.needRefresh });
        this.setState({ isShowModal: false });
    };

    // 設定當前URL
    setOutsideCurrentURL = (currentURL) => {
        this.setState({ url: currentURL });
    }

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        trigger();
        this.setState({ isShowModal: !this.state.isShowModal });
    };

    render() {
        const {
            url,
            title,
            text_color,
            bg_color_diy,
            isBarStyleBlack,
            UmPassInfo,
        } = this.state;

        return (
            <View style={{ flex: 1 }}>
                <Header
                    backgroundColor={bg_color_diy}
                    leftComponent={
                        <TouchableOpacity
                            onPress={() => {
                                trigger();
                                this.props.navigation.goBack();
                            }}>
                            <Ionicons
                                name="close"
                                size={scale(25)}
                                color={text_color}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: title,
                        style: {
                            ...uiStyle.defaultText,
                            color: text_color,
                            fontSize: scale(15),
                        },
                    }}
                    centerContainerStyle={{
                        justifyContent: 'center',
                        // 修復深色模式頂部小白條問題
                        borderBottomWidth: 0,
                    }}
                    rightComponent={
                        <TouchableOpacity onPress={this.tiggerModalBottom}>
                            <Feather
                                name="more-horizontal"
                                size={scale(25)}
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
                                padding: scale(20),
                                marginBottom: scale(10),
                            }}>
                            {/* 瀏覽器打開 */}
                            {url && (
                                <View
                                    style={{
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}>
                                    <TouchableOpacity
                                        style={{ ...s.iconContainer }}
                                        onPress={() => {
                                            trigger();
                                            Linking.openURL(url)
                                        }}>
                                        <Ionicons
                                            name="navigate-outline"
                                            size={scale(30)}
                                            color={COLOR_DIY.black.second}
                                        />
                                    </TouchableOpacity>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            marginTop: scale(5),
                                            color: COLOR_DIY.black.main,
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
                                    style={{ ...s.iconContainer }}
                                    onPress={this.triggerRefresh}>
                                    <Ionicons
                                        name="refresh"
                                        size={scale(30)}
                                        color={COLOR_DIY.black.second}
                                    />
                                </TouchableOpacity>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        marginTop: scale(2),
                                        color: COLOR_DIY.black.main,
                                    }}>
                                    刷新頁面
                                </Text>
                            </View>
                        </View>
                    </ModalBottom>
                )}

                <IntegratedWebView
                    source={{ uri: url }}
                    needRefresh={this.state.needRefresh}
                    triggerRefresh={this.triggerRefresh}
                    setOutsideCurrentURL={this.setOutsideCurrentURL}
                    UmPassInfo={UmPassInfo}
                    ref={this.webviewerRef}
                />
            </View>
        );
    }
}

const s = StyleSheet.create({
    iconContainer: {
        backgroundColor: COLOR_DIY.white,
        width: scale(60),
        height: scale(60),
        borderRadius: scale(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default WebViewer;
