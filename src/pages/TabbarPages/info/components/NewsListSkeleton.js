import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../../../components/ThemeContext';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { NewsRowSeparator, newsRowStyles } from './NewsCard';

const DEFAULT_ROW_COUNT = 6;

/** 單列新聞／活動骨架，佈局對齊 NewsCard */
const NewsRowSkeleton = memo(function NewsRowSkeleton({
    tonal,
    titleWidths,
}) {
    return (
        <View style={newsRowStyles.row}>
            <View style={newsRowStyles.textColumn}>
                {titleWidths.map((width, index) => (
                    <View
                        key={`title-${index}`}
                        style={[
                            styles.titleLine,
                            {
                                width,
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
                    newsRowStyles.thumbnail,
                    { backgroundColor: tonal.primary15 },
                ]}
            />
        </View>
    );
});

/** 新聞頁頭條大圖骨架 */
const TopNewsSkeleton = memo(function TopNewsSkeleton({ white, tonal }) {
    return (
        <View
            style={[
                styles.topNews,
                { backgroundColor: white },
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
 * @param {number} [count=6] - 列表列數
 * @param {boolean} [showTopNews=false] - 是否顯示頭條大圖骨架（新聞頁）
 * @param {number} [contentTopInset=0] - 懸浮頁頭所需的頂部間距
 */
const NewsListSkeleton = ({
    count = DEFAULT_ROW_COUNT,
    showTopNews = false,
    contentTopInset = 0,
}) => {
    const { theme } = useTheme();
    const { white, tonal } = theme;
    const titleWidthSets = [
        ['92%', '78%', '54%'],
        ['84%', '48%'],
        ['90%', '82%', '46%'],
        ['78%', '56%'],
        ['94%', '70%', '42%'],
        ['86%', '62%'],
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
                />
            ) : null}
            {Array.from({ length: count }, (_, index) => (
                <React.Fragment key={`news-skeleton-${index}`}>
                    {index > 0 && <NewsRowSeparator />}
                    <NewsRowSkeleton
                        tonal={tonal}
                        titleWidths={
                            titleWidthSets[index % titleWidthSets.length]
                        }
                    />
                </React.Fragment>
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
    titleLine: {
        height: moderateScale(15),
        borderRadius: scale(4),
    },
    dateLine: {
        height: moderateScale(12),
        width: '22%',
        borderRadius: scale(4),
    },
    topNews: {
        borderRadius: scale(12),
        overflow: 'hidden',
        marginHorizontal: scale(16),
        marginTop: verticalScale(4),
        marginBottom: verticalScale(2),
        height: verticalScale(188),
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
        height: verticalScale(12),
        width: '22%',
        borderRadius: scale(4),
        marginBottom: verticalScale(6),
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
