import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';

const HarborSectionHeader = ({
    title,
    actionLabel,
    onAction,
    showAction = false,
}) => {
    const {theme} = useTheme();
    const hasAction = Boolean(onAction || showAction);
    const actionIcon = (
        <Ionicons
            name="chevron-forward"
            size={scale(14)}
            color={theme.black.third}
        />
    );

    return (
        <View style={styles.container}>
            <Text style={[styles.title, {color: theme.black.main}]}>
                {title}
            </Text>
            {onAction ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={actionLabel || title}
                    hitSlop={scale(8)}
                    style={styles.action}
                    onPress={() => {
                        trigger();
                        onAction();
                    }}>
                    {actionIcon}
                </Pressable>
            ) : hasAction ? (
                <View style={styles.action}>{actionIcon}</View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(30),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(10),
        paddingBottom: verticalScale(2),
    },
    title: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(14),
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: verticalScale(2),
        marginLeft: scale(8),
    },
});

export default HarborSectionHeader;
