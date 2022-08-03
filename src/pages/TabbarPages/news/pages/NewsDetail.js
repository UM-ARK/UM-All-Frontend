import React, {Component} from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    StyleSheet,
} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import HyperlinkText from '../../../../components/HyperlinkText';
import Header from '../../../../components/Header';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import {FlatGrid} from 'react-native-super-grid';
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

const {height: PAGE_HEIGHT} = Dimensions.get('window');
const {width: PAGE_WIDTH} = Dimensions.get('window');
let COMPONENT_WIDTH = PAGE_WIDTH * 0.25;
const {white, black, viewShadow, bg_color, themeColor} = COLOR_DIY;

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
        // 自適應圖片寬度
        if (imageUrls.length == 2) {
            COMPONENT_WIDTH = PAGE_WIDTH * 0.4;
        } else if (imageUrls.length < 2) {
            COMPONENT_WIDTH = PAGE_WIDTH * 0.85;
        } else {
            COMPONENT_WIDTH = PAGE_WIDTH * 0.25;
        }

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
            // 語言模式
            LanguageMode: [
                {
                    locale: 'cn',
                    available: 1,
                    name: '中',
                },
                {
                    locale: 'en',
                    available: 1,
                    name: 'EN',
                },
                {
                    locale: 'pt',
                    available: 1,
                    name: 'PT',
                },
            ],
            chooseMode: 0,
        };
    }

    // 文本語言模式選擇
    renderModeChoice = () => {
        const {LanguageMode, chooseMode, data} = this.state;
        return (
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                }}>
                {LanguageMode.map((item, index) => {
                    //只渲染存在的语言的按钮
                    if (item.available == 1) {
                        return (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={{
                                    ...styles.languageModeButtonContainer,
                                    backgroundColor:
                                        chooseMode == index
                                            ? themeColor
                                            : bg_color,
                                }}
                                onPress={() =>
                                    this.setState({chooseMode: index})
                                }>
                                <Text
                                    style={{
                                        color:
                                            chooseMode == index
                                                ? bg_color
                                                : themeColor,
                                    }}>
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    }
                })}
            </View>
        );
    };

    render() {
        // 解構全局ui設計顏色
        const {LanguageMode, chooseMode, data} = this.state;
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

        //判断语言是否存在
        if (title_cn.length <= 0) {
            LanguageMode[0].available = 0;
        }
        if (title_en.length <= 0) {
            LanguageMode[1].available = 0;
        }
        if (title_pt.length <= 0) {
            LanguageMode[2].available = 0;
        }

        //用数组存储内容，便于根据语言筛选条件显示
        var title = [title_cn, title_en, title_pt];
        var content = [content_cn, content_en, content_pt];

        return (
            <View style={{backgroundColor: bg_color, flex: 1}}>
                <Header title={'新聞詳情'} />

                <ScrollView>
                    {/* 文本模式選擇 3語切換 */}
                    {this.renderModeChoice()}
                    {/* 大標題 */}
                    <Text style={styles.title} selectable={true}>
                        {title[chooseMode]}
                    </Text>
                    {/* 日期 */}
                    <Text style={styles.date}>
                        {'Update: ' +
                            moment
                                .tz(lastModified, 'Asia/Macau')
                                .format('YYYY/MM/DD')}
                    </Text>

                    {/* 圖片展示 */}
                    <FlatGrid
                        // 每个项目的最小宽度或高度（像素）
                        itemDimension={COMPONENT_WIDTH}
                        data={imageUrls}
                        // 每個項目的間距
                        spacing={pxToDp(15)}
                        renderItem={({item, index}) => (
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
                                    this.refs.imageScrollViewer.handleOpenImage(
                                        index,
                                    );
                                }}>
                                <FastImage
                                    source={{
                                        uri: item,
                                        cache: FastImage.cacheControl.web,
                                    }}
                                    style={{width: '100%', height: '100%'}}
                                />
                            </TouchableOpacity>
                        )}
                        itemContainerStyle={{
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    />

                    {/* 正文 */}
                    <View style={styles.contentContainer}>
                        <HyperlinkText
                            linkStyle={{
                                color: COLOR_DIY.themeColor,
                            }}
                            navigation={this.props.navigation}>
                            <Text
                                style={{
                                    color: black.second,
                                    fontSize: pxToDp(15),
                                }}
                                selectable={true}>
                                {'\t\t' + repalceHtmlToText(content[chooseMode])}
                            </Text>
                        </HyperlinkText>
                    </View>

                    {/* 彈出層展示圖片查看器 */}
                    <ImageScrollViewer
                        ref={'imageScrollViewer'}
                        imageUrls={imageUrls}
                        // 父組件調用 this.refs.imageScrollViewer.tiggerModal(); 打開圖層
                        // 父組件調用 this.refs.imageScrollViewer.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
                    />
                    <View style={{marginBottom: pxToDp(50)}} />
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    title: {
        alignSelf: 'center',
        marginVertical: pxToDp(5),
        marginHorizontal: pxToDp(10),
        fontWeight: 'bold',
        fontSize: pxToDp(20),
        color: themeColor,
    },
    date: {
        color: COLOR_DIY.secondThemeColor,
        alignSelf: 'flex-end',
        marginRight: pxToDp(15),
        fontWeight: '600',
    },
    languageModeButtonContainer: {
        padding: pxToDp(10),
        marginVertical: pxToDp(5),
        borderRadius: pxToDp(10),
        ...viewShadow,
    },
    contentContainer: {
        marginHorizontal: pxToDp(10),
        paddingHorizontal: pxToDp(15),
        paddingVertical: pxToDp(10),
        borderRadius: pxToDp(10),
        backgroundColor: white,
        ...viewShadow,
    },
});

export default NewsDetail;
