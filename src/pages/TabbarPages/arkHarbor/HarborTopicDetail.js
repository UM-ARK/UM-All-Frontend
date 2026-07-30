import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    InteractionManager,
    Platform,
    Pressable,
    RefreshControl,
    Share,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import { FlashList } from '@shopify/flash-list';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHeaderHeight } from '@react-navigation/elements';
import Toast from 'react-native-simple-toast';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../components/ThemeContext';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { openLink } from '../../../utils/browser';
import {
    HARBOR_TOPIC_NOTIFICATION_LEVELS,
} from '../../../utils/harbor/harborApi';
import {
    openHarborComposer,
    parseHarborUrl,
} from '../../../utils/harbor/harborNavigation';
import {
    ARK_HARBOR,
    ARK_HARBOR_TOPIC_URL,
} from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import HarborPostCard from './topicDetail/HarborPostCard';
import HarborRelatedTopics from './topicDetail/HarborRelatedTopics';
import HarborTopicActionBar from './topicDetail/HarborTopicActionBar';
import HarborTopicDetailOverlays from './topicDetail/HarborTopicDetailOverlays';
import HarborTopicDetailSkeleton from './topicDetail/HarborTopicDetailSkeleton';
import {
    canUpdatePostReaction,
    getLikeAction,
    getReactionCount,
} from './topicDetail/harborTopicModels';
import styles from './topicDetail/styles';
import useHarborTopicActions from './topicDetail/useHarborTopicActions';
import useHarborTopicReading from './topicDetail/useHarborTopicReading';
import useHarborTopicData from './topicDetail/useHarborTopicData';

// 列表即帖子序列（話題標題已併入 1 樓）
const LIST_POST_INDEX_OFFSET = 0;
const TOPIC_VIEWABILITY_CONFIG = {
    // 保留所有仍在畫面的樓層，再以標題下緣判斷目前閱讀樓層
    itemVisiblePercentThreshold: 1,
    minimumViewTime: 120,
};
const TOPIC_NOTIFICATION_OPTIONS = [
    {
        level: HARBOR_TOPIC_NOTIFICATION_LEVELS.normal,
        label: '一般',
        description: '只在有人提及或直接回覆你時通知',
        icon: 'bell-outline',
    },
    {
        level: HARBOR_TOPIC_NOTIFICATION_LEVELS.tracking,
        label: '追蹤',
        description: '顯示新回覆數量，但不主動通知',
        icon: 'bell-badge-outline',
    },
    {
        level: HARBOR_TOPIC_NOTIFICATION_LEVELS.watching,
        label: '關注',
        description: '每篇新回覆都會通知你',
        icon: 'bell-ring-outline',
    },
    {
        level: HARBOR_TOPIC_NOTIFICATION_LEVELS.watchingFirstPost,
        label: '只關注第一篇',
        description: '只在這個話題的第一篇有活動時通知',
        icon: 'bell-check-outline',
    },
    {
        level: HARBOR_TOPIC_NOTIFICATION_LEVELS.muted,
        label: '靜音',
        description: '不顯示這個話題的通知與未讀提示',
        icon: 'bell-off-outline',
    },
];

const HarborTopicShareButton = ({
    accessibilityLabel,
    onPress,
    themeColor,
}) => (
    <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => {
            trigger();
            onPress();
        }}
        style={styles.headerShareButton}>
        <MaterialCommunityIcons
            name="share-variant-outline"
            size={scale(20)}
            color={themeColor}
        />
    </Pressable>
);

const createHarborTopicShareButton = props => () => (
    <HarborTopicShareButton {...props} />
);

