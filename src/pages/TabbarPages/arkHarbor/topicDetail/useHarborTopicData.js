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
    fetchHarborTopic,
    fetchHarborTopicPosts,
} from '../../../../utils/harbor/harborApi';
import {
    appendTopicPosts,
    extractPostImages,
    isCanceledRequest,
    mergeTopicWindow,
} from './harborTopicModels';

const TOPIC_POST_BATCH_SIZE = 20;
const TOPIC_HEADER_ITEM = Object.freeze({
    __harborItemType: 'topicHeader',
    id: 'topic-header',
});

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
    const [unreadAfterPostNumber, setUnreadAfterPostNumber] = useState(-1);
    const [errorMessage, setErrorMessage] = useState('');

    const posts = useMemo(() => {
        const topicPosts = topic?.post_stream?.posts;
        if (!Array.isArray(topicPosts)) {
            return [];
        }
        return topicPosts.filter(post => post?.id);
    }, [topic]);

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
        return [TOPIC_HEADER_ITEM, ...posts];
    }, [posts, topic]);

    const highestPostNumber = useMemo(() => {
        return Math.max(
            Number(topic?.highest_post_number || 0),
            Number(topic?.posts_count || 0),
            ...posts.map(post => Number(post.post_number || 0)),
        );
    }, [posts, topic?.highest_post_number, topic?.posts_count]);

    const firstUnreadPostNumber = useMemo(() => {
        const unreadCount = Math.max(
            Number(topic?.unread_posts ?? topic?.new_posts ?? 0),
            0,
        );
        if (unreadCount <= 0) {
            return 0;
        }
        const lastReadPostNumber = Number(
            topic?.last_read_post_number || 0,
        );
        const inferredUnreadPostNumber = Math.max(
            highestPostNumber - unreadCount + 1,
            1,
        );
        return Math.min(
            lastReadPostNumber > 0
                ? lastReadPostNumber + 1
                : inferredUnreadPostNumber,
            highestPostNumber,
        );
    }, [
        highestPostNumber,
        topic?.last_read_post_number,
        topic?.new_posts,
        topic?.unread_posts,
    ]);

    // 僅一層樓時無需閱讀進度導航
    const showReadingControls = useMemo(() => {
        return (
            posts.length > 1 || Number(topic?.posts_count || 0) > 1
        );
    }, [posts.length, topic?.posts_count]);

    const canReplyToTopic =
        !topic?.closed &&
        !topic?.archived &&
        (topicSessionStatus !== 'signedIn' ||
            (topic?.can_create_post !== false &&
                topic?.details?.can_create_post !== false));

    const imageUrls = useMemo(() => {
        const urls = posts.flatMap(post => extractPostImages(post?.cooked));
        return [...new Set(urls)];
    }, [posts]);

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
                    posts: (current.post_stream?.posts || []).map(post =>
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
                const nextTopic = await fetchHarborTopic(topicId, {
                    signal: controller.signal,
                    trackPageView: shouldTrackPageView,
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
    };
};

export default useHarborTopicData;
