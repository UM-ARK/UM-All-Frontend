import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
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
const SMALL_TRACK_PADDING = scale(2.5);
const SMALL_ITEM_HEIGHT = moderateScale(20, 0.1);

export const SEGMENTED_TAB_CONTROL_HEIGHT = ITEM_HEIGHT + TRACK_PADDING * 2;
export const SMALL_SEGMENTED_TAB_CONTROL_HEIGHT = SMALL_ITEM_HEIGHT + SMALL_TRACK_PADDING * 2;

export default function SegmentedTabControl({
    options,
    selectedIndex,
    position,
    onChange,
    compact = false,
    compactItemWidth = COMPACT_ITEM_WIDTH,
    raisedTrack = false,
    inset = false,
    fullWidth = false,
    small = false,
    glass = false,
    glassInteractive = false,
}) {
    const { theme } = useTheme();
    const { isLight, white, black, featuresScreen, viewShadow, settingSegment } = theme;
    const reducedMotion = useAppReducedMotion();
    const [trackWidth, setTrackWidth] = useState(0);

    const optionCount = options.length;
    if (!optionCount) {
        return null;
    }

    const showGlass = glass && isLiquidGlassSupported && !inset && !raisedTrack;
    const Track = showGlass ? GlassView : View;
    const trackPadding = small ? SMALL_TRACK_PADDING : compact ? COMPACT_TRACK_PADDING : TRACK_PADDING;
    const selectionColor = inset || !isLight ? settingSegment.selection : featuresScreen.divider;
    const isFixedCompact = compact && !fullWidth && !small;
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
    const SegmentButton = small ? ScalePressable : Pressable;
    const buttonStyle = [
        styles.button,
        small
            ? styles.smallButton
            : compact
                ? [styles.compactButton, isFixedCompact ? { width: segmentWidth } : styles.fullWidthButton]
                : styles.regularButton,
    ];

    return (
        <Track
            {...(showGlass && glassInteractive ? { isInteractive: true } : {})}
            onLayout={isFixedCompact ? undefined : event => setTrackWidth(event.nativeEvent.layout.width)}
            style={[
                styles.track,
                small ? styles.smallTrack : compact ? styles.compactTrack : styles.regularTrack,
                { padding: trackPadding },
                fullWidth && styles.fullWidthTrack,
                !showGlass && { backgroundColor: inset ? settingSegment.track : white },
                !showGlass && !inset && (isLight || raisedTrack) && viewShadow,
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
                            backgroundColor: selectionColor,
                            transform: [{ translateX: thumbTranslateX }],
                        },
                    ]}
                />
            ) : null}
            {options.map(({ key, label, badge }, index) => {
                const selected = index === selectedIndex;

                return (
                    <SegmentButton
                        key={key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        accessibilityLabel={label}
                        onPress={() => onChange(index)}
                        style={small ? buttonStyle : ({ pressed }) => [buttonStyle, pressed && styles.buttonPressed]}>
                        <View style={styles.labelRow}>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.label,
                                    compact && styles.compactLabel,
                                    small && styles.smallLabel,
                                    selected && styles.selectedLabel,
                                    { color: selected ? black.main : black.third },
                                ]}>
                                {label}
                            </Text>
                            {badge}
                        </View>
                    </SegmentButton>
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
    },
    compactTrack: {
        flexShrink: 0,
        marginHorizontal: scale(2),
    },
    smallTrack: {
        width: scale(128),
        maxWidth: '100%',
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
    smallButton: {
        flex: 1,
        height: SMALL_ITEM_HEIGHT,
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
    smallLabel: {
        fontSize: moderateScale(10, 0.25),
        fontWeight: '400',
    },
    selectedLabel: {
        fontWeight: '600',
    },
});
