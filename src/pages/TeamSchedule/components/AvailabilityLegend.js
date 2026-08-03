/**
 * 熱力圖例：顏色越深＝越多人有空；已提交 X／Y
 */
import React, {memo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';

const AvailabilityLegend = ({submittedCount = 0, memberCount = 0}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    const swatches = [
        theme.white,
        theme.tonal.primary15,
        theme.tonal.primary30,
        theme.tonal.primary50,
    ];

    return (
        <View style={styles.row}>
            <View style={styles.legendMain}>
                <Text style={[styles.label, {color: theme.black.third}]}>
                    {t('顏色越深＝越多人有空')}
                </Text>
                <View style={styles.swatchRow}>
                    {swatches.map((color, index) => (
                        <View
                            key={`heat-swatch-${index}`}
                            style={[
                                styles.swatch,
                                {
                                    backgroundColor: color,
                                    borderColor: theme.themeColorUltraLight,
                                },
                            ]}
                        />
                    ))}
                </View>
            </View>
            <Text style={[styles.count, {color: theme.black.second}]}>
                {t('已提交 {{submitted}}／{{total}} 人', {
                    submitted: submittedCount,
                    total: memberCount,
                })}
            </Text>
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
    legendMain: {
        flex: 1,
        minWidth: 0,
    },
    label: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
    },
    swatchRow: {
        flexDirection: 'row',
        marginTop: verticalScale(4),
    },
    swatch: {
        borderRadius: scale(3),
        borderWidth: StyleSheet.hairlineWidth,
        height: scale(12),
        marginRight: scale(4),
        width: scale(18),
    },
    count: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
        marginLeft: scale(8),
    },
});

export default memo(AvailabilityLegend);
