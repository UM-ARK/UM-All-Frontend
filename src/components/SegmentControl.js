import React from 'react';
import { StyleSheet, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import Text from './AppText';
import { useTheme, uiStyle } from './ThemeContext';
import { trigger } from '../utils/trigger';
import TouchableScale from './TouchableScale';

const getTrackStyle = backgroundColor => ({ backgroundColor });

const getOptionStyle = (isSelected, selectedBackground) => ({
    backgroundColor: isSelected ? selectedBackground : 'transparent',
});

const getLabelStyle = (isSelected, accent, inactive) => ({
    color: isSelected ? accent : inactive,
    fontWeight: isSelected ? '600' : '400',
});

/**
 * 分段控制元件（膠囊樣式，用於設定列、篩選等）
 * @param {{ key: string, label: string, showDot?: boolean, dotColor?: string }[]} options - 選項配置
 * @param {number} selectedIndex - 當前選中索引
 * @param {(index: number) => void} onChange - 變更回調
 * @param {object} [style] - 外層容器額外樣式
 * @param {string} [trackBackgroundColor] - 軌道底色（預設 theme.bg_color）
 * @param {string} [accentColor] - 選中態強調色（預設 theme.themeColor）
 * @param {string} [selectedBackgroundColor] - 選中項目底色（預設 accentColor 的 tonal 色）
 * @param {string} [inactiveLabelColor] - 未選中文字色（預設 theme.black.third）
 * @param {number} [fontSize] - 標籤字級（預設 scale(11)）
 * @param {boolean} [wrap] - 是否允許換行（多選項窄螢幕）
 * @param {boolean} [compact] - 緊湊模式（頂欄等需貼頂的場景）
 */
const SegmentControl = ({
    options,
    selectedIndex,
    onChange,
    style,
    trackBackgroundColor,
    accentColor,
    selectedBackgroundColor,
    inactiveLabelColor,
    fontSize,
    wrap,
    compact,
}) => {
    const { theme } = useTheme();
    const { themeColor, bg_color, black, unread } = theme;
    const accent = accentColor ?? themeColor;
    const track = trackBackgroundColor ?? bg_color;
    const selectedBackground = selectedBackgroundColor ?? `${accent}15`;
    const inactive = inactiveLabelColor ?? black.third;
    const labelSize = fontSize ?? scale(11);

    return (
        <View
            style={[
                styles.track,
                compact && styles.compactTrack,
                wrap ? styles.wrappedTrack : styles.singleLineTrack,
                getTrackStyle(track),
                style,
            ]}>
            {options.map((option, index) => {
                const isSelected = selectedIndex === index;

                return (
                    <TouchableScale
                        key={option.key}
                        onPress={() => {
                            trigger('selection');
                            onChange(index);
                        }}
                        style={[
                            styles.option,
                            compact && styles.compactOption,
                            getOptionStyle(isSelected, selectedBackground),
                        ]}>
                        <View style={styles.labelRow}>
                            <Text
                                style={[
                                    styles.label,
                                    { fontSize: labelSize },
                                    getLabelStyle(isSelected, accent, inactive),
                                ]}>
                                {option.label}
                            </Text>
                            {option.showDot ? (
                                <View
                                    style={[
                                        styles.dot,
                                        {
                                            backgroundColor:
                                                option.dotColor ?? unread,
                                        },
                                    ]}
                                />
                            ) : null}
                        </View>
                    </TouchableScale>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    track: {
        flexDirection: 'row',
        borderRadius: scale(999),
        padding: scale(3),
        overflow: 'hidden',
    },
    compactTrack: {
        padding: 0,
    },
    wrappedTrack: {
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    singleLineTrack: {
        flexWrap: 'nowrap',
    },
    option: {
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(5),
        borderRadius: scale(999),
    },
    compactOption: {
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(3),
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
    },
    label: {
        ...uiStyle.defaultText,
    },
    dot: {
        width: scale(5),
        height: scale(5),
        borderRadius: scale(3),
    },
});

export default SegmentControl;
