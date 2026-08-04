/**
 * 課表預覽：課堂重疊與已選時段圖例
 */
import React, {memo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import Ionicons from '@react-native-vector-icons/ionicons';
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';

/**
 * @param {object} props
 * @param {string|null} [props.error]
 */
const CourseSchedulePreviewLegend = ({error = null}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    return (
        <View style={styles.wrap}>
            <Ionicons
                name="calendar-outline"
                size={scale(18)}
                color={theme.themeColor}
            />
            <View style={styles.content}>
                <Text style={[styles.label, {color: theme.black.main}]}>
                    {t('課表預覽')}
                </Text>
                <View style={styles.legend}>
                    <View
                        style={[
                            styles.swatch,
                            {backgroundColor: theme.tonal.unread15},
                        ]}
                    />
                    <Text style={[styles.legendText, {color: theme.black.third}]}>
                        {t('淺紅色＝課表時間')}
                    </Text>
                </View>
                <View style={styles.legend}>
                    <View
                        style={[
                            styles.swatch,
                            {backgroundColor: theme.tonal.secondary30},
                        ]}
                    />
                    <Text style={[styles.legendText, {color: theme.black.third}]}>
                        {t('淺橙色＝課表時間且已選')}
                    </Text>
                </View>
                {error ? (
                    <Text style={[styles.error, {color: theme.unread}]}>
                        {error}
                    </Text>
                ) : null}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        marginRight: scale(12),
        minWidth: 0,
    },
    content: {
        flex: 1,
        marginLeft: scale(8),
    },
    label: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
    },
    legend: {
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: verticalScale(2),
    },
    swatch: {
        borderRadius: scale(2),
        height: scale(8),
        marginRight: scale(4),
        width: scale(12),
    },
    legendText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
    },
    error: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(2),
    },
});

export default memo(CourseSchedulePreviewLegend);
