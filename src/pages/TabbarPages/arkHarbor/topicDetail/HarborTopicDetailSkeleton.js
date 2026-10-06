import React from 'react';
import {
    View,
} from 'react-native';

import { isLiquidGlassSupported } from '../../../../utils/glassEffect';

import styles from './styles';

const HarborSkeletonBlock = ({ color, style }) => (
    <View style={[styles.skeletonBlock, { backgroundColor: color }, style]} />
);

const HarborPostSkeleton = ({ theme, compact = false }) => {
    const { disabled, tonal, white, viewShadow } = theme;

    return (
        <View
            style={[
                styles.postCard,
                { backgroundColor: white, borderColor: disabled },
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
            <View style={styles.postMetaRow}>
                <HarborSkeletonBlock
                    color={tonal.primary08}
                    style={styles.skeletonPostTime}
                />
                <View style={styles.postMetaStats}>
                    <HarborSkeletonBlock
                        color={tonal.primary15}
                        style={styles.skeletonMetaItem}
                    />
                    <HarborSkeletonBlock
                        color={tonal.primary15}
                        style={styles.skeletonMetaItem}
                    />
                </View>
            </View>
            <View style={styles.composerActionRow}>
                <HarborSkeletonBlock
                    color={tonal.primary15}
                    style={[
                        styles.skeletonPostAction,
                        styles.reactionMenuButton,
                    ]}
                />
            </View>
            <View style={styles.postActionRow}>
                <HarborSkeletonBlock
                    color={tonal.primary15}
                    style={[
                        styles.skeletonPostActionWide,
                        styles.reactionMenuView,
                    ]}
                />
                <HarborSkeletonBlock
                    color={tonal.primary15}
                    style={styles.skeletonPostAction}
                />
            </View>
        </View>
    );
};

const HarborTopicDetailSkeleton = ({ headerHeight, theme }) => {
    const {
        disabled,
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
                <View
                    style={[
                        styles.topicHeaderDivider,
                        { backgroundColor: disabled },
                    ]}
                />

                <HarborPostSkeleton theme={theme} />
                <HarborPostSkeleton theme={theme} compact />
            </View>

        </View>
    );
};

export default HarborTopicDetailSkeleton;
