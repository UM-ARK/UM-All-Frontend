import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import {
    isLiquidGlassSupported,
    LiquidGlassView,
} from '@callstack/liquid-glass';
import { t } from 'i18next';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import TouchableScale from '../../../../components/TouchableScale';

/**
 * 課表段落的浮動加課按鈕。
 *
 * 取代原本擠在標題列右上的「＋」：header 統一後兩個段落都不再有段落專屬按鈕。
 *
 * @param {number} bottom 距底部距離（呼叫端需扣掉 Tab Bar 高度）
 * @param {Function} onPress 開啟加課 sheet
 */
const AddCourseFab = ({ bottom, onPress }) => {
    const { theme } = useTheme();
    const { themeColor, black, white } = theme;

    return (
        <View
            style={{
                position: 'absolute',
                right: scale(16),
                bottom,
            }}>
            <TouchableScale
                onPress={() => {
                    trigger();
                    onPress?.();
                }}
                hitSlop={scale(8)}>
                <LiquidGlassView
                    interactive
                    hover={isLiquidGlassSupported ? { effect: 'highlight' } : null}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: scale(14),
                        paddingVertical: verticalScale(8),
                        borderRadius: scale(22),
                        overflow: 'hidden',
                        backgroundColor: isLiquidGlassSupported ? null : white,
                        ...(isLiquidGlassSupported
                            ? {}
                            : {
                                shadowColor: black.main,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                            }),
                    }}>
                    <Ionicons name="add" size={scale(18)} color={themeColor} />
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: themeColor,
                            fontWeight: 'bold',
                            fontSize: scale(13),
                            marginLeft: scale(4),
                        }}>
                        {t('加課', { ns: 'timetable' })}
                    </Text>
                </LiquidGlassView>
            </TouchableScale>
        </View>
    );
};

export default AddCourseFab;
