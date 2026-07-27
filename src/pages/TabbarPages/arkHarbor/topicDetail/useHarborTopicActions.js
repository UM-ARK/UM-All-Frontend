import {
    useCallback,
    useRef,
    useState,
} from 'react';

import Toast from 'react-native-simple-toast';

import {
    createHarborPostBookmark,
    deleteHarborBookmark,
    HARBOR_TOPIC_NOTIFICATION_LEVELS,
    likeHarborPost,
    markHarborTopicUnread,
    setHarborTopicNotificationLevel,
    toggleHarborPostReaction,
    unlikeHarborPost,
    updateHarborBookmark,
} from '../../../../utils/harbor/harborApi';
import { publishHarborTopicUpdate } from '../../../../utils/harbor/harborTopicUpdates';
import {
    getHarborMutationError,
    getLikeAction,
    updateOptimisticLike,
    updateOptimisticReaction,
} from './harborTopicModels';

const useHarborTopicActions = ({
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
}) => {
    const pendingMutationsRef = useRef(new Set());
    const [bookmarkEditor, setBookmarkEditor] = useState(null);
    const [isBookmarkReminderVisible, setIsBookmarkReminderVisible] =
        useState(false);
    const [isNotificationVisible, setIsNotificationVisible] = useState(false);
    const [pendingMutations, setPendingMutations] = useState({});

    const beginMutation = useCallback(key => {
        if (pendingMutationsRef.current.has(key)) {
            return false;
        }
        pendingMutationsRef.current.add(key);
        setPendingMutations(current => ({ ...current, [key]: true }));
        return true;
    }, []);

    const finishMutation = useCallback(key => {
        pendingMutationsRef.current.delete(key);
        setPendingMutations(current => {
            const next = { ...current };
            delete next[key];
            return next;
        });
    }, []);

    const requireHarborSignIn = useCallback(async () => {
        if (sessionStatusRef.current === 'signedIn') {
            return true;
        }
        try {
            await login();
            return true;
        } catch (error) {
            Toast.show(t('需要登入 Harbor 才能完成此操作'));
            return false;
        }
    }, [login, sessionStatusRef, t]);

    const showMutationFailure = useCallback(
        error => {
            const reason = getHarborMutationError(
                error,
                t('Harbor 暫時無法完成此操作'),
            );
            Toast.show(
                t('{{reason}}，已還原狀態，請重試', {
                    reason,
                }),
            );
        },
        [t],
    );

    const togglePostLike = useCallback(
        async post => {
            const key = `like:${post.id}`;
            const wasSignedIn = sessionStatusRef.current === 'signedIn';
            if (!(await requireHarborSignIn()) || !beginMutation(key)) {
                return;
            }

            const likeAction = getLikeAction(post);
            const liked = Boolean(likeAction?.acted);
            if (
                wasSignedIn &&
                ((!liked && !likeAction?.can_act) ||
                    (liked && !likeAction?.can_undo))
            ) {
                finishMutation(key);
                Toast.show(t('你目前沒有權限變更這篇帖子的讚好'));
                return;
            }

            const nextLiked = !liked;
            const previousTopicLikeCount = Number(
                latestTopicRef.current?.like_count || 0,
            );
            const topicLikeDelta = nextLiked ? 1 : -1;
            updateTopicPost(post.id, current =>
                updateOptimisticLike(current, nextLiked),
            );
            setTopic(current => ({
                ...current,
                like_count: Math.max(
                    0,
                    Number(current?.like_count || 0) + topicLikeDelta,
                ),
            }));
            publishHarborTopicUpdate(topicId, {
                likeCount: Math.max(
                    0,
                    previousTopicLikeCount + topicLikeDelta,
                ),
            });

            try {
                const updatedPost = nextLiked
                    ? await likeHarborPost(post.id)
                    : await unlikeHarborPost(post.id);
                updateTopicPost(post.id, current => ({
                    ...current,
                    ...updatedPost,
                }));
            } catch (error) {
                updateTopicPost(post.id, current => ({
                    ...current,
                    like_count: post.like_count,
                    actions_summary: post.actions_summary,
                }));
                setTopic(current => ({
                    ...current,
                    like_count: previousTopicLikeCount,
                }));
                publishHarborTopicUpdate(topicId, {
                    likeCount: previousTopicLikeCount,
                });
                showMutationFailure(error);
            } finally {
                finishMutation(key);
            }
        },
        [
            beginMutation,
            finishMutation,
            latestTopicRef,
            requireHarborSignIn,
            sessionStatusRef,
            setTopic,
            showMutationFailure,
            t,
            topicId,
            updateTopicPost,
        ],
    );

    const selectPostReaction = useCallback(
        async (postId, reactionId) => {
            const post = latestTopicRef.current?.post_stream?.posts?.find(
                item => Number(item.id) === Number(postId),
            );
            if (!post) {
                return;
            }
            if (!(await requireHarborSignIn())) {
                return;
            }
            if (
                post?.current_user_reaction &&
                post.current_user_reaction.can_undo === false
            ) {
                Toast.show(t('你目前不能取消這個回應'));
                return;
            }

            const key = `reaction:${post.id}`;
            if (!beginMutation(key)) {
                return;
            }
            updateTopicPost(post.id, current =>
                updateOptimisticReaction(current, reactionId),
            );
            try {
                const updatedPost = await toggleHarborPostReaction(
                    post.id,
                    reactionId,
                );
                updateTopicPost(post.id, current => ({
                    ...current,
                    ...updatedPost,
                }));
            } catch (error) {
                updateTopicPost(post.id, current => ({
                    ...current,
                    reactions: post.reactions,
                    current_user_reaction: post.current_user_reaction,
                    reaction_users_count: post.reaction_users_count,
                    like_count: post.like_count,
                    actions_summary: post.actions_summary,
                }));
                showMutationFailure(error);
            } finally {
                finishMutation(key);
            }
        },
        [
            beginMutation,
            finishMutation,
            latestTopicRef,
            requireHarborSignIn,
            showMutationFailure,
            t,
            updateTopicPost,
        ],
    );

    const openBookmarkEditor = useCallback(
        async post => {
            if (!(await requireHarborSignIn())) {
                return;
            }
            setBookmarkEditor({
                postId: post.id,
                bookmarkId: post.bookmark_id || null,
                name: post.bookmark_name || '',
                reminderAt: post.bookmark_reminder_at || null,
                previous: {
                    bookmarked: Boolean(post.bookmarked),
                    bookmark_id: post.bookmark_id || null,
                    bookmark_name: post.bookmark_name || null,
                    bookmark_reminder_at: post.bookmark_reminder_at || null,
                },
            });
        },
        [requireHarborSignIn],
    );

    const savePostBookmark = useCallback(async () => {
        if (!bookmarkEditor) {
            return;
        }
        const editor = bookmarkEditor;
        const key = `bookmark:${editor.postId}`;
        if (!beginMutation(key)) {
            return;
        }
        setBookmarkEditor(null);
        updateTopicPost(editor.postId, current => ({
            ...current,
            bookmarked: true,
            bookmark_id:
                editor.bookmarkId || `pending-bookmark-${editor.postId}`,
            bookmark_name: editor.name.trim() || null,
            bookmark_reminder_at: editor.reminderAt,
        }));

        try {
            if (editor.bookmarkId) {
                await updateHarborBookmark(editor.bookmarkId, {
                    name: editor.name,
                    reminderAt: editor.reminderAt,
                });
            } else {
                const result = await createHarborPostBookmark(editor.postId, {
                    name: editor.name,
                    reminderAt: editor.reminderAt,
                });
                if (!result?.id) {
                    throw new Error(t('Harbor 沒有返回收藏狀態'));
                }
                updateTopicPost(editor.postId, current => ({
                    ...current,
                    bookmark_id: result.id,
                }));
            }
            Toast.show(t('收藏已儲存'));
        } catch (error) {
            updateTopicPost(editor.postId, current => ({
                ...current,
                ...editor.previous,
            }));
            showMutationFailure(error);
        } finally {
            finishMutation(key);
        }
    }, [
        beginMutation,
        bookmarkEditor,
        finishMutation,
        showMutationFailure,
        t,
        updateTopicPost,
    ]);

    const removePostBookmark = useCallback(async () => {
        if (!bookmarkEditor?.bookmarkId) {
            return;
        }
        const editor = bookmarkEditor;
        const key = `bookmark:${editor.postId}`;
        if (!beginMutation(key)) {
            return;
        }
        setBookmarkEditor(null);
        updateTopicPost(editor.postId, current => ({
            ...current,
            bookmarked: false,
            bookmark_id: null,
            bookmark_name: null,
            bookmark_reminder_at: null,
        }));

        try {
            await deleteHarborBookmark(editor.bookmarkId);
            Toast.show(t('已取消收藏'));
        } catch (error) {
            updateTopicPost(editor.postId, current => ({
                ...current,
                ...editor.previous,
            }));
            showMutationFailure(error);
        } finally {
            finishMutation(key);
        }
    }, [
        beginMutation,
        bookmarkEditor,
        finishMutation,
        showMutationFailure,
        t,
        updateTopicPost,
    ]);

    const openNotificationLevels = useCallback(async () => {
        if (await requireHarborSignIn()) {
            setIsNotificationVisible(true);
        }
    }, [requireHarborSignIn]);

    const changeNotificationLevel = useCallback(
        async level => {
            setIsNotificationVisible(false);
            const key = `notification:${topicId}`;
            if (!beginMutation(key)) {
                return;
            }
            const previousLevel = Number(
                latestTopicRef.current?.details?.notification_level ??
                    HARBOR_TOPIC_NOTIFICATION_LEVELS.normal,
            );
            const previousMuted = Boolean(latestTopicRef.current?.muted);
            const muted = level === HARBOR_TOPIC_NOTIFICATION_LEVELS.muted;
            setTopic(current => ({
                ...current,
                muted,
                details: {
                    ...current.details,
                    notification_level: level,
                },
            }));
            publishHarborTopicUpdate(topicId, {
                muted,
                statuses: {
                    ...(latestTopicRef.current?.statuses || {}),
                    muted,
                },
            });

            try {
                await setHarborTopicNotificationLevel(topicId, level);
                Toast.show(t('話題通知設定已更新'));
            } catch (error) {
                setTopic(current => ({
                    ...current,
                    muted: previousMuted,
                    details: {
                        ...current.details,
                        notification_level: previousLevel,
                    },
                }));
                publishHarborTopicUpdate(topicId, {
                    muted: previousMuted,
                    statuses: {
                        ...(latestTopicRef.current?.statuses || {}),
                        muted: previousMuted,
                    },
                });
                showMutationFailure(error);
            } finally {
                finishMutation(key);
            }
        },
        [
            beginMutation,
            finishMutation,
            latestTopicRef,
            setTopic,
            showMutationFailure,
            t,
            topicId,
        ],
    );

    const markTopicUnread = useCallback(async () => {
        if (!(await requireHarborSignIn())) {
            return;
        }
        const key = `unread:${topicId}`;
        if (!beginMutation(key)) {
            return;
        }
        const currentTopic = latestTopicRef.current;
        const previous = {
            last_read_post_number: currentTopic?.last_read_post_number,
            unread_posts: currentTopic?.unread_posts,
            new_posts: currentTopic?.new_posts,
            unread: currentTopic?.unread,
        };
        const previousUnreadAfterPostNumber = unreadAfterPostNumber;
        setUnreadAfterPostNumber(0);
        setTopic(current => ({
            ...current,
            last_read_post_number: 0,
            unread_posts: highestPostNumber,
            unread: true,
        }));
        publishHarborTopicUpdate(topicId, {
            unreadCount: highestPostNumber,
            lastReadPostNumber: 0,
            isUnread: true,
        });

        try {
            await markHarborTopicUnread(topicId);
            publishHarborTopicUpdate(topicId, { reloadLists: true });
            Toast.show(t('話題已標為未讀'));
        } catch (error) {
            setUnreadAfterPostNumber(previousUnreadAfterPostNumber);
            setTopic(current => ({ ...current, ...previous }));
            publishHarborTopicUpdate(topicId, {
                unreadCount: Math.max(
                    Number(previous.unread_posts ?? previous.new_posts ?? 0),
                    0,
                ),
                lastReadPostNumber:
                    Number(previous.last_read_post_number) || null,
                isUnread: Boolean(
                    previous.unread ||
                        Number(
                            previous.unread_posts ?? previous.new_posts ?? 0,
                        ) > 0,
                ),
            });
            showMutationFailure(error);
        } finally {
            finishMutation(key);
        }
    }, [
        beginMutation,
        finishMutation,
        highestPostNumber,
        latestTopicRef,
        requireHarborSignIn,
        setTopic,
        setUnreadAfterPostNumber,
        showMutationFailure,
        t,
        topicId,
        unreadAfterPostNumber,
    ]);

    return {
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
    };
};

export default useHarborTopicActions;
