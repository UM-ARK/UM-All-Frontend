import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';
import HarborSectionHeader from './HarborSectionHeader';
import {myCardStyles} from './myCardStyles';

const HarborStatsCard = ({title, items}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

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
                                style={[
                                    styles.label,
                                    {color: theme.black.third},
                                ]}>
                                {t(item.label)}
                            </Text>
                        </>
                    );
                    if (item.onPress) {
                        return (
                            <Pressable
                                key={item.key}
                                accessibilityRole="button"
                                accessibilityLabel={`${item.value} ${t(
                                    item.label,
                                )}`}
                                onPress={() => {
                                    trigger();
                                    item.onPress();
                                }}
                                style={({pressed}) => [
                                    styles.item,
                                    myCardStyles.column,
                                    pressed && {
                                        backgroundColor:
                                            theme.tonal.primary08,
                                    },
                                ]}>
                                {content}
                            </Pressable>
                        );
                    }
                    return (
                        <View key={item.key} style={[styles.item, myCardStyles.column]}>
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
    value: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '760',
        textAlign: 'center',
    },
    label: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(14),
        textAlign: 'center',
        marginTop: verticalScale(4),
    },
});

export default HarborStatsCard;
