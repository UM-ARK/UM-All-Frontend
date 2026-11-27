import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
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
const COMPACT_FIT_PADDING_H = scale(10);
const SMALL_TRACK_PADDING = scale(2.5);
const SMALL_ITEM_HEIGHT = moderateScale(20, 0.1);
const TAP_ANIM_DURATION_MS = 220;
const TAP_ANIM_EASING = Easing.bezier(0.23, 1, 0.32, 1);

export const SEGMENTED_TAB_CONTROL_HEIGHT = ITEM_HEIGHT + TRACK_PADDING * 2;
export const SMALL_SEGMENTED_TAB_CONTROL_HEIGHT = SMALL_ITEM_HEIGHT + SMALL_TRACK_PADDING * 2;
export const NATIVE_SEGMENT_CONTROL_HEIGHT = scale(32);

const NATIVE_SEGMENT_DUAL_WIDTH = scale(136);
const NATIVE_SEGMENT_MULTI_ITEM_WIDTH = scale(60);

/**
 * 原生 iOS 26 導覽列分段切換器寬度：
 * - 2 項統一收窄至 scale(136)（每格 scale(68)），兼顧緊湊比例、英文標籤與課表角標
 * - 3 項以上維持每格 scale(60)（3 項即 scale(180)），避免擠壓左右導覽列按鈕
 */
export const getNativeSegmentControlWidth = (count) => (
    count <= 2 ? NATIVE_SEGMENT_DUAL_WIDTH : count * NATIVE_SEGMENT_MULTI_ITEM_WIDTH
);

