import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';
import HarborSectionHeader from './HarborSectionHeader';

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
                {backgroundColor: theme.white},
            ]}>
            {title ? <HarborSectionHeader title={title} /> : null}
            <View style={styles.statsRow}>
                {items.map((item, index) => {
                    const divider = index < items.length - 1 ? (
                        <View
                            style={[
                                styles.divider,
                                {
                                    backgroundColor:
                                        theme.themeColorUltraLight,
                                },
                            ]}
                        />
                    ) : null;
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
                            {divider}
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
                        <View key={item.key} style={styles.item}>
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
        borderRadius: scale(10),
        paddingBottom: verticalScale(8),
    },
    containerWithoutTitle: {
        paddingTop: verticalScale(10),
    },
    statsRow: {
        minHeight: verticalScale(52),
        flexDirection: 'row',
        alignItems: 'center',
    },
    item: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(8),
        paddingHorizontal: scale(3),
        paddingVertical: verticalScale(2),
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
        lineHeight: verticalScale(12),
        textAlign: 'center',
        marginTop: verticalScale(3),
    },
    divider: {
        position: 'absolute',
        right: 0,
        width: StyleSheet.hairlineWidth,
        height: verticalScale(28),
    },
});

export default HarborStatsCard;
