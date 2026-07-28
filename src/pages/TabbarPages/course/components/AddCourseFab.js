import React, { useEffect, useMemo } from 'react';
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

import { useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import TouchableScale from '../../../../components/TouchableScale';

const FAB_FADE_MS = 220;

/**
 * 課表段落右下角浮動操作列：加課 → 課程目錄。
 *
 * 清空收進頂欄 ⋯ 選單，避免低頻危險操作長期遮擋課表；
 * 課程目錄切到隔壁段落，與搵課頁底部課表膠囊對稱；
 * sheet 展開時由呼叫端以 visible=false 淡出（會被 sheet 蓋住）。
 *
 * @param {number} bottom 距底部距離（呼叫端需扣掉 Tab Bar 高度）
 * @param {Function} onAddPress 開啟加課 sheet
 * @param {Function} [onSearchPress] 跳轉到搵課段落
 * @param {boolean} [visible] 是否可見（關閉時淡出，不卸載以保留動畫）
 */
const AddCourseFab = ({
    bottom,
    onAddPress,
    onSearchPress,
    visible = true,
}) => {
    const { theme } = useTheme();
    const { themeColor, black, white } = theme;
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
                alignItems: 'center',
                justifyContent: 'center',
                width: scale(44),
                height: scale(44),
                borderRadius: scale(22),
                overflow: 'hidden',
                backgroundColor: isLiquidGlassSupported ? null : white,
                ...fallbackShadow,
            },
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
                accessibilityRole="button"
                accessibilityLabel={t('加課', { ns: 'timetable' })}
                hitSlop={scale(8)}>
                <LiquidGlassView
                    interactive
                    hover={
                        isLiquidGlassSupported ? { effect: 'highlight' } : null
                    }
                    style={styles.pill}>
                    <Ionicons name="add" size={scale(24)} color={themeColor} />
                </LiquidGlassView>
            </TouchableScale>

            <TouchableScale
                onPress={() => {
                    trigger();
                    onSearchPress?.();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('搵課')}
                hitSlop={scale(8)}>
                <LiquidGlassView
                    interactive
                    hover={
                        isLiquidGlassSupported ? { effect: 'highlight' } : null
                    }
                    style={styles.pill}>
                    <Ionicons
                        name="library-outline"
                        size={scale(21)}
                        color={themeColor}
                    />
                </LiquidGlassView>
            </TouchableScale>
        </Animated.View>
    );
};

export default AddCourseFab;
