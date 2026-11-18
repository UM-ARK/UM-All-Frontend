import React, { useLayoutEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { scale } from 'react-native-size-matters';

import { useAppReducedMotion } from '../../../../contexts/ReducedMotionContext';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const PRESSED_SCALE = 0.84;
const REBOUND_PEAK_MS = 75;
const PARTICLE_STYLES = [
    [-7, -19, -20],
    [9, -18, null],
    [19, -8, 60],
    [14, 12, null],
    [-12, 14, 40],
    [-19, -3, null],
].map(([x, y, angle]) => {
    const isDot = angle === null;
    const width = scale(isDot ? 3 : 2);
    const height = scale(isDot ? 3 : 5);
    return {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width,
        height,
        borderRadius: width / 2,
        transform: [
            { translateX: scale(x) - width / 2 },
            { translateY: scale(y) - height / 2 },
            { rotate: `${angle ?? 0}deg` },
        ],
    };
});

const useHarborLikeFeedback = (postId, hearted) => {
    const reducedMotion = useAppReducedMotion();
    const pressedRef = useRef(false);
    const heartScale = useSharedValue(1);
    const burstProgress = useSharedValue(1);

    useLayoutEffect(() => {
        pressedRef.current = false;
        heartScale.set(1);
        burstProgress.set(1);
    }, [postId, heartScale, burstProgress]);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.get() }],
    }));
    const burstStyle = useAnimatedStyle(() => {
        const progress = burstProgress.get();
        return {
            opacity: interpolate(progress, [0, 0.06, 0.34, 1], [0, 0.85, 0.85, 0]),
            transform: [{ scale: interpolate(progress, [0, 1], [0.46, 1]) }],
        };
    });

    const pressIn = () => {
        if (reducedMotion) {
            return;
        }
        pressedRef.current = true;
        burstProgress.set(1);
        heartScale.set(withTiming(PRESSED_SCALE, { duration: 65, easing: EASE_OUT }));
    };

    const release = () => {
        if (!pressedRef.current) {
            return;
        }
        pressedRef.current = false;
        heartScale.set(PRESSED_SCALE);
        heartScale.set(withSequence(
            withTiming(hearted ? 1.12 : 1.20, {
                duration: REBOUND_PEAK_MS,
                easing: EASE_OUT,
            }),
            withSpring(1, { duration: 110, dampingRatio: 0.8 }),
        ));
    };

    const playBurst = () => {
        if (reducedMotion) {
            return;
        }
        burstProgress.set(0);
        burstProgress.set(withDelay(REBOUND_PEAK_MS, withTiming(1, {
            duration: 165,
            easing: Easing.out(Easing.quad),
        })));
    };

    return { burstStyle, iconStyle, playBurst, pressIn, release, reducedMotion };
};

const HarborLikeFeedback = ({ children, color, hearted, motion }) => (
    <View>
        <Animated.View style={motion.iconStyle}>{children}</Animated.View>
        {hearted && !motion.reducedMotion ? (
            <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, motion.burstStyle]}>
                {PARTICLE_STYLES.map((style, index) => (
                    <View key={index} style={[style, { backgroundColor: color }]} />
                ))}
            </Animated.View>
        ) : null}
    </View>
);

export { useHarborLikeFeedback };
export default HarborLikeFeedback;
