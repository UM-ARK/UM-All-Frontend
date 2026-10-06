import React, { useState, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { scale } from 'react-native-size-matters';
import { trigger } from '../utils/trigger';

const PressableCard = ({
    children,
    onPress,
    onLongPress,
    disabled = false,
    style,
    contentStyle,
}) => {
    const handlePress = useCallback(event => {
        trigger();
        if (onPress) {
            onPress(event);
        }
    }, [onPress]);

    const handleLongPress = useCallback(event => {
        trigger('longPress');
        if (onLongPress) {
            onLongPress(event);
        }
    }, [onLongPress]);

    return (
        <Pressable style={({ pressed }) => [
            styles.container,
            style,
            pressed && styles.pressed,
            disabled && styles.disabled,
        ]}
            onPress={handlePress}
            onLongPress={handleLongPress}
            disabled={disabled}>
            <View style={[styles.content, contentStyle]}>{children}</View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: scale(16),
        overflow: 'hidden',
    },
    content: {
        width: '100%',
    },
    pressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    disabled: {
        opacity: 0.5,
    },
});

export default PressableCard;
