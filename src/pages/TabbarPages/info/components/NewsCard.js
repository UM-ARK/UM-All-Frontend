import React, { Component, useContext, useState, memo, useCallback, } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, } from 'react-native';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';

import { NavigationContext } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import moment from 'moment-timezone';
import { scale, verticalScale } from 'react-native-size-matters';
import TouchableScale from "react-native-touchable-scale";

const getDateColor = (type, beginMomentDate, nowMomentDate, themeColor, secondThemeColor, black) => {
    if (type === 'event') {
        if (beginMomentDate.isSameOrAfter(nowMomentDate)) {
            return secondThemeColor;
        }
        if (beginMomentDate.isSame(nowMomentDate, 'day')) {
            return themeColor;
        }
    }
    return black.third;
};

const NewsCard = ({ data, type = 'news' }) => {
    // NavigationContext组件可以在非基页面拿到路由信息
    const navigation = useContext(NavigationContext);
    const { theme } = useTheme();
    const { white, black, viewShadow, themeColor, secondThemeColor } = theme;

    const [imgLoading, setImgLoading] = useState(true);

    const styles = StyleSheet.create({
        newsCardContainer: {
            backgroundColor: white,
            marginVertical: verticalScale(5),
            marginHorizontal: scale(10),
            borderRadius: scale(10),
        },
        newsCardContentContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: verticalScale(10),
            paddingVertical: verticalScale(8),
        },
        newsCardImg: {
            width: verticalScale(80),
            height: verticalScale(112),
        },
    });

    // 开始日期
    const beginDate = type === 'event' ? data.common.dateFrom : data.common.publishDate;
    const beginMomentDate = moment(beginDate);
    const nowMomentDate = moment(new Date());
    // 活动类型日期颜色
    const dateColor = getDateColor(type, beginMomentDate, nowMomentDate, themeColor, secondThemeColor, black);

    // 匹配对应语言的标题
    let title_cn = '';
    let title_en = '';
    let title_pt = '';
    data.details.forEach(item => {
        if (item.locale === 'en_US') {
            title_en = item.title;
        } else if (item.locale === 'pt_PT') {
            title_pt = item.title;
        } else if (item.locale === 'zh_TW') {
            title_cn = item.title;
        }
    });

    // 图片处理
    let haveImage = undefined;
    let imageUrls = undefined;
    if (type === 'event') {
        haveImage = 'posterUrl' in data.common;
        imageUrls = haveImage ? data.common.posterUrl.replace('http:', 'https:') : '';
    } else {
        haveImage = 'imageUrls' in data.common;
        imageUrls = haveImage ? data.common.imageUrls[0].replace('http:', 'https:') : '';
    }

    // 点击跳转逻辑
    const handlePress = useCallback(() => {
        trigger();
        setTimeout(() => {
            navigation.navigate(
                type === 'news' ? 'NewsDetail' : 'UMEventDetail',
                { data },
            );
        }, 50);
    }, [navigation, type, data]);

    return (
        <TouchableScale
            style={styles.newsCardContainer}
            activeOpacity={0.8}
            onPress={handlePress}
            disabled={!haveImage} // 没有图片时禁用点击
        >
            {/* 文字居左，图片居右 */}
            <View style={styles.newsCardContentContainer}>
                {/* 标题 */}
                <View style={{ width: haveImage ? '70%' : '100%', flexDirection: 'column' }}>
                    {/* 英文标题 */}
                    {title_en.length > 0 && (
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontWeight: 'bold',
                                color: black.main,
                                fontSize: verticalScale(13),
                            }}
                            numberOfLines={3}>
                            {title_en}
                        </Text>
                    )}
                    {/* 中文标题 */}
                    {title_cn.length > 0 && (
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: title_en.length > 0 ? verticalScale(12) : verticalScale(14),
                                color: title_en.length > 0 ? black.second : black.main,
                            }}
                            numberOfLines={2}>
                            {title_cn}
                        </Text>
                    )}
                    {/* 葡文标题 */}
                    {(title_en.length === 0 || title_cn.length === 0) && (
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: title_en.length > 0 ? verticalScale(12) : verticalScale(14),
                                color: title_en.length > 0 ? black.second : black.main,
                            }}
                            numberOfLines={2}>
                            {title_pt}
                        </Text>
                    )}

                    {/* 活动类型展示日期 */}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: verticalScale(12),
                            fontWeight: 'bold',
                            color: dateColor,
                            ...(haveImage
                                ? { position: 'absolute', bottom: 0 }
                                : { marginTop: scale(6) } // 沒有圖片時正常流式顯示，並加點間距
                            ),
                        }}
                    >
                        @ {moment(beginDate).format('MM-DD')}
                    </Text>
                </View>

                {/* 新闻卡片配图 */}
                {haveImage && (
                    <View style={{ alignSelf: 'center' }}>
                        <View style={{
                            borderRadius: scale(10),
                            overflow: 'hidden',
                            ...viewShadow,
                            backgroundColor: white,
                        }}>
                            <FastImage
                                source={{ uri: imageUrls }}
                                onLoadEnd={() => setImgLoading(false)}
                                onError={() => setImgLoading(true)}
                                style={styles.newsCardImg}
                                resizeMode={FastImage.resizeMode.cover}
                            />
                            {imgLoading && (
                                <View style={{
                                    ...styles.newsCardImg,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'absolute',
                                }}>
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
        </TouchableScale>
    );
};

export default NewsCard;