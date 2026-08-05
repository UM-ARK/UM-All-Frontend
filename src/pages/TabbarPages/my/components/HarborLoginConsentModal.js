import React from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {useTranslation} from 'react-i18next';
import Ionicons from "@react-native-vector-icons/ionicons";
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {openLink} from '../../../../utils/browser';
import {ARK_HARBOR, USER_AGREE} from '../../../../utils/pathMap';
import {trigger} from '../../../../utils/trigger';

const GUIDELINES_URL = `${ARK_HARBOR}/guidelines`;

const HarborLoginConsentModal = ({visible, onCancel, onConfirm}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const [agreed, setAgreed] = React.useState(false);

    React.useEffect(() => {
        if (visible) {
            setAgreed(false);
        }
    }, [visible]);

    const handleCancel = () => {
        trigger();
        onCancel();
    };

    const handleConfirm = () => {
        if (!agreed) {
            return;
        }
        trigger();
        onConfirm();
    };

    const openDocument = url => {
        trigger();
        openLink({URL: url});
    };

    const links = [
        {
            key: 'guidelines',
            label: t('論壇守則'),
            icon: 'document-text-outline',
            url: GUIDELINES_URL,
        },
        {
            key: 'agreement',
            label: t('用戶協議'),
            icon: 'shield-checkmark-outline',
            url: USER_AGREE,
        },
    ];

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleCancel}>
            <View style={styles.backdrop}>
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        styles.backdropDim,
                        {backgroundColor: theme.trueBlack},
                    ]}
                />
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('取消')}
                    onPress={handleCancel}
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
                    <Text
                        style={[styles.title, {color: theme.black.main}]}>
                        {t('登入前請先閱讀並同意')}
                    </Text>

                    <View style={styles.linkList}>
                        {links.map(link => (
                            <Pressable
                                key={link.key}
                                accessibilityRole="link"
                                accessibilityLabel={link.label}
                                style={({pressed}) => [
                                    styles.linkRow,
                                    {
                                        backgroundColor: pressed
                                            ? theme.tonal.primary15
                                            : theme.tonal.primary08,
                                        borderColor:
                                            theme.themeColorUltraLight,
                                    },
                                ]}
                                onPress={() => openDocument(link.url)}>
                                <View
                                    style={[
                                        styles.linkIcon,
                                        {
                                            backgroundColor:
                                                theme.tonal.primary15,
                                        },
                                    ]}>
                                    <Ionicons
                                        name={link.icon}
                                        size={scale(18)}
                                        color={theme.themeColor}
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.linkLabel,
                                        {color: theme.black.main},
                                    ]}>
                                    {link.label}
                                </Text>
                                <Ionicons
                                    name="open-outline"
                                    size={scale(16)}
                                    color={theme.black.third}
                                />
                            </Pressable>
                        ))}
                    </View>

                    <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{checked: agreed}}
                        style={({pressed}) => [
                            styles.checkboxRow,
                            pressed && {opacity: 0.75},
                        ]}
                        onPress={() => {
                            trigger();
                            setAgreed(current => !current);
                        }}>
                        <Ionicons
                            name={
                                agreed
                                    ? 'checkbox'
                                    : 'square-outline'
                            }
                            size={scale(22)}
                            color={
                                agreed
                                    ? theme.themeColor
                                    : theme.black.third
                            }
                        />
                        <Text
                            style={[
                                styles.checkboxLabel,
                                {color: theme.black.main},
                            ]}>
                            {t('我已閱讀並同意論壇守則與用戶協議')}
                        </Text>
                    </Pressable>

                    <View style={styles.actions}>
                        <Pressable
                            accessibilityRole="button"
                            style={({pressed}) => [
                                styles.secondaryButton,
                                {
                                    backgroundColor: pressed
                                        ? theme.tonal.primary30
                                        : theme.tonal.primary15,
                                },
                            ]}
                            onPress={handleCancel}>
                            <Text
                                style={[
                                    styles.secondaryButtonText,
                                    {color: theme.themeColor},
                                ]}>
                                {t('取消')}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{disabled: !agreed}}
                            disabled={!agreed}
                            style={({pressed}) => [
                                styles.primaryButton,
                                {
                                    backgroundColor: agreed
                                        ? theme.themeColor
                                        : theme.tonal.primary30,
                                },
                                pressed &&
                                    agreed && {opacity: 0.85},
                            ]}
                            onPress={handleConfirm}>
                            <Text
                                style={[
                                    styles.primaryButtonText,
                                    {
                                        color: agreed
                                            ? theme.trueWhite
                                            : theme.black.third,
                                    },
                                ]}>
                                {t('繼續登入')}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        padding: scale(16),
        paddingBottom: verticalScale(28),
    },
    backdropDim: {
        opacity: 0.55,
    },
    sheet: {
        width: '100%',
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(16),
        paddingHorizontal: scale(18),
        paddingTop: verticalScale(20),
        paddingBottom: verticalScale(16),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(17),
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: verticalScale(16),
    },
    linkList: {
        gap: verticalScale(8),
        marginBottom: verticalScale(14),
    },
    linkRow: {
        minHeight: verticalScale(48),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(10),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
    },
    linkIcon: {
        width: scale(32),
        height: scale(32),
        borderRadius: scale(8),
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkLabel: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(14),
        fontWeight: '650',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(10),
        marginBottom: verticalScale(16),
        paddingVertical: verticalScale(2),
    },
    checkboxLabel: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(13),
        lineHeight: verticalScale(19),
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        gap: scale(10),
    },
    secondaryButton: {
        flex: 1,
        minHeight: verticalScale(44),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(12),
    },
    secondaryButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '650',
    },
    primaryButton: {
        flex: 1.2,
        minHeight: verticalScale(44),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(12),
    },
    primaryButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
});

export default HarborLoginConsentModal;
