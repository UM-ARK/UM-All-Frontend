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
import { trigger } from '../../../../utils/trigger';
import {
    isCanceledRequest,
    mergeTopicWindow,
} from './harborTopicModels';

const LIST_POST_INDEX_OFFSET = 0;
const TIMINGS_REPORT_INTERVAL = 10000;

const useHarborTopicReading = ({
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
}) => {
    const pendingScrollRef = useRef(null);
    const latestVisiblePostRef = useRef(0);
    const viewablePostsRef = useRef([]);
    const lastTimingsAtRef = useRef(Date.now());
    const handledPostRequestRef = useRef(null);
    // 主動跳樓後忽略 viewability，避免短帖同屏時被最高可見樓層蓋回
    const ignoreViewabilityFromSeekRef = useRef(false);
    // 底部懸浮閱讀進度高度（含 safe area），供列表底部留白
    const [readingControlsDockHeight, setReadingControlsDockHeight] = useState(
        verticalScale(120),
    );
    const [currentPostNumber, setCurrentPostNumber] = useState(1);
    const [isJumpVisible, setIsJumpVisible] = useState(false);
    const [jumpPostNumber, setJumpPostNumber] = useState('');

    const resetTopicReading = useCallback(() => {
        listRef.current?.scrollToOffset({
            offset: 0,
            animated: false,
        });
        pendingScrollRef.current = null;
        latestVisiblePostRef.current = 1;
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
        }
    }, [sessionStatusRef, topicId]);

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
                await loadTopic();
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

    // 閱讀進度 Slider：鬆手後只執行一次跳轉，避免多個非同步滾動互相覆蓋
    const seekReadingProgress = useCallback(
        (postNumber, options = {}) => {
            const scrubbing = Boolean(options.scrubbing);
            return scrollToPost(postNumber, {
                animated: !scrubbing,
                allowFetch: !scrubbing,
            });
        },
        [scrollToPost],
    );

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
            const readingPost =
                visiblePosts.find(viewableItem => {
                    const layout = listRef.current?.getLayout?.(
                        Number(viewableItem.index),
                    );
                    return (
                        layout &&
                        layout.y +
                        firstItemOffset +
                        layout.height >
                        readingLineOffset
                    );
                }) || visiblePosts[visiblePosts.length - 1];
            updateReadingPost(
                Number(readingPost.item.post_number),
            );
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
            updateReadingPostFromOffset(
                Number(event.nativeEvent.contentOffset.y || 0),
            );
        },
        [updateReadingPostFromOffset],
    );

    const handleScrollBeginDrag = useCallback(() => {
        ignoreViewabilityFromSeekRef.current = false;
    }, []);

    const submitPostJump = useCallback(() => {
        const nextPostNumber = Number(jumpPostNumber);
        if (
            !Number.isInteger(nextPostNumber) ||
            nextPostNumber <= 0 ||
            nextPostNumber > highestPostNumber
        ) {
            Toast.show(t('請輸入有效樓層'));
            return;
        }
        trigger();
        setIsJumpVisible(false);
        scrollToPost(nextPostNumber);
    }, [highestPostNumber, jumpPostNumber, scrollToPost, t]);

    return {
        currentPostNumber,
        handleScroll,
        handleScrollBeginDrag,
        handleViewableItemsChanged,
        isJumpVisible,
        jumpPostNumber,
        readingControlsDockHeight,
        resetTopicReading,
        revealNewReplies,
        scrollToPost,
        seekReadingProgress,
        setIsJumpVisible,
        setJumpPostNumber,
        setReadingControlsDockHeight,
        submitPostJump,
    };
};

export default useHarborTopicReading;
