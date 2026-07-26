import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../../../components/ThemeContext';
import { scale, verticalScale } from 'react-native-size-matters';

const DEFAULT_CARD_COUNT = 6;
const CARD_IMAGE_SIZE = verticalScale(90);

/** 單張新聞／活動卡骨架，佈局對齊 NewsCard */
const NewsCardSkeleton = memo(function NewsCardSkeleton({
    white,
    tonal,
    viewShadow,
    titleWidths,
}) {
    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: white,
                    ...viewShadow,
                },
            ]}>
            <View style={styles.cardContent}>
                <View style={styles.textColumn}>
                    {titleWidths.map((width, index) => (
                        <View
                            key={`title-${index}`}
                            style={[
                                styles.titleLine,
                                {
                                    width,
                                    marginTop: index === 0 ? 0 : verticalScale(6),
                                    backgroundColor:
                                        index === 0
                                            ? tonal.primary15
                                            : tonal.primary08,
                                },
                            ]}
                        />
                    ))}
                    <View
                        style={[
                            styles.dateLine,
                            { backgroundColor: tonal.primary08 },
                        ]}
                    />
                </View>
                <View
                    style={[
                        styles.image,
                        { backgroundColor: tonal.primary15 },
                    ]}
                />
            </View>
        </View>
    );
});

/** 新聞頁頭條大圖骨架 */
const TopNewsSkeleton = memo(function TopNewsSkeleton({ white, tonal, viewShadow }) {
    return (
        <View
            style={[
                styles.topNews,
                {
                    backgroundColor: white,
                    ...viewShadow,
                },
            ]}>
            <View
                style={[
                    styles.topNewsFill,
                    { backgroundColor: tonal.primary15 },
                ]}
            />
            <View style={styles.topNewsOverlay}>
                <View
                    style={[
                        styles.topNewsBadge,
                        { backgroundColor: tonal.primary08 },
                    ]}
                />
                <View
                    style={[
                        styles.topNewsTitle,
                        { backgroundColor: tonal.primary08 },
                    ]}
                />
                <View
                    style={[
                        styles.topNewsTitleShort,
                        { backgroundColor: tonal.primary08 },
                    ]}
                />
            </View>
        </View>
    );
});

/**
 * 澳大新聞／活動列表共用骨架
 * @param {number} [count=6] - 列表卡數量
 * @param {boolean} [showTopNews=false] - 是否顯示頭條大圖骨架（新聞頁）
 * @param {number} [contentTopInset=0] - 懸浮頁頭所需的頂部間距
 */
const NewsListSkeleton = ({
    count = DEFAULT_CARD_COUNT,
    showTopNews = false,
    contentTopInset = 0,
}) => {
    const { theme } = useTheme();
    const { white, tonal, viewShadow } = theme;
    const titleWidthSets = [
        ['92%', '78%', '54%'],
        ['88%', '70%'],
        ['90%', '82%', '48%'],
        ['86%', '64%'],
        ['94%', '76%', '58%'],
        ['84%', '68%'],
    ];

    return (
        <View
            style={[
                styles.container,
                { paddingTop: contentTopInset + verticalScale(5) },
            ]}>
            {showTopNews ? (
                <TopNewsSkeleton
                    white={white}
                    tonal={tonal}
                    viewShadow={viewShadow}
                />
            ) : null}
            {Array.from({ length: count }, (_, index) => (
                <NewsCardSkeleton
                    key={`news-skeleton-${index}`}
                    white={white}
                    tonal={tonal}
                    viewShadow={viewShadow}
                    titleWidths={
                        titleWidthSets[index % titleWidthSets.length]
                    }
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignSelf: 'stretch',
    },
    card: {
        marginTop: verticalScale(6),
        marginHorizontal: scale(16),
        borderRadius: scale(16),
        alignSelf: 'stretch',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
    },
    textColumn: {
        flex: 1,
        minWidth: 0,
        alignSelf: 'stretch',
        justifyContent: 'space-between',
        marginRight: scale(12),
    },
    titleLine: {
        height: verticalScale(14),
        borderRadius: scale(4),
    },
    dateLine: {
        marginTop: scale(8),
        height: verticalScale(13),
        width: '28%',
        borderRadius: scale(4),
    },
    image: {
        width: CARD_IMAGE_SIZE,
        height: CARD_IMAGE_SIZE,
        borderRadius: scale(12),
        flexShrink: 0,
    },
    topNews: {
        borderRadius: scale(10),
        overflow: 'hidden',
        marginHorizontal: scale(10),
        marginVertical: verticalScale(5),
        height: verticalScale(200),
    },
    topNewsFill: {
        ...StyleSheet.absoluteFillObject,
    },
    topNewsOverlay: {
        ...StyleSheet.absoluteFillObject,
        padding: verticalScale(15),
        justifyContent: 'flex-end',
    },
    topNewsBadge: {
        position: 'absolute',
        top: verticalScale(10),
        left: scale(15),
        height: verticalScale(18),
        width: '28%',
        borderRadius: scale(4),
    },
    topNewsTitle: {
        height: verticalScale(16),
        width: '90%',
        borderRadius: scale(4),
        marginBottom: verticalScale(8),
    },
    topNewsTitleShort: {
        height: verticalScale(16),
        width: '62%',
        borderRadius: scale(4),
    },
});

export default memo(NewsListSkeleton);
