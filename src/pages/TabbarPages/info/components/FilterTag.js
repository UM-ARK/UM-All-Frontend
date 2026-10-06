import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { scale, moderateScale } from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { clubTagMap } from '../../../../utils/clubMap';
import { trigger } from '../../../../utils/trigger';

/**
 * 篩選標籤組件 - 液態玻璃效果
 * @param {Object} props
 * @param {string} props.tag - 標籤名稱
 * @param {boolean} props.active - 是否選中
 * @param {Function} props.onPress - 點擊回調
 * @param {number} props.count - 標籤數量
 */
const FilterTag = ({ tag, active, onPress, count }) => {
    const { theme, isLight } = useTheme();
    const { themeColor, black, white } = theme;

    const scaleAnim = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(scaleAnim.value) }],
    }));

    const handlePress = () => {
        trigger('selection');
        onPress();
    };

    // 根據主題動態計算樣式
    const blurTint = isLight ? 'light' : 'dark';
    const borderColor = active
        ? `${themeColor}99`
        : (isLight ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.15)');
    const backgroundColor = active
        ? `${themeColor}33`
        : (isLight ? 'rgba(255, 255, 255, 0.15)' : 'rgba(30, 30, 30, 0.5)');
    const countBgColor = active ? themeColor : (isLight ? '#94a3b8' : '#64748b');
    const textColor = active ? themeColor : (isLight ? '#64748b' : '#94a3b8');

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPressIn={() => {
                scaleAnim.value = 0.95;
            }}
            onPressOut={() => {
                scaleAnim.value = 1;
            }}
            onPress={handlePress}
        >
            <Animated.View style={animatedStyle}>
                <BlurView
                    intensity={active ? 60 : 40}
                    tint={blurTint}
                    style={[
                        styles.blurContainer,
                        {
                            borderColor,
                            backgroundColor,
                        },
                    ]}
                >
                    <View style={styles.contentContainer}>
                        <Text
                            style={[
                                uiStyle.defaultText,
                                styles.tagText,
                                {
                                    fontWeight: active ? '700' : '600',
                                    color: textColor,
                                },
                            ]}
                        >
                            {tag === 'ALL' || tag === 'ARK' ? tag : clubTagMap(tag)}
                        </Text>
                        <View
                            style={[
                                styles.countBadge,
                                { backgroundColor: countBgColor },
                            ]}
                        >
                            <Text
                                style={[
                                    uiStyle.defaultText,
                                    styles.countText,
                                    { color: white },
                                ]}
                            >
                                {count}
                            </Text>
                        </View>
                    </View>
                </BlurView>
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    blurContainer: {
        paddingHorizontal: scale(16),
        paddingVertical: scale(10),
        borderRadius: scale(20),
        overflow: 'hidden',
        borderWidth: 1,
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    tagText: {
        fontSize: moderateScale(14),
    },
    countBadge: {
        paddingHorizontal: scale(6),
        paddingVertical: scale(2),
        borderRadius: scale(10),
    },
    countText: {
        fontSize: moderateScale(10),
        fontWeight: '700',
    },
});

export default FilterTag;