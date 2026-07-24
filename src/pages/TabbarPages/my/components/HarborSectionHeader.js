import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';

const HarborSectionHeader = ({title, actionLabel, onAction}) => {
    const {theme} = useTheme();

    return (
        <View style={styles.container}>
            <Text style={[styles.title, {color: theme.black.main}]}>
                {title}
            </Text>
            {actionLabel && onAction ? (
                <Pressable
                    accessibilityRole="button"
                    hitSlop={scale(8)}
                    onPress={() => {
                        trigger();
                        onAction();
                    }}>
                    <Text style={[styles.action, {color: theme.themeColor}]}>
                        {actionLabel}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(30),
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: scale(4),
        paddingTop: verticalScale(3),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '720',
    },
    action: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '650',
        paddingVertical: verticalScale(4),
    },
});

export default HarborSectionHeader;
