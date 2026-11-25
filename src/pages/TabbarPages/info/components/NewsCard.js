import React, { useContext, useState, useEffect, memo, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import SearchHighlightText from './SearchHighlightText';
import { pickDisplayedTitles } from '../utils/umOpenDataSearch';

import { NavigationContext } from '@react-navigation/native';
import { Image } from 'expo-image';
import moment from 'moment-timezone';
import { useTranslation } from 'react-i18next';
import { moderateScale, scale } from 'react-native-size-matters';

const ROW_HORIZONTAL_INSET = scale(16);
const THUMBNAIL_SIZE = scale(60);

export const newsRowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        paddingHorizontal: ROW_HORIZONTAL_INSET,
        paddingVertical: scale(10),
        columnGap: scale(12),
    },
    textColumn: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
        rowGap: scale(4),
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        columnGap: scale(4),
    },
    thumbnail: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        borderRadius: scale(6),
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

const NewsCard = ({ data, type = 'news', language = 'en', searchQuery = '' }) => {
    // NavigationContext 可在非基頁拿到路由資訊
    const navigation = useContext(NavigationContext);
    const { t } = useTranslation('common');
    const { theme } = useTheme();
    const { black, themeColor, accentForeground, imagePlaceholder } = theme;

    const [imageError, setImageError] = useState(false);

    const beginDate =
        type === 'event' ? data.common.dateFrom : data.common.publishDate;
    const beginMomentDate = useMemo(() => moment(beginDate), [beginDate]);
    const nowMomentDate = useMemo(() => moment(new Date()), []);
    const isToday = type === 'event' && beginMomentDate.isSame(nowMomentDate, 'day');
    const dateLabel = language === 'tc'
        ? beginMomentDate.format('M月D日')
        : beginMomentDate.format('MMM D');

    const { title, alternateTitle } = useMemo(
        () => pickDisplayedTitles(data.details, language, searchQuery),
        [data.details, language, searchQuery],
    );
    const highlightStyle = useMemo(
        () => ({
            color: themeColor,
            fontWeight: '700',
        }),
        [themeColor],
    );
    const metaTextStyle = {
        ...uiStyle.defaultText,
        fontSize: moderateScale(12),
        lineHeight: moderateScale(16),
        color: black.third,
    };

    const thumbnailUrl = type === 'event' ? data.common.posterUrl : data.common.imageUrls?.[0];
    const thumbnailUri = typeof thumbnailUrl === 'string'
        ? thumbnailUrl.replace('http:', 'https:')
        : '';

    useEffect(() => {
        setImageError(false);
    }, [thumbnailUri]);

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
                    <SearchHighlightText
                        text={title}
                        query={searchQuery}
                        highlightStyle={highlightStyle}
                        numberOfLines={2}
                        style={{
                            ...uiStyle.defaultText,
                            color: black.second,
                            fontSize: moderateScale(15),
                            lineHeight: moderateScale(21),
                        }}
                    />
                )}
                {alternateTitle.length > 0 && (
                    <SearchHighlightText
                        text={alternateTitle}
                        query={searchQuery}
                        highlightStyle={highlightStyle}
                        numberOfLines={1}
                        style={{
                            ...uiStyle.defaultText,
                            color: black.third,
                            fontSize: moderateScale(13),
                            lineHeight: moderateScale(18),
                        }}
                    />
                )}
                <View style={newsRowStyles.metaRow}>
                    {isToday ? (
                        <Text style={[metaTextStyle, { color: accentForeground }]}>
                            {t('今天')}
                        </Text>
                    ) : null}
                    {isToday ? (
                        <Text style={metaTextStyle}>·</Text>
                    ) : null}
                    <Text style={metaTextStyle}>{dateLabel}</Text>
                </View>
            </View>
            {thumbnailUri ? (
                <View style={[
                    newsRowStyles.thumbnail,
                    { backgroundColor: theme.bg_color },
                ]}>
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
                        onError={() => setImageError(true)}
                    />
                </View>
            ) : null}
        </ScalePressable>
    );
};

export default memo(NewsCard);
