import React, {
    memo,
} from 'react';
import {
    ActivityIndicator,
    Pressable,
    View,
} from 'react-native';

import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import { useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import HarborLikeFeedback, {
    useHarborLikeFeedback,
} from './HarborLikeFeedback';
import HarborReactionControl, {
    HarborReactionIcon,
} from './HarborReactionControl';
import styles from './styles';

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
        archived,
        bookmarkPending,
        bookmarked,
        canReply,
        closed,
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
        postId,
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

        const composePlaceholder = archived
            ? t('已封存，無法回覆')
            : closed
                ? t('已關閉，無法回覆')
                : t('說點什麼...');
        const composeAccessibilityLabel = archived
            ? t('此話題已封存，暫時無法發布回覆。')
            : closed
                ? t('此話題已關閉，暫時無法發布回覆。')
                : t('回覆話題');
        const composeIconName = archived
            ? 'archive-outline'
            : closed
                ? 'lock-outline'
                : 'pencil-outline';

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
        const showCurrentReaction =
            reactionsEnabled &&
            currentReaction &&
            currentReaction !== 'heart';
        const isHeartActive = likeActive && !showCurrentReaction;
        const likeFeedback = useHarborLikeFeedback(postId, isHeartActive);

        const likeButton = (
            <View style={styles.topicActionIconButton}>
                <HarborLikeFeedback
                    color={themeColor}
                    hearted={isHeartActive}
                    motion={likeFeedback}>
                    {showCurrentReaction ? (
                        reactionPending ? (
                            <ActivityIndicator size="small" color={themeColor} />
                        ) : (
                            <HarborReactionIcon
                                name={currentReaction}
                                size={scale(20)}
                            />
                        )
                    ) : (
                        <MaterialCommunityIcons
                            name={likeIconName}
                            size={scale(20)}
                            color={likeActive ? themeColor : black.main}
                        />
                    )}
                </HarborLikeFeedback>
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
                <ScalePressable
                    accessibilityRole="button"
                    accessibilityLabel={composeAccessibilityLabel}
                    disabled={!canReply}
                    onPress={() => {
                        trigger();
                        onPressCompose?.();
                    }}
                    style={[
                        styles.topicActionCompose,
                        {
                            backgroundColor: bg_color,
                            opacity: canReply ? 1 : 0.5,
                        },
                    ]}>
                    <MaterialCommunityIcons
                        name={composeIconName}
                        size={scale(14)}
                        color={black.third}
                    />
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.topicActionComposeText,
                            { color: black.third },
                        ]}>
                        {composePlaceholder}
                    </Text>
                </ScalePressable>

                <View style={styles.topicActionIcons}>
                    {reactionsEnabled ? (
                        <HarborReactionControl
                            currentReaction={currentReaction}
                            disabled={reactionDisabled}
                            onPressDisabled={onPressDisabledReaction}
                            onPressIn={
                                showCurrentReaction ? undefined : likeFeedback.pressIn
                            }
                            onPressOut={likeFeedback.release}
                            onSelectReaction={reaction => {
                                likeFeedback.release();
                                onSelectReaction?.(
                                    reaction,
                                    likeFeedback.playBurst,
                                );
                            }}
                            pending={reactionPending}
                            reactions={reactions}>
                            {likeButton}
                        </HarborReactionControl>
                    ) : (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                                liked ? t('取消讚好') : t('讚好')
                            }
                            disabled={reactionPending}
                            onPress={() => {
                                likeFeedback.release();
                                trigger();
                                onPressLike?.(likeFeedback.playBurst);
                            }}
                            onPressIn={likeFeedback.pressIn}
                            onPressOut={likeFeedback.release}>
                            {likeButton}
                        </Pressable>
                    )}

                    <ScalePressable
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
                    </ScalePressable>

                    <ScalePressable
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
                    </ScalePressable>
                </View>
            </View>
        );
    },
);

export default HarborTopicActionBar;
