import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Image } from 'expo-image';
import moment from 'moment-timezone';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { ARK_HARBOR_AVATAR_TEMPLATE } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';

const STATUS_CONFIG = {
    pinned: { icon: 'pin-outline', label: '置頂' },
    closed: { icon: 'lock-outline', label: '已關閉' },
    archived: { icon: 'archive-outline', label: '已封存' },
    muted: { icon: 'volume-mute', label: '已靜音' },
    solved: { icon: 'check-decagram-outline', label: '已解決' },
};

const stopAndRun = (event, callback) => {
    event.stopPropagation?.();
    trigger();
    callback();
};

const Metric = ({ icon, value, color }) => (
    <View style={styles.metric}>
        <MaterialCommunityIcons name={icon} size={scale(14)} color={color} />
        <Text style={[styles.metricText, { color }]}>{value}</Text>
    </View>
);

const StatusChip = ({ status }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const config = STATUS_CONFIG[status];
    if (!config) {
        return null;
    }

    return (
        <View
            style={[
                styles.statusChip,
                { backgroundColor: theme.tonal.primary15 },
            ]}>
            <MaterialCommunityIcons
                name={config.icon}
                size={scale(12)}
                color={theme.themeColor}
            />
            <Text style={[styles.statusText, { color: theme.themeColor }]}>
                {t(config.label)}
            </Text>
        </View>
    );
};

const normalizeTag = tag => {
    if (typeof tag === 'string') {
        return { name: tag, slug: tag };
    }
    return {
        name: tag?.name || tag?.id || tag?.slug || '',
        slug: tag?.slug || tag?.name || tag?.id || '',
    };
};

