import React, {useCallback, useRef} from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import {KeyboardStickyView} from 'react-native-keyboard-controller';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';

import Text from '../../../../components/AppText';
import TextInput from '../../../../components/AppTextInput';
import {useTheme} from '../../../../components/ThemeContext';
import HarborComposerImageGrid from './HarborComposerImageGrid';
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
    const inputRef = useRef(null);
    const {
        maximumPostLength,
        raw,
        setRaw,
        visibleTextLength,
    } = composer;
    const {
        handleAddImages,
        handleMoveImage,
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
                        {backgroundColor: theme.white},
                    ]}>
                    <TextInput
                        ref={inputRef}
                        accessibilityLabel={replyTarget}
                        autoCapitalize="sentences"
                        autoFocus
                        multiline
                        onChangeText={setRaw}
                        placeholder={replyTarget}
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
                        <ScrollView
                            contentContainerStyle={styles.imageGridContent}
                            nestedScrollEnabled
                            showsVerticalScrollIndicator={false}
                            style={styles.imageGrid}>
                            <HarborComposerImageGrid
                                handleMoveImage={handleMoveImage}
                                handleRemoveImage={handleRemoveImage}
                                handleRetryImage={handleRetryImage}
                                images={images}
                            />
                        </ScrollView>
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
                                    size={scale(22)}
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
                                    size={scale(14)}
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
                                        : t('發布')}
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
    counter: {
        fontSize: scale(10),
        marginLeft: scale(8),
    },
    imageButton: {
        alignItems: 'center',
        borderRadius: scale(10),
        flexDirection: 'row',
        minHeight: scale(32),
        paddingHorizontal: scale(6),
    },
    imageCount: {
        fontSize: scale(10),
        fontWeight: '600',
        marginLeft: scale(4),
    },
    imageGrid: {
        marginTop: verticalScale(9),
        maxHeight: verticalScale(210),
    },
    imageGridContent: {
        paddingVertical: scale(1),
    },
    input: {
        borderRadius: scale(12),
        fontSize: scale(15),
        lineHeight: scale(21),
        maxHeight: verticalScale(118),
        minHeight: verticalScale(64),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(8),
    },
    page: {
        flex: 1,
    },
    sendButton: {
        alignItems: 'center',
        borderRadius: scale(14),
        flexDirection: 'row',
        gap: scale(4),
        justifyContent: 'center',
        marginLeft: 'auto',
        minHeight: scale(30),
        paddingHorizontal: scale(10),
    },
    sendText: {
        fontSize: scale(11),
        fontWeight: '700',
    },
    sheet: {
        borderTopLeftRadius: scale(18),
        borderTopRightRadius: scale(18),
        paddingBottom: verticalScale(4),
        paddingHorizontal: scale(10),
        paddingTop: verticalScale(4),
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
        marginTop: verticalScale(4),
        minHeight: scale(32),
    },
});

export default HarborReplyComposerForm;
