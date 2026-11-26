import React, { useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { verticalScale } from 'react-native-size-matters';

import { useTheme } from '../../../../components/ThemeContext';

export const SCROLL_EDGE_FADE_HEIGHT = verticalScale(12);
const SCROLL_EDGE_FADE_DISTANCE = 16;

const withHexAlpha = (hex, alpha) => {
    if (typeof hex !== 'string' || !hex.startsWith('#')) {
        return hex;
    }
    const raw = hex.slice(1);
    const normalized = raw.length === 3
        ? raw.split('').map(ch => ch + ch).join('')
        : raw;
    if (normalized.length !== 6) {
        return hex;
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) {
        return hex;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * 選課頁頂部統一毛玻璃＋Scroll Edge 遮罩：
 * 覆蓋狀態列、頂部切換欄與（搵課頁的）搜尋欄，並於底緣柔和羽化過渡。
 *
 * @param {number} headerHeight 頂部 sticky 區域總高度（含安全區與工具列）
 * @param {number} [fadeHeight] 底緣漸變羽化高度
 * @param {Animated.Value} scrollY 對應滾動容器的垂直位移
 * @param {number} [zIndex] 疊層層級
 */
const TopScrollEdgeBackdrop = ({
    headerHeight,
    fadeHeight = SCROLL_EDGE_FADE_HEIGHT,
    scrollY,
    zIndex = 1,
}) => {
    const { theme, isLight } = useTheme();
    const { bg_color } = theme;

    const edgeOpacity = useMemo(
        () => scrollY.interpolate({
            inputRange: [0, SCROLL_EDGE_FADE_DISTANCE],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        }),
        [scrollY],
    );

    const totalHeight = headerHeight + fadeHeight;

    const { gradientColors, gradientLocations } = useMemo(() => {
        if (totalHeight <= 0) {
            return {
                gradientColors: [bg_color, bg_color],
                gradientLocations: [0, 1],
            };
        }
        const midStop = Math.min(0.9, Math.max(0.05, (headerHeight * 0.72) / totalHeight));
        const headerStop = Math.min(0.96, Math.max(midStop + 0.02, headerHeight / totalHeight));
        return {
            gradientColors: [
                withHexAlpha(bg_color, 0.85),
                withHexAlpha(bg_color, 0.68),
                withHexAlpha(bg_color, 0.96),
                withHexAlpha(bg_color, 0),
            ],
            gradientLocations: [0, midStop, headerStop, 1],
        };
    }, [bg_color, headerHeight, totalHeight]);

    if (headerHeight <= 0) {
        return null;
    }

    const blurTint = isLight
        ? 'systemUltraThinMaterialLight'
        : 'systemUltraThinMaterialDark';

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.container,
                { height: totalHeight, opacity: edgeOpacity, zIndex },
            ]}>
            <View style={[styles.blurBand, { height: headerHeight }]}>
                <BlurView
                    intensity={42}
                    tint={blurTint}
                    style={StyleSheet.absoluteFill}
                />
            </View>
            <LinearGradient
                colors={gradientColors}
                locations={gradientLocations}
                style={StyleSheet.absoluteFill}
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    blurBand: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
});

export default TopScrollEdgeBackdrop;
