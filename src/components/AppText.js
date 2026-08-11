import React, { forwardRef } from 'react';
import { Platform, StyleSheet, Text as RNText } from 'react-native';

import { ANDROID_UI_FONT_FAMILY } from './typography';

const AppText = forwardRef(({ style, ...props }, ref) => {
    return (
        <RNText
            {...props}
            ref={ref}
            style={[Platform.OS === 'android' && styles.androidFont, style]}
        />
    );
});

AppText.displayName = 'AppText';

const styles = StyleSheet.create({
    androidFont: {
        fontFamily: ANDROID_UI_FONT_FAMILY,
        includeFontPadding: false,
    },
});

export default AppText;
