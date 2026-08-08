import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import Toast from 'react-native-simple-toast';

import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import {
    fetchHarborNestedPostChildren,
    fetchHarborNestedTopicRoots,
    fetchHarborTopic,
    fetchHarborTopicPosts,
} from '../../../../utils/harbor/harborApi';
import {
    appendTopicPosts,
    collectNestedPosts,
    extractPostImages,
    flattenNestedPosts,
    getNestedReplyCount,
    getNestedReplyPreviewLimit,
    isCanceledRequest,
    mergeTopicWindow,
    NESTED_REPLY_BATCH_SIZE,
    updateNestedPostTree,
} from './harborTopicModels';

const TOPIC_POST_BATCH_SIZE = 20;

const loadNestedReplyPreviews = async ({signal, topic, topicId}) => {
    const previewLimit = getNestedReplyPreviewLimit(topic?.posts_count);
    const topicPosts = topic?.post_stream?.posts;
    if (
        !topic?.is_nested_view ||
        previewLimit <= 0 ||
        !Array.isArray(topicPosts)
    ) {
        return topic;
    }

    const previewRoots = topicPosts.filter(post => {
        const replyCount = getNestedReplyCount(post);
        return (
            Number(post?.post_number) > 1 &&
            replyCount > 0 &&
            (!Array.isArray(post.children) ||
                post.children.length < Math.min(previewLimit, replyCount))
        );
    });
    if (previewRoots.length === 0) {
        return topic;
    }

    const responses = await Promise.all(
        previewRoots.map(async post => {
            try {
                const response = await fetchHarborNestedPostChildren(
                    topicId,
                    Number(post.post_number),
                    {
                        depth: 1,
                        signal,
                        sort: topic.nested_sort || 'old',
                    },
                );
                return {postId: post.id, response};
            } catch (error) {
                if (isCanceledRequest(error, signal)) {
                    throw error;
                }
                return null;
            }
        }),
    );

    const posts = responses.reduce((currentPosts, result) => {
        if (!result) {
            return currentPosts;
        }
        return updateNestedPostTree(
            currentPosts,
            result.postId,
            post => ({
                ...post,
                __harborNestedChildrenFetched: true,
                __harborNestedHasMoreChildren: Boolean(
                    result.response.has_more,
                ),
                children: result.response.children,
            }),
        );
    }, topicPosts);

    return {
        ...topic,
        post_stream: {
            ...topic.post_stream,
            posts,
        },
    };
};

