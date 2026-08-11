import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import Ionicons from "@react-native-vector-icons/ionicons";
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';

const HarborEmptyState = ({
    icon = 'file-tray-outline',
    title,
    description,
    actionLabel,
    onAction,
}) => {
    const {theme} = useTheme();

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.iconWrap,
                    {backgroundColor: theme.tonal.primary15},
                ]}>
                <Ionicons
                    name={icon}
                    size={scale(28)}
                    color={theme.themeColor}
                />
            </View>
            <Text style={[styles.title, {color: theme.black.main}]}>
                {title}
            </Text>
            {description ? (
                <Text style={[styles.description, {color: theme.black.third}]}>
                    {description}
                </Text>
            ) : null}
            {actionLabel && onAction ? (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        trigger();
                        onAction();
                    }}
                    style={({pressed}) => [
                        styles.actionButton,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary50
                                : theme.themeColor,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.actionText,
                            {color: theme.trueWhite},
                        ]}>
                        {actionLabel}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: verticalScale(260),
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(28),
    },
    iconWrap: {
        width: scale(62),
        height: scale(62),
        borderRadius: scale(22),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(14),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(16),
        fontWeight: '700',
        textAlign: 'center',
    },
    description: {
        ...uiStyle.defaultText,
        maxWidth: scale(280),
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        textAlign: 'center',
        marginTop: verticalScale(7),
    },
    actionButton: {
        minWidth: scale(120),
        alignItems: 'center',
        borderRadius: scale(11),
        marginTop: verticalScale(16),
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(10),
    },
    actionText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
    },
});

export default HarborEmptyState;
