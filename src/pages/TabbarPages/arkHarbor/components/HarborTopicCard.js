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
import HarborCategoryIcon from './HarborCategoryIcon';

const STATUS_CONFIG = {
    pinned: { icon: 'pin-outline', label: '置頂' },
    closed: { icon: 'lock-outline', label: '已關閉' },
    archived: { icon: 'archive-outline', label: '已封存' },
    muted: { icon: 'volume-mute', label: '已靜音' },
    solved: { icon: 'check-decagram-outline', label: '已解決' },
};

// 頭像高度對齊「ID + 第二行」兩行文字
const AUTHOR_NAME_LINE_HEIGHT = scale(14);
const META_LINE_HEIGHT = scale(11);
const META_GAP = verticalScale(1);
const AVATAR_SIZE = AUTHOR_NAME_LINE_HEIGHT + META_GAP + META_LINE_HEIGHT;

const stopAndRun = (event, callback, isPressAllowed) => {
    event.stopPropagation?.();
    if (isPressAllowed && !isPressAllowed()) {
        return;
    }
    trigger();
    callback();
};

const formatTopicDateLabel = (iso, t) => {
    if (!iso) {
        return '';
    }
    const activity = moment.tz(iso, 'Asia/Macau');
    if (!activity.isValid()) {
        return '';
    }
    const today = moment.tz('Asia/Macau').startOf('day');
    const activityDay = activity.clone().startOf('day');
    const dayDiff = today.diff(activityDay, 'days');
    if (dayDiff === 0) {
        return t('今天');
    }
    if (dayDiff === 1) {
        return t('昨天');
    }
    if (dayDiff === 2) {
        return t('前天');
    }
    if (activity.year() === today.year()) {
        return activity.format('MM-DD');
    }
    return activity.format('YYYY-MM-DD');
};

const resolveUserId = (user, fallback) => {
    return (
        user?.username ||
        user?.name ||
        user?.displayName ||
        fallback ||
        ''
    );
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

const HarborTopicCard = ({
    topic,
    onPress,
    onCategoryPress,
    onTagPress,
    isPressAllowed,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const author = topic.author || {};
    const lastPoster = topic.lastPoster || null;
    const authorId = resolveUserId(author, t('Harbor 會員'));
    const lastPosterId = resolveUserId(lastPoster);
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
    const dateLabel = formatTopicDateLabel(activityAt, t) || t('Harbor 話題');
    const unreadCount = Number(topic.unreadCount || 0);
    const lastReadPostNumber = Number(topic.lastReadPostNumber || 0);
    const replyCount = Number(topic.replyCount || 0);
    const showLastPosterTeaser = Boolean(lastPosterId) && replyCount > 0;
    const isNewReply =
        topic.newContentType === 'reply' ||
        (!topic.newContentType && unreadCount > 0);
    const isNewTopic =
        topic.newContentType === 'topic' ||
        (!topic.newContentType && topic.isNew);
    const avatarStyle = {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: theme.tonal.primary15,
    };

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={topic.title}
            onPress={() => {
                if (isPressAllowed && !isPressAllowed()) {
                    return;
                }
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
                        style={avatarStyle}
                        contentFit="cover"
                        placeholder={theme.imagePlaceholder}
                        placeholderContentFit="cover"
                        transition={180}
                    />
                ) : (
                    <View style={[styles.avatarFallback, avatarStyle]}>
                        <MaterialCommunityIcons
                            name="account-outline"
                            size={scale(14)}
                            color={theme.themeColor}
                        />
                    </View>
                )}
                <View style={styles.authorText}>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.authorName,
                            {
                                color: theme.black.third,
                                lineHeight: AUTHOR_NAME_LINE_HEIGHT,
                            },
                        ]}>
                        {authorId}
                    </Text>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.activityTime,
                            {
                                color: theme.black.third,
                                lineHeight: META_LINE_HEIGHT,
                                marginTop: META_GAP,
                            },
                        ]}>
                        {dateLabel}
                    </Text>
                </View>
                {isNewReply ? (
                    <View
                        style={[
                            styles.unreadChip,
                            { backgroundColor: theme.tonal.unread15 },
                        ]}>
                        <Text
                            style={[
                                styles.unreadText,
                                { color: theme.unread },
                            ]}>
                            {t('{{count}} 新回覆', { count: unreadCount })}
                        </Text>
                    </View>
                ) : isNewTopic ? (
                    <View
                        accessible
                        accessibilityLabel={t('新話題')}
                        style={[
                            styles.newTopicDot,
                            { backgroundColor: theme.unread },
                        ]}
                    />
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
                                stopAndRun(
                                    event,
                                    () => onCategoryPress(category),
                                    isPressAllowed,
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
                            <HarborCategoryIcon
                                category={category}
                                color={theme.secondThemeColor}
                                size={scale(12)}
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
                                stopAndRun(
                                    event,
                                    () => onTagPress(tag),
                                    isPressAllowed,
                                )
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

            {showLastPosterTeaser ? (
                <View
                    style={[
                        styles.lastPosterBox,
                        { backgroundColor: theme.bg_color },
                    ]}>
                    <Text numberOfLines={2} style={styles.lastPosterLine}>
                        <Text
                            style={[
                                styles.lastPosterId,
                                { color: theme.black.second },
                            ]}>
                            {`${lastPosterId}: `}
                        </Text>
                        <Text
                            style={[
                                styles.lastPosterTeaser,
                                { color: theme.black.third },
                            ]}>
                            ...
                        </Text>
                    </Text>
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
                        value={replyCount}
                        color={theme.black.third}
                    />
                    <Metric
                        icon="eye-outline"
                        value={topic.viewCount || 0}
                        color={theme.black.third}
                    />
                    <Metric
                        icon={topic.liked ? 'heart' : 'heart-outline'}
                        value={topic.likeCount || 0}
                        color={
                            topic.liked
                                ? theme.themeColor
                                : theme.black.third
                        }
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
        borderRadius: scale(12),
        marginHorizontal: scale(6),
        marginBottom: verticalScale(4),
        paddingHorizontal: scale(12),
        paddingTop: verticalScale(11),
        overflow: 'hidden',
    },
    authorRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    authorText: {
        flex: 1,
        minWidth: 0,
        marginLeft: scale(8),
        justifyContent: 'center',
    },
    authorName: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
    },
    activityTime: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
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
    newTopicDot: {
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
        marginLeft: scale(8),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        lineHeight: scale(19),
        fontWeight: '700',
        marginTop: verticalScale(9),
    },
    excerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: scale(17),
        marginTop: verticalScale(5),
    },
    lastPosterBox: {
        borderRadius: scale(8),
        marginTop: verticalScale(8),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(8),
    },
    lastPosterLine: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: scale(16),
    },
    lastPosterId: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
    },
    lastPosterTeaser: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
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
        gap: scale(4),
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
        paddingVertical: verticalScale(6),
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
