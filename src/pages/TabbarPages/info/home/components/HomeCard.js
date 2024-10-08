import React, { Component } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
} from 'react-native';

import { COLOR_DIY, uiStyle } from '../../../../../utils/uiMap';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import { scale, verticalScale } from 'react-native-size-matters';
import { screenWidth } from "../../../../../utils/stylesKits";
import { t } from "i18next";

// 解構全局ui設計顏色
const { white, black, viewShadow } = COLOR_DIY;

class HomeCard extends Component {
    state = {
        imgLoading: true,
        // 发布日期
        publishDate: '08-15',
        // 配圖
        haveImage: undefined,
        imageUrls: undefined,
        haveImage: false,
        imageUrls: '',
        // 发布用户
        userName: 'ARK ALL',
        userType: t('開發者'),
        userImage: {
            profilePhoto: require('../../../../../static/img/logo.png'),
        },
        //是否關注
        ifFollowed: false,
    };

    render() {
        const {
            imgLoading,
            publishDate,
            content,
            haveImage,
            imageUrls,
            userName,
            userType,
            userImage,
            ifFollowed,
        } = this.state;

        return (
            <View style={[styles.homeCard, this.props.style]}>
                {/* 用户信息 */}
                <View style={styles.userInformation}>
                    {/*用户头像*/}
                    <TouchableOpacity activeOpacity={1} onPress={() => { }}>
                        {/* 這裡點擊跳轉組織頁面,但還沒做 */}
                        <Image
                            style={{
                                width: verticalScale(35),
                                height: verticalScale(35),
                                borderRadius: scale(45),
                            }}
                            source={userImage.profilePhoto}
                        />
                    </TouchableOpacity>

                    {/* 其他信息 */}
                    <TouchableOpacity activeOpacity={1} onPress={() => { }}>
                        <View
                            style={{
                                marginHorizontal: scale(10),
                            }}>
                            {/*用户名*/}
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: verticalScale(15),
                                    color: COLOR_DIY.black.second,
                                }}>
                                {userName}
                            </Text>
                            {/* 組織身分/发帖日期 */}
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: verticalScale(12),
                                    color: 'grey',
                                }}>
                                {userType}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* 關注按鈕 */}
                    {false && (
                        <TouchableOpacity
                            style={{
                                position: 'absolute',
                                marginLeft: scale(250),
                                width: scale(75),
                                height: scale(25),
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: ifFollowed
                                    ? COLOR_DIY.secondThemeColor
                                    : COLOR_DIY.themeColor,
                                borderRadius: scale(10),
                            }}
                            activeOpacity={0.8}
                            onPress={() =>
                                this.setState({
                                    ifFollowed: !this.state.ifFollowed,
                                })
                            }>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: 'white',
                                    fontWeight: 'bold',
                                }}>
                                {ifFollowed ? 'Followed' : 'Follow'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* 發表內容 */}
                <View style={styles.Container}>
                    <View style={styles.ContentContainer}>
                        {/* TODO: 點擊正文跳轉詳情頁 */}
                        {/* 正文内容 */}
                        {this.props.children}
                        {/* 配圖 然而不大会做 */}
                        {haveImage && (
                            <View style={{ alignSelf: 'center' }}>
                                <View
                                    style={{
                                        borderRadius: scale(10),
                                        overflow: 'hidden',
                                        ...viewShadow,
                                        backgroundColor: white,
                                    }}>
                                    <FastImage
                                        source={{
                                            uri: imageUrls[0].replace(
                                                'http:',
                                                'https:',
                                            ),
                                            // cache: FastImage.cacheControl.web,
                                        }}
                                        onLoadStart={() => {
                                            this.setState({ imgLoading: true });
                                        }}
                                        onLoad={() => {
                                            this.setState({ imgLoading: false });
                                        }}
                                        style={styles.newsCardImg}
                                        resizeMode={FastImage.resizeMode.cover}
                                    />
                                    {this.state.imgLoading ? (
                                        <View
                                            style={{
                                                ...styles.newsCardImg,
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
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    homeCard: {
        backgroundColor: white,
        marginTop: verticalScale(10),
        borderRadius: 10,
        width: screenWidth * 0.95,
    },
    userInformation: {
        flexDirection: 'row',
        marginTop: verticalScale(10),
        marginHorizontal: scale(15),
        alignItems: 'center',
    },
    Container: {
        backgroundColor: white,
        marginBottom: verticalScale(7),
        marginHorizontal: scale(10),
        borderRadius: scale(10),
    },
    ContentContainer: {
        // justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(8),
    },
    newsCardImg: {
        width: verticalScale(125),
        height: verticalScale(100),
    },
});

export default HomeCard;
