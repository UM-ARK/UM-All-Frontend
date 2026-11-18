import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import Animated, { interpolate, useAnimatedStyle } from 'react-native-reanimated';
import { scale } from 'react-native-size-matters';

import CourseActionMenuCard from '../../../components/CourseActionMenuCard';

const MAX_PARTICLES_PER_CARD = 30;
const MAX_TIMETABLE_PARTICLES = 120;

export function getTimetableParticlesPerCard(cardCount) {
    if (cardCount === 0) {
        return 0;
    }
    const count = Math.min(MAX_PARTICLES_PER_CARD, Math.floor(MAX_TIMETABLE_PARTICLES / cardCount));
    return count >= 4 ? count : 0;
}

const FRAGMENTS = Array.from({ length: MAX_PARTICLES_PER_CARD }, (_, position) => {
    // 減少粒子數時，仍從卡面各處取樣。
    const index = position * 11 % MAX_PARTICLES_PER_CARD;
    const column = index % 5;
    const row = Math.floor(index / 5);
    const size = scale(3 + (index * 7 % 6));
    const x = (column + 0.3 + (index % 3) * 0.18) / 5;
    const y = (row + 0.3 + (index % 4) * 0.12) / 6;

    return {
        x,
        y,
        delay: column * 0.035 + (index % 3) * 0.02,
        driftX: scale((column - 2) * 8 + (index * 13 % 22)),
        driftY: scale((row - 3) * 7 - (index * 17 % 24)),
        rotation: index * 47 % 150 - 75,
        style: {
            position: 'absolute',
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            width: size,
            height: size * (index % 2 === 0 ? 0.65 : 1),
            marginLeft: -size / 2,
            marginTop: -size / 2,
            borderRadius: size * (index % 4 === 0 ? 0.5 : 0.22),
        },
    };
});

const SWEEP_FRAGMENTS = FRAGMENTS.slice(0, 18);

function CourseFragment({ fragment, color, progress, mode, start, handoff }) {
    const { x, y, delay, driftX, driftY, rotation, style } = fragment;
    const motionStyle = useAnimatedStyle(() => {
        const elapsed = progress.get();
        const phase = interpolate(elapsed, [start, 1], [0, 1], 'clamp');
        const time = Math.max(0, (phase - delay) / (1 - delay));

        if (mode === 'arrive') {
            const distance = (1 - time) * (1 - time);
            return {
                opacity: interpolate(time, [0, 0.09, 0.62, 0.98], [0, 1, 0.92, 0], 'clamp'),
                transform: [
                    { translateX: driftX * distance * 1.6 },
                    { translateY: driftY * distance * 1.6 },
                    { rotate: `${rotation * distance}deg` },
                    { scale: 0.5 + 0.5 * time },
                ],
            };
        }

        const drift = 1 - Math.pow(1 - time, 3);
        if (handoff) {
            const travel = interpolate(time, [0, 0.84], [0, 1], 'clamp');
            const spread = Math.sin(travel * Math.PI);
            const converge = interpolate(travel, [0, 0.42, 1], [0, 0.84, 1]);
            return {
                opacity: interpolate(time, [0, 0.1, 0.72, 0.92], [0, 1, 0.9, 0], 'clamp'),
                transform: [
                    { translateX: handoff.x * travel + (0.5 - x) * handoff.width * converge + driftX * spread * 0.45 },
                    { translateY: handoff.y * travel + (0.5 - y) * handoff.height * converge + driftY * spread * 0.45 },
                    { rotate: `${rotation * travel}deg` },
                    { scale: interpolate(travel, [0, 1], [1, 0.3]) },
                ],
            };
        }

        return {
            opacity: interpolate(time, [0, 0.08, 0.58, 1], [0, 1, 0.9, 0]),
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

function CourseParticles({ color, progress, particleCount, mode, start = 0, handoff }) {
    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {FRAGMENTS.slice(0, particleCount).map((fragment, index) => (
                <CourseFragment
                    key={index}
                    fragment={fragment}
                    color={color}
                    progress={progress}
                    mode={mode}
                    start={start}
                    handoff={handoff}
                />
            ))}
        </View>
    );
}

function SectionSweep({ progress, color, borderRadius, particleCount }) {
    const sweepStyle = useAnimatedStyle(() => {
        const time = progress.get();
        return {
            opacity: interpolate(time, [0, 0.13, 0.77, 1], [0, 0.38, 0.38, 0]),
            transform: [{ translateX: `${interpolate(time, [0, 1], [-62, 62])}%` }],
        };
    });

    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius }]}>
            <Animated.View style={[StyleSheet.absoluteFill, sweepStyle]}>
                {SWEEP_FRAGMENTS.slice(0, particleCount).map(({ style }, index) => (
                    <View key={index} style={[style, {
                        left: `${42 + (index * 7 % 16)}%`,
                        top: `${6 + (index * 11 % 88)}%`,
                        backgroundColor: color,
                    }]} />
                ))}
            </Animated.View>
        </View>
    );
}

