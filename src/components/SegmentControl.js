import React from 'react';
import { View, Text } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTheme, uiStyle } from './ThemeContext';
import { trigger } from '../utils/trigger';
import TouchableScale from './TouchableScale';

/**
 * 分段控制元件（膠囊樣式，用於設定列、篩選等）
 * @param {{ key: string, label: string }[]} options - 選項配置
 * @param {number} selectedIndex - 當前選中索引
 * @param {(index: number) => void} onChange - 變更回調
 * @param {object} [style] - 外層容器額外樣式
 * @param {string} [trackBackgroundColor] - 軌道底色（預設 theme.bg_color）
 * @param {string} [accentColor] - 選中態強調色（預設 theme.themeColor）
 * @param {string} [inactiveLabelColor] - 未選中文字色（預設 theme.black.third）
 * @param {number} [fontSize] - 標籤字級（預設 scale(11)）
 * @param {boolean} [wrap] - 是否允許換行（多選項窄螢幕）
 */
const SegmentControl = ({
    options,
    selectedIndex,
    onChange,
    style,
    trackBackgroundColor,
    accentColor,
    inactiveLabelColor,
    fontSize,
    wrap,
}) => {
    const { theme } = useTheme();
    const { themeColor, bg_color, black } = theme;
    const accent = accentColor ?? themeColor;
    const track = trackBackgroundColor ?? bg_color;
    const inactive = inactiveLabelColor ?? black.third;
    const labelSize = fontSize ?? scale(11);

    return (
        <View style={[{
            flexDirection: 'row',
            flexWrap: wrap ? 'wrap' : 'nowrap',
            justifyContent: wrap ? 'center' : undefined,
            backgroundColor: track,
            borderRadius: scale(999),
            padding: scale(3),
            overflow: 'hidden',
        }, style]}>
            {options.map((option, index) => (
                <TouchableScale
                    key={option.key}
                    onPress={() => {
                        trigger();
                        onChange(index);
                    }}
                    style={{
                        paddingHorizontal: scale(12),
                        paddingVertical: verticalScale(5),
                        borderRadius: scale(999),
                        backgroundColor: selectedIndex === index ? `${accent}15` : 'transparent',
                    }}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: labelSize,
                        color: selectedIndex === index ? accent : inactive,
                        fontWeight: selectedIndex === index ? '600' : '400',
                    }}>
                        {option.label}
                    </Text>
                </TouchableScale>
            ))}
        </View>
    );
};

export default SegmentControl;
