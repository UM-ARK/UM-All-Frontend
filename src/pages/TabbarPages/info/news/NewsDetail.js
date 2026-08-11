import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Dimensions, ScrollView, StyleSheet, Linking, Platform } from 'react-native';

import Text from '../../../../components/AppText';
import { useTheme, themes, uiStyle, ThemeContext } from '../../../../components/ThemeContext';
import { ANDROID_UI_FONT_FAMILY } from '../../../../components/typography';
import ARKImageView from '../../../../components/ARKImageView';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import { openLink } from '../../../../utils/browser';
import { trigger } from '../../../../utils/trigger';
import SegmentControl from '../../../../components/SegmentControl';

import { Image } from 'expo-image';
import { FlatGrid } from 'react-native-super-grid';
import moment from 'moment-timezone';
import RenderHTML from '@native-html/render';
import { scale } from 'react-native-size-matters';
import TouchableScale from '../../../../components/TouchableScale';

// 正文字體：Android 用內置 Noto Sans TC，iOS 保留系統字體
const BODY_FONT = Platform.select({ android: ANDROID_UI_FONT_FAMILY, default: undefined });

// 澳大新聞 HTML 常帶表格固定 height／width，RenderHTML 會裁切文字；先清掉再渲染
const NEWS_IGNORED_STYLES = ['height', 'width', 'minWidth', 'maxWidth'];

// HTML正則篩數據，並在每個段落開頭插入全形空格實現首行縮進
function repalceHtmlToText(str) {
    // Word 書籤錨點：無 href 的 <a name/id>，勿當成可點連結
    str = str.replace(/<a\b(?![^>]*\bhref\s*=)[^>]*>([\s\S]*?)<\/a>/gi, '$1');
    str = str.replace(/<br\s*\/?>/g, '');
    str = str.replace(/<p><\s*\/?p>/g, '');
    str = str.replace(/<div><\s*\/?div>/g, '');
    // 段首加兩個全形空格模擬縮進
    str = str.replace(/<p(\s[^>]*)?>/gi, '<p$1>\u3000\u3000');
    str = str.replace(/<div(\s[^>]*)?>/gi, '<div$1>\u3000\u3000');
    // 移除聯繫資訊表格中的空白列，避免多餘大段空白
    str = str.replace(
        /<tr\b[^>]*>\s*(?:<td\b[^>]*>\s*(?:&nbsp;|\u00a0|\s)*<\/td>\s*){1,2}<\/tr>/gi,
        '',
    );
    return str;
}

const { height: PAGE_HEIGHT } = Dimensions.get('window');
const { width: PAGE_WIDTH } = Dimensions.get('window');

