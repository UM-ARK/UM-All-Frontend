import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';

const HarborRestoringState = () => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    return (
        <View
            style={[
                styles.container,
                {backgroundColor: theme.white},
            ]}>
            <ActivityIndicator size="large" color={theme.themeColor} />
            <Text style={[styles.text, {color: theme.black.third}]}>
                {t('正在恢復 Harbor 登入狀態…')}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(180),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
        gap: verticalScale(14),
        padding: scale(24),
    },
    text: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        textAlign: 'center',
    },
});

export default HarborRestoringState;
