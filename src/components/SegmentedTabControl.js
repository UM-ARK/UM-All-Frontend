import React, { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { moderateScale, scale } from 'react-native-size-matters';

import Text from './AppText';
import ScalePressable from './ScalePressable';
import { useTheme, uiStyle } from './ThemeContext';
import { useAppReducedMotion } from '../contexts/ReducedMotionContext';
import { GlassView, isLiquidGlassSupported } from '../utils/glassEffect';

const TRACK_PADDING = scale(3.5);
const ITEM_HEIGHT = moderateScale(30, 0.1);
const COMPACT_TRACK_PADDING = scale(3);
const COMPACT_ITEM_WIDTH = scale(60);
const TrackContainer = isLiquidGlassSupported ? GlassView : View;
const AnimatedText = Animated.createAnimatedComponent(Text);

export const SEGMENTED_TAB_CONTROL_HEIGHT = ITEM_HEIGHT + TRACK_PADDING * 2;

export default function SegmentedTabControl({
    options,
    selectedIndex,
    position,
    onChange,
    compact = false,
}) {
    const { theme } = useTheme();
    const { isLight, white, black, featuresScreen, pressOverlay, viewShadow } = theme;
    const reducedMotion = useAppReducedMotion();
    const [trackWidth, setTrackWidth] = useState(0);

    const optionCount = options.length;
    if (!optionCount) {
        return null;
    }

    const trackPadding = compact ? COMPACT_TRACK_PADDING : TRACK_PADDING;
    const segmentWidth = compact
        ? COMPACT_ITEM_WIDTH
        : Math.max(0, (trackWidth - trackPadding * 2) / optionCount);
    // 直接使用分頁容器的進度，滑塊和文字同時跟手。
    const animatedPosition = reducedMotion || optionCount === 1 ? null : position;
    const thumbTranslateX = animatedPosition?.interpolate({
        inputRange: [0, optionCount - 1],
        outputRange: [0, (optionCount - 1) * segmentWidth],
        extrapolate: 'clamp',
    }) ?? selectedIndex * segmentWidth;

    return (
        <TrackContainer
            {...(isLiquidGlassSupported ? { isInteractive: true } : {})}
            onLayout={compact ? undefined : event => setTrackWidth(event.nativeEvent.layout.width)}
            style={[
                styles.track,
                compact ? styles.compactTrack : styles.regularTrack,
                !isLiquidGlassSupported && { backgroundColor: white },
                !isLiquidGlassSupported && isLight && viewShadow,
            ]}>
            {segmentWidth > 0 ? (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.thumb,
                        {
                            top: trackPadding,
                            bottom: trackPadding,
                            left: trackPadding,
                            width: segmentWidth,
                            backgroundColor: isLight ? featuresScreen.divider : pressOverlay,
                            transform: [{ translateX: thumbTranslateX }],
                        },
                    ]}
                />
            ) : null}
            {options.map(({ key, label, badge }, index) => {
                const selected = index === selectedIndex;
                const color = animatedPosition?.interpolate({
                    inputRange: [index - 1, index, index + 1],
                    outputRange: [black.third, black.main, black.third],
                    extrapolate: 'clamp',
                }) ?? (selected ? black.main : black.third);

                return (
                    <ScalePressable
                        key={key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        accessibilityLabel={label}
                        onPress={() => onChange(index)}
                        style={[styles.button, compact ? styles.compactButton : styles.regularButton]}>
                        <View style={styles.labelRow}>
                            <AnimatedText
                                numberOfLines={1}
                                style={[
                                    styles.label,
                                    compact && styles.compactLabel,
                                    selected && styles.selectedLabel,
                                    { color },
                                ]}>
                                {label}
                            </AnimatedText>
                            {badge}
                        </View>
                    </ScalePressable>
                );
            })}
        </TrackContainer>
    );
}

const styles = StyleSheet.create({
    track: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(999),
        overflow: 'hidden',
    },
    regularTrack: {
        width: scale(172),
        maxWidth: '100%',
        padding: TRACK_PADDING,
    },
    compactTrack: {
        flexShrink: 0,
        marginHorizontal: scale(2),
        padding: COMPACT_TRACK_PADDING,
    },
    thumb: {
        position: 'absolute',
        borderRadius: scale(999),
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(999),
    },
    regularButton: {
        flex: 1,
        height: ITEM_HEIGHT,
    },
    compactButton: {
        width: COMPACT_ITEM_WIDTH,
        height: moderateScale(28, 0.1),
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(3),
        maxWidth: '100%',
    },
    label: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: moderateScale(12.5, 0.25),
        fontWeight: '500',
    },
    compactLabel: {
        fontSize: moderateScale(11.5, 0.25),
    },
    selectedLabel: {
        fontWeight: '600',
    },
});
