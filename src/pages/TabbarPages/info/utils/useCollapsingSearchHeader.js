import { useCallback, useEffect, useRef, useState } from 'react';
import { scale } from 'react-native-size-matters';
import {
    Easing,
    ReduceMotion,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SEARCH_FIELD_MIN_HEIGHT } from '../../../../components/searchFieldStyles';
import { nextHarborSearchBarProgress } from '../../arkHarbor/harborSearchBarProgress';

// 與 ClubSearchBar 外距加膠囊高度接近，量到真實高度前先佔位
const FALLBACK_SEARCH_HEADER_HEIGHT = SEARCH_FIELD_MIN_HEIGHT + scale(16);
const SEARCH_BAR_SETTLE_MS = 180;
const SEARCH_BAR_EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * 對齊論壇頁：往下瀏覽時搜尋列上移淡出，往回滑在原地展開，不必回到頂部。
 * 外層不要加背景色，淡出時列表內容可以直接透出來。
 * progress：0 完全展開，1 完全收起。
 */
export function useCollapsingSearchHeader() {
    const searchProgress = useSharedValue(0);
    const barHeightSV = useSharedValue(FALLBACK_SEARCH_HEADER_HEIGHT);
    const heightRef = useRef(FALLBACK_SEARCH_HEADER_HEIGHT);
    const lastScrollYRef = useRef(undefined);
    const fingerDownRef = useRef(false);
    const settleTimerRef = useRef(null);
    const [barHeight, setBarHeight] = useState(FALLBACK_SEARCH_HEADER_HEIGHT);
    const [collapsed, setCollapsed] = useState(false);

    const onBarLayout = useCallback(event => {
        const nextHeight = Math.ceil(event.nativeEvent.layout.height);
        if (nextHeight <= 0 || nextHeight === heightRef.current) {
            return;
        }
        heightRef.current = nextHeight;
        barHeightSV.set(nextHeight);
        setBarHeight(nextHeight);
    }, [barHeightSV]);

    const commitCollapsed = useCallback(progress => {
        setCollapsed(progress > 0.5);
    }, []);

    const cancelSettle = useCallback(() => {
        if (settleTimerRef.current != null) {
            clearTimeout(settleTimerRef.current);
            settleTimerRef.current = null;
        }
    }, []);

    useEffect(() => cancelSettle, [cancelSettle]);

    // 手指放開且列表停下後收到展開或收起，避免停在半截
    const settleSearchBar = useCallback(() => {
        const offset = lastScrollYRef.current ?? 0;
        const current = searchProgress.get();
        // 貼近頂部時維持跟手位置，收起會在內容還沒補上時留空
        if (offset < heightRef.current) {
            return;
        }
        const target = current <= 0.5 ? 0 : 1;
        if (Math.abs(current - target) < 0.01) {
            commitCollapsed(target);
            return;
        }
        setCollapsed(target > 0.5);
        searchProgress.set(withTiming(target, {
            duration: SEARCH_BAR_SETTLE_MS,
            easing: SEARCH_BAR_EASE_OUT,
            reduceMotion: ReduceMotion.System,
        }, finished => {
            if (finished) {
                scheduleOnRN(commitCollapsed, target);
            }
        }));
    }, [commitCollapsed, searchProgress]);

    const scheduleSettle = useCallback(() => {
        cancelSettle();
        settleTimerRef.current = setTimeout(() => {
            settleTimerRef.current = null;
            settleSearchBar();
        }, 70);
    }, [cancelSettle, settleSearchBar]);

    const onScrollBeginDrag = useCallback(() => {
        fingerDownRef.current = true;
        cancelSettle();
        const progress = searchProgress.get();
        searchProgress.set(progress);
    }, [cancelSettle, searchProgress]);

    const onScroll = useCallback(event => {
        const offset = event.nativeEvent.contentOffset.y;
        const previous = lastScrollYRef.current ?? offset;
        lastScrollYRef.current = offset;
        const progress = nextHarborSearchBarProgress(
            searchProgress.get(),
            offset,
            offset - previous,
            heightRef.current,
        );
        searchProgress.set(progress);
        const nextCollapsed = progress > 0.5;
        setCollapsed(current => (
            current === nextCollapsed ? current : nextCollapsed
        ));
        if (fingerDownRef.current) {
            cancelSettle();
            return;
        }
        scheduleSettle();
    }, [cancelSettle, scheduleSettle, searchProgress]);

    const onScrollEndDrag = useCallback(() => {
        fingerDownRef.current = false;
        scheduleSettle();
    }, [scheduleSettle]);

    const animatedStyle = useAnimatedStyle(() => {
        const progress = searchProgress.get();
        const height = barHeightSV.get();
        return {
            opacity: interpolate(progress, [0, 0.7], [1, 0], 'clamp'),
            transform: [{
                translateY: interpolate(progress, [0, 1], [0, -height], 'clamp'),
            }],
        };
    });

    return {
        onScroll,
        onScrollBeginDrag,
        onScrollEndDrag,
        onMomentumScrollEnd: onScrollEndDrag,
        onBarLayout,
        animatedStyle,
        barHeight,
        collapsed,
    };
}
