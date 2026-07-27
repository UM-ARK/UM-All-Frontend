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
import HarborPostContent from './HarborPostContent';
import HarborPostEventCard from './HarborPostEventCard';
import {
    getLikeAction,
    getReactionCount,
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
        contentWidth,
        imageUrls,
        onOpenImage,
        onPressAuthor,
        onPressBookmark,
        onPressComposeReply,
        onPressCopy,
        onPressDisabledReaction,
        onPressEdit,
        onPressLike,
        onPressLink,
        onPressQuote,
        onPressReply,
        onPressShare,
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
        pendingLike,
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
        const likeAction = getLikeAction(post);
        const isLiked = Boolean(likeAction?.acted);
        const currentReaction = post?.current_user_reaction?.id;
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
            pendingBookmark,
            post.bookmarked,
            post.can_edit,
            t,
        ]);
        const reactionButton = (
            <View
                style={[
                    styles.postActionButton,
                    styles.reactionMenuButton,
                    reactionDisabled ? styles.disabledAction : null,
                    { backgroundColor: tonal.primary15 },
                ]}>
                {pendingReaction ? (
                    <ActivityIndicator
                        size="small"
                        color={themeColor}
                    />
                ) : currentReaction ? (
                    <HarborReactionIcon
                        name={currentReaction}
                        size={scale(16)}
                    />
                ) : (
                    <MaterialCommunityIcons
                        name="emoticon-outline"
                        size={scale(15)}
                        color={themeColor}
                    />
                )}
                <Text
                    numberOfLines={1}
                    style={[
                        styles.postActionText,
                        { color: themeColor },
                    ]}>
                    {t('回應')}
                </Text>
            </View>
        );
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
                    nestedContainerStyle,
                    { backgroundColor: white, borderColor: themeColorUltraLight },
                ]}>
                <View style={styles.postHeader}>
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
                    <View style={styles.headerMeta}>
                        {post.reply_to_post_number ? (
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    onPressReply(post.reply_to_post_number);
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
                                        postNumber: post.reply_to_post_number,
                                    })}
                                </Text>
                            </Pressable>
                        ) : null}
                        <Text
                            style={[styles.postNumber, { color: black.third }]}>
                            #{post.post_number}
                        </Text>
                    </View>
                </View>

                <View style={styles.postBody}>
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

                <View style={styles.postMetaRow}>
                    <Text
                        style={[styles.postTime, { color: black.third }]}
                        numberOfLines={1}>
                        {formatHarborPostTime(post.created_at, i18n.language)}
                        {wasEdited ? ` · ${t('已編輯')}` : ''}
                    </Text>
                    <View style={styles.postMetaStats}>
                        <MetaItem
                            icon="comment-outline"
                            value={post.reply_count}
                            color={black.third}
                            style={styles.postMetaComment}
                        />
                        {displayedReactions.length > 0 ? (
                            <View style={styles.reactionSummary}>
                                {displayedReactions.map(reaction => (
                                    <View
                                        key={reaction.id}
                                        accessible
                                        accessibilityLabel={`${t(
                                            HARBOR_REACTION_LABEL[
                                                normalizeHarborReactionName(
                                                    reaction.id,
                                                )
                                            ] ||
                                                normalizeHarborReactionName(
                                                    reaction.id,
                                                ).replace(/_/g, ' '),
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
                        ) : null}
                    </View>
                </View>
                {canReply ? (
                    <View style={styles.composerActionRow}>
                        <Pressable
                            onPress={() => {
                                trigger();
                                onPressComposeReply(post);
                            }}
                            style={({ pressed }) => [
                                styles.postActionButton,
                                styles.reactionMenuButton,
                                {
                                    backgroundColor: pressed
                                        ? tonal.primary30
                                        : tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="reply-outline"
                                size={scale(15)}
                                color={themeColor}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.postActionText,
                                    { color: themeColor },
                                ]}>
                                {t('回覆')}
                            </Text>
                        </Pressable>
                    </View>
                ) : null}
                <View style={styles.postActionRow}>
                    {reactionsEnabled && reactionDisabled ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('回應')}
                            onPress={() => {
                                trigger();
                                onPressDisabledReaction(post.id);
                            }}
                            style={styles.reactionMenuView}>
                            {reactionButton}
                        </Pressable>
                    ) : reactionsEnabled ? (
                        <MenuView
                            actions={reactionMenuActions}
                            onOpenMenu={() => trigger()}
                            onPressAction={event => {
                                trigger();
                                onSelectReaction(
                                    post.id,
                                    event.nativeEvent.event,
                                );
                            }}
                            shouldOpenOnLongPress={false}
                            style={styles.reactionMenuView}>
                            {reactionButton}
                        </MenuView>
                    ) : (
                        <Pressable
                            disabled={pendingLike}
                            onPress={() => {
                                trigger();
                                onPressLike(post);
                            }}
                            style={({ pressed }) => [
                                styles.postActionButton,
                                styles.reactionMenuView,
                                {
                                    backgroundColor: pressed
                                        ? tonal.primary30
                                        : tonal.primary15,
                                },
                            ]}>
                            {pendingLike ? (
                                <ActivityIndicator
                                    size="small"
                                    color={themeColor}
                                />
                            ) : (
                                <MaterialCommunityIcons
                                    name={isLiked ? 'heart' : 'heart-outline'}
                                    size={scale(15)}
                                    color={themeColor}
                                />
                            )}
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.postActionText,
                                    { color: themeColor },
                                ]}>
                                {isLiked ? t('取消讚好') : t('讚好')}
                            </Text>
                        </Pressable>
                    )}
                    <MenuView
                        actions={moreMenuActions}
                        onOpenMenu={() => trigger()}
                        onPressAction={event => {
                            trigger();
                            const actionId = event.nativeEvent.event;
                            if (actionId === 'edit') {
                                onPressEdit(post);
                                return;
                            }
                            if (actionId === 'quote') {
                                onPressQuote(post);
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
                        }}
                        shouldOpenOnLongPress={false}
                        style={styles.composerMenuView}>
                        <View
                            style={[
                                styles.postActionButton,
                                styles.reactionMenuButton,
                                { backgroundColor: tonal.primary15 },
                            ]}>
                            <MaterialCommunityIcons
                                name="dots-horizontal"
                                size={scale(16)}
                                color={themeColor}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.postActionText,
                                    { color: themeColor },
                                ]}>
                                {t('更多')}
                            </Text>
                        </View>
                    </MenuView>
                </View>
                {nestedRepliesButton}
            </View>
        );
    },
);


export { MetaItem };
export default HarborPostCard;
