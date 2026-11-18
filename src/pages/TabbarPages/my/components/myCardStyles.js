import {StyleSheet} from 'react-native';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle} from '../../../../components/ThemeContext';

const columnWidth = Math.max(44, scale(48));

export const myCardStyles = StyleSheet.create({
    column: {
        width: columnWidth,
    },
    iconColumn: {
        width: columnWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heading: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        paddingVertical: verticalScale(6),
    },
    headingIcon: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headingTitle: {
        ...uiStyle.defaultText,
        flex: 1,
        minWidth: 0,
        fontSize: scale(14),
        fontWeight: '650',
    },
});