const HarborTopicDetail = ({ route, navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const {
        login,
        status: sessionStatus,
        user: harborUser,
    } = useHarborSession();
    const { width } = useWindowDimensions();
    const headerHeight = useHeaderHeight();
    const {
        black,
        bg_color,
        themeColor,
        tonal,
        trueWhite,
        white,
    } = theme;
    const topicId = Number(route.params?.topicId);
    const initialTopicTitle = route.params?.topicTitle;
    const requestedPostNumber = Number(route.params?.postNumber);
    const composerRefreshAt = route.params?.composerRefreshAt;
    const pendingReplyDraft = route.params?.pendingReplyDraft;
    const listRef = useRef(null);
    const imageViewerRef = useRef(null);
    const pendingReplyDraftFrameRef = useRef(null);
    const readingBridgeRef = useRef({});
    const sessionStatusRef = useRef(sessionStatus);
    const resetTopicReading = useCallback(() => {
        readingBridgeRef.current.resetTopicReading?.();
    }, []);
    const revealNewReplies = useCallback(latestPostNumber => {
        readingBridgeRef.current.revealNewReplies?.(latestPostNumber);
    }, []);
    const {
        canReplyToTopic,
        errorMessage,
        highestPostNumber,
        imageUrls,
        isLoading,
        isLoadingNext,
        isLoadingPrevious,
        isRefreshing,
        latestTopicRef,
        listData,
        loadAdjacentPosts,
        loadNewReplies,
        loadTopic,
        pendingNestedPostNumbers,
        pendingNewPostIds,
        posts,
        setIsLoadingNext,
        setTopic,
        topic,
        toggleNestedReplies,
        unreadAfterPostNumber,
        updateTopicPost,
        validReactions,
    } = useHarborTopicData({
        onNewRepliesLoaded: revealNewReplies,
        onResetReading: resetTopicReading,
        sessionStatus,
        sessionStatusRef,
        t,
        topicId,
    });

    const {
        currentPostNumber,
        handleScroll,
        handleScrollBeginDrag,
        handleViewableItemsChanged,
        resetTopicReading: resetReading,
        revealNewReplies: revealReplies,
        scrollToPost,
    } = useHarborTopicReading({
        composerRefreshAt,
        headerHeight,
        latestTopicRef,
        listRef,
        loadTopic,
        posts,
        requestedPostNumber,
        sessionStatusRef,
        setIsLoadingNext,
        setTopic,
        t,
        topic,
        topicId,
    });
    useLayoutEffect(() => {
        readingBridgeRef.current = {
            resetTopicReading: resetReading,
            revealNewReplies: revealReplies,
        };
    }, [resetReading, revealReplies]);

    const {
        bookmarkEditor,
        changeNotificationLevel,
        deletePost,
        explainPostReactionDisabled,
        isBookmarkReminderVisible,
        isNotificationVisible,
        openBookmarkEditor,
        openNotificationLevels,
        pendingMutations,
        removePostBookmark,
        savePostBookmark,
        selectPostReaction,
        setBookmarkEditor,
        setIsBookmarkReminderVisible,
        setIsNotificationVisible,
        togglePostLike,
    } = useHarborTopicActions({
        currentTrustLevel: harborUser?.trustLevel,
        currentUsername: harborUser?.username,
        latestTopicRef,
        login,
        sessionStatusRef,
        setTopic,
        t,
        topicId,
        updateTopicPost,
    });

    const contentWidth = Math.max(width - scale(32), scale(220));
    const [topicActionBarHeight, setTopicActionBarHeight] = useState(
        verticalScale(48),
    );

    const firstPost = useMemo(
        () =>
            posts.find(post => Number(post.post_number) === 1) || posts[0] || null,
        [posts],
    );
    const firstPostLikeAction = getLikeAction(firstPost);
    const firstPostLiked = Boolean(firstPostLikeAction?.acted);
    const firstPostReactionCount = getReactionCount(firstPost);
    const firstPostBookmarked = Boolean(firstPost?.bookmarked);
    const firstPostReactionDisabled =
        sessionStatus === 'signedIn' &&
        firstPost &&
        !canUpdatePostReaction(firstPost);
    const commentCount = Math.max(Number(topic?.posts_count || 1) - 1, 0);

    const listBottomInset =
        topicActionBarHeight + verticalScale(8);

    const listContentContainerStyle = useMemo(
        () => ({
            // 液態玻璃透明導覽列下的頂部留白
            paddingTop: isLiquidGlassSupported ? headerHeight : 0,
            // 預留底部操作欄與閱讀控制高度
            paddingBottom: listBottomInset,
        }),
        [headerHeight, listBottomInset],
    );

    const openImage = useCallback(index => {
        imageViewerRef.current?.handleOpenImage(index);
    }, []);

    const openHarborLink = useCallback(
        url => {
            const target = parseHarborUrl(url, ARK_HARBOR);

            if (target?.type === 'topic') {
                navigation.navigate('HarborTopicDetail', {
                    topicId: target.topicId,
                    ...(target.postNumber
                        ? { postNumber: target.postNumber }
                        : {}),
                });
                return;
            }

            if (target?.type === 'category') {
                navigation.navigate('HarborCategoryTopics', {
                    categoryId: target.categoryId,
                    categorySlug: target.categorySlug,
                });
                return;
            }

            if (target?.type === 'tag') {
                navigation.navigate('HarborTagTopics', { tag: target.tag });
                return;
            }

            if (target?.type === 'search') {
                navigation.navigate('HarborSearch', { query: target.query });
                return;
            }

            const fallbackUrl = target?.url || url;
            console.warn(
                '[HarborPostContent] Web fallback link:',
                fallbackUrl,
            );
            openLink({
                URL: fallbackUrl,
                mode: 'fullScreen',
            });
        },
        [navigation],
    );

    const openAuthor = useCallback(
        username => {
            if (!username) {
                return;
            }
            openHarborLink(`${ARK_HARBOR}/u/${encodeURIComponent(username)}`);
        },
        [openHarborLink],
    );

    const openCategory = useCallback(
        category => {
            navigation.navigate('HarborCategoryTopics', category);
        },
        [navigation],
    );

    const openTag = useCallback(
        tag => {
            navigation.navigate('HarborTagTopics', { tag });
        },
        [navigation],
    );

    const copyPostPermalink = useCallback(
        post => {
            Clipboard.setString(
                ARK_HARBOR_TOPIC_URL(topicId, post?.post_number),
            );
            Toast.show(t('永久連結已複製'));
        },
        [t, topicId],
    );

    const sharePost = useCallback(
        post => {
            const url = ARK_HARBOR_TOPIC_URL(topicId, post?.post_number);
            Share.share({
                message: `${topic?.title || 'Harbor'}\n${url}`,
                url,
            }).catch(() => {
                Toast.show(t('分享失敗，請稍後再試'));
            });
        },
        [t, topic?.title, topicId],
    );

    const shareCurrentPost = useCallback(() => {
        const url = ARK_HARBOR_TOPIC_URL(
            topicId,
            currentPostNumber > 0 ? currentPostNumber : undefined,
        );
        Share.share({
            message: `${topic?.title || 'Harbor'}\n${url}`,
            url,
        }).catch(() => {
            Toast.show(t('分享失敗，請稍後再試'));
        });
    }, [currentPostNumber, t, topic?.title, topicId]);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: '',
            // iOS：原生 UIBarButtonItem，液態玻璃下才是標準圓形
            headerRight:
                Platform.OS === 'ios'
                    ? undefined
                    : createHarborTopicShareButton({
                          accessibilityLabel: t('分享'),
                          onPress: shareCurrentPost,
                          themeColor,
                      }),
            unstable_headerRightItems:
                Platform.OS === 'ios'
                    ? () => [
                          {
                              type: 'button',
                              label: t('分享'),
                              accessibilityLabel: t('分享'),
                              icon: {
                                  type: 'sfSymbol',
                                  name: 'square.and.arrow.up',
                              },
                              tintColor: themeColor,
                              onPress: () => {
                                  trigger();
                                  shareCurrentPost();
                              },
                          },
                      ]
                    : undefined,
        });
    }, [navigation, shareCurrentPost, t, themeColor]);

    const openTopicReplyComposer = useCallback(() => {
        openHarborComposer(navigation, {
            mode: 'reply',
            topicId,
            topicTitle: topic?.title || initialTopicTitle,
            categoryId: topic?.category_id,
        });
    }, [
        initialTopicTitle,
        navigation,
        topic?.category_id,
        topic?.title,
        topicId,
    ]);

    const jumpToComments = useCallback(() => {
        if (highestPostNumber < 2) {
            Toast.show(t('暫無回覆'));
            return;
        }
        scrollToPost(2);
    }, [highestPostNumber, scrollToPost, t]);

    const handleFirstPostLike = useCallback(() => {
        if (!firstPost) {
            return;
        }
        togglePostLike(firstPost);
    }, [firstPost, togglePostLike]);

    const handleFirstPostBookmark = useCallback(() => {
        if (!firstPost) {
            return;
        }
        openBookmarkEditor(firstPost);
    }, [firstPost, openBookmarkEditor]);

    const handleFirstPostReaction = useCallback(
        reactionId => {
            if (!firstPost?.id) {
                return;
            }
            selectPostReaction(firstPost.id, reactionId);
        },
        [firstPost?.id, selectPostReaction],
    );

    const handleFirstPostDisabledReaction = useCallback(() => {
        if (!firstPost?.id) {
            return;
        }
        explainPostReactionDisabled(firstPost.id);
    }, [explainPostReactionDisabled, firstPost?.id]);

    const openPostReplyComposer = useCallback(
        post => {
            openHarborComposer(navigation, {
                mode: 'reply',
                topicId,
                topicTitle: topic?.title || initialTopicTitle,
                categoryId: topic?.category_id,
                replyToPostNumber: post.post_number,
                replyToUsername:
                    post.username ||
                    post.display_username ||
                    post.name,
            });
        },
        [
            initialTopicTitle,
            navigation,
            topic?.category_id,
            topic?.title,
            topicId,
        ],
    );

    useEffect(() => {
        if (
            !pendingReplyDraft ||
            pendingReplyDraft.mode !== 'reply' ||
            !topic?.id ||
            isLoading
        ) {
            return undefined;
        }
        const replyToPostNumber = Number(
            pendingReplyDraft.replyToPostNumber,
        );
        const hasReplyTarget =
            Number.isInteger(replyToPostNumber) &&
            replyToPostNumber > 0;
        const targetPostNumber = hasReplyTarget
            ? replyToPostNumber
            : requestedPostNumber;
        const targetPost = Number.isInteger(targetPostNumber)
            ? posts.find(
                post =>
                    Number(post.post_number) === targetPostNumber,
            )
            : null;
        if (
            Number.isInteger(targetPostNumber) &&
            targetPostNumber > 0 &&
            !targetPost
        ) {
            return undefined;
        }

        const interaction = InteractionManager.runAfterInteractions(() => {
            if (targetPostNumber > 0) {
                scrollToPost(targetPostNumber, {
                    allowFetch: false,
                    animated: false,
                });
            }
            pendingReplyDraftFrameRef.current = requestAnimationFrame(() => {
                pendingReplyDraftFrameRef.current =
                    requestAnimationFrame(() => {
                        openHarborComposer(navigation, {
                            ...pendingReplyDraft,
                            topicId,
                            topicTitle:
                                topic.title ||
                                pendingReplyDraft.topicTitle ||
                                initialTopicTitle,
                            categoryId:
                                topic.category_id ??
                                pendingReplyDraft.categoryId,
                            ...(hasReplyTarget
                                ? {
                                    replyToUsername:
                                        targetPost?.username ||
                                        targetPost?.display_username ||
                                        targetPost?.name,
                                }
                                : {}),
                        });
                        navigation.setParams({
                            pendingReplyDraft: undefined,
                        });
                    });
            });
        });

        return () => {
            interaction.cancel();
            if (pendingReplyDraftFrameRef.current != null) {
                cancelAnimationFrame(
                    pendingReplyDraftFrameRef.current,
                );
                pendingReplyDraftFrameRef.current = null;
            }
        };
    }, [
        initialTopicTitle,
        isLoading,
        navigation,
        pendingReplyDraft,
        posts,
        requestedPostNumber,
        scrollToPost,
        topic,
        topicId,
    ]);

    const openPostEditComposer = useCallback(
        post => {
            openHarborComposer(navigation, {
                mode: 'edit',
                postId: post.id,
                postNumber: post.post_number,
                topicId,
                topicTitle: topic?.title || initialTopicTitle,
                categoryId: topic?.category_id,
            });
        },
        [
            initialTopicTitle,
            navigation,
            topic?.category_id,
            topic?.title,
            topicId,
        ],
    );

    const confirmDeletePost = useCallback(
        post => {
            const isFirstPost = Number(post.post_number) === 1;
            Alert.alert(
                isFirstPost
                    ? t('刪除整個話題？')
                    : t('刪除這篇帖子？'),
                isFirstPost
                    ? t('刪除後，這個話題將無法再瀏覽。')
                    : t('刪除後，其他人將無法再看到這篇帖子。'),
                [
                    {
                        text: t('取消'),
                        style: 'cancel',
                        onPress: trigger,
                    },
                    {
                        text: t('刪除'),
                        style: 'destructive',
                        onPress: async () => {
                            trigger();
                            const deleted = await deletePost(post);
                            if (deleted && isFirstPost) {
                                navigation.goBack();
                            }
                        },
                    },
                ],
            );
        },
        [deletePost, navigation, t],
    );

    const openRelatedTopic = useCallback(
        relatedTopic => {
            navigation.push('HarborTopicDetail', {
                topicId: relatedTopic.id,
                topicTitle: relatedTopic.title,
            });
        },
        [navigation],
    );

    const openOriginalTopic = useCallback(() => {
        trigger();
        openLink({
            URL: ARK_HARBOR_TOPIC_URL(
                topicId,
                currentPostNumber > 0
                    ? currentPostNumber
                    : undefined,
            ),
            mode: 'fullScreen',
        });
    }, [currentPostNumber, topicId]);

    const renderPost = useCallback(
        ({ item, index }) => {
            const postIndex = index - LIST_POST_INDEX_OFFSET;
            const previousPostNumber =
                postIndex > 0
                    ? Number(posts[postIndex - 1]?.post_number || 0)
                    : 0;
            const showUnreadDivider =
                !topic?.is_nested_view &&
                unreadAfterPostNumber >= 0 &&
                Number(item.post_number) > unreadAfterPostNumber &&
                (postIndex === 0 ||
                    previousPostNumber <= unreadAfterPostNumber);
            const isFirstPost = Number(item.post_number) === 1;

            return (
                <View>
                    {isFirstPost && isLoadingPrevious ? (
                        <ActivityIndicator
                            size="small"
                            color={themeColor}
                            style={styles.edgeLoader}
                        />
                    ) : null}
                    {showUnreadDivider ? (
                        <View style={styles.unreadDivider}>
                            <View
                                style={[
                                    styles.unreadDividerLine,
                                    { backgroundColor: theme.disabled },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.unreadDividerText,
                                    { color: black.third },
                                ]}>
                                {t('未讀回覆')}
                            </Text>
                            <View
                                style={[
                                    styles.unreadDividerLine,
                                    { backgroundColor: theme.disabled },
                                ]}
                            />
                        </View>
                    ) : null}
                    <HarborPostCard
                        post={item}
                        topic={isFirstPost ? topic : null}
                        contentWidth={
                            contentWidth -
                            (Number(item.__harborNestedDepth || 0) > 0
                                ? scale(38)
                                : 0)
                        }
                        imageUrls={imageUrls}
                        onOpenImage={openImage}
                        onPressAuthor={openAuthor}
                        onPressBookmark={openBookmarkEditor}
                        onPressCategory={openCategory}
                        onPressComposeReply={openPostReplyComposer}
                        onPressCopy={copyPostPermalink}
                        onPressDelete={confirmDeletePost}
                        onPressEdit={openPostEditComposer}
                        onPressLike={togglePostLike}
                        onPressLink={openHarborLink}
                        onPressOpenNotifications={openNotificationLevels}
                        onPressOpenOriginal={
                            isFirstPost ? openOriginalTopic : undefined
                        }
                        onPressReply={scrollToPost}
                        onPressShare={sharePost}
                        onPressTag={openTag}
                        onToggleNestedReplies={toggleNestedReplies}
                        onPressDisabledReaction={
                            explainPostReactionDisabled
                        }
                        onSelectReaction={selectPostReaction}
                        canReply={canReplyToTopic}
                        nestedDepth={item.__harborNestedDepth}
                        nestedRepliesExpanded={
                            Number(
                                item.__harborNestedVisibleReplyCount || 0,
                            ) > 0
                        }
                        nestedRepliesAllVisible={
                            Number(item.__harborNestedReplyCount || 0) > 0 &&
                            Number(
                                item.__harborNestedVisibleReplyCount || 0,
                            ) >= Number(item.__harborNestedReplyCount || 0)
                        }
                        nestedRepliesLoading={
                            pendingNestedPostNumbers.includes(
                                Number(item.post_number),
                            )
                        }
                        nestedReplyCount={
                            item.__harborNestedReplyCount || 0
                        }
                        nestedVisibleReplyCount={
                            item.__harborNestedVisibleReplyCount || 0
                        }
                        pendingBookmark={
                            pendingMutations[`bookmark:${item.id}`]
                        }
                        pendingDelete={
                            pendingMutations[`delete:${item.id}`]
                        }
                        pendingLike={pendingMutations[`like:${item.id}`]}
                        pendingNotification={
                            pendingMutations[`notification:${topicId}`]
                        }
                        pendingReaction={
                            pendingMutations[`reaction:${item.id}`]
                        }
                        reactionDisabled={
                            sessionStatus === 'signedIn' &&
                            !canUpdatePostReaction(item)
                        }
                        reactions={validReactions}
                        reactionsEnabled={validReactions.length > 0}
                    />
                </View>
            );
        },
        [
            canReplyToTopic,
            black.third,
            contentWidth,
            imageUrls,
            isLoadingPrevious,
            copyPostPermalink,
            confirmDeletePost,
            explainPostReactionDisabled,
            openAuthor,
            openBookmarkEditor,
            openCategory,
            openHarborLink,
            openImage,
            openNotificationLevels,
            openOriginalTopic,
            openPostEditComposer,
            openPostReplyComposer,
            openTag,
            pendingMutations,
            pendingNestedPostNumbers,
            posts,
            scrollToPost,
            selectPostReaction,
            sessionStatus,
            sharePost,
            t,
            themeColor,
            theme.disabled,
            togglePostLike,
            topic,
            topicId,
            toggleNestedReplies,
            unreadAfterPostNumber,
            validReactions,
        ],
    );

    if (isLoading && !topic) {
        return (
            <HarborTopicDetailSkeleton
                headerHeight={headerHeight}
                theme={theme}
            />
        );
    }

    if (!topic) {
        return (
            <View style={[styles.centeredPage, { backgroundColor: bg_color }]}>
                <View
                    style={[
                        styles.errorIcon,
                        { backgroundColor: tonal.primary15 },
                    ]}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={scale(34)}
                        color={themeColor}
                    />
                </View>
                <Text style={[styles.errorTitle, { color: black.main }]}>
                    {t('暫時無法顯示帖子')}
                </Text>
                <Text style={[styles.errorDescription, { color: black.third }]}>
                    {errorMessage || t('請稍後再試')}
                </Text>
                <Pressable
                    onPress={() => {
                        trigger();
                        loadTopic();
                    }}
                    style={({ pressed }) => [
                        styles.primaryButton,
                        {
                            backgroundColor: pressed
                                ? tonal.primary50
                                : themeColor,
                        },
                    ]}>
                    <Text
                        style={[styles.primaryButtonText, { color: trueWhite }]}>
                        {t('重新載入')}
                    </Text>
                </Pressable>
                {Number.isInteger(topicId) && topicId > 0 ? (
                    <Pressable
                        onPress={openOriginalTopic}
                        style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.secondaryButtonText,
                                { color: themeColor },
                            ]}>
                            {t('在 Harbor 開啟')}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        );
    }

    return (
        <View style={[styles.page, { backgroundColor: white }]}>
            <FlashList
                ref={listRef}
                data={listData}
                renderItem={renderPost}
                keyExtractor={item => {
                    return `harbor-post-${item.id}`;
                }}
                getItemType={item => {
                    return 'post';
                }}
                contentContainerStyle={listContentContainerStyle}
                extraData={currentPostNumber}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                scrollIndicatorInsets={
                    isLiquidGlassSupported
                        ? {
                            top: headerHeight,
                            bottom: listBottomInset,
                        }
                        : {
                            bottom: listBottomInset,
                        }
                }
                showsVerticalScrollIndicator={true}
                drawDistance={700}
                ListFooterComponent={
                    <View>
                        {isLoadingNext ? (
                            <ActivityIndicator
                                size="small"
                                color={themeColor}
                                style={styles.edgeLoader}
                            />
                        ) : null}
                        <HarborRelatedTopics
                            topics={topic.suggested_topics}
                            onPressTopic={openRelatedTopic}
                        />
                    </View>
                }
                onStartReached={() => loadAdjacentPosts('previous')}
                onStartReachedThreshold={0.25}
                onEndReached={() => loadAdjacentPosts('next')}
                onEndReachedThreshold={0.4}
                onViewableItemsChanged={handleViewableItemsChanged}
                viewabilityConfig={TOPIC_VIEWABILITY_CONFIG}
                onScroll={handleScroll}
                scrollEventThrottle={80}
                onScrollBeginDrag={handleScrollBeginDrag}
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        progressViewOffset={
                            isLiquidGlassSupported ? headerHeight : undefined
                        }
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            trigger();
                            loadTopic({ refresh: true });
                        }}
                    />
                }
            />

            <HarborTopicActionBar
                bookmarkPending={
                    firstPost
                        ? pendingMutations[`bookmark:${firstPost.id}`]
                        : false
                }
                bookmarked={firstPostBookmarked}
                canReply={canReplyToTopic}
                commentCount={commentCount}
                currentReaction={firstPost?.current_user_reaction?.id}
                likeCount={firstPostReactionCount}
                liked={firstPostLiked}
                onJumpToComments={jumpToComments}
                onLayoutHeight={setTopicActionBarHeight}
                onPressBookmark={handleFirstPostBookmark}
                onPressCompose={openTopicReplyComposer}
                onPressDisabledReaction={handleFirstPostDisabledReaction}
                onPressLike={handleFirstPostLike}
                onSelectReaction={handleFirstPostReaction}
                reactionDisabled={firstPostReactionDisabled}
                reactionPending={
                    firstPost
                        ? pendingMutations[`like:${firstPost.id}`] ||
                          pendingMutations[`reaction:${firstPost.id}`]
                        : false
                }
                reactions={validReactions}
                reactionsEnabled={validReactions.length > 0}
            />

            {pendingNewPostIds.length > 0 ? (
                <Pressable
                    onPress={() => {
                        trigger();
                        loadNewReplies();
                    }}
                    style={({ pressed }) => [
                        styles.newRepliesButton,
                        {
                            bottom: topicActionBarHeight + verticalScale(10),
                            backgroundColor: pressed
                                ? tonal.primary50
                                : themeColor,
                        },
                    ]}>
                    {isLoadingNext ? (
                        <ActivityIndicator
                            size="small"
                            color={trueWhite}
                        />
                    ) : (
                        <MaterialCommunityIcons
                            name="arrow-down-circle-outline"
                            size={scale(18)}
                            color={trueWhite}
                        />
                    )}
                    <Text
                        style={[
                            styles.newRepliesButtonText,
                            { color: trueWhite },
                        ]}>
                        {t('{{count}} 個新回覆', {
                            count: pendingNewPostIds.length,
                        })}
                    </Text>
                </Pressable>
            ) : null}

            <HarborTopicDetailOverlays
                bookmarkEditor={bookmarkEditor}
                changeNotificationLevel={changeNotificationLevel}
                imageUrls={imageUrls}
                imageViewerRef={imageViewerRef}
                isBookmarkReminderVisible={isBookmarkReminderVisible}
                isNotificationVisible={isNotificationVisible}
                notificationOptions={TOPIC_NOTIFICATION_OPTIONS}
                removePostBookmark={removePostBookmark}
                savePostBookmark={savePostBookmark}
                setBookmarkEditor={setBookmarkEditor}
                setIsBookmarkReminderVisible={setIsBookmarkReminderVisible}
                setIsNotificationVisible={setIsNotificationVisible}
                topic={topic}
            />
        </View>
    );
};

export default HarborTopicDetail;
