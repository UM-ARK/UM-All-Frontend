import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from './ThemeContext';
import { scale, verticalScale } from 'react-native-size-matters';

const SimpleProgressBar = ({
    progress = 0,
    color,
    width = scale(200),
    height = verticalScale(6),
    style,
}) => {
    const { theme } = useTheme();
    const clampedProgress = Math.max(0, Math.min(1, progress));

    return (
        <View
            style={[
                styles.container,
                { width, height, backgroundColor: theme.disabled, ...style },
            ]}>
            <View
                style={[
                    styles.progress,
                    {
                        width: `${Math.floor(clampedProgress * 100)}%`,
                        backgroundColor: color || theme.themeColor,
                        height,
                    },
                ]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: verticalScale(4),
        overflow: 'hidden',
    },
    progress: {
        borderRadius: verticalScale(4),
    },
});

export default SimpleProgressBar;
