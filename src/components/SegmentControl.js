import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTheme, uiStyle } from './ThemeContext';
import { trigger } from '../utils/trigger';

/**
 * 分段控制元件（膠囊樣式，用於設定列、篩選等）
 * @param {{ key: string, label: string }[]} options - 選項配置
 * @param {number} selectedIndex - 當前選中索引
 * @param {(index: number) => void} onChange - 變更回調
 * @param {object} [style] - 外層容器額外樣式
 */
const SegmentControl = ({ options, selectedIndex, onChange, style }) => {
    const { theme } = useTheme();
    const { themeColor, bg_color, black } = theme;

    return (
        <View style={[{
            flexDirection: 'row',
            backgroundColor: bg_color,
            borderRadius: scale(999),
            padding: scale(3),
            overflow: 'hidden',
        }, style]}>
            {options.map((option, index) => (
                <Pressable
                    key={option.key}
                    onPress={() => {
                        trigger();
                        onChange(index);
                    }}
                    style={({ pressed }) => ({
                        paddingHorizontal: scale(12),
                        paddingVertical: verticalScale(5),
                        borderRadius: scale(999),
                        backgroundColor: selectedIndex === index ? `${themeColor}15` : 'transparent',
                        opacity: pressed ? 0.85 : 1,
                    })}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(11),
                        color: selectedIndex === index ? themeColor : black.third,
                        fontWeight: selectedIndex === index ? '600' : '400',
                    }}>
                        {option.label}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
};

export default SegmentControl;
