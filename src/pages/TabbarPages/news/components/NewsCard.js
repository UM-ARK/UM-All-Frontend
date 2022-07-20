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

// 解構全局ui設計顏色
const {white, black, viewShadow} = COLOR_DIY;

class NewsCard extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    render() {
        // 接收NewsPage頁傳來的該卡片需要渲染的信息
        const newsData = this.props.data;
        let type = this.props.type ? this.props.type : 'news';
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

        // 相片數組
        let haveImage = undefined;
        let imageUrls = undefined;
        // 活動類型
        if (type == 'event') {
            haveImage = 'posterUrl' in newsData.common;
            imageUrls = haveImage ? newsData.common.posterUrl : '';
        }
        // 新聞類型
        // type為news時會有無圖情況
        else {
            haveImage = 'imageUrls' in newsData.common;
            imageUrls = haveImage ? newsData.common.imageUrls : '';
        }

        return (
            <TouchableOpacity
                style={styles.newsCardContainer}
                activeOpacity={0.8}
                onPress={() => {
                    // 跳轉對應新聞的詳情頁
                    this.context.navigate(
                        type == 'news' ? 'NewsDetail' : 'UMEventDetail',
                        {data: newsData},
                    );
                }}>
                {/* 文字居左，圖片居右 */}
                <View style={styles.newsCardContentContainer}>
                    {/* 標題，有英文中文則顯示，無則顯示葡文 */}
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

                    {/* 新聞卡片配圖 */}
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
                                    source={{
                                        uri:
                                            type == 'event'
                                                ? imageUrls
                                                : imageUrls[0],
                                    }}
                                    style={styles.newsCardImg}
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

const styles = StyleSheet.create({
    newsCardContainer: {
        backgroundColor: white,
        marginVertical: pxToDp(7),
        marginHorizontal: pxToDp(10),
        borderRadius: pxToDp(10),
        ...viewShadow,
    },
    newsCardContentContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: pxToDp(10),
        paddingVertical: pxToDp(8),
    },
    newsCardImg: {
        width: pxToDp(125),
        height: pxToDp(100),
    },
});

export default NewsCard;
