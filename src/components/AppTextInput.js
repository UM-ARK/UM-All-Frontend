import React, { forwardRef } from 'react';
import { Platform, StyleSheet, TextInput as RNTextInput } from 'react-native';

import { ANDROID_UI_FONT_FAMILY } from './typography';

const AppTextInput = forwardRef(({ style, ...props }, ref) => {
    return (
        <RNTextInput
            {...props}
            ref={ref}
            style={[Platform.OS === 'android' && styles.androidFont, style]}
        />
    );
});

AppTextInput.displayName = 'AppTextInput';

const styles = StyleSheet.create({
    androidFont: {
        fontFamily: ANDROID_UI_FONT_FAMILY,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
});

export default AppTextInput;
