import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';
import moment from 'moment-timezone';

import Text from '../../components/AppText';
import { uiStyle, useTheme } from '../../components/ThemeContext';
import ScalePressable from '../../components/ScalePressable';
import SegmentedTabControl from '../../components/SegmentedTabControl';
import { getCourseCatalog } from '../../utils/checkCoursesKits';
import { trigger } from '../../utils/trigger';
import { useWindowSizeClass } from '../../utils/windowSizeClass';
import { adddropCatalog } from '../../static/UMCourses/courseCatalogs';
import { BuildingChart, TimeChart } from './eatingSchedule/EatingScheduleCharts';
import { SAMPLE_MINUTES, WEEKDAYS, buildSchedule, formatTime, formatWindow, getBuildingCounts, getTimeSample } from './eatingSchedule/eatingScheduleModel';

const DAY_LABELS = ['週一', '週二', '週三', '週四', '週五', '週六', '週日'];
const EMPTY_EVENTS = [];

/**
 * 根據本科課表統計每日上、下課 Section 數量，
 * 協助同學避開乾飯與通勤人流高峰。
 */
const EatingSchedule = () => {
    const { theme } = useTheme();
    const { t } = useTranslation(['features', 'my']);
    const isFocused = useIsFocused();
    const { isExpanded } = useWindowSizeClass();
    const styles = useMemo(() => getStyles(theme), [theme]);

    const [courses, setCourses] = useState(adddropCatalog?.Courses || []);
    const [statMode, setStatMode] = useState('end');
    const [now, setNow] = useState(() => moment.tz('Asia/Macau'));
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedMinute, setSelectedMinute] = useState(null);

    const statOptions = [
        {
            key: 'end',
            label: t('下課 section'),
        },
        {
            key: 'start',
            label: t('上課 section'),
        },
    ];
    useEffect(() => {
        let isMounted = true;

        const loadScheduleCourses = async () => {
            const courseData = await getCourseCatalog('adddrop');
            if (isMounted) {
                setCourses(
                    courseData?.Courses ||
                    adddropCatalog?.Courses ||
                    [],
                );
            }
        };

        if (isFocused) {
            loadScheduleCourses();
        }

        return () => {
            isMounted = false;
        };
    }, [isFocused]);

    useEffect(() => {
        if (!isFocused) return undefined;

        let timer;
        const updateNow = () => {
            clearTimeout(timer);
            const macauNow = moment.tz('Asia/Macau');
            setNow(macauNow);
            timer = setTimeout(updateNow, 60000 - macauNow.valueOf() % 60000);
        };
        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') {
                updateNow();
            } else {
                clearTimeout(timer);
            }
        });
        updateNow();
        return () => {
            subscription.remove();
            clearTimeout(timer);
        };
    }, [isFocused]);

    const schedule = useMemo(() => buildSchedule(courses), [courses]);
    const todayIndex = now.isoWeekday() - 1;
    const today = WEEKDAYS[todayIndex];
    const modeDays = schedule.days[statMode];
    const visibleDays = WEEKDAYS.filter(weekday => modeDays[weekday]);
    const defaultDay = visibleDays.find(weekday => WEEKDAYS.indexOf(weekday) >= todayIndex) ?? visibleDays[0];
    const day = modeDays[selectedDay] ? selectedDay : defaultDay;
    const daySchedule = modeDays[day];
    const clockMinute = now.hour() * 60 + now.minute();
    const nowMinute = day === today ? clockMinute : null;
    const events = daySchedule?.events ?? EMPTY_EVENTS;
    const selectedSample = selectedMinute === null ? undefined :
        daySchedule?.samples[(selectedMinute - schedule.startMinute) / SAMPLE_MINUTES];
    const activeSample = useMemo(() => selectedSample ?? getTimeSample(events, clockMinute),
        [selectedSample, events, clockMinute]);
    const buildingCounts = useMemo(() => getBuildingCounts(events, activeSample), [events, activeSample]);
    const timeDetail = t('{{window}} · {{count}} 個 Section', {
        window: formatWindow(activeSample.minute),
        count: activeSample.count,
    });

    const selectMinute = useCallback((minute, feedback = true) => {
        if (feedback) trigger('selection');
        setSelectedMinute(minute);
    }, []);

    return (
        <View style={styles.container}>
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={[styles.contentContainer, isExpanded && styles.wideContent]}
                showsVerticalScrollIndicator={false}>
                <View style={styles.scheduleCard}>
                    <View style={styles.summary}>
                        <View style={styles.summaryIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                            <MaterialCommunityIcons name="clock-time-four-outline" size={scale(22)} color={theme.accentForeground} />
                        </View>
                        <Text style={styles.description}>{t('展示現在上課的 section 數')}</Text>
                    </View>
                    <View style={styles.modeControl}>
                        <SegmentedTabControl
                            options={statOptions}
                            selectedIndex={statMode === 'end' ? 0 : 1}
                            onChange={index => {
                                const nextMode = statOptions[index].key;
                                if (statMode === nextMode) return;
                                trigger('selection');
                                setStatMode(nextMode);
                            }}
                        />
                    </View>
                    {daySchedule ? (
                        <>
                            <View style={styles.dayList}>
                                {visibleDays.map(weekday => {
                                    const isSelected = weekday === day;
                                    const isToday = weekday === today;
                                    const label = t(DAY_LABELS[WEEKDAYS.indexOf(weekday)], { ns: 'my' });
                                    return (
                                        <ScalePressable
                                            key={weekday}
                                            accessibilityRole="button"
                                            accessibilityState={{ selected: isSelected }}
                                            accessibilityLabel={isToday ? t('今日，{{day}}', { day: label }) : label}
                                            onPress={() => {
                                                if (isSelected) return;
                                                trigger('selection');
                                                setSelectedDay(isToday ? null : weekday);
                                            }}
                                            style={[styles.dayButton, isSelected && styles.selectedDay]}>
                                            <Text numberOfLines={1} style={[styles.dayLabel, isSelected && styles.selectedDayLabel]}>
                                                {label}
                                            </Text>
                                            <View style={[styles.todayDot, isToday && styles.visibleTodayDot]} />
                                        </ScalePressable>
                                    );
                                })}
                            </View>
                            <View style={styles.axisHeader}>
                                <Text style={styles.axisLabel}>{t('Section 數／30 分鐘')}</Text>
                                {nowMinute !== null && nowMinute < schedule.startMinute ? (
                                    <Text style={styles.axisLabel}>{t('現在 {{time}}', { time: formatTime(nowMinute) })}</Text>
                                ) : null}
                            </View>
                            <TimeChart
                                samples={daySchedule.samples}
                                startMinute={schedule.startMinute}
                                peak={daySchedule.peak}
                                nowMinute={nowMinute}
                                nowLabel={nowMinute === null ? '' : t('現在 {{time}}', { time: formatTime(nowMinute) })}
                                selectedSample={selectedSample}
                                onSelect={selectMinute}
                                accessibilityLabel={t('全日 Section 分布')}
                                accessibilityHint={t('調整時間以查看建築物分布')}
                                accessibilityValue={timeDetail}
                            />
                            <Text accessibilityLiveRegion="polite" style={styles.detail}>
                                {timeDetail}
                            </Text>
                            <View style={styles.buildingSection}>
                                <View style={styles.buildingHeader}>
                                    <Text accessibilityRole="header" style={styles.buildingTitle}>
                                        {t('建築物分布')}
                                    </Text>
                                    {selectedSample ? (
                                        <ScalePressable
                                            accessibilityRole="button"
                                            onPress={() => {
                                                trigger('selection');
                                                setSelectedMinute(null);
                                            }}
                                            style={styles.nowButton}>
                                            <Text style={styles.nowButtonLabel}>{t('回到現在')}</Text>
                                        </ScalePressable>
                                    ) : null}
                                </View>
                                {buildingCounts.buildings.length ? (
                                    <>
                                        <Text style={styles.axisLabel}>{t('Section 數')}</Text>
                                        <BuildingChart
                                            buildings={buildingCounts.buildings}
                                            accessibilityLabel={buildingCounts.buildings.map(([building, count]) =>
                                                t('{{building}}：{{count}} 個 Section', { building, count }),
                                            ).join('，')}
                                        />
                                        <Text style={styles.buildingAxisLabel}>{t('建築物')}</Text>
                                    </>
                                ) : null}
                                {buildingCounts.unassigned ? (
                                    <Text style={styles.axisLabel}>
                                        {t('未標示教室：{{count}} 個 Section', { count: buildingCounts.unassigned })}
                                    </Text>
                                ) : null}
                                {activeSample.count === 0 ? (
                                    <Text style={styles.axisLabel}>{t('這段時間沒有排課')}</Text>
                                ) : null}
                            </View>
                        </>
                    ) : (
                        <Text style={styles.detail}>{t('暫無排課資料')}</Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const getStyles = theme => ({
    container: {
        flex: 1,
        backgroundColor: theme.bg_color,
    },
    contentContainer: {
        paddingHorizontal: scale(12),
        paddingBottom: verticalScale(24),
    },
    wideContent: {
        width: '100%',
        maxWidth: 680,
        alignSelf: 'center',
    },
    summary: {
        alignItems: 'center',
        gap: verticalScale(6),
        marginBottom: verticalScale(12),
    },
    summaryIcon: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(19),
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.tonal.primary15,
    },
    description: {
        ...uiStyle.defaultText,
        color: theme.black.second,
        fontSize: verticalScale(11),
        lineHeight: verticalScale(17),
        textAlign: 'center',
    },
    scheduleCard: {
        backgroundColor: theme.white,
        borderRadius: scale(16),
        marginTop: verticalScale(12),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(14),
        ...theme.viewShadow,
    },
    modeControl: {
        alignItems: 'center',
    },
    dayList: {
        flexDirection: 'row',
        gap: scale(2),
        marginTop: verticalScale(10),
        marginBottom: verticalScale(8),
    },
    dayButton: {
        flex: 1,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(8),
    },
    selectedDay: {
        backgroundColor: theme.tonal.primary15,
    },
    dayLabel: {
        ...uiStyle.defaultText,
        color: theme.black.third,
        fontSize: scale(10),
    },
    selectedDayLabel: {
        color: theme.accentForeground,
        fontWeight: '600',
    },
    todayDot: {
        width: scale(4),
        height: scale(4),
        borderRadius: scale(2),
        marginTop: verticalScale(2),
    },
    visibleTodayDot: {
        backgroundColor: theme.accentForeground,
    },
    axisHeader: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: scale(4),
    },
    axisLabel: {
        ...uiStyle.defaultText,
        color: theme.black.third,
        fontSize: scale(10),
    },
    detail: {
        ...uiStyle.defaultText,
        color: theme.black.main,
        backgroundColor: theme.bg_color,
        fontSize: scale(11),
        fontWeight: '600',
        borderRadius: scale(8),
        marginTop: verticalScale(5),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(8),
    },
    buildingSection: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.pressOverlay,
        marginTop: verticalScale(14),
        paddingTop: verticalScale(12),
    },
    buildingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: scale(6),
        marginBottom: verticalScale(3),
    },
    buildingTitle: {
        ...uiStyle.defaultText,
        color: theme.black.main,
        fontSize: scale(15),
        fontWeight: '700',
    },
    nowButton: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: scale(6),
    },
    nowButtonLabel: {
        ...uiStyle.defaultText,
        color: theme.accentForeground,
        fontSize: scale(11),
    },
    buildingAxisLabel: {
        ...uiStyle.defaultText,
        color: theme.black.third,
        fontSize: scale(10),
        textAlign: 'right',
    },
});

export default EatingSchedule;
