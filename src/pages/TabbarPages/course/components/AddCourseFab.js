import React, { useEffect, useMemo } from 'react';
import { Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import {
    isLiquidGlassSupported,
    LiquidGlassView,
} from '@callstack/liquid-glass';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { t } from 'i18next';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import TouchableScale from '../../../../components/TouchableScale';

const FAB_FADE_MS = 220;

/**
 * 課表段落右下角浮動操作列：加課 → 搵課 → 清空（有排課時）。
 *
 * 清空從頂欄 ⋯ 選單遷出，與加課同區，避免次要操作藏太深；
 * 搵課切到隔壁段落，與搵課頁底部課表膠囊對稱；
 * sheet 展開時由呼叫端以 visible=false 淡出（會被 sheet 蓋住）。
 *
 * @param {number} bottom 距底部距離（呼叫端需扣掉 Tab Bar 高度）
 * @param {Function} onAddPress 開啟加課 sheet
 * @param {Function} [onSearchPress] 跳轉到搵課段落
 * @param {Function} [onClearPress] 清空模擬課表（含確認對話框由呼叫端處理）
 * @param {boolean} [canClear] 是否已有排課（無排課時不顯示清空）
 * @param {boolean} [visible] 是否可見（關閉時淡出，不卸載以保留動畫）
 */
const AddCourseFab = ({
    bottom,
    onAddPress,
    onSearchPress,
    onClearPress,
    canClear = false,
    visible = true,
}) => {
    const { theme } = useTheme();
    const { themeColor, black, white, unread } = theme;
    const opacity = useSharedValue(visible ? 1 : 0);

    useEffect(() => {
        opacity.value = withTiming(visible ? 1 : 0, { duration: FAB_FADE_MS });
    }, [opacity, visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

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
                rowGap: verticalScale(4),
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
        <Animated.View
            style={[styles.stack, animatedStyle]}
            pointerEvents={visible ? 'box-none' : 'none'}>
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

            <TouchableScale
                onPress={() => {
                    trigger();
                    onSearchPress?.();
                }}
                hitSlop={scale(8)}>
                <LiquidGlassView
                    interactive
                    hover={
                        isLiquidGlassSupported ? { effect: 'highlight' } : null
                    }
                    style={styles.pill}>
                    <Ionicons
                        name="search-outline"
                        size={scale(16)}
                        color={themeColor}
                    />
                    <Text style={styles.label(themeColor)}>
                        {t('搵課')}
                    </Text>
                </LiquidGlassView>
            </TouchableScale>

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
        </Animated.View>
    );
};

export default AddCourseFab;
