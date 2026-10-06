import React, {memo} from 'react';
import {
    Pressable,
    StyleSheet,
} from 'react-native';

import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';

const SearchFilterChip = memo(({label, selected, onPress}) => {
    const {theme} = useTheme();

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{selected}}
            onPress={() => {
                trigger('selection');
                onPress();
            }}
            style={({pressed}) => [
                styles.filterChip,
                {
                    backgroundColor: selected
                        ? pressed
                            ? theme.tonal.primary50
                            : theme.tonal.primary30
                        : pressed
                            ? theme.tonal.primary15
                            : theme.tonal.primary08,
                    borderColor: selected
                        ? theme.themeColor
                        : theme.themeColorUltraLight,
                },
            ]}>
            <Text
                numberOfLines={1}
                style={[
                    styles.filterChipText,
                    {
                        color: selected
                            ? theme.themeColor
                            : theme.black.second,
                    },
                ]}>
                {label}
            </Text>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    filterChip: {
        maxWidth: scale(145),
        minHeight: verticalScale(27),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(9),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(6),
        marginBottom: verticalScale(5),
        paddingHorizontal: scale(9),
    },
    filterChipText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '600',
    },
});

export default SearchFilterChip;
