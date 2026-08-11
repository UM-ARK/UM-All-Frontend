import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { scale, verticalScale } from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';

export const HarborTopicSkeleton = () => {
    const { theme } = useTheme();

    return (
        <View
            style={[
                styles.skeletonCard,
                {
                    backgroundColor: theme.white,
                    borderColor: theme.themeColorUltraLight,
                },
            ]}>
            <View style={styles.skeletonHeader}>
                <View
                    style={[
                        styles.skeletonAvatar,
                        { backgroundColor: theme.tonal.primary15 },
                    ]}
                />
                <View style={styles.skeletonAuthor}>
                    <View
                        style={[
                            styles.skeletonLine,
                            styles.skeletonAuthorLine,
                            { backgroundColor: theme.tonal.primary15 },
                        ]}
                    />
                    <View
                        style={[
                            styles.skeletonLine,
                            styles.skeletonShortLine,
                            { backgroundColor: theme.tonal.primary08 },
                        ]}
                    />
                </View>
            </View>
            <View
                style={[
                    styles.skeletonLine,
                    styles.skeletonTitleLine,
                    { backgroundColor: theme.tonal.primary15 },
                ]}
            />
            <View
                style={[
                    styles.skeletonLine,
                    styles.skeletonBodyLine,
                    { backgroundColor: theme.tonal.primary08 },
                ]}
            />
            <View
                style={[
                    styles.skeletonLine,
                    styles.skeletonFooterLine,
                    { backgroundColor: theme.tonal.primary08 },
                ]}
            />
        </View>
    );
};

export const HarborFullState = ({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    actionDisabled = false,
}) => {
    const { theme } = useTheme();

    return (
        <View style={styles.fullState}>
            <View
                style={[
                    styles.stateIcon,
                    { backgroundColor: theme.tonal.primary15 },
                ]}>
                <MaterialCommunityIcons
                    name={icon}
                    size={scale(30)}
                    color={theme.themeColor}
                />
            </View>
            <Text style={[styles.stateTitle, { color: theme.black.main }]}>
                {title}
            </Text>
            {description ? (
                <Text
                    style={[
                        styles.stateDescription,
                        { color: theme.black.third },
                    ]}>
                    {description}
                </Text>
            ) : null}
            {actionLabel && onAction ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: actionDisabled }}
                    disabled={actionDisabled}
                    onPress={() => {
                        trigger();
                        onAction();
                    }}
                    style={({ pressed }) => [
                        styles.stateButton,
                        {
                            backgroundColor: actionDisabled
                                ? theme.tonal.primary30
                                : pressed
                                    ? theme.tonal.primary50
                                    : theme.themeColor,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.stateButtonText,
                            {
                                color: actionDisabled
                                    ? theme.black.third
                                    : theme.trueWhite,
                            },
                        ]}>
                        {actionLabel}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );
};

export const HarborInlineRetry = ({
    message,
    actionLabel,
    onRetry,
    disabled = false,
}) => {
    const { theme } = useTheme();

    return (
        <View
            style={[
                styles.inlineRetry,
                {
                    backgroundColor: theme.tonal.unread15,
                    borderColor: theme.tonal.unread30,
                },
            ]}>
            <MaterialCommunityIcons
                name="alert-circle-outline"
                size={scale(18)}
                color={theme.unread}
            />
            <Text
                numberOfLines={2}
                style={[styles.inlineRetryText, { color: theme.black.second }]}>
                {message}
            </Text>
            <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                hitSlop={scale(8)}
                onPress={() => {
                    trigger();
                    onRetry();
                }}
                style={({ pressed }) => [
                    styles.inlineRetryButton,
                    {
                        backgroundColor: pressed
                            ? theme.tonal.primary30
                            : disabled
                                ? theme.tonal.primary08
                                : theme.tonal.primary15,
                    },
                ]}>
                <Text
                    style={[
                        styles.inlineRetryButtonText,
                        {
                            color: disabled
                                ? theme.black.third
                                : theme.themeColor,
                        },
                    ]}>
                    {actionLabel}
                </Text>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    skeletonCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(16),
        marginHorizontal: scale(14),
        marginBottom: verticalScale(10),
        padding: scale(14),
    },
    skeletonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    skeletonAvatar: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(17),
    },
    skeletonAuthor: {
        flex: 1,
        marginLeft: scale(9),
    },
    skeletonLine: {
        borderRadius: scale(6),
    },
    skeletonAuthorLine: {
        width: '34%',
        height: verticalScale(8),
    },
    skeletonShortLine: {
        width: '22%',
        height: verticalScale(6),
        marginTop: verticalScale(6),
    },
    skeletonTitleLine: {
        width: '88%',
        height: verticalScale(13),
        marginTop: verticalScale(14),
    },
    skeletonBodyLine: {
        width: '68%',
        height: verticalScale(8),
        marginTop: verticalScale(8),
    },
    skeletonFooterLine: {
        width: '48%',
        height: verticalScale(7),
        marginTop: verticalScale(14),
    },
    fullState: {
        minHeight: verticalScale(300),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(28),
        paddingVertical: verticalScale(32),
    },
    stateIcon: {
        width: scale(64),
        height: scale(64),
        borderRadius: scale(22),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(14),
    },
    stateTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(17),
        fontWeight: '700',
        textAlign: 'center',
    },
    stateDescription: {
        ...uiStyle.defaultText,
        maxWidth: scale(300),
        fontSize: scale(12),
        lineHeight: scale(18),
        textAlign: 'center',
        marginTop: verticalScale(7),
    },
    stateButton: {
        minWidth: scale(132),
        alignItems: 'center',
        borderRadius: scale(11),
        marginTop: verticalScale(16),
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(10),
    },
    stateButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
    },
    inlineRetry: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(12),
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: scale(14),
        marginBottom: verticalScale(10),
        paddingHorizontal: scale(11),
        paddingVertical: verticalScale(9),
    },
    inlineRetryText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(11),
        lineHeight: scale(16),
        marginHorizontal: scale(8),
    },
    inlineRetryButton: {
        borderRadius: scale(8),
        paddingHorizontal: scale(9),
        paddingVertical: verticalScale(6),
    },
    inlineRetryButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
    },
});
