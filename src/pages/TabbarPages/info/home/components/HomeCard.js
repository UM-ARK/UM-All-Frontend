import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, } from 'react-native';

import FastImage from 'react-native-fast-image';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from "i18next";

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../../components/ThemeContext';
import { screenWidth } from "../../../../../utils/stylesKits";

const HomeCard = (props) => {
    const { theme } = useTheme();
    const { white, black, viewShadow, secondThemeColor, themeColor } = theme;
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

    // 狀態管理
    const [imgLoading, setImgLoading] = useState(true);
    const [publishDate] = useState('08-15');
    const [haveImage] = useState(false);
    const [imageUrls] = useState('');
    const [userName] = useState('ARK ALL');
    const [userType] = useState(t('開發者'));
    const [userImage] = useState({
        profilePhoto: require('../../../../../static/img/logo.png'),
    });
    const [ifFollowed, setIfFollowed] = useState(false);

    return (
        <View style={[styles.homeCard, props.style]}>
            {/* 用户信息 */}
            <View style={styles.userInformation}>
                {/*用户头像*/}
                <TouchableOpacity activeOpacity={1} onPress={() => { /* 這裡點擊跳轉組織頁面,但還沒做 */ }}>
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
                    <View style={{ marginHorizontal: scale(10) }}>
                        {/*用户名*/}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: verticalScale(15),
                                color: black.second,
                            }}
                        >
                            {userName}
                        </Text>
                        {/* 組織身分/发帖日期 */}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: verticalScale(12),
                                color: 'grey',
                            }}
                        >
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
                                ? secondThemeColor
                                : themeColor,
                            borderRadius: scale(10),
                        }}
                        activeOpacity={0.8}
                        onPress={() => setIfFollowed(!ifFollowed)}
                    >
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: 'white',
                                fontWeight: 'bold',
                            }}
                        >
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
                    {props.children}
                    {/* 配圖 然而不大会做 */}
                    {haveImage && (
                        <View style={{ alignSelf: 'center' }}>
                            <View
                                style={{
                                    borderRadius: scale(10),
                                    overflow: 'hidden',
                                    ...viewShadow,
                                    backgroundColor: white,
                                }}
                            >
                                <FastImage
                                    source={{
                                        uri: imageUrls[0].replace('http:', 'https:'),
                                        // cache: FastImage.cacheControl.web,
                                    }}
                                    onLoadStart={() => setImgLoading(true)}
                                    onLoad={() => setImgLoading(false)}
                                    style={styles.newsCardImg}
                                    resizeMode={FastImage.resizeMode.cover}
                                />
                                {imgLoading && (
                                    <View
                                        style={{
                                            ...styles.newsCardImg,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            position: 'absolute',
                                        }}
                                    >
                                        <ActivityIndicator
                                            size={'large'}
                                            color={themeColor}
                                        />
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

export default HomeCard;
