import React, { Component } from 'react';
import { View, Text, } from 'react-native';

import { useTheme, themes, uiStyle } from '../components/ThemeContext';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from "i18next";
import { LinearProgress } from '@rneui/themed';

export default function Loading({ progress = 0.5 }) {
    const { theme } = useTheme();
    const { black, white, themeColor, bg_color } = theme;
    return (
        <View style={{
            paddingHorizontal: scale(20),
            paddingVertical: scale(10),
            borderRadius: scale(12),
            borderWidth: scale(2),
            borderColor: themeColor,
            alignItems: 'center',
            backgroundColor: bg_color,
        }}>
            <Text
                style={{
                    ...uiStyle.defaultText,
                    fontSize: scale(20),
                    fontWeight: '600',
                    color: themeColor,
                    marginTop: scale(2),
                }}>
                {t('ARK ALL瘋狂加載中')}
            </Text>
            <LinearProgress
                style={{ marginVertical: verticalScale(10) }}
                color={themeColor}
                value={progress}
                animation={{ duration: 3000 }}
                variant="determinate"
            />
            <Text
                style={{
                    ...uiStyle.defaultText,
                    fontSize: scale(15),
                    fontWeight: '600',
                    color: themeColor,
                    marginTop: scale(3),
                    textAlign: 'center',
                }}>
                {`${t('確保網絡正常')}\n${t('可以刷新或重啟APP再試')}`}
            </Text>
        </View>
    )
}
