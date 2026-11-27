import React, { useMemo } from 'react';
import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { environment, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import SegmentedTabControl from '../../../components/SegmentedTabControl';
import { useTheme } from '../../../components/ThemeContext';
import { isLiquidGlassSupported } from '../../../utils/glassEffect';
import { trigger } from '../../../utils/trigger';

/**
 * 設置列右側分段切換器（iOS）：
 * - 支援液態玻璃時用 SwiftUI Host + segmented Picker，
 *   matchContents 雙向反向量測，不設固定寬度；
 * - 否則回退自訂 SegmentedTabControl（fitContent + padding）。
 */
export default function SettingSegmentControl({
    options,
    selectedIndex,
    onChange,
}) {
    const { theme } = useTheme();
    const values = useMemo(
        () => options.map(option => option.label),
        [options],
    );
    const appearance = theme.isLight ? 'light' : 'dark';
    const modifiers = useMemo(
        () => [
            pickerStyle('segmented'),
            environment('colorScheme', appearance),
        ],
        [appearance],
    );

    const handleChange = index => {
        trigger('selection');
        onChange(index);
    };

    if (!isLiquidGlassSupported) {
        return (
            <SegmentedTabControl
                options={options}
                selectedIndex={selectedIndex}
                onChange={handleChange}
                compact
                fitContent
                inset
            />
        );
    }

    return (
        <Host
            matchContents
            alignment="trailing"
            colorScheme={appearance}
            ignoreSafeArea="all">
            <Picker
                selection={selectedIndex}
                onSelectionChange={selection => {
                    const index = typeof selection === 'number'
                        ? selection
                        : Number(selection);
                    if (
                        !Number.isFinite(index) ||
                        index < 0 ||
                        index >= values.length
                    ) {
                        return;
                    }
                    handleChange(index);
                }}
                modifiers={modifiers}
                label="">
                {values.map((label, index) => (
                    <Text
                        key={options[index]?.key ?? index}
                        modifiers={[tag(index)]}>
                        {label}
                    </Text>
                ))}
            </Picker>
        </Host>
    );
}
