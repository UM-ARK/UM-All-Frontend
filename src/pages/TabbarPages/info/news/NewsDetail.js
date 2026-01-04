import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Dimensions, ScrollView, StyleSheet, Linking, ActivityIndicator, } from 'react-native';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../components/ThemeContext';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import Header from '../../../../components/Header';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import { openLink } from '../../../../utils/browser';
import { trigger } from '../../../../utils/trigger';

import { Image } from 'expo-image';
import { FlatGrid } from 'react-native-super-grid';
import moment from 'moment-timezone';
import HTMLView from 'react-native-htmlview';
import { scale } from 'react-native-size-matters';
import TouchableScale from "react-native-touchable-scale";

// HTML正則篩數據
function repalceHtmlToText(str) {
    // str = str.replace(/(<([^>]+)>)/g, '');
    // str = str.replace(/<\/?.+?>/g, '');
    // str = str.replace(/&nbsp;/g, '');
    // str = str.replace(/[\r\n]/g, '');
    str = str.replace(/<br\s*\/?>/g, '');
    str = str.replace(/<p><\s*\/?p>/g, '');
    str = str.replace(/<div><\s*\/?div>/g, '');
    return str;
}

const { height: PAGE_HEIGHT } = Dimensions.get('window');
const { width: PAGE_WIDTH } = Dimensions.get('window');

