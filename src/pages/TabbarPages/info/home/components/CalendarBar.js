import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, VirtualizedList } from 'react-native';
import moment from 'moment';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';

import Text from '../../../../../components/AppText';
import { useTheme } from '../../../../../components/ThemeContext';
import { uiStyle, VERSION_EMOJI } from '../../../../../components/ThemeContext';
import { screenWidth } from '../../../../../utils/stylesKits';
import { getWeek } from '../../../../../static/UMCalendar/CalendarConst';
import { UMCalendar } from '../../../../../static/UMCalendar/UMCalendar';
import { trigger } from '../../../../../utils/trigger';
import TouchableScale from '../../../../../components/TouchableScale';

const calItemWidth = Math.max(scale(40), verticalScale(40));
const calRangeItemWidth = Math.max(scale(70), verticalScale(40));
const calItemHeight = verticalScale(40);
const calItemMargin = scale(1);

const calendarTextProps = {
    adjustsFontSizeToFit: true,
    maxFontSizeMultiplier: 1.2,
    minimumFontScale: 0.75,
    numberOfLines: 1,
};

const getItem = (data, index) => data[index];
const getItemCount = data => data.length;
const getCalItemWidth = item => moment(item.endDate).diff(item.startDate, 'day') > 1 ? calRangeItemWidth : calItemWidth;

