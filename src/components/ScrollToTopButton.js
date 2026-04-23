import React, { useRef, useContext } from 'react';
import { Dimensions, Pressable } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';

import { ThemeContext } from './ThemeContext';
import { trigger } from '../utils/trigger';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import { isLiquidGlassSupported, LiquidGlassView } from '@callstack/liquid-glass';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

/**
 * 懸浮可拖動回頂按鈕組件
 * 功能：顯示/隱藏控制、回頂功能、拖動功能、吸附功能
 * 吸附點：左上、左中、左下、右上、右中、右下
 *
 * @param {Object} props - 組件屬性
 * @param {boolean} [props.visible=true] - 控制組件顯示/隱藏
 * @param {Function} [props.onScrollToTop] - 回頂後的回調函數
 * @param {Object} props.virtualizedListRef - 虛擬列表的 ref，用於調用 scrollToOffset 方法
 * @param {number} [props.initialSnapPointIndex=5] - 初始吸附點索引，默認為右下位置
 *                                                 0: 左上, 1: 左中, 2: 左下, 3: 右上, 4: 右中, 5: 右下
 */
const ScrollToTopButton = ({ visible = true, onScrollToTop, virtualizedListRef, initialSnapPointIndex = 5 }) => {
    // 獲取主題上下文
    const { theme } = useContext(ThemeContext);

    // 按鈕尺寸
    const buttonSize = scale(50);
    const buttonRadius = buttonSize / 2;

    // 定義 6 個吸附點坐標（屏幕絕對坐標）
    const snapPoints = [
        // 左上
        { x: scale(20) + buttonRadius, y: verticalScale(80) + buttonRadius },
        // 左中
        { x: scale(20) + buttonRadius, y: screenHeight / 2 },
        // 左下 - 調整位置，避免被底部導航欄遮擋
        { x: scale(20) + buttonRadius, y: screenHeight - verticalScale(160) - buttonRadius },

        // 右上
        { x: screenWidth - scale(20) - buttonRadius, y: verticalScale(80) + buttonRadius },
        // 右中 - 调整为真正的屏幕中间位置
        { x: screenWidth - scale(20) - buttonRadius, y: screenHeight / 2 },
        // 右下 - 調整位置，避免被底部導航欄遮擋
        { x: screenWidth - scale(20) - buttonRadius, y: screenHeight - verticalScale(160) - buttonRadius },
    ];

    // 根據傳入的索引設置初始位置，默認為右下位置
    const initialPosition = snapPoints[initialSnapPointIndex];

    // Reanimated v4 共享值 - 跟蹤按鈕的當前位置（絕對坐標）
    const translateX = useSharedValue(initialPosition.x - buttonRadius);
    const translateY = useSharedValue(initialPosition.y - buttonRadius);
    // 跟蹤按鈕的基準位置（用於累積手勢翻譯值）
    const baseX = useRef(initialPosition.x - buttonRadius);
    const baseY = useRef(initialPosition.y - buttonRadius);

    // 添加日誌以調試位置計算
    // console.log('Screen dimensions:', { width: screenWidth, height: screenHeight });
    // console.log('Button size:', buttonSize);
    // console.log('Button radius:', buttonRadius);
    // console.log('Initial position:', initialPosition);
    // console.log('Translate X:', initialPosition.x - buttonRadius);
    // console.log('Translate Y:', initialPosition.y - buttonRadius);

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

    // 定義拖動手勢
    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            try {
                // 計算當前位置：基準位置 + 手勢翻譯值
                translateX.value = baseX.current + event.translationX;
                translateY.value = baseY.current + event.translationY;
            } catch (error) {
                console.error('Error in pan gesture onUpdate:', error);
            }
        })
        .onEnd((event) => {
            // 手勢結束，吸附到最近的固定點
            try {
                // 計算當前絕對位置
                const currentAbsoluteX = (baseX.current + event.translationX) + buttonRadius;
                const currentAbsoluteY = (baseY.current + event.translationY) + buttonRadius;

                // 檢查坐標是否有效
                if (isNaN(currentAbsoluteX) || isNaN(currentAbsoluteY) || !isFinite(currentAbsoluteX) || !isFinite(currentAbsoluteY)) {
                    throw new Error('Invalid coordinates');
                }

                // console.log('最終位置（絕對坐標）:', { x: currentAbsoluteX, y: currentAbsoluteY });

                let nearestPoint = snapPoints[0];
                let minDistance = Infinity;

                snapPoints.forEach(point => {
                    const distance = Math.sqrt(
                        Math.pow(currentAbsoluteX - point.x, 2) + Math.pow(currentAbsoluteY - point.y, 2)
                    );
                    if (distance < minDistance) {
                        minDistance = distance;
                        nearestPoint = point;
                    }
                });

                // console.log('最近吸附點（絕對坐標）:', nearestPoint);

                // 計算相對於左上角的偏移量（不包含半徑，因為 style 中的 x/y 已經是左上角）
                const offsetX = nearestPoint.x - buttonRadius;
                const offsetY = nearestPoint.y - buttonRadius;

                // 更新基準位置為吸附後的位置
                baseX.current = offsetX;
                baseY.current = offsetY;

                // 優化彈簧動畫參數：加速吸附速度，改善跟手效果
                translateX.value = withSpring(offsetX, {
                    stiffness: 200,
                    damping: 25,
                    mass: 0.5,
                    overshootClamping: true,
                    restDisplacementThreshold: 0.5,
                    restSpeedThreshold: 5,
                });
                translateY.value = withSpring(offsetY, {
                    stiffness: 200,
                    damping: 25,
                    mass: 0.5,
                    overshootClamping: true,
                    restDisplacementThreshold: 0.5,
                    restSpeedThreshold: 5,
                });
            } catch (error) {
                console.error('Error in pan gesture onEnd:', error);
                // 動畫失敗時，重置到初始位置（右中）
                const offsetX = initialPosition.x - buttonRadius;
                const offsetY = initialPosition.y - buttonRadius;
                baseX.current = offsetX;
                baseY.current = offsetY;
                translateX.value = withSpring(offsetX, {
                    damping: 30,
                    stiffness: 100,
                });
                translateY.value = withSpring(offsetY, {
                    damping: 30,
                    stiffness: 100,
                });
            }
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
                    { position: 'absolute', },
                    animatedStyle,
                ]}
            >
                <Pressable onPress={handleScrollToTop}>
                    <LiquidGlassView
                        interactive={true}
                        style={{
                            backgroundColor: isLiquidGlassSupported ? null : theme.white,
                            borderRadius: scale(50),
                            width: buttonSize,
                            height: buttonSize,
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <Ionicons name="arrow-up" size={scale(24)} color={theme.themeColor} />
                    </LiquidGlassView>
                </Pressable>
            </Animated.View>
        </GestureDetector>
    );
};

export default ScrollToTopButton;