const NewsDetail = ({ route, navigation }) => {
    const { theme } = useTheme();
    const { white, black, viewShadow, bg_color, themeColor, secondThemeColor } = theme;
    const styles = StyleSheet.create({
        title: {
            ...uiStyle.defaultText,
            alignSelf: 'center',
            marginVertical: scale(5),
            marginHorizontal: scale(10),
            fontWeight: 'bold',
            fontSize: scale(20),
            color: themeColor,
        },
        date: {
            ...uiStyle.defaultText,
            color: secondThemeColor,
            alignSelf: 'flex-end',
            marginRight: scale(15),
            fontWeight: '600',
        },
        languageModeButtonContainer: {
            padding: scale(10),
            marginVertical: scale(5),
            borderRadius: scale(10),
            // ...viewShadow,
        },
        contentContainer: {
            marginHorizontal: scale(10),
            paddingHorizontal: scale(15),
            paddingVertical: scale(10),
            borderRadius: scale(10),
            backgroundColor: white,
            ...viewShadow,
        },
    });
    const htmlStyles = StyleSheet.create({
        p: {
            ...uiStyle.defaultText,
            color: black.second,
        },
        span: {
            ...uiStyle.defaultText,
            color: black.second,
        },
        div: {
            ...uiStyle.defaultText,
            color: black.second,
        },
        td: {
            ...uiStyle.defaultText,
            color: black.third,
        },
        a: {
            ...uiStyle.defaultText,
            color: themeColor,
        }
    });

    const imageScrollViewer = useRef(null);

    // 獲取上級路由傳遞的參數
    const newsData = route.params.data;

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

    newsData.details.forEach(item => {
        if (item.locale === 'en_US') {
            title_en = item.title;
            content_en = item.content;
        } else if (item.locale === 'pt_PT') {
            title_pt = item.title;
            content_pt = item.content;
        } else if (item.locale === 'zh_TW') {
            title_cn = item.title;
            content_cn = item.content;
        }
    });

    let imageUrls = newsData.common.imageUrls ?
        newsData.common.imageUrls.map(item => item.replace('http:', 'https:'))
        : [];

    // 自適應圖片寬度
    let COMPONENT_WIDTH = PAGE_WIDTH * 0.25;
    if (imageUrls.length === 2) {
        COMPONENT_WIDTH = PAGE_WIDTH * 0.4;
    } else if (imageUrls.length < 2) {
        COMPONENT_WIDTH = PAGE_WIDTH * 0.85;
    }

    // 語言模式初始設定
    const [LanguageMode, setLanguageMode] = useState([
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
    ]);

    const [chooseMode, setChooseMode] = useState(0);
    const [imgLoading, setImgLoading] = useState([]);

    // 存放新聞數據
    const [data] = useState({
        publishDate: newsData.common.publishDate,
        lastModified: newsData.lastModified,
        title_cn,
        content_cn,
        title_en,
        content_en,
        title_pt,
        content_pt,
        imageUrls,
    });

    // 登錄頁面打開事件
    useEffect(() => {
        logToFirebase('openPage', { page: 'UMNews' });
    }, []);

    // 初始化图片加载状态
    useEffect(() => {
        setImgLoading(new Array(data.imageUrls.length).fill(true)); // 默认所有图片都在加载
    }, [data.imageUrls]);

    // 判斷語言是否存在，更新 LanguageMode.available
    useEffect(() => {
        setLanguageMode(prev => {
            const newModes = [...prev];
            newModes[0].available = data.title_cn.length > 0 ? 1 : 0;
            newModes[1].available = data.title_en.length > 0 ? 1 : 0;
            newModes[2].available = data.title_pt.length > 0 ? 1 : 0;
            // 如果當前選擇的語言不可用，切換到第一個可用語言
            if (newModes[chooseMode].available === 0) {
                const firstAvailableIndex = newModes.findIndex(m => m.available === 1);
                if (firstAvailableIndex !== -1) setChooseMode(firstAvailableIndex);
            }
            return newModes;
        });
    }, [data, chooseMode]);

    // 文本語言模式選擇
    const renderModeChoice = () => {
        return (
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {LanguageMode.map((item, index) => {
                    //只渲染存在的语言的按钮
                    if (item.available === 1) {
                        return (
                            <TouchableScale key={index}
                                style={{
                                    ...styles.languageModeButtonContainer,
                                    backgroundColor: chooseMode === index ? themeColor : white,
                                }}
                                onPress={() => {
                                    trigger();
                                    setChooseMode(index);
                                }}>
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: chooseMode === index ? white : themeColor,
                                }}>
                                    {item.name}
                                </Text>
                            </TouchableScale>
                        );
                    }
                    return null;
                })}
            </View >
        );
    };

    const handleHyperLink = (url) => {
        if (url.includes('mailto:')) {
            Linking.openURL(url);
        } else if (url.includes('http')) {
            openLink(url);
        }
    };

    // 用数组存储内容，便于根据语言筛选条件显示
    const title = [data.title_cn, data.title_en, data.title_pt];
    const content = [data.content_cn, data.content_en, data.content_pt];

    return (
        <View style={{ backgroundColor: bg_color, flex: 1 }}>
            <Header title={'新聞詳情'} iOSDIY={true} />

            <ScrollView>
                {/* 文本模式選擇 3語切換 */}
                {renderModeChoice()}
                {/* 大標題 */}
                <Text style={styles.title} selectable={true}>
                    {title[chooseMode]}
                </Text>
                {/* 日期 */}
                <Text style={styles.date}>
                    {'Update: ' +
                        moment
                            .tz(data.lastModified, 'Asia/Macau')
                            .format('YYYY/MM/DD')}
                </Text>

                {/* 圖片展示 */}
                <FlatGrid
                    itemDimension={COMPONENT_WIDTH}
                    data={data.imageUrls}
                    spacing={scale(15)}
                    renderItem={({ item, index }) => (
                        <TouchableScale
                            key={index}
                            activeOpacity={0.7}
                            style={{
                                width: COMPONENT_WIDTH,
                                height: COMPONENT_WIDTH,
                                backgroundColor: bg_color,
                                borderRadius: scale(10),
                                overflow: 'hidden',
                                ...viewShadow,
                            }}
                            onPress={() => {
                                trigger();
                                imageScrollViewer.current.handleOpenImage(index);
                            }}>
                            <Image
                                source={item}
                                style={{ width: '100%', height: '100%' }}
                                onLoadStart={() => {
                                    const newLoadingState = [...imgLoading];
                                    newLoadingState[index] = true; // 设置当前图片为加载中
                                    setImgLoading(newLoadingState);
                                }}
                                onLoadEnd={() => {
                                    const newLoadingState = [...imgLoading];
                                    newLoadingState[index] = false; // 设置当前图片为加载完成
                                    setImgLoading(newLoadingState);
                                }}
                            />
                            {imgLoading[index] && (
                                <View style={{
                                    width: '100%',
                                    height: '100%',
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
                        </TouchableScale>
                    )}
                    itemContainerStyle={{
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    scrollEnabled={false}
                />

                {/* 正文 */}
                <View style={styles.contentContainer}>
                    <HTMLView
                        value={repalceHtmlToText(content[chooseMode])}
                        onLinkPress={handleHyperLink}
                        nodeComponentProps={{ selectable: true }}
                        stylesheet={htmlStyles}
                    />
                </View>

                {/* 彈出層展示圖片查看器 */}
                <ImageScrollViewer
                    ref={imageScrollViewer}
                    imageUrls={data.imageUrls}
                />

                <View style={{ marginBottom: scale(50) }} />
            </ScrollView>
        </View>
    );
};

export default NewsDetail;
