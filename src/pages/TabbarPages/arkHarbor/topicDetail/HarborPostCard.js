import React, {
    memo,
    useMemo,
    useRef,
} from 'react';
import {
    ActivityIndicator,
    Pressable,
    View,
} from 'react-native';

import { Image } from 'expo-image';
import moment from 'moment-timezone';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../../components/AppText';
import { useTheme } from '../../../../components/ThemeContext';
import { parseHarborPostEvent } from '../../../../utils/harbor/harborPostEvent';
import {
    ARK_HARBOR_AVATAR_TEMPLATE,
    ARK_HARBOR_TOPIC_URL,
} from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import HarborCategoryIcon from '../components/HarborCategoryIcon';
import HarborPostContent from './HarborPostContent';
import HarborPostEventCard from './HarborPostEventCard';
import HarborReactionControl, {
    getHarborReactionLabel,
    HarborReactionIcon,
} from './HarborReactionControl';
import {
    canDeleteHarborPost,
    getHarborTopicStatuses,
    getLikeAction,
    getReactionCount,
    getTagLabel,
    isHarborPostDeleted,
    NESTED_REPLY_BATCH_SIZE,
} from './harborTopicModels';
import styles from './styles';

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

const logHarborPostCardAction = (event, details) => {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
        return;
    }
    console.warn(`[HarborPostAction] ${event}`, details);
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
        onOpenMoreMenu,
        onPressAuthor,
        onPressBookmark,
        onPressCategory,
        onPressComposeReply,
        onPressCopyContent,
        onPressCopy,
        onPressDelete,
        onPressDisabledReaction,
        onPressEdit,
        onPressFlag,
        onPressLike,
        onPressLink,
        onPressOpenNotifications,
        onPressOpenOriginal,
        onPostBodyLayout,
        onTogglePost,
        onPressReply,
        onPressShare,
        onPressTag,
        onSelectReaction,
        onToggleNestedReplies,
        canReply,
        canShowFlag,
        nestedDepth,
        nestedRepliesAllVisible,
        nestedRepliesExpanded,
        nestedRepliesLoading,
        nestedReplyCount,
        nestedReplyPreviewCount = 0,
        nestedVisibleReplyCount,
        pendingBookmark,
        pendingDelete,
        pendingFlag,
        pendingLike,
        pendingNotification,
        pendingReaction,
        reactionDisabled,
        reactions,
        reactionsEnabled,
        isPostCollapsed,
        isPostLong,
    }) => {
        const { theme } = useTheme();
        const { t, i18n } = useTranslation('harbor');
        const contentLongPressRef = useRef(false);
        const {
            black,
            bg_color,
            disabled,
            themeColor,
            tonal,
            trueWhite,
            white,
        } = theme;
        // 分割線／邊框統一用淺灰
        const dividerColor = disabled;
        // 展開回覆一律對齊頂層時間列，不再依深度往裡縮
        const isNestedReply = Number(nestedDepth || 0) > 0;
        const nestedContainerStyle = isNestedReply
            ? styles.nestedReplyCard
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
        // 已獲 reaction／讚摘要（1 樓操作在底部欄，卡片改展示已獲計數）
        const reactionCount = getReactionCount(post);
        const reactionSummary = (
            Array.isArray(post?.reactions) ? post.reactions : []
        ).filter(reaction => reaction?.id && Number(reaction?.count) > 0);
        const displayedReactions =
            reactionSummary.length > 0
                ? reactionSummary
                : !reactionsEnabled && reactionCount > 0
                    ? [{ id: 'heart', count: reactionCount }]
                    : [];
        const reactionCountLabel =
            Number.isFinite(reactionCount) && reactionCount > 0
                ? String(reactionCount)
                : '';
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
        const topicStatuses = useMemo(
            () => (isFirstPost ? getHarborTopicStatuses(topic) : []),
            [isFirstPost, topic],
        );
        const postEvent = useMemo(() => parseHarborPostEvent(post), [post]);
        const postUrl = ARK_HARBOR_TOPIC_URL(
            post.topic_id,
            post.post_number,
        );
        const avatarUrl = ARK_HARBOR_AVATAR_TEMPLATE(post.avatar_template);
        const displayName =
            post.username || post.display_username || t('Harbor 會員');
        const authorAccessibilityLabel = post.staff
            ? `${displayName}, Staff`
            : displayName;
        const staffAvatarBadge = post.staff ? (
            <View
                style={[
                    styles.staffAvatarBadge,
                    isFirstPost
                        ? styles.firstPostStaffAvatarBadge
                        : styles.replyStaffAvatarBadge,
                    {
                        backgroundColor: themeColor,
                        borderColor: white,
                    },
                ]}>
                <Text
                    style={[
                        styles.staffAvatarBadgeText,
                        { color: trueWhite },
                    ]}>
                    S
                </Text>
            </View>
        ) : null;
        const replyTargetUsername =
            post.reply_to_user?.username ||
            post.__harborReplyToUsername;
        const replyTargetLabel =
            replyTargetUsername || `#${post.reply_to_post_number}`;
        const wasEdited =
            post.updated_at &&
            post.created_at &&
            moment(post.updated_at).diff(moment(post.created_at), 'seconds') >
            60;
        const isDeleted = isHarborPostDeleted(post);
        const isHidden = Boolean(post.hidden);
        const isNotice = Boolean(
            post.action_code ||
            post.small_action ||
            post.post_type === 3,
        );
        const moreMenuActions = useMemo(() => {
            const actions = [
                {
                    id: 'copyContent',
                    title: t('複製'),
                    icon: 'content-copy',
                },
            ];
            if (isFirstPost) {
                actions.push({
                    id: 'openOriginal',
                    title: t('查看 Web 原文'),
                    icon: 'web',
                });
                actions.push({
                    id: 'notifications',
                    title: t('通知設定'),
                    icon: 'bell-outline',
                    attributes: {
                        disabled: Boolean(pendingNotification),
                    },
                });
            }
            // 與圖示回覆並存，避免用戶找不到回覆入口
            if (canReply) {
                actions.push({
                    id: 'reply',
                    title: t('回覆'),
                    icon: 'reply-outline',
                });
            }
            if (post.can_edit) {
                actions.push({
                    id: 'edit',
                    title: t('編輯'),
                    icon: 'pencil-outline',
                });
            }
            if (canDeleteHarborPost(post, topic)) {
                actions.push({
                    id: 'delete',
                    title: t('刪除'),
                    icon: 'delete-outline',
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
                    icon: post.bookmarked
                        ? 'bookmark'
                        : 'bookmark-outline',
                    attributes: {
                        disabled: Boolean(pendingBookmark),
                    },
                });
            }
            actions.push({
                id: 'copy',
                title: t('複製連結'),
                icon: 'link-variant',
            });
            if (canShowFlag) {
                actions.push({
                    id: 'flag',
                    title: t('舉報'),
                    icon: 'flag-outline',
                    attributes: {
                        destructive: true,
                        disabled: Boolean(pendingFlag),
                    },
                });
            }
            actions.push({
                id: 'share',
                title: t('分享'),
                icon: 'share-variant-outline',
            });
            return actions;
        }, [
            canReply,
            canShowFlag,
            isFirstPost,
            pendingBookmark,
            pendingDelete,
            pendingFlag,
            pendingNotification,
            post,
            t,
            topic,
        ]);
        const nestedRepliesButton =
            nestedReplyCount > 0 &&
            (nestedReplyCount > nestedReplyPreviewCount ||
                nestedVisibleReplyCount < nestedReplyCount) ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{
                        expanded: nestedRepliesExpanded,
                    }}
                    disabled={nestedRepliesLoading}
                    onLongPress={event => {
                        event?.stopPropagation?.();
                    }}
                    onPress={event => {
                        event?.stopPropagation?.();
                        trigger();
                        onToggleNestedReplies(
                            post.__harborNestedTogglePost || post,
                        );
                    }}
                    onPressIn={event => {
                        event?.stopPropagation?.();
                    }}
                    style={({ pressed }) => [
                        styles.nestedRepliesButton,
                        pressed ? styles.pressedLink : null,
                    ]}>
                    <View
                        style={[
                            styles.nestedRepliesLine,
                            { backgroundColor: dividerColor },
                        ]}
                    />
                    {nestedRepliesLoading ? (
                        <ActivityIndicator
                            size="small"
                            color={black.third}
                            style={styles.nestedRepliesText}
                        />
                    ) : (
                        <Text
                            style={[
                                styles.nestedRepliesText,
                                { color: black.third },
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
                    )}
                    <View
                        style={[
                            styles.nestedRepliesLine,
                            { backgroundColor: dividerColor },
                        ]}
                    />
                </Pressable>
            ) : null;

        const handleMoreMenuAction = actionId => {
            if (actionId === 'openOriginal') {
                onPressOpenOriginal?.();
                return;
            }
            if (actionId === 'notifications') {
                onPressOpenNotifications?.();
                return;
            }
            if (actionId === 'reply') {
                onPressComposeReply?.(post);
                return;
            }
            if (actionId === 'edit') {
                onPressEdit(post);
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
            if (actionId === 'copyContent') {
                onPressCopyContent(post);
                return;
            }
            if (actionId === 'copy') {
                onPressCopy(post);
                return;
            }
            if (actionId === 'share') {
                onPressShare(post);
                return;
            }
            if (actionId === 'flag') {
                onPressFlag?.(post);
            }
        };

        const openMoreMenu = () => {
            trigger();
            onOpenMoreMenu({
                actions: moreMenuActions,
                onPressAction: handleMoreMenuAction,
            });
        };

        const moreMenu = (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('更多')}
                onLongPress={event => {
                    event?.stopPropagation?.();
                }}
                onPress={event => {
                    event?.stopPropagation?.();
                    openMoreMenu();
                }}
                onPressIn={event => {
                    event?.stopPropagation?.();
                }}
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
            </Pressable>
        );

        const reactionSummaryView =
            displayedReactions.length > 0 ? (
                <View style={styles.reactionSummary}>
                    {displayedReactions.map(reaction => (
                        <View
                            key={reaction.id}
                            accessible
                            accessibilityLabel={`${t(
                                getHarborReactionLabel(reaction.id),
                            )} ${reaction.count}`}
                            style={styles.reactionSummaryItem}>
                            <HarborReactionIcon
                                name={reaction.id}
                                size={scale(14)}
                            />
                            <Text
                                style={[
                                    styles.reactionSummaryText,
                                    { color: themeColor },
                                ]}>
                                {reaction.count}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null;

        // 右側操作圖示統一尺寸，搭配固定按鈕框對齊
        const metaIconSize = scale(16);
        const showCurrentReaction =
            reactionsEnabled &&
            currentReaction &&
            currentReaction !== 'heart';
        const reactionIcon = pendingReaction || pendingLike ? (
            <ActivityIndicator size="small" color={themeColor} />
        ) : showCurrentReaction ? (
            <HarborReactionIcon name={currentReaction} size={metaIconSize} />
        ) : reactionsEnabled ? (
            <MaterialCommunityIcons
                name={currentReaction ? 'heart' : 'heart-outline'}
                size={metaIconSize}
                color={currentReaction ? themeColor : black.third}
            />
        ) : (
            <MaterialCommunityIcons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={metaIconSize}
                color={isLiked ? themeColor : black.third}
            />
        );

        const reactionActive = Boolean(currentReaction || isLiked);
        const reactionButtonContent = (
            <View
                style={[
                    styles.postMetaIconButton,
                    reactionCountLabel
                        ? styles.postMetaIconButtonWithCount
                        : null,
                ]}>
                {reactionIcon}
                {reactionCountLabel ? (
                    <Text
                        style={[
                            styles.postMetaCount,
                            {
                                color: reactionActive
                                    ? themeColor
                                    : black.third,
                            },
                        ]}>
                        {reactionCountLabel}
                    </Text>
                ) : null}
            </View>
        );
        const reactionControlStyle = [
            styles.postMetaIconMenu,
            reactionCountLabel ? styles.postMetaIconMenuWithCount : null,
        ];
        const reactionControl = reactionsEnabled ? (
            <HarborReactionControl
                allowPicker={false}
                currentReaction={currentReaction}
                disabled={reactionDisabled}
                hitSlop={8}
                onPressDisabled={() => {
                    logHarborPostCardAction('card.reaction_disabled', {
                        postId: post.id,
                        postNumber: post.post_number,
                        nestedDepth: Number(nestedDepth || 0),
                        reactionDisabled,
                        canAct: likeAction?.can_act ?? null,
                        currentReaction: currentReaction || null,
                    });
                    onPressDisabledReaction(post.id);
                }}
                onSelectReaction={reaction => {
                    logHarborPostCardAction('card.reaction_select', {
                        postId: post.id,
                        postNumber: post.post_number,
                        nestedDepth: Number(nestedDepth || 0),
                        reaction,
                        reactionDisabled,
                        pendingLike: Boolean(pendingLike),
                        pendingReaction: Boolean(pendingReaction),
                    });
                    onSelectReaction(post.id, reaction);
                }}
                pending={Boolean(pendingLike || pendingReaction)}
                reactions={reactions}
                stopPropagation={!isFirstPost}
                style={reactionControlStyle}>
                {reactionButtonContent}
            </HarborReactionControl>
        ) : (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                    isLiked ? t('取消讚好') : t('讚好')
                }
                disabled={pendingLike}
                hitSlop={8}
                onLongPress={event => {
                    event?.stopPropagation?.();
                }}
                onPress={event => {
                    event?.stopPropagation?.();
                    trigger();
                    logHarborPostCardAction('card.like_press', {
                        postId: post.id,
                        postNumber: post.post_number,
                        nestedDepth: Number(nestedDepth || 0),
                        reactionDisabled,
                        isLiked,
                    });
                    if (reactionDisabled) {
                        onPressDisabledReaction(post.id);
                        return;
                    }
                    onPressLike(post);
                }}
                onPressIn={event => {
                    event?.stopPropagation?.();
                }}
                style={reactionControlStyle}>
                {reactionButtonContent}
            </Pressable>
        );

        const openReplyComposer = () => {
            if (!canReply) {
                return;
            }
            trigger();
            onPressComposeReply(post);
        };

        const handleReplyAreaPress = () => {
            if (contentLongPressRef.current) {
                contentLongPressRef.current = false;
                return;
            }
            openReplyComposer();
        };

        const handleReplyAreaLongPress = () => {
            contentLongPressRef.current = true;
            openMoreMenu();
        };

        const handleReplyAreaPressIn = () => {
            contentLongPressRef.current = false;
        };

        const postContentToggle = isPostLong ? (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                    isPostCollapsed ? t('展開正文') : t('收起正文')
                }
                onLongPress={event => {
                    event?.stopPropagation?.();
                }}
                onPress={event => {
                    event?.stopPropagation?.();
                    trigger();
                    onTogglePost?.();
                }}
                onPressIn={event => {
                    event?.stopPropagation?.();
                }}
                style={({ pressed }) => [
                    styles.postContentToggle,
                    pressed ? styles.pressedLink : null,
                ]}>
                <MaterialCommunityIcons
                    name={isPostCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={scale(18)}
                    color={themeColor}
                />
                <Text
                    style={[
                        styles.postContentToggleText,
                        { color: themeColor },
                    ]}>
                    {isPostCollapsed ? t('展開正文') : t('收起正文')}
                </Text>
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
                                borderColor: dividerColor,
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
                                ? t('#{{postNumber}} 帖子已被隱藏', {
                                    postNumber: post.post_number,
                                })
                                : t('#{{postNumber}} 帖子已被刪除', {
                                    postNumber: post.post_number,
                                })}
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
                            borderColor: dividerColor,
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
                    { backgroundColor: white },
                ]}>
                {isFirstPost ? (
                    <>
                        <View style={styles.firstPostHeader}>
                            <Pressable
                                accessibilityRole="link"
                                accessibilityLabel={authorAccessibilityLabel}
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
                                {staffAvatarBadge}
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
                            {topicStatuses.length > 0 ? (
                                <View style={styles.topicStatusRow}>
                                    {topicStatuses.map(status => (
                                        <View
                                            key={status.key}
                                            accessible
                                            accessibilityLabel={t(status.label)}
                                            style={[
                                                styles.topicStatusChip,
                                                {
                                                    backgroundColor:
                                                        tonal.primary15,
                                                },
                                            ]}>
                                            <MaterialCommunityIcons
                                                name={status.icon}
                                                size={scale(12)}
                                                color={themeColor}
                                            />
                                            <Text
                                                style={[
                                                    styles.topicStatusText,
                                                    { color: themeColor },
                                                ]}>
                                                {t(status.label)}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            ) : null}
                        </View>

                        <View
                            style={[
                                styles.postBody,
                                styles.firstPostBody,
                                isPostCollapsed
                                    ? styles.postBodyCollapsed
                                    : null,
                            ]}>
                            <View onLayout={onPostBodyLayout}>
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
                        </View>

                        {postContentToggle}

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
                            <View style={styles.postMetaActions}>
                                {reactionSummaryView}
                                {moreMenu}
                            </View>
                        </View>
                        {nestedRepliesButton}
                        <View
                            style={[
                                styles.firstPostDivider,
                                { backgroundColor: dividerColor },
                            ]}
                        />
                    </>
                ) : (
                    <Pressable
                        accessibilityRole={
                            canReply ? 'button' : undefined
                        }
                        accessibilityLabel={
                            canReply ? t('回覆') : undefined
                        }
                        onLongPress={handleReplyAreaLongPress}
                        onPress={handleReplyAreaPress}
                        onPressIn={handleReplyAreaPressIn}
                        style={({ pressed }) => [
                            styles.replyLayout,
                            styles.replyPressable,
                            pressed
                                ? {
                                      backgroundColor: bg_color,
                                  }
                                : null,
                        ]}>
                        <Pressable
                            accessibilityRole="link"
                            accessibilityLabel={authorAccessibilityLabel}
                            onLongPress={event => {
                                event?.stopPropagation?.();
                            }}
                            onPress={event => {
                                event?.stopPropagation?.();
                                trigger();
                                onPressAuthor(post.username);
                            }}
                            onPressIn={event => {
                                event?.stopPropagation?.();
                            }}
                            style={({ pressed }) => [
                                styles.replyAvatarPressable,
                                pressed ? styles.pressedLink : null,
                            ]}>
                            <Image
                                source={{ uri: avatarUrl }}
                                style={[
                                    isNestedReply
                                        ? styles.nestedAvatar
                                        : styles.avatar,
                                    { backgroundColor: tonal.primary15 },
                                ]}
                                contentFit="cover"
                                placeholder={theme.imagePlaceholder}
                                placeholderContentFit="cover"
                                transition={200}
                            />
                            {staffAvatarBadge}
                        </Pressable>
                        <View style={styles.replyMain}>
                            <View>
                                <View style={styles.replyHeader}>
                                    <View style={styles.replyAuthorArea}>
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
                                        </View>
                                    </View>
                                    {isNestedReply &&
                                    post.reply_to_post_number ? (
                                        <Pressable
                                            accessibilityRole="link"
                                            onLongPress={event => {
                                                event?.stopPropagation?.();
                                            }}
                                            onPress={event => {
                                                event?.stopPropagation?.();
                                                trigger();
                                                onPressReply(
                                                    post.reply_to_post_number,
                                                );
                                            }}
                                            onPressIn={event => {
                                                event?.stopPropagation?.();
                                            }}
                                            style={({ pressed }) => [
                                                styles.replyTarget,
                                                pressed
                                                    ? styles.pressedLink
                                                    : null,
                                            ]}>
                                            <MaterialCommunityIcons
                                                name="reply-outline"
                                                size={scale(12)}
                                                color={themeColor}
                                            />
                                            <Text
                                                style={[
                                                    styles.replyTargetText,
                                                    { color: themeColor },
                                                ]}
                                                numberOfLines={1}>
                                                {replyTargetLabel}
                                            </Text>
                                        </Pressable>
                                    ) : null}
                                </View>

                                <View
                                    style={[
                                        styles.replyBody,
                                        isPostCollapsed
                                            ? styles.postBodyCollapsed
                                            : null,
                                    ]}>
                                    <View onLayout={onPostBodyLayout}>
                                        <HarborPostContent
                                            cooked={post.cooked}
                                            contentWidth={
                                                contentWidth -
                                                (isNestedReply
                                                    ? scale(28)
                                                    : scale(38))
                                            }
                                            imageUrls={imageUrls}
                                            onOpenImage={onOpenImage}
                                            onPressLink={onPressLink}
                                            postUrl={postUrl}
                                            compact
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
                                </View>

                                {postContentToggle}

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
                                        {wasEdited
                                            ? ` · ${t('已編輯')}`
                                            : ''}
                                        {` · #${post.post_number}`}
                                    </Text>
                                    <View style={styles.postMetaActions}>
                                        {reactionControl}
                                        {/* 長按回覆卡片可開啟同一操作 Sheet，暫不顯示更多按鈕。 */}
                                    </View>
                                </View>
                            </View>
                            {nestedRepliesButton}
                        </View>
                    </Pressable>
                )}
            </View>
        );
    },
);


export { MetaItem };
export default HarborPostCard;
