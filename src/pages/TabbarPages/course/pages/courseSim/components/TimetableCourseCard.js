import React from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { scale } from 'react-native-size-matters';

import CourseActionMenuCard from '../../../components/CourseActionMenuCard';

const FRAGMENTS = Array.from({ length: 30 }, (_, index) => {
    const column = index % 5;
    const row = Math.floor(index / 5);
    const size = scale(3 + (index * 7 % 6));

    return {
        delay: column * 0.035 + (index % 3) * 0.02,
        driftX: scale((column - 2) * 8 + (index * 13 % 22)),
        driftY: scale((row - 3) * 7 - (index * 17 % 24)),
        rotation: index * 47 % 150 - 75,
        style: {
            position: 'absolute',
            left: `${(column + 0.3 + (index % 3) * 0.18) * 20}%`,
            top: `${(row + 0.3 + (index % 4) * 0.12) * 100 / 6}%`,
            width: size,
            height: size * (index % 2 === 0 ? 0.65 : 1),
            marginLeft: -size / 2,
            marginTop: -size / 2,
            borderRadius: size * (index % 4 === 0 ? 0.5 : 0.22),
        },
    };
});

function CourseFragment({ fragment, color, progress }) {
    const { delay, driftX, driftY, rotation, style } = fragment;
    const motionStyle = useAnimatedStyle(() => {
        const time = Math.max(0, (progress.get() - delay) / (1 - delay));
        const drift = 1 - Math.pow(1 - time, 3);

        return {
            opacity: interpolate(time, [0, 0.08, 0.42, 1], [0, 1, 0.9, 0]),
            transform: [
                { translateX: driftX * drift },
                { translateY: driftY * drift },
                { rotate: `${rotation * drift}deg` },
                { scale: 1 - 0.75 * time },
            ],
        };
    });

    return <Animated.View style={[style, { backgroundColor: color }, motionStyle]} />;
}

function TimetableCourseCard({
    menuStyle,
    cardStyle,
    removalProgress,
    reducedMotion,
    children,
    ...menuProps
}) {
    const isRemoving = Boolean(removalProgress);
    const fillsFrame = menuStyle.height != null;
    const motionStyle = useAnimatedStyle(() => {
        const progress = removalProgress?.get() ?? 0;
        if (reducedMotion) {
            return { opacity: 1 - progress };
        }

        return {
            opacity: interpolate(progress, [0, 0.08, 0.35], [1, 1, 0], 'clamp'),
            transform: [{ scale: interpolate(progress, [0, 0.35], [1, 0.97], 'clamp') }],
        };
    });

    return (
        <View
            pointerEvents={isRemoving ? 'none' : 'auto'}
            accessibilityElementsHidden={isRemoving}
            importantForAccessibility={isRemoving ? 'no-hide-descendants' : 'auto'}
            style={[menuStyle, isRemoving && { zIndex: 3 }]}>
            <Animated.View style={[fillsFrame && StyleSheet.absoluteFill, motionStyle]}>
                <CourseActionMenuCard
                    {...menuProps}
                    menuStyle={fillsFrame ? StyleSheet.absoluteFill : undefined}
                    cardStyle={cardStyle}>
                    {children}
                </CourseActionMenuCard>
            </Animated.View>
            {isRemoving && !reducedMotion ? (
                <View style={StyleSheet.absoluteFill}>
                    {FRAGMENTS.map((fragment, index) => (
                        <CourseFragment
                            key={index}
                            fragment={fragment}
                            color={cardStyle.backgroundColor}
                            progress={removalProgress}
                        />
                    ))}
                </View>
            ) : null}
        </View>
    );
}

export default TimetableCourseCard;
