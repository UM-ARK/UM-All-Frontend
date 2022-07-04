import React, {Component} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {NavigationContext} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';

// 時間戳轉時間
function timeTrans(date) {
    var date = new Date(date);
    var Y = date.getFullYear();
    var M =
        date.getMonth() + 1 < 10
            ? '0' + (date.getMonth() + 1)
            : date.getMonth() + 1;
    var D = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    var h = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    var m =
        date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    var s =
        date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return M + '/' + D;
}

class EventCard extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    handleJumpToDetail = () => {
        this.context.navigate('EventDetail', {
            data: this.props.data,
        });
    };

    render() {
        // 解構this.props.data數據
        const {imgUrl, title, timeStamp, eventID} = this.props.data;
        // 解構全局ui設計顏色
        const {white, black, viewShadow} = COLOR_DIY;

        // 當前時刻時間戳
        let nowTimeStamp = new Date().getTime();
        // 活動結束標誌
        let isFinish = nowTimeStamp > timeStamp;

        return (
            <View style={{...this.props.style}}>
                {/* 未結束紅點標識 */}
                {!isFinish && (
                    <View
                        style={{
                            ...styles.rightTopIconPosition,
                            ...styles.unFinish,
                            zIndex: 9,
                        }}
                    />
                )}
                <FastImage
                    source={{uri: imgUrl}}
                    style={{
                        width: pxToDp(160),
                        height: pxToDp(230),
                        borderRadius: pxToDp(8),
                        overflow: 'hidden',
                        ...viewShadow,
                    }}
                    resizeMode={FastImage.resizeMode.cover}>
                    {/* 標題描述 */}
                    <TouchableOpacity
                        style={{
                            backgroundColor: white,
                            position: 'absolute',
                            bottom: 0,
                            width: '100%',
                            padding: pxToDp(10),
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}
                        activeOpacity={0.9}
                        onPress={this.handleJumpToDetail}
                        disabled={this.props.touchDisable}>
                        {/* 標題文字 & 日期 */}
                        <View style={{width: '90%'}}>
                            <Text style={{color: black.main}} numberOfLines={3}>
                                {title}
                            </Text>
                            {/* 日期 */}
                            <Text style={{color: black.third}}>
                                {timeTrans(timeStamp)}
                            </Text>
                        </View>

                        {/* 點擊指示圖標 */}
                        <View>
                            <Ionicons
                                name="chevron-forward-outline"
                                color={black.third}
                                size={pxToDp(20)}></Ionicons>
                        </View>
                    </TouchableOpacity>
                </FastImage>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    // 右上角紅點提示位置
    rightTopIconPosition: {
        position: 'absolute',
        right: -3,
        top: -3,
    },
    // 紅點標籤樣式
    unFinish: {
        height: pxToDp(12),
        width: pxToDp(12),
        backgroundColor: COLOR_DIY.unread,
        borderRadius: 50,
        ...COLOR_DIY.viewShadow,
    },
});

export default EventCard;
