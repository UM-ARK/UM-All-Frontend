import React, { useMemo } from 'react';
import { Platform, Text, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import lodash from 'lodash';
import moment from 'moment';
import { t } from 'i18next';
import { uiStyle } from '../../../../components/ThemeContext';

/**
 * 幹飯時間表內容
 * 根據每日下課時間統計 section 數量，並高亮當前時間區間。
 */
const EatingScheduleSheetContent = ({ theme, dayList, courses }) => {
    const { black, themeColor, themeColorUltraLight, unread, warning } = theme;
    const now = useMemo(() => moment(), []);

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
                {t('幹飯時間表', { ns: 'catalog' })}🍱{'\n'}({t('下課Section數', { ns: 'catalog' })})
            </Text>

            <BottomSheetScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: scale(10) }}
            >
                {dayList.map(day => {
                    const groupByDay = lodash.filter(courses, { Day: day });
                    if (groupByDay.length === 0) {
                        return null;
                    }

                    const groupedResult = lodash.groupBy(groupByDay, 'Time To');
                    const finalResult = Object.fromEntries(
                        Object.entries(groupedResult)
                            .filter(([key]) => key !== 'undefined')
                            .map(([key, arr]) => [key, arr.length]),
                    );

                    const isToday = moment().isoWeekday() === dayList.indexOf(day) + 1;
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
