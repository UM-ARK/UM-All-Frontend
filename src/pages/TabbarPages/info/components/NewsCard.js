import React, { useContext, useState, memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import PressableCard from '../../../../components/PressableCard';

import { NavigationContext } from '@react-navigation/native';
import { Image } from 'expo-image';
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

const NewsCard = ({ data, type = 'news', language = 'en' }) => {
    // NavigationContext 可在非基頁拿到路由資訊
    const navigation = useContext(NavigationContext);
    const { theme } = useTheme();
    const { white, black, viewShadow, themeColor, secondThemeColor, tonal, imagePlaceholder } = theme;

    // 圖片加載狀態
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const styles = useMemo(() => StyleSheet.create({
        newsCardContainer: {
            backgroundColor: white,
            marginTop: verticalScale(6),
            marginHorizontal: scale(16),
            borderRadius: scale(16),
            // 在 VirtualizedList 等父層未給定寬度時，仍撐滿可視列寬，供內層水平 flex 正確分配
            alignSelf: 'stretch',
            ...viewShadow,
        },
        newsCardContentContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            // 明確指定左右內邊距，避免與固定寬度圖片併用時右側被擠壓
            paddingHorizontal: scale(12),
            paddingVertical: verticalScale(10),
        },
        newsCardTextColumn: {
            flex: 1,
            minWidth: 0,
            alignSelf: 'stretch',
            justifyContent: 'space-between',
            // 與左側內邊距對稱的間隔，使圖片與卡片右緣保持舒適留白
            marginRight: scale(12),
        },
        newsCardImg: {
            width: verticalScale(90),
            height: verticalScale(90),
        },
    }),
        [viewShadow, white],
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

    const title = useMemo(() => {
        const titleLocale = language === 'tc' ? 'zh_TW' : 'en_US';
        return (
            data.details.find(item => item.locale === titleLocale)?.title || ''
        );
    }, [data.details, language]);

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

    // 點擊跳轉邏輯
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
            {/* 文字居左，圖片居右 */}
            <View style={styles.newsCardContentContainer}>
                {/* 標題 */}
                <View
                    style={[
                        styles.newsCardTextColumn,
                        !haveImage && { marginRight: 0 },
                    ]}>
                    {title.length > 0 && (
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.main,
                                fontSize: verticalScale(14),
                                lineHeight: verticalScale(20),
                            }}
                            numberOfLines={3}>
                            {title}
                        </Text>
                    )}

                    {/* 活動類型展示日期 */}
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
                    <View style={{ flexShrink: 0, alignSelf: 'center' }}>
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
                                contentFit="cover"
                                placeholder={imagePlaceholder}
                                placeholderContentFit="cover"
                                transition={200}
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
