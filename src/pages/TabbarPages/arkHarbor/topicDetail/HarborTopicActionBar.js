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
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import styles from './styles';

// 常見 Discourse reaction shortcode → Unicode（底部選單用）
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

const formatCount = value => {
    const count = Number(value || 0);
    if (!Number.isFinite(count) || count <= 0) {
        return '';
    }
    if (count >= 10000) {
        return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}萬`;
    }
    if (count >= 1000) {
        return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return String(count);
};

const HarborTopicActionBar = memo(
    ({
        bookmarkPending,
        bookmarked,
        canReply,
        commentCount,
        currentReaction,
        likeCount,
        liked,
        onJumpToComments,
        onLayoutHeight,
        onPressBookmark,
        onPressCompose,
        onPressDisabledReaction,
        onPressLike,
        onSelectReaction,
        reactionDisabled,
        reactionPending,
        reactions,
        reactionsEnabled,
    }) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const insets = useSafeAreaInsets();
        const {
            black,
            bg_color,
            disabled,
            themeColor,
            white,
        } = theme;

        const reactionMenuActions = useMemo(() => {
            return (reactions || []).map(reaction => {
                const reactionName = normalizeHarborReactionName(reaction);
                const unicode = HARBOR_REACTION_UNICODE[reactionName];
                const label = t(
                    HARBOR_REACTION_LABEL[reactionName] ||
                        reactionName.replace(/_/g, ' '),
                );
                return {
                    id: reaction,
                    title: unicode ? `${unicode}  ${label}` : label,
                    state: currentReaction === reaction ? 'on' : 'off',
                    attributes: {
                        disabled: Boolean(reactionPending),
                    },
                };
            });
        }, [currentReaction, reactionPending, reactions, t]);

        const likeIconName = reactionsEnabled
            ? currentReaction
                ? 'heart'
                : 'heart-outline'
            : liked
                ? 'heart'
                : 'heart-outline';
        const likeActive = reactionsEnabled
            ? Boolean(currentReaction)
            : Boolean(liked);

        const likeButton = (
            <View style={styles.topicActionIconButton}>
                {reactionPending ? (
                    <ActivityIndicator size="small" color={themeColor} />
                ) : (
                    <MaterialCommunityIcons
                        name={likeIconName}
                        size={scale(20)}
                        color={likeActive ? themeColor : black.main}
                    />
                )}
                {formatCount(likeCount) ? (
                    <Text
                        style={[
                            styles.topicActionCount,
                            {
                                color: likeActive
                                    ? themeColor
                                    : black.third,
                            },
                        ]}>
                        {formatCount(likeCount)}
                    </Text>
                ) : null}
            </View>
        );

        return (
            <View
                onLayout={event => {
                    onLayoutHeight?.(event.nativeEvent.layout.height);
                }}
                style={[
                    styles.topicActionBar,
                    {
                        backgroundColor: white,
                        borderTopColor: disabled,
                        paddingBottom: Math.max(
                            insets.bottom,
                            verticalScale(4),
                        ),
                    },
                ]}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('回覆話題')}
                    disabled={!canReply}
                    onPress={() => {
                        trigger();
                        onPressCompose?.();
                    }}
                    style={({ pressed }) => [
                        styles.topicActionCompose,
                        {
                            backgroundColor: bg_color,
                            opacity: !canReply
                                ? 0.5
                                : pressed
                                    ? 0.7
                                    : 1,
                        },
                    ]}>
                    <MaterialCommunityIcons
                        name="pencil-outline"
                        size={scale(14)}
                        color={black.third}
                    />
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.topicActionComposeText,
                            { color: black.third },
                        ]}>
                        {t('說點什麼...')}
                    </Text>
                </Pressable>

                <View style={styles.topicActionIcons}>
                    {reactionsEnabled && reactionDisabled ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('回應')}
                            onPress={() => {
                                trigger();
                                onPressDisabledReaction?.();
                            }}>
                            {likeButton}
                        </Pressable>
                    ) : reactionsEnabled ? (
                        <MenuView
                            actions={reactionMenuActions}
                            onOpenMenu={() => trigger()}
                            onPressAction={event => {
                                trigger();
                                onSelectReaction?.(event.nativeEvent.event);
                            }}
                            shouldOpenOnLongPress={false}>
                            {likeButton}
                        </MenuView>
                    ) : (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                                liked ? t('取消讚好') : t('讚好')
                            }
                            disabled={reactionPending}
                            onPress={() => {
                                trigger();
                                onPressLike?.();
                            }}>
                            {likeButton}
                        </Pressable>
                    )}

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                            bookmarked ? t('已收藏') : t('收藏')
                        }
                        disabled={bookmarkPending}
                        onPress={() => {
                            trigger();
                            onPressBookmark?.();
                        }}
                        style={styles.topicActionIconButton}>
                        {bookmarkPending ? (
                            <ActivityIndicator
                                size="small"
                                color={themeColor}
                            />
                        ) : (
                            <MaterialCommunityIcons
                                name={
                                    bookmarked
                                        ? 'star'
                                        : 'star-outline'
                                }
                                size={scale(20)}
                                color={
                                    bookmarked ? themeColor : black.main
                                }
                            />
                        )}
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('評論')}
                        onPress={() => {
                            trigger();
                            onJumpToComments?.();
                        }}
                        style={styles.topicActionIconButton}>
                        <MaterialCommunityIcons
                            name="comment-outline"
                            size={scale(20)}
                            color={black.main}
                        />
                        {formatCount(commentCount) ? (
                            <Text
                                style={[
                                    styles.topicActionCount,
                                    { color: black.third },
                                ]}>
                                {formatCount(commentCount)}
                            </Text>
                        ) : null}
                    </Pressable>
                </View>
            </View>
        );
    },
);

export default HarborTopicActionBar;
