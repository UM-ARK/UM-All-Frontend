import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';

const HarborSectionHeader = ({title, actionLabel, onAction}) => {
    const {theme} = useTheme();
    const hasAction = Boolean(actionLabel && onAction);

    return (
        <View style={styles.container}>
            <Text style={[styles.title, {color: theme.black.main}]}>
                {title}
            </Text>
            {hasAction ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={actionLabel}
                    hitSlop={scale(8)}
                    style={styles.action}
                    onPress={() => {
                        trigger();
                        onAction();
                    }}>
                    <Text
                        style={[styles.actionText, {color: theme.black.third}]}>
                        {actionLabel}
                    </Text>
                    <Ionicons
                        name="chevron-forward"
                        size={scale(14)}
                        color={theme.black.third}
                    />
                </Pressable>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(36),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(4),
    },
    title: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(14),
        fontWeight: '700',
    },
    action: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(2),
        paddingVertical: verticalScale(2),
        marginLeft: scale(8),
    },
    actionText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '500',
    },
});

export default HarborSectionHeader;
