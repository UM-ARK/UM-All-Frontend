import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { moderateScale, scale } from 'react-native-size-matters';

import Text from './AppText';
import { useTheme, uiStyle } from './ThemeContext';
import { useAppReducedMotion } from '../contexts/ReducedMotionContext';
import { GlassView, isLiquidGlassSupported } from '../utils/glassEffect';

const TRACK_PADDING = scale(3.5);
const ITEM_HEIGHT = moderateScale(30, 0.1);
const COMPACT_TRACK_PADDING = scale(3);
const COMPACT_ITEM_WIDTH = scale(60);
const TrackContainer = isLiquidGlassSupported ? GlassView : View;

export const SEGMENTED_TAB_CONTROL_HEIGHT = ITEM_HEIGHT + TRACK_PADDING * 2;

export default function SegmentedTabControl({
    options,
    selectedIndex,
    position,
    onChange,
    compact = false,
    compactItemWidth = COMPACT_ITEM_WIDTH,
    raisedTrack = false,
    fullWidth = false,
}) {
    const { theme } = useTheme();
    const { isLight, white, black, featuresScreen, pressOverlay, viewShadow } = theme;
    const reducedMotion = useAppReducedMotion();
    const [trackWidth, setTrackWidth] = useState(0);

    const optionCount = options.length;
    if (!optionCount) {
        return null;
    }

    const Track = raisedTrack ? View : TrackContainer;
    const showTrackSurface = raisedTrack || !isLiquidGlassSupported;
    const trackPadding = compact ? COMPACT_TRACK_PADDING : TRACK_PADDING;
    const isFixedCompact = compact && !fullWidth;
    const segmentWidth = isFixedCompact
        ? compactItemWidth
        : Math.max(0, (trackWidth - trackPadding * 2) / optionCount);
    // 滑塊跟分頁進度；文字色用 selected 靜態切換（AppText 無法可靠吃 Animated color）。
    const animatedPosition = reducedMotion || optionCount === 1 ? null : position;
    const thumbTranslateX = animatedPosition?.interpolate({
        inputRange: [0, optionCount - 1],
        outputRange: [0, (optionCount - 1) * segmentWidth],
        extrapolate: 'clamp',
    }) ?? selectedIndex * segmentWidth;

    return (
        <Track
            onLayout={isFixedCompact ? undefined : event => setTrackWidth(event.nativeEvent.layout.width)}
            style={[
                styles.track,
                compact ? styles.compactTrack : styles.regularTrack,
                fullWidth && styles.fullWidthTrack,
                showTrackSurface && { backgroundColor: white },
                showTrackSurface && (isLight || raisedTrack) && viewShadow,
                raisedTrack && styles.raisedTrack,
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

                return (
                    <Pressable
                        key={key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        accessibilityLabel={label}
                        onPress={() => onChange(index)}
                        style={({ pressed }) => [
                            styles.button,
                            isFixedCompact
                                ? [styles.compactButton, { width: segmentWidth }]
                                : compact
                                    ? [styles.compactButton, styles.fullWidthButton]
                                    : styles.regularButton,
                            pressed && styles.buttonPressed,
                        ]}>
                        <View style={styles.labelRow}>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.label,
                                    compact && styles.compactLabel,
                                    selected && styles.selectedLabel,
                                    { color: selected ? black.main : black.third },
                                ]}>
                                {label}
                            </Text>
                            {badge}
                        </View>
                    </Pressable>
                );
            })}
        </Track>
    );
}

const styles = StyleSheet.create({
    track: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(999),
        overflow: 'hidden',
    },
    raisedTrack: {
        overflow: 'visible',
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
    fullWidthTrack: {
        width: '100%',
        marginHorizontal: 0,
    },
    fullWidthButton: {
        flex: 1,
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
    buttonPressed: {
        opacity: 0.72,
    },
    regularButton: {
        flex: 1,
        height: ITEM_HEIGHT,
    },
    compactButton: {
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
