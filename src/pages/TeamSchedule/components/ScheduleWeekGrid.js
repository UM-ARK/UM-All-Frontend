/**
 * 組隊約時間：七日時間板（週一～週日固定七欄）
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

import moment from 'moment-timezone';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {runOnJS} from 'react-native-reanimated';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {
    DEFAULT_TIMEZONE,
    normalizeSlotMinutes,
    normalizeTimezone,
    parseInTimezone,
} from '../../../utils/scheduling/schedulingModels';
import {trigger} from '../../../utils/trigger';
import {
    applyDraftGesture,
    createEmptyDraft,
    resolveGestureMode,
    toggleDraftSlot,
} from '../utils/scheduleDraft';
import {
    buildWeekPage,
    getWeekDateKeys,
    getWeekStartDate,
    groupWindowsByDate,
    isSlotInsideCandidateWindows,
} from '../utils/scheduleGrid';
import {slotKey} from '../utils/scheduleRanges';
import {
    CANDIDATE_AXIS_END_HOUR,
    CANDIDATE_AXIS_START_HOUR,
    WEEKDAY_SHORT_LABELS,
    buildCandidateWeekSlots,
    buildDetailWeekSlots,
    getEarliestSelectableStart,
    getEventExpiryMoment,
    heatToBackgroundColor,
    isCandidateSlotSelectable,
} from './scheduleWeekHelpers';

const TIME_LABEL_WIDTH = scale(40);
const DAY_HEADER_HEIGHT = verticalScale(40);
const SLOT_HEIGHT = scale(16);

/**
 * @param {object} props
 * @param {'candidate'|'availability'|'readonly'} [props.mode]
 * @param {string} props.weekStartDate
 * @param {string} [props.timezone]
 * @param {number} [props.slotMinutes]
 * @param {object} [props.draft]
 * @param {(next: object) => void} [props.onDraftChange]
 * @param {(painting: boolean) => void} [props.onPaintingChange]
 * @param {Array} [props.candidateWindows] 詳情模式候選 windows
 * @param {Map<string, object>|Record<string, object>} [props.heatmapByKey]
 * @param {string[]} [props.selfSelectedKeys] readonly 本人描邊
 * @param {(slot: object) => void} [props.onSlotPress] readonly 點格
 * @param {string|null} [props.scrollToStartAt] 捲動到指定 slot 起點
 */
