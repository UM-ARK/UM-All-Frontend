import React, { useMemo } from 'react';
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
 * 課表段落右下角浮動操作列：清空（有排課時）在上、加課在下。
 *
 * 清空從頂欄 ⋯ 選單遷出，與加課同區，避免次要操作藏太深；
 * sheet 展開時由呼叫端整組隱藏（會被 sheet 蓋住）。
 *
 * @param {number} bottom 距底部距離（呼叫端需扣掉 Tab Bar 高度）
 * @param {Function} onAddPress 開啟加課 sheet
 * @param {Function} [onClearPress] 清空模擬課表（含確認對話框由呼叫端處理）
 * @param {boolean} [canClear] 是否已有排課（無排課時不顯示清空）
 */
const AddCourseFab = ({
    bottom,
    onAddPress,
    onClearPress,
    canClear = false,
}) => {
    const { theme } = useTheme();
    const { themeColor, black, white, unread } = theme;

    const styles = useMemo(() => {
        const fallbackShadow = isLiquidGlassSupported
            ? {}
            : {
                  shadowColor: black.main,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
              };

        return {
            stack: {
                position: 'absolute',
                right: scale(16),
                bottom,
                alignItems: 'flex-end',
                rowGap: verticalScale(8),
            },
            pill: {
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: scale(14),
                paddingVertical: verticalScale(8),
                borderRadius: scale(22),
                overflow: 'hidden',
                backgroundColor: isLiquidGlassSupported ? null : white,
                ...fallbackShadow,
            },
            label: color => ({
                ...uiStyle.defaultText,
                color,
                fontWeight: 'bold',
                fontSize: scale(13),
                marginLeft: scale(4),
            }),
        };
    }, [black.main, bottom, white]);

    return (
        <View style={styles.stack}>
            {canClear ? (
                <TouchableScale
                    onPress={() => {
                        trigger();
                        onClearPress?.();
                    }}
                    hitSlop={scale(8)}>
                    <LiquidGlassView
                        interactive
                        hover={
                            isLiquidGlassSupported
                                ? { effect: 'highlight' }
                                : null
                        }
                        style={styles.pill}>
                        <Ionicons
                            name="trash-outline"
                            size={scale(16)}
                            color={unread}
                        />
                        <Text style={styles.label(unread)}>
                            {t('清空', { ns: 'timetable' })}
                        </Text>
                    </LiquidGlassView>
                </TouchableScale>
            ) : null}

            <TouchableScale
                onPress={() => {
                    trigger();
                    onAddPress?.();
                }}
                hitSlop={scale(8)}>
                <LiquidGlassView
                    interactive
                    hover={
                        isLiquidGlassSupported ? { effect: 'highlight' } : null
                    }
                    style={styles.pill}>
                    <Ionicons name="add" size={scale(18)} color={themeColor} />
                    <Text style={styles.label(themeColor)}>
                        {t('加課', { ns: 'timetable' })}
                    </Text>
                </LiquidGlassView>
            </TouchableScale>
        </View>
    );
};

export default AddCourseFab;
