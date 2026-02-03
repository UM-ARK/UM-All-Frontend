import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from './ThemeContext';
import { scale } from 'react-native-size-matters';

/**
 * 玻璃擬態卡片組件
 * 使用BlurView實現半透明毛玻璃效果
 */
const GlassmorphismCard = React.memo(({ children, style, intensity = 50 }) => {
    const { theme } = useTheme();
    const { white, glass } = theme;

    return (
        <View style={[staticStyles.glassCardContainer, style]}>
            <BlurView
                intensity={intensity}
                tint="light"
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: glass },
                ]}
            />
            <View style={staticStyles.glassCardContent}>{children}</View>
        </View>
    );
});

const staticStyles = StyleSheet.create({
    glassCardContainer: {
        borderRadius: scale(12),
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    glassCardContent: {
        padding: scale(8),
    },
});

export default GlassmorphismCard;