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

    constructor(props) {
        super(props);
        let newsData = this.props.data;

        // 存放新聞數據
        this.state = {
            data: {
                // 發佈日期
                publishDate: newsData.common.publishDate,
                // 最後更新時間
                // lastModified: newsData.lastModified,
                // 中文標題
                title_cn: newsData.details[1].title,

                // 中文內容
                // content_cn: newsData.details[1].content,
                // 英文標題
                title_en: newsData.details[0].title,

                // 英文內容
                // content_en: newsData.details[0].content,
                // 相片數組
                imageUrls: newsData.common.imageUrls,
            },
        };
    }

    render() {
        // 解構全局ui設計顏色
        const {white, black, viewShadow} = COLOR_DIY;
        // 結構this.state的新聞數據
        const {
            // 發佈日期
            publishDate,
            // 最後更新時間
            // lastModified,
            // 中文標題
            title_cn,
            // 中文內容
            // content_cn,
            // 英文標題
            title_en,
            // 英文內容
            // content_en,
            // 相片數組
            imageUrls,
        } = this.state.data;

        // phase一下新聞的發佈日期
        let datePhase = new Date(publishDate);
        // 將其整理為MM-DD的字符串形式
        let renderDate = datePhase.getMonth() + '-' + datePhase.getDate();

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
                onPress={() => alert('按下')}>
                {/* 文字居左，圖片居右 */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        padding: pxToDp(10),
                        paddingVertical: pxToDp(8),
                    }}>
                    {/* 標題 */}
                    <View style={{width: '61%'}}>
                        {/* 英文 */}
                        <Text
                            style={{
                                fontWeight: 'bold',
                                color: black.main,
                                fontSize: pxToDp(14),
                            }}>
                            {title_en}
                        </Text>
                        {/* 中文 */}
                        <Text
                            style={{fontSize: pxToDp(13), color: black.third}}>
                            {title_cn}
                        </Text>

                        {/* 佔位 防止標題過長遮擋日期 */}
                        <View style={{marginTop: pxToDp(25)}}></View>

                        {/* 日期 */}
                        <Text
                            style={{
                                fontSize: pxToDp(12),
                                position: 'absolute',
                                bottom: 0,
                            }}>
                            @ {renderDate}
                        </Text>
                    </View>

                    {/* 首張配圖 */}
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
                </View>
            </TouchableOpacity>
        );
    }
}

export default EventCard;
