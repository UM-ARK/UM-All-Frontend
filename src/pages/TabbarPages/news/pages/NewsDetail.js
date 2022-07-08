import React, {Component} from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    Dimensions,
    ScrollView,
} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import {FlatGrid} from 'react-native-super-grid';

// HTML轉純文本
// TODO: 實用性有限，等待後人開發
function repalceHtmlToText(str) {
    str = str.replace(/(<([^>]+)>)/g, '');
    str = str.replace(/<\/?.+?>/g, '');
    str = str.replace(/&nbsp;/g, '');
    str = str.replace(/[\r\n]/g, '');
    return str;
}

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
    return Y + '/' + M + '/' + D;
}

const {height: PAGE_HEIGHT} = Dimensions.get('window');
const {width: PAGE_WIDTH} = Dimensions.get('window');
const COMPONENT_WIDTH = PAGE_WIDTH * 0.25;

class NewsDetail extends Component {
    constructor(props) {
        super(props);

        // 獲取上級路由傳遞的參數
        const newsData = this.props.route.params.data;

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
                imageUrls: newsData.common.imageUrls,
            },
        };
    }

    render() {
        // 解構全局ui設計顏色
        const {white, black, viewShadow, bg_color} = COLOR_DIY;
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

        // console.log(content_cn);

        return (
            <View style={{backgroundColor: bg_color, flex: 1}}>
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

                <ScrollView style={{padding: pxToDp(10)}}>
                    {/* 英文標題 */}
                    {title_en.length > 0 && (
                        <Text
                            style={{
                                color: black.main,
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
                                        ? black.second
                                        : black.main,
                                fontWeight: 'bold',
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
                                        ? black.second
                                        : black.main,
                                fontWeight: 'bold',
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
                        }}>
                        Update: {timeTrans(lastModified)}
                    </Text>

                    {/* 圖片展示 */}
                    {/* TODO: 點擊查看大圖，可以保存 */}
                    <FlatGrid
                        style={{flex: 1, alignSelf: 'center'}}
                        // 每个项目的最小宽度或高度（像素）
                        itemDimension={COMPONENT_WIDTH}
                        data={imageUrls}
                        // 每個項目的間距
                        spacing={pxToDp(15)}
                        renderItem={({item, index}) => {
                            // item是每一項數組的數據
                            // index是每一項的數組下標
                            return (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    style={{
                                        width: COMPONENT_WIDTH,
                                        height: COMPONENT_WIDTH,
                                        backgroundColor: bg_color,
                                        borderRadius: pxToDp(10),
                                        overflow: 'hidden',
                                        ...viewShadow,
                                    }}
                                    // 打開圖片瀏覽大圖
                                    onPress={() => {
                                        console.log(imageUrls);
                                        this.refs.imageScrollViewer.handleOpenImage(
                                            index,
                                        );
                                    }}>
                                    <FastImage
                                        source={{uri: item}}
                                        style={{
                                            width: COMPONENT_WIDTH,
                                            height: COMPONENT_WIDTH,
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
                        <View>
                            <Text
                                style={{
                                    color: black.second,
                                    fontSize: pxToDp(13),
                                }}
                                selectable={true}>
                                {'\t' + repalceHtmlToText(content_cn)}
                            </Text>

                            <View style={{marginTop: pxToDp(50)}} />
                        </View>
                    )}

                    {/* 英文正文 */}
                    {content_en.length > 0 && (
                        <View>
                            <Text
                                style={{
                                    color: black.second,
                                    fontSize: pxToDp(13),
                                }}
                                selectable={true}>
                                {'\t' + repalceHtmlToText(content_en)}
                            </Text>

                            <View style={{marginTop: pxToDp(50)}} />
                        </View>
                    )}

                    {content_pt.length > 0 && (
                        <View>
                            <Text
                                style={{
                                    color: black.second,
                                    fontSize: pxToDp(13),
                                }}
                                selectable={true}>
                                {'\t' + repalceHtmlToText(content_pt)}
                            </Text>
                        </View>
                    )}

                    <View style={{marginBottom: pxToDp(100)}} />
                </ScrollView>
            </View>
        );
    }
}

export default NewsDetail;
