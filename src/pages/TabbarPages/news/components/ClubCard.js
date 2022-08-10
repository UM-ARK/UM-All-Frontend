import React, {Component} from 'react';
import {
    View,
    Image,
    Text,
    ImageBackground,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';
import {clubTagMap} from '../../../../utils/clubMap';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {NavigationContext} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';

// 解構全局ui設計顏色
const {white, black, viewShadow, themeColor} = COLOR_DIY;

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
        this.context.navigate('ClubDetail', {
            data: this.state.data,
        });
    };

    render() {
        const {logo_url, name, tag} = this.state.data;
        return (
            <TouchableOpacity
                style={{
                    backgroundColor: white,
                    borderRadius: pxToDp(8),
                    justifyContent: 'space-around',
                    alignItems: 'center',
                    marginTop: pxToDp(2),
                    padding: pxToDp(10),
                    paddingHorizontal: pxToDp(4),
                    ...viewShadow,
                }}
                activeOpacity={0.8}
                onPress={this.handleJumpToDetail}>
                {/* 社團 / 組織 Logo */}
                <View
                    style={{
                        width: pxToDp(70),
                        height: pxToDp(70),
                        borderRadius: 50,
                        overflow: 'hidden',
                        backgroundColor: white,
                        ...viewShadow,
                    }}>
                    <FastImage
                        source={{
                            uri: logo_url,
                            // cache: FastImage.cacheControl.web,
                        }}
                        style={{
                            width: '100%',
                            height: '100%',
                        }}
                        resizeMode={FastImage.resizeMode.contain}
                        onLoadStart={() => {
                            this.setState({imgLoading: true});
                        }}
                        onLoad={() => {
                            this.setState({imgLoading: false});
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
                        marginTop: pxToDp(5),
                    }}>
                    <Text
                        style={{color: black.main, fontSize: pxToDp(12)}}
                        numberOfLines={1}>
                        {name}
                    </Text>
                </View>

                {/* 組織標籤 */}
                <Text
                    style={{
                        color: themeColor,
                        fontSize: pxToDp(10),
                        marginTop: pxToDp(5),
                    }}>
                    #{clubTagMap(tag)}
                </Text>
            </TouchableOpacity>
        );
    }
}

export default EventCard;
