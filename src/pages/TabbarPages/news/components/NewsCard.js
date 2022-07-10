import React, {Component} from 'react';
import {View, Text, StyleSheet} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {NavigationContext} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import {TouchableOpacity} from 'react-native-gesture-handler';

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
    return M + '-' + D;
}

class EventCard extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    render() {
        // 解構全局ui設計顏色
        const {white, black, viewShadow} = COLOR_DIY;

        // 接收NewsPage頁傳來的該卡片需要渲染的信息
        const newsData = this.props.data;
        // 發佈日期
        let publishDate = newsData.common.publishDate;
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
        // 中文標題
        // let title_cn = newsData.details[1].title;
        // 中文內容
        // let content_cn= newsData.details[1].content;
        // 英文標題
        // let title_en = newsData.details[0].title;
        // 英文內容
        // let content_en= newsData.details[0].content;
        // 相片數組
        // 有時無圖
        let haveImage = 'imageUrls' in newsData.common;
        let imageUrls = haveImage ? newsData.common.imageUrls : '';

        return (
            <TouchableOpacity
                style={{
                    backgroundColor: white,
                    marginVertical: pxToDp(7),
                    marginHorizontal: pxToDp(10),
                    borderRadius: pxToDp(10),
                    ...viewShadow,
                }}
                activeOpacity={0.7}
                onPress={() => {
                    console.log(this.props.data.details[1].title);
                    console.log(newsData.details[1].title);
                    this.context.navigate('NewsDetail', {data: newsData});
                }}>
                {/* 文字居左，圖片居右 */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        padding: pxToDp(10),
                        paddingVertical: pxToDp(8),
                    }}>
                    {/* 標題 */}
                    <View style={{width: haveImage ? '61%' : '100%'}}>
                        {/* 英文 */}
                        {title_en.length > 0 && (
                            <Text
                                style={{
                                    fontWeight: 'bold',
                                    color: black.main,
                                    fontSize: pxToDp(14),
                                }}
                                numberOfLines={3}>
                                {title_en}
                            </Text>
                        )}
                        {/* 中文 */}
                        {title_cn.length > 0 && (
                            <Text
                                style={{
                                    fontSize:
                                        title_en.length > 0
                                            ? pxToDp(13)
                                            : pxToDp(14),
                                    color:
                                        title_en.length > 0
                                            ? black.second
                                            : black.main,
                                }}
                                numberOfLines={2}>
                                {title_cn}
                            </Text>
                        )}
                        {/* 葡文 */}
                        {(title_en.length == 0 || title_cn.length == 0) && (
                            <Text
                                style={{
                                    fontSize:
                                        title_en.length > 0
                                            ? pxToDp(13)
                                            : pxToDp(14),
                                    color:
                                        title_en.length > 0
                                            ? black.second
                                            : black.main,
                                }}
                                numberOfLines={2}>
                                {title_pt}
                            </Text>
                        )}

                        {/* 佔位 防止標題過長遮擋日期 */}
                        <View style={{marginTop: pxToDp(25)}}></View>

                        {/* 日期 */}
                        <Text
                            style={{
                                fontSize: pxToDp(12),
                                position: 'absolute',
                                bottom: 0,
                                color: black.third,
                            }}>
                            @ {timeTrans(publishDate)}
                        </Text>
                    </View>

                    {/* 首張配圖 */}
                    {haveImage && (
                        <View style={{alignSelf: 'center'}}>
                            <View
                                style={{
                                    borderRadius: pxToDp(10),
                                    overflow: 'hidden',
                                    ...viewShadow,
                                    backgroundColor: white,
                                }}>
                                <FastImage
                                    source={{uri: imageUrls[0]}}
                                    style={{
                                        width: pxToDp(125),
                                        height: pxToDp(100),
                                    }}
                                    resizeMode={FastImage.resizeMode.cover}
                                />
                            </View>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    }
}

export default EventCard;
