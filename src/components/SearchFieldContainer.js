import React from 'react';
import { StyleSheet, View } from 'react-native';

import ScalePressable from './ScalePressable';
import searchFieldStyles, {
    SEARCH_FIELD_BORDER_RADIUS,
    SEARCH_FIELD_MIN_HEIGHT,
} from './searchFieldStyles';
import { useTheme } from './ThemeContext';
import { GlassView } from '../utils/glassEffect';

/**
 * 全站搜尋框共用外殼（論壇／選課／服務／組織共用）：
 * - 外層圓角容器套用統一 `theme.viewShadow`（無 `overflow: 'hidden'`，避免裁切陰影）；
 * - 內層在液態玻璃模式使用互動式 `GlassView` 膠囊，否則呈現各頁指定的實色／邊框樣式；
 * - 傳入 `onPress` 時改以 `ScalePressable` 包裹（如論壇頁的搜尋入口按鈕）。
 */
export default function SearchFieldContainer({
    liquidGlass = false,
    shadow = true,
    onPress,
    accessibilityRole,
    accessibilityLabel,
    containerStyle,
    fieldStyle,
    children,
}) {
    const { theme } = useTheme();
    const OuterContainer = onPress ? ScalePressable : View;
    const FieldContainer = liquidGlass ? GlassView : View;

    return (
        <OuterContainer
            {...(onPress
                ? {
                    accessibilityRole,
                    accessibilityLabel,
                    onPress,
                }
                : {})}
            style={[
                styles.shadowWrap,
                liquidGlass && styles.liquidGlassShadowWrap,
                shadow && theme.viewShadow,
                containerStyle,
            ]}>
            <FieldContainer
                {...(liquidGlass ? { isInteractive: true } : {})}
                style={[
                    searchFieldStyles.field,
                    liquidGlass ? styles.liquidGlassField : fieldStyle,
                ]}>
                {children}
            </FieldContainer>
        </OuterContainer>
    );
}

const styles = StyleSheet.create({
    shadowWrap: {
        width: '100%',
        borderRadius: SEARCH_FIELD_BORDER_RADIUS,
    },
    liquidGlassShadowWrap: {
        borderRadius: SEARCH_FIELD_MIN_HEIGHT / 2,
    },
    liquidGlassField: {
        width: '100%',
        borderRadius: SEARCH_FIELD_MIN_HEIGHT / 2,
        paddingHorizontal: 14,
        overflow: 'hidden',
    },
});
