import React from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import Ionicons from "@react-native-vector-icons/ionicons";
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import TextInput from '../../../../components/AppTextInput';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {checkHarborUsername} from '../../../../utils/harbor/harborApi';
import {trigger} from '../../../../utils/trigger';

const getCheckError = result => {
    const errors = result?.errors;
    if (Array.isArray(errors)) {
        return errors.filter(Boolean).join(' ');
    }
    if (typeof errors === 'string') {
        return errors;
    }
    return '';
};

const HarborUsernameEditorModal = ({
    currentUsername,
    isSubmitting,
    maxLength,
    minLength,
    onClose,
    onSubmit,
    userId,
    visible,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const [newUsername, setNewUsername] = React.useState(currentUsername);
    const [checkStatus, setCheckStatus] = React.useState('idle');
    const [checkMessage, setCheckMessage] = React.useState('');

    React.useEffect(() => {
        if (visible) {
            setNewUsername(currentUsername);
            setCheckStatus('idle');
            setCheckMessage('');
        }
    }, [currentUsername, visible]);

    React.useEffect(() => {
        if (!visible) {
            return undefined;
        }

        const normalizedUsername = newUsername.trim();
        if (!normalizedUsername || normalizedUsername === currentUsername) {
            setCheckStatus('idle');
            setCheckMessage('');
            return undefined;
        }
        if (normalizedUsername.length < minLength) {
            setCheckStatus('invalid');
            setCheckMessage(
                t('使用者名稱至少需要 {{count}} 個字元。', {
                    count: minLength,
                }),
            );
            return undefined;
        }
        if (normalizedUsername.length > maxLength) {
            setCheckStatus('invalid');
            setCheckMessage(
                t('使用者名稱最多只能有 {{count}} 個字元。', {
                    count: maxLength,
                }),
            );
            return undefined;
        }

        const controller = new AbortController();
        setCheckStatus('checking');
        setCheckMessage('');
        const timer = setTimeout(() => {
            checkHarborUsername(normalizedUsername, {
                signal: controller.signal,
                userId,
            })
                .then(result => {
                    const resultError = getCheckError(result);
                    if (resultError) {
                        setCheckStatus('invalid');
                        setCheckMessage(resultError);
                    } else if (result?.available === true) {
                        setCheckStatus('available');
                        setCheckMessage(t('這個使用者名稱可以使用。'));
                    } else {
                        setCheckStatus('invalid');
                        setCheckMessage(t('這個使用者名稱已被使用。'));
                    }
                })
                .catch(error => {
                    if (error?.name !== 'CanceledError') {
                        setCheckStatus('error');
                        setCheckMessage(
                            t('暫時無法檢查使用者名稱，請稍後再試。'),
                        );
                    }
                });
        }, 350);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [
        currentUsername,
        maxLength,
        minLength,
        newUsername,
        t,
        userId,
        visible,
    ]);

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }
        trigger();
        onClose();
    };

    const handleSubmit = () => {
        if (checkStatus !== 'available' || isSubmitting) {
            return;
        }
        trigger();
        const normalizedUsername = newUsername.trim();
        Alert.alert(
            t('確認修改使用者名稱？'),
            t('使用者名稱會由 @{{oldUsername}} 改為 @{{newUsername}}。', {
                oldUsername: currentUsername,
                newUsername: normalizedUsername,
            }),
            [
                {text: t('取消'), style: 'cancel'},
                {
                    text: t('確認修改'),
                    onPress: () => {
                        trigger();
                        onSubmit(normalizedUsername);
                    },
                },
            ],
        );
    };

    const canSubmit = checkStatus === 'available' && !isSubmitting;

    return (
        <Modal
            animationType="fade"
            onRequestClose={handleClose}
            transparent
            visible={visible}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.modalPage}>
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        styles.backdrop,
                        {backgroundColor: theme.black.main},
                    ]}
                />
                <Pressable
                    accessibilityLabel={t('取消')}
                    accessibilityRole="button"
                    disabled={isSubmitting}
                    onPress={handleClose}
                    style={StyleSheet.absoluteFill}
                />
                <View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                        theme.viewShadow,
                    ]}>
                    <View style={styles.header}>
                        <Text
                            style={[styles.title, {color: theme.black.main}]}>
                            {t('修改使用者名稱')}
                        </Text>
                        <Pressable
                            accessibilityLabel={t('關閉')}
                            accessibilityRole="button"
                            disabled={isSubmitting}
                            hitSlop={scale(8)}
                            onPress={handleClose}
                            style={({pressed}) => [
                                styles.closeButton,
                                pressed && {
                                    backgroundColor: theme.tonal.primary15,
                                },
                            ]}>
                            <Ionicons
                                color={theme.black.second}
                                name="close"
                                size={scale(22)}
                            />
                        </Pressable>
                    </View>

                    <Text
                        style={[styles.hint, {color: theme.black.third}]}>
                        {t('輸入 {{min}}–{{max}} 個字元；送出前會由 Harbor 驗證格式和可用性。', {
                            min: minLength,
                            max: maxLength,
                        })}
                    </Text>
                    <View
                        style={[
                            styles.inputRow,
                            {
                                backgroundColor: theme.tonal.primary08,
                                borderColor: theme.themeColorUltraLight,
                            },
                        ]}>
                        <Text
                            style={[styles.atSign, {color: theme.black.third}]}>
                            @
                        </Text>
                        <TextInput
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!isSubmitting}
                            maxLength={maxLength}
                            onChangeText={setNewUsername}
                            onFocus={() => trigger()}
                            returnKeyType="done"
                            selectionColor={theme.themeColor}
                            style={[
                                styles.input,
                                {color: theme.black.main},
                            ]}
                            value={newUsername}
                        />
                        {checkStatus === 'checking' ? (
                            <ActivityIndicator
                                color={theme.themeColor}
                                size="small"
                            />
                        ) : null}
                    </View>
                    {checkMessage ? (
                        <View style={styles.validationRow}>
                            <Ionicons
                                color={
                                    checkStatus === 'available'
                                        ? theme.themeColor
                                        : theme.unread
                                }
                                name={
                                    checkStatus === 'available'
                                        ? 'checkmark-circle-outline'
                                        : 'alert-circle-outline'
                                }
                                size={scale(15)}
                            />
                            <Text
                                style={[
                                    styles.validationText,
                                    {
                                        color:
                                            checkStatus === 'available'
                                                ? theme.themeColor
                                                : theme.unread,
                                    },
                                ]}>
                                {checkMessage}
                            </Text>
                        </View>
                    ) : null}

                    <View style={styles.actions}>
                        <Pressable
                            accessibilityRole="button"
                            disabled={isSubmitting}
                            onPress={handleClose}
                            style={({pressed}) => [
                                styles.actionButton,
                                {backgroundColor: theme.tonal.primary08},
                                pressed && {opacity: 0.78},
                            ]}>
                            <Text
                                style={[
                                    styles.actionText,
                                    {color: theme.black.second},
                                ]}>
                                {t('取消')}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            disabled={!canSubmit}
                            onPress={handleSubmit}
                            style={({pressed}) => [
                                styles.actionButton,
                                {
                                    backgroundColor: canSubmit
                                        ? theme.themeColor
                                        : theme.disabled,
                                },
                                pressed && canSubmit && {opacity: 0.78},
                            ]}>
                            {isSubmitting ? (
                                <ActivityIndicator
                                    color={theme.trueWhite}
                                    size="small"
                                />
                            ) : (
                                <Text
                                    style={[
                                        styles.actionText,
                                        {color: theme.trueWhite},
                                    ]}>
                                    {t('修改')}
                                </Text>
                            )}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalPage: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: scale(16),
        paddingBottom: verticalScale(28),
    },
    backdrop: {
        opacity: 0.55,
    },
    sheet: {
        width: '100%',
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(16),
        paddingHorizontal: scale(18),
        paddingTop: verticalScale(14),
        paddingBottom: verticalScale(16),
    },
    header: {
        minHeight: verticalScale(42),
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(17),
        fontWeight: '700',
    },
    closeButton: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(17),
        alignItems: 'center',
        justifyContent: 'center',
    },
    hint: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
        marginTop: verticalScale(4),
        marginBottom: verticalScale(12),
    },
    inputRow: {
        minHeight: verticalScale(46),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(12),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(12),
    },
    atSign: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
    },
    input: {
        ...uiStyle.defaultText,
        flex: 1,
        minHeight: verticalScale(44),
        fontSize: scale(13),
        paddingHorizontal: scale(4),
        paddingVertical: verticalScale(9),
    },
    validationRow: {
        minHeight: verticalScale(30),
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(5),
        paddingHorizontal: scale(2),
        paddingTop: verticalScale(7),
    },
    validationText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(10),
        lineHeight: verticalScale(14),
    },
    actions: {
        flexDirection: 'row',
        gap: scale(10),
        marginTop: verticalScale(14),
    },
    actionButton: {
        flex: 1,
        minHeight: verticalScale(44),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(12),
    },
    actionText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
});

export default HarborUsernameEditorModal;
