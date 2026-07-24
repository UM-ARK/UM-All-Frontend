import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';

const HarborStatsCard = ({items}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    if (!items?.length) {
        return null;
    }

    return (
        <View
            style={[
                styles.container,
                {backgroundColor: theme.white},
                theme.viewShadow,
            ]}>
            {items.map((item, index) => (
                <View key={item.key} style={styles.item}>
                    <Text style={[styles.value, {color: theme.black.main}]}>
                        {item.value}
                    </Text>
                    <Text style={[styles.label, {color: theme.black.third}]}>
                        {t(item.label)}
                    </Text>
                    {index < items.length - 1 ? (
                        <View
                            style={[
                                styles.divider,
                                {
                                    backgroundColor: theme.themeColorUltraLight,
                                },
                            ]}
                        />
                    ) : null}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(78),
        borderRadius: scale(20),
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: verticalScale(12),
    },
    item: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(3),
    },
    value: {
        ...uiStyle.defaultText,
        fontSize: scale(17),
        fontWeight: '760',
        textAlign: 'center',
    },
    label: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        lineHeight: verticalScale(13),
        textAlign: 'center',
        marginTop: verticalScale(5),
    },
    divider: {
        position: 'absolute',
        right: 0,
        width: StyleSheet.hairlineWidth,
        height: verticalScale(34),
    },
});

export default HarborStatsCard;
