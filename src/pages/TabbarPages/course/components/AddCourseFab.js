import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
    isLiquidGlassSupported,
    LiquidGlassView,
} from '@callstack/liquid-glass';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { t } from 'i18next';

import { useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import TouchableScale from '../../../../components/TouchableScale';

const FAB_FADE_MS = 220;
const FAB_SIZE = scale(44);
const FAB_GAP = verticalScale(4);
const FAB_SIDE_MARGIN = scale(16);
const FAB_TOP_MARGIN = verticalScale(16);
const FAB_STACK_HEIGHT = FAB_SIZE * 2 + FAB_GAP;
const FAB_SPRING = {
    stiffness: 200,
    damping: 25,
    mass: 0.5,
    overshootClamping: true,
};

/**
 * 課表段落右下角浮動操作列：加課 → 課程目錄。
 *
 * 清空收進頂欄 ⋯ 選單，避免低頻危險操作長期遮擋課表；
 * 課程目錄切到隔壁段落，與搵課頁底部課表膠囊對稱；
 * 整組按鈕可拖動，放手後吸附到左右兩側的上／中／下位置；
 * sheet 展開時由呼叫端以 visible=false 淡出（會被 sheet 蓋住）。
 *
 * @param {number} bottom 距底部距離（呼叫端需扣掉 Tab Bar 高度）
 * @param {Function} onAddPress 開啟加課 sheet
 * @param {Function} [onSearchPress] 跳轉到搵課段落
 * @param {boolean} [visible] 是否可見（關閉時淡出，不卸載以保留動畫）
 */
const AddCourseFab = ({
    bottom,
    onAddPress,
    onSearchPress,
    visible = true,
}) => {
    const { theme } = useTheme();
    const { themeColor, black, white } = theme;
    const opacity = useSharedValue(visible ? 1 : 0);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const containerWidth = useSharedValue(0);
    const containerHeight = useSharedValue(0);

    useEffect(() => {
        opacity.value = withTiming(visible ? 1 : 0, { duration: FAB_FADE_MS });
    }, [opacity, visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
        ],
    }));

    const panGesture = useMemo(
        () =>
            Gesture.Pan()
                .minDistance(scale(8))
                .onStart(() => {
                    startX.value = translateX.value;
                    startY.value = translateY.value;
                })
                .onUpdate(event => {
                    const maxLeftOffset = Math.max(
                        0,
                        containerWidth.value -
                        FAB_SIDE_MARGIN * 2 -
                        FAB_SIZE,
                    );
                    const maxUpOffset = Math.max(
                        0,
                        containerHeight.value -
                        bottom -
                        FAB_TOP_MARGIN -
                        FAB_STACK_HEIGHT,
                    );

                    translateX.value = Math.max(
                        -maxLeftOffset,
                        Math.min(0, startX.value + event.translationX),
                    );
                    translateY.value = Math.max(
                        -maxUpOffset,
                        Math.min(0, startY.value + event.translationY),
                    );
                })
                .onEnd(() => {
                    const maxLeftOffset = Math.max(
                        0,
                        containerWidth.value -
                        FAB_SIDE_MARGIN * 2 -
                        FAB_SIZE,
                    );
                    const maxUpOffset = Math.max(
                        0,
                        containerHeight.value -
                        bottom -
                        FAB_TOP_MARGIN -
                        FAB_STACK_HEIGHT,
                    );
                    const horizontalPoints = [-maxLeftOffset, 0];
                    const verticalPoints = [
                        -maxUpOffset,
                        -maxUpOffset / 2,
                        0,
                    ];
                    let nearestX = 0;
                    let nearestY = 0;
                    let nearestDistance = Infinity;

                    for (let xIndex = 0; xIndex < horizontalPoints.length; xIndex++) {
                        for (let yIndex = 0; yIndex < verticalPoints.length; yIndex++) {
                            const offsetX =
                                translateX.value - horizontalPoints[xIndex];
                            const offsetY =
                                translateY.value - verticalPoints[yIndex];
                            const distance =
                                offsetX * offsetX + offsetY * offsetY;

                            if (distance < nearestDistance) {
                                nearestDistance = distance;
                                nearestX = horizontalPoints[xIndex];
                                nearestY = verticalPoints[yIndex];
                            }
                        }
                    }

                    translateX.value = withSpring(nearestX, FAB_SPRING);
                    translateY.value = withSpring(nearestY, FAB_SPRING);
                }),
        [
            bottom,
            containerHeight,
            containerWidth,
            startX,
            startY,
            translateX,
            translateY,
        ],
    );

    const styles = useMemo(() => {
        const fallbackShadow = isLiquidGlassSupported
            ? {}
            : {
                shadowColor: black.main,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
            };

        return {
            stack: {
                position: 'absolute',
                right: FAB_SIDE_MARGIN,
                bottom,
                alignItems: 'flex-end',
                rowGap: FAB_GAP,
            },
            pill: {
                alignItems: 'center',
                justifyContent: 'center',
                width: FAB_SIZE,
                height: FAB_SIZE,
                borderRadius: FAB_SIZE / 2,
                overflow: 'hidden',
                backgroundColor: isLiquidGlassSupported ? null : white,
                ...fallbackShadow,
            },
        };
    }, [black.main, bottom, white]);

    return (
        <View
            pointerEvents={visible ? 'box-none' : 'none'}
            style={StyleSheet.absoluteFill}
            onLayout={event => {
                const { width, height } = event.nativeEvent.layout;
                containerWidth.value = width;
                containerHeight.value = height;

                const maxLeftOffset = Math.max(
                    0,
                    width - FAB_SIDE_MARGIN * 2 - FAB_SIZE,
                );
                const maxUpOffset = Math.max(
                    0,
                    height - bottom - FAB_TOP_MARGIN - FAB_STACK_HEIGHT,
                );
                translateX.value = Math.max(
                    -maxLeftOffset,
                    Math.min(0, translateX.value),
                );
                translateY.value = Math.max(
                    -maxUpOffset,
                    Math.min(0, translateY.value),
                );
            }}>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.stack, animatedStyle]}>
                    <TouchableScale
                        onPress={() => {
                            trigger();
                            onAddPress?.();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('加課', { ns: 'timetable' })}
                        hitSlop={scale(8)}>
                        <LiquidGlassView
                            interactive
                            hover={
                                isLiquidGlassSupported
                                    ? { effect: 'highlight' }
                                    : null
                            }
                            style={styles.pill}>
                            <Ionicons
                                name="add"
                                size={scale(24)}
                                color={themeColor}
                            />
                        </LiquidGlassView>
                    </TouchableScale>

                    <TouchableScale
                        onPress={() => {
                            trigger();
                            onSearchPress?.();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={t('搵課')}
                        hitSlop={scale(8)}>
                        <LiquidGlassView
                            interactive
                            hover={
                                isLiquidGlassSupported
                                    ? { effect: 'highlight' }
                                    : null
                            }
                            style={styles.pill}>
                            <Ionicons
                                name="library-outline"
                                size={scale(21)}
                                color={themeColor}
                            />
                        </LiquidGlassView>
                    </TouchableScale>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

export default AddCourseFab;
