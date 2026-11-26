import React from 'react';
import { StyleSheet, View } from 'react-native';

import { scale, verticalScale } from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import PhosphorFeatureIcon from '../../info/home/search/components/PhosphorFeatureIcon';
import { harborTopicRowInsets } from './HarborTopicCard';

export const HarborTopicSkeleton = ({ isRowLayout = false }) => {
    const { theme } = useTheme();

    return (
        <View
            style={isRowLayout ? harborTopicRowInsets : [
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
                </View>
            </View>
            <View
                style={[
                    styles.skeletonLine,
                    styles.skeletonTitleLine,
                    isRowLayout && styles.skeletonRowLine,
                    { backgroundColor: theme.tonal.primary15 },
                ]}
            />
            <View
                style={[
                    styles.skeletonLine,
                    styles.skeletonBodyLine,
                    isRowLayout && styles.skeletonRowLine,
                    { backgroundColor: theme.tonal.primary08 },
                ]}
            />
            <View
                style={[
                    styles.skeletonLine,
                    styles.skeletonFooterLine,
                    isRowLayout && styles.skeletonRowLine,
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
                <PhosphorFeatureIcon
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
                <ScalePressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: actionDisabled }}
                    disabled={actionDisabled}
                    onPress={() => {
                        trigger();
                        onAction();
                    }}
                    style={[
                        styles.stateButton,
                        {
                            backgroundColor: actionDisabled
                                ? theme.tonal.primary30
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
                </ScalePressable>
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
            <PhosphorFeatureIcon
                name="warning-circle"
                size={scale(18)}
                color={theme.unread}
            />
            <Text
                numberOfLines={2}
                style={[styles.inlineRetryText, { color: theme.black.second }]}>
                {message}
            </Text>
            <ScalePressable
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                hitSlop={scale(8)}
                onPress={() => {
                    trigger();
                    onRetry();
                }}
                style={[
                    styles.inlineRetryButton,
                    {
                        backgroundColor: disabled
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
            </ScalePressable>
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
        width: scale(20),
        height: scale(20),
        borderRadius: scale(10),
    },
    skeletonAuthor: {
        flex: 1,
        marginLeft: scale(9),
    },
    skeletonLine: {
        borderRadius: scale(6),
    },
    skeletonAuthorLine: {
        width: '48%',
        height: verticalScale(8),
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
    skeletonRowLine: {
        marginTop: verticalScale(6),
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
