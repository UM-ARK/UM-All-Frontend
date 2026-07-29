import React, {
    forwardRef,
    useCallback,
    useContext,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

import ActionSheet from 'react-native-actions-sheet';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';
import lodash from 'lodash';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {
    Asset,
    requestPermissionsAsync,
} from 'expo-media-library';
import Toast from 'react-native-simple-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import { useCoursePlan } from '../context/CoursePlanContext';
import { getSlotKey } from '../hooks/useConflict';
import { computeOverviewCourseFrames } from '../pages/courseSim/utils/overviewLayout';
import {
    OVERVIEW_ALIGNMENT_MINUTES,
    OVERVIEW_COURSE_H_GAP,
    OVERVIEW_COURSE_H_PADDING,
    OVERVIEW_COURSE_V_GAP,
    OVERVIEW_HOUR_HEIGHT,
    OVERVIEW_MAX_COURSE_HEIGHT,
    OVERVIEW_MIN_COURSE_HEIGHT,
    OVERVIEW_RESERVED_HEIGHT,
} from '../pages/courseSim/utils/overviewConfig';
import OverviewCourseCardContent from '../pages/courseSim/components/OverviewCourseCardContent';

const dayList = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const daySorter = {
    MON: 1,
    TUE: 2,
    WED: 3,
    THU: 4,
    FRI: 5,
    SAT: 6,
    SUN: 7,
};

/** 將 HH:mm 轉成當日分鐘數。 */
function toMinutes(time) {
    const [hours, minutes] = String(time || '')
        .split(':')
        .map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return 0;
    }
    return hours * 60 + minutes;
}

/** 建立概覽中的水平時間參考線。 */
function buildOverviewRows(planSlots) {
    const rows = [];

    lodash
        .sortBy(planSlots, course => toMinutes(course['Time From']))
        .forEach(course => {
            const start = toMinutes(course['Time From']);
            const currentRow = rows[rows.length - 1];

            if (
                currentRow === undefined ||
                start - currentRow > OVERVIEW_ALIGNMENT_MINUTES
            ) {
                rows.push(start);
            }
        });

    return rows;
}

/**
 * 可截圖的純課表內容。
 *
 * @param {Object} props
 * @param {Array<Object>} props.planSlots 完整課節列表
 * @param {Array<string>} props.planCourseCodes 已排課程代碼
 * @param {Set<string>} props.conflictSlotKeys 衝突課節 key
 * @param {Object} props.courseVersion 課程資料版本
 * @param {number} props.width 輸出寬度
 * @param {number} props.overviewMaxHeight 畫面概覽可用高度
 */