const ScheduleWeekGrid = ({
    mode = 'candidate',
    weekStartDate,
    timezone = DEFAULT_TIMEZONE,
    slotMinutes = 15,
    draft,
    onDraftChange,
    onPaintingChange,
    candidateWindows,
    heatmapByKey,
    selfSelectedKeys,
    onSlotPress,
    scrollToStartAt,
}) => {
    const {theme} = useTheme();
    const tz = normalizeTimezone(timezone);
    const slot = normalizeSlotMinutes(slotMinutes);
    const resolvedWeekStart = getWeekStartDate(weekStartDate, tz);
    const dateKeys = useMemo(
        () => getWeekDateKeys(resolvedWeekStart, tz),
        [resolvedWeekStart, tz],
    );

    const isCandidateMode = mode === 'candidate';
    const isEditMode = mode === 'availability';
    const isReadonlyMode = mode === 'readonly';
    const interactive = isCandidateMode || isEditMode;

    const earliestStart = useMemo(
        () => getEarliestSelectableStart(tz, slot),
        [tz, slot],
    );
    const expiryAt = useMemo(() => getEventExpiryMoment(tz), [tz]);

    const weekPage = useMemo(() => {
        if (isCandidateMode) {
            return null;
        }
        const windowsByDate = groupWindowsByDate(candidateWindows, tz);
        return buildWeekPage(resolvedWeekStart, windowsByDate, tz, slot);
    }, [
        candidateWindows,
        isCandidateMode,
        resolvedWeekStart,
        slot,
        tz,
    ]);

    const weekSlots = useMemo(() => {
        if (isCandidateMode) {
            return buildCandidateWeekSlots(resolvedWeekStart, tz, slot);
        }
        return buildDetailWeekSlots(
            resolvedWeekStart,
            candidateWindows,
            tz,
            slot,
        );
    }, [
        candidateWindows,
        isCandidateMode,
        resolvedWeekStart,
        slot,
        tz,
    ]);

    // 縱軸：candidate 用 08–22；詳情用該週 candidate axis
    const rows = useMemo(() => {
        if (isCandidateMode) {
            const start = moment.tz(
                `${dateKeys[0]} ${String(CANDIDATE_AXIS_START_HOUR).padStart(2, '0')}:00`,
                'YYYY-MM-DD HH:mm',
                tz,
            );
            const end = moment.tz(
                `${dateKeys[0]} ${String(CANDIDATE_AXIS_END_HOUR).padStart(2, '0')}:00`,
                'YYYY-MM-DD HH:mm',
                tz,
            );
            const count = Math.max(0, end.diff(start, 'minutes') / slot);
            const labels = [];
            for (let i = 0; i < count; i++) {
                labels.push(start.clone().add(i * slot, 'minutes'));
            }
            return labels;
        }

        const axisStart = weekPage?.axisStartAt
            ? parseInTimezone(weekPage.axisStartAt, tz)
            : null;
        const axisEnd = weekPage?.axisEndAt
            ? parseInTimezone(weekPage.axisEndAt, tz)
            : null;
        if (!axisStart || !axisEnd || !axisEnd.isAfter(axisStart)) {
            return [];
        }
        // 以牆鐘對齊每日同軸：取 axis 在週一當天的時分作為日軸起訖
        const dayAxisStart = moment.tz(
            `${dateKeys[0]} ${axisStart.format('HH:mm')}`,
            'YYYY-MM-DD HH:mm',
            tz,
        );
        const dayAxisEnd = moment.tz(
            `${dateKeys[0]} ${axisEnd.format('HH:mm')}`,
            'YYYY-MM-DD HH:mm',
            tz,
        );
        // 若跨日 axis，退回用分鐘差展開（仍顯示於同軸）
        let endMoment = dayAxisEnd;
        if (!endMoment.isAfter(dayAxisStart)) {
            const minutes = Math.max(
                slot,
                axisEnd.diff(axisStart, 'minutes'),
            );
            endMoment = dayAxisStart.clone().add(minutes, 'minutes');
        }
        const count = Math.max(
            0,
            Math.round(endMoment.diff(dayAxisStart, 'minutes') / slot),
        );
        const labels = [];
        for (let i = 0; i < count; i++) {
            labels.push(dayAxisStart.clone().add(i * slot, 'minutes'));
        }
        return labels;
    }, [dateKeys, isCandidateMode, slot, tz, weekPage]);

    const axisDayStart = rows[0] || null;

    const slotsByColRow = useMemo(() => {
        const map = new Map();
        if (!axisDayStart) {
            return map;
        }
        for (let i = 0; i < weekSlots.length; i++) {
            const item = weekSlots[i];
            const col = dateKeys.indexOf(item.date);
            if (col < 0) {
                continue;
            }
            const start = parseInTimezone(item.startAt, tz);
            if (!start) {
                continue;
            }
            const dayAxisStart = moment.tz(
                `${item.date} ${axisDayStart.format('HH:mm')}`,
                'YYYY-MM-DD HH:mm',
                tz,
            );
            const row = Math.round(start.diff(dayAxisStart, 'minutes') / slot);
            if (row < 0 || row >= rows.length) {
                continue;
            }
            map.set(`${col}:${row}`, item);
        }
        return map;
    }, [axisDayStart, dateKeys, rows.length, slot, tz, weekSlots]);

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
        if (heatmapByKey instanceof Map) {
            return heatmapByKey;
        }
        return new Map(Object.entries(heatmapByKey));
    }, [heatmapByKey]);

    const draftRef = useRef(draft);
    draftRef.current = draft;
    const gestureModeRef = useRef(null);
    const lastPaintedKeyRef = useRef(null);
    const touchDownRef = useRef({x: 0, y: 0});
    const gridLayoutRef = useRef({width: 0, height: 0});
    const scrollRef = useRef(null);
    const [gridWidth, setGridWidth] = useState(0);
    const [isPainting, setIsPaintingState] = useState(false);

    const colWidth =
        gridWidth > TIME_LABEL_WIDTH
            ? (gridWidth - TIME_LABEL_WIDTH) / 7
            : 0;

    const hitTest = useCallback(
        (x, y) => {
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
        },
        [colWidth, rows.length, slotsByColRow],
    );

    const setPainting = useCallback(
        value => {
            setIsPaintingState(value);
            if (typeof onPaintingChange === 'function') {
                onPaintingChange(value);
            }
        },
        [onPaintingChange],
    );

    const isSlotEditable = useCallback(
        slotItem => {
            if (!slotItem) {
                return false;
            }
            if (isCandidateMode) {
                return isCandidateSlotSelectable(slotItem, {
                    timezone: tz,
                    slotMinutes: slot,
                    earliestStart,
                    expiryAt,
                });
            }
            if (isEditMode) {
                return isSlotInsideCandidateWindows(
                    slotItem,
                    candidateWindows,
                );
            }
            return false;
        },
        [
            candidateWindows,
            earliestStart,
            expiryAt,
            isCandidateMode,
            isEditMode,
            slot,
            tz,
        ],
    );

    const paintSlotIfAllowed = useCallback(
        (slotItem, modeGesture) => {
            if (!slotItem || !isSlotEditable(slotItem)) {
                return false;
            }
            if (typeof onDraftChange !== 'function') {
                return false;
            }
            const next = applyDraftGesture(
                draftRef.current ||
                    createEmptyDraft({
                        mode: isCandidateMode ? 'candidate' : 'availability',
                        slotMinutes: slot,
                        timezone: tz,
                    }),
                [slotItem],
                modeGesture,
            );
            onDraftChange(next);
            return true;
        },
        [isCandidateMode, isSlotEditable, onDraftChange, slot, tz],
    );

    const storeTouchDown = useCallback((x, y) => {
        touchDownRef.current = {x, y};
    }, []);

    const handleGestureStart = useCallback(() => {
        if (!interactive) {
            return;
        }
        const {x, y} = touchDownRef.current;
        const slotItem = hitTest(x, y);
        if (!slotItem || !isSlotEditable(slotItem)) {
            gestureModeRef.current = null;
            return;
        }
        trigger();
        setPainting(true);
        const modeGesture = resolveGestureMode(draftRef.current, slotItem);
        gestureModeRef.current = modeGesture;
        lastPaintedKeyRef.current = slotKey(slotItem);
        paintSlotIfAllowed(slotItem, modeGesture);
    }, [
        hitTest,
        interactive,
        isSlotEditable,
        paintSlotIfAllowed,
        setPainting,
    ]);

    const handleGestureMove = useCallback(
        (x, y) => {
            if (!gestureModeRef.current) {
                return;
            }
            const slotItem = hitTest(x, y);
            if (!slotItem) {
                return;
            }
            const key = slotKey(slotItem);
            if (key === lastPaintedKeyRef.current) {
                return;
            }
            if (!paintSlotIfAllowed(slotItem, gestureModeRef.current)) {
                return;
            }
            lastPaintedKeyRef.current = key;
        },
        [hitTest, paintSlotIfAllowed],
    );

    const handleGestureEnd = useCallback(() => {
        gestureModeRef.current = null;
        lastPaintedKeyRef.current = null;
        setPainting(false);
    }, [setPainting]);

    const handleTap = useCallback(
        (x, y) => {
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
            onDraftChange?.(
                toggleDraftSlot(
                    draftRef.current ||
                        createEmptyDraft({
                            mode: isCandidateMode
                                ? 'candidate'
                                : 'availability',
                            slotMinutes: slot,
                            timezone: tz,
                        }),
                    slotItem,
                ),
            );
        },
        [
            hitTest,
            interactive,
            isCandidateMode,
            isReadonlyMode,
            isSlotEditable,
            onDraftChange,
            onSlotPress,
            slot,
            tz,
        ],
    );

    const composedGesture = useMemo(() => {
        if (isReadonlyMode) {
            const tapOnly = Gesture.Tap().onEnd(event => {
                runOnJS(handleTap)(event.x, event.y);
            });
            return tapOnly;
        }

        const panGesture = Gesture.Pan()
            .activateAfterLongPress(200)
            .onBegin(event => {
                runOnJS(storeTouchDown)(event.x, event.y);
            })
            .onStart(() => {
                runOnJS(handleGestureStart)();
            })
            .onUpdate(event => {
                runOnJS(handleGestureMove)(event.x, event.y);
            })
            .onFinalize(() => {
                runOnJS(handleGestureEnd)();
            })
            .shouldCancelWhenOutside(false);

        const tapGesture = Gesture.Tap().onEnd(event => {
            runOnJS(handleTap)(event.x, event.y);
        });

        return Gesture.Exclusive(panGesture, tapGesture);
    }, [
        handleGestureEnd,
        handleGestureMove,
        handleGestureStart,
        handleTap,
        isReadonlyMode,
        storeTouchDown,
    ]);

    const bodyHeight = rows.length * SLOT_HEIGHT;

    const onGridLayout = useCallback(event => {
        const {width, height} = event.nativeEvent.layout;
        gridLayoutRef.current = {width, height};
        setGridWidth(width);
    }, []);

    // 建議時段：捲到對應時間列
    useEffect(() => {
        if (!scrollToStartAt || !axisDayStart || !scrollRef.current) {
            return;
        }
        const target = parseInTimezone(scrollToStartAt, tz);
        if (!target) {
            return;
        }
        const dayAxisStart = moment.tz(
            `${dateKeys[0]} ${axisDayStart.format('HH:mm')}`,
            'YYYY-MM-DD HH:mm',
            tz,
        );
        const wall = moment.tz(
            `${dateKeys[0]} ${target.format('HH:mm')}`,
            'YYYY-MM-DD HH:mm',
            tz,
        );
        const row = Math.round(wall.diff(dayAxisStart, 'minutes') / slot);
        if (row < 0) {
            return;
        }
        const y = Math.max(0, row * SLOT_HEIGHT - SLOT_HEIGHT * 2);
        scrollRef.current.scrollTo({y, animated: true});
    }, [axisDayStart, dateKeys, scrollToStartAt, slot, tz]);

    const renderDayHeader = (dateKey, index) => {
        const m = moment.tz(dateKey, 'YYYY-MM-DD', tz);
        const weekdayLabel = WEEKDAY_SHORT_LABELS[index] || '';
        const isToday = m.isSame(moment.tz(tz), 'day');
        const dayEnabled =
            isCandidateMode ||
            (weekPage?.days || []).some(
                day => day.date === dateKey && day.enabled,
            );
        return (
            <View
                key={dateKey}
                style={[
                    styles.dayHeaderCell,
                    {
                        width: colWidth,
                        borderColor: theme.themeColorUltraLight,
                    },
                    !dayEnabled ? styles.dayHeaderDisabled : null,
                ]}>
                <Text
                    style={[
                        styles.weekdayText,
                        {
                            color: isToday
                                ? theme.themeColor
                                : theme.black.third,
                        },
                    ]}>
                    {weekdayLabel}
                </Text>
                <Text
                    style={[
                        styles.dayNumText,
                        isToday ? styles.dayNumToday : null,
                        {
                            color: isToday
                                ? theme.themeColor
                                : theme.black.main,
                        },
                    ]}>
                    {m.format('M/D')}
                </Text>
            </View>
        );
    };

    const renderSlotCell = (col, row) => {
        const slotItem = slotsByColRow.get(`${col}:${row}`);
        if (!slotItem) {
            // 詳情模式：無 candidate 的格子顯示禁用底
            if (!isCandidateMode) {
                return (
                    <View
                        key={`empty-${col}-${row}`}
                        pointerEvents="none"
                        style={[
                            styles.slotCell,
                            styles.slotDisabled,
                            {
                                top: row * SLOT_HEIGHT,
                                left: TIME_LABEL_WIDTH + col * colWidth,
                                width: colWidth,
                                height: SLOT_HEIGHT,
                                backgroundColor: theme.tonal.primary08,
                                borderColor: theme.themeColorUltraLight,
                            },
                        ]}
                    />
                );
            }
            return null;
        }

        const key = slotKey(slotItem);
        const heatInfo = heatMap ? heatMap.get(key) : null;
        const heat = heatInfo?.heat ?? 0;
        const selected = selectedSet.has(key);
        const selfOutlined = selfOutlineSet.has(key);
        const selectable = isSlotEditable(slotItem);

        let backgroundColor = theme.white;
        if (isCandidateMode) {
            backgroundColor = !selectable
                ? theme.tonal.primary08
                : selected
                  ? theme.tonal.primary30
                  : theme.white;
        } else {
            backgroundColor = heatToBackgroundColor(
                heat,
                theme,
                isEditMode,
            );
            if (isEditMode && selected) {
                backgroundColor = theme.tonal.primary50;
            }
        }

        return (
            <View
                key={key}
                pointerEvents="none"
                style={[
                    styles.slotCell,
                    isCandidateMode && !selectable
                        ? styles.slotDisabled
                        : null,
                    {
                        top: row * SLOT_HEIGHT,
                        left: TIME_LABEL_WIDTH + col * colWidth,
                        width: colWidth,
                        height: SLOT_HEIGHT,
                        backgroundColor,
                        borderColor: theme.themeColorUltraLight,
                    },
                    selfOutlined && {
                        borderColor: theme.themeColor,
                        borderWidth: StyleSheet.hairlineWidth * 2,
                    },
                    isEditMode &&
                        selected && {
                            borderColor: theme.themeColor,
                            borderWidth: StyleSheet.hairlineWidth * 2,
                        },
                    isCandidateMode &&
                        selected &&
                        selectable && {
                            borderColor: theme.themeColor,
                            borderWidth: StyleSheet.hairlineWidth * 2,
                        },
                ]}
            />
        );
    };

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.white,
                    borderColor: theme.themeColorUltraLight,
                },
            ]}
            onLayout={onGridLayout}>
            <View style={styles.headerRow}>
                <View style={{width: TIME_LABEL_WIDTH}} />
                {colWidth > 0
                    ? dateKeys.map((dateKey, index) =>
                          renderDayHeader(dateKey, index),
                      )
                    : null}
            </View>
            <ScrollView
                ref={scrollRef}
                nestedScrollEnabled
                scrollEnabled={!isPainting}
                style={styles.timeScroll}
                showsVerticalScrollIndicator={false}>
                <GestureDetector gesture={composedGesture}>
                    <View style={[styles.body, {height: bodyHeight}]}>
                        {rows.map((labelMoment, rowIndex) => {
                            const showLabel =
                                slot >= 60 || labelMoment.minute() === 0;
                            return (
                                <View
                                    key={`label-${rowIndex}`}
                                    pointerEvents="none"
                                    style={[
                                        styles.timeLabel,
                                        {
                                            top: rowIndex * SLOT_HEIGHT,
                                            height: SLOT_HEIGHT,
                                        },
                                    ]}>
                                    {showLabel || rowIndex === 0 ? (
                                        <Text
                                            style={[
                                                styles.timeLabelText,
                                                {color: theme.black.third},
                                            ]}>
                                            {labelMoment.format('HH:mm')}
                                        </Text>
                                    ) : null}
                                </View>
                            );
                        })}
                        {colWidth > 0
                            ? dateKeys.map((_, col) =>
                                  rows.map((__, row) =>
                                      renderSlotCell(col, row),
                                  ),
                              )
                            : null}
                        {colWidth > 0
                            ? dateKeys.map((_, col) => (
                                  <View
                                      key={`col-line-${col}`}
                                      pointerEvents="none"
                                      style={[
                                          styles.colLine,
                                          {
                                              left:
                                                  TIME_LABEL_WIDTH +
                                                  col * colWidth,
                                              height: bodyHeight,
                                              backgroundColor:
                                                  theme.themeColorUltraLight,
                                          },
                                      ]}
                                  />
                              ))
                            : null}
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
        borderBottomWidth: StyleSheet.hairlineWidth,
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
    dayHeaderDisabled: {
        opacity: 0.45,
    },
    weekdayText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
    },
    dayNumText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '500',
        marginTop: verticalScale(1),
    },
    dayNumToday: {
        fontWeight: '700',
    },
    body: {
        position: 'relative',
        width: '100%',
    },
    timeLabel: {
        justifyContent: 'flex-start',
        left: 0,
        position: 'absolute',
        width: TIME_LABEL_WIDTH,
        paddingLeft: scale(2),
    },
    timeLabelText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
    },
    slotCell: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderRightWidth: StyleSheet.hairlineWidth,
        position: 'absolute',
    },
    slotDisabled: {
        opacity: 0.45,
    },
    colLine: {
        position: 'absolute',
        top: 0,
        width: StyleSheet.hairlineWidth,
    },
});

export default memo(ScheduleWeekGrid);
