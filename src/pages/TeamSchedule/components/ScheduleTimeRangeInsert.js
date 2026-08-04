/**
 * 每週時間板上方的快速時段插入列
 */
import React, {useCallback, useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';

import Ionicons from '@react-native-vector-icons/ionicons';
import {MenuView} from '@react-native-menu/menu';
import {useTranslation} from 'react-i18next';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {trigger} from '../../../utils/trigger';
import {
    WEEKDAY_SHORT_LABELS,
    formatMinuteOfDay,
} from './scheduleWeekHelpers';

const DEFAULT_START_MINUTE = 9 * 60;
const DEFAULT_END_MINUTE = 10 * 60;

function minuteToDate(minute) {
    const value = Number(minute) || 0;
    return new Date(2000, 0, 1, Math.floor(value / 60), value % 60, 0, 0);
}

const ScheduleTimeRangeInsert = ({onInsert, emptyRangeMessage}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const [weekday, setWeekday] = useState(1);
    const [startMinute, setStartMinute] = useState(DEFAULT_START_MINUTE);
    const [endMinute, setEndMinute] = useState(DEFAULT_END_MINUTE);
    const [pickerTarget, setPickerTarget] = useState(null);

    const weekdayActions = useMemo(
        () =>
            WEEKDAY_SHORT_LABELS.map((label, index) => ({
                id: String(index + 1),
                title: t('星期{{day}}', {day: label}),
                state: weekday === index + 1 ? 'on' : 'off',
            })),
        [t, weekday],
    );

    const openPicker = useCallback(target => {
        trigger();
        setPickerTarget(target);
    }, []);

    const handleTimeConfirm = useCallback(
        date => {
            trigger();
            let minute = date.getHours() * 60 + date.getMinutes();
            setPickerTarget(null);
            if (pickerTarget === 'start') {
                setStartMinute(minute);
                if (minute >= endMinute) {
                    setEndMinute(Math.min(minute + 60, 24 * 60));
                }
                return;
            }
            if (minute === 0 && startMinute > 0) {
                minute = 24 * 60;
            }
            setEndMinute(minute);
        },
        [endMinute, pickerTarget, startMinute],
    );

    const handleInsert = useCallback(() => {
        trigger();
        if (endMinute <= startMinute) {
            Alert.alert(t('無法插入'), t('結束時間須晚於開始時間。'));
            return;
        }
        const inserted = onInsert?.({
            weekday,
            startMinute,
            endMinute,
        });
        if (inserted === false && emptyRangeMessage) {
            Alert.alert(t('無法插入'), emptyRangeMessage);
        }
    }, [emptyRangeMessage, endMinute, onInsert, startMinute, t, weekday]);

    const pickerMinute = pickerTarget === 'end' ? endMinute : startMinute;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: theme.tonal.primary08,
                    borderColor: theme.themeColorUltraLight,
                },
            ]}>
            <MenuView
                actions={weekdayActions}
                onPressAction={({nativeEvent}) => {
                    trigger();
                    setWeekday(Number(nativeEvent.event));
                }}
                shouldOpenOnLongPress={false}
                style={styles.weekdayMenu}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('選擇星期')}
                    onPress={() => trigger()}
                    style={({pressed}) => [
                        styles.weekdayButton,
                        pressed && {opacity: 0.7},
                    ]}>
                    <Text style={[styles.valueText, {color: theme.black.main}]}>
                        {t('星期{{day}}', {
                            day: WEEKDAY_SHORT_LABELS[weekday - 1],
                        })}
                    </Text>
                    <Ionicons
                        name="chevron-down"
                        size={scale(13)}
                        color={theme.black.third}
                    />
                </Pressable>
            </MenuView>

            <View style={styles.timeRange}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('選擇開始時間')}
                    onPress={() => openPicker('start')}
                    style={({pressed}) => [
                        styles.timeButton,
                        pressed && {opacity: 0.7},
                    ]}>
                    <Text style={[styles.valueText, {color: theme.black.main}]}>
                        {formatMinuteOfDay(startMinute)}
                    </Text>
                </Pressable>
                <Text style={[styles.separator, {color: theme.black.third}]}>–</Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('選擇結束時間')}
                    onPress={() => openPicker('end')}
                    style={({pressed}) => [
                        styles.timeButton,
                        pressed && {opacity: 0.7},
                    ]}>
                    <Text style={[styles.valueText, {color: theme.black.main}]}>
                        {formatMinuteOfDay(endMinute)}
                    </Text>
                </Pressable>
            </View>

            <Pressable
                accessibilityRole="button"
                onPress={handleInsert}
                style={({pressed}) => [
                    styles.insertButton,
                    {
                        backgroundColor: pressed
                            ? theme.themeColorLight
                            : theme.themeColor,
                    },
                ]}>
                <Text style={[styles.insertText, {color: theme.trueWhite}]}>
                    {t('插入')}
                </Text>
            </Pressable>

            <DateTimePickerModal
                isVisible={pickerTarget != null}
                mode="time"
                date={minuteToDate(pickerMinute)}
                minuteInterval={15}
                is24Hour
                onConfirm={handleTimeConfirm}
                onCancel={() => {
                    trigger();
                    setPickerTarget(null);
                }}
                confirmTextIOS={t('確定')}
                cancelTextIOS={t('取消')}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        borderRadius: scale(8),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        marginBottom: verticalScale(8),
        minHeight: verticalScale(34),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(2),
    },
    weekdayButton: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: scale(2),
        minHeight: verticalScale(26),
        paddingHorizontal: scale(4),
    },
    weekdayMenu: {
        flexShrink: 0,
    },
    timeRange: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        minWidth: 0,
    },
    timeButton: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: verticalScale(26),
        paddingHorizontal: scale(3),
    },
    valueText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
    },
    separator: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
    },
    insertButton: {
        alignItems: 'center',
        borderRadius: scale(7),
        justifyContent: 'center',
        minHeight: verticalScale(28),
        paddingHorizontal: scale(12),
    },
    insertText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '700',
    },
});

export default ScheduleTimeRangeInsert;