const HarborTopicCard = ({ topic, onPress, onCategoryPress, onTagPress }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const author = topic.author || {};
    const authorName =
        author.name ||
        author.displayName ||
        author.username ||
        t('Harbor 會員');
    const avatarTemplate = author.avatarTemplate || author.avatar_template;
    const avatarUrl =
        author.avatarUrl ||
        (avatarTemplate
            ? ARK_HARBOR_AVATAR_TEMPLATE(avatarTemplate, 72)
            : null);
    const category = topic.category?.name ? topic.category : null;
    const tags = Array.isArray(topic.tags)
        ? topic.tags
            .map(normalizeTag)
            .filter(tag => tag.name)
            .slice(0, 3)
        : [];
    const statuses = Object.keys(STATUS_CONFIG).filter(status => {
        if (status === 'pinned') {
            return topic.pinned || topic.pinnedGlobally;
        }
        return Boolean(topic[status]);
    });
    const activityAt =
        topic.activityAt || topic.lastPostedAt || topic.createdAt;
    const unreadCount = Number(topic.unreadCount || 0);
    const lastReadPostNumber = Number(topic.lastReadPostNumber || 0);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={topic.title}
            onPress={() => {
                trigger();
                onPress(topic);
            }}
            style={({ pressed }) => [
                styles.card,
                {
                    backgroundColor: pressed
                        ? theme.tonal.primary08
                        : theme.white,
                    borderColor: theme.themeColorUltraLight,
                },
                theme.viewShadow,
            ]}>
            <View style={styles.authorRow}>
                {avatarUrl ? (
                    <Image
                        source={{ uri: avatarUrl }}
                        style={[
                            styles.avatar,
                            { backgroundColor: theme.tonal.primary15 },
                        ]}
                        contentFit="cover"
                        placeholder={theme.imagePlaceholder}
                        placeholderContentFit="cover"
                        transition={180}
                    />
                ) : (
                    <View
                        style={[
                            styles.avatarFallback,
                            { backgroundColor: theme.tonal.primary15 },
                        ]}>
                        <MaterialCommunityIcons
                            name="account-outline"
                            size={scale(18)}
                            color={theme.themeColor}
                        />
                    </View>
                )}
                <View style={styles.authorText}>
                    <Text
                        numberOfLines={1}
                        style={[styles.authorName, { color: theme.black.main }]}>
                        {authorName}
                    </Text>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.activityTime,
                            { color: theme.black.third },
                        ]}>
                        {activityAt
                            ? `${t('最後活動')} · ${moment
                                .tz(activityAt, 'Asia/Macau')
                                .format('MM/DD HH:mm')}`
                            : t('Harbor 話題')}
                    </Text>
                </View>
                {topic.isNew ? (
                    <View
                        style={[
                            styles.unreadChip,
                            { backgroundColor: theme.tonal.unread15 },
                        ]}>
                        <Text
                            style={[styles.unreadText, { color: theme.unread }]}>
                            {t('新話題')}
                        </Text>
                    </View>
                ) : unreadCount > 0 ? (
                    <View
                        style={[
                            styles.unreadChip,
                            { backgroundColor: theme.tonal.unread15 },
                        ]}>
                        <Text
                            style={[styles.unreadText, { color: theme.unread }]}>
                            {t('{{count}} 未讀', { count: unreadCount })}
                        </Text>
                    </View>
                ) : null}
            </View>

            <Text
                selectable
                numberOfLines={3}
                style={[styles.title, { color: theme.black.main }]}>
                {topic.title}
            </Text>

            {topic.excerpt ? (
                <Text
                    numberOfLines={2}
                    style={[styles.excerpt, { color: theme.black.third }]}>
                    {topic.excerpt}
                </Text>
            ) : null}

            {category || tags.length > 0 ? (
                <View style={styles.taxonomyRow}>
                    {category ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={event =>
                                stopAndRun(event, () =>
                                    onCategoryPress(category),
                                )
                            }
                            style={({ pressed }) => [
                                styles.categoryChip,
                                {
                                    backgroundColor: pressed
                                        ? theme.tonal.secondary30
                                        : theme.tonal.secondary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="folder-outline"
                                size={scale(12)}
                                color={theme.secondThemeColor}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.categoryText,
                                    { color: theme.secondThemeColor },
                                ]}>
                                {category.name}
                            </Text>
                        </Pressable>
                    ) : null}
                    {tags.map(tag => (
                        <Pressable
                            key={tag.slug}
                            accessibilityRole="button"
                            onPress={event =>
                                stopAndRun(event, () => onTagPress(tag))
                            }
                            style={({ pressed }) => [
                                styles.tagChip,
                                {
                                    backgroundColor: pressed
                                        ? theme.tonal.primary30
                                        : theme.tonal.primary15,
                                },
                            ]}>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.tagText,
                                    { color: theme.themeColor },
                                ]}>
                                #{tag.name}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            ) : null}

            {statuses.length > 0 ? (
                <View style={styles.statusRow}>
                    {statuses.map(status => (
                        <StatusChip key={status} status={status} />
                    ))}
                </View>
            ) : null}

            <View
                style={[
                    styles.footer,
                    { borderTopColor: theme.themeColorUltraLight },
                ]}>
                <View style={styles.metrics}>
                    <Metric
                        icon="comment-outline"
                        value={topic.replyCount || 0}
                        color={theme.black.third}
                    />
                    <Metric
                        icon="eye-outline"
                        value={topic.viewCount || 0}
                        color={theme.black.third}
                    />
                    <Metric
                        icon="heart-outline"
                        value={topic.likeCount || 0}
                        color={theme.themeColor}
                    />
                </View>
                {lastReadPostNumber > 0 ? (
                    <Text
                        style={[
                            styles.readPosition,
                            { color: theme.black.third },
                        ]}>
                        {t('已讀至 #{{postNumber}}', {
                            postNumber: lastReadPostNumber,
                        })}
                    </Text>
                ) : (
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={scale(18)}
                        color={theme.black.third}
                    />
                )}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    card: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(16),
        marginHorizontal: scale(14),
        marginBottom: verticalScale(10),
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(13),
        overflow: 'hidden',
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(17),
    },
    avatarFallback: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(17),
        alignItems: 'center',
        justifyContent: 'center',
    },
    authorText: {
        flex: 1,
        minWidth: 0,
        marginLeft: scale(9),
    },
    authorName: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
    },
    activityTime: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(2),
    },
    unreadChip: {
        borderRadius: scale(8),
        marginLeft: scale(8),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
    },
    unreadText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(17),
        lineHeight: scale(23),
        fontWeight: '700',
        marginTop: verticalScale(11),
    },
    excerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: scale(17),
        marginTop: verticalScale(5),
    },
    taxonomyRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: verticalScale(9),
    },
    categoryChip: {
        maxWidth: scale(150),
        borderRadius: scale(7),
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scale(6),
        marginBottom: verticalScale(5),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(4),
    },
    categoryText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        fontWeight: '600',
        marginLeft: scale(4),
    },
    tagChip: {
        maxWidth: scale(110),
        borderRadius: scale(7),
        marginRight: scale(6),
        marginBottom: verticalScale(5),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(4),
    },
    tagText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '600',
    },
    statusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: verticalScale(3),
    },
    statusChip: {
        borderRadius: scale(7),
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scale(6),
        marginBottom: verticalScale(5),
        paddingHorizontal: scale(6),
        paddingVertical: verticalScale(3),
    },
    statusText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '600',
        marginLeft: scale(3),
    },
    footer: {
        minHeight: verticalScale(40),
        borderTopWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: verticalScale(6),
    },
    metrics: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metric: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scale(12),
    },
    metricText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginLeft: scale(3),
    },
    readPosition: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginLeft: scale(8),
    },
});

export default memo(HarborTopicCard);
