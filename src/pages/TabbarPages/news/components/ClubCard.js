import React, { Component } from 'react';
import {
    View,
    Image,
    Text,
    ImageBackground,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';

import { COLOR_DIY, uiStyle } from '../../../../utils/uiMap';
import { clubTagMap } from '../../../../utils/clubMap';
import { trigger } from '../../../../utils/trigger';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationContext } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import { scale } from 'react-native-size-matters';

// 解構全局ui設計顏色
const { white, black, viewShadow, themeColor } = COLOR_DIY;
const IMG_SIZE = scale(45);

class EventCard extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    state = {
        data: this.props.data,
        imgLoading: true,
    };

    // 處理點擊跳轉邏輯
    handleJumpToDetail = () => {
        trigger();
        this.context.navigate('ClubDetail', {
            data: this.state.data,
        });
    };

    render() {
        const { logo_url, name, tag } = this.state.data;
        return (
            <TouchableOpacity
                style={{
                    backgroundColor: white,
                    borderRadius: scale(10),
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    paddingVertical: scale(8),
                }}
                activeOpacity={0.8}
                onPress={this.handleJumpToDetail}>
                {/* 社團 / 組織 Logo */}
                <View
                    style={{
                        width: IMG_SIZE,
                        height: IMG_SIZE,
                        borderRadius: 50,
                        backgroundColor: COLOR_DIY.white,
                        // ...viewShadow,
                    }}>
                    <FastImage
                        source={{ uri: logo_url }}
                        style={{
                            backgroundColor: COLOR_DIY.trueWhite,
                            width: '100%',
                            height: '100%',
                            borderRadius: 50,
                            overflow: 'hidden',
                        }}
                        resizeMode={FastImage.resizeMode.contain}
                        onLoadStart={() => {
                            this.setState({ imgLoading: true });
                        }}
                        onLoad={() => {
                            this.setState({ imgLoading: false });
                        }}>
                        {this.state.imgLoading ? (
                            <View
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'absolute',
                                }}>
                                <ActivityIndicator
                                    size={'large'}
                                    color={COLOR_DIY.themeColor}
                                />
                            </View>
                        ) : null}
                    </FastImage>
                </View>

                {/* 組織名 */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: scale(5),
                        width: '80%'
                    }}>
                    <Text
                        style={{ ...uiStyle.defaultText, color: black.main, fontSize: scale(10) }}
                        numberOfLines={1}>
                        {name}
                    </Text>
                </View>

                {/* 組織標籤 */}
                {/* <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: themeColor,
                        fontSize: scale(10),
                        marginTop: scale(5),
                    }}>
                    #{clubTagMap(tag)}
                </Text> */}
            </TouchableOpacity>
        );
    }
}

export default EventCard;
