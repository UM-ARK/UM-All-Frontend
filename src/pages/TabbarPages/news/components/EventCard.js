import React, { Component } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';

import { COLOR_DIY } from '../../../../utils/uiMap';

// import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationContext } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import moment from 'moment-timezone';
import { scale } from 'react-native-size-matters';
import { inject } from 'mobx-react';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const { height: PAGE_HEIGHT } = Dimensions.get('window');

const IMAGE_SIZE = scale(160);
const BORDER_RADIUS = scale(8);

// 解構全局ui設計顏色
const { white, black, viewShadow, bg_color } = COLOR_DIY;

class EventCard extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    state = {
        coverImgUrl: undefined,
        title: undefined,
        clubName: undefined,
        startTimeStamp: undefined,
        finishTimeStamp: undefined,
        link: undefined,
        relateImgUrl: undefined,
        type: undefined,
        imgLoading: true,
        isAdmin: false,
    };

    componentDidMount() {
        // 解構this.props.data數據
        const eventData = this.props.data;
        this.setState({
            coverImgUrl: eventData.cover_image_url.replace('http:', 'https:'),
            title: eventData.title,
            clubName: eventData.club_name,
            startTimeStamp: eventData.startdatetime,
            finishTimeStamp: eventData.enddatetime,
            type: eventData.type,
            link: eventData.link,
            eventData,
        });
        let globalData = this.props.RootStore;
        // 社團賬號登錄
        if (globalData.userInfo && globalData.userInfo.clubData) {
            this.setState({ isAdmin: true });
        }
    }

    handleJumpToDetail = () => {
        const { type, link, title, isAdmin } = this.state;
        ReactNativeHapticFeedback.trigger('soft');
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
            if (isAdmin) {
                // 跳轉活動info編輯頁，並傳遞刷新函數
                this.context.navigate('EventSetting', {
                    mode: 'edit',
                    eventData: { _id: this.state.eventData._id },
                });
            } else {
                this.context.navigate('Webviewer', webview_param);
            }
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
            clubName,
            finishTimeStamp,
            startTimeStamp,
            link,
            relateImgUrl,
            type,
        } = this.state;

        // 當前時刻時間戳
        let nowTimeStamp = moment(new Date()).valueOf();
        // 活動進行中標誌
        let isFinish = nowTimeStamp > moment(finishTimeStamp).valueOf();
        // 活動即將結束標誌
        let isAlmost =
            moment(finishTimeStamp).diff(moment(nowTimeStamp), 'days') <= 3 &&
                moment(finishTimeStamp).isSameOrAfter(nowTimeStamp)
                ? true
                : false;

        return (
            <TouchableOpacity
                style={{
                    backgroundColor: white,
                    borderRadius: BORDER_RADIUS,
                    margin: scale(5),
                    ...viewShadow,
                }}
                activeOpacity={0.9}
                onPress={this.handleJumpToDetail}>
                {/* 即將結束標識 */}
                {/* {isAlmost ? (
                    <View
                        style={{
                            ...styles.rightTopIconPosition,
                            ...styles.unFinish,
                            backgroundColor: COLOR_DIY.unread,
                            zIndex: 9,
                        }}>
                        <Text style={{ fontSize: scale(10), color: white }}>
                            將結束
                        </Text>
                    </View>
                ) : (
                    isFinish ? null : (
                        <View
                            style={{
                                ...styles.rightTopIconPosition,
                                ...styles.unFinish,
                                zIndex: 9,
                            }}>
                            <Text style={{ fontSize: scale(10), color: white }}>
                                進行中
                            </Text>
                        </View>
                    )
                )} */}
                {coverImgUrl ? (
                    <View
                        style={{
                            borderRadius: BORDER_RADIUS,
                            overflow: 'hidden',
                        }}>
                        <FastImage
                            source={{
                                uri: coverImgUrl,
                                // cache: FastImage.cacheControl.web,
                            }}
                            // fallback={Platform.OS === 'android'}
                            style={{
                                width: IMAGE_SIZE,
                                height: IMAGE_SIZE,
                                backgroundColor: white,
                            }}
                            resizeMode={FastImage.resizeMode.cover}
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

                        {/* 活動簡單描述 */}
                        <View style={styles.title.container}>
                            <View style={{ width: '100%' }}>
                                {/* 活動標題 */}
                                <Text
                                    style={styles.title.text}
                                    numberOfLines={3}>
                                    {title}
                                </Text>
                                {/* 標識 & 組織名 */}
                                <View style={{
                                    marginTop: scale(5),
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    width: '100%'
                                }}>
                                    {/* 即將結束標識 */}
                                    {isAlmost ? (
                                        <View
                                            style={{
                                                // ...styles.rightTopIconPosition,
                                                ...styles.unFinish,
                                                borderColor: COLOR_DIY.unread,
                                            }}>
                                            <Text style={{
                                                ...styles.stateNoticeText,
                                                color: COLOR_DIY.unread
                                            }}>
                                                將結束
                                            </Text>
                                        </View>
                                    ) : (
                                        isFinish ? (
                                            <View style={{
                                                paddingHorizontal: scale(1),
                                                borderColor: black.third, borderWidth: scale(1), borderRadius: scale(4)
                                            }}>
                                                <Text style={{
                                                    ...styles.stateNoticeText,
                                                    color: black.third
                                                }}>
                                                    UP
                                                </Text>
                                            </View>
                                        ) : (
                                            <View
                                                // ...styles.rightTopIconPosition,
                                                style={{ ...styles.unFinish }}>
                                                <Text style={{
                                                    ...styles.stateNoticeText,
                                                    color: COLOR_DIY.secondThemeColor
                                                }}>
                                                    進行中
                                                </Text>
                                            </View>
                                        )
                                    )}
                                    {/* 組織名 */}
                                    <View style={{
                                        // marginLeft: isFinish ? null : scale(3),
                                        marginLeft: scale(3),
                                        width: isFinish ? '100%' : '80%',
                                    }}>
                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                color: black.third,
                                                fontSize: scale(9),
                                            }}>
                                            {clubName}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    }
}

const styles = StyleSheet.create({
    // 右上角紅點提示位置
    rightTopIconPosition: {
        position: 'absolute',
        right: 0,
        top: 0,
    },
    // 紅點標籤樣式
    unFinish: {
        paddingHorizontal: scale(2),
        paddingVertical: scale(1),
        borderColor: COLOR_DIY.secondThemeColor,
        borderRadius: scale(20),
        borderWidth: scale(1),
        zIndex: 9,
        // ...COLOR_DIY.viewShadow,
    },
    stateNoticeText: {
        fontSize: scale(7)
    },
    title: {
        container: {
            backgroundColor: white,
            width: IMAGE_SIZE,
            padding: scale(8),
            // flexDirection: 'row',
            // alignItems: 'center',
        },
        text: {
            color: black.main,
            fontWeight: '500',
            fontSize: scale(11),
        }
    },
});

export default inject('RootStore')(EventCard);