const useHarborTopicData = ({
    onNewRepliesLoaded,
    onResetReading,
    sessionStatus,
    sessionStatusRef,
    t,
    topicId,
}) => {
    const requestGenerationRef = useRef(0);
    const controllerRef = useRef(null);
    const latestTopicRef = useRef(null);
    const trackedPageViewTopicIdRef = useRef(null);
    const pendingTopicRef = useRef(null);
    const adjacentLoadingRef = useRef({ previous: false, next: false });
    const [topic, setTopic] = useState(null);
    const [topicSessionStatus, setTopicSessionStatus] = useState(sessionStatus);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
    const [isLoadingNext, setIsLoadingNext] = useState(false);
    const [pendingNewPostIds, setPendingNewPostIds] = useState([]);
    const [nestedReplyLimits, setNestedReplyLimits] = useState(new Map());
    const [pendingNestedPostNumbers, setPendingNestedPostNumbers] =
        useState([]);
    const [unreadAfterPostNumber, setUnreadAfterPostNumber] = useState(-1);
    const [errorMessage, setErrorMessage] = useState('');

    const topicPosts = useMemo(() => {
        const rawPosts = topic?.post_stream?.posts;
        if (!Array.isArray(rawPosts)) {
            return [];
        }
        return rawPosts.filter(post => post?.id);
    }, [topic]);

    const posts = useMemo(() => {
        if (!topic?.is_nested_view) {
            return topicPosts;
        }
        return flattenNestedPosts(
            topicPosts,
            nestedReplyLimits,
            getNestedReplyPreviewLimit(topic?.posts_count),
        );
    }, [nestedReplyLimits, topic?.is_nested_view, topic?.posts_count, topicPosts]);

    const validReactions = useMemo(() => {
        return Array.isArray(topic?.valid_reactions)
            ? topic.valid_reactions.filter(
                reaction =>
                    typeof reaction === 'string' && reaction.trim().length > 0,
            )
            : [];
    }, [topic?.valid_reactions]);

    const listData = useMemo(() => {
        if (!topic) {
            return [];
        }
        // 話題標題已併入 1 樓卡片，列表僅渲染帖子
        return posts;
    }, [posts, topic]);

    const highestPostNumber = useMemo(() => {
        return Math.max(
            Number(topic?.highest_post_number || 0),
            Number(topic?.posts_count || 0),
            ...posts.map(post => Number(post.post_number || 0)),
        );
    }, [posts, topic?.highest_post_number, topic?.posts_count]);

    const canReplyToTopic =
        !topic?.closed &&
        !topic?.archived &&
        (topicSessionStatus !== 'signedIn' ||
            (topic?.can_create_post !== false &&
                topic?.details?.can_create_post !== false));

    const imageUrls = useMemo(() => {
        const imagePosts = topic?.is_nested_view
            ? collectNestedPosts(topicPosts)
            : posts;
        const urls = imagePosts.flatMap(post =>
            extractPostImages(post?.cooked),
        );
        return [...new Set(urls)];
    }, [posts, topic?.is_nested_view, topicPosts]);

    useEffect(() => {
        latestTopicRef.current = topic;
    }, [topic]);

    useEffect(() => {
        sessionStatusRef.current = sessionStatus;
    }, [sessionStatus, sessionStatusRef]);

    const updateTopicPost = useCallback((postId, updater) => {
        setTopic(current => {
            if (!current) {
                return current;
            }
            return {
                ...current,
                post_stream: {
                    ...current.post_stream,
                    posts: current.is_nested_view
                        ? updateNestedPostTree(
                            current.post_stream?.posts,
                            postId,
                            updater,
                        )
                        : (current.post_stream?.posts || []).map(post =>
                            Number(post.id) === Number(postId)
                                ? updater(post)
                                : post,
                        ),
                },
            };
        });
    }, []);

    const loadTopic = useCallback(
        async ({ refresh = false } = {}) => {
            const requestGeneration = ++requestGenerationRef.current;
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;
            const requestSessionStatus = sessionStatusRef.current;

            if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setErrorMessage('');

            if (!Number.isInteger(topicId) || topicId <= 0) {
                setErrorMessage(t('帖子地址無效'));
                setIsLoading(false);
                setIsRefreshing(false);
                controllerRef.current = null;
                return;
            }

            try {
                const shouldTrackPageView =
                    !refresh &&
                    trackedPageViewTopicIdRef.current !== topicId;
                let nextTopic = await fetchHarborTopic(topicId, {
                    signal: controller.signal,
                    trackPageView: shouldTrackPageView,
                });
                nextTopic = await loadNestedReplyPreviews({
                    signal: controller.signal,
                    topic: nextTopic,
                    topicId,
                });
                if (shouldTrackPageView) {
                    trackedPageViewTopicIdRef.current = topicId;
                }
                if (
                    controller.signal.aborted ||
                    requestGeneration !== requestGenerationRef.current
                ) {
                    return;
                }
                setTopicSessionStatus(requestSessionStatus);

                if (refresh) {
                    if (nextTopic.is_nested_view) {
                        pendingTopicRef.current = null;
                        setPendingNewPostIds([]);
                        setTopic(nextTopic);
                        return;
                    }
                    const currentTopic = latestTopicRef.current;
                    const currentStream = currentTopic?.post_stream?.stream || [];
                    const currentIds = new Set(currentStream.map(Number));
                    const nextStream = nextTopic.post_stream?.stream || [];
                    const newPostIds = nextStream.filter(postId => {
                        return !currentIds.has(Number(postId));
                    });

                    if (newPostIds.length > 0) {
                        pendingTopicRef.current = nextTopic;
                        setPendingNewPostIds(newPostIds);
                        setTopic(current => ({
                            ...current,
                            ...nextTopic,
                            post_stream: current.post_stream,
                        }));
                    } else {
                        setTopic(current =>
                            mergeTopicWindow(current, nextTopic),
                        );
                    }
                    return;
                }

                const serverLastReadPostNumber = Number(
                    nextTopic.last_read_post_number || 0,
                );
                const serverUnreadCount = Number(
                    nextTopic.unread_posts ?? nextTopic.new_posts ?? 0,
                );
                setUnreadAfterPostNumber(
                    serverUnreadCount > 0 ? serverLastReadPostNumber : -1,
                );
                onResetReading();
                latestTopicRef.current = nextTopic;
                setTopic(nextTopic);
            } catch (error) {
                if (!isCanceledRequest(error, controller.signal)) {
                    setErrorMessage(t('帖子載入失敗，請檢查網絡後再試'));
                    if (refresh) {
                        Toast.show(t('帖子更新失敗，請稍後再試'));
                    }
                }
            } finally {
                if (requestGeneration === requestGenerationRef.current) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                    controllerRef.current = null;
                }
            }
        },
        [onResetReading, sessionStatusRef, t, topicId],
    );

    useEffect(() => {
        setNestedReplyLimits(new Map());
        setPendingNestedPostNumbers([]);
    }, [topicId]);

    useEffect(() => {
        if (
            topic?.id &&
            topicSessionStatus !== sessionStatus
        ) {
            loadTopic({ refresh: true });
        }
    }, [loadTopic, sessionStatus, topic?.id, topicSessionStatus]);

    useEffect(() => {
        logToFirebase('openPage', {
            page: 'HarborTopicDetail',
            topicId,
        });
        loadTopic();

        return () => {
            requestGenerationRef.current += 1;
            controllerRef.current?.abort();
        };
    }, [loadTopic, topicId]);

    const loadAdjacentPosts = useCallback(
        async direction => {
            if (adjacentLoadingRef.current[direction]) {
                return;
            }
            const currentTopic = latestTopicRef.current;
            if (currentTopic?.is_nested_view) {
                if (
                    direction === 'previous' ||
                    !currentTopic.nested_has_more_roots
                ) {
                    return;
                }
                adjacentLoadingRef.current[direction] = true;
                setIsLoadingNext(true);
                try {
                    const nextPage = Number(
                        currentTopic.nested_page || 0,
                    ) + 1;
                    const nextRoots = await fetchHarborNestedTopicRoots(
                        topicId,
                        {
                            page: nextPage,
                            sort: currentTopic.nested_sort || 'old',
                        },
                    );
                    const previewTopic = await loadNestedReplyPreviews({
                        topic: {
                            ...currentTopic,
                            post_stream: {
                                ...currentTopic.post_stream,
                                posts: nextRoots.roots,
                            },
                        },
                        topicId,
                    });
                    setTopic(current => {
                        if (!current?.is_nested_view) {
                            return current;
                        }
                        const currentPosts =
                            current.post_stream?.posts || [];
                        const currentIds = new Set(
                            currentPosts.map(post => Number(post.id)),
                        );
                        const roots = previewTopic.post_stream.posts.filter(
                            post => {
                                return !currentIds.has(Number(post.id));
                            },
                        );
                        const nestedPosts = [...currentPosts, ...roots];
                        return {
                            ...current,
                            nested_has_more_roots: Boolean(
                                nextRoots.has_more_roots,
                            ),
                            nested_page: Number(
                                nextRoots.page || nextPage,
                            ),
                            post_stream: {
                                ...current.post_stream,
                                stream: nestedPosts.map(post => post.id),
                                posts: nestedPosts,
                            },
                            ...(nextRoots.suggested_topics
                                ? {
                                    suggested_topics:
                                        nextRoots.suggested_topics,
                                }
                                : {}),
                        };
                    });
                } catch (error) {
                    if (!isCanceledRequest(error)) {
                        Toast.show(t('帖子載入失敗，請稍後再試'));
                    }
                } finally {
                    adjacentLoadingRef.current[direction] = false;
                    setIsLoadingNext(false);
                }
                return;
            }
            const stream = currentTopic?.post_stream?.stream || [];
            const loadedPosts = currentTopic?.post_stream?.posts || [];
            const streamIndex = new Map(
                stream.map((postId, index) => [Number(postId), index]),
            );
            const loadedIndexes = loadedPosts
                .map(post => streamIndex.get(Number(post.id)))
                .filter(Number.isInteger)
                .sort((left, right) => left - right);
            if (loadedIndexes.length === 0) {
                return;
            }

            let postIds = [];
            if (direction === 'previous') {
                const firstLoadedIndex = loadedIndexes[0];
                postIds = stream.slice(
                    Math.max(firstLoadedIndex - TOPIC_POST_BATCH_SIZE, 0),
                    firstLoadedIndex,
                );
            } else {
                const loadedIndexSet = new Set(loadedIndexes);
                let firstMissingIndex = loadedIndexes[loadedIndexes.length - 1] + 1;
                for (
                    let index = loadedIndexes[0];
                    index <= loadedIndexes[loadedIndexes.length - 1];
                    index += 1
                ) {
                    if (!loadedIndexSet.has(index)) {
                        firstMissingIndex = index;
                        break;
                    }
                }
                postIds = stream.slice(
                    firstMissingIndex,
                    firstMissingIndex + TOPIC_POST_BATCH_SIZE,
                );
            }

            const loadedIds = new Set(loadedPosts.map(post => Number(post.id)));
            postIds = postIds.filter(postId => !loadedIds.has(Number(postId)));
            if (postIds.length === 0) {
                return;
            }

            adjacentLoadingRef.current[direction] = true;
            if (direction === 'previous') {
                setIsLoadingPrevious(true);
            } else {
                setIsLoadingNext(true);
            }
            try {
                const nextPosts = await fetchHarborTopicPosts(
                    topicId,
                    postIds,
                );
                setTopic(current => appendTopicPosts(current, nextPosts));
            } catch (error) {
                if (!isCanceledRequest(error)) {
                    Toast.show(t('帖子載入失敗，請稍後再試'));
                }
            } finally {
                adjacentLoadingRef.current[direction] = false;
                if (direction === 'previous') {
                    setIsLoadingPrevious(false);
                } else {
                    setIsLoadingNext(false);
                }
            }
        },
        [t, topicId],
    );

    const toggleNestedReplies = useCallback(
        async post => {
            const postNumber = Number(post?.post_number);
            const nestedReplyCount = Number(
                post?.__harborNestedReplyCount || 0,
            );
            if (
                !Number.isInteger(postNumber) ||
                postNumber <= 1 ||
                nestedReplyCount <= 0
            ) {
                return;
            }
            const visibleReplyCount = Number(
                post.__harborNestedVisibleReplyCount || 0,
            );
            const currentReplyLimit = Number(
                nestedReplyLimits.get(postNumber) || visibleReplyCount,
            );
            if (
                visibleReplyCount > 0 &&
                visibleReplyCount >= nestedReplyCount
            ) {
                setNestedReplyLimits(current => {
                    const next = new Map(current);
                    next.delete(postNumber);
                    return next;
                });
                return;
            }

            const nextReplyLimit = Math.min(
                currentReplyLimit + NESTED_REPLY_BATCH_SIZE,
                nestedReplyCount,
            );
            const revealReplies = () => {
                setNestedReplyLimits(current => {
                    const next = new Map(current);
                    next.set(postNumber, nextReplyLimit);
                    return next;
                });
            };
            if (
                post.__harborNestedChildrenFetched ||
                pendingNestedPostNumbers.includes(postNumber)
            ) {
                revealReplies();
                return;
            }

            setPendingNestedPostNumbers(current => [
                ...current,
                postNumber,
            ]);
            try {
                const response = await fetchHarborNestedPostChildren(
                    topicId,
                    postNumber,
                    {
                        depth: Number(post.__harborNestedDepth || 0) + 1,
                        sort:
                            latestTopicRef.current?.nested_sort || 'old',
                    },
                );
                setTopic(current => {
                    if (!current?.is_nested_view) {
                        return current;
                    }
                    return {
                        ...current,
                        post_stream: {
                            ...current.post_stream,
                            posts: updateNestedPostTree(
                                current.post_stream?.posts,
                                post.id,
                                currentPost => ({
                                    ...currentPost,
                                    __harborNestedChildrenFetched: true,
                                    __harborNestedHasMoreChildren: Boolean(
                                        response.has_more,
                                    ),
                                    children: response.children,
                                }),
                            ),
                        },
                    };
                });
                revealReplies();
            } catch (error) {
                if (isCanceledRequest(error)) {
                    return;
                }
                if (
                    !Array.isArray(post.children) ||
                    post.children.length === 0
                ) {
                    Toast.show(t('回覆載入失敗，請稍後再試'));
                } else {
                    revealReplies();
                }
            } finally {
                setPendingNestedPostNumbers(current =>
                    current.filter(value => value !== postNumber),
                );
            }
        },
        [
            latestTopicRef,
            nestedReplyLimits,
            pendingNestedPostNumbers,
            t,
            topicId,
        ],
    );

    const loadNewReplies = useCallback(async () => {
        if (pendingNewPostIds.length === 0 || isLoadingNext) {
            return;
        }
        setIsLoadingNext(true);
        try {
            const nextPosts = await fetchHarborTopicPosts(
                topicId,
                pendingNewPostIds,
            );
            const pendingTopic = pendingTopicRef.current;
            setTopic(current =>
                mergeTopicWindow(current, {
                    ...pendingTopic,
                    post_stream: {
                        ...pendingTopic?.post_stream,
                        posts: [
                            ...(pendingTopic?.post_stream?.posts || []),
                            ...nextPosts,
                        ],
                    },
                }),
            );
            pendingTopicRef.current = null;
            setPendingNewPostIds([]);
            const latestPostNumber = Math.max(
                ...nextPosts.map(post => Number(post.post_number || 0)),
            );
            if (latestPostNumber > 0) {
                onNewRepliesLoaded(latestPostNumber);
            }
        } catch (error) {
            if (!isCanceledRequest(error)) {
                Toast.show(t('新回覆載入失敗，請稍後再試'));
            }
        } finally {
            setIsLoadingNext(false);
        }
    }, [
        isLoadingNext,
        onNewRepliesLoaded,
        pendingNewPostIds,
        t,
        topicId,
    ]);

    return {
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
    };
};

export default useHarborTopicData;
