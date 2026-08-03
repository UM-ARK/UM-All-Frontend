/**
 * 熱力圖例：藍色越深＝可出席越多；未提交為未知；已提交 X／Y
 */
import React, {memo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';

/**
 * @param {object} props
 * @param {number} [props.submittedCount]
 * @param {number} [props.memberCount]
 */
const AvailabilityLegend = ({submittedCount = 0, memberCount = 0}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    const hasNoData = submittedCount <= 0;
    // 僅 0／1 人提交時，白圖易被誤讀為「沒人有空」
    const isSparse =
        submittedCount > 0 &&
        submittedCount <= 1 &&
        memberCount > submittedCount;

    const swatches = [
        theme.white,
        theme.tonal.primary15,
        theme.tonal.primary30,
        theme.tonal.primary50,
    ];

    let unknownHint = null;
    if (hasNoData) {
        unknownHint =
            memberCount <= 1
                ? t('等待 1 人提交')
                : t('等待成員提交可用時間');
    } else if (isSparse) {
        unknownHint = t('目前僅 1 人提交，白色格不代表全員沒空');
    } else if (submittedCount < memberCount) {
        unknownHint = t('未提交視為未知，不計入深藍');
    }

    return (
        <View style={styles.wrap}>
            {hasNoData ? (
                <Text style={[styles.label, {color: theme.black.second}]}>
                    {t('尚未有可用時間資料')}
                </Text>
            ) : (
                <View style={styles.legendMain}>
                    <Text style={[styles.label, {color: theme.black.third}]}>
                        {t('藍色越深＝此時段可出席人數越多')}
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
            )}
            {unknownHint ? (
                <Text
                    style={[styles.hint, {color: theme.black.third}]}
                    numberOfLines={2}>
                    {unknownHint}
                </Text>
            ) : null}
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
    wrap: {
        paddingHorizontal: scale(4),
        paddingVertical: verticalScale(6),
    },
    legendMain: {
        minWidth: 0,
    },
    label: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
    },
    hint: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(4),
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
        marginTop: verticalScale(4),
    },
});

export default memo(AvailabilityLegend);
