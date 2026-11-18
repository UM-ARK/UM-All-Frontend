import { StyleSheet } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';

import { uiStyle } from './ThemeContext';

const CONTENT_MIN_HEIGHT = 44;
const BORDER_WIDTH = 1;

export const SEARCH_FIELD_ICON_SIZE = scale(15);

export default StyleSheet.create({
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: CONTENT_MIN_HEIGHT + BORDER_WIDTH * 2,
        borderWidth: BORDER_WIDTH,
        borderRadius: verticalScale(8),
    },
    text: {
        ...uiStyle.defaultText,
        flex: 1,
        minWidth: 0,
        paddingLeft: scale(30),
        paddingRight: scale(8),
        fontSize: verticalScale(13),
    },
    input: {
        minHeight: CONTENT_MIN_HEIGHT,
    },
    icon: {
        position: 'absolute',
        left: scale(8),
    },
});
