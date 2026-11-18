/**
 * 可用時間編輯底部：取消／確定
 */
import React, {memo} from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {trigger} from '../../../utils/trigger';

const AvailabilityEditorFooter = ({
    onCancel,
    onConfirm,
    confirming = false,
    disabled = false,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const insets = useSafeAreaInsets();

    return (
        <View
            style={[
                styles.wrap,
                {
                    backgroundColor: theme.bg_color,
                    borderTopColor: theme.themeColorUltraLight,
                    paddingBottom: Math.max(insets.bottom, verticalScale(8)),
                },
            ]}>
            <ScalePressable
                accessibilityRole="button"
                disabled={confirming}
                onPress={() => {
                    trigger();
                    onCancel?.();
                }}
                style={[
                    styles.button,
                    {
                        backgroundColor: theme.tonal.primary15,
                        opacity: confirming ? 0.5 : 1,
                    },
                ]}>
                <Text style={[styles.buttonText, {color: theme.themeColor}]}>
                    {t('取消')}
                </Text>
            </ScalePressable>
            <ScalePressable
                accessibilityRole="button"
                disabled={confirming || disabled}
                onPress={() => {
                    if (confirming || disabled) {
                        return;
                    }
                    trigger();
                    onConfirm?.();
                }}
                style={[
                    styles.button,
                    styles.confirm,
                    {
                        backgroundColor:
                            confirming || disabled
                                ? theme.tonal.primary30
                                : theme.themeColor,
                    },
                ]}>
                {confirming ? (
                    <ActivityIndicator color={theme.trueWhite} />
                ) : (
                    <Text
                        style={[
                            styles.buttonText,
                            {color: theme.trueWhite},
                        ]}>
                        {t('確定')}
                    </Text>
                )}
            </ScalePressable>
        </View>
    );
};

const styles = StyleSheet.create({
    wrap: {
        borderTopWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        gap: scale(10),
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(10),
    },
    button: {
        alignItems: 'center',
        borderRadius: scale(12),
        flex: 1,
        justifyContent: 'center',
        minHeight: verticalScale(44),
        paddingVertical: verticalScale(10),
    },
    confirm: {
        flex: 1.2,
    },
    buttonText: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '700',
    },
});

export default memo(AvailabilityEditorFooter);
