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

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import moment from 'moment-timezone';

// 解構全局ui設計顏色
const {white, black, viewShadow, bg_color, themeColor} = COLOR_DIY;

const {height: PAGE_HEIGHT} = Dimensions.get('window');
const {width: PAGE_WIDTH} = Dimensions.get('window');
const COMPONENT_WIDTH = PAGE_WIDTH * 0.9;
const COMPONENT_HEIGHT = PAGE_HEIGHT * 0.5;

class UMEventDetail extends Component {
    constructor(props) {
        super(props);

        // 獲取上級路由傳遞的參數
        const eventData = this.props.route.params.data;
        console.log('eventData', eventData);

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
        eventData.details.map(item => {
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

        // TODO: 中英葡切換 detail最多有3個
        // 聯繫人
        // 聯繫郵箱
        // 傳真
        // 電話
        // 活動使用語言 - array
        // 組織方 - array
        // 備註
        // 講者 - array
        // 對象 - array
        // 場地 - array

        // common
        // dateFrom 開始時間
        // dateTo 結束時間
        // 海報
        // 有無smartPoint
        // 有無每週循環 - array

        // lastModified修改時間

        // 存放新聞數據
        this.state = {
            // 語言模式
            LanguageMode: [
                {
                    locale: 'cn',
                    name: '中',
                },
                {
                    locale: 'en',
                    name: 'EN',
                },
                {
                    locale: 'pt',
                    name: 'PT',
                },
            ],
            chooseMode: 0,
            data: {
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
                // 發佈日期
                // publishDate: newsData.common.publishDate,
                // 最後更新時間
                // lastModified: newsData.lastModified,
                // 海報
                imageUrls:
                    'posterUrl' in eventData.common
                        ? eventData.common.posterUrl
                        : '',
            },
        };
    }

    render() {
        const {LanguageMode, chooseMode, data} = this.state;
        const {imageUrls} = data;

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
                        text: '活動詳情',
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

                {/* 彈出層展示圖片查看器 */}
                <ImageScrollViewer
                    ref={'imageScrollViewer'}
                    imageUrls={imageUrls}
                    // 父組件調用 this.refs.imageScrollViewer.tiggerModal(); 打開圖層
                    // 父組件調用 this.refs.imageScrollViewer.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
                />

                <ScrollView style={{padding: pxToDp(10)}}>
                    {/* 文本模式選擇 3語切換 */}
                    {/* TODO: 判斷details中有無對應語言再顯示button */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-around',
                        }}>
                        {LanguageMode.map((item, index) => (
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
                        ))}
                    </View>

                    {/* 海報 */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.imgContainer}
                        // 瀏覽大圖
                        onPress={() => {
                            this.refs.imageScrollViewer.handleOpenImage(0);
                        }}>
                        <FastImage
                            source={{
                                uri: imageUrls,
                                cache: FastImage.cacheControl.web,
                            }}
                            style={{width: '100%', height: '100%'}}
                        />
                    </TouchableOpacity>

                    {/* 標題 */}

                    {/* 詳情 */}

                    {/* 聯繫人 */}
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    languageModeButtonContainer: {
        padding: pxToDp(10),
        marginVertical: pxToDp(5),
        borderRadius: pxToDp(10),
        ...viewShadow,
    },
    imgContainer: {
        width: COMPONENT_WIDTH,
        height: COMPONENT_HEIGHT,
        backgroundColor: bg_color,
        borderRadius: pxToDp(10),
        overflow: 'hidden',
        alignSelf: 'center',
        marginVertical: pxToDp(10),
        ...viewShadow,
    },
});

export default UMEventDetail;
