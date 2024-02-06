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
import { scale, verticalScale } from 'react-native-size-matters';
import TouchableScale from "react-native-touchable-scale";

// 解構全局ui設計顏色
const { white, black, viewShadow, themeColor } = COLOR_DIY;
const IMG_SIZE = verticalScale(45);

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
        setTimeout(() => {
            this.context.navigate('ClubDetail', {
                data: this.state.data,
            });
        }, 50);
    };

    render() {
        const { logo_url, name, tag } = this.state.data;
        return (
            <TouchableScale
                style={{
                    backgroundColor: white,
                    borderRadius: scale(10),
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    paddingVertical: scale(8),
                    margin: scale(3),
                }}
                activeOpacity={0.8}
                onPress={this.handleJumpToDetail}>
                {/* 社團 / 組織 Logo */}
                <FastImage
                    source={{ uri: logo_url }}
                    style={{
                        backgroundColor: COLOR_DIY.trueWhite,
                        width: IMG_SIZE,
                        height: IMG_SIZE,
                        borderRadius: scale(50),
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
                        style={{ ...uiStyle.defaultText, color: black.main, fontSize: verticalScale(10) }}
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
            </TouchableScale>
        );
    }
}

export default EventCard;