const TimetableSharePreview = ({
    planSlots,
    planCourseCodes,
    conflictSlotKeys,
    courseVersion,
    width,
    overviewMaxHeight,
}) => {
    const { t } = useTranslation('timetable');
    const { theme } = useTheme();
    const {
        bg_color,
        black,
        themeColorUltraLight,
        unread,
        TIME_TABLE_COLOR,
    } = theme;

    const overviewDays = useMemo(() => {
        const lastCourseDayIndex = lodash.max(
            planSlots.map(course => daySorter[course.Day] - 1),
        );
        return dayList.slice(0, Math.max(lastCourseDayIndex ?? 4, 4) + 1);
    }, [planSlots]);
    const overviewRows = useMemo(
        () => buildOverviewRows(planSlots),
        [planSlots],
    );
    const overviewStart = overviewRows[0] ?? 0;
    const overviewEnd =
        lodash.max(planSlots.map(course => toMinutes(course['Time To']))) ??
        overviewStart;
    const overviewDuration = Math.max(overviewEnd - overviewStart, 60);
    const overviewHourHeight = Math.min(
        OVERVIEW_HOUR_HEIGHT,
        (overviewMaxHeight / overviewDuration) * 60,
    );
    const overviewHeight =
        (overviewDuration / 60) * overviewHourHeight;
    const dayColumnWidth = width / overviewDays.length;
    const slotsByDay = useMemo(
        () => lodash.groupBy(planSlots, 'Day'),
        [planSlots],
    );
    const framesByDay = useMemo(() => {
        const result = {};
        overviewDays.forEach(day => {
            result[day] = computeOverviewCourseFrames({
                courses: slotsByDay[day] || [],
                overviewStart,
                hourHeight: overviewHourHeight,
                dayWidth: dayColumnWidth,
                hPadding: OVERVIEW_COURSE_H_PADDING,
                hGap: OVERVIEW_COURSE_H_GAP,
                vGap: OVERVIEW_COURSE_V_GAP,
                maxHeight: OVERVIEW_MAX_COURSE_HEIGHT,
                minHeight: OVERVIEW_MIN_COURSE_HEIGHT,
                canvasBottom: overviewHeight,
            });
        });
        return result;
    }, [
        dayColumnWidth,
        overviewDays,
        overviewHeight,
        overviewHourHeight,
        overviewStart,
        slotsByDay,
    ]);

    const styles = useMemo(
        () =>
            StyleSheet.create({
                preview: {
                    width,
                    backgroundColor: bg_color,
                },
                dayRow: {
                    flexDirection: 'row',
                },
                dayText: {
                    ...uiStyle.defaultText,
                    width: dayColumnWidth,
                    paddingVertical: verticalScale(5),
                    color: black.third,
                    fontSize: scale(10),
                    fontWeight: 'bold',
                    textAlign: 'center',
                },
                timetableRow: {
                    flexDirection: 'row',
                },
                dayColumn: {
                    width: dayColumnWidth,
                    height: overviewHeight,
                },
                dayColumnDivider: {
                    borderLeftWidth: StyleSheet.hairlineWidth,
                    borderColor: themeColorUltraLight,
                },
                gridLine: {
                    position: 'absolute',
                    width: '100%',
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderColor: themeColorUltraLight,
                },
                courseCard: {
                    position: 'absolute',
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                },
                footer: {
                    paddingTop: verticalScale(8),
                    paddingBottom: verticalScale(12),
                    alignItems: 'center',
                },
                footerText: {
                    ...uiStyle.defaultText,
                    color: black.third,
                    fontSize: scale(9),
                    textAlign: 'center',
                },
            }),
        [
            bg_color,
            black.third,
            dayColumnWidth,
            overviewHeight,
            themeColorUltraLight,
            width,
        ],
    );

    const renderCourse = (course, frame) => {
        if (!frame || frame.height <= 0 || frame.width <= 0) {
            return null;
        }

        const compact =
            frame.laneCount > 1 ||
            frame.width < scale(48) ||
            frame.height < verticalScale(52);
        const backgroundColor = conflictSlotKeys.has(getSlotKey(course))
            ? unread
            : TIME_TABLE_COLOR[
                  lodash.indexOf(
                      planCourseCodes,
                      course['Course Code'],
                  ) % TIME_TABLE_COLOR.length
              ];

        return (
            <View
                key={getSlotKey(course)}
                style={[
                    styles.courseCard,
                    {
                        top: frame.top,
                        left: frame.left,
                        width: frame.width,
                        height: frame.height,
                        backgroundColor,
                        borderRadius: scale(7),
                        paddingHorizontal: scale(compact ? 2 : 3),
                        paddingVertical: verticalScale(compact ? 1 : 3),
                    },
                ]}>
                <OverviewCourseCardContent course={course} frame={frame} />
            </View>
        );
    };

    return (
        <View style={styles.preview} collapsable={false}>
            <View style={styles.dayRow}>
                {overviewDays.map(day => (
                    <Text key={day} style={styles.dayText}>
                        {day}
                    </Text>
                ))}
            </View>
            <View style={styles.timetableRow}>
                {overviewDays.map((day, dayIndex) => (
                    <View
                        key={day}
                        style={[
                            styles.dayColumn,
                            dayIndex > 0 ? styles.dayColumnDivider : null,
                        ]}>
                        {overviewRows.map(rowStart => (
                            <View
                                key={rowStart}
                                style={[
                                    styles.gridLine,
                                    {
                                        top:
                                            ((rowStart - overviewStart) / 60) *
                                            overviewHourHeight,
                                    },
                                ]}
                            />
                        ))}
                        {(slotsByDay[day] || []).map(course =>
                            renderCourse(
                                course,
                                framesByDay[day]?.get(getSlotKey(course)),
                            ),
                        )}
                    </View>
                ))}
            </View>
            <View style={styles.footer}>
                {courseVersion?.adddrop?.updateTime ? (
                    <Text style={styles.footerText}>
                        Timetable Version:{' '}
                        {courseVersion.adddrop.updateTime}
                    </Text>
                ) : null}
                <Text style={styles.footerText}>{t('僅作模擬!')}</Text>
            </View>
        </View>
    );
};

