import React, {Component} from 'react';
import {View, Image, Text, ImageBackground, Dimensions} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {NavigationContext} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import {TouchableOpacity} from 'react-native-gesture-handler';

class EventCard extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    state = {
        data: this.props.data,
    };

    // 處理點擊跳轉邏輯
    handleJumpToDetail = () => {
        const {name} = this.state.data;
        const {index} = this.props;
        this.context.navigate('ClubDetail', {
            name,
            index,
        });
    };

    render() {
        // 解構this.state.dataList數據
        const {imgUrl, name, tag} = this.state.data;
        // 當前點擊的數組下標，對應響應的組織
        const {index} = this.props;
        // 解構全局ui設計顏色
        const {white, black, viewShadow, themeColor} = COLOR_DIY;
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
                <FastImage
                    source={{uri: imgUrl}}
                    style={{
                        width: pxToDp(70),
                        height: pxToDp(70),
                        borderRadius: 50,
                    }}
                    resizeMode={FastImage.resizeMode.contain}
                />

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
                    #{tag}
                </Text>
            </TouchableOpacity>
        );
    }
}

export default EventCard;
