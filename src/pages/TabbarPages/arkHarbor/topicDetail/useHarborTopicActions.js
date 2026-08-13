import {
    useCallback,
    useRef,
    useState,
} from 'react';

import Toast from 'react-native-simple-toast';

import {
    createHarborPostBookmark,
    deleteHarborBookmark,
    deleteHarborPost,
    deleteHarborTopic,
    fetchCachedHarborFlagTypes,
    flagHarborPost,
    HARBOR_TOPIC_NOTIFICATION_LEVELS,
    likeHarborPost,
    setHarborTopicNotificationLevel,
    toggleHarborPostReaction,
    unlikeHarborPost,
    updateHarborBookmark,
    validateActiveHarborSession,
} from '../../../../utils/harbor/harborApi';
import { publishHarborTopicUpdate } from '../../../../utils/harbor/harborTopicUpdates';
import {
    canDeleteHarborPost,
    canUpdatePostReaction,
    findTopicPost,
    getHarborMutationError,
    getLikeAction,
    isOwnHarborPost,
    formatHarborFlagTypesForPost,
    mergeAvailableFlagTypes,
    updateOptimisticFlag,
    updateOptimisticLike,
    updateOptimisticReaction,
} from './harborTopicModels';

const getPostActionDiagnostics = (
    post,
    currentUsername,
    currentTrustLevel,
) => {
    const likeAction = getLikeAction(post);
    const normalizedCurrentUsername =
        typeof currentUsername === 'string'
            ? currentUsername.toLowerCase()
            : '';
    const normalizedPostUsername =
        typeof post?.username === 'string'
            ? post.username.toLowerCase()
            : '';
    return {
        topicId: post?.topic_id ?? null,
        postId: post?.id ?? null,
        postNumber: post?.post_number ?? null,
        isOwnPost: Boolean(
            normalizedCurrentUsername &&
            normalizedPostUsername &&
            normalizedCurrentUsername === normalizedPostUsername,
        ),
        currentTrustLevel: currentTrustLevel ?? null,
        likeAction: likeAction
            ? {
                acted: Boolean(likeAction.acted),
                canAct: likeAction.can_act ?? null,
                canUndo: likeAction.can_undo ?? null,
                count: likeAction.count ?? null,
            }
            : null,
        currentReaction: post?.current_user_reaction
            ? {
                id: post.current_user_reaction.id ?? null,
                canUndo: post.current_user_reaction.can_undo ?? null,
            }
            : null,
    };
};

const logHarborPostAction = (event, details) => {
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
        return;
    }
    console.warn(`[HarborPostAction] ${event}`, details);
};

const getTopicPostLookup = (topic, postId) => {
    const targetId = Number(postId);
    const posts = topic?.post_stream?.posts;
    const rootPost = Array.isArray(posts)
        ? posts.find(item => Number(item.id) === targetId)
        : null;
    const post = findTopicPost(topic, postId);
    return {
        post,
        postId: Number.isInteger(targetId) ? targetId : postId,
        postNumber: post?.post_number ?? null,
        isNestedView: Boolean(topic?.is_nested_view),
        foundInRoots: Boolean(rootPost),
        foundInNestedTree: Boolean(post),
        rootPostCount: Array.isArray(posts) ? posts.length : 0,
    };
};

const getMutationErrorDiagnostics = error => ({
    httpStatus: error?.response?.status ?? null,
    errorType: error?.response?.data?.error_type ?? null,
    errors: error?.response?.data?.errors ?? null,
    responseError: error?.response?.data?.error ?? null,
    errorCode: error?.code ?? null,
    requestMethod: error?.config?.method ?? null,
    requestPath: error?.config?.url ?? null,
});

