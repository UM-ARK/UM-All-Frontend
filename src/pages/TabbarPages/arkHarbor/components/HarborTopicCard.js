import React, { memo, useEffect, useState } from 'react';
import {
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import { Image } from 'expo-image';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import {
    ARK_HARBOR_ABSOLUTE_URL,
    ARK_HARBOR_AVATAR_TEMPLATE,
} from '../../../../utils/pathMap';
import { isHarborTopicUnseen } from '../../../../utils/harbor/harborTopicUpdates';
import { trigger } from '../../../../utils/trigger';
import PhosphorFeatureIcon from '../../info/home/search/components/PhosphorFeatureIcon';
import HarborCategoryIcon from './HarborCategoryIcon';

const CARD_MARGIN_HORIZONTAL = scale(6);
const CARD_PADDING_HORIZONTAL = scale(12);
export const harborTopicRowInsets = {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
};
// 豎圖預覽比例（相對螢幕）
const COVER_PORTRAIT_WIDTH_RATIO = 1 / 2.3;
const COVER_PORTRAIT_HEIGHT_RATIO = 1 / 3.6;
// 橫圖：更寬、更矮
const COVER_LANDSCAPE_HEIGHT_RATIO = 1 / 4;

const STATUS_CONFIG = {
    pinned: { icon: 'push-pin', label: '置頂' },
    closed: { icon: 'lock', label: '已關閉' },
    archived: { icon: 'archive', label: '已封存' },
    muted: { icon: 'speaker-slash', label: '已靜音' },
    solved: { icon: 'badge-verified', label: '已解決' },
};

// ID、分類併成一行，頭像略高於文字行
const AUTHOR_NAME_LINE_HEIGHT = scale(14);
const AVATAR_SIZE = scale(20);

const stopAndRun = (event, callback, isPressAllowed) => {
    event.stopPropagation?.();
    if (isPressAllowed && !isPressAllowed()) {
        return;
    }
    trigger();
    callback();
};

const resolveUserId = (user, fallback) => user?.username || fallback || '';

const Metric = ({ icon, value, color, weight = 'regular' }) => (
    <View style={styles.metric}>
        <PhosphorFeatureIcon
            name={icon}
            size={scale(14)}
            color={color}
            weight={weight}
        />
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
            <PhosphorFeatureIcon
                name={config.icon}
                size={scale(12)}
                color={theme.themeColor}
                weight="regular"
            />
            <Text style={[styles.statusText, { color: theme.themeColor }]}>
                {t(config.label)}
            </Text>
        </View>
    );
};