const CalendarBar = ({ refreshTrigger = 0 }) => {
    const { theme } = useTheme();
    const { bg_color, black, themeColor, themeColorUltraLight } = theme;

    const calScrollRef = useRef(null);
    const [selectDay, setSelectDay] = useState(0);
    const cal = useMemo(() => {
        const seenEvents = new Set();

        return UMCalendar.filter(item => {
            const eventKey = `${item.endDate}\u0000${item.summary}\u0000${item.summary_cn || ''}`;

            if (seenEvents.has(eventKey)) {return false;}

            seenEvents.add(eventKey);
            return true;
        });
    }, []);
    const calItemLayouts = useMemo(() => {
        let offset = 0;

        return cal.map((item, index) => {
            const length = getCalItemWidth(item) + calItemMargin * 2;
            const layout = { length, offset, index };

            offset += length;
            return layout;
        });
    }, [cal]);

    // 計算應顯示的日期，並滾動到當前/下一個日期
    const getCal = useCallback(() => {
        const nowTimeStamp = moment(new Date());
        const CAL_LENGTH = cal.length;
        let newSelectDay = 0;

        if (nowTimeStamp.isSameOrAfter(cal[CAL_LENGTH - 1].startDate)) {
            newSelectDay = CAL_LENGTH - 1;
        } else if (nowTimeStamp.isSameOrAfter(cal[0].startDate)) {
            for (let i = 0; i < CAL_LENGTH; i++) {
                if (nowTimeStamp.isBefore(cal[i].endDate)) {
                    newSelectDay = i;
                    break;
                }
            }
        }

        setSelectDay(newSelectDay);

        setTimeout(() => {
            calScrollRef?.current?.scrollToOffset({
                offset: calItemLayouts[newSelectDay]?.offset || 0,
                animated: true,
            });
        }, 100);
    }, [cal, calItemLayouts]);

    useEffect(() => {
        getCal();
    }, [getCal, refreshTrigger]);

    const renderCal = (item, index) => {
        const startDate = moment(item.startDate);
        const lastDate = moment(item.endDate).subtract(1, 'days');
        const isDateRange = lastDate.isAfter(startDate, 'day');
        const displayDate = isDateRange ? `${startDate.format('MM.DD')}–${lastDate.format('MM.DD')}` : startDate.format('MM.DD');
        const displayWeek = isDateRange ? `${getWeek(item.startDate)}–${getWeek(lastDate)}` : getWeek(item.startDate);
        const isThisDateSelected = selectDay === index;
        const isEssencial = item.summary.toUpperCase().indexOf('EXAM') !== -1 ||
            (item.summary.toUpperCase().indexOf('SEMESTER') !== -1 && item.summary.toUpperCase().indexOf('BREAK') === -1);
        const backgroundColor = isThisDateSelected ? `${themeColor}15` : 'transparent';
        const textStyle = {
            ...uiStyle.defaultText,
            color: isThisDateSelected ? themeColor : black.third,
            fontWeight: isThisDateSelected ? 'bold' : 'normal',
            opacity: !isThisDateSelected && !theme.isLight ? 0.5 : 1,
            includeFontPadding: false,
        };

        return (
            <TouchableScale
                style={{
                    width: getCalItemWidth(item),
                    height: calItemHeight,
                    margin: calItemMargin,
                    justifyContent: 'center',
                }}
                onPress={() => {
                    trigger();
                    setSelectDay(index);
                }}
            >
                <View
                    style={{
                        backgroundColor,
                        borderRadius: verticalScale(5),
                        paddingHorizontal: scale(5),
                        paddingVertical: verticalScale(2),
                        height: '100%',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: isThisDateSelected ? themeColorUltraLight : 'transparent',
                    }}
                >
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Text {...calendarTextProps} style={{ ...textStyle, fontSize: moderateScale(8) }}>
                            {startDate.format('YYYY')}
                        </Text>

                        <Text {...calendarTextProps} style={{ ...textStyle, fontSize: moderateScale(12) }}>
                            {displayDate}
                        </Text>

                        <Text {...calendarTextProps} style={{ ...textStyle, fontSize: moderateScale(7) }}>
                            {displayWeek}
                        </Text>
                    </View>
                </View>
                {isEssencial ? (
                    <View
                        style={{
                            backgroundColor: theme.warning,
                            borderRadius: scale(50),
                            width: verticalScale(8),
                            height: verticalScale(8),
                            position: 'absolute',
                            right: scale(0),
                            top: scale(0),
                        }}
                    />
                ) : null}
            </TouchableScale>
        );
    };

    if (!cal || cal.length === 0) {return null;}

    return (
        <View style={{ backgroundColor: bg_color, width: '100%', marginTop: verticalScale(5), justifyContent: 'center' }}>
            <VirtualizedList
                data={cal}
                ref={calScrollRef}
                initialNumToRender={selectDay <= 11 ? 11 : selectDay}
                windowSize={4}
                initialScrollIndex={selectDay < cal.length ? selectDay : 0}
                getItemLayout={(data, index) => {
                    return calItemLayouts[index];
                }}
                renderItem={({ item, index }) => renderCal(item, index)}
                horizontal
                showsHorizontalScrollIndicator={false}
                getItem={getItem}
                getItemCount={getItemCount}
                keyExtractor={(item, index) => item.startDate + index}
                ListHeaderComponent={<View style={{ marginLeft: scale(20) }} />}
                ListFooterComponent={<View style={{ marginRight: scale(20) }} />}
            />

            {cal[selectDay] && 'summary' in cal[selectDay] ? (
                <View
                    style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'row',
                        marginTop: verticalScale(5),
                        paddingHorizontal: scale(4),
                    }}
                >
                    {/* 側邊裝飾：用 margin 錯位，避免 \n\n 撐高整列 */}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: verticalScale(12),
                            marginRight: scale(2),
                            marginBottom: verticalScale(10),
                        }}
                    >
                        {VERSION_EMOJI.ve_Left}
                    </Text>

                    <View
                        style={{
                            paddingVertical: verticalScale(6),
                            paddingHorizontal: scale(8),
                            width: screenWidth * 0.8,
                            backgroundColor: `${themeColor}15`,
                            borderRadius: scale(10),
                            borderWidth: 1,
                            borderColor: themeColorUltraLight,
                        }}
                    >
                        <Text
                            selectable
                            style={{
                                ...uiStyle.defaultText,
                                color: themeColor,
                                textAlign: 'center',
                                fontSize: verticalScale(10),
                                lineHeight: verticalScale(14),
                            }}
                        >
                            {moment(cal[selectDay].endDate).diff(cal[selectDay].startDate, 'day') > 1 ? (
                                <Text style={{ fontWeight: 'bold' }}>
                                    {`${moment(cal[selectDay].startDate).format('YYYY-MM-DD')} ~ ${moment(cal[selectDay].endDate).subtract(1, 'days').format('YYYY-MM-DD')}\n`}
                                </Text>
                            ) : null}
                            {cal[selectDay].summary}
                            {'summary_cn' in cal[selectDay] ? `\n${cal[selectDay].summary_cn}` : null}
                        </Text>
                    </View>

                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: verticalScale(12),
                            marginLeft: scale(2),
                            marginTop: verticalScale(10),
                        }}
                    >
                        {VERSION_EMOJI.ve_Right}
                    </Text>
                </View>
            ) : null}
        </View>
    );
};

export default CalendarBar;
