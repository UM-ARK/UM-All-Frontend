import React, { useContext, useState, memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';

import { NavigationContext } from '@react-navigation/native';
import { Image } from 'expo-image';
import moment from 'moment-timezone';
import { scale, verticalScale } from 'react-native-size-matters';

const ROW_HORIZONTAL_INSET = scale(16);

export const newsRowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        minHeight: 48,
        paddingHorizontal: ROW_HORIZONTAL_INSET,
        paddingVertical: verticalScale(8),
        columnGap: scale(12),
    },
    textColumn: {
        flex: 1,
        minWidth: 0,
        rowGap: verticalScale(4),
    },
    thumbnail: {
        width: scale(56),
        height: scale(56),
        borderRadius: scale(8),
        overflow: 'hidden',
        flexShrink: 0,
    },
});

const styles = StyleSheet.create({
    separator: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: ROW_HORIZONTAL_INSET,
    },
    image: {
        width: '100%',
        height: '100%',
    },
});

export const NewsRowSeparator = () => {
    const { theme } = useTheme();
    return <View style={[styles.separator, { backgroundColor: theme.disabled }]} />;
};

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
    const { black, themeColor, secondThemeColor, tonal, imagePlaceholder } = theme;

    // 圖片加載狀態
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

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

    const thumbnailUrl = type === 'event' ? data.common.posterUrl : data.common.imageUrls?.[0];
    const thumbnailUri = typeof thumbnailUrl === 'string'
        ? thumbnailUrl.replace('http:', 'https:')
        : '';

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
        <ScalePressable
            accessibilityRole="button"
            style={newsRowStyles.row}
            onPress={handlePress}>
            <View style={newsRowStyles.textColumn}>
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
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: verticalScale(13),
                        color: dateColor,
                    }}>
                    {beginMomentDate.format('MM-DD')}
                </Text>
            </View>
            {thumbnailUri ? (
                <View style={newsRowStyles.thumbnail}>
                    <Image
                        source={{ uri: thumbnailUri }}
                        style={[
                            styles.image,
                            imageError && { opacity: 0.3 },
                        ]}
                        contentFit="cover"
                        recyclingKey={thumbnailUri}
                        placeholder={imagePlaceholder}
                        placeholderContentFit="cover"
                        transition={200}
                        onLoadStart={() => {
                            setImageLoading(true);
                            setImageError(false);
                        }}
                        onLoadEnd={() => setImageLoading(false)}
                        onError={() => {
                            setImageLoading(false);
                            setImageError(true);
                        }}
                    />
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
            ) : null}
        </ScalePressable>
    );
};

export default memo(NewsCard);
