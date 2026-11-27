import React from 'react';
import {StyleSheet, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';
import HarborSectionHeader from './HarborSectionHeader';
import {myCardStyles} from './myCardStyles';

const HarborStatsCard = ({title, items}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('my');
    const isEnglish = i18n.language === 'en';

    if (!items?.length) {
        return null;
    }

    return (
        <View
            style={[
                styles.container,
                !title && styles.containerWithoutTitle,
                {borderTopColor: theme.disabled},
            ]}>
            {title ? <HarborSectionHeader title={title} /> : null}
            <View style={styles.statsRow}>
                {items.map(item => {
                    const itemStyle = [
                        styles.item,
                        myCardStyles.column,
                        isEnglish &&
                            (item.key === 'likesReceived' || item.key === 'topicsViewed') &&
                            styles.widerColumn,
                    ];
                    const content = (
                        <>
                            <Text
                                style={[
                                    styles.value,
                                    {color: theme.black.main},
                                ]}>
                                {item.value}
                            </Text>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.label,
                                    isEnglish && myCardStyles.englishLabel,
                                    {color: theme.black.third},
                                ]}>
                                {t(item.label)}
                            </Text>
                        </>
                    );
                    if (item.onPress) {
                        return (
                            <ScalePressable
                                key={item.key}
                                accessibilityRole="button"
                                accessibilityLabel={`${item.value} ${t(
                                    item.label,
                                )}`}
                                onPress={() => {
                                    trigger();
                                    item.onPress();
                                }}
                                style={itemStyle}>
                                {content}
                            </ScalePressable>
                        );
                    }
                    return (
                        <View key={item.key} style={itemStyle}>
                            {content}
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    containerWithoutTitle: {
        paddingTop: verticalScale(4),
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    item: {
        minHeight: 44,
        alignItems: 'center',
        borderRadius: scale(8),
        paddingVertical: verticalScale(4),
    },
    widerColumn: {
        flex: 1.15,
    },
    value: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '760',
        textAlign: 'center',
    },
    label: {
        ...uiStyle.defaultText,
        alignSelf: 'stretch',
        paddingHorizontal: scale(2),
        fontSize: scale(11),
        lineHeight: verticalScale(14),
        textAlign: 'center',
        marginTop: verticalScale(4),
    },
});

export default HarborStatsCard;
