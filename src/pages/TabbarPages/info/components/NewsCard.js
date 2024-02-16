import React, { Component } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';

import { COLOR_DIY, uiStyle } from '../../../../utils/uiMap';
import { trigger } from '../../../../utils/trigger';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationContext } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import moment from 'moment-timezone';
import { scale, verticalScale } from 'react-native-size-matters';
import TouchableScale from "react-native-touchable-scale";

// 解構全局ui設計顏色
const { white, black, viewShadow } = COLOR_DIY;

class NewsCard extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    state = {
        imgLoading: true,
    };

    render() {
        // 接收NewsPage頁傳來的該卡片需要渲染的信息
        const newsData = this.props.data;
        let type = this.props.type ? this.props.type : 'news';
        // 開始日期
        let beginDate = type == 'event' ? newsData.common.dateFrom : newsData.common.publishDate;
        // 最後更新時間
        // let lastModified= newsData.lastModified;
        // 匹配對應語言的標題，經測試：有時只有1 or 2 or 3種文字的標題
        // 中文標題
        let title_cn = '';
        // 英文標題
        let title_en = '';
        // 葡文標題
        let title_pt = '';
        newsData.details.map(item => {
            if (item.locale == 'en_US') {
                title_en = item.title;
            } else if (item.locale == 'pt_PT') {
                title_pt = item.title;
            } else if (item.locale == 'zh_TW') {
                title_cn = item.title;
            }
        });
        let dateColor = black.third;
        let beginMomentDate = moment(beginDate);
        let nowMomentDate = moment(new Date());

        // 相片數組
        let haveImage = undefined;
        let imageUrls = undefined;
        // 活動類型
        if (type == 'event') {
            haveImage = 'posterUrl' in newsData.common;
            imageUrls = haveImage ? newsData.common.posterUrl : '';
            if (beginMomentDate.isSameOrAfter(nowMomentDate)) {
                dateColor = COLOR_DIY.secondThemeColor
            }
            if (beginMomentDate.isSame(nowMomentDate, 'day')) {
                dateColor = COLOR_DIY.themeColor
            }
        }
        // 新聞類型
        // type為news時會有無圖情況
        else {
            haveImage = 'imageUrls' in newsData.common;
            imageUrls = haveImage ? newsData.common.imageUrls : '';
        }

        if (haveImage) {
            if (type == 'event') {
                imageUrls = imageUrls.replace('http:', 'https:',);
            } else {
                imageUrls = imageUrls[0].replace('http:', 'https:',);
            }
        }

        return (
            <TouchableScale
                style={styles.newsCardContainer}
                activeOpacity={0.8}
                onPress={() => {
                    trigger();
                    // 跳轉對應新聞的詳情頁
                    setTimeout(() => {
                        this.context.navigate(
                            type == 'news' ? 'NewsDetail' : 'UMEventDetail',
                            { data: newsData },
                        );
                    }, 50);
                }}
                // 沒有相片數據時，禁用點擊，跳轉頁面會引起閃退
                disabled={haveImage == false}
            >
                {/* 文字居左，圖片居右 */}
                <View style={styles.newsCardContentContainer}>
                    {/* 標題，有英文中文則顯示，無則顯示葡文 */}
                    <View style={{ width: haveImage ? '70%' : '100%', flexDirection: 'column' }}>
                        {/* 英文 */}
                        {title_en.length > 0 ? (
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
                        ) : null}
                        {/* 中文 */}
                        {title_cn.length > 0 ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize:
                                        title_en.length > 0
                                            ? verticalScale(12)
                                            : verticalScale(14),
                                    color:
                                        title_en.length > 0
                                            ? black.second
                                            : black.main,
                                }}
                                numberOfLines={2}>
                                {title_cn}
                            </Text>
                        ) : null}
                        {/* 葡文 */}
                        {(title_en.length == 0 || title_cn.length == 0) ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize:
                                        title_en.length > 0
                                            ? verticalScale(12)
                                            : verticalScale(14),
                                    color:
                                        title_en.length > 0
                                            ? black.second
                                            : black.main,
                                }}
                                numberOfLines={2}>
                                {title_pt}
                            </Text>
                        ) : null}

                        {/* 活動類型展示日期 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            fontSize: verticalScale(12),
                            fontWeight: 'bold',
                            position: 'absolute',
                            bottom: 0,
                            color: dateColor,
                        }}>
                            @ {moment(beginDate).format('MM-DD')}
                        </Text>
                    </View>

                    {/* 新聞卡片配圖 */}
                    {haveImage ? (
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
                                        uri: imageUrls,
                                        // cache: FastImage.cacheControl.web,
                                    }}
                                    onLoadStart={() => {
                                        this.setState({ imgLoading: true });
                                    }}
                                    onLoad={() => {
                                        this.setState({ imgLoading: false });
                                    }}
                                    style={styles.newsCardImg}
                                    // resizeMode={FastImage.resizeMode.cover}
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
                    ) : null}
                </View>
            </TouchableScale>
        );
    }
}

const styles = StyleSheet.create({
    newsCardContainer: {
        backgroundColor: white,
        marginVertical: verticalScale(5),
        marginHorizontal: scale(10),
        borderRadius: scale(10),
        // ...viewShadow,
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

export default NewsCard;
