import React, { Component } from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    Dimensions,
    ScrollView,
} from 'react-native';

import { COLOR_DIY } from '../../../../utils/uiMap';
import { pxToDp } from '../../../../utils/stylesKits';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import HyperlinkText from '../../../../components/HyperlinkText';

import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import { FlatGrid } from 'react-native-super-grid';
import moment from 'moment-timezone';

// HTML轉純文本
// TODO: 實用性有限，等待後人開發
function repalceHtmlToText(str) {
    str = str.replace(/(<([^>]+)>)/g, '');
    str = str.replace(/<\/?.+?>/g, '');
    str = str.replace(/&nbsp;/g, '');
    str = str.replace(/[\r\n]/g, '');
    return str;
}

const { height: PAGE_HEIGHT } = Dimensions.get('window');
const { width: PAGE_WIDTH } = Dimensions.get('window');
const COMPONENT_WIDTH = PAGE_WIDTH * 0.85;

class NewsDetail extends Component {
    constructor(props) {
        super(props);

        // 獲取上級路由傳遞的參數
        const newsData = this.props.route.params.data;
        console.log('eventData', newsData);

        // 匹配對應語言的標題，經測試：有時只有1 or 2 or 3種文字的標題、內容
        // 中文
        let title_cn = '';
        let content_cn = '';
        // 英文
        let title_en = '';
        let content_en = '';
        // 葡文
        let title_pt = '';
        let content_pt = '';
        newsData.details.map(item => {
            if (item.locale == 'en_US') {
                title_en = item.title;
                content_en = item.content;
            } else if (item.locale == 'pt_PT') {
                title_pt = item.title;
                content_pt = item.content;
            } else if (item.locale == 'zh_TW') {
                title_cn = item.title;
                content_cn = item.content;
            }
        });

        let imageUrls = newsData.common.imageUrls;
        imageUrls = imageUrls.map(item => item.replace('http:', 'https:'));

        // 存放新聞數據
        this.state = {
            data: {
                // 發佈日期
                publishDate: newsData.common.publishDate,
                // 最後更新時間
                lastModified: newsData.lastModified,
                // 中文標題
                title_cn,
                // 中文內容
                content_cn,
                // 英文標題
                title_en,
                // 英文內容
                content_en,
                // 葡文標題
                title_pt,
                // 葡文內容
                content_pt,
                // 相片數組
                imageUrls,
            },
        };
    }

    render() {
        // 解構全局ui設計顏色
        const { white, black, viewShadow, bg_color } = COLOR_DIY;
        // 結構this.state的新聞數據
        const {
            // 發佈日期
            publishDate,
            // 最後更新時間
            lastModified,
            // 中文標題
            title_cn,
            // 中文內容
            content_cn,
            // 英文標題
            title_en,
            // 英文內容
            content_en,
            // 葡文標題
            title_pt,
            // 葡文內容
            content_pt,
            // 相片數組
            imageUrls,
        } = this.state.data;

        return (
            <View style={{ backgroundColor: bg_color, flex: 1 }}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    leftComponent={
                        <TouchableOpacity
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={COLOR_DIY.black.main}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '新聞詳情',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: COLOR_DIY.bg_color,
                        barStyle: 'dark-content',
                    }}
                />

                <ScrollView style={{ padding: pxToDp(10) }}>
                    {/* 英文標題 */}
                    {title_en.length > 0 && (
                        <Text
                            style={{
                                color: COLOR_DIY.themeColor,
                                paddingHorizontal: pxToDp(15),
                                fontWeight: 'bold',
                                fontSize: pxToDp(18),
                            }}
                            selectable={true}>
                            {title_en}
                        </Text>
                    )}
                    {/* 中文標題 */}
                    {title_cn.length > 0 && (
                        <Text
                            style={{
                                color:
                                    title_en.length > 0
                                        ? COLOR_DIY.secondThemeColor
                                        : COLOR_DIY.themeColor,
                                fontWeight: 'bold',
                                paddingHorizontal: pxToDp(15),
                                paddingTop: pxToDp(5),
                                fontSize:
                                    title_en.length > 0
                                        ? pxToDp(16)
                                        : pxToDp(18),
                            }}
                            selectable={true}>
                            {title_cn}
                        </Text>
                    )}
                    {/* 葡文標題 */}
                    {title_pt.length > 0 && (
                        <Text
                            style={{
                                color:
                                    title_en.length > 0
                                        ? COLOR_DIY.secondThemeColor
                                        : COLOR_DIY.themeColor,
                                fontWeight: 'bold',
                                paddingTop: pxToDp(5),
                                fontSize:
                                    title_en.length > 0
                                        ? pxToDp(16)
                                        : pxToDp(18),
                            }}
                            selectable={true}>
                            {title_pt}
                        </Text>
                    )}
                    {/* 日期 */}
                    <Text
                        style={{
                            color: black.third,
                            alignSelf: 'flex-end',
                            paddingTop: pxToDp(10),
                        }}>
                        Update:{' '}
                        {moment
                            .tz(lastModified, 'Asia/Macau')
                            .format('YYYY/MM/DD')}
                    </Text>

                    {/* 圖片展示 */}
                    <FlatGrid
                        style={{ flex: 1, alignSelf: 'center' }}
                        // 每个项目的最小宽度或高度（像素）
                        itemDimension={COMPONENT_WIDTH}
                        data={imageUrls}
                        // 每個項目的間距
                        spacing={pxToDp(15)}
                        renderItem={({ item, index }) => {
                            // item是每一項數組的數據
                            // index是每一項的數組下標
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={{
                                        width: COMPONENT_WIDTH,
                                        height: COMPONENT_WIDTH * 0.5625,
                                        backgroundColor: bg_color,
                                        borderRadius: pxToDp(10),
                                        overflow: 'hidden',
                                        alignSelf: 'center',
                                        ...viewShadow,
                                    }}
                                    // 打開圖片瀏覽大圖
                                    onPress={() => {
                                        this.refs.imageScrollViewer.handleOpenImage(
                                            index,
                                        );
                                    }}>
                                    <FastImage
                                        source={{
                                            uri: item,
                                            cache: FastImage.cacheControl.web,
                                        }}
                                        style={{
                                            width: COMPONENT_WIDTH,
                                            height: COMPONENT_WIDTH * 0.5625,
                                        }}
                                    />
                                </TouchableOpacity>
                            );
                        }}
                    />
                    {/* 彈出層展示圖片查看器 */}
                    <ImageScrollViewer
                        ref={'imageScrollViewer'}
                        imageUrls={imageUrls}
                    // 父組件調用 this.refs.imageScrollViewer.tiggerModal(); 打開圖層
                    // 父組件調用 this.refs.imageScrollViewer.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
                    />

