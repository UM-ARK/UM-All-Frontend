import React from 'react';
import {
    View,
} from 'react-native';

import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { verticalScale } from 'react-native-size-matters';

import styles from './styles';

const HarborSkeletonBlock = ({ color, style }) => (
    <View style={[styles.skeletonBlock, { backgroundColor: color }, style]} />
);

const HarborPostSkeleton = ({ theme, compact = false }) => {
    const { themeColorUltraLight, tonal, white, viewShadow } = theme;

    return (
        <View
            style={[
                styles.postCard,
                { backgroundColor: white, borderColor: themeColorUltraLight },
                viewShadow,
            ]}>
            <View style={styles.postHeader}>
                <HarborSkeletonBlock
                    color={tonal.primary30}
                    style={styles.skeletonAvatar}
                />
                <View style={styles.skeletonAuthorArea}>
                    <HarborSkeletonBlock
                        color={tonal.primary15}
                        style={styles.skeletonAuthorName}
                    />
                    <HarborSkeletonBlock
                        color={tonal.primary15}
                        style={styles.skeletonAuthorBadge}
                    />
                    <HarborSkeletonBlock
                        color={tonal.primary08}
                        style={styles.skeletonPostTime}
                    />
                </View>
                <HarborSkeletonBlock
                    color={tonal.primary15}
                    style={styles.skeletonPostNumber}
                />
            </View>
            <View style={styles.skeletonPostBody}>
                <HarborSkeletonBlock
                    color={tonal.primary15}
                    style={styles.skeletonBodyLine}
                />
                <HarborSkeletonBlock
                    color={tonal.primary15}
                    style={styles.skeletonBodyLineMedium}
                />
                {!compact ? (
                    <HarborSkeletonBlock
                        color={tonal.primary08}
                        style={styles.skeletonBodyLineShort}
                    />
                ) : null}
            </View>
            <View
                style={[
                    styles.postFooter,
                    { borderTopColor: themeColorUltraLight },
                ]}>
                <View style={styles.skeletonFooterMeta}>
                    <HarborSkeletonBlock
                        color={tonal.primary15}
                        style={styles.skeletonMetaItem}
                    />
                    <HarborSkeletonBlock
                        color={tonal.primary15}
                        style={styles.skeletonMetaItem}
                    />
                </View>
                <HarborSkeletonBlock
                    color={tonal.primary15}
                    style={styles.skeletonMetaItem}
                />
            </View>
            <View style={styles.composerActionRow}>
                <HarborSkeletonBlock
                    color={tonal.primary15}
                    style={styles.skeletonPostActionWide}
                />
                <HarborSkeletonBlock
                    color={tonal.primary15}
                    style={styles.skeletonPostAction}
                />
            </View>
        </View>
    );
};

const HarborTopicDetailSkeleton = ({ headerHeight, insets, theme }) => {
    const {
        themeColorUltraLight,
        tonal,
        white,
        viewShadow,
    } = theme;
    const contentInsetStyle = {
        paddingTop: isLiquidGlassSupported ? headerHeight : 0,
    };

    return (
        <View style={[styles.page, { backgroundColor: white }]}>
            <View
                style={[
                    styles.skeletonContent,
                    contentInsetStyle,
                ]}>
                <View
                    style={[
                        styles.topicHeader,
                        {
                            backgroundColor: white,
                            borderColor: themeColorUltraLight,
                        },
                        viewShadow,
                    ]}>
                    <HarborSkeletonBlock
                        color={tonal.primary15}
                        style={styles.skeletonTopicTitle}
                    />
                    <HarborSkeletonBlock
                        color={tonal.primary15}
                        style={styles.skeletonTopicTitleShort}
                    />
                    <HarborSkeletonBlock
                        color={tonal.primary15}
                        style={styles.skeletonCategory}
                    />
                    <View style={styles.skeletonTopicMeta}>
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonTopicMetaItem}
                        />
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonTopicMetaItem}
                        />
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonTopicMetaItem}
                        />
                    </View>
                    <HarborSkeletonBlock
                        color={tonal.primary08}
                        style={styles.skeletonLastUpdated}
                    />
                    <View style={styles.skeletonWebActions}>
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonWebActionWide}
                        />
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonWebAction}
                        />
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonWebAction}
                        />
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonWebAction}
                        />
                    </View>
                </View>

                <HarborPostSkeleton theme={theme} />
                <HarborPostSkeleton theme={theme} compact />
            </View>

            <View
                style={[
                    styles.readingControlsDock,
                    {
                        paddingBottom: Math.max(
                            insets.bottom,
                            verticalScale(8),
                        ),
                    },
                ]}>
                <View
                    style={[
                        styles.readingControls,
                        viewShadow,
                        {
                            backgroundColor: white,
                            borderColor: themeColorUltraLight,
                        },
                    ]}>
                    <View style={styles.progressHeader}>
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonProgressLabel}
                        />
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonProgressPercent}
                        />
                    </View>
                    <View
                        style={[
                            styles.skeletonProgressTrack,
                            { backgroundColor: tonal.primary15 },
                        ]}>
                        <View
                            style={[
                                styles.skeletonProgressFill,
                                { backgroundColor: tonal.primary30 },
                            ]}
                        />
                    </View>
                    <View style={styles.controlRow}>
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonControlButton}
                        />
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonControlButton}
                        />
                        <HarborSkeletonBlock
                            color={tonal.primary15}
                            style={styles.skeletonControlButton}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
};

export default HarborTopicDetailSkeleton;