export function DepartingCourseCard({ frame, color, borderRadius, progress, handoff, particleCount }) {
    const cardStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.get(), [0, particleCount === 0 ? 1 : 0.32], [1, 0], 'clamp'),
    }));

    return (
        <View pointerEvents="none" style={[{ position: 'absolute', zIndex: 4 }, frame]}>
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, borderRadius }, cardStyle]} />
            {particleCount > 0 ? (
                <CourseParticles color={color} progress={progress} handoff={handoff} particleCount={particleCount} />
            ) : null}
        </View>
    );
}

function TimetableCourseCard({
    slotKey,
    registerCard,
    menuStyle,
    cardStyle,
    removalProgress,
    changeProgress,
    changeMode,
    arrivalStart = 0,
    sweepColor,
    particleCount,
    children,
    ...menuProps
}) {
    const isRemoving = Boolean(removalProgress);
    const isChanging = Boolean(changeMode);
    const fadeOnly = particleCount === 0;
    const backgroundProgress = !fadeOnly && changeMode === 'arrive' ? changeProgress : undefined;
    const fillsFrame = menuStyle.height != null;
    const attachCard = useCallback(node => {
        registerCard(slotKey, node);
    }, [registerCard, slotKey]);
    const motionStyle = useAnimatedStyle(() => {
        if (changeMode === 'sweep') {
            const progress = changeProgress.get();
            return {
                opacity: interpolate(progress, [0, 0.46, 0.78, 1], [1, fadeOnly ? 0.45 : 0.86, 1, 1]),
                transform: [{ scale: 1 }],
            };
        }
        if (changeMode === 'arrive') {
            const progress = changeProgress.get();
            const phase = interpolate(progress, [arrivalStart, 1], [0, 1], 'clamp');
            return {
                opacity: interpolate(phase, [fadeOnly ? 0 : 0.36, 0.9], [0, 1], 'clamp'),
                transform: [{ scale: fadeOnly ? 1 : interpolate(phase, [0, 0.9], [0.97, 1], 'clamp') }],
            };
        }
        const progress = removalProgress?.get() ?? 0;
        if (fadeOnly) {
            return { opacity: 1 - progress, transform: [{ scale: 1 }] };
        }

        return {
            opacity: interpolate(progress, [0, 0.08, 0.35], [1, 1, 0], 'clamp'),
            transform: [{ scale: interpolate(progress, [0, 0.35], [1, 0.97], 'clamp') }],
        };
    });
    const arrivingBackground = useAnimatedStyle(() => {
        const progress = backgroundProgress?.get() ?? 0;
        const phase = interpolate(progress, [arrivalStart, 1], [0, 1], 'clamp');
        return { opacity: interpolate(phase, [0.18, 0.56, 0.96], [0, 0.46, 0], 'clamp') };
    });

    return (
        <View
            ref={attachCard}
            collapsable={false}
            pointerEvents={isRemoving || isChanging ? 'none' : 'auto'}
            accessibilityElementsHidden={isRemoving || isChanging}
            importantForAccessibility={isRemoving || isChanging ? 'no-hide-descendants' : 'auto'}
            style={[menuStyle, (isRemoving || isChanging) && { zIndex: 3 }]}>
            {changeMode === 'arrive' && !fadeOnly ? (
                <Animated.View pointerEvents="none" style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: cardStyle.backgroundColor, borderRadius: cardStyle.borderRadius },
                    arrivingBackground,
                ]} />
            ) : null}
            <Animated.View style={[fillsFrame && StyleSheet.absoluteFill, motionStyle]}>
                <CourseActionMenuCard
                    {...menuProps}
                    menuStyle={fillsFrame ? StyleSheet.absoluteFill : undefined}
                    cardStyle={cardStyle}>
                    {children}
                </CourseActionMenuCard>
            </Animated.View>
            {isRemoving && !fadeOnly ? (
                <CourseParticles color={cardStyle.backgroundColor} progress={removalProgress} particleCount={particleCount} />
            ) : null}
            {changeMode === 'arrive' && !fadeOnly ? (
                <CourseParticles
                    color={cardStyle.backgroundColor}
                    progress={changeProgress}
                    particleCount={particleCount}
                    mode="arrive"
                    start={arrivalStart}
                />
            ) : null}
            {changeMode === 'sweep' && !fadeOnly ? (
                <SectionSweep progress={changeProgress} color={sweepColor} borderRadius={cardStyle.borderRadius} particleCount={particleCount} />
            ) : null}
        </View>
    );
}

export default TimetableCourseCard;
