import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scale, verticalScale } from 'react-native-size-matters';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '../../../components/ThemeContext';
import { DAY_END, HALF_WINDOW_MINUTES, SAMPLE_MINUTES, formatTime } from './eatingScheduleModel';

const AXIS_LEFT = scale(30);
const AXIS_RIGHT = scale(18);
const AXIS_FONT_SIZE = scale(10);
const TIME_HEIGHT = verticalScale(228);
const TIME_TOP = verticalScale(25);
const TIME_BOTTOM = TIME_HEIGHT - verticalScale(24);
const BUILDING_HEIGHT = verticalScale(156);
const BUILDING_TOP = verticalScale(12);
const BUILDING_BOTTOM = BUILDING_HEIGHT - verticalScale(42);

const CountGrid = ({ right, top, bottom, step, maximum = step * 4, theme }) => (
    Array.from({ length: Math.floor(maximum / step) + 1 }, (_, index) => {
        const count = index * step;
        const y = bottom - (bottom - top) * count / maximum;
        return (
            <React.Fragment key={index}>
                <Line x1={AXIS_LEFT} x2={right} y1={y} y2={y} stroke={theme.pressOverlay} />
                <SvgText
                    x={AXIS_LEFT - scale(6)}
                    y={y + AXIS_FONT_SIZE / 3}
                    fill={theme.black.third}
                    fontSize={AXIS_FONT_SIZE}
                    textAnchor="end">
                    {count}
                </SvgText>
            </React.Fragment>
        );
    })
);

