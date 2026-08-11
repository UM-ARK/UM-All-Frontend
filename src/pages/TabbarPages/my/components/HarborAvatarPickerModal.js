import React from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import {FlashList} from '@shopify/flash-list';
import Ionicons from "@react-native-vector-icons/ionicons";
import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';

const HarborAvatarPickerModal = ({
    avatars,
    canUpload,
    isLoading,
    isSubmitting,
    onClose,
    onConfirm,
    onSelect,
    onUpload,
    selectedAvatar,
    visible,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    React.useEffect(() => {
        if (visible && __DEV__) {
            console.log('[HarborProfile] avatar.modal.open', {
                count: avatars.length,
                canUpload,
                isLoading,
            });
        }
    }, [avatars.length, canUpload, isLoading, visible]);

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }
        trigger();
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            onRequestClose={handleClose}
            transparent
            visible={visible}>
            <View style={styles.modalPage}>
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        styles.backdrop,
                        {backgroundColor: theme.black.main},
                    ]}
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
                            style={[
                                styles.title,
                                {color: theme.black.main},
                            ]}>
                            {t('設定個人資料圖片')}
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

                    {isLoading ? (
                        <View style={styles.loadingState}>
                            <ActivityIndicator color={theme.themeColor} />
                            <Text
                                style={[
                                    styles.hint,
                                    {color: theme.black.third},
                                ]}>
                                {t('正在載入可選頭像…')}
                            </Text>
                        </View>
                    ) : (
                        <FlashList
                            contentContainerStyle={styles.avatarList}
                            data={avatars}
                            keyExtractor={item => item.value}
                            numColumns={4}
                            renderItem={({item}) => {
                                const selected =
                                    selectedAvatar?.type === 'selectable' &&
                                    selectedAvatar.value === item.value;
                                return (
                                    <Pressable
                                        accessibilityLabel={t('選擇這個頭像')}
                                        accessibilityRole="button"
                                        accessibilityState={{selected}}
                                        disabled={isSubmitting}
                                        onPress={() => {
                                            trigger();
                                            onSelect(item);
                                        }}
                                        style={({pressed}) => [
                                            styles.avatarCell,
                                            pressed && {opacity: 0.72},
                                        ]}>
                                        <Image
                                            contentFit="cover"
                                            onError={event => {
                                                if (__DEV__) {
                                                    console.warn(
                                                        '[HarborProfile] avatar.image.failed',
                                                        {
                                                            fileName:
                                                                item.url
                                                                    .split('/')
                                                                    .pop() || null,
                                                            message:
                                                                event?.error || null,
                                                        },
                                                    );
                                                }
                                            }}
                                            source={{uri: item.url}}
                                            style={[
                                                styles.avatar,
                                                selected && {
                                                    borderColor: theme.themeColor,
                                                },
                                                selected &&
                                                    styles.selectedAvatar,
                                            ]}
                                        />
                                        {selected ? (
                                            <View
                                                style={[
                                                    styles.selectedBadge,
                                                    {
                                                        backgroundColor:
                                                            theme.themeColor,
                                                    },
                                                ]}>
                                                <Ionicons
                                                    color={theme.trueWhite}
                                                    name="checkmark"
                                                    size={scale(13)}
                                                />
                                            </View>
                                        ) : null}
                                    </Pressable>
                                );
                            }}
                            showsVerticalScrollIndicator={false}
                            style={styles.avatarGrid}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text
                                        style={[
                                            styles.hint,
                                            {color: theme.black.third},
                                        ]}>
                                        {t('站點目前沒有提供可選頭像。')}
                                    </Text>
                                </View>
                            }
                        />
                    )}

                    <View
                        style={[
                            styles.footer,
                            {borderTopColor: theme.themeColorUltraLight},
                        ]}>
                        {canUpload ? (
                            <Pressable
                                accessibilityRole="button"
                                disabled={isSubmitting}
                                onPress={() => {
                                    trigger();
                                    onUpload();
                                }}
                                style={({pressed}) => [
                                    styles.uploadButton,
                                    {backgroundColor: theme.tonal.primary08},
                                    pressed && {opacity: 0.78},
                                ]}>
                                {selectedAvatar?.type === 'upload' ? (
                                    <Image
                                        contentFit="cover"
                                        source={{uri: selectedAvatar.url}}
                                        style={styles.uploadPreview}
                                    />
                                ) : (
                                    <Ionicons
                                        color={theme.themeColor}
                                        name="image-outline"
                                        size={scale(18)}
                                    />
                                )}
                                <Text
                                    style={[
                                        styles.uploadText,
                                        {color: theme.themeColor},
                                    ]}>
                                    {selectedAvatar?.type === 'upload'
                                        ? t('已選擇自訂頭像')
                                        : t('從相簿上傳自訂頭像')}
                                </Text>
                            </Pressable>
                        ) : null}
                        <View style={styles.actionRow}>
                            <Pressable
                                accessibilityRole="button"
                                disabled={isSubmitting}
                                onPress={handleClose}
                                style={({pressed}) => [
                                    styles.actionButton,
                                    {
                                        backgroundColor:
                                            theme.tonal.primary08,
                                    },
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
                                disabled={
                                    !selectedAvatar ||
                                    isLoading ||
                                    isSubmitting
                                }
                                onPress={() => {
                                    trigger();
                                    onConfirm();
                                }}
                                style={({pressed}) => [
                                    styles.actionButton,
                                    {
                                        backgroundColor:
                                            selectedAvatar && !isLoading
                                                ? theme.themeColor
                                                : theme.disabled,
                                    },
                                    pressed && {opacity: 0.78},
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
                                        {t('確定')}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalPage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(18),
    },
    backdrop: {
        opacity: 0.55,
    },
    sheet: {
        width: '100%',
        maxHeight: '78%',
        minHeight: verticalScale(360),
        borderRadius: scale(18),
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    header: {
        minHeight: verticalScale(54),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(16),
    },
    title: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(16),
        fontWeight: '750',
    },
    closeButton: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(17),
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarList: {
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(8),
    },
    avatarGrid: {
        flex: 1,
    },
    avatarCell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(5),
        paddingVertical: verticalScale(7),
    },
    avatar: {
        width: scale(62),
        height: scale(62),
        borderRadius: scale(31),
    },
    selectedAvatar: {
        borderWidth: scale(3),
    },
    selectedBadge: {
        position: 'absolute',
        right: scale(6),
        bottom: verticalScale(5),
        width: scale(20),
        height: scale(20),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: verticalScale(10),
    },
    emptyState: {
        minHeight: verticalScale(220),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(20),
    },
    hint: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        textAlign: 'center',
    },
    footer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: verticalScale(10),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(12),
    },
    uploadButton: {
        minHeight: verticalScale(42),
        borderRadius: scale(12),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
    },
    uploadText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
    },
    uploadPreview: {
        width: scale(28),
        height: scale(28),
        borderRadius: scale(14),
    },
    actionRow: {
        flexDirection: 'row',
        gap: scale(10),
    },
    actionButton: {
        flex: 1,
        minHeight: verticalScale(40),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
    },
});

export default HarborAvatarPickerModal;