const HarborTopicCard = ({
    topic,
    onPress,
    onAuthorPress,
    onCategoryPress,
    isPressAllowed,
    isRowLayout = false,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const author = topic.author || {};
    const authorId = resolveUserId(author, t('Harbor 會員'));
    const avatarTemplate = author.avatarTemplate || author.avatar_template;
    const avatarUrl =
        author.avatarUrl ||
        (avatarTemplate
            ? ARK_HARBOR_AVATAR_TEMPLATE(avatarTemplate)
            : null);
    const coverUrl = topic.imageUrl
        ? ARK_HARBOR_ABSOLUTE_URL(topic.imageUrl)
        : '';
    const [cardWidth, setCardWidth] = useState(0);
    const [coverFailed, setCoverFailed] = useState(false);
    // null：尚未得知比例，先用豎圖尺寸佔位
    const [isLandscape, setIsLandscape] = useState(null);
    const category = topic.category?.name ? topic.category : null;
    const statuses = Object.keys(STATUS_CONFIG).filter(status => {
        if (status === 'pinned') {
            return topic.pinned || topic.pinnedGlobally;
        }
        return Boolean(topic[status]);
    });
    const unreadCount = Number(topic.unreadCount || 0);
    const lastReadPostNumber = Number(topic.lastReadPostNumber || 0);
    const replyCount = Number(topic.replyCount || 0);
    const isNewReply =
        unreadCount > 0 &&
        (topic.newContentType === 'reply' || !topic.newContentType);
    const isNewTopic = isHarborTopicUnseen(topic);
    const avatarStyle = {
        width: AVATAR_SIZE,
        height: AVATAR_SIZE,
        borderRadius: AVATAR_SIZE / 2,
        backgroundColor: theme.tonal.primary15,
    };
    const cardContentWidth = Math.max(
        (cardWidth || windowWidth) -
            CARD_MARGIN_HORIZONTAL * 2 -
            CARD_PADDING_HORIZONTAL * 2 -
            StyleSheet.hairlineWidth * 2,
        0,
    );
    // 圖片寬度依卡片內容區計算，避免雙欄時仍按整個窗口放大
    const coverWidth = isLandscape
        ? cardContentWidth / 1.5
        : cardContentWidth * COVER_PORTRAIT_WIDTH_RATIO;
    const coverHeight = isLandscape
        ? windowHeight * COVER_LANDSCAPE_HEIGHT_RATIO
        : windowHeight * COVER_PORTRAIT_HEIGHT_RATIO;

    useEffect(() => {
        setCoverFailed(false);
        setIsLandscape(null);
    }, [coverUrl]);

    return (
        <ScalePressable
            accessibilityRole="button"
            accessibilityLabel={topic.title}
            onLayout={isRowLayout ? undefined : event =>
                setCardWidth(event.nativeEvent.layout.width)
            }
            onPress={() => {
                if (isPressAllowed && !isPressAllowed()) {
                    return;
                }
                trigger();
                onPress(topic);
            }}
            style={[
                isRowLayout ? harborTopicRowInsets : styles.card,
                {
                    backgroundColor: isRowLayout
                        ? undefined
                        : theme.white,
                    borderColor: isRowLayout
                        ? undefined
                        : theme.themeColorUltraLight,
                },
            ]}>
            <View style={styles.authorRow}>
                <ScalePressable
                    accessibilityRole="link"
                    accessibilityLabel={authorId}
                    disabled={!onAuthorPress || !author.username}
                    onPress={event => {
                        event.stopPropagation?.();
                        trigger();
                        onAuthorPress(author.username);
                    }}>
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
                            <PhosphorFeatureIcon
                                name="user-circle"
                                size={scale(14)}
                                color={theme.themeColor}
                                weight="regular"
                            />
                        </View>
                    )}
                </ScalePressable>
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
                    {category ? (
                        <>
                            <Text
                                style={[
                                    styles.metaSeparator,
                                    { color: theme.black.third },
                                ]}>
                                ·
                            </Text>
                            <ScalePressable
                                accessibilityRole="button"
                                onPress={event =>
                                    stopAndRun(
                                        event,
                                        () => onCategoryPress(category),
                                        isPressAllowed,
                                    )
                                }
                                style={styles.categoryChip}>
                                <HarborCategoryIcon
                                    category={category}
                                    color={theme.themeColor}
                                    size={scale(12)}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.categoryText,
                                        { color: theme.themeColor },
                                    ]}>
                                    {category.name}
                                </Text>
                            </ScalePressable>
                        </>
                    ) : null}
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
                ) : null}
            </View>
            {isNewTopic && !isNewReply ? (
                <View
                    accessible
                    accessibilityLabel={t('新話題')}
                    style={[
                        styles.newTopicDot,
                        { backgroundColor: theme.unread },
                    ]}
                />
            ) : null}

            <View style={[styles.preview, isRowLayout && styles.previewRow]}>
                <View style={isRowLayout && styles.previewText}>
                    <Text
                        numberOfLines={isRowLayout ? 2 : 3}
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
                </View>

                {coverUrl && !coverFailed ? (
                    <View
                        style={[
                            styles.coverWrap,
                            isRowLayout
                                ? styles.thumbnail
                                : { width: coverWidth, height: coverHeight },
                            { backgroundColor: theme.tonal.primary08 },
                        ]}>
                        <Image
                            source={{ uri: coverUrl }}
                            style={styles.coverImage}
                            contentFit="cover"
                            placeholder={theme.imagePlaceholder}
                            placeholderContentFit="cover"
                            transition={180}
                            recyclingKey={coverUrl}
                            onLoad={isRowLayout ? undefined : event => {
                                const width = Number(event?.source?.width);
                                const height = Number(event?.source?.height);
                                if (width > 0 && height > 0) {
                                    setIsLandscape(width > height);
                                }
                            }}
                            onError={() => setCoverFailed(true)}
                        />
                    </View>
                ) : null}
            </View>

            {statuses.length > 0 ? (
                <View style={styles.statusRow}>
                    {statuses.map(status => (
                        <StatusChip key={status} status={status} />
                    ))}
                </View>
            ) : null}

            <View style={[styles.footer, isRowLayout && styles.rowFooter]}>
                <View style={styles.metrics}>
                    <Metric
                        icon="message-circle"
                        value={replyCount}
                        color={theme.black.third}
                    />
                    <Metric
                        icon="eye"
                        value={topic.viewCount || 0}
                        color={theme.black.third}
                    />
                    <Metric
                        icon="heart"
                        weight={topic.liked ? 'fill' : 'regular'}
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
                ) : null}
            </View>
        </ScalePressable>
    );
};

const styles = StyleSheet.create({
    card: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(12),
        marginHorizontal: CARD_MARGIN_HORIZONTAL,
        marginBottom: verticalScale(2),
        paddingHorizontal: CARD_PADDING_HORIZONTAL,
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
        marginLeft: scale(6),
        flexDirection: 'row',
        alignItems: 'center',
    },
    authorName: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(11),
        fontWeight: '600',
    },
    metaSeparator: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginHorizontal: scale(4),
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
        position: 'absolute',
        top: verticalScale(8),
        right: scale(8),
        width: scale(8),
        height: scale(8),
        borderRadius: scale(4),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        lineHeight: scale(19),
        fontWeight: '600',
    },
    excerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: scale(17),
        marginTop: verticalScale(3),
    },
    preview: {
        marginTop: verticalScale(6),
    },
    previewRow: {
        flexDirection: 'row',
        gap: scale(12),
    },
    previewText: {
        flex: 1,
        minWidth: 0,
    },
    coverWrap: {
        alignSelf: 'flex-start',
        marginTop: verticalScale(8),
        borderRadius: scale(8),
        overflow: 'hidden',
    },
    thumbnail: {
        width: scale(56),
        height: scale(56),
        marginTop: 0,
    },
    coverImage: {
        width: '100%',
        height: '100%',
    },
    categoryChip: {
        flexShrink: 1,
        maxWidth: scale(150),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    categoryText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
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
        paddingBottom: verticalScale(10),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: verticalScale(6),
    },
    rowFooter: {
        paddingBottom: 0,
        flexWrap: 'wrap',
        rowGap: verticalScale(4),
    },
    metrics: {
        flexShrink: 1,
        minWidth: 0,
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
