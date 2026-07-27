import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
} from 'react';
import {
    ActivityIndicator,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import HarborReadingControls from './topicDetail/HarborReadingControls';
import HarborRelatedTopics from './topicDetail/HarborRelatedTopics';
import HarborTopicDetailOverlays from './topicDetail/HarborTopicDetailOverlays';
import HarborTopicDetailSkeleton from './topicDetail/HarborTopicDetailSkeleton';
import HarborTopicHeader from './topicDetail/HarborTopicHeader';
import { extractPostQuoteText } from './topicDetail/harborTopicModels';
import styles from './topicDetail/styles';
import useHarborTopicActions from './topicDetail/useHarborTopicActions';
import useHarborTopicReading from './topicDetail/useHarborTopicReading';
import useHarborTopicData from './topicDetail/useHarborTopicData';

// 列表前綴：話題標題
const LIST_POST_INDEX_OFFSET = 1;
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

const HarborTopicDetail = ({ route, navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const { login, status: sessionStatus } = useHarborSession();
    const { width } = useWindowDimensions();
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const {
        black,
        bg_color,
        themeColor,
        tonal,
        trueWhite,
    } = theme;
    const topicId = Number(route.params?.topicId);
    const initialTopicTitle = route.params?.topicTitle;
    const requestedPostNumber = Number(route.params?.postNumber);
    const composerRefreshAt = route.params?.composerRefreshAt;
    const listRef = useRef(null);
    const imageViewerRef = useRef(null);
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
        firstUnreadPostNumber,
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
        pendingNewPostIds,
        posts,
        setIsLoadingNext,
        setTopic,
        setUnreadAfterPostNumber,
        showReadingControls,
        topic,
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
        isJumpVisible,
        jumpPostNumber,
        readingControlsDockHeight,
        resetTopicReading: resetReading,
        revealNewReplies: revealReplies,
        scrollToPost,
        seekReadingProgress,
        setIsJumpVisible,
        setJumpPostNumber,
        setReadingControlsDockHeight,
        submitPostJump,
    } = useHarborTopicReading({
        composerRefreshAt,
        headerHeight,
        highestPostNumber,
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
        isBookmarkReminderVisible,
        isNotificationVisible,
        markTopicUnread,
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
        highestPostNumber,
        latestTopicRef,
        login,
        sessionStatusRef,
        setTopic,
        setUnreadAfterPostNumber,
        t,
        topicId,
        unreadAfterPostNumber,
        updateTopicPost,
    });

    const contentWidth = Math.max(width - scale(48), scale(220));

    const listBottomInset = showReadingControls
        ? readingControlsDockHeight + verticalScale(8)
        : verticalScale(12);

    const listContentContainerStyle = useMemo(
        () => ({
            // 液態玻璃透明導覽列下的頂部留白
            paddingTop: isLiquidGlassSupported ? headerHeight : 0,
            // 有進度條時預留底部懸浮高度；單層樓僅保留小間距
            paddingBottom: listBottomInset,
        }),
        [headerHeight, listBottomInset],
    );

    useEffect(() => {
        navigation.setOptions({
            headerTitle: topic?.title || initialTopicTitle || 'Harbor',
        });
    }, [initialTopicTitle, navigation, topic?.title]);

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

            openLink({
                URL: target?.url || url,
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

    const copyCurrentPost = useCallback(() => {
        copyPostPermalink({ post_number: currentPostNumber });
    }, [copyPostPermalink, currentPostNumber]);

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

    const openPostReplyComposer = useCallback(
        post => {
            openHarborComposer(navigation, {
                mode: 'reply',
                topicId,
                topicTitle: topic?.title || initialTopicTitle,
                categoryId: topic?.category_id,
                replyToPostNumber: post.post_number,
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

    const openPostQuoteComposer = useCallback(
        post => {
            const username = String(
                post.username || post.display_username || '',
            ).replace(/["\r\n]/g, '');
            const quoteText = extractPostQuoteText(post.cooked).replace(
                /\[\/quote\]/gi,
                '[／quote]',
            );
            const quoteRaw =
                `[quote="${username}, post:${post.post_number}, topic:${topicId}"]\n` +
                `${quoteText}\n[/quote]\n\n`;
            openHarborComposer(navigation, {
                mode: 'reply',
                topicId,
                topicTitle: topic?.title || initialTopicTitle,
                categoryId: topic?.category_id,
                replyToPostNumber: post.post_number,
                quoteRaw,
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
            if (item?.__harborItemType === 'topicHeader') {
                return (
                    <View>
                        <HarborTopicHeader
                            topic={topic}
                            onCopy={copyCurrentPost}
                            onMarkUnread={markTopicUnread}
                            onOpenNotifications={openNotificationLevels}
                            onOpenOriginal={openOriginalTopic}
                            onShare={shareCurrentPost}
                            onPressCategory={openCategory}
                            onPressTag={openTag}
                            pendingMarkUnread={
                                pendingMutations[`unread:${topicId}`]
                            }
                            pendingNotification={
                                pendingMutations[`notification:${topicId}`]
                            }
                        />
                        {isLoadingPrevious ? (
                            <ActivityIndicator
                                size="small"
                                color={themeColor}
                                style={styles.edgeLoader}
                            />
                        ) : null}
                    </View>
                );
            }

            const postIndex = index - LIST_POST_INDEX_OFFSET;
            const previousPostNumber =
                postIndex > 0
                    ? Number(posts[postIndex - 1]?.post_number || 0)
                    : 0;
            const showUnreadDivider =
                unreadAfterPostNumber >= 0 &&
                Number(item.post_number) > unreadAfterPostNumber &&
                (postIndex === 0 ||
                    previousPostNumber <= unreadAfterPostNumber);

            return (
                <View>
                    {showUnreadDivider ? (
                        <View style={styles.unreadDivider}>
                            <View
                                style={[
                                    styles.unreadDividerLine,
                                    { backgroundColor: themeColor },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.unreadDividerText,
                                    { color: themeColor },
                                ]}>
                                {t('未讀回覆')}
                            </Text>
                            <View
                                style={[
                                    styles.unreadDividerLine,
                                    { backgroundColor: themeColor },
                                ]}
                            />
                        </View>
                    ) : null}
                    <HarborPostCard
                        post={item}
                        contentWidth={contentWidth}
                        imageUrls={imageUrls}
                        onOpenImage={openImage}
                        onPressAuthor={openAuthor}
                        onPressBookmark={openBookmarkEditor}
                        onPressComposeReply={openPostReplyComposer}
                        onPressCopy={copyPostPermalink}
                        onPressEdit={openPostEditComposer}
                        onPressLike={togglePostLike}
                        onPressLink={openHarborLink}
                        onPressQuote={openPostQuoteComposer}
                        onPressReply={scrollToPost}
                        onPressShare={sharePost}
                        onSelectReaction={selectPostReaction}
                        canReply={canReplyToTopic}
                        pendingBookmark={
                            pendingMutations[`bookmark:${item.id}`]
                        }
                        pendingLike={pendingMutations[`like:${item.id}`]}
                        pendingReaction={
                            pendingMutations[`reaction:${item.id}`]
                        }
                        reactions={validReactions}
                        reactionsEnabled={validReactions.length > 0}
                    />
                </View>
            );
        },
        [
            canReplyToTopic,
            contentWidth,
            imageUrls,
            isLoadingPrevious,
            copyCurrentPost,
            copyPostPermalink,
            markTopicUnread,
            openAuthor,
            openBookmarkEditor,
            openCategory,
            openHarborLink,
            openImage,
            openNotificationLevels,
            openOriginalTopic,
            openPostEditComposer,
            openPostQuoteComposer,
            openPostReplyComposer,
            openTag,
            pendingMutations,
            posts,
            scrollToPost,
            selectPostReaction,
            sharePost,
            shareCurrentPost,
            t,
            themeColor,
            togglePostLike,
            topic,
            topicId,
            unreadAfterPostNumber,
            validReactions,
        ],
    );

    if (isLoading && !topic) {
        return (
            <HarborTopicDetailSkeleton
                headerHeight={headerHeight}
                insets={insets}
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
        <View style={[styles.page, { backgroundColor: bg_color }]}>
            <FlashList
                ref={listRef}
                data={listData}
                renderItem={renderPost}
                keyExtractor={item => {
                    if (item?.__harborItemType === 'topicHeader') {
                        return 'harbor-topic-header';
                    }
                    return `harbor-post-${item.id}`;
                }}
                getItemType={item => {
                    if (item?.__harborItemType === 'topicHeader') {
                        return 'topicHeader';
                    }
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
                            bottom: showReadingControls
                                ? readingControlsDockHeight
                                : 0,
                        }
                        : {
                            bottom: showReadingControls
                                ? readingControlsDockHeight
                                : 0,
                        }
                }
                showsVerticalScrollIndicator={false}
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
                        {canReplyToTopic ? (
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    openTopicReplyComposer();
                                }}
                                style={({ pressed }) => [
                                    styles.topicReplyButton,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary50
                                            : themeColor,
                                    },
                                ]}>
                                <MaterialCommunityIcons
                                    name="reply-outline"
                                    size={scale(18)}
                                    color={trueWhite}
                                />
                                <Text
                                    style={[
                                        styles.topicReplyButtonText,
                                        { color: trueWhite },
                                    ]}>
                                    {t('回覆話題')}
                                </Text>
                            </Pressable>
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

            {showReadingControls ? (
                <View
                    pointerEvents="box-none"
                    style={[
                        styles.readingControlsDock,
                        {
                            paddingBottom: Math.max(
                                insets.bottom,
                                verticalScale(8),
                            ),
                        },
                    ]}>
                    <HarborReadingControls
                        currentPostNumber={currentPostNumber}
                        highestPostNumber={highestPostNumber}
                        onFirst={() => scrollToPost(1)}
                        onJump={() => {
                            setJumpPostNumber(String(currentPostNumber || 1));
                            setIsJumpVisible(true);
                        }}
                        onLatest={() => scrollToPost(highestPostNumber)}
                        onUnread={() => scrollToPost(firstUnreadPostNumber)}
                        onSeek={seekReadingProgress}
                        unreadPostNumber={firstUnreadPostNumber}
                        onLayoutHeight={height => {
                            setReadingControlsDockHeight(
                                height +
                                Math.max(insets.bottom, verticalScale(8)) +
                                verticalScale(8),
                            );
                        }}
                    />
                </View>
            ) : null}

            {pendingNewPostIds.length > 0 ? (
                <Pressable
                    onPress={() => {
                        trigger();
                        loadNewReplies();
                    }}
                    style={({ pressed }) => [
                        styles.newRepliesButton,
                        {
                            bottom: showReadingControls
                                ? readingControlsDockHeight + verticalScale(10)
                                : Math.max(insets.bottom, verticalScale(18)),
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
                highestPostNumber={highestPostNumber}
                imageUrls={imageUrls}
                imageViewerRef={imageViewerRef}
                isBookmarkReminderVisible={isBookmarkReminderVisible}
                isJumpVisible={isJumpVisible}
                isNotificationVisible={isNotificationVisible}
                jumpPostNumber={jumpPostNumber}
                notificationOptions={TOPIC_NOTIFICATION_OPTIONS}
                removePostBookmark={removePostBookmark}
                savePostBookmark={savePostBookmark}
                setBookmarkEditor={setBookmarkEditor}
                setIsBookmarkReminderVisible={setIsBookmarkReminderVisible}
                setIsJumpVisible={setIsJumpVisible}
                setIsNotificationVisible={setIsNotificationVisible}
                setJumpPostNumber={setJumpPostNumber}
                submitPostJump={submitPostJump}
                topic={topic}
            />
        </View>
    );
};

export default HarborTopicDetail;
