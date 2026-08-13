import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import Toast from 'react-native-simple-toast';
import { verticalScale } from 'react-native-size-matters';

import {
    fetchHarborTopic,
    saveHarborTopicTimings,
} from '../../../../utils/harbor/harborApi';
import { publishHarborTopicUpdate } from '../../../../utils/harbor/harborTopicUpdates';
import {
    isCanceledRequest,
    mergeTopicWindow,
} from './harborTopicModels';

const LIST_POST_INDEX_OFFSET = 0;
const TIMINGS_REPORT_INTERVAL = 10000;
const TOPIC_END_TOLERANCE = verticalScale(2);

export const getReadingPostNumber = ({
    atTopicEnd,
    firstItemOffset,
    getLayout,
    readingLineOffset,
    visiblePosts,
}) => {
    if (visiblePosts.length === 0) {
        return null;
    }
    const readingPost = atTopicEnd
        ? visiblePosts[visiblePosts.length - 1]
        : visiblePosts.find(viewableItem => {
            const layout = getLayout(Number(viewableItem.index));
            return (
                layout &&
                layout.y +
                firstItemOffset +
                layout.height >
                readingLineOffset
            );
        }) || visiblePosts[visiblePosts.length - 1];
    return Number(readingPost.item.post_number);
};

const useHarborTopicReading = ({
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
}) => {
    const pendingScrollRef = useRef(null);
    const latestVisiblePostRef = useRef(0);
    const viewablePostsRef = useRef([]);
    const isAtTopicEndRef = useRef(false);
    const lastTimingsAtRef = useRef(Date.now());
    const handledPostRequestRef = useRef(null);
    // 主動跳樓後忽略 viewability，避免短帖同屏時被最高可見樓層蓋回
    const ignoreViewabilityFromSeekRef = useRef(false);
    const [currentPostNumber, setCurrentPostNumber] = useState(1);

    const resetTopicReading = useCallback(() => {
        listRef.current?.scrollToOffset({
            offset: 0,
            animated: false,
        });
        pendingScrollRef.current = null;
        latestVisiblePostRef.current = 1;
        isAtTopicEndRef.current = false;
        setCurrentPostNumber(1);
    }, [listRef]);

    const disposeTopicReading = useCallback(() => {
        const lastPostNumber = latestVisiblePostRef.current;
        if (
            lastPostNumber > 0 &&
            sessionStatusRef.current === 'signedIn'
        ) {
            const now = Date.now();
            saveHarborTopicTimings(topicId, {
                postNumber: lastPostNumber,
                timeMs: now - lastTimingsAtRef.current,
                topicTimeMs: now - lastTimingsAtRef.current,
            }).catch(() => { });

            // 返回列表時就地更新該帖已讀狀態，避免整表刷新
            const previousLastRead = Number(
                latestTopicRef.current?.last_read_post_number || 0,
            );
            const nextLastRead = Math.max(previousLastRead, lastPostNumber);
            const highestPostNumber = Number(
                latestTopicRef.current?.highest_post_number ||
                    latestTopicRef.current?.posts_count ||
                    nextLastRead,
            );
            const unreadCount = Math.max(0, highestPostNumber - nextLastRead);
            publishHarborTopicUpdate(topicId, {
                detailPatch: {
                    last_read_post_number: nextLastRead,
                    unread_posts: unreadCount,
                },
                lastReadPostNumber: nextLastRead,
                unreadCount,
                isUnread: unreadCount > 0,
                isNew: false,
                // 已讀完時讓 unread／new 視圖軟刷新以移出該帖
                ...(unreadCount === 0 ? { reloadLists: true } : {}),
            });
        }
    }, [latestTopicRef, sessionStatusRef, topicId]);

    useEffect(() => {
        return () => disposeTopicReading();
    }, [disposeTopicReading, loadTopic, topicId]);

    const revealNewReplies = useCallback(latestPostNumber => {
        pendingScrollRef.current = latestPostNumber;
    }, []);

    const updateReadingPost = useCallback(
        postNumber => {
            const normalizedPostNumber = Number(postNumber);
            if (
                !Number.isInteger(normalizedPostNumber) ||
                normalizedPostNumber <= 0 ||
                normalizedPostNumber === latestVisiblePostRef.current
            ) {
                return;
            }

            latestVisiblePostRef.current = normalizedPostNumber;
            setCurrentPostNumber(normalizedPostNumber);
            const now = Date.now();
            if (
                sessionStatusRef.current === 'signedIn' &&
                now - lastTimingsAtRef.current >= TIMINGS_REPORT_INTERVAL
            ) {
                saveHarborTopicTimings(topicId, {
                    postNumber: normalizedPostNumber,
                    timeMs: now - lastTimingsAtRef.current,
                    topicTimeMs: now - lastTimingsAtRef.current,
                }).catch(() => { });
                lastTimingsAtRef.current = now;
            }
        },
        [sessionStatusRef, topicId],
    );

    const handleScrollToIndexFailed = useCallback(
        info => {
            const index = Math.max(Number(info?.index || 0), 0);
            const viewOffset = Number(info?.viewOffset || 0);
            listRef.current?.scrollToOffset({
                offset: Math.max(index * verticalScale(260) + viewOffset, 0),
                animated: false,
            });
            setTimeout(() => {
                listRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0,
                    viewOffset,
                });
            }, 250);
        },
        [listRef],
    );

    const getPostScrollViewOffset = useCallback(() => {
        // 進度條改為底部懸浮後，頂部只需避開液態玻璃導覽列
        return isLiquidGlassSupported ? -headerHeight : 0;
    }, [headerHeight]);

    const scrollToLoadedPost = useCallback(
        (postNumber, animated = true) => {
            const normalizedPostNumber = Number(postNumber);
            // 第一層回到列表頂部（標題已併入 1 樓）
            if (normalizedPostNumber === 1) {
                listRef.current?.scrollToOffset({
                    offset: 0,
                    animated,
                });
                return true;
            }
            const loadedPosts = posts.filter(post => post?.id);
            const postIndex = loadedPosts.findIndex(post => {
                return Number(post.post_number) === normalizedPostNumber;
            });
            if (postIndex < 0) {
                return false;
            }
            const listIndex = postIndex + LIST_POST_INDEX_OFFSET;
            // 預留頂部導覽列高度，讓目標樓層出現在可見區域上方
            const viewOffset = getPostScrollViewOffset();
            try {
                listRef.current?.scrollToIndex({
                    index: listIndex,
                    animated,
                    viewPosition: 0,
                    viewOffset,
                });
            } catch (error) {
                handleScrollToIndexFailed({ index: listIndex, viewOffset });
            }
            return true;
        },
        [
            getPostScrollViewOffset,
            handleScrollToIndexFailed,
            listRef,
            posts,
        ],
    );

    const scrollToPost = useCallback(
        async (postNumber, options = {}) => {
            const animated = options.animated !== false;
            const allowFetch = options.allowFetch !== false;
            const normalizedPostNumber = Math.min(
                Math.max(Number(postNumber), 1),
                Number(
                    latestTopicRef.current?.highest_post_number ||
                    latestTopicRef.current?.posts_count ||
                    postNumber,
                ),
            );
            if (!Number.isInteger(normalizedPostNumber)) {
                return;
            }
            // 先鎖定進度到目標樓層，再滾動，避免同屏多樓時立刻被蓋回
            ignoreViewabilityFromSeekRef.current = true;
            updateReadingPost(normalizedPostNumber);
            if (scrollToLoadedPost(normalizedPostNumber, animated)) {
                return;
            }
            if (!allowFetch) {
                return;
            }

            pendingScrollRef.current = normalizedPostNumber;
            setIsLoadingNext(true);
            try {
                const targetTopic = await fetchHarborTopic(topicId, {
                    postNumber: normalizedPostNumber,
                });
                setTopic(current => mergeTopicWindow(current, targetTopic));
            } catch (error) {
                if (!isCanceledRequest(error)) {
                    Toast.show(t('樓層載入失敗，請稍後再試'));
                    pendingScrollRef.current = null;
                }
            } finally {
                setIsLoadingNext(false);
            }
        },
        [
            latestTopicRef,
            scrollToLoadedPost,
            setIsLoadingNext,
            setTopic,
            t,
            topicId,
            updateReadingPost,
        ],
    );

    useEffect(() => {
        if (
            !topic?.id ||
            !Number.isInteger(requestedPostNumber) ||
            requestedPostNumber <= 0
        ) {
            return;
        }
        const requestKey =
            `${topicId}:${requestedPostNumber}:${composerRefreshAt || 'route'}`;
        if (handledPostRequestRef.current === requestKey) {
            return;
        }
        handledPostRequestRef.current = requestKey;

        const revealRequestedPost = async () => {
            if (composerRefreshAt) {
                await loadTopic({force: true});
            }
            await scrollToPost(requestedPostNumber, { animated: false });
        };
        revealRequestedPost();
    }, [
        composerRefreshAt,
        loadTopic,
        requestedPostNumber,
        scrollToPost,
        topic?.id,
        topicId,
    ]);

    useEffect(() => {
        const targetPostNumber = pendingScrollRef.current;
        if (!targetPostNumber || posts.length === 0) {
            return undefined;
        }
        const timeout = setTimeout(() => {
            if (
                scrollToLoadedPost(
                    targetPostNumber,
                    true,
                )
            ) {
                pendingScrollRef.current = null;
            }
        }, 250);
        return () => clearTimeout(timeout);
    }, [posts, scrollToLoadedPost]);

    const updateReadingPostFromOffset = useCallback(
        scrollOffset => {
            // 主動跳樓期間不跟畫面可見樓層，避免滾動動畫中途覆寫目標
            if (ignoreViewabilityFromSeekRef.current) {
                return;
            }
            const visiblePosts = viewablePostsRef.current;
            if (visiblePosts.length === 0) {
                return;
            }
            const firstItemOffset =
                Number(listRef.current?.getFirstItemOffset?.()) || 0;
            const readingLineOffset =
                scrollOffset - getPostScrollViewOffset();
            updateReadingPost(getReadingPostNumber({
                atTopicEnd: isAtTopicEndRef.current,
                firstItemOffset,
                getLayout: index => listRef.current?.getLayout?.(index),
                readingLineOffset,
                visiblePosts,
            }));
        },
        [getPostScrollViewOffset, listRef, updateReadingPost],
    );

    const handleViewableItemsChanged = useCallback(
        ({ viewableItems }) => {
            viewablePostsRef.current = viewableItems
                .filter(viewableItem =>
                    Number.isInteger(Number(viewableItem.item?.post_number)),
                )
                .sort(
                    (left, right) =>
                        Number(left.index) - Number(right.index),
                );
            updateReadingPostFromOffset(
                Number(listRef.current?.getAbsoluteLastScrollOffset?.()) || 0,
            );
        },
        [listRef, updateReadingPostFromOffset],
    );

    const handleScroll = useCallback(
        event => {
            const contentOffsetY =
                Number(event.nativeEvent.contentOffset.y) || 0;
            const contentHeight =
                Number(event.nativeEvent.contentSize.height) || 0;
            const viewportHeight =
                Number(event.nativeEvent.layoutMeasurement.height) || 0;
            isAtTopicEndRef.current =
                contentHeight > 0 &&
                contentOffsetY + viewportHeight >=
                    contentHeight - TOPIC_END_TOLERANCE;
            updateReadingPostFromOffset(
                contentOffsetY,
            );
        },
        [updateReadingPostFromOffset],
    );

    const handleScrollBeginDrag = useCallback(() => {
        ignoreViewabilityFromSeekRef.current = false;
    }, []);

    return {
        currentPostNumber,
        handleScroll,
        handleScrollBeginDrag,
        handleViewableItemsChanged,
        resetTopicReading,
        revealNewReplies,
        scrollToPost,
    };
};

export default useHarborTopicReading;
