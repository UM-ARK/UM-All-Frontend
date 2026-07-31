import React, {useCallback, useRef} from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {Image} from 'expo-image';
import {KeyboardStickyView} from 'react-native-keyboard-controller';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';

import {useTheme} from '../../../../components/ThemeContext';
import {MAX_IMAGES_PER_POST} from './harborComposerImages';

export const HarborReplyComposerState = ({
    actionLabel,
    description,
    icon,
    isLoading,
    onAction,
    onClose,
    title,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.page}>
            <Pressable
                accessibilityLabel={t('取消')}
                accessibilityRole="button"
                onPress={onClose}
                style={[
                    StyleSheet.absoluteFill,
                    styles.backdrop,
                    {backgroundColor: theme.trueBlack},
                ]}
            />
            <View
                style={[
                    styles.stateSheet,
                    {
                        backgroundColor: theme.white,
                        paddingBottom: Math.max(
                            insets.bottom,
                            verticalScale(16),
                        ),
                    },
                ]}>
                {isLoading ? (
                    <ActivityIndicator
                        size="small"
                        color={theme.themeColor}
                    />
                ) : (
                    <MaterialCommunityIcons
                        name={icon}
                        size={scale(28)}
                        color={theme.themeColor}
                    />
                )}
                {title ? (
                    <Text
                        style={[
                            styles.stateTitle,
                            {color: theme.black.main},
                        ]}>
                        {title}
                    </Text>
                ) : null}
                <Text
                    style={[
                        styles.stateDescription,
                        {color: theme.black.third},
                    ]}>
                    {description}
                </Text>
                {onAction ? (
                    <Pressable
                        accessibilityRole="button"
                        onPress={onAction}
                        style={({pressed}) => [
                            styles.stateAction,
                            {
                                backgroundColor: pressed
                                    ? theme.themeColorLight
                                    : theme.themeColor,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.stateActionText,
                                {color: theme.trueWhite},
                            ]}>
                            {actionLabel}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        </View>
    );
};

const HarborReplyComposerForm = ({
    composer,
    imagesState,
    onClose,
    route,
    submit,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const insets = useSafeAreaInsets();
    const inputRef = useRef(null);
    const {
        maximumPostLength,
        raw,
        setRaw,
        visibleTextLength,
    } = composer;
    const {
        handleAddImages,
        handleRemoveImage,
        handleRetryImage,
        hasReachedImageLimit,
        images,
        isPreparingImages,
        isUploadingImages,
    } = imagesState;
    const {
        handleSubmit,
        isPostLengthValid,
        isSubmitDisabled,
        isSubmitting,
        submitError,
    } = submit;
    const replyToUsername = String(
        route.params?.replyToUsername || '',
    ).trim();
    const replyTarget = replyToUsername
        ? `${t('回覆')} @${replyToUsername}`
        : t('回覆這個話題');
    const sendDisabled = isSubmitDisabled || !isPostLengthValid;

    const addImages = useCallback(async () => {
        await handleAddImages();
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [handleAddImages]);

    return (
        <View style={styles.page}>
            <Pressable
                accessibilityLabel={t('取消')}
                accessibilityRole="button"
                onPress={onClose}
                style={[
                    StyleSheet.absoluteFill,
                    styles.backdrop,
                    {backgroundColor: theme.trueBlack},
                ]}
            />
            <KeyboardStickyView style={styles.stickyView}>
                <View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: theme.white,
                            paddingBottom: Math.max(
                                insets.bottom,
                                verticalScale(10),
                            ),
                        },
                    ]}>
                    <View style={styles.headerRow}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.replyTarget,
                                {color: theme.black.second},
                            ]}>
                            {replyTarget}
                        </Text>
                        <Pressable
                            accessibilityLabel={t('取消')}
                            accessibilityRole="button"
                            hitSlop={scale(8)}
                            onPress={onClose}
                            style={({pressed}) => [
                                styles.closeButton,
                                pressed && {
                                    backgroundColor: theme.tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="close"
                                size={scale(20)}
                                color={theme.black.third}
                            />
                        </Pressable>
                    </View>

                    <TextInput
                        ref={inputRef}
                        accessibilityLabel={replyTarget}
                        autoCapitalize="sentences"
                        autoFocus
                        multiline
                        onChangeText={setRaw}
                        placeholder={t(
                            '分享你的想法…內容將自動儲存',
                        )}
                        placeholderTextColor={theme.black.third}
                        scrollEnabled
                        style={[
                            styles.input,
                            {
                                backgroundColor: theme.bg_color,
                                color: theme.black.main,
                            },
                        ]}
                        textAlignVertical="top"
                        value={raw}
                    />

                    {images.length > 0 ? (
                        <View style={styles.imageRow}>
                            {images.map(image => (
                                <View
                                    key={image.id}
                                    style={[
                                        styles.imageContainer,
                                        {
                                            backgroundColor:
                                                theme.tonal.primary08,
                                            borderColor:
                                                image.status === 'failed'
                                                    ? theme.unread
                                                    : theme
                                                        .themeColorUltraLight,
                                        },
                                    ]}>
                                    <Image
                                        contentFit="cover"
                                        source={{uri: image.localUri}}
                                        style={styles.image}
                                    />
                                    {image.status === 'pending' ||
                                    image.status === 'uploading' ||
                                    image.status === 'failed' ? (
                                        <Pressable
                                            accessibilityLabel={
                                                image.status === 'failed'
                                                    ? t('重試')
                                                    : undefined
                                            }
                                            accessibilityRole={
                                                image.status === 'failed'
                                                    ? 'button'
                                                    : undefined
                                            }
                                            disabled={
                                                image.status !== 'failed'
                                            }
                                            onPress={() =>
                                                handleRetryImage(image)
                                            }
                                            style={[
                                                StyleSheet.absoluteFill,
                                                styles.imageStatus,
                                                {
                                                    backgroundColor:
                                                        theme.trueBlack,
                                                },
                                            ]}>
                                            {image.status === 'failed' ? (
                                                <MaterialCommunityIcons
                                                    name="reload"
                                                    size={scale(19)}
                                                    color={theme.trueWhite}
                                                />
                                            ) : (
                                                <ActivityIndicator
                                                    size="small"
                                                    color={theme.trueWhite}
                                                />
                                            )}
                                        </Pressable>
                                    ) : null}
                                    <Pressable
                                        accessibilityLabel={t('移除圖片')}
                                        accessibilityRole="button"
                                        hitSlop={scale(5)}
                                        onPress={() =>
                                            handleRemoveImage(image.id)
                                        }
                                        style={[
                                            styles.removeImageButton,
                                            {
                                                backgroundColor:
                                                    theme.trueBlack,
                                            },
                                        ]}>
                                        <MaterialCommunityIcons
                                            name="close"
                                            size={scale(13)}
                                            color={theme.trueWhite}
                                        />
                                    </Pressable>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    {submitError ? (
                        <Text
                            style={[
                                styles.submitError,
                                {color: theme.unread},
                            ]}>
                            {submitError}
                        </Text>
                    ) : null}

                    <View style={styles.toolbar}>
                        <Pressable
                            accessibilityLabel={t('新增圖片')}
                            accessibilityRole="button"
                            accessibilityState={{
                                disabled:
                                    isPreparingImages ||
                                    isUploadingImages ||
                                    hasReachedImageLimit,
                            }}
                            disabled={
                                isPreparingImages ||
                                isUploadingImages ||
                                hasReachedImageLimit
                            }
                            onPress={addImages}
                            style={({pressed}) => [
                                styles.imageButton,
                                pressed && {
                                    backgroundColor:
                                        theme.tonal.primary15,
                                },
                            ]}>
                            {isPreparingImages ? (
                                <ActivityIndicator
                                    size="small"
                                    color={theme.themeColor}
                                />
                            ) : (
                                <MaterialCommunityIcons
                                    name="image-outline"
                                    size={scale(24)}
                                    color={
                                        hasReachedImageLimit
                                            ? theme.disabled
                                            : theme.themeColor
                                    }
                                />
                            )}
                            {images.length > 0 ? (
                                <Text
                                    style={[
                                        styles.imageCount,
                                        {color: theme.themeColor},
                                    ]}>
                                    {`${images.length}/${MAX_IMAGES_PER_POST}`}
                                </Text>
                            ) : null}
                        </Pressable>
                        {maximumPostLength != null &&
                        visibleTextLength > maximumPostLength ? (
                            <Text
                                style={[
                                    styles.counter,
                                    {color: theme.unread},
                                ]}>
                                {`${visibleTextLength}/${maximumPostLength}`}
                            </Text>
                        ) : null}
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{disabled: sendDisabled}}
                            disabled={sendDisabled}
                            onPress={handleSubmit}
                            style={({pressed}) => [
                                styles.sendButton,
                                {
                                    backgroundColor: sendDisabled
                                        ? theme.disabled
                                        : pressed
                                            ? theme.themeColorLight
                                            : theme.themeColor,
                                },
                            ]}>
                            {isSubmitting ? (
                                <ActivityIndicator
                                    size="small"
                                    color={theme.trueWhite}
                                />
                            ) : (
                                <MaterialCommunityIcons
                                    name="send"
                                    size={scale(17)}
                                    color={theme.trueWhite}
                                />
                            )}
                            <Text
                                style={[
                                    styles.sendText,
                                    {color: theme.trueWhite},
                                ]}>
                                {isUploadingImages
                                    ? t('正在上傳圖片…')
                                    : isSubmitting
                                        ? t('正在提交…')
                                        : t('發布回覆')}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardStickyView>
        </View>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        opacity: 0.32,
    },
    closeButton: {
        alignItems: 'center',
        borderRadius: scale(16),
        height: scale(32),
        justifyContent: 'center',
        width: scale(32),
    },
    counter: {
        fontSize: scale(10),
        marginLeft: scale(8),
    },
    headerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(7),
    },
    image: {
        borderRadius: scale(9),
        height: '100%',
        width: '100%',
    },
    imageButton: {
        alignItems: 'center',
        borderRadius: scale(10),
        flexDirection: 'row',
        minHeight: scale(38),
        paddingHorizontal: scale(8),
    },
    imageContainer: {
        borderRadius: scale(9),
        borderWidth: StyleSheet.hairlineWidth,
        height: scale(46),
        overflow: 'visible',
        width: scale(46),
    },
    imageCount: {
        fontSize: scale(10),
        fontWeight: '600',
        marginLeft: scale(4),
    },
    imageRow: {
        flexDirection: 'row',
        gap: scale(7),
        marginTop: verticalScale(9),
    },
    imageStatus: {
        alignItems: 'center',
        borderRadius: scale(9),
        justifyContent: 'center',
        opacity: 0.58,
    },
    input: {
        borderRadius: scale(14),
        fontSize: scale(15),
        lineHeight: scale(21),
        maxHeight: verticalScale(118),
        minHeight: verticalScale(76),
        paddingHorizontal: scale(13),
        paddingVertical: verticalScale(10),
    },
    page: {
        flex: 1,
    },
    removeImageButton: {
        alignItems: 'center',
        borderRadius: scale(10),
        height: scale(20),
        justifyContent: 'center',
        position: 'absolute',
        right: scale(-6),
        top: scale(-6),
        width: scale(20),
    },
    replyTarget: {
        flex: 1,
        fontSize: scale(12),
        fontWeight: '600',
        marginLeft: scale(3),
    },
    sendButton: {
        alignItems: 'center',
        borderRadius: scale(18),
        flexDirection: 'row',
        gap: scale(5),
        justifyContent: 'center',
        marginLeft: 'auto',
        minHeight: scale(38),
        paddingHorizontal: scale(15),
    },
    sendText: {
        fontSize: scale(12),
        fontWeight: '700',
    },
    sheet: {
        borderTopLeftRadius: scale(22),
        borderTopRightRadius: scale(22),
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
    },
    stateAction: {
        alignItems: 'center',
        borderRadius: scale(18),
        marginTop: verticalScale(14),
        minHeight: scale(38),
        paddingHorizontal: scale(22),
        paddingVertical: verticalScale(9),
    },
    stateActionText: {
        fontSize: scale(13),
        fontWeight: '700',
    },
    stateDescription: {
        fontSize: scale(12),
        lineHeight: scale(18),
        marginTop: verticalScale(7),
        textAlign: 'center',
    },
    stateSheet: {
        alignItems: 'center',
        borderTopLeftRadius: scale(22),
        borderTopRightRadius: scale(22),
        bottom: 0,
        left: 0,
        paddingHorizontal: scale(28),
        paddingTop: verticalScale(22),
        position: 'absolute',
        right: 0,
    },
    stateTitle: {
        fontSize: scale(16),
        fontWeight: '700',
        marginTop: verticalScale(9),
        textAlign: 'center',
    },
    stickyView: {
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
    },
    submitError: {
        fontSize: scale(10),
        lineHeight: scale(14),
        marginTop: verticalScale(7),
        textAlign: 'center',
    },
    toolbar: {
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: verticalScale(8),
        minHeight: scale(40),
    },
});

export default HarborReplyComposerForm;
