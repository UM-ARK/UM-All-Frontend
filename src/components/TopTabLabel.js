import React from 'react';
import { moderateScale } from 'react-native-size-matters';

import Text from './AppText';

// 字體在平板上保留較明顯的放大幅度，但不影響 Tab Bar 本身高度
const TAB_LABEL_FONT_SIZE = moderateScale(11, 0.3);

export default function TopTabLabel({ focused, color, children }) {
    return (
        <Text
            style={{
                color,
                fontSize: TAB_LABEL_FONT_SIZE,
                fontWeight: focused ? '600' : '400',
                textAlign: 'center',
                margin: 4,
            }}>
            {children}
        </Text>
    );
}
