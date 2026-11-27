import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { scale } from 'react-native-size-matters';
import SegmentedControl from '@expo/ui/community/segmented-control';

import SegmentedTabControl, {
    NATIVE_SEGMENT_CONTROL_HEIGHT,
    getNativeSegmentControlWidth,
} from './SegmentedTabControl';
import { useTheme } from './ThemeContext';
import { isLiquidGlassSupported } from '../utils/glassEffect';

/**
 * 原生導覽列頂部分段切換器（論壇／選課／服務共用）：
 * - 支援液態玻璃時使用原生 `@expo/ui` SegmentedControl 並套用統一寬高；
 * - 否則回退至自訂 SegmentedTabControl（Android／Web／舊版 iOS）。
 */
export default function NativeHeaderSegmentControl({
    options,
    values,
    selectedIndex,
    position,
    onChange,
    compact = false,
    badge = null,
    badgeStyle,
}) {
    const { theme } = useTheme();
    const segmentValues = useMemo(
        () => values ?? options.map(option => option.label),
        [options, values],
    );
    const segmentCount = segmentValues.length || options.length;

    if (isLiquidGlassSupported) {
        return (
            <View
                style={[
                    styles.inner,
                    { width: getNativeSegmentControlWidth(segmentCount) },
                ]}>
                <SegmentedControl
                    values={segmentValues}
                    selectedIndex={selectedIndex}
                    onChange={event => {
                        const index = event.nativeEvent.selectedSegmentIndex;
                        if (
                            typeof index !== 'number' ||
                            index < 0 ||
                            index >= segmentCount
                        ) {
                            return;
                        }
                        onChange(index);
                    }}
                    appearance={theme.isLight ? 'light' : 'dark'}
                    style={styles.control}
                />
                {badge ? (
                    <View
                        pointerEvents="none"
                        style={[styles.badgeAnchor, badgeStyle]}>
                        {badge}
                    </View>
                ) : null}
            </View>
        );
    }

    return (
        <SegmentedTabControl
            options={options}
            selectedIndex={selectedIndex}
            position={position}
            onChange={onChange}
            compact={compact}
        />
    );
}

const styles = StyleSheet.create({
    inner: {
        maxWidth: '100%',
        justifyContent: 'center',
    },
    control: {
        width: '100%',
        height: NATIVE_SEGMENT_CONTROL_HEIGHT,
    },
    badgeAnchor: {
        position: 'absolute',
        top: scale(2),
        right: scale(8),
    },
});
