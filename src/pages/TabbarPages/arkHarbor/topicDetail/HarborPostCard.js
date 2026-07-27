import React, {
    memo,
    useMemo,
} from 'react';
import {
    ActivityIndicator,
    Pressable,
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
import {
    ARK_HARBOR_AVATAR_TEMPLATE,
    ARK_HARBOR_EMOJI_URL,
    ARK_HARBOR_TOPIC_URL,
} from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import HarborPostContent from './HarborPostContent';
import {
    getLikeAction,
    getReactionCount,
} from './harborTopicModels';
import styles from './styles';

const AVATAR_SIZE = 88;
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

const MetaItem = ({ icon, value, color }) => {
    if (!value) {
        return null;
    }
    return (
        <View style={styles.metaItem}>
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
        onPressEdit,
        onPressLike,
        onPressLink,
        onPressQuote,
        onPressReply,
        onPressShare,
        onSelectReaction,
        canReply,
        pendingBookmark,
        pendingLike,
        pendingReaction,
        reactions,
        reactionsEnabled,
    }) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const {
            black,
            themeColor,
            themeColorUltraLight,
            tonal,
            white,
            viewShadow,
        } = theme;
        const reactionCount = getReactionCount(post);
        const likeAction = getLikeAction(post);
        const isLiked = Boolean(likeAction?.acted);
        const currentReaction = post?.current_user_reaction?.id;
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
        const composerMenuActions = useMemo(() => {
            const actions = [];
            if (canReply) {
                actions.push({
                    id: 'quote',
                    title: t('引用'),
                    image: 'quote.bubble',
                });
            }
            if (post.can_edit) {
                actions.push({
                    id: 'edit',
                    title: t('編輯'),
                    image: 'pencil',
                });
            }
            return actions;
        }, [canReply, post.can_edit, t]);

        if (isDeleted || isHidden) {
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
                        name={isHidden ? 'eye-off-outline' : 'delete-outline'}
                        size={scale(18)}
                        color={black.third}
                    />
                    <Text
                        style={[styles.postStateText, { color: black.third }]}>
                        {isHidden
                            ? t('此帖子已被隱藏')
                            : t('此帖子已被刪除')}
                    </Text>
                    <Text
                        style={[styles.postStateNumber, { color: black.third }]}>
                        #{post.post_number}
                    </Text>
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
                                postUrl={ARK_HARBOR_TOPIC_URL(
                                    post.topic_id,
                                    post.post_number,
                                )}
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
                    { backgroundColor: white, borderColor: themeColorUltraLight },
                    viewShadow,
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
                            <Text
                                style={[styles.authorName, { color: black.main }]}
                                numberOfLines={1}>
                                {displayName}
                            </Text>
                            <View style={styles.authorDetails}>
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
                            <Text
                                style={[styles.postTime, { color: black.third }]}>
                                {moment
                                    .tz(post.created_at, 'Asia/Macau')
                                    .format('YYYY/MM/DD HH:mm')}
                                {wasEdited ? ` · ${t('已編輯')}` : ''}
                            </Text>
                        </View>
                    </Pressable>
                    <Text style={[styles.postNumber, { color: black.third }]}>
                        #{post.post_number}
                    </Text>
                </View>

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
                            size={scale(14)}
                            color={themeColor}
                        />
                        <Text style={[styles.replyText, { color: themeColor }]}>
                            {t('回覆樓層', {
                                postNumber: post.reply_to_post_number,
                            })}
                        </Text>
                    </Pressable>
                ) : null}

                <View style={styles.postBody}>
                    <HarborPostContent
                        cooked={post.cooked}
                        contentWidth={contentWidth}
                        imageUrls={imageUrls}
                        onOpenImage={onOpenImage}
                        onPressLink={onPressLink}
                        postUrl={ARK_HARBOR_TOPIC_URL(
                            post.topic_id,
                            post.post_number,
                        )}
                    />
                </View>

                <View
                    style={[
                        styles.postFooter,
                        { borderTopColor: themeColorUltraLight },
                    ]}>
                    <View style={styles.footerMeta}>
                        <MetaItem
                            icon="eye-outline"
                            value={post.reads}
                            color={black.third}
                        />
                        <MetaItem
                            icon="comment-outline"
                            value={post.reply_count}
                            color={black.third}
                        />
                    </View>
                    <MetaItem
                        icon={currentReaction || isLiked ? 'heart' : 'heart-outline'}
                        value={reactionCount}
                        color={themeColor}
                    />
                </View>
                {canReply || post.can_edit ? (
                    <View style={styles.composerActionRow}>
                        {canReply ? (
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    onPressComposeReply(post);
                                }}
                                style={({ pressed }) => [
                                    styles.postActionButton,
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
                        ) : null}
                        {composerMenuActions.length > 0 ? (
                            <MenuView
                                actions={composerMenuActions}
                                onOpenMenu={() => trigger()}
                                onPressAction={event => {
                                    trigger();
                                    if (event.nativeEvent.event === 'edit') {
                                        onPressEdit(post);
                                        return;
                                    }
                                    onPressQuote(post);
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
                        ) : null}
                    </View>
                ) : null}
                <View style={styles.postActionRow}>
                    {reactionsEnabled ? (
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
                            <View
                                style={[
                                    styles.postActionButton,
                                    styles.reactionMenuButton,
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
                    <Pressable
                        disabled={pendingBookmark}
                        onPress={() => {
                            trigger();
                            onPressBookmark(post);
                        }}
                        style={({ pressed }) => [
                            styles.postActionButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        {pendingBookmark ? (
                            <ActivityIndicator size="small" color={themeColor} />
                        ) : (
                            <MaterialCommunityIcons
                                name={
                                    post.bookmarked
                                        ? 'bookmark'
                                        : 'bookmark-outline'
                                }
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
                            {post.bookmarked ? t('已收藏') : t('收藏')}
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            trigger();
                            onPressCopy(post);
                        }}
                        style={({ pressed }) => [
                            styles.postIconButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="link-variant"
                            size={scale(16)}
                            color={themeColor}
                        />
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            trigger();
                            onPressShare(post);
                        }}
                        style={({ pressed }) => [
                            styles.postIconButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="share-variant-outline"
                            size={scale(16)}
                            color={themeColor}
                        />
                    </Pressable>
                </View>
            </View>
        );
    },
);


export { MetaItem };
export default HarborPostCard;
