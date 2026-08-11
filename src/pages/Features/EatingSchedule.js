import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';
import lodash from 'lodash';
import moment from 'moment';

import Text from '../../components/AppText';
import { uiStyle, useTheme } from '../../components/ThemeContext';
import SegmentControl from '../../components/SegmentControl';
import { getCourseCatalog } from '../../utils/checkCoursesKits';
import { adddropCatalog } from '../../static/UMCourses/courseCatalogs';

const DAY_LIST = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/**
 * 根據本科課表統計每日上、下課 Section 數量，
 * 協助同學避開乾飯與通勤人流高峰。
 */
const EatingSchedule = () => {
    const { theme } = useTheme();
    const { t } = useTranslation('features');
    const isFocused = useIsFocused();
    const styles = useMemo(() => getStyles(theme), [theme]);
    const { black, themeColor, unread, warning } = theme;

    const [courses, setCourses] = useState(adddropCatalog?.Courses || []);
    const [statMode, setStatMode] = useState('end');
    const now = useMemo(() => moment(), []);
    const horizontalScrollRef = useRef(null);
    const hasAutoScrolledRef = useRef(false);

    const statOptions = [
        {
            key: 'end',
            label: t('下課Section數'),
            timeKey: 'Time To',
        },
        {
            key: 'start',
            label: t('上課Section數'),
            timeKey: 'Time From',
        },
    ];
    const currentStatOption =
        statOptions.find(option => option.key === statMode) ?? statOptions[0];

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

    const currentDay = useMemo(() => DAY_LIST[now.isoWeekday() - 1], [now]);
    const coursesByDay = useMemo(
        () => lodash.groupBy(courses, 'Day'),
        [courses],
    );
    const visibleDayList = useMemo(
        () => DAY_LIST.filter(day => (coursesByDay[day]?.length ?? 0) > 0),
        [coursesByDay],
    );
    const currentDayIndex = visibleDayList.indexOf(currentDay);

    useEffect(() => {
        hasAutoScrolledRef.current = false;
    }, [currentDayIndex, statMode]);

    const scrollToCurrentDay = useCallback(() => {
        if (
            hasAutoScrolledRef.current ||
            currentDayIndex < 0 ||
            !horizontalScrollRef.current
        ) {
            return;
        }

        hasAutoScrolledRef.current = true;
        const dayColumnWidth = scale(85) + scale(20);
        horizontalScrollRef.current.scrollTo({
            x: Math.max(currentDayIndex * dayColumnWidth - scale(10), 0),
            animated: true,
        });
    }, [currentDayIndex]);

    const isWithin30Min = timeStr => {
        const target = moment(
            `${now.format('YYYY-MM-DD')} ${timeStr}`,
            'YYYY-MM-DD HH:mm',
        );
        return Math.abs(now.diff(target, 'minutes')) <= 30;
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}>
                <View style={styles.infoCard}>
                    <Text style={styles.title}>{t('幹飯時間')}🍱</Text>
                    <Text style={styles.description}>
                        {t(
                            '依目前本科課表統計各時段上、下課的Section數，以估算校園人流高峰，方便同學安排乾飯或通勤，減少排隊。數字代表Section數，並非實際人數。',
                        )}
                    </Text>
                </View>

                <View style={styles.scheduleCard}>
                    <SegmentControl
                        style={styles.segmentControl}
                        options={statOptions}
                        selectedIndex={statMode === 'end' ? 0 : 1}
                        onChange={index => setStatMode(statOptions[index].key)}
                    />
                    <Text style={styles.hint}>
                        {t(
                            '數值越大，預計人流越集中；今日前後30分鐘的時段會高亮顯示。',
                        )}
                    </Text>

                    <ScrollView
                        ref={horizontalScrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.dayList}
                        onContentSizeChange={scrollToCurrentDay}>
                        {visibleDayList.map(day => {
                            const groupByDay = coursesByDay[day] ?? [];
                            const groupedResult = lodash.groupBy(
                                groupByDay,
                                currentStatOption.timeKey,
                            );
                            const finalResult = Object.fromEntries(
                                Object.entries(groupedResult)
                                    .filter(([key]) => key !== 'undefined')
                                    .map(([key, entries]) => [
                                        key,
                                        entries.length,
                                    ]),
                            );

                            const isToday = currentDay === day;
                            const sortedTimes = lodash.sortBy(
                                Object.keys(finalResult),
                                time => moment(time, 'HH:mm').toDate(),
                            );
                            const sortedResult = sortedTimes.map(time => ({
                                time,
                                num: finalResult[time],
                            }));

                            return (
                                <View key={day} style={styles.dayColumn}>
                                    <View style={styles.dayUnderline(isToday)}>
                                        <Text style={styles.dayTitle(isToday)}>
                                            {day}
                                        </Text>
                                    </View>

                                    <View style={styles.timeList(isToday)}>
                                        {sortedResult.map(item => {
                                            let isWithinPeriod = false;
                                            let textColor = black.third;

                                            if (isToday) {
                                                isWithinPeriod = isWithin30Min(
                                                    item.time,
                                                );
                                                if (item.num > 50) {
                                                    textColor = unread;
                                                } else if (item.num > 30) {
                                                    textColor = warning;
                                                } else {
                                                    textColor = isWithinPeriod
                                                        ? themeColor
                                                        : black.main;
                                                }
                                            }

                                            return (
                                                <View
                                                    key={item.time}
                                                    style={styles.timeRow(
                                                        isWithinPeriod,
                                                    )}>
                                                    <Text
                                                        style={styles.timeText(
                                                            textColor,
                                                            isWithinPeriod,
                                                        )}>
                                                        {item.time}
                                                    </Text>
                                                    <Text
                                                        style={styles.countText(
                                                            textColor,
                                                            isWithinPeriod,
                                                        )}>
                                                        {item.num}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
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
    infoCard: {
        backgroundColor: theme.white,
        borderRadius: scale(16),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(16),
        marginTop: verticalScale(10),
        ...theme.viewShadow,
    },
    title: {
        ...uiStyle.defaultText,
        color: theme.black.main,
        fontSize: verticalScale(18),
        fontWeight: '700',
        textAlign: 'center',
    },
    description: {
        ...uiStyle.defaultText,
        color: theme.black.second,
        fontSize: verticalScale(11),
        lineHeight: verticalScale(17),
        marginTop: verticalScale(8),
        textAlign: 'center',
    },
    scheduleCard: {
        backgroundColor: theme.white,
        borderRadius: scale(16),
        marginTop: verticalScale(12),
        paddingVertical: verticalScale(14),
        ...theme.viewShadow,
    },
    segmentControl: {
        alignSelf: 'center',
    },
    hint: {
        ...uiStyle.defaultText,
        color: theme.black.third,
        fontSize: verticalScale(9),
        lineHeight: verticalScale(14),
        marginHorizontal: scale(18),
        marginTop: verticalScale(8),
        textAlign: 'center',
    },
    dayList: {
        paddingHorizontal: scale(12),
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(4),
    },
    dayColumn: {
        marginRight: scale(20),
        width: scale(85),
    },
    dayUnderline: isToday => ({
        alignSelf: 'center',
        borderBottomColor: isToday ? theme.themeColor : theme.black.second,
        borderBottomWidth: verticalScale(2),
    }),
    dayTitle: isToday => ({
        ...uiStyle.defaultText,
        color: isToday ? theme.themeColor : theme.black.main,
        fontSize: verticalScale(15),
        fontWeight: isToday ? 'bold' : 'normal',
        textAlign: 'center',
    }),
    timeList: isToday => ({
        borderColor: isToday ? theme.themeColor : theme.black.third,
        borderRadius: verticalScale(8),
        borderWidth: verticalScale(2),
        marginTop: verticalScale(4),
        padding: verticalScale(3),
    }),
    timeRow: isWithinPeriod => ({
        alignItems: 'center',
        backgroundColor: isWithinPeriod
            ? theme.themeColorUltraLight
            : undefined,
        borderRadius: verticalScale(3),
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: verticalScale(2),
    }),
    timeText: (textColor, isWithinPeriod) => ({
        ...uiStyle.defaultText,
        color: textColor,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        fontSize: verticalScale(12),
        fontWeight: isWithinPeriod ? 'bold' : 'normal',
    }),
    countText: (textColor, isWithinPeriod) => ({
        ...uiStyle.defaultText,
        color: textColor,
        fontSize: verticalScale(12),
        fontWeight: isWithinPeriod ? 'bold' : 'normal',
    }),
});

export default EatingSchedule;
