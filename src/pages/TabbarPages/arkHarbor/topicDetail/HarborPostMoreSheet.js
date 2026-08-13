import React, { useEffect, useMemo, useRef } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';

import ActionSheet, { ScrollView } from 'react-native-actions-sheet';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { scale, verticalScale } from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';

const PRIMARY_ACTION_IDS = new Set([
    'copyContent',
    'bookmark',
    'copy',
    'share',
]);

const HarborPostMoreSheet = ({ menu, onClose }) => {
    const { theme } = useTheme();
    const sheetRef = useRef(null);
    const pendingActionRef = useRef(null);
    const actions = useMemo(
        () => (menu?.actions || []).filter(action => !action.attributes?.hidden),
        [menu?.actions],
    );
    const primaryActions = actions.filter(action =>
        PRIMARY_ACTION_IDS.has(action.id),
    );
    const secondaryActions = actions.filter(
        action => !PRIMARY_ACTION_IDS.has(action.id),
    );

    useEffect(() => {
        if (menu) {
            sheetRef.current?.show();
        } else {
            sheetRef.current?.hide();
        }
    }, [menu]);

    const selectAction = action => {
        if (action.attributes?.disabled) {
            return;
        }
        trigger();
        pendingActionRef.current = () => menu?.onPressAction(action.id);
        sheetRef.current?.hide();
    };

    return (
        <ActionSheet
            ref={sheetRef}
            gestureEnabled
            onClose={() => {
                onClose();
                const pendingAction = pendingActionRef.current;
                pendingActionRef.current = null;
                if (pendingAction) {
                    requestAnimationFrame(pendingAction);
                }
            }}
            containerStyle={[
                styles.container,
                { backgroundColor: theme.bg_color },
            ]}>
            <ScrollView
                style={[
                    styles.scrollView,
                    {
                        maxHeight:
                            Dimensions.get('window').height * 0.72,
                    },
                ]}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}>
                {primaryActions.length > 0 ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.primaryRow}>
                        {primaryActions.map(action => {
                            const disabled = Boolean(
                                action.attributes?.disabled,
                            );
                            return (
                                <Pressable
                                    key={action.id}
                                    accessibilityRole="button"
                                    accessibilityState={{ disabled }}
                                    disabled={disabled}
                                    onPress={() => selectAction(action)}
                                    style={({ pressed }) => [
                                        styles.primaryAction,
                                        {
                                            opacity: disabled
                                                ? 0.4
                                                : pressed
                                                    ? 0.65
                                                    : 1,
                                        },
                                    ]}>
                                    <View
                                        style={[
                                            styles.primaryIcon,
                                            {
                                                backgroundColor:
                                                    theme.white,
                                            },
                                        ]}>
                                        <MaterialCommunityIcons
                                            name={
                                                action.icon ||
                                                'dots-horizontal'
                                            }
                                            size={scale(24)}
                                            color={
                                                action.attributes?.destructive
                                                    ? theme.unread
                                                    : theme.black.second
                                            }
                                        />
                                    </View>
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.primaryText,
                                            {
                                                color: action.attributes
                                                    ?.destructive
                                                    ? theme.unread
                                                    : theme.black.second,
                                            },
                                        ]}>
                                        {action.title}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                ) : null}

                {secondaryActions.length > 0 ? (
                    <View
                        style={[
                            styles.secondaryGroup,
                            { backgroundColor: theme.white },
                        ]}>
                        {secondaryActions.map((action, index) => {
                            const disabled = Boolean(
                                action.attributes?.disabled,
                            );
                            const destructive = Boolean(
                                action.attributes?.destructive,
                            );
                            return (
                                <Pressable
                                    key={action.id}
                                    accessibilityRole="button"
                                    accessibilityState={{ disabled }}
                                    disabled={disabled}
                                    onPress={() => selectAction(action)}
                                    style={({ pressed }) => [
                                        styles.secondaryAction,
                                        index > 0
                                            ? {
                                                borderTopColor:
                                                    theme.disabled,
                                                borderTopWidth:
                                                    StyleSheet.hairlineWidth,
                                            }
                                            : null,
                                        {
                                            backgroundColor: pressed
                                                ? theme.tonal.primary08
                                                : theme.white,
                                            opacity: disabled ? 0.4 : 1,
                                        },
                                    ]}>
                                    <MaterialCommunityIcons
                                        name={
                                            action.icon ||
                                            'dots-horizontal'
                                        }
                                        size={scale(21)}
                                        color={
                                            destructive
                                                ? theme.unread
                                                : theme.black.second
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.secondaryText,
                                            {
                                                color: destructive
                                                    ? theme.unread
                                                    : theme.black.main,
                                            },
                                        ]}>
                                        {action.title}
                                    </Text>
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={scale(20)}
                                        color={theme.black.third}
                                    />
                                </Pressable>
                            );
                        })}
                    </View>
                ) : null}
            </ScrollView>
        </ActionSheet>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopLeftRadius: scale(18),
        borderTopRightRadius: scale(18),
    },
    scrollView: {
        // ScrollView 預設 flexGrow: 1，會把 sheet 撐到 maxHeight
        flexGrow: 0,
    },
    content: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(8),
        paddingBottom: verticalScale(12),
    },
    primaryRow: {
        gap: scale(10),
        paddingBottom: verticalScale(14),
    },
    primaryAction: {
        alignItems: 'center',
        width: scale(72),
    },
    primaryIcon: {
        alignItems: 'center',
        borderRadius: scale(12),
        height: scale(58),
        justifyContent: 'center',
        width: scale(58),
    },
    primaryText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(6),
        textAlign: 'center',
        width: '100%',
    },
    secondaryGroup: {
        borderRadius: scale(14),
        overflow: 'hidden',
    },
    secondaryAction: {
        alignItems: 'center',
        flexDirection: 'row',
        minHeight: verticalScale(50),
        paddingHorizontal: scale(16),
    },
    secondaryText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(14),
        marginLeft: scale(13),
    },
});

export default HarborPostMoreSheet;
