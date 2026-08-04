/**
 * 組隊約時間：固定每週時間板（週一至週日七欄）
 * mode: candidate（建立）／readonly 熱力／availability 編輯
 */
import React, {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';

import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {normalizeSlotMinutes} from '../../../utils/scheduling/schedulingModels';
import {trigger} from '../../../utils/trigger';
import {
    applyDraftGesture,
    createEmptyDraft,
    resolveGestureMode,
    toggleDraftSlot,
} from '../utils/scheduleDraft';
import {isSlotInsideCandidateWindows} from '../utils/scheduleGrid';
import {slotKey} from '../utils/scheduleRanges';
import {
    CANDIDATE_AXIS_END_HOUR,
    CANDIDATE_AXIS_START_HOUR,
    WEEKDAY_SHORT_LABELS,
    buildWeeklySlots,
    formatMinuteOfDay,
    heatToBackgroundColor,
} from './scheduleWeekHelpers';

const TIME_LABEL_WIDTH = scale(32);
const DAY_HEADER_HEIGHT = verticalScale(25);
const SLOT_HEIGHT = scale(16);

const ScheduleWeekGrid = ({
    mode = 'candidate',
    slotMinutes = 15,
    draft,
    onDraftChange,
    onPaintingChange,
    candidateWindows,
    heatmapByKey,
    selfSelectedKeys,
    onSlotPress,
    scrollToStartMinute,
}) => {
    const {theme} = useTheme();
    const slot = normalizeSlotMinutes(slotMinutes);
    const isCandidateMode = mode === 'candidate';
    const isEditMode = mode === 'availability';
    const isReadonlyMode = mode === 'readonly';
    const interactive = isCandidateMode || isEditMode;

    const axis = useMemo(() => {
        if (isCandidateMode) {
            return {
                startMinute: CANDIDATE_AXIS_START_HOUR * 60,
                endMinute: CANDIDATE_AXIS_END_HOUR * 60,
            };
        }
        const windows = Array.isArray(candidateWindows) ? candidateWindows : [];
        if (windows.length === 0) {
            return {startMinute: 0, endMinute: 0};
        }
        const startMinute = Math.min(
            ...windows.map(item => Number(item.startMinute)),
        );
        const endMinute = Math.max(
            ...windows.map(item => Number(item.endMinute)),
        );
        return {startMinute, endMinute};
    }, [candidateWindows, isCandidateMode]);

    const rows = useMemo(() => {
        const labels = [];
        for (
            let minute = axis.startMinute;
            minute < axis.endMinute;
            minute += slot
        ) {
            labels.push(minute);
        }
        return labels;
    }, [axis.endMinute, axis.startMinute, slot]);

    const slotsByColRow = useMemo(() => {
        const map = new Map();
        const slots = isCandidateMode
            ? Array.from({length: 7}, (_, index) => ({
                  weekday: index + 1,
                  startMinute: axis.startMinute,
                  endMinute: axis.endMinute,
              }))
            : candidateWindows;
        const expanded = buildWeeklySlots(slots, slot);
        for (let i = 0; i < expanded.length; i++) {
            const item = expanded[i];
            const row = Math.round(
                (item.startMinute - axis.startMinute) / slot,
            );
            if (row < 0 || row >= rows.length) {
                continue;
            }
            map.set(`${item.weekday - 1}:${row}`, item);
        }
        return map;
    }, [axis.endMinute, axis.startMinute, candidateWindows, isCandidateMode, rows.length, slot]);

    const selectedSet = useMemo(
        () => new Set((draft && draft.selectedKeys) || []),
        [draft],
    );
    const selfOutlineSet = useMemo(() => {
        if (isEditMode) {
            return selectedSet;
        }
        return new Set(selfSelectedKeys || []);
    }, [isEditMode, selectedSet, selfSelectedKeys]);
    const heatMap = useMemo(() => {
        if (!heatmapByKey) {
            return null;
        }
        return heatmapByKey instanceof Map
            ? heatmapByKey
            : new Map(Object.entries(heatmapByKey));
    }, [heatmapByKey]);

    const draftRef = useRef(draft);
    draftRef.current = draft;
    const gestureModeRef = useRef(null);
    const lastPaintedKeyRef = useRef(null);
    const touchDownRef = useRef({x: 0, y: 0});
    const scrollRef = useRef(null);
    const [gridWidth, setGridWidth] = useState(0);
    const [isPainting, setIsPaintingState] = useState(false);
    const colWidth = gridWidth > TIME_LABEL_WIDTH
        ? (gridWidth - TIME_LABEL_WIDTH) / 7
        : 0;

    // 整數像素對齊，避免 hairline 因浮點尺寸被吃掉
    const getColFrame = useCallback(col => {
        if (colWidth <= 0) {
            return {left: TIME_LABEL_WIDTH, width: 0};
        }
        const left = TIME_LABEL_WIDTH + Math.round(col * colWidth);
        const nextLeft = TIME_LABEL_WIDTH + Math.round((col + 1) * colWidth);
        return {left, width: nextLeft - left};
    }, [colWidth]);

    const getRowFrame = useCallback(row => {
        const top = Math.round(row * SLOT_HEIGHT);
        const nextTop = Math.round((row + 1) * SLOT_HEIGHT);
        return {top, height: nextTop - top};
    }, []);

    const hitTest = useCallback((x, y) => {
        if (colWidth <= 0) {
            return null;
        }
        const localX = x - TIME_LABEL_WIDTH;
        if (localX < 0 || y < 0) {
            return null;
        }
        const col = Math.floor(localX / colWidth);
        const row = Math.floor(y / SLOT_HEIGHT);
        if (col < 0 || col > 6 || row < 0 || row >= rows.length) {
            return null;
        }
        return slotsByColRow.get(`${col}:${row}`) || null;
    }, [colWidth, rows.length, slotsByColRow]);

    const setPainting = useCallback(value => {
        setIsPaintingState(value);
        onPaintingChange?.(value);
    }, [onPaintingChange]);

    const storeTouchDown = useCallback((x, y) => {
        touchDownRef.current = {x, y};
    }, []);

    const isSlotEditable = useCallback(slotItem => {
        if (!slotItem) {
            return false;
        }
        return isCandidateMode || (
            isEditMode && isSlotInsideCandidateWindows(slotItem, candidateWindows)
        );
    }, [candidateWindows, isCandidateMode, isEditMode]);

    const paintSlotIfAllowed = useCallback((slotItem, modeGesture) => {
        if (!isSlotEditable(slotItem) || !onDraftChange) {
            return false;
        }
        onDraftChange(applyDraftGesture(
            draftRef.current || createEmptyDraft({
                mode: isCandidateMode ? 'candidate' : 'availability',
                slotMinutes: slot,
            }),
            [slotItem],
            modeGesture,
        ));
        return true;
    }, [isCandidateMode, isSlotEditable, onDraftChange, slot]);

    const handleGestureStart = useCallback(() => {
        if (!interactive) {
            return;
        }
        const slotItem = hitTest(touchDownRef.current.x, touchDownRef.current.y);
        if (!isSlotEditable(slotItem)) {
            return;
        }
        trigger();
        setPainting(true);
        const modeGesture = resolveGestureMode(draftRef.current, slotItem);
        gestureModeRef.current = modeGesture;
        lastPaintedKeyRef.current = slotKey(slotItem);
        paintSlotIfAllowed(slotItem, modeGesture);
    }, [hitTest, interactive, isSlotEditable, paintSlotIfAllowed, setPainting]);

    const handleGestureMove = useCallback((x, y) => {
        if (!gestureModeRef.current) {
            return;
        }
        const slotItem = hitTest(x, y);
        const key = slotItem ? slotKey(slotItem) : null;
        if (!key || key === lastPaintedKeyRef.current) {
            return;
        }
        if (paintSlotIfAllowed(slotItem, gestureModeRef.current)) {
            lastPaintedKeyRef.current = key;
        }
    }, [hitTest, paintSlotIfAllowed]);

    const handleGestureEnd = useCallback(() => {
        gestureModeRef.current = null;
        lastPaintedKeyRef.current = null;
        setPainting(false);
    }, [setPainting]);

    const handleTap = useCallback((x, y) => {
        const slotItem = hitTest(x, y);
        if (!slotItem) {
            return;
        }
        if (isReadonlyMode) {
            trigger();
            onSlotPress?.(slotItem);
            return;
        }
        if (!interactive || !isSlotEditable(slotItem)) {
            return;
        }
        trigger();
        onDraftChange?.(toggleDraftSlot(
            draftRef.current || createEmptyDraft({
                mode: isCandidateMode ? 'candidate' : 'availability',
                slotMinutes: slot,
            }),
            slotItem,
        ));
    }, [hitTest, interactive, isCandidateMode, isReadonlyMode, isSlotEditable, onDraftChange, onSlotPress, slot]);

    const composedGesture = useMemo(() => {
        if (isReadonlyMode) {
            return Gesture.Tap().onEnd(event => {
                runOnJS(handleTap)(event.x, event.y);
            });
        }
        const panGesture = Gesture.Pan()
            .activateAfterLongPress(200)
            .onBegin(event => {
                runOnJS(storeTouchDown)(event.x, event.y);
            })
            .onStart(() => runOnJS(handleGestureStart)())
            .onUpdate(event => runOnJS(handleGestureMove)(event.x, event.y))
            .onFinalize(() => runOnJS(handleGestureEnd)())
            .shouldCancelWhenOutside(false);
        const tapGesture = Gesture.Tap().onEnd(event => {
            runOnJS(handleTap)(event.x, event.y);
        });
        return Gesture.Exclusive(panGesture, tapGesture);
    }, [handleGestureEnd, handleGestureMove, handleGestureStart, handleTap, isReadonlyMode, storeTouchDown]);

    useEffect(() => {
        if (!Number.isInteger(scrollToStartMinute) || !scrollRef.current) {
            return;
        }
        const row = Math.round((scrollToStartMinute - axis.startMinute) / slot);
        if (row >= 0) {
            scrollRef.current.scrollTo({
                y: Math.max(0, row * SLOT_HEIGHT - SLOT_HEIGHT * 2),
                animated: true,
            });
        }
    }, [axis.startMinute, scrollToStartMinute, slot]);

    const bodyHeight = Math.round(rows.length * SLOT_HEIGHT);
    const renderSlotCell = (col, row) => {
        const {left, width} = getColFrame(col);
        const {top, height} = getRowFrame(row);
        const slotItem = slotsByColRow.get(`${col}:${row}`);
        if (!slotItem && !isCandidateMode) {
            return (
                <View
                    key={`empty-${col}-${row}`}
                    pointerEvents="none"
                    style={[styles.slotCell, styles.slotDisabled, {
                        top,
                        left,
                        width,
                        height,
                        backgroundColor: theme.tonal.primary08,
                    }]}
                />
            );
        }
        if (!slotItem) {
            return null;
        }
        const key = slotKey(slotItem);
        const heat = heatMap?.get(key)?.heat ?? 0;
        const selected = selectedSet.has(key);
        const selfOutlined = selfOutlineSet.has(key);
        const selectable = isSlotEditable(slotItem);
        let backgroundColor = theme.white;
        if (isCandidateMode) {
            backgroundColor = selected ? theme.tonal.primary30 : theme.white;
        } else {
            backgroundColor = heatToBackgroundColor(heat, theme, isEditMode);
            if (isEditMode && selected) {
                backgroundColor = theme.tonal.primary50;
            }
        }
        return (
            <View
                key={key}
                pointerEvents="none"
                style={[styles.slotCell, {
                    top,
                    left,
                    width,
                    height,
                    backgroundColor,
                }, selfOutlined && {
                    borderColor: theme.themeColor,
                    borderWidth: StyleSheet.hairlineWidth * 2,
                }, isCandidateMode && selected && selectable && {
                    borderColor: theme.themeColor,
                    borderWidth: StyleSheet.hairlineWidth * 2,
                }]}
            />
        );
    };

    return (
        <View
            style={[styles.container, {
                backgroundColor: theme.white,
                borderColor: theme.themeColorUltraLight,
            }]}
            onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>
            <View style={styles.headerRow}>
                <View style={{width: TIME_LABEL_WIDTH}} />
                {WEEKDAY_SHORT_LABELS.map((label, index) => (
                    <View
                        key={label}
                        style={[styles.dayHeaderCell, {width: getColFrame(index).width}]}>
                        <Text style={[styles.weekdayText, {color: theme.black.main}]}>
                            {`週${label}`}
                        </Text>
                    </View>
                ))}
            </View>
            <ScrollView
                ref={scrollRef}
                nestedScrollEnabled
                scrollEnabled={!isPainting}
                style={styles.timeScroll}
                showsVerticalScrollIndicator={false}>
                <GestureDetector gesture={composedGesture}>
                    <View style={[styles.body, {height: bodyHeight}]}>
                        {rows.map((minute, row) => {
                            const showLabel = slot >= 60 || minute % 60 === 0;
                            const {top, height} = getRowFrame(row);
                            return (
                                <View
                                    key={`label-${minute}`}
                                    pointerEvents="none"
                                    style={[styles.timeLabel, {
                                        top,
                                        height,
                                    }]}>
                                    {showLabel || row === 0 ? (
                                        <Text style={[styles.timeLabelText, {color: theme.black.third}]}>
                                            {formatMinuteOfDay(minute)}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })}
                        {Array.from({length: 7}, (__, col) =>
                            rows.map((___, row) => renderSlotCell(col, row)),
                        )}
                        {/* 獨立格線：避免每格 hairline 在半像素列消失 */}
                        {Array.from({length: 7}, (_, col) => {
                            const {left, width} = getColFrame(col);
                            return (
                                <View
                                    key={`vline-${col}`}
                                    pointerEvents="none"
                                    style={[styles.gridLineV, {
                                        left: left + width - StyleSheet.hairlineWidth,
                                        height: bodyHeight,
                                        backgroundColor: theme.themeColorUltraLight,
                                    }]}
                                />
                            );
                        })}
                        {rows.map((_, row) => {
                            const {top, height} = getRowFrame(row);
                            return (
                                <View
                                    key={`hline-${row}`}
                                    pointerEvents="none"
                                    style={[styles.gridLineH, {
                                        top: top + height - StyleSheet.hairlineWidth,
                                        left: TIME_LABEL_WIDTH,
                                        backgroundColor: theme.themeColorUltraLight,
                                    }]}
                                />
                            );
                        })}
                    </View>
                </GestureDetector>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    headerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        height: DAY_HEADER_HEIGHT,
    },
    timeScroll: {
        maxHeight: verticalScale(360),
    },
    dayHeaderCell: {
        alignItems: 'center',
        height: DAY_HEADER_HEIGHT,
        justifyContent: 'center',
    },
    weekdayText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
    },
    body: {
        position: 'relative',
        width: '100%',
    },
    timeLabel: {
        justifyContent: 'flex-start',
        left: 0,
        paddingLeft: scale(2),
        position: 'absolute',
        width: TIME_LABEL_WIDTH,
    },
    timeLabelText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
    },
    slotCell: {
        position: 'absolute',
    },
    gridLineV: {
        position: 'absolute',
        top: 0,
        width: StyleSheet.hairlineWidth,
    },
    gridLineH: {
        position: 'absolute',
        right: 0,
        height: StyleSheet.hairlineWidth,
    },
    slotDisabled: {
        opacity: 0.45,
    },
});

export default memo(ScheduleWeekGrid);