export default function SegmentedTabControl({
    options,
    selectedIndex,
    position,
    onChange,
    compact = false,
    compactItemWidth = COMPACT_ITEM_WIDTH,
    fitContent = false,
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
    const [segmentWidths, setSegmentWidths] = useState([]);
    const optionCount = options.length;
    const isFitContentCompact = compact && fitContent && !fullWidth && !small;
    // 點選切換進度：沒有外部分頁 position 時，由元件自己驅動滑塊／標籤動畫。
    const tapProgress = useRef(new Animated.Value(selectedIndex)).current;

    useEffect(() => {
        if (optionCount <= 1 || reducedMotion) {
            tapProgress.setValue(selectedIndex);
            return;
        }
        // 跟手滑頁由外層 position 負責；此處只同步內部進度，避免之後改為點選模式時錯位。
        if (position && !isFitContentCompact) {
            tapProgress.setValue(selectedIndex);
            return;
        }
        Animated.timing(tapProgress, {
            toValue: selectedIndex,
            duration: TAP_ANIM_DURATION_MS,
            easing: TAP_ANIM_EASING,
            // fitContent 要同時動畫寬度，不能走 native driver。
            useNativeDriver: !isFitContentCompact,
        }).start();
    }, [
        isFitContentCompact,
        optionCount,
        position,
        reducedMotion,
        selectedIndex,
        tapProgress,
    ]);

    if (!optionCount) {
        return null;
    }

    const showGlass = glass && isLiquidGlassSupported && !inset && !raisedTrack;
    const Track = showGlass ? GlassView : View;
    const trackPadding = small ? SMALL_TRACK_PADDING : compact ? COMPACT_TRACK_PADDING : TRACK_PADDING;
    const selectionColor = inset || !isLight ? settingSegment.selection : featuresScreen.divider;
    const isFixedCompact = compact && !fullWidth && !small && !fitContent;
    const segmentWidth = isFixedCompact
        ? compactItemWidth
        : isFitContentCompact
            ? 0
            : Math.max(0, (trackWidth - trackPadding * 2) / optionCount);
    const fitThumbWidth = isFitContentCompact
        ? (segmentWidths[selectedIndex] || 0)
        : 0;
    const fitThumbOffset = isFitContentCompact
        ? segmentWidths.slice(0, selectedIndex).reduce((sum, width) => sum + (width || 0), 0)
        : 0;
    const fitWidthsReady = isFitContentCompact
        && segmentWidths.length === optionCount
        && segmentWidths.every(width => width > 0);
    const fitInputRange = fitWidthsReady
        ? segmentWidths.map((_, index) => index)
        : null;
    const fitOffsetRange = fitWidthsReady
        ? segmentWidths.reduce((offsets, width, index) => {
            offsets.push(index === 0 ? 0 : offsets[index - 1] + segmentWidths[index - 1]);
            return offsets;
        }, [])
        : null;
    // 優先跟手滑頁；否則用內部點選進度（含 fitContent）。
    const useSwipePosition = Boolean(position) && !reducedMotion && optionCount > 1 && !isFitContentCompact;
    const animatedPosition = useSwipePosition
        ? position
        : (!reducedMotion && optionCount > 1 ? tapProgress : null);
    const thumbTranslateX = isFitContentCompact
        ? (animatedPosition && fitWidthsReady
            ? animatedPosition.interpolate({
                inputRange: fitInputRange,
                outputRange: fitOffsetRange,
                extrapolate: 'clamp',
            })
            : fitThumbOffset)
        : animatedPosition?.interpolate({
            inputRange: [0, optionCount - 1],
            outputRange: [0, (optionCount - 1) * segmentWidth],
            extrapolate: 'clamp',
        }) ?? selectedIndex * segmentWidth;
    const thumbWidth = isFitContentCompact
        ? (animatedPosition && fitWidthsReady
            ? animatedPosition.interpolate({
                inputRange: fitInputRange,
                outputRange: segmentWidths,
                extrapolate: 'clamp',
            })
            : fitThumbWidth)
        : segmentWidth;
    const showThumb = isFitContentCompact
        ? (fitWidthsReady || fitThumbWidth > 0)
        : segmentWidth > 0;
    const SegmentButton = small ? ScalePressable : Pressable;
    const buttonStyle = [
        styles.button,
        small
            ? styles.smallButton
            : compact
                ? [
                    styles.compactButton,
                    isFitContentCompact
                        ? styles.fitContentButton
                        : isFixedCompact
                            ? { width: segmentWidth }
                            : styles.fullWidthButton,
                ]
                : styles.regularButton,
    ];

    return (
        <Track
            {...(showGlass && glassInteractive ? { isInteractive: true } : {})}
            onLayout={isFixedCompact || isFitContentCompact
                ? undefined
                : event => setTrackWidth(event.nativeEvent.layout.width)}
            style={[
                styles.track,
                small ? styles.smallTrack : compact ? styles.compactTrack : styles.regularTrack,
                { padding: trackPadding },
                fullWidth && styles.fullWidthTrack,
                !showGlass && { backgroundColor: inset ? settingSegment.track : white },
                !showGlass && !inset && (isLight || raisedTrack) && viewShadow,
                raisedTrack && styles.raisedTrack,
            ]}>
            {showThumb ? (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.thumb,
                        {
                            top: trackPadding,
                            bottom: trackPadding,
                            left: trackPadding,
                            width: thumbWidth,
                            backgroundColor: selectionColor,
                            transform: [{ translateX: thumbTranslateX }],
                        },
                    ]}
                />
            ) : null}
            {options.map(({ key, label, badge }, index) => {
                const selected = index === selectedIndex;
                const selectedOpacity = animatedPosition?.interpolate({
                    inputRange: [index - 1, index, index + 1],
                    outputRange: [0, 1, 0],
                    extrapolate: 'clamp',
                });
                const labelStyle = [
                    styles.label,
                    compact && styles.compactLabel,
                    small && styles.smallLabel,
                    isFitContentCompact && styles.fitContentLabel,
                ];

                return (
                    <SegmentButton
                        key={key}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        accessibilityLabel={label}
                        onPress={() => onChange(index)}
                        onLayout={isFitContentCompact
                            ? event => {
                                const width = event.nativeEvent.layout.width;
                                setSegmentWidths(prev => {
                                    if (prev.length === optionCount && prev[index] === width) {
                                        return prev;
                                    }
                                    const next = prev.length === optionCount
                                        ? prev.slice()
                                        : Array(optionCount).fill(0);
                                    next[index] = width;
                                    return next;
                                });
                            }
                            : undefined}
                        style={small ? buttonStyle : ({ pressed }) => [buttonStyle, pressed && styles.buttonPressed]}>
                        <View style={styles.labelRow}>
                            {selectedOpacity ? (
                                <View aria-hidden style={styles.animatedLabel}>
                                    <Animated.View style={{ opacity: selectedOpacity }}>
                                        <Text
                                            numberOfLines={1}
                                            style={[labelStyle, styles.selectedLabel, { color: black.main }]}>
                                            {label}
                                        </Text>
                                    </Animated.View>
                                    <Animated.View style={[StyleSheet.absoluteFill, styles.inactiveLabelLayer, {
                                        opacity: Animated.subtract(1, selectedOpacity),
                                    }]}>
                                        <Text numberOfLines={1} style={[labelStyle, styles.centeredLabel, { color: black.third }]}>
                                            {label}
                                        </Text>
                                    </Animated.View>
                                </View>
                            ) : (
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        labelStyle,
                                        selected && styles.selectedLabel,
                                        { color: selected ? black.main : black.third },
                                    ]}>
                                    {label}
                                </Text>
                            )}
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
    fitContentButton: {
        paddingHorizontal: COMPACT_FIT_PADDING_H,
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
    animatedLabel: {
        flexShrink: 1,
    },
    inactiveLabelLayer: {
        justifyContent: 'center',
    },
    centeredLabel: {
        textAlign: 'center',
    },
    label: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: moderateScale(12.5, 0.25),
        fontWeight: '500',
    },
    fitContentLabel: {
        flexShrink: 0,
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