const useHarborTopicActions = ({
    currentTrustLevel,
    currentUsername,
    latestTopicRef,
    login,
    sessionStatusRef,
    setTopic,
    t,
    topicId,
    updateTopicPost,
}) => {
    const pendingMutationsRef = useRef(new Set());
    const [bookmarkEditor, setBookmarkEditor] = useState(null);
    const [flagEditor, setFlagEditor] = useState(null);
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

    const requireHarborSignIn = useCallback(async targetPostNumber => {
        if (sessionStatusRef.current === 'signedIn') {
            return true;
        }
        try {
            const postNumber = Number(targetPostNumber);
            return await login({
                routeName: 'HarborTopicDetail',
                params: {
                    topicId,
                    topicTitle: latestTopicRef.current?.title,
                    ...(Number.isInteger(postNumber) && postNumber > 0
                        ? {postNumber}
                        : null),
                },
            });
        } catch (error) {
            Toast.show(t('需要登入 Harbor 才能完成此操作'));
            return false;
        }
    }, [latestTopicRef, login, sessionStatusRef, t, topicId]);

    const showMutationFailure = useCallback(
        (error, { rolledBack = true } = {}) => {
            const reason = getHarborMutationError(
                error,
                t('Harbor 暫時無法完成此操作'),
            );
            Toast.show(
                rolledBack
                    ? t('{{reason}}，已還原狀態，請重試', {
                        reason,
                    })
                    : t('{{reason}}，請重試', { reason }),
            );
        },
        [t],
    );

    const handleMutationFailure = useCallback(
        async (error, context, options) => {
            logHarborPostAction('request.failed', {
                ...context,
                ...getMutationErrorDiagnostics(error),
            });
            if (error?.response?.status === 403) {
                try {
                    const sessionValid =
                        await validateActiveHarborSession();
                    if (sessionValid === true) {
                        logHarborPostAction(
                            'session.valid_after_403',
                            context,
                        );
                    } else if (sessionValid === false) {
                        logHarborPostAction(
                            'session.expired_after_403',
                            context,
                        );
                        Toast.show(t('Harbor 登入已失效，請重新登入。'));
                        return;
                    } else {
                        logHarborPostAction(
                            'session.changed_after_403',
                            context,
                        );
                    }
                } catch (validationError) {
                    logHarborPostAction('session.validation_failed_after_403', {
                        ...context,
                        validationErrorCode: validationError?.code ?? null,
                        validationHttpStatus:
                            validationError?.response?.status ?? null,
                    });
                }
            }
            showMutationFailure(error, options);
        },
        [showMutationFailure, t],
    );

    const deletePost = useCallback(
        async post => {
            if (!(await requireHarborSignIn(post?.post_number))) {
                return false;
            }
            if (!canDeleteHarborPost(post, latestTopicRef.current)) {
                Toast.show(t('你目前沒有權限刪除這篇帖子'));
                return false;
            }

            const key = `delete:${post.id}`;
            if (!beginMutation(key)) {
                return false;
            }

            try {
                const isFirstPost = Number(post.post_number) === 1;
                const deletedPost = isFirstPost
                    ? await deleteHarborTopic(topicId)
                    : await deleteHarborPost(post.id);
                if (isFirstPost) {
                    publishHarborTopicUpdate(topicId, {
                        reloadLists: true,
                        removeFromLists: true,
                    });
                    Toast.show(t('話題已刪除'));
                    return true;
                }

                const previousPostsCount = Number(
                    latestTopicRef.current?.posts_count || 0,
                );
                updateTopicPost(post.id, current => ({
                    ...current,
                    ...(deletedPost?.id ? deletedPost : {}),
                    can_delete: false,
                    can_edit: false,
                    deleted_at:
                        deletedPost?.deleted_at || new Date().toISOString(),
                    user_deleted: deletedPost?.user_deleted ?? true,
                }));
                setTopic(current => ({
                    ...current,
                    posts_count: Math.max(
                        Number(current?.posts_count || 0) - 1,
                        1,
                    ),
                }));
                publishHarborTopicUpdate(topicId, {
                    reloadLists: true,
                    replyCount: Math.max(previousPostsCount - 2, 0),
                });
                Toast.show(t('帖子已刪除'));
                return true;
            } catch (error) {
                await handleMutationFailure(
                    error,
                    {
                        action: 'delete',
                        sessionStatus: sessionStatusRef.current,
                        ...getPostActionDiagnostics(
                            post,
                            currentUsername,
                            currentTrustLevel,
                        ),
                    },
                    { rolledBack: false },
                );
                return false;
            } finally {
                finishMutation(key);
            }
        },
        [
            beginMutation,
            currentTrustLevel,
            currentUsername,
            finishMutation,
            handleMutationFailure,
            latestTopicRef,
            requireHarborSignIn,
            sessionStatusRef,
            setTopic,
            t,
            topicId,
            updateTopicPost,
        ],
    );

    const togglePostLike = useCallback(
        async post => {
            const key = `like:${post.id}`;
            const wasSignedIn = sessionStatusRef.current === 'signedIn';
            logHarborPostAction('like.press', {
                postId: post?.id ?? null,
                postNumber: post?.post_number ?? null,
                sessionStatus: sessionStatusRef.current,
                ...getPostActionDiagnostics(
                    post,
                    currentUsername,
                    currentTrustLevel,
                ),
            });
            if (
                !(await requireHarborSignIn(post?.post_number)) ||
                !beginMutation(key)
            ) {
                logHarborPostAction('like.skipped', {
                    postId: post?.id ?? null,
                    reason: sessionStatusRef.current !== 'signedIn'
                        ? 'sign_in_required_or_cancelled'
                        : 'mutation_pending',
                });
                return;
            }

            const likeAction = getLikeAction(post);
            const liked = Boolean(likeAction?.acted);
            if (
                wasSignedIn &&
                ((!liked && !likeAction?.can_act) ||
                    (liked && !likeAction?.can_undo))
            ) {
                logHarborPostAction('blocked.client_permission', {
                    action: liked ? 'unlike' : 'like',
                    reason: liked
                        ? 'like_can_undo_false_or_missing'
                        : 'like_can_act_false_or_missing',
                    sessionStatus: sessionStatusRef.current,
                    ...getPostActionDiagnostics(
                        post,
                        currentUsername,
                        currentTrustLevel,
                    ),
                });
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
                await handleMutationFailure(error, {
                    action: nextLiked ? 'like' : 'unlike',
                    sessionStatus: sessionStatusRef.current,
                    ...getPostActionDiagnostics(
                        post,
                        currentUsername,
                        currentTrustLevel,
                    ),
                });
            } finally {
                finishMutation(key);
            }
        },
        [
            beginMutation,
            currentTrustLevel,
            currentUsername,
            finishMutation,
            latestTopicRef,
            requireHarborSignIn,
            sessionStatusRef,
            setTopic,
            handleMutationFailure,
            t,
            topicId,
            updateTopicPost,
        ],
    );

    const explainPostReactionDisabled = useCallback(
        postId => {
            const {post, ...lookup} = getTopicPostLookup(
                latestTopicRef.current,
                postId,
            );
            logHarborPostAction('reaction.disabled_press', lookup);
            if (!post) {
                logHarborPostAction('blocked.post_not_found', {
                    action: 'reaction',
                    reason: 'nested_or_unloaded_post',
                    ...lookup,
                });
                return;
            }
            const diagnostics = getPostActionDiagnostics(
                post,
                currentUsername,
                currentTrustLevel,
            );
            logHarborPostAction('blocked.user_feedback', {
                action: 'reaction',
                reason: diagnostics.isOwnPost
                    ? 'own_post'
                    : 'post_permission',
                sessionStatus: sessionStatusRef.current,
                ...diagnostics,
                ...lookup,
            });
            if (diagnostics.isOwnPost) {
                Toast.show(t('你不能回應自己的帖子'));
                return;
            }
            if (post.current_user_reaction?.can_undo === false) {
                Toast.show(t('你目前不能取消這個回應'));
                return;
            }
            Toast.show(t('你目前沒有權限回應這篇帖子'));
        },
        [
            currentTrustLevel,
            currentUsername,
            latestTopicRef,
            sessionStatusRef,
            t,
        ],
    );

    const selectPostReaction = useCallback(
        async (postId, reactionId) => {
            const {post, ...lookup} = getTopicPostLookup(
                latestTopicRef.current,
                postId,
            );
            logHarborPostAction('reaction.press', {
                reactionId,
                ...lookup,
            });
            if (!post) {
                logHarborPostAction('blocked.post_not_found', {
                    action: 'reaction',
                    reactionId,
                    reason: 'nested_or_unloaded_post',
                    ...lookup,
                });
                return;
            }
            const wasSignedIn = sessionStatusRef.current === 'signedIn';
            if (!(await requireHarborSignIn(post?.post_number))) {
                return;
            }
            if (
                post?.current_user_reaction &&
                post.current_user_reaction.can_undo === false
            ) {
                logHarborPostAction('blocked.client_permission', {
                    action: 'reaction',
                    reactionId,
                    reason: 'reaction_can_undo_false',
                    sessionStatus: sessionStatusRef.current,
                    ...getPostActionDiagnostics(
                        post,
                        currentUsername,
                        currentTrustLevel,
                    ),
                });
                Toast.show(t('你目前不能取消這個回應'));
                return;
            }
            if (wasSignedIn && !canUpdatePostReaction(post)) {
                logHarborPostAction('blocked.client_permission', {
                    action: 'reaction',
                    reactionId,
                    reason: 'like_can_act_false_or_missing',
                    sessionStatus: sessionStatusRef.current,
                    ...getPostActionDiagnostics(
                        post,
                        currentUsername,
                        currentTrustLevel,
                    ),
                });
                Toast.show(t('你目前沒有權限回應這篇帖子'));
                return;
            }

            const key = `reaction:${post.id}`;
            if (!beginMutation(key)) {
                logHarborPostAction('reaction.skipped', {
                    reactionId,
                    reason: 'mutation_pending',
                    ...lookup,
                });
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
                logHarborPostAction('reaction.success', {
                    reactionId,
                    ...lookup,
                });
            } catch (error) {
                updateTopicPost(post.id, current => ({
                    ...current,
                    reactions: post.reactions,
                    current_user_reaction: post.current_user_reaction,
                    reaction_users_count: post.reaction_users_count,
                    like_count: post.like_count,
                    actions_summary: post.actions_summary,
                }));
                await handleMutationFailure(error, {
                    action: 'reaction',
                    reactionId,
                    sessionStatus: sessionStatusRef.current,
                    ...getPostActionDiagnostics(
                        post,
                        currentUsername,
                        currentTrustLevel,
                    ),
                });
            } finally {
                finishMutation(key);
            }
        },
        [
            beginMutation,
            currentTrustLevel,
            currentUsername,
            finishMutation,
            latestTopicRef,
            requireHarborSignIn,
            handleMutationFailure,
            t,
            sessionStatusRef,
            updateTopicPost,
        ],
    );

    const openBookmarkEditor = useCallback(
        async post => {
            if (!(await requireHarborSignIn(post?.post_number))) {
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

    const openFlagEditor = useCallback(
        async post => {
            if (!(await requireHarborSignIn(post?.post_number))) {
                return;
            }
            if (isOwnHarborPost(post, currentUsername)) {
                Toast.show(t('不能舉報自己的帖子'));
                return;
            }

            const latestPost =
                latestTopicRef.current?.post_stream?.posts?.find(
                    item => Number(item?.id) === Number(post?.id),
                ) || post;

            try {
                const flagTypes = await fetchCachedHarborFlagTypes();
                const availableTypes = formatHarborFlagTypesForPost(
                    mergeAvailableFlagTypes(flagTypes, latestPost),
                    latestPost,
                );
                if (availableTypes.length === 0) {
                    Toast.show(t('你目前無法舉報這篇帖子'));
                    return;
                }
                setFlagEditor({
                    post: latestPost,
                    flagTypes: availableTypes,
                });
            } catch (error) {
                showMutationFailure(error, { rolledBack: false });
            }
        },
        [
            currentUsername,
            latestTopicRef,
            requireHarborSignIn,
            showMutationFailure,
            t,
        ],
    );

    const submitPostFlag = useCallback(
        async ({ postActionTypeId, message } = {}) => {
            const editor = flagEditor;
            const post = editor?.post;
            if (!post?.id) {
                return false;
            }

            const typeId = Number(postActionTypeId);
            const selectedType = (editor.flagTypes || []).find(
                type => Number(type?.id) === typeId,
            );
            if (!selectedType) {
                Toast.show(t('請選擇舉報原因'));
                return false;
            }
            const trimmedMessage =
                typeof message === 'string' ? message.trim() : '';
            if (selectedType.requiresMessage && !trimmedMessage) {
                Toast.show(t('請填寫舉報說明'));
                return false;
            }

            const key = `flag:${post.id}`;
            if (!beginMutation(key)) {
                return false;
            }

            try {
                await flagHarborPost(post.id, {
                    postActionTypeId: typeId,
                    message: trimmedMessage,
                });
                updateTopicPost(post.id, current =>
                    updateOptimisticFlag(current, typeId),
                );
                setFlagEditor(null);
                Toast.show(t('已送出檢舉'));
                return true;
            } catch (error) {
                await handleMutationFailure(
                    error,
                    {
                        action: 'flag',
                        sessionStatus: sessionStatusRef.current,
                        postActionTypeId: typeId,
                        ...getPostActionDiagnostics(
                            post,
                            currentUsername,
                            currentTrustLevel,
                        ),
                    },
                    { rolledBack: false },
                );
                return false;
            } finally {
                finishMutation(key);
            }
        },
        [
            beginMutation,
            currentTrustLevel,
            currentUsername,
            finishMutation,
            flagEditor,
            handleMutationFailure,
            sessionStatusRef,
            t,
            updateTopicPost,
        ],
    );

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

    return {
        bookmarkEditor,
        changeNotificationLevel,
        deletePost,
        explainPostReactionDisabled,
        flagEditor,
        isBookmarkReminderVisible,
        isNotificationVisible,
        openBookmarkEditor,
        openFlagEditor,
        openNotificationLevels,
        pendingMutations,
        removePostBookmark,
        savePostBookmark,
        selectPostReaction,
        setBookmarkEditor,
        setFlagEditor,
        setIsBookmarkReminderVisible,
        setIsNotificationVisible,
        submitPostFlag,
        togglePostLike,
    };
};

export default useHarborTopicActions;
