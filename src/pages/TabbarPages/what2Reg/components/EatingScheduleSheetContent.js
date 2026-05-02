import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import lodash from 'lodash';
import moment from 'moment';
import { t } from 'i18next';
import { uiStyle } from '../../../../components/ThemeContext';
import SegmentControl from '../../../../components/SegmentControl';

/**
 * 幹飯時間表內容
 * 根據每日上下課時間統計 section 數量，並高亮當前時間區間。
 */
const EatingScheduleSheetContent = ({ theme, dayList, courses }) => {
    const { black, themeColor, themeColorUltraLight, unread, warning } = theme;
    const [statMode, setStatMode] = useState('end');
    const now = useMemo(() => moment(), []);
    const horizontalScrollRef = useRef(null);
    const hasAutoScrolledRef = useRef(false);
    const statOptions = [
        { key: 'end', label: t('下課Section數', { ns: 'catalog' }), timeKey: 'Time To' },
        { key: 'start', label: t('上課Section數', { ns: 'catalog' }), timeKey: 'Time From' },
    ];
    const currentStatOption = statOptions.find(option => option.key === statMode) ?? statOptions[0];

    const currentDay = useMemo(() => dayList[now.isoWeekday() - 1], [dayList, now]);
    const coursesByDay = useMemo(() => lodash.groupBy(courses, 'Day'), [courses]);
    const visibleDayList = useMemo(
        () => dayList.filter(day => (coursesByDay[day]?.length ?? 0) > 0),
        [coursesByDay, dayList],
    );
    const currentDayIndex = visibleDayList.indexOf(currentDay);

    useEffect(() => {
        hasAutoScrolledRef.current = false;
    }, [currentDayIndex, statMode]);

    const scrollToCurrentDay = useCallback(() => {
        if (hasAutoScrolledRef.current || currentDayIndex < 0 || !horizontalScrollRef.current) {
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
        const target = moment(`${now.format('YYYY-MM-DD')} ${timeStr}`, 'YYYY-MM-DD HH:mm');
        return Math.abs(now.diff(target, 'minutes')) <= 30;
    };

    return (
        <BottomSheetScrollView>
            <Text style={{
                alignSelf: 'center',
                ...uiStyle.defaultText,
                color: black.main,
                fontSize: verticalScale(15),
                textAlign: 'center',
            }}>
                {t('幹飯時間表', { ns: 'catalog' })}🍱
            </Text>

            <SegmentControl
                style={{
                    alignSelf: 'center',
                    marginTop: verticalScale(8),
                    marginBottom: verticalScale(6),
                }}
                options={statOptions}
                selectedIndex={statMode === 'end' ? 0 : 1}
                onChange={index => setStatMode(statOptions[index].key)}
            />

            <BottomSheetScrollView
                ref={horizontalScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: scale(10) }}
                onContentSizeChange={scrollToCurrentDay}
            >
                {visibleDayList.map(day => {
                    const groupByDay = coursesByDay[day] ?? [];
                    const groupedResult = lodash.groupBy(groupByDay, currentStatOption.timeKey);
                    const finalResult = Object.fromEntries(
                        Object.entries(groupedResult)
                            .filter(([key]) => key !== 'undefined')
                            .map(([key, arr]) => [key, arr.length]),
                    );

                    const isToday = currentDay === day;
                    const sortedTimes = lodash.sortBy(Object.keys(finalResult), time => moment(time, 'HH:mm').toDate());
                    const sortedResult = sortedTimes.map(time => ({ time, num: finalResult[time] }));

                    return (
                        <View
                            key={day}
                            style={{
                                marginRight: scale(20),
                                width: scale(85),
                                borderRadius: verticalScale(8),
                                padding: verticalScale(3),
                            }}
                        >
                            <View style={{ justifyContent: 'center', alignItems: 'center', alignSelf: 'center' }}>
                                <View style={{
                                    alignSelf: 'flex-start',
                                    borderBottomColor: isToday ? themeColor : black.second,
                                    borderBottomWidth: verticalScale(2),
                                }}>
                                    <Text style={{
                                        alignSelf: 'center',
                                        ...uiStyle.defaultText,
                                        fontSize: verticalScale(15),
                                        fontWeight: isToday ? 'bold' : 'normal',
                                        color: isToday ? themeColor : black.main,
                                    }}>
                                        {day}
                                    </Text>
                                </View>
                            </View>

                            <View style={{
                                marginTop: verticalScale(3),
                                padding: verticalScale(3),
                                borderColor: isToday ? themeColor : black.third,
                                borderWidth: verticalScale(2),
                                borderRadius: verticalScale(8),
                            }}>
                                {sortedResult.map(item => {
                                    let isWithinPeriod = false;
                                    let textColor = black.third;

                                    if (isToday) {
                                        isWithinPeriod = isWithin30Min(item.time);
                                        if (item.num > 50) {
                                            textColor = unread;
                                        } else if (item.num > 30) {
                                            textColor = warning;
                                        } else {
                                            textColor = isWithinPeriod ? themeColor : black.main;
                                        }
                                    }

                                    return (
                                        <View
                                            key={item.time}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                marginTop: verticalScale(2),
                                                backgroundColor: isWithinPeriod ? themeColorUltraLight : 'transparent',
                                                borderRadius: verticalScale(3),
                                            }}
                                        >
                                            <Text style={{
                                                ...uiStyle.defaultText,
                                                fontSize: verticalScale(12),
                                                fontWeight: isWithinPeriod ? 'bold' : 'normal',
                                                color: textColor,
                                                fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
                                            }}>
                                                {item.time}
                                            </Text>
                                            <Text style={{
                                                ...uiStyle.defaultText,
                                                fontSize: verticalScale(12),
                                                fontWeight: isWithinPeriod ? 'bold' : 'normal',
                                                color: textColor,
                                            }}>
                                                {item.num}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}
            </BottomSheetScrollView>
        </BottomSheetScrollView>
    );
};

export default EatingScheduleSheetContent;