const NewsDetail = ({ route, navigation }) => {
    const { theme } = useTheme();
    const { white, black, viewShadow, bg_color, themeColor, secondThemeColor, imagePlaceholder } = theme;
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
        contentContainer: {
            marginHorizontal: scale(10),
            paddingHorizontal: scale(15),
            paddingVertical: scale(10),
            borderRadius: scale(10),
            backgroundColor: white,
            ...viewShadow,
        },
    });
    // RenderHTML 的 tagsStyles 需為可讀取的 plain object（勿用 StyleSheet.create）
    const htmlStyles = useMemo(
        () => ({
            p: {
                ...uiStyle.defaultText,
                fontFamily: BODY_FONT,
                color: black.second,
                lineHeight: scale(22),
                marginBottom: scale(8),
                textAlign: 'justify',
            },
            span: {
                ...uiStyle.defaultText,
                fontFamily: BODY_FONT,
                color: black.second,
                lineHeight: scale(22),
            },
            div: {
                ...uiStyle.defaultText,
                fontFamily: BODY_FONT,
                color: black.second,
                lineHeight: scale(22),
                marginBottom: scale(8),
                textAlign: 'justify',
            },
            table: {
                width: '100%',
                marginTop: scale(8),
            },
            td: {
                ...uiStyle.defaultText,
                fontFamily: BODY_FONT,
                color: black.third,
                lineHeight: scale(20),
                paddingVertical: scale(2),
            },
            a: {
                ...uiStyle.defaultText,
                fontFamily: BODY_FONT,
                color: themeColor,
                textDecorationLine: 'underline',
            },
            h1: {
                fontFamily: BODY_FONT,
                fontWeight: 'bold',
                fontSize: scale(20),
                color: black.first,
                marginBottom: scale(8),
                lineHeight: scale(28),
            },
            h2: {
                fontFamily: BODY_FONT,
                fontWeight: 'bold',
                fontSize: scale(18),
                color: black.first,
                marginBottom: scale(6),
                lineHeight: scale(26),
            },
            h3: {
                fontFamily: BODY_FONT,
                fontWeight: '600',
                fontSize: scale(16),
                color: black.first,
                marginBottom: scale(6),
                lineHeight: scale(24),
            },
            strong: {
                fontFamily: BODY_FONT,
                fontWeight: 'bold',
                color: black.first,
            },
            li: {
                fontFamily: BODY_FONT,
                color: black.second,
                lineHeight: scale(22),
                marginBottom: scale(4),
            },
        }),
        [black.first, black.second, black.third, themeColor],
    );

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
                if (firstAvailableIndex !== -1) { setChooseMode(firstAvailableIndex); }
            }
            return newModes;
        });
    }, [data, chooseMode]);

    // 僅含可用語言；保留 langIndex 對應 title/content 陣列索引
    const languageSegmentOptions = useMemo(() => (
        LanguageMode
            .map((item, langIndex) => ({ ...item, langIndex }))
            .filter(item => item.available === 1)
            .map(item => ({
                key: item.locale,
                label: item.name,
                langIndex: item.langIndex,
            }))
    ), [LanguageMode]);

    const languageSegmentSelectedIndex = useMemo(() => {
        const i = languageSegmentOptions.findIndex(o => o.langIndex === chooseMode);
        return i >= 0 ? i : 0;
    }, [languageSegmentOptions, chooseMode]);

    const handleHyperLink = (url) => {
        if (!url || url.startsWith('#')) {
            return;
        }
        if (url.includes('mailto:')) {
            Linking.openURL(url);
        } else if (url.includes('http')) {
            openLink(url);
        }
    };

    // 用数组存储内容，便于根据语言筛选条件显示
    const title = [data.title_cn, data.title_en, data.title_pt];
    const content = [data.content_cn, data.content_en, data.content_pt];
    const chosenHtml = content[chooseMode] || '';
    // 扣除內容容器左右 margin + padding，供 RenderHTML 計算寬度
    const htmlContentWidth = PAGE_WIDTH - scale(10) * 2 - scale(15) * 2;
    const htmlSource = useMemo(
        () => ({html: repalceHtmlToText(chosenHtml)}),
        [chosenHtml],
    );
    const htmlRenderersProps = useMemo(
        () => ({
            a: {
                onPress: (_event, href) => {
                    if (!href || href.startsWith('#')) {
                        return;
                    }
                    trigger();
                    handleHyperLink(href);
                },
            },
        }),
        [],
    );

    return (
        <View style={{ backgroundColor: bg_color, flex: 1 }}>
            <ScrollView
                // 該頁面是圖片置頂，所以iOS26也無需調整inset
                contentInsetAdjustmentBehavior={'automatic'}>
                {/* 文本模式選擇 3語切換 */}
                {languageSegmentOptions.length > 0 ? (
                    <View style={{ alignItems: 'center', marginVertical: scale(5) }}>
                        <SegmentControl
                            options={languageSegmentOptions}
                            selectedIndex={languageSegmentSelectedIndex}
                            onChange={(segIdx) => {
                                const opt = languageSegmentOptions[segIdx];
                                if (opt) { setChooseMode(opt.langIndex); }
                            }}
                            trackBackgroundColor={white}
                            fontSize={scale(14)}
                        />
                    </View>
                ) : null}
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
                                contentFit="cover"
                                placeholder={imagePlaceholder}
                                placeholderContentFit="cover"
                                transition={200}
                            />
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
                    <RenderHTML
                        source={htmlSource}
                        contentWidth={htmlContentWidth}
                        baseStyle={{
                            ...uiStyle.defaultText,
                            fontFamily: BODY_FONT,
                            color: black.second,
                            lineHeight: scale(22),
                        }}
                        tagsStyles={htmlStyles}
                        // 忽略後台寫死的表格高寬，避免文字被裁切、超出螢幕
                        ignoredStyles={NEWS_IGNORED_STYLES}
                        renderersProps={htmlRenderersProps}
                        defaultTextProps={{selectable: true}}
                    />
                </View>

                {/* 彈出層展示圖片查看器 */}
                <ARKImageView
                    ref={imageScrollViewer}
                    imageUrls={data.imageUrls}
                />

                <View style={{ marginBottom: scale(50) }} />
            </ScrollView>
        </View>
    );
};

export default NewsDetail;
