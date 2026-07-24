import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';
import {activityMeta, formatRelativeTime} from '../utils/harborUi';

const HarborActivityRow = ({item, onPress, showDivider = false}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('my');
    const meta = activityMeta[item.kind] || activityMeta.activity;

    return (
        <Pressable
            accessibilityRole="button"
            style={({pressed}) => [
                styles.container,
                pressed && {backgroundColor: theme.tonal.primary08},
            ]}
            onPress={() => {
                trigger();
                onPress(item);
            }}>
            <View
                style={[
                    styles.iconWrap,
                    {backgroundColor: theme.tonal.primary15},
                ]}>
                <Ionicons
                    name={meta.icon}
                    size={scale(20)}
                    color={theme.themeColor}
                />
            </View>
            <View style={styles.content}>
                <View style={styles.metaRow}>
                    <Text style={[styles.meta, {color: theme.themeColor}]}>
                        {t(meta.label)}
                    </Text>
                    <Text style={[styles.time, {color: theme.black.third}]}>
                        {formatRelativeTime(item.createdAt, i18n.language)}
                    </Text>
                </View>
                <Text
                    numberOfLines={2}
                    style={[styles.title, {color: theme.black.main}]}>
                    {item.title || t('未命名內容')}
                </Text>
                {item.excerpt ? (
                    <Text
                        numberOfLines={2}
                        style={[styles.excerpt, {color: theme.black.third}]}>
                        {item.excerpt}
                    </Text>
                ) : null}
            </View>
            <Ionicons
                name="chevron-forward"
                size={scale(17)}
                color={theme.black.third}
            />
            {showDivider ? (
                <View
                    style={[
                        styles.divider,
                        {backgroundColor: theme.themeColorUltraLight},
                    ]}
                />
            ) : null}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(78),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(11),
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(11),
    },
    iconWrap: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale(8),
        marginBottom: verticalScale(3),
    },
    meta: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
    },
    time: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '650',
        lineHeight: verticalScale(18),
    },
    excerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
        marginTop: verticalScale(3),
    },
    divider: {
        position: 'absolute',
        right: scale(15),
        bottom: 0,
        left: scale(68),
        height: StyleSheet.hairlineWidth,
    },
});

export default HarborActivityRow;