export const TimeChart = ({
    samples,
    startMinute,
    peak,
    nowMinute,
    nowLabel,
    selectedSample,
    onSelect,
    accessibilityLabel,
    accessibilityHint,
    accessibilityValue,
}) => {
    const { theme } = useTheme();
    const [width, setWidth] = useState(0);
    const lastScrubbedMinute = useSharedValue(null);
    const right = width - AXIS_RIGHT;
    const plotWidth = right - AXIS_LEFT;
    const span = DAY_END - startMinute;
    const maximum = Math.max(1, peak);
    const tickStep = [1, 2, 5, 10, 20, 25, 50, 100].find(step => step * 5 >= maximum) ?? Math.ceil(maximum / 5);
    const x = useCallback(minute => AXIS_LEFT + (minute - startMinute) / span * plotWidth, [plotWidth, span, startMinute]);
    const y = useCallback(count => TIME_BOTTOM - count / maximum * (TIME_BOTTOM - TIME_TOP), [maximum]);
    const showNow = nowMinute !== null && nowMinute >= startMinute && nowMinute <= DAY_END;
    const nowX = showNow ? x(nowMinute) : 0;
    const badgeWidth = scale(83);
    const badgeX = Math.max(0, Math.min(width - badgeWidth, nowX - badgeWidth / 2));

    const sampleCount = samples.length;
    const gesture = useMemo(() => {
        const enabled = plotWidth > 0 && sampleCount > 0;
        const selectAt = (position, feedback) => {
            'worklet';
            const offset = (position - AXIS_LEFT) / plotWidth * span;
            const index = Math.max(0, Math.min(sampleCount - 1, Math.round(offset / SAMPLE_MINUTES)));
            const minute = startMinute + index * SAMPLE_MINUTES;
            if (!feedback && minute === lastScrubbedMinute.get()) return;
            lastScrubbedMinute.set(minute);
            scheduleOnRN(onSelect, minute, feedback);
        };

        const pan = Gesture.Pan()
            .enabled(enabled)
            .maxPointers(1)
            .activeOffsetX([-6, 6])
            .failOffsetY([-8, 8])
            .onStart(event => {
                selectAt(event.x, true);
            })
            .onUpdate(event => {
                selectAt(event.x, false);
            })
            .onEnd((event, success) => {
                if (success) selectAt(event.x, false);
            });

        const tap = Gesture.Tap()
            .enabled(enabled)
            .maxDistance(8)
            .onEnd((event, success) => {
                if (success) selectAt(event.x, true);
            });

        return Gesture.Race(pan, tap);
    }, [lastScrubbedMinute, onSelect, plotWidth, sampleCount, span, startMinute]);

    const increment = ({ nativeEvent }) => {
        const delta = nativeEvent.actionName === 'increment' ? SAMPLE_MINUTES : -SAMPLE_MINUTES;
        const minute = (selectedSample?.minute ?? nowMinute ?? startMinute) + delta;
        const index = Math.round((minute - startMinute) / SAMPLE_MINUTES);
        const sample = samples[Math.max(0, Math.min(sampleCount - 1, index))];
        if (sample) onSelect(sample.minute);
    };

    const line = useMemo(() => plotWidth > 0 ? samples.map(({ minute, count }, index) =>
        `${index === 0 ? 'M' : 'L'}${x(minute)},${y(count)}`,
    ).join(' ') : '', [plotWidth, samples, x, y]);
    const tickInterval = 4 * 60;
    const firstTick = Math.ceil(startMinute / tickInterval) * tickInterval;
    const ticks = Array.from(
        { length: (DAY_END - firstTick) / tickInterval + 1 },
        (_, index) => firstTick + index * tickInterval,
    );

    return (
        <View
            style={{ height: TIME_HEIGHT }}
            onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
            accessible={sampleCount > 0}
            accessibilityRole="adjustable"
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityValue={accessibilityValue ? { text: accessibilityValue } : undefined}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={increment}>
            {plotWidth > 0 ? (
                <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                    <Svg width={width} height={TIME_HEIGHT}>
                        <CountGrid right={right} top={TIME_TOP} bottom={TIME_BOTTOM} step={tickStep} maximum={maximum} theme={theme} />
                        {selectedSample ? (
                            <Rect
                                x={x(Math.max(startMinute, selectedSample.minute - HALF_WINDOW_MINUTES))}
                                y={TIME_TOP}
                                width={x(Math.min(DAY_END, selectedSample.minute + HALF_WINDOW_MINUTES)) -
                                    x(Math.max(startMinute, selectedSample.minute - HALF_WINDOW_MINUTES))}
                                height={TIME_BOTTOM - TIME_TOP}
                                fill={theme.tonal.primary15}
                            />
                        ) : null}
                        {line ? (
                            <>
                                <Path d={`${line} L${right},${TIME_BOTTOM} L${AXIS_LEFT},${TIME_BOTTOM} Z`} fill={theme.tonal.primary30} />
                                <Path d={line} fill="none" stroke={theme.themeColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                            </>
                        ) : null}
                        {ticks.map(minute => (
                            <SvgText
                                key={minute}
                                x={x(minute)}
                                y={TIME_HEIGHT - verticalScale(5)}
                                fill={theme.black.third}
                                fontSize={AXIS_FONT_SIZE}
                                textAnchor="middle">
                                {formatTime(minute)}
                            </SvgText>
                        ))}
                        {showNow ? (
                            <>
                                <Line x1={nowX} x2={nowX} y1={verticalScale(19)} y2={TIME_BOTTOM} stroke={theme.black.main} strokeDasharray={[4, 3]} />
                                <Rect x={badgeX} y={0} width={badgeWidth} height={verticalScale(20)} rx={scale(6)} fill={theme.black.main} />
                                <SvgText
                                    x={badgeX + badgeWidth / 2}
                                    y={verticalScale(14)}
                                    fill={theme.white}
                                    fontSize={AXIS_FONT_SIZE}
                                    textAnchor="middle">
                                    {nowLabel}
                                </SvgText>
                            </>
                        ) : null}
                        {selectedSample ? (
                            <>
                                <Line x1={x(selectedSample.minute)} x2={x(selectedSample.minute)} y1={TIME_TOP} y2={TIME_BOTTOM} stroke={theme.themeColor} />
                                <Circle
                                    cx={x(selectedSample.minute)}
                                    cy={y(selectedSample.count)}
                                    r={scale(4)}
                                    fill={theme.white}
                                    stroke={theme.accentForeground}
                                    strokeWidth={2}
                                />
                            </>
                        ) : null}
                    </Svg>
                </View>
            ) : null}
            <GestureDetector gesture={gesture} touchAction="pan-y">
                <View collapsable={false} style={StyleSheet.absoluteFill} />
            </GestureDetector>
        </View>
    );
};

export const BuildingChart = ({ buildings, accessibilityLabel }) => {
    const { theme } = useTheme();
    const [width, setWidth] = useState(0);
    const right = width - AXIS_RIGHT;
    const slot = (right - AXIS_LEFT) / buildings.length;
    const barWidth = Math.min(scale(32), slot * 0.66);
    const peak = buildings[0][1];
    const step = [1, 2, 5, 10, 20, 25, 50, 100].find(tick => tick * 4 >= peak) ?? Math.ceil(peak / 4);
    const rotateLabels = slot < scale(28);
    const labelY = BUILDING_BOTTOM + verticalScale(rotateLabels ? 7 : 18);

    return (
        <View
            style={{ height: BUILDING_HEIGHT }}
            onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
            accessible
            accessibilityRole="image"
            accessibilityLabel={accessibilityLabel}>
            {slot > 0 ? (
                <Svg width={width} height={BUILDING_HEIGHT}>
                    <CountGrid right={right} top={BUILDING_TOP} bottom={BUILDING_BOTTOM} step={step} theme={theme} />
                    {buildings.map(([building, count], index) => {
                        const x = AXIS_LEFT + slot * (index + 0.5);
                        const height = (BUILDING_BOTTOM - BUILDING_TOP) * count / (step * 4);
                        return (
                            <React.Fragment key={building}>
                                <Rect x={x - barWidth / 2} y={BUILDING_BOTTOM - height} width={barWidth} height={height} rx={scale(2)} fill={theme.themeColor} />
                                <SvgText
                                    x={x}
                                    y={labelY}
                                    fill={theme.black.third}
                                    fontSize={AXIS_FONT_SIZE}
                                    textAnchor={rotateLabels ? 'end' : 'middle'}
                                    transform={rotateLabels ? `rotate(-90, ${x}, ${labelY})` : undefined}>
                                    {building}
                                </SvgText>
                            </React.Fragment>
                        );
                    })}
                </Svg>
            ) : null}
        </View>
    );
};
