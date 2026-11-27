import React, { useContext, useLayoutEffect, useMemo } from 'react';
import { Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

import { ThemeContext } from './ThemeContext';
import { trigger } from '../utils/trigger';
import Ionicons from "@react-native-vector-icons/ionicons";
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale } from 'react-native-size-matters';
import { GlassView, isLiquidGlassSupported } from '../utils/glassEffect';

/**
 * 懸浮可拖動回頂按鈕組件
 * 功能：顯示/隱藏控制、回頂功能、拖動功能、吸附功能
 * 吸附點：左上、左中、左下、右上、右中、右下
 *
 * @param {Object} props - 組件屬性
 * @param {boolean} [props.visible=true] - 控制組件顯示/隱藏
 * @param {{ width: number, height: number }} props.viewport - 按鈕所在分頁的實際尺寸
 * @param {number} [props.topInset=0] - 分頁頂部浮層佔用的高度
 * @param {Function} [props.onScrollToTop] - 回頂後的回調函數
 * @param {Object} props.virtualizedListRef - 虛擬列表的 ref，用於調用 scrollToOffset 方法
 * @param {number} [props.initialSnapPointIndex=5] - 初始吸附點索引，默認為右下位置
 *                                                 0: 左上, 1: 左中, 2: 左下, 3: 右上, 4: 右中, 5: 右下
 * @param {Object} [props.style] - 附加在按鈕容器上的樣式，例如層級
 */
const ScrollToTopButton = ({ viewport, topInset = 0, visible = true, onScrollToTop, virtualizedListRef, initialSnapPointIndex = 5, style }) => {
    // 獲取主題上下文與底部導覽列高度
    const { theme } = useContext(ThemeContext);
    const insets = useSafeAreaInsets();
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;

    // 按鈕尺寸
    const buttonSize = scale(50);
    const buttonRadius = buttonSize / 2;

    // 依頂部浮層高度與底欄高度計算吸附位置，避免頂部搜尋列／分段切換器改變高度時壓低按鈕。
    const { width, height } = viewport;
    const snapPoints = useMemo(() => {
        const left = Math.min(scale(20) + buttonRadius, width / 2);
        const right = width - left;
        const bottomMargin = tabBarHeight + verticalScale(16);
        const bottom = Math.max(buttonRadius, height - bottomMargin - buttonRadius);
        const top = Math.min(topInset + verticalScale(16) + buttonRadius, bottom);
        const middle = Math.min(
            Math.max(topInset + (height - topInset - bottomMargin) / 2, top),
            bottom,
        );

        return [
            { x: left, y: top },
            { x: left, y: middle },
            { x: left, y: bottom },
            { x: right, y: top },
            { x: right, y: middle },
            { x: right, y: bottom },
        ];
    }, [buttonRadius, height, tabBarHeight, topInset, width]);

    // 根據傳入的索引設置初始位置，默認為右下位置
    const initialPosition = snapPoints[initialSnapPointIndex];
    const initialLeft = initialPosition.x - buttonRadius;
    const initialTop = initialPosition.y - buttonRadius;

    // 按鈕當前位置（左上角），必須用 shared value 供 UI thread 手勢讀寫
    const translateX = useSharedValue(initialLeft);
    const translateY = useSharedValue(initialTop);
    const snapPointIndex = useSharedValue(initialSnapPointIndex);
    // 每次手勢開始時鎖定的基準位置
    const startX = useSharedValue(initialLeft);
    const startY = useSharedValue(initialTop);

    useLayoutEffect(() => {
        const { x, y } = snapPoints[snapPointIndex.get()];
        translateX.set(x - buttonRadius);
        translateY.set(y - buttonRadius);
    }, [buttonRadius, snapPointIndex, snapPoints, translateX, translateY]);

    // 回頂功能
    const handleScrollToTop = () => {
        trigger(); // 觸覺反饋
        if (virtualizedListRef?.current?.scrollToOffset) {
            // VirtualizedList
            virtualizedListRef.current.scrollToOffset({ offset: 0, animated: true });
        } else if (virtualizedListRef?.current?.scrollTo) {
            // ScrollView
            virtualizedListRef.current.scrollTo({ x: 0, y: 0, animated: true });
        }
        if (onScrollToTop) {
            onScrollToTop();
        }
    };

    const springConfig = {
        stiffness: 200,
        damping: 25,
        mass: 0.5,
        overshootClamping: true,
        restDisplacementThreshold: 0.5,
        restSpeedThreshold: 5,
    };

    // 定義拖動手勢（回調在 UI thread 執行，不可使用 useRef）
    const panGesture = Gesture.Pan()
        .onStart(() => {
            // 從當前實際位置起步，避免第二次拖動仍用過期基準座標
            startX.value = translateX.value;
            startY.value = translateY.value;
        })
        .onUpdate((event) => {
            translateX.value = startX.value + event.translationX;
            translateY.value = startY.value + event.translationY;
        })
        .onEnd((event) => {
            // 手勢結束，吸附到最近的固定點
            const currentAbsoluteX = startX.value + event.translationX + buttonRadius;
            const currentAbsoluteY = startY.value + event.translationY + buttonRadius;

            if (
                isNaN(currentAbsoluteX) ||
                isNaN(currentAbsoluteY) ||
                !isFinite(currentAbsoluteX) ||
                !isFinite(currentAbsoluteY)
            ) {
                snapPointIndex.value = initialSnapPointIndex;
                translateX.value = withSpring(initialLeft, springConfig);
                translateY.value = withSpring(initialTop, springConfig);
                return;
            }

            let nearestIndex = 0;
            let minDistance = Infinity;

            for (let i = 0; i < snapPoints.length; i++) {
                const point = snapPoints[i];
                const distance = Math.sqrt(
                    Math.pow(currentAbsoluteX - point.x, 2) +
                    Math.pow(currentAbsoluteY - point.y, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestIndex = i;
                }
            }

            snapPointIndex.value = nearestIndex;
            const offsetX = snapPoints[nearestIndex].x - buttonRadius;
            const offsetY = snapPoints[nearestIndex].y - buttonRadius;

            translateX.value = withSpring(offsetX, springConfig);
            translateY.value = withSpring(offsetY, springConfig);
        });

    // 定義動畫樣式 - 直接使用絕對定位 left 和 top
    const animatedStyle = useAnimatedStyle(() => {
        return {
            left: translateX.value,
            top: translateY.value,
        };
    });

    if (!visible) { return null; }

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View
                style={[
                    { position: 'absolute' },
                    style,
                    animatedStyle,
                ]}
            >
                <Pressable onPress={handleScrollToTop}>
                    <GlassView
                        isInteractive={true}
                        style={{
                            backgroundColor: isLiquidGlassSupported ? null : theme.white,
                            borderRadius: scale(50),
                            width: buttonSize,
                            height: buttonSize,
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...(isLiquidGlassSupported ? {} : theme.floatingShadow),
                        }}
                    >
                        <Ionicons name="arrow-up" size={scale(24)} color={theme.themeColor} />
                    </GlassView>
                </Pressable>
            </Animated.View>
        </GestureDetector>
    );
};

export default ScrollToTopButton;
