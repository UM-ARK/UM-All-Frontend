import React from 'react';

import SegmentedTabControl from '../../../components/SegmentedTabControl';
import { trigger } from '../../../utils/trigger';

/**
 * 設置列右側分段切換器（Android／Web／舊版 iOS）：
 * 自訂 SegmentedTabControl，依標籤內容 + padding 自適應寬度。
 */
export default function SettingSegmentControl({
    options,
    selectedIndex,
    onChange,
}) {
    return (
        <SegmentedTabControl
            options={options}
            selectedIndex={selectedIndex}
            onChange={index => {
                trigger('selection');
                onChange(index);
            }}
            compact
            fitContent
            inset
        />
    );
}
