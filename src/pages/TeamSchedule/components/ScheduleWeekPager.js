/**
 * 組隊約時間：週分頁器（上一週／下一週＋日期範圍）
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import Ionicons from '@react-native-vector-icons/ionicons';
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {trigger} from '../../../utils/trigger';
import {formatWeekRangeLabel} from './scheduleWeekHelpers';

/**
 * @param {object} props
 * @param {string} props.weekStartDate
 * @param {string} props.weekEndDate
 * @param {() => void} props.onPrev
 * @param {() => void} props.onNext
 * @param {boolean} [props.canPrev]
 * @param {boolean} [props.canNext]
 */
const ScheduleWeekPager = ({
    weekStartDate,
    weekEndDate,
    onPrev,
    onNext,
    canPrev = true,
    canNext = true,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const rangeLabel = formatWeekRangeLabel(weekStartDate, weekEndDate);

    return (
        <View style={styles.row}>
            <Pressable
                accessibilityLabel={t('上一週')}
                accessibilityRole="button"
                disabled={!canPrev}
                hitSlop={scale(8)}
                onPress={() => {
                    if (!canPrev) {
                        return;
                    }
                    trigger();
                    onPrev();
                }}
                style={({pressed}) => [
                    styles.navButton,
                    {
                        backgroundColor: pressed
                            ? theme.tonal.primary30
                            : theme.tonal.primary15,
                        opacity: canPrev ? 1 : 0.35,
                    },
                ]}>
                <Ionicons
                    name="chevron-back"
                    size={scale(18)}
                    color={theme.themeColor}
                />
            </Pressable>
            <Text
                style={[styles.rangeText, {color: theme.black.main}]}
                numberOfLines={1}>
                {rangeLabel}
            </Text>
            <Pressable
                accessibilityLabel={t('下一週')}
                accessibilityRole="button"
                disabled={!canNext}
                hitSlop={scale(8)}
                onPress={() => {
                    if (!canNext) {
                        return;
                    }
                    trigger();
                    onNext();
                }}
                style={({pressed}) => [
                    styles.navButton,
                    {
                        backgroundColor: pressed
                            ? theme.tonal.primary30
                            : theme.tonal.primary15,
                        opacity: canNext ? 1 : 0.35,
                    },
                ]}>
                <Ionicons
                    name="chevron-forward"
                    size={scale(18)}
                    color={theme.themeColor}
                />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scale(4),
        paddingVertical: verticalScale(6),
    },
    navButton: {
        alignItems: 'center',
        borderRadius: scale(18),
        height: scale(36),
        justifyContent: 'center',
        width: scale(36),
    },
    rangeText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(14),
        fontWeight: '600',
        marginHorizontal: scale(8),
        textAlign: 'center',
    },
});

export default ScheduleWeekPager;
