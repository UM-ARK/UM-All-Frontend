import React, { forwardRef, useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** 預設按下縮放比例（略縮小以提供清楚的按壓回饋） */
const DEFAULT_ACTIVE_SCALE = 0.85;

/** 預設彈簧參數，與專案內其他 Reanimated 按鈕手感相近 */
const DEFAULT_SPRING = {
    damping: 18,
    stiffness: 280,
    mass: 0.4,
};

/**
 * 帶縮放回饋的可點擊區域（底層為 Pressable，動畫為 Reanimated 原生驅動）。
 * 新程式碼請優先使用本元件而非 TouchableOpacity 或舊版 touchable-scale。
 *
 * @param {number} [activeScale=0.95] 按下時的 scale（相對於 1）
 * @param {object} [springConfig] 覆寫 withSpring 第二參數
 */
const TouchableScale = forwardRef(function TouchableScale(
    {
        children,
        style,
        activeScale = DEFAULT_ACTIVE_SCALE,
        springConfig,
        onPressIn,
        onPressOut,
        onPressCancel,
        disabled,
        ...pressableProps
    },
    ref,
) {
    const scale = useSharedValue(1);
    const resolvedSpring = springConfig ?? DEFAULT_SPRING;

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const animateTo = useCallback(
        (value) => {
            scale.value = withSpring(value, resolvedSpring);
        },
        [resolvedSpring, scale],
    );

    const handlePressIn = useCallback(
        (e) => {
            if (!disabled) {
                animateTo(activeScale);
            }
            onPressIn?.(e);
        },
        [activeScale, animateTo, disabled, onPressIn],
    );

    const handlePressOut = useCallback(
        (e) => {
            animateTo(1);
            onPressOut?.(e);
        },
        [animateTo, onPressOut],
    );

    const handlePressCancel = useCallback(
        (e) => {
            animateTo(1);
            onPressCancel?.(e);
        },
        [animateTo, onPressCancel],
    );

    return (
        <AnimatedPressable
            ref={ref}
            disabled={disabled}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPressCancel={handlePressCancel}
            style={[style, animatedStyle]}
            {...pressableProps}
        >
            {children}
        </AnimatedPressable>
    );
});

TouchableScale.displayName = 'TouchableScale';

export default TouchableScale;
