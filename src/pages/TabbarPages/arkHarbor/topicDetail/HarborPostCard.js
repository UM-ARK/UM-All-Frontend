import React, {
    memo,
    useMemo,
} from 'react';
import {
    ActivityIndicator,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { MenuView } from '@react-native-menu/menu';
import { Image } from 'expo-image';
import moment from 'moment-timezone';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../../components/ThemeContext';
import { parseHarborPostEvent } from '../../../../utils/harbor/harborPostEvent';
import {
    ARK_HARBOR_AVATAR_TEMPLATE,
    ARK_HARBOR_EMOJI_URL,
    ARK_HARBOR_TOPIC_URL,
} from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import HarborCategoryIcon from '../components/HarborCategoryIcon';
import HarborPostContent from './HarborPostContent';
import HarborPostEventCard from './HarborPostEventCard';
import {
    getLikeAction,
    getNotificationLevelLabel,
    getTagLabel,
    NESTED_REPLY_BATCH_SIZE,
} from './harborTopicModels';
import styles from './styles';

const AVATAR_SIZE = 60;
// 24 小時內顯示相對時間（分鐘／小時前）
const RECENT_POST_HOURS = 24;

const formatHarborPostTime = (iso, language) => {
    if (!iso) {
        return '';
    }
    const created = moment.tz(iso, 'Asia/Macau');
    if (!created.isValid()) {
        return '';
    }
    const now = moment.tz('Asia/Macau');
    const diffMinutes = now.diff(created, 'minutes');
    if (diffMinutes >= 0 && diffMinutes < RECENT_POST_HOURS * 60) {
        if (diffMinutes < 1) {
            return language === 'en' ? 'just now' : '剛剛';
        }
        if (diffMinutes < 60) {
            return language === 'en'
                ? `${diffMinutes}m ago`
                : `${diffMinutes} 分鐘前`;
        }
        const hours = Math.max(1, Math.floor(diffMinutes / 60));
        return language === 'en'
            ? `${hours}h ago`
            : `${hours} 小時前`;
    }
    return created.format('YYYY/MM/DD HH:mm');
};
// 常見 Discourse reaction shortcode → Unicode，優先於遠端圖片以提升清晰度
const HARBOR_REACTION_UNICODE = Object.freeze({
    heart: '❤️',
    '+1': '👍',
    '-1': '👎',
    laughing: '😆',
    open_mouth: '😮',
    clap: '👏',
    confetti_ball: '🎊',
    hugs: '🤗',
    smile: '😄',
    tada: '🎉',
    pray: '🙏',
    eyes: '👀',
    rocket: '🚀',
    heart_eyes: '😍',
    slightly_smiling_face: '🙂',
});
const HARBOR_REACTION_LABEL = Object.freeze({
    heart: '愛心',
    '+1': '讚同',
    '-1': '不讚同',
    laughing: '好笑',
    open_mouth: '驚訝',
    clap: '拍手',
    confetti_ball: '慶祝',
    hugs: '擁抱',
    smile: '微笑',
    tada: '太棒了',
    pray: '祈禱',
    eyes: '留意',
    rocket: '火箭',
    heart_eyes: '喜愛',
    slightly_smiling_face: '淡淡微笑',
});
const normalizeHarborReactionName = name => {
    if (!name || typeof name !== 'string') {
        return '';
    }
    return name.replace(/^:|:$/g, '').trim();
};

const HarborReactionIcon = ({ name, size = scale(24), color }) => {
    const reactionName = normalizeHarborReactionName(name);
    const unicode = HARBOR_REACTION_UNICODE[reactionName];
    if (unicode) {
        return (
            <Text
                allowFontScaling={false}
                style={[
                    styles.reactionGlyph,
                    {
                        color: color || undefined,
                        fontSize: size,
                        lineHeight: size * 1.15,
                    },
                ]}>
                {unicode}
            </Text>
        );
    }

    const emojiUrl = ARK_HARBOR_EMOJI_URL(reactionName);
    if (emojiUrl) {
        return (
            <Image
                source={{ uri: emojiUrl }}
                style={{ width: size, height: size }}
                contentFit="contain"
                accessibilityLabel={`:${reactionName}:`}
            />
        );
    }

    if (!reactionName) {
        return null;
    }

    return (
        <Text
            numberOfLines={1}
            style={[
                styles.reactionFallbackText,
                { color: color || undefined, fontSize: size * 0.45 },
            ]}>
            :{reactionName}:
        </Text>
    );
};

const MetaItem = ({ icon, value, color, style }) => {
    if (!value) {
        return null;
    }
    return (
        <View style={[styles.metaItem, style]}>
            <MaterialCommunityIcons
                name={icon}
                size={scale(15)}
                color={color}
            />
            <Text style={[styles.metaText, { color }]}>{value}</Text>
        </View>
    );
};

const HarborPostCard = memo(
    ({
        post,
        topic,
        contentWidth,
        imageUrls,
        onOpenImage,
        onPressAuthor,
        onPressBookmark,
        onPressCategory,
        onPressComposeReply,
        onPressCopy,
        onPressDelete,
        onPressDisabledReaction,
        onPressEdit,
        onPressLike,
        onPressLink,
        onPressOpenNotifications,
        onPressOpenOriginal,
        onPressQuote,
        onPressReply,
        onPressShare,
        onPressTag,
        onSelectReaction,
        onToggleNestedReplies,
        canReply,
        nestedDepth,
        nestedRepliesAllVisible,
        nestedRepliesExpanded,
        nestedRepliesLoading,
        nestedReplyCount,
        nestedVisibleReplyCount,
        pendingBookmark,
        pendingDelete,
        pendingLike,
        pendingNotification,
        pendingReaction,
        reactionDisabled,
        reactions,
        reactionsEnabled,
    }) => {
        const { theme } = useTheme();
        const { t, i18n } = useTranslation('harbor');
        const {
            black,
            themeColor,
            themeColorUltraLight,
            tonal,
            unread,
            white,
        } = theme;
        const nestedIndent = Math.min(
            Math.max(Number(nestedDepth || 0), 0),
            3,
        ) * scale(14);
        const nestedContainerStyle =
            nestedIndent > 0
                ? {
                    borderColor: themeColorUltraLight,
                    borderLeftWidth: StyleSheet.hairlineWidth,
                    marginLeft: nestedIndent,
                }
                : null;
        const nestedReplyBatchCount = Math.min(
            NESTED_REPLY_BATCH_SIZE,
            Math.max(
                Number(nestedReplyCount || 0) -
                    Number(nestedVisibleReplyCount || 0),
                0,
            ),
        );
        const likeAction = getLikeAction(post);
        const isLiked = Boolean(likeAction?.acted);
        const currentReaction = post?.current_user_reaction?.id;
        // 1 樓操作改由頁面底部欄承接，卡片僅保留「更多」；標題併入本卡
        const isFirstPost = Number(post.post_number) === 1;
        const topicTags = useMemo(() => {
            if (!isFirstPost || !topic) {
                return [];
            }
            return Array.isArray(topic.tags)
                ? topic.tags.map(getTagLabel).filter(Boolean)
                : [];
        }, [isFirstPost, topic]);
        const topicCategoryId = Number(topic?.category_id);
        const topicCategorySlug =
            topic?.category_slug || topic?.category?.slug;
        const topicCategoryName =
            topic?.category_name || topic?.category?.name;
        const hasTopicTags =
            isFirstPost &&
            ((Number.isInteger(topicCategoryId) && topicCategoryId > 0) ||
                topicTags.length > 0);
        const postEvent = useMemo(() => parseHarborPostEvent(post), [post]);
        const postUrl = ARK_HARBOR_TOPIC_URL(
            post.topic_id,
            post.post_number,
        );
        const avatarUrl = ARK_HARBOR_AVATAR_TEMPLATE(
            post.avatar_template,
            AVATAR_SIZE,
        );
        const displayName = post.name || post.display_username || post.username;
        const wasEdited =
            post.updated_at &&
            post.created_at &&
            moment(post.updated_at).diff(moment(post.created_at), 'seconds') >
            60;
        const isDeleted = Boolean(post.deleted_at || post.user_deleted);
        const isHidden = Boolean(post.hidden);
        const isNotice = Boolean(
            post.action_code ||
            post.small_action ||
            post.post_type === 3,
        );
        const reactionMenuActions = useMemo(() => {
            return reactions.map(reaction => {
                const reactionName = normalizeHarborReactionName(reaction);
                const unicode = HARBOR_REACTION_UNICODE[reactionName];
                const label = t(
                    HARBOR_REACTION_LABEL[reactionName] ||
                        reactionName.replace(/_/g, ' '),
                );
                return {
                    id: reaction,
                    title: unicode
                        ? `${unicode}  ${label}`
                        : label,
                    state:
                        currentReaction === reaction
                            ? 'on'
                            : 'off',
                    attributes: {
                        disabled: Boolean(pendingLike || pendingReaction),
                    },
                };
            });
        }, [currentReaction, pendingLike, pendingReaction, reactions, t]);
        const moreMenuActions = useMemo(() => {
            // @react-native-menu/menu：iOS 用 SF Symbol；Android 用系統 drawable 名稱
            const actions = [];
            if (isFirstPost) {
                actions.push({
                    id: 'openOriginal',
                    title: t('查看 Web 原文'),
                    image: Platform.select({
                        ios: 'safari',
                        android: 'ic_menu_view',
                    }),
                    imageColor: black.third,
                    titleColor: black.third,
                });
                actions.push({
                    id: 'notifications',
                    title: t(
                        getNotificationLevelLabel(
                            topic?.details?.notification_level,
                        ),
                    ),
                    image: Platform.select({
                        ios: 'bell',
                        android: 'ic_menu_info_details',
                    }),
                    imageColor: black.third,
                    titleColor: black.third,
                    attributes: {
                        disabled: Boolean(pendingNotification),
                    },
                });
            }
            if (canReply) {
                actions.push({
                    id: 'quote',
                    title: t('引用'),
                    image: Platform.select({
                        ios: 'quote.bubble',
                        android: 'ic_menu_revert',
                    }),
                    imageColor: black.third,
                    titleColor: black.third,
                });
            }
            if (post.can_edit) {
                actions.push({
                    id: 'edit',
                    title: t('編輯'),
                    image: Platform.select({
                        ios: 'pencil',
                        android: 'ic_menu_edit',
                    }),
                    imageColor: black.third,
                    titleColor: black.third,
                });
            }
            if (post.can_delete) {
                actions.push({
                    id: 'delete',
                    title: t('刪除'),
                    image: Platform.select({
                        ios: 'trash',
                        android: 'ic_menu_delete',
                    }),
                    imageColor: unread,
                    titleColor: unread,
                    attributes: {
                        destructive: true,
                        disabled: Boolean(pendingDelete),
                    },
                });
            }
            // 1 樓收藏改由底部欄操作，避免選單重複
            if (!isFirstPost) {
                actions.push({
                    id: 'bookmark',
                    title: post.bookmarked ? t('已收藏') : t('收藏'),
                    image: Platform.select({
                        ios: post.bookmarked ? 'bookmark.fill' : 'bookmark',
                        android: 'ic_menu_save',
                    }),
                    imageColor: black.third,
                    titleColor: black.third,
                    attributes: {
                        disabled: Boolean(pendingBookmark),
                    },
                });
            }
            actions.push({
                id: 'copy',
                title: t('複製連結'),
                image: Platform.select({
                    ios: 'link',
                    android: 'ic_menu_agenda',
                }),
                imageColor: black.third,
                titleColor: black.third,
            });
            actions.push({
                id: 'share',
                title: t('分享'),
                image: Platform.select({
                    ios: 'square.and.arrow.up',
                    android: 'ic_menu_share',
                }),
                imageColor: black.third,
                titleColor: black.third,
            });
            return actions;
        }, [
            black.third,
            canReply,
            isFirstPost,
            pendingBookmark,
            pendingDelete,
            pendingNotification,
            post.bookmarked,
            post.can_delete,
            post.can_edit,
            t,
            topic?.details?.notification_level,
            unread,
        ]);
        const nestedRepliesButton =
            nestedReplyCount > 0 ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{
                        expanded: nestedRepliesExpanded,
                    }}
                    disabled={nestedRepliesLoading}
                    onPress={() => {
                        trigger();
                        onToggleNestedReplies(post);
                    }}
                    style={({ pressed }) => [
                        styles.nestedRepliesButton,
                        pressed ? styles.pressedLink : null,
                    ]}>
                    {nestedRepliesLoading ? (
                        <ActivityIndicator
                            size="small"
                            color={themeColor}
                        />
                    ) : (
                        <MaterialCommunityIcons
                            name={
                                nestedRepliesAllVisible
                                    ? 'minus'
                                    : 'plus'
                            }
                            size={scale(14)}
                            color={themeColor}
                        />
                    )}
                    <Text
                        style={[
                            styles.nestedRepliesText,
                            { color: themeColor },
                        ]}>
                        {nestedRepliesAllVisible
                            ? t('收合回覆')
                            : nestedRepliesExpanded
                                ? t('再展開 {{count}} 則回覆', {
                                    count: nestedReplyBatchCount,
                                })
                                : t('展開 {{count}} 則回覆', {
                                    count: nestedReplyBatchCount,
                                })}
                    </Text>
                </Pressable>
            ) : null;

        const handleMoreMenuAction = event => {
            trigger();
            const actionId = event.nativeEvent.event;
            if (actionId === 'openOriginal') {
                onPressOpenOriginal?.();
                return;
            }
            if (actionId === 'notifications') {
                onPressOpenNotifications?.();
                return;
            }
            if (actionId === 'edit') {
                onPressEdit(post);
                return;
            }
            if (actionId === 'quote') {
                onPressQuote(post);
                return;
            }
            if (actionId === 'delete') {
                onPressDelete(post);
                return;
            }
            if (actionId === 'bookmark') {
                onPressBookmark(post);
                return;
            }
            if (actionId === 'copy') {
                onPressCopy(post);
                return;
            }
            if (actionId === 'share') {
                onPressShare(post);
            }
        };

        const moreMenu = (
            <MenuView
                actions={moreMenuActions}
                onOpenMenu={() => trigger()}
                onPressAction={handleMoreMenuAction}
                shouldOpenOnLongPress={false}
                style={
                    isFirstPost
                        ? { flexShrink: 0 }
                        : styles.postMetaIconMenu
                }>
                <View
                    style={[
                        styles.postMetaIconButton,
                        isFirstPost
                            ? {
                                width: undefined,
                                height: undefined,
                                minHeight: scale(26),
                                flexDirection: 'row',
                                backgroundColor: tonal.primary15,
                                borderRadius: scale(7),
                                paddingHorizontal: scale(8),
                            }
                            : null,
                    ]}>
                    <MaterialCommunityIcons
                        name={
                            isFirstPost
                                ? 'dots-horizontal'
                                : 'dots-vertical'
                        }
                        size={scale(isFirstPost ? 14 : 16)}
                        color={isFirstPost ? themeColor : black.third}
                    />
                    {isFirstPost ? (
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.postActionText,
                                { color: themeColor },
                            ]}>
                            {t('更多')}
                        </Text>
                    ) : null}
                </View>
            </MenuView>
        );

        // 右側操作圖示統一尺寸，搭配固定按鈕框對齊
        const metaIconSize = scale(16);
        const reactionIcon = pendingReaction || pendingLike ? (
            <ActivityIndicator size="small" color={themeColor} />
        ) : reactionsEnabled && currentReaction ? (
            <HarborReactionIcon name={currentReaction} size={metaIconSize} />
        ) : reactionsEnabled ? (
            <MaterialCommunityIcons
                name="emoticon-outline"
                size={metaIconSize}
                color={black.third}
            />
        ) : (
            <MaterialCommunityIcons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={metaIconSize}
                color={isLiked ? themeColor : black.third}
            />
        );

        const reactionControl =
            reactionsEnabled && reactionDisabled ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('回應')}
                    hitSlop={8}
                    onPress={() => {
                        trigger();
                        onPressDisabledReaction(post.id);
                    }}
                    style={[
                        styles.postMetaIconButton,
                        reactionDisabled ? styles.disabledAction : null,
                    ]}>
                    {reactionIcon}
                </Pressable>
            ) : reactionsEnabled ? (
                <MenuView
                    actions={reactionMenuActions}
                    onOpenMenu={() => trigger()}
                    onPressAction={event => {
                        trigger();
                        onSelectReaction(post.id, event.nativeEvent.event);
                    }}
                    shouldOpenOnLongPress={false}
                    style={styles.postMetaIconMenu}>
                    <View style={styles.postMetaIconButton}>
                        {reactionIcon}
                    </View>
                </MenuView>
            ) : (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                        isLiked ? t('取消讚好') : t('讚好')
                    }
                    disabled={pendingLike}
                    hitSlop={8}
                    onPress={() => {
                        trigger();
                        onPressLike(post);
                    }}
                    style={styles.postMetaIconButton}>
                    {reactionIcon}
                </Pressable>
            );

        const replyControl = canReply ? (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('回覆')}
                hitSlop={8}
                onPress={() => {
                    trigger();
                    onPressComposeReply(post);
                }}
                style={styles.postMetaIconButton}>
                <MaterialCommunityIcons
                    name="comment-outline"
                    size={metaIconSize}
                    color={black.third}
                />
            </Pressable>
        ) : null;

        if (isDeleted || isHidden) {
            return (
                <View style={nestedContainerStyle}>
                    <View
                        style={[
                            styles.postStateCard,
                            {
                                backgroundColor: tonal.primary08,
                                borderColor: themeColorUltraLight,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name={
                                isHidden
                                    ? 'eye-off-outline'
                                    : 'delete-outline'
                            }
                            size={scale(18)}
                            color={black.third}
                        />
                        <Text
                            style={[
                                styles.postStateText,
                                { color: black.third },
                            ]}>
                            {isHidden
                                ? t('此帖子已被隱藏')
                                : t('此帖子已被刪除')}
                        </Text>
                        <Text
                            style={[
                                styles.postStateNumber,
                                { color: black.third },
                            ]}>
                            #{post.post_number}
                        </Text>
                    </View>
                    {nestedRepliesButton}
                </View>
            );
        }

        if (isNotice) {
            return (
                <View
                    style={[
                        styles.postStateCard,
                        {
                            backgroundColor: tonal.primary08,
                            borderColor: themeColorUltraLight,
                        },
                    ]}>
                    <MaterialCommunityIcons
                        name="information-outline"
                        size={scale(18)}
                        color={themeColor}
                    />
                    <View style={styles.noticeContent}>
                        <Text
                            style={[
                                styles.noticeTitle,
                                { color: themeColor },
                            ]}>
                            {t('系統提示')}
                            {post.action_code ? ` · ${post.action_code}` : ''}
                        </Text>
                        {typeof post.cooked === 'string' &&
                            post.cooked.trim().length > 0 ? (
                            <HarborPostContent
                                cooked={post.cooked}
                                contentWidth={contentWidth - scale(38)}
                                imageUrls={imageUrls}
                                onOpenImage={onOpenImage}
                                onPressLink={onPressLink}
                                postUrl={postUrl}
                                forceInteractiveFallback={Boolean(postEvent)}>
                                {postEvent ? (
                                    <HarborPostEventCard
                                        event={postEvent}
                                        postUrl={postUrl}
                                    />
                                ) : null}
                            </HarborPostContent>
                        ) : postEvent ? (
                            <HarborPostEventCard
                                event={postEvent}
                                postUrl={postUrl}
                            />
                        ) : null}
                    </View>
                    <Text
                        style={[styles.postStateNumber, { color: black.third }]}>
                        #{post.post_number}
                    </Text>
                </View>
            );
        }

        return (
            <View
                style={[
                    styles.postCard,
                    isFirstPost ? styles.firstPostCard : null,
                    nestedContainerStyle,
                    { backgroundColor: white, borderColor: themeColorUltraLight },
                ]}>
                {isFirstPost ? (
                    <>
                        <View style={styles.firstPostHeader}>
                            <Pressable
                                accessibilityRole="link"
                                accessibilityLabel={displayName}
                                onPress={() => {
                                    trigger();
                                    onPressAuthor(post.username);
                                }}
                                style={({ pressed }) => [
                                    styles.authorLink,
                                    pressed ? styles.pressedLink : null,
                                ]}>
                                <Image
                                    source={{ uri: avatarUrl }}
                                    style={[
                                        styles.avatar,
                                        { backgroundColor: tonal.primary15 },
                                    ]}
                                    contentFit="cover"
                                    placeholder={theme.imagePlaceholder}
                                    placeholderContentFit="cover"
                                    transition={200}
                                />
                                <View style={styles.authorArea}>
                                    <View style={styles.authorNameRow}>
                                        <Text
                                            style={[
                                                styles.authorName,
                                                { color: black.third },
                                            ]}
                                            numberOfLines={1}>
                                            {displayName}
                                        </Text>
                                        {post.user_title ? (
                                            <Text
                                                style={[
                                                    styles.userTitle,
                                                    { color: themeColor },
                                                ]}
                                                numberOfLines={1}>
                                                {post.user_title}
                                            </Text>
                                        ) : null}
                                        {post.staff ? (
                                            <Text
                                                style={[
                                                    styles.staffBadge,
                                                    {
                                                        color: themeColor,
                                                        backgroundColor:
                                                            tonal.primary15,
                                                    },
                                                ]}>
                                                Staff
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                            </Pressable>
                            <Text
                                selectable
                                style={[
                                    styles.firstPostTitle,
                                    { color: black.main },
                                ]}>
                                {topic?.title || ''}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.postBody,
                                styles.firstPostBody,
                            ]}>
                            <HarborPostContent
                                cooked={post.cooked}
                                contentWidth={contentWidth}
                                imageUrls={imageUrls}
                                onOpenImage={onOpenImage}
                                onPressLink={onPressLink}
                                postUrl={postUrl}
                                forceInteractiveFallback={Boolean(postEvent)}>
                                {postEvent ? (
                                    <HarborPostEventCard
                                        event={postEvent}
                                        postUrl={postUrl}
                                    />
                                ) : null}
                            </HarborPostContent>
                        </View>

                        {hasTopicTags ? (
                            <View
                                style={[
                                    styles.plainTagRow,
                                    styles.firstPostPlainTagRow,
                                ]}>
                                {Number.isInteger(topicCategoryId) &&
                                topicCategoryId > 0 ? (
                                    <Pressable
                                        accessibilityRole="link"
                                        onPress={() => {
                                            trigger();
                                            onPressCategory?.({
                                                categoryId: topicCategoryId,
                                                categorySlug: topicCategorySlug,
                                                categoryName: topicCategoryName,
                                            });
                                        }}
                                        style={({ pressed }) => [
                                            styles.plainTag,
                                            pressed ? styles.pressedLink : null,
                                        ]}>
                                        <HarborCategoryIcon
                                            category={
                                                topic.category || {
                                                    id: topicCategoryId,
                                                    name: topicCategoryName,
                                                    slug: topicCategorySlug,
                                                }
                                            }
                                            color={themeColor}
                                            size={scale(12)}
                                        />
                                        <Text
                                            style={[
                                                styles.plainTagText,
                                                { color: themeColor },
                                            ]}>
                                            {topicCategoryName ||
                                                `分類 #${topicCategoryId}`}
                                        </Text>
                                    </Pressable>
                                ) : null}
                                {topicTags.map(tag => (
                                    <Pressable
                                        key={tag}
                                        accessibilityRole="link"
                                        onPress={() => {
                                            trigger();
                                            onPressTag?.(tag);
                                        }}
                                        style={({ pressed }) => [
                                            styles.plainTag,
                                            pressed ? styles.pressedLink : null,
                                        ]}>
                                        <Text
                                            style={[
                                                styles.plainTagText,
                                                { color: themeColor },
                                            ]}>
                                            #{tag}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        ) : null}

                        <View
                            style={[
                                styles.postMetaRow,
                                styles.firstPostMetaRow,
                            ]}>
                            <Text
                                style={[styles.postTime, { color: black.third }]}
                                numberOfLines={1}>
                                {formatHarborPostTime(
                                    post.created_at,
                                    i18n.language,
                                )}
                                {wasEdited ? ` · ${t('已編輯')}` : ''}
                            </Text>
                            {moreMenu}
                        </View>
                        {nestedRepliesButton}
                    </>
                ) : (
                    <View style={styles.replyLayout}>
                        <Pressable
                            accessibilityRole="link"
                            accessibilityLabel={displayName}
                            onPress={() => {
                                trigger();
                                onPressAuthor(post.username);
                            }}
                            style={({ pressed }) => [
                                styles.replyAvatarPressable,
                                pressed ? styles.pressedLink : null,
                            ]}>
                            <Image
                                source={{ uri: avatarUrl }}
                                style={[
                                    styles.avatar,
                                    { backgroundColor: tonal.primary15 },
                                ]}
                                contentFit="cover"
                                placeholder={theme.imagePlaceholder}
                                placeholderContentFit="cover"
                                transition={200}
                            />
                        </Pressable>
                        <View style={styles.replyMain}>
                            <View style={styles.replyHeader}>
                                <Pressable
                                    accessibilityRole="link"
                                    accessibilityLabel={displayName}
                                    onPress={() => {
                                        trigger();
                                        onPressAuthor(post.username);
                                    }}
                                    style={({ pressed }) => [
                                        styles.replyAuthorPressable,
                                        pressed ? styles.pressedLink : null,
                                    ]}>
                                    <View style={styles.authorNameRow}>
                                        <Text
                                            style={[
                                                styles.authorName,
                                                styles.replyAuthorName,
                                                {
                                                    color: black.third,
                                                    opacity: 0.72,
                                                },
                                            ]}
                                            numberOfLines={1}>
                                            {displayName}
                                        </Text>
                                        {post.user_title ? (
                                            <Text
                                                style={[
                                                    styles.userTitle,
                                                    { color: themeColor },
                                                ]}
                                                numberOfLines={1}>
                                                {post.user_title}
                                            </Text>
                                        ) : null}
                                        {post.staff ? (
                                            <Text
                                                style={[
                                                    styles.staffBadge,
                                                    {
                                                        color: themeColor,
                                                        backgroundColor:
                                                            tonal.primary15,
                                                    },
                                                ]}>
                                                Staff
                                            </Text>
                                        ) : null}
                                    </View>
                                </Pressable>
                                <View style={styles.headerMeta}>
                                    {post.reply_to_post_number ? (
                                        <Pressable
                                            onPress={() => {
                                                trigger();
                                                onPressReply(
                                                    post.reply_to_post_number,
                                                );
                                            }}
                                            style={({ pressed }) => [
                                                styles.replyBadge,
                                                {
                                                    backgroundColor: pressed
                                                        ? tonal.primary30
                                                        : tonal.primary15,
                                                },
                                            ]}>
                                            <MaterialCommunityIcons
                                                name="reply-outline"
                                                size={scale(12)}
                                                color={themeColor}
                                            />
                                            <Text
                                                style={[
                                                    styles.replyText,
                                                    { color: themeColor },
                                                ]}>
                                                {t('回覆樓層', {
                                                    postNumber:
                                                        post.reply_to_post_number,
                                                })}
                                            </Text>
                                        </Pressable>
                                    ) : null}
                                    <Text
                                        style={[
                                            styles.postNumber,
                                            { color: black.third },
                                        ]}>
                                        #{post.post_number}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.replyBody}>
                                <HarborPostContent
                                    cooked={post.cooked}
                                    contentWidth={contentWidth - scale(38)}
                                    imageUrls={imageUrls}
                                    onOpenImage={onOpenImage}
                                    onPressLink={onPressLink}
                                    postUrl={postUrl}
                                    forceInteractiveFallback={Boolean(
                                        postEvent,
                                    )}>
                                    {postEvent ? (
                                        <HarborPostEventCard
                                            event={postEvent}
                                            postUrl={postUrl}
                                        />
                                    ) : null}
                                </HarborPostContent>
                            </View>

                            <View style={styles.postMetaRow}>
                                <Text
                                    style={[
                                        styles.postTime,
                                        { color: black.third },
                                    ]}
                                    numberOfLines={1}>
                                    {formatHarborPostTime(
                                        post.created_at,
                                        i18n.language,
                                    )}
                                    {wasEdited ? ` · ${t('已編輯')}` : ''}
                                </Text>
                                <View style={styles.postMetaActions}>
                                    {reactionControl}
                                    {replyControl}
                                    {moreMenu}
                                </View>
                            </View>
                            {nestedRepliesButton}
                        </View>
                    </View>
                )}
            </View>
        );
    },
);


export { MetaItem };
export default HarborPostCard;
