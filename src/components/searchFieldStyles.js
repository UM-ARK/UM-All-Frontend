import { Platform, StyleSheet } from 'react-native';
import { scale } from 'react-native-size-matters';

import { uiStyle } from './ThemeContext';

/** 全站搜尋框統一高度、圓角、間距與排版 Token（固定邏輯尺寸，避免隨螢幕長寬比失真或觸發 iOS Web 自動縮放） */
export const SEARCH_FIELD_MIN_HEIGHT = 44;
export const TOP_SEGMENT_SEARCH_GAP = scale(4);
export const SEARCH_FIELD_BORDER_WIDTH = 1;
export const SEARCH_FIELD_BORDER_RADIUS = 12;
export const SEARCH_FIELD_FONT_SIZE = 16;
export const SEARCH_FIELD_ICON_SIZE = 18;
export const SEARCH_FIELD_CLEAR_ICON_SIZE = 18;
export const SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER = 1.35;

const FIELD_PADDING_HORIZONTAL = 12;
const FIELD_GAP = 8;
const INPUT_PADDING_VERTICAL = Platform.OS === 'ios' ? 10 : 8;

export default StyleSheet.create({
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: SEARCH_FIELD_MIN_HEIGHT,
        paddingHorizontal: FIELD_PADDING_HORIZONTAL,
        gap: FIELD_GAP,
        borderRadius: SEARCH_FIELD_BORDER_RADIUS,
    },
    borderedField: {
        minHeight: SEARCH_FIELD_MIN_HEIGHT + SEARCH_FIELD_BORDER_WIDTH * 2,
        borderWidth: SEARCH_FIELD_BORDER_WIDTH,
    },
    typography: {
        ...uiStyle.defaultText,
        fontSize: SEARCH_FIELD_FONT_SIZE,
    },
    text: {
        ...uiStyle.defaultText,
        flex: 1,
        minWidth: 0,
        fontSize: SEARCH_FIELD_FONT_SIZE,
    },
    input: {
        minHeight: SEARCH_FIELD_MIN_HEIGHT,
        paddingVertical: INPUT_PADDING_VERTICAL,
        ...(Platform.OS === 'android' && {
            includeFontPadding: false,
            textAlignVertical: 'center',
        }),
    },
    // 僅在外層容器已提供明確焦點邊框時搭配使用，避免鍵盤導覽失去焦點提示
    inputNoWebOutline: Platform.OS === 'web' ? { outlineStyle: 'none' } : {},
    clearButton: {
        minWidth: 36,
        minHeight: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -6,
    },
});
