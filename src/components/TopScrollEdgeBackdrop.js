import React, { useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { verticalScale } from 'react-native-size-matters';

import { useTheme } from './ThemeContext';

export const SCROLL_EDGE_FADE_HEIGHT = verticalScale(12);
const SCROLL_EDGE_FADE_DISTANCE = 16;

// 統一頂部與 sticky 毛玻璃參數：深色模式降低強度避免過暗
export const getTopScrollEdgeBlurProps = isLight => ({
    intensity: isLight ? 42 : 30,
    tint: isLight
        ? 'systemUltraThinMaterialLight'
        : 'systemUltraThinMaterialDark',
});

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
 * 頂部統一毛玻璃＋Scroll Edge 遮罩：
 * 覆蓋狀態列、頂部切換欄與搜尋欄，並於底緣柔和羽化過渡。
 *
 * @param {number} headerHeight 頂部 sticky 區域總高度（含安全區與工具列）
 * @param {number} [fadeHeight] 底緣漸變羽化高度
 * @param {Animated.Value} scrollY 對應滾動容器的垂直位移
 * @param {string} [backgroundColor] 漸變底色（預設取 theme.bg_color）
 * @param {number} [zIndex] 疊層層級
 */
const TopScrollEdgeBackdrop = ({
    headerHeight,
    fadeHeight = SCROLL_EDGE_FADE_HEIGHT,
    scrollY,
    backgroundColor,
    zIndex = 1,
}) => {
    const { theme, isLight } = useTheme();
    const effectiveBgColor = backgroundColor ?? theme.bg_color;

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
                gradientColors: [effectiveBgColor, effectiveBgColor],
                gradientLocations: [0, 1],
            };
        }
        const midStop = Math.min(0.9, Math.max(0.05, (headerHeight * 0.72) / totalHeight));
        const headerStop = Math.min(0.96, Math.max(midStop + 0.02, headerHeight / totalHeight));
        // 深色模式下毛玻璃本身已偏暗，降低遮罩不透明度避免底緣出現過重黑影
        const [topAlpha, midAlpha, edgeAlpha] = isLight
            ? [0.85, 0.68, 0.96]
            : [0.68, 0.42, 0.55];
        return {
            gradientColors: [
                withHexAlpha(effectiveBgColor, topAlpha),
                withHexAlpha(effectiveBgColor, midAlpha),
                withHexAlpha(effectiveBgColor, edgeAlpha),
                withHexAlpha(effectiveBgColor, 0),
            ],
            gradientLocations: [0, midStop, headerStop, 1],
        };
    }, [effectiveBgColor, headerHeight, isLight, totalHeight]);

    if (headerHeight <= 0) {
        return null;
    }

    const blurProps = getTopScrollEdgeBlurProps(isLight);

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.container,
                { height: totalHeight, opacity: edgeOpacity, zIndex },
            ]}>
            <View style={[styles.blurBand, { height: headerHeight }]}>
                <BlurView
                    {...blurProps}
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
