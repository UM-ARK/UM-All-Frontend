import React, {Component} from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {NavigationContext} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import moment from 'moment-timezone';
import {scale} from 'react-native-size-matters';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');

const IMAGE_SIZE = scale(160);

// 解構全局ui設計顏色
const {white, black, viewShadow, bg_color} = COLOR_DIY;

class EventCard extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    state = {
        coverImgUrl: undefined,
        title: undefined,
        startTimeStamp: undefined,
        finishTimeStamp: undefined,
        link: undefined,
        relateImgUrl: undefined,
        type: undefined,
        imgLoading: true,
    };

    componentDidMount() {
        // 解構this.props.data數據
        const eventData = this.props.data;
        // TODO: 檢查IOS上enddatetime的表現形式
        this.setState({
            coverImgUrl: eventData.cover_image_url.replace('http:', 'https:'),
            title: eventData.title,
            startTimeStamp: eventData.startdatetime,
            finishTimeStamp: eventData.enddatetime,
            type: eventData.type,
            link: eventData.link,
            eventData,
        });
    }

    handleJumpToDetail = () => {
        const {type, link, title} = this.state;
        let webview_param = {
            // import pathMap的鏈接進行跳轉
            url: link,
            title: title,
            // 標題顏色，默認為black.main
            // text_color: '#002c55',
            // 標題背景顏色，默認為bg_color
            // bg_color_diy: '#fff',
            // 狀態欄字體是否黑色，默認true
            // isBarStyleBlack: false,
        };
        if (type == 'WEBSITE') {
            this.context.navigate('Webviewer', webview_param);
        } else {
            this.context.navigate('EventDetail', {
                data: this.state.eventData,
            });
        }
    };

    render() {
        const {
            coverImgUrl,
            title,
            finishTimeStamp,
            startTimeStamp,
            link,
            relateImgUrl,
            type,
        } = this.state;

        // 當前時刻時間戳
        let nowTimeStamp = moment(new Date()).valueOf();
        // 活動結束標誌
        let isFinish = nowTimeStamp > moment(finishTimeStamp).valueOf();

        return (
            <View style={{...this.props.style}}>
                {/* 未結束紅點標識 */}
                {isFinish ? null : (
                    <View
                        style={{
                            ...styles.rightTopIconPosition,
                            ...styles.unFinish,
                            zIndex: 9,
                        }}
                    />
                )}
                {coverImgUrl ? (
                    <TouchableOpacity
                        style={{
                            borderRadius: pxToDp(8),
                            overflow: 'hidden',
                            ...viewShadow,
                        }}
                        activeOpacity={0.9}
                        onPress={this.handleJumpToDetail}>
                        <FastImage
                            source={{
                                uri: coverImgUrl,
                                // cache: FastImage.cacheControl.web,
                            }}
                            // fallback={Platform.OS === 'android'}
                            style={{
                                width: IMAGE_SIZE,
                                height: IMAGE_SIZE,
                                backgroundColor: COLOR_DIY.white,
                            }}
                            resizeMode={FastImage.resizeMode.cover}
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

                        {/* 標題描述 */}
                        <View style={styles.title.container}>
                            {/* 標題文字 & 日期 */}
                            <View style={{width: '90%'}}>
                                <Text
                                    style={{color: black.main}}
                                    numberOfLines={3}>
                                    {title}
                                </Text>
                                {/* 日期 */}
                                <Text style={{color: black.third}}>
                                    {moment(startTimeStamp).format('MM-DD')}
                                </Text>
                            </View>

                            {/* 點擊指示圖標 */}
                            <View>
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={pxToDp(20)}></Ionicons>
                            </View>
                        </View>
                    </TouchableOpacity>
                ) : null}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    // 右上角紅點提示位置
    rightTopIconPosition: {
        position: 'absolute',
        right: -pxToDp(1),
        top: -pxToDp(3),
    },
    // 紅點標籤樣式
    unFinish: {
        height: pxToDp(12),
        width: pxToDp(12),
        backgroundColor: COLOR_DIY.unread,
        borderRadius: 50,
        ...COLOR_DIY.viewShadow,
    },
    title: {
        container: {
            backgroundColor: white,
            width: IMAGE_SIZE,
            padding: pxToDp(10),
            flexDirection: 'row',
            alignItems: 'center',
        },
    },
});

export default EventCard;