                    {/* 中文正文 */}
                    {content_cn.length > 0 && (
                        <View style={{
                            marginBottom: pxToDp(5),
                            marginHorizontal: pxToDp(20),
                            borderRadius: pxToDp(10),
                            backgroundColor: white,
                            paddingHorizontal: pxToDp(15),
                            paddingVertical: pxToDp(13),
                            ...viewShadow,
                        }}>
                            <HyperlinkText
                                linkStyle={{
                                    color: COLOR_DIY.themeColor,
                                }}
                                navigation={this.props.navigation}>
                                <Text
                                    style={{
                                        color: black.second,
                                        fontSize: pxToDp(14),
                                    }}
                                    selectable={true}>
                                    {'\t' + repalceHtmlToText(content_cn)}
                                </Text>
                            </HyperlinkText>
                        </View>
                    )}

                    {/* 英文正文 */}
                    {content_en.length > 0 && (
                        <View style={{
                            marginVertical: pxToDp(5),
                            marginHorizontal: pxToDp(20),
                            borderRadius: pxToDp(10),
                            backgroundColor: white,
                            paddingHorizontal: pxToDp(15),
                            paddingVertical: pxToDp(13),
                            ...viewShadow,
                        }}>
                            <HyperlinkText
                                linkStyle={{
                                    color: COLOR_DIY.themeColor,
                                }}
                                navigation={this.props.navigation}>
                                <Text
                                    style={{
                                        color: black.second,
                                        fontSize: pxToDp(14),
                                    }}
                                    selectable={true}>
                                    {'\t' + repalceHtmlToText(content_en)}
                                </Text>
                            </HyperlinkText>
                        </View>
                    )}

                    {/* 葡文正文 */}
                    {content_pt.length > 0 && (
                        <View style={{
                            marginVertical: pxToDp(5),
                            marginHorizontal: pxToDp(20),
                            borderRadius: pxToDp(10),
                            backgroundColor: white,
                            paddingHorizontal: pxToDp(15),
                            paddingVertical: pxToDp(13),
                            ...viewShadow,
                        }}>
                            <HyperlinkText
                                linkStyle={{
                                    color: COLOR_DIY.themeColor,
                                }}
                                navigation={this.props.navigation}>
                                <Text
                                    style={{
                                        color: black.second,
                                        fontSize: pxToDp(14),
                                    }}
                                    selectable={true}>
                                    {'\t' + repalceHtmlToText(content_pt)}
                                </Text>
                            </HyperlinkText>
                        </View>
                    )}

                    <View style={{ marginBottom: pxToDp(100) }} />
                </ScrollView>
            </View>
        );
    }
}

export default NewsDetail;
