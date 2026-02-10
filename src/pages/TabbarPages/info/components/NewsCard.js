import React, { useContext, useState, memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import PressableCard from '../../../../components/PressableCard';

import { NavigationContext } from '@react-navigation/native';
import moment from 'moment-timezone';
import { scale, verticalScale } from 'react-native-size-matters';

const getDateColor = (
    type,
    beginMomentDate,
    nowMomentDate,
    themeColor,
    secondThemeColor,
    black,
) => {
    if (type === 'event') {
        if (beginMomentDate.isSameOrAfter(nowMomentDate)) {
            return secondThemeColor;
        }
        if (beginMomentDate.isSame(nowMomentDate, 'day')) {
            return themeColor;
        }
    }
    return black.third;
};

const NewsCard = ({ data, type = 'news' }) => {
    // NavigationContext组件可以在非基页面拿到路由信息
    const navigation = useContext(NavigationContext);
    const { theme } = useTheme();
    const { white, black, viewShadow, themeColor, secondThemeColor, tonal } = theme;

    // 圖片加載狀態
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const styles = useMemo(() => StyleSheet.create({
        newsCardContainer: {
            backgroundColor: white,
            marginTop: verticalScale(6),
            marginHorizontal: scale(16),
            borderRadius: scale(16),
            ...viewShadow,
        },
        newsCardContentContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: verticalScale(12),
            paddingVertical: verticalScale(10),
        },
        newsCardImg: {
            width: verticalScale(90),
            height: verticalScale(126),
        },
    }),
        [tonal.primary08, viewShadow],
    );

    const beginDate =
        type === 'event' ? data.common.dateFrom : data.common.publishDate;
    const beginMomentDate = useMemo(() => moment(beginDate), [beginDate]);
    const nowMomentDate = useMemo(() => moment(new Date()), []);
    const dateColor = useMemo(() =>
        getDateColor(
            type,
            beginMomentDate,
            nowMomentDate,
            themeColor,
            secondThemeColor,
            black,
        ),
        [
            type,
            beginMomentDate,
            nowMomentDate,
            themeColor,
            secondThemeColor,
            black,
        ],
    );

    const { title_en, title_cn, title_pt } = useMemo(() => {
        const titleState = { title_en: '', title_cn: '', title_pt: '' };
        data.details.forEach(item => {
            if (item.locale === 'en_US') {
                titleState.title_en = item.title;
            } else if (item.locale === 'pt_PT') {
                titleState.title_pt = item.title;
            } else if (item.locale === 'zh_TW') {
                titleState.title_cn = item.title;
            }
        });
        return titleState;
    }, [data.details]);

    const { haveImage, imageUrls } = useMemo(() => {
        if (type === 'event') {
            const available = 'posterUrl' in data.common;
            return {
                haveImage: available,
                imageUrls: available
                    ? data.common.posterUrl.replace('http:', 'https:')
                    : '',
            };
        }
        const available = 'imageUrls' in data.common;
        return {
            haveImage: available,
            imageUrls: available
                ? data.common.imageUrls[0].replace('http:', 'https:')
                : '',
        };
    }, [data.common, type]);

    // 点击跳转逻辑
    const handlePress = useCallback(() => {
        trigger();
        setTimeout(() => {
            navigation.navigate(
                type === 'news' ? 'NewsDetail' : 'UMEventDetail',
                { data },
            );
        }, 50);
    }, [navigation, type, data]);

    return (
        <PressableCard style={styles.newsCardContainer} onPress={handlePress}>
            {/* 文字居左，图片居右 */}
            <View style={styles.newsCardContentContainer}>
                {/* 标题 */}
                <View
                    style={{
                        width: haveImage ? '70%' : '100%',
                        flexDirection: 'column',
                    }}>
                    {/* 英文标题 */}
                    {title_en.length > 0 && (
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontWeight: 'bold',
                                color: black.main,
                                fontSize: verticalScale(14),
                                lineHeight: verticalScale(20),
                            }}
                            numberOfLines={3}>
                            {title_en}
                        </Text>
                    )}
                    {/* 中文标题 */}
                    {title_cn.length > 0 && (
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize:
                                    title_en.length > 0
                                        ? verticalScale(13)
                                        : verticalScale(15),
                                color:
                                    title_en.length > 0
                                        ? black.second
                                        : black.main,
                                lineHeight: verticalScale(18),
                                marginTop:
                                    title_en.length > 0 ? verticalScale(4) : 0,
                            }}
                            numberOfLines={2}>
                            {title_cn}
                        </Text>
                    )}

                    {/* 活动类型展示日期 */}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: verticalScale(13),
                            fontWeight: 'bold',
                            color: dateColor,
                            marginTop: scale(8),
                        }}>
                        @ {moment(beginDate).format('MM-DD')}
                    </Text>
                </View>

                {/* 新聞卡片配圖 */}
                {haveImage && (
                    <View style={{ alignSelf: 'center' }}>
                        <View
                            style={{
                                borderRadius: scale(12),
                                overflow: 'hidden',
                                ...viewShadow,
                                backgroundColor: white,
                            }}>
                            <Image
                                source={{ uri: imageUrls }}
                                style={[
                                    styles.newsCardImg,
                                    // 加載失敗時降低透明度
                                    imageError && { opacity: 0.3 },
                                ]}
                                resizeMode="cover"
                                onLoadStart={() => setImageLoading(true)}
                                onLoadEnd={() => setImageLoading(false)}
                                onError={() => {
                                    setImageLoading(false);
                                    setImageError(true);
                                }}
                            />
                            {/* 圖片加載中指示器 */}
                            {imageLoading && (
                                <View
                                    style={{
                                        ...StyleSheet.absoluteFillObject,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: tonal.primary08,
                                    }}>
                                    <ActivityIndicator
                                        size="small"
                                        color={themeColor}
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        </PressableCard>
    );
};

export default memo(NewsCard);
