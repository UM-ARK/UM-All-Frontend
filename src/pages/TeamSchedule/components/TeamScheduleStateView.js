/**
 * 組隊約時間共用狀態：skeleton／空狀態／區塊內錯誤重試
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {trigger} from '../../../utils/trigger';

/** 單列 skeleton，對齊 EventRow 大致高度 */
export const TeamScheduleEventSkeleton = () => {
    const {theme} = useTheme();

    return (
        <View
            style={[
                styles.skeletonRow,
                {
                    backgroundColor: theme.white,
                    borderColor: theme.themeColorUltraLight,
                },
            ]}>
            <View style={styles.skeletonContent}>
                <View
                    style={[
                        styles.skeletonLine,
                        styles.skeletonMetaLine,
                        {backgroundColor: theme.tonal.primary15},
                    ]}
                />
                <View
                    style={[
                        styles.skeletonLine,
                        styles.skeletonTitleLine,
                        {backgroundColor: theme.tonal.primary15},
                    ]}
                />
                <View
                    style={[
                        styles.skeletonLine,
                        styles.skeletonSubLine,
                        {backgroundColor: theme.tonal.primary08},
                    ]}
                />
            </View>
            <View
                style={[
                    styles.skeletonChevron,
                    {backgroundColor: theme.tonal.primary08},
                ]}
            />
        </View>
    );
};

/**
 * 2～3 列 skeleton（預設 3）
 * @param {{rows?: number, style?: object}} props
 */
export const TeamScheduleSkeletonList = ({rows = 3, style}) => {
    const count = Math.min(3, Math.max(2, rows));
    return (
        <View style={style}>
            {Array.from({length: count}, (_, index) => (
                <TeamScheduleEventSkeleton key={`team-schedule-skel-${index}`} />
            ))}
        </View>
    );
};

/**
 * 全頁／區塊空狀態或錯誤大狀態
 */
export const TeamScheduleFullState = ({
    icon = 'calendar-blank-outline',
    title,
    description,
    actionLabel,
    onAction,
    actionDisabled = false,
}) => {
    const {theme} = useTheme();

    return (
        <View style={styles.fullState}>
            <View
                style={[
                    styles.stateIcon,
                    {backgroundColor: theme.tonal.primary15},
                ]}>
                <MaterialCommunityIcons
                    name={icon}
                    size={scale(30)}
                    color={theme.themeColor}
                />
            </View>
            <Text style={[styles.stateTitle, {color: theme.black.main}]}>
                {title}
            </Text>
            {description ? (
                <Text
                    style={[
                        styles.stateDescription,
                        {color: theme.black.third},
                    ]}>
                    {description}
                </Text>
            ) : null}
            {actionLabel && onAction ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{disabled: actionDisabled}}
                    disabled={actionDisabled}
                    onPress={() => {
                        trigger();
                        onAction();
                    }}
                    style={({pressed}) => [
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

/**
 * 區塊內錯誤＋重試（不遮住 Harbor 個人資料）
 */
export const TeamScheduleInlineError = ({
    message,
    actionLabel,
    onRetry,
    disabled = false,
}) => {
    const {theme} = useTheme();

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
                style={[styles.inlineRetryText, {color: theme.black.second}]}>
                {message}
            </Text>
            <Pressable
                accessibilityRole="button"
                accessibilityState={{disabled}}
                disabled={disabled}
                hitSlop={scale(8)}
                onPress={() => {
                    trigger();
                    onRetry();
                }}
                style={({pressed}) => [
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

/**
 * 依 variant 渲染狀態（skeleton／empty／error）
 */
const TeamScheduleStateView = ({
    variant = 'empty',
    rows = 3,
    icon,
    title,
    description,
    actionLabel,
    onAction,
    message,
    onRetry,
    disabled = false,
    style,
}) => {
    if (variant === 'skeleton') {
        return <TeamScheduleSkeletonList rows={rows} style={style} />;
    }
    if (variant === 'error') {
        return (
            <View style={style}>
                <TeamScheduleInlineError
                    message={message || title}
                    actionLabel={actionLabel}
                    onRetry={onRetry || onAction}
                    disabled={disabled}
                />
            </View>
        );
    }
    return (
        <View style={style}>
            <TeamScheduleFullState
                icon={icon}
                title={title}
                description={description}
                actionLabel={actionLabel}
                onAction={onAction}
                actionDisabled={disabled}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    skeletonRow: {
        minHeight: verticalScale(72),
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(14),
        marginBottom: verticalScale(8),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(12),
    },
    skeletonContent: {
        flex: 1,
        minWidth: 0,
    },
    skeletonLine: {
        borderRadius: scale(6),
    },
    skeletonMetaLine: {
        width: '28%',
        height: verticalScale(8),
    },
    skeletonTitleLine: {
        width: '78%',
        height: verticalScale(12),
        marginTop: verticalScale(8),
    },
    skeletonSubLine: {
        width: '52%',
        height: verticalScale(8),
        marginTop: verticalScale(8),
    },
    skeletonChevron: {
        width: scale(14),
        height: scale(14),
        borderRadius: scale(4),
        marginLeft: scale(10),
    },
    fullState: {
        minHeight: verticalScale(180),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(24),
        paddingVertical: verticalScale(24),
    },
    stateIcon: {
        width: scale(58),
        height: scale(58),
        borderRadius: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(12),
    },
    stateTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '700',
        textAlign: 'center',
    },
    stateDescription: {
        ...uiStyle.defaultText,
        maxWidth: scale(280),
        fontSize: scale(12),
        lineHeight: scale(18),
        textAlign: 'center',
        marginTop: verticalScale(6),
    },
    stateButton: {
        minWidth: scale(120),
        alignItems: 'center',
        borderRadius: scale(11),
        marginTop: verticalScale(14),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(9),
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

export default TeamScheduleStateView;
