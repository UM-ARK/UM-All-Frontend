import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, VirtualizedList, LayoutAnimation } from 'react-native';
import TouchableScale from 'react-native-touchable-scale';
import moment from 'moment';
import { scale, verticalScale } from 'react-native-size-matters';

import { useTheme } from '../../../../../components/ThemeContext';
import { uiStyle, VERSION_EMOJI } from '../../../../../utils/uiMap';
import { screenWidth } from '../../../../../utils/stylesKits';
import { getWeek } from '../../../../../static/UMCalendar/CalendarConst';
import { UMCalendar } from '../../../../../static/UMCalendar/UMCalendar';

const calItemWidth = verticalScale(50);

const getItem = (data, index) => data[index];
const getItemCount = data => data.length;

const CalendarBar = ({ refreshTrigger = 0 }) => {
    const { theme } = useTheme();
    const { bg_color, black, themeColor, themeColorUltraLight } = theme;

    const calScrollRef = useRef(null);
    const [selectDay, setSelectDay] = useState(0);
    const cal = useMemo(() => UMCalendar, []);

    // 計算應顯示的日期，並滾動到當前/下一個日期
    const getCal = useCallback(() => {
        const nowTimeStamp = moment(new Date());
        const CAL_LENGTH = cal.length;
        let newSelectDay = 0;

        if (nowTimeStamp.isSameOrAfter(cal[CAL_LENGTH - 1].startDate)) {
            newSelectDay = CAL_LENGTH - 1;
        } else if (nowTimeStamp.isSameOrAfter(cal[0].startDate)) {
            for (let i = 0; i <= CAL_LENGTH; i++) {
                if (moment(cal[i].startDate).isSameOrAfter(nowTimeStamp)) {
                    newSelectDay = i;
                    break;
                }
            }
        }

        setSelectDay(newSelectDay);

        setTimeout(() => {
            calScrollRef?.current?.scrollToOffset({
                offset: newSelectDay * calItemWidth,
                animated: true,
            });
        }, 100);
    }, [cal]);

    useEffect(() => {
        getCal();
    }, [getCal, refreshTrigger]);

    const renderCal = (item, index) => {
        const momentItm = moment(item.startDate).format('YYYYMMDD');
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
                style={{ width: calItemWidth, margin: verticalScale(3) }}
                onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                    setSelectDay(index);
                }}
            >
                <View
                    style={{
                        backgroundColor,
                        borderRadius: verticalScale(5),
                        paddingHorizontal: scale(5),
                        paddingVertical: verticalScale(2),
                        borderWidth: isThisDateSelected ? 1 : null,
                        borderColor: themeColorUltraLight,
                    }}
                >
                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ ...textStyle, fontSize: verticalScale(8) }}>
                            {momentItm.substring(0, 4)}
                        </Text>

                        <Text style={{ ...textStyle, fontSize: verticalScale(12) }}>
                            {`${momentItm.substring(4, 6)}.${momentItm.substring(6, 8)}`}
                        </Text>

                        <Text style={{ ...textStyle, fontSize: verticalScale(7) }}>
                            {getWeek(item.startDate)}
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

    if (!cal || cal.length === 0) return null;

    return (
        <View style={{ backgroundColor: bg_color, width: '100%', marginTop: verticalScale(5), justifyContent: 'center' }}>
            <VirtualizedList
                data={cal}
                ref={calScrollRef}
                initialNumToRender={selectDay <= 11 ? 11 : selectDay}
                windowSize={4}
                initialScrollIndex={selectDay < cal.length ? selectDay : 0}
                getItemLayout={(data, index) => {
                    const layoutSize = calItemWidth;
                    return {
                        length: layoutSize,
                        offset: layoutSize * index,
                        index,
                    };
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
                    }}
                >
                    <Text
                        selectable
                        style={{
                            ...uiStyle.defaultText,
                            textAlign: 'center',
                            fontSize: verticalScale(12),
                        }}
                    >
                        {VERSION_EMOJI.ve_Left + '\n\n'}
                    </Text>

                    <View
                        style={{
                            borderRadius: scale(5),
                            paddingVertical: verticalScale(2),
                            paddingHorizontal: scale(5),
                            width: screenWidth * 0.8,
                            backgroundColor: `${themeColor}15`,
                            borderRadius: scale(10),
                            borderWidth: 1,
                            borderColor: themeColorUltraLight,
                        }}
                    >
                        <Text
                            selectable
                            style={{ ...uiStyle.defaultText, color: themeColor, textAlign: 'center', fontSize: verticalScale(12) }}
                        >
                            <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), fontWeight: 'bold' }}>
                                {'📅 校曆 Upcoming:' + '\n'}
                            </Text>

                            <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(10), fontWeight: 'bold' }}>
                                {moment(cal[selectDay].endDate).diff(cal[selectDay].startDate, 'day') > 1
                                    ? `${moment(cal[selectDay].startDate).format('YYYY-MM-DD')} ~ ${moment(cal[selectDay].endDate).subtract(1, 'days').format('YYYY-MM-DD')}\n`
                                    : null}
                            </Text>

                            <Text style={{ fontSize: verticalScale(10) }}>{cal[selectDay].summary}</Text>

                            {'summary_cn' in cal[selectDay] ? `\n${cal[selectDay].summary_cn}` : null}
                        </Text>
                    </View>

                    <Text
                        selectable
                        style={{
                            ...uiStyle.defaultText,
                            textAlign: 'center',
                            fontSize: verticalScale(12),
                        }}
                    >
                        {'\n\n' + VERSION_EMOJI.ve_Right}
                    </Text>
                </View>
            ) : null}
        </View>
    );
};

export default CalendarBar;