/**
 * 課表分享預覽與 PNG 輸出。
 *
 * 由外層透過 ref.show() 開啟；截圖範圍只包含上方純課表 ScrollView，
 * 分享／儲存按鈕位於截圖範圍之外。
 */
const TimetableShareSheet = forwardRef(({ courseVersion }, ref) => {
    const { t } = useTranslation(['common', 'timetable']);
    const { theme } = useTheme();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;
    const { planSlots, planCourseCodes, conflictSlotKeys } = useCoursePlan();
    const {
        themeColor,
        tonal,
        black,
        bg_color,
        success,
    } = theme;

    const actionSheetRef = useRef(null);
    const previewScrollRef = useRef(null);
    const pendingActionRef = useRef(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const overviewMaxHeight = Math.max(
        OVERVIEW_HOUR_HEIGHT,
        windowHeight -
            insets.top -
            tabBarHeight -
            OVERVIEW_RESERVED_HEIGHT,
    );

    const styles = useMemo(
        () =>
            StyleSheet.create({
                sheetContainer: {
                    borderRadius: scale(12),
                    paddingVertical: scale(12),
                    backgroundColor: bg_color,
                },
                heading: {
                    ...uiStyle.defaultText,
                    color: black.main,
                    fontSize: scale(17),
                    fontWeight: 'bold',
                    textAlign: 'center',
                    marginBottom: verticalScale(10),
                    marginHorizontal: scale(12),
                },
                previewScroll: {
                    maxHeight: windowHeight * 0.58,
                    borderRadius: scale(10),
                    backgroundColor: bg_color,
                },
                actions: {
                    flexDirection: 'row',
                    gap: scale(10),
                    marginTop: verticalScale(12),
                    marginHorizontal: scale(12),
                },
                actionButton: {
                    flex: 1,
                    minHeight: verticalScale(42),
                    borderRadius: scale(9),
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: scale(6),
                },
                actionButtonPressed: {
                    opacity: 0.7,
                },
                actionText: {
                    ...uiStyle.defaultText,
                    fontSize: scale(14),
                    fontWeight: 'bold',
                },
                cancelButton: {
                    marginTop: verticalScale(10),
                    minHeight: verticalScale(40),
                    borderRadius: scale(9),
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tonal.primary08,
                    marginHorizontal: scale(12),
                },
                cancelText: {
                    ...uiStyle.defaultText,
                    color: black.third,
                    fontSize: scale(14),
                    fontWeight: 'bold',
                },
            }),
        [
            bg_color,
            black.main,
            black.third,
            tonal.primary08,
            windowHeight,
        ],
    );

    useImperativeHandle(
        ref,
        () => ({
            show: () => actionSheetRef.current?.show(),
        }),
        [],
    );

    const captureTimetable = useCallback(
        () =>
            captureRef(previewScrollRef, {
                format: 'png',
                quality: 1,
                result: 'tmpfile',
                snapshotContentContainer: true,
            }),
        [],
    );

    const shareImage = useCallback(
        async uri => {
            try {
                const available = await Sharing.isAvailableAsync();
                if (!available) {
                    throw new Error('Sharing is unavailable');
                }
                await Sharing.shareAsync(uri, {
                    mimeType: 'image/png',
                    UTI: 'public.png',
                    dialogTitle: t('分享課表', { ns: 'timetable' }),
                });
            } catch (error) {
                Alert.alert(
                    t('分享失敗，請稍後再試', { ns: 'timetable' }),
                    String(error?.message || error),
                );
            } finally {
                releaseCapture(uri);
                setIsGenerating(false);
            }
        },
        [t],
    );

    const saveImage = useCallback(
        async uri => {
            try {
                const permission = await requestPermissionsAsync(true, [
                    'photo',
                ]);
                if (permission.status !== 'granted') {
                    throw new Error('Media library permission denied');
                }
                await Asset.create(uri);
                Toast.show(t('課表圖片已儲存', { ns: 'timetable' }));
            } catch (error) {
                Alert.alert(
                    t('儲存圖片失敗', { ns: 'timetable' }),
                    t('請檢查相簿權限後再試', { ns: 'timetable' }),
                );
            } finally {
                releaseCapture(uri);
                setIsGenerating(false);
            }
        },
        [t],
    );

    const handleSheetClose = useCallback(() => {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        if (!action) {
            return;
        }
        setTimeout(action, 100);
    }, []);

    const handleOutput = useCallback(
        async output => {
            if (isGenerating) {
                return;
            }
            trigger();
            setIsGenerating(true);

            try {
                const uri = await captureTimetable();
                pendingActionRef.current = () =>
                    output === 'share' ? shareImage(uri) : saveImage(uri);
                actionSheetRef.current?.hide();
            } catch (error) {
                setIsGenerating(false);
                Alert.alert(
                    t('產生課表圖片失敗', { ns: 'timetable' }),
                    String(error?.message || error),
                );
            }
        },
        [captureTimetable, isGenerating, saveImage, shareImage, t],
    );

    const handleCancel = useCallback(() => {
        trigger();
        pendingActionRef.current = null;
        actionSheetRef.current?.hide();
    }, []);

    return (
        <ActionSheet
            ref={actionSheetRef}
            containerStyle={styles.sheetContainer}
            onClose={handleSheetClose}
            gestureEnabled={!isGenerating}>
            <Text style={styles.heading}>
                {t('課表分享預覽', { ns: 'timetable' })}
            </Text>
            <ScrollView
                ref={previewScrollRef}
                style={styles.previewScroll}
                showsVerticalScrollIndicator={false}
                collapsable={false}>
                <TimetableSharePreview
                    planSlots={planSlots}
                    planCourseCodes={planCourseCodes}
                    conflictSlotKeys={conflictSlotKeys}
                    courseVersion={courseVersion}
                    width={windowWidth}
                    overviewMaxHeight={overviewMaxHeight}
                />
            </ScrollView>
            <View style={styles.actions}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('分享圖片', { ns: 'timetable' })}
                    disabled={isGenerating}
                    onPress={() => handleOutput('share')}
                    style={({ pressed }) => [
                        styles.actionButton,
                        { backgroundColor: tonal.primary30 },
                        pressed && styles.actionButtonPressed,
                    ]}>
                    {isGenerating ? (
                        <ActivityIndicator color={themeColor} />
                    ) : (
                        <>
                            <Ionicons
                                name="share-outline"
                                size={scale(18)}
                                color={themeColor}
                            />
                            <Text
                                style={[
                                    styles.actionText,
                                    { color: themeColor },
                                ]}>
                                {t('分享', { ns: 'timetable' })}
                            </Text>
                        </>
                    )}
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('儲存圖片', { ns: 'timetable' })}
                    disabled={isGenerating}
                    onPress={() => handleOutput('save')}
                    style={({ pressed }) => [
                        styles.actionButton,
                        { backgroundColor: tonal.success15 },
                        pressed && styles.actionButtonPressed,
                    ]}>
                    <Ionicons
                        name="download-outline"
                        size={scale(18)}
                        color={success}
                    />
                    <Text
                        style={[styles.actionText, { color: success }]}>
                        {t('儲存圖片', { ns: 'timetable' })}
                    </Text>
                </Pressable>
            </View>
            <Pressable
                accessibilityRole="button"
                disabled={isGenerating}
                onPress={handleCancel}
                style={({ pressed }) => [
                    styles.cancelButton,
                    pressed && styles.actionButtonPressed,
                ]}>
                <Text style={styles.cancelText}>
                    {t('取消', { ns: 'timetable' })}
                </Text>
            </Pressable>
        </ActionSheet>
    );
});

TimetableShareSheet.displayName = 'TimetableShareSheet';

export default TimetableShareSheet;
