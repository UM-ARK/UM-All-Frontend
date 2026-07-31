import React, {useMemo} from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import {Image} from 'expo-image';
import {
    KeyboardAwareScrollView,
    KeyboardToolbar,
} from 'react-native-keyboard-controller';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import {useTheme} from '../../../../components/ThemeContext';
import SimpleProgressBar from '../../../../components/SimpleProgressBar';
import HarborCategoryIcon from '../components/HarborCategoryIcon';
import HarborCategoryPickerSheet from './HarborCategoryPickerSheet';
import HarborTagPickerSheet from './HarborTagPickerSheet';
import {MAX_IMAGES_PER_POST} from './harborComposerImages';

const HarborComposerForm = ({
    categorySheetRef,
    composer,
    imagesState,
    onOpenCategorySheet,
    onOpenMarkdownGuide,
    onOpenTagSheet,
    onOpenWebComposer,
    onPressContext,
    onPressDelete,
    onSelectCategory,
    route,
    submit,
    tagSheetRef,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const {
        categories,
        categoryId,
        composerSettings,
        editMetadata,
        isEdit,
        isEditingFirstPost,
        isNewTopic,
        isReply,
        isTagCountValid,
        maximumPostLength,
        maximumTagCount,
        maximumTitleLength,
        raw,
        routePostNumber,
        selectedCategory,
        selectedTagNames,
        selectedTags,
        setRaw,
        setSelectedTags,
        setTitle,
        supportsImages,
        tags,
        title,
        titleLength,
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
        isDeleting,
        isSubmitDisabled,
        isSubmitting,
        rawLength,
        submitError,
    } = submit;
    // iOS 26 液態玻璃透明導覽列：內容需手動避開 header，避免被 Title 遮擋
    const scrollContentStyle = useMemo(
        () => [
            styles.scrollContent,
            isLiquidGlassSupported
                ? {paddingTop: headerHeight + scale(16)}
                : null,
        ],
        [headerHeight],
    );

    return (
        <View
            style={[
                styles.container,
                {backgroundColor: theme.bg_color},
            ]}>
            <KeyboardAwareScrollView
                bottomOffset={verticalScale(72)}
                contentContainerStyle={scrollContentStyle}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? {top: headerHeight} : undefined
                }>
                {!isNewTopic ? (
                    <Pressable
                        accessibilityLabel={t('查看原帖')}
                        accessibilityRole="button"
                        onPress={onPressContext}
                        style={({pressed}) => [
                            styles.contextCard,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary15
                                    : theme.tonal.primary08,
                                borderColor: theme.themeColorUltraLight,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name={isEdit ? 'pencil-outline' : 'reply-outline'}
                            size={scale(21)}
                            color={theme.themeColor}
                        />
                        <View style={styles.contextTextContainer}>
                            <Text
                                style={[
                                    styles.contextTitle,
                                    {color: theme.black.main},
                                ]}
                                numberOfLines={2}>
                                {route.params?.topicTitle ||
                                    t('Harbor 話題')}
                            </Text>
                            <Text
                                style={[
                                    styles.secondaryText,
                                    {color: theme.black.third},
                                ]}>
                                {isEdit
                                    ? t('正在編輯第 {{count}} 樓', {
                                        count:
                                            editMetadata.postNumber ??
                                            editMetadata.post_number ??
                                            routePostNumber,
                                    })
                                    : route.params?.replyToPostNumber
                                        ? t('回覆第 {{count}} 樓', {
                                            count:
                                                route.params
                                                    .replyToPostNumber,
                                        })
                                        : t('回覆這個話題')}
                            </Text>
                        </View>
                        <MaterialCommunityIcons
                            name="chevron-right"
                            size={scale(20)}
                            color={theme.black.third}
                        />
                    </Pressable>
                ) : null}

                {isNewTopic || isEditingFirstPost ? (
                    <View style={styles.fieldGroup}>
                        <View style={styles.bodyLabelRow}>
                            <Text
                                style={[
                                    styles.fieldLabel,
                                    {color: theme.black.second},
                                ]}>
                                {t('標題')}
                            </Text>
                            {maximumTitleLength != null &&
                            titleLength > maximumTitleLength ? (
                                <Text
                                    style={[
                                        styles.requirementCounter,
                                        {color: theme.unread},
                                    ]}>
                                    {`${titleLength}/${maximumTitleLength}`}
                                </Text>
                            ) : null}
                        </View>
                        <TextInput
                            accessibilityLabel={t('話題標題')}
                            autoCapitalize="sentences"
                            onChangeText={setTitle}
                            placeholder={t('說點什麼或提個問題')}
                            placeholderTextColor={theme.black.third}
                            style={[
                                styles.singleLineInput,
                                {
                                    backgroundColor: theme.white,
                                    borderColor: theme.themeColorUltraLight,
                                    color: theme.black.main,
                                },
                            ]}
                            value={title}
                        />
                    </View>
                ) : null}

                {isNewTopic ? (
                    <>
                        <View style={styles.fieldGroup}>
                            <Text
                                style={[
                                    styles.fieldLabel,
                                    {color: theme.black.second},
                                ]}>
                                {t('分類')}
                            </Text>
                            <Pressable
                                accessibilityRole="button"
                                onPress={onOpenCategorySheet}
                                style={({pressed}) => [
                                    styles.selectorButton,
                                    {
                                        backgroundColor: pressed
                                            ? theme.tonal.primary08
                                            : theme.white,
                                        borderColor:
                                            theme.themeColorUltraLight,
                                    },
                                ]}>
                                {selectedCategory ? (
                                    <HarborCategoryIcon
                                        category={selectedCategory}
                                        color={theme.themeColor}
                                        size={scale(18)}
                                        style={styles.selectorCategoryIcon}
                                    />
                                ) : null}
                                <Text
                                    style={[
                                        styles.selectorText,
                                        {
                                            color: selectedCategory
                                                ? theme.black.main
                                                : theme.black.third,
                                        },
                                    ]}>
                                    {selectedCategory?.name ||
                                        t('選擇分類')}
                                </Text>
                                <MaterialCommunityIcons
                                    name="chevron-down"
                                    size={scale(20)}
                                    color={theme.black.third}
                                />
                            </Pressable>
                        </View>

                        <View style={styles.fieldGroup}>
                            <View style={styles.bodyLabelRow}>
                                <Text
                                    style={[
                                        styles.fieldLabel,
                                        {color: theme.black.second},
                                    ]}>
                                    {t('標籤')}
                                </Text>
                                {composerSettings ? (
                                    <Text
                                        style={[
                                            styles.requirementCounter,
                                            {
                                                color: isTagCountValid
                                                    ? theme.success
                                                    : theme.unread,
                                            },
                                        ]}>
                                        {`${selectedTags.length}/${maximumTagCount ?? '—'}`}
                                    </Text>
                                ) : null}
                            </View>
                            <Pressable
                                accessibilityRole="button"
                                onPress={onOpenTagSheet}
                                style={({pressed}) => [
                                    styles.selectorButton,
                                    {
                                        backgroundColor: pressed
                                            ? theme.tonal.primary08
                                            : theme.white,
                                        borderColor:
                                            theme.themeColorUltraLight,
                                    },
                                ]}>
                                <Text
                                    numberOfLines={2}
                                    style={[
                                        styles.selectorText,
                                        {
                                            color: selectedTagNames.length
                                                ? theme.black.main
                                                : theme.black.third,
                                        },
                                    ]}>
                                    {selectedTagNames.length
                                        ? selectedTagNames
                                            .map(name => `#${name}`)
                                            .join('  ')
                                        : t('選擇標籤（可多選）')}
                                </Text>
                                <MaterialCommunityIcons
                                    name="chevron-down"
                                    size={scale(20)}
                                    color={theme.black.third}
                                />
                            </Pressable>
                        </View>
                    </>
                ) : null}

                <View style={styles.fieldGroup}>
                    <View style={styles.bodyLabelRow}>
                        <View style={styles.fieldLabelRow}>
                            <Text
                                style={[
                                    styles.fieldLabel,
                                    {color: theme.black.second},
                                ]}>
                                {t('內容')}
                            </Text>
                            <Pressable
                                accessibilityLabel={t(
                                    '查看 Markdown 基本語法',
                                )}
                                accessibilityRole="link"
                                hitSlop={scale(6)}
                                onPress={onOpenMarkdownGuide}
                                style={({pressed}) => [
                                    styles.markdownHelpButton,
                                    pressed && {opacity: 0.7},
                                ]}>
                                <Text
                                    style={[
                                        styles.markdownHelpText,
                                        {color: theme.black.third},
                                    ]}>
                                    {t('支援 Markdown')}
                                </Text>
                                <MaterialCommunityIcons
                                    name="information-outline"
                                    size={scale(15)}
                                    color={theme.black.third}
                                />
                            </Pressable>
                        </View>
                        {maximumPostLength != null &&
                        (supportsImages
                            ? visibleTextLength
                            : rawLength) > maximumPostLength ? (
                            <Text
                                style={[
                                    styles.requirementCounter,
                                    {color: theme.unread},
                                ]}>
                                {`${supportsImages ? visibleTextLength : rawLength}/${maximumPostLength}`}
                            </Text>
                        ) : null}
                    </View>
                    <TextInput
                        accessibilityLabel={t('內容')}
                        autoCapitalize="sentences"
                        multiline
                        onChangeText={setRaw}
                        placeholder={t('分享你的想法…內容將自動儲存')}
                        placeholderTextColor={theme.black.third}
                        style={[
                            styles.bodyInput,
                            {
                                backgroundColor: theme.white,
                                borderColor: theme.themeColorUltraLight,
                                color: theme.black.main,
                            },
                        ]}
                        textAlignVertical="top"
                        value={raw}
                    />
                </View>

                {supportsImages ? (
                    <View style={styles.fieldGroup}>
                        <View style={styles.bodyLabelRow}>
                            <Text
                                style={[
                                    styles.fieldLabel,
                                    {color: theme.black.second},
                                ]}>
                                {t('圖片')}
                            </Text>
                            {images.length > 0 ? (
                                <Text
                                    style={[
                                        styles.requirementCounter,
                                        {color: theme.black.third},
                                    ]}>
                                    {`${images.length}/${MAX_IMAGES_PER_POST}`}
                                </Text>
                            ) : null}
                        </View>
                        {images.length > 0 ? (
                            <View style={styles.imageList}>
                                {images.map(image => (
                                    <View
                                        key={image.id}
                                        style={[
                                            styles.imageCard,
                                            {
                                                backgroundColor: theme.white,
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
                                            style={styles.imageThumbnail}
                                        />
                                        <View style={styles.imageDetails}>
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    styles.imageStatus,
                                                    {
                                                        color:
                                                            image.status ===
                                                            'failed'
                                                                ? theme.unread
                                                                : theme.black
                                                                    .second,
                                                    },
                                                ]}>
                                                {image.status === 'uploaded'
                                                    ? t('已上傳')
                                                    : image.status === 'failed'
                                                        ? image.error
                                                        : image.status ===
                                                            'pending'
                                                            ? t('等待上傳…')
                                                            : image.status ===
                                                                'uploading'
                                                                ? t('正在上傳…')
                                                                : t(
                                                                    '已準備好上傳',
                                                                )}
                                            </Text>
                                            {image.status === 'uploading' ? (
                                                <SimpleProgressBar
                                                    height={verticalScale(4)}
                                                    progress={image.progress}
                                                    width="100%"
                                                />
                                            ) : null}
                                            {image.status === 'failed' ? (
                                                <Pressable
                                                    accessibilityRole="button"
                                                    onPress={() =>
                                                        handleRetryImage(image)
                                                    }
                                                    style={({pressed}) => [
                                                        styles.imageRetryButton,
                                                        {
                                                            backgroundColor:
                                                                pressed
                                                                    ? theme.tonal
                                                                        .primary30
                                                                    : theme.tonal
                                                                        .primary15,
                                                        },
                                                    ]}>
                                                    <Text
                                                        style={[
                                                            styles.imageRetryText,
                                                            {
                                                                color:
                                                                    theme
                                                                        .themeColor,
                                                            },
                                                        ]}>
                                                        {t('重試')}
                                                    </Text>
                                                </Pressable>
                                            ) : null}
                                        </View>
                                        <Pressable
                                            accessibilityLabel={t('移除圖片')}
                                            accessibilityRole="button"
                                            hitSlop={scale(8)}
                                            onPress={() =>
                                                handleRemoveImage(image.id)
                                            }
                                            style={({pressed}) => [
                                                styles.imageRemoveButton,
                                                pressed && {
                                                    backgroundColor:
                                                        theme.tonal.unread15,
                                                },
                                            ]}>
                                            <MaterialCommunityIcons
                                                name="close"
                                                size={scale(19)}
                                                color={theme.unread}
                                            />
                                        </Pressable>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                        <Pressable
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
                            onPress={handleAddImages}
                            style={({pressed}) => [
                                styles.addImageButton,
                                {
                                    backgroundColor: pressed
                                        ? theme.tonal.primary15
                                        : isPreparingImages ||
                                            isUploadingImages ||
                                            hasReachedImageLimit
                                            ? theme.disabled
                                            : theme.white,
                                    borderColor:
                                        theme.themeColorUltraLight,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="image-plus-outline"
                                size={scale(21)}
                                color={theme.themeColor}
                            />
                            <Text
                                style={[
                                    styles.addImageText,
                                    {color: theme.themeColor},
                                ]}>
                                {isPreparingImages
                                    ? t('正在處理圖片…')
                                    : hasReachedImageLimit
                                        ? t('已達 6 張上限')
                                        : t('新增圖片')}
                            </Text>
                        </Pressable>
                        {isNewTopic ? (
                            <Pressable
                                accessibilityRole="link"
                                onPress={onOpenWebComposer}
                                style={({pressed}) => [
                                    styles.webComposerButton,
                                    pressed && {
                                        backgroundColor:
                                            theme.tonal.primary08,
                                    },
                                ]}>
                                <MaterialCommunityIcons
                                    name="open-in-new"
                                    size={scale(17)}
                                    color={theme.black.third}
                                />
                                <Text
                                    style={[
                                        styles.webComposerText,
                                        {color: theme.black.third},
                                    ]}>
                                    {t('需要進階排版？前往 Harbor 網頁版')}
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>
                ) : null}

                {submitError ? (
                    <View
                        style={[
                            styles.inlineError,
                            {
                                backgroundColor: theme.tonal.unread15,
                                borderColor: theme.unread,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="alert-circle-outline"
                            size={scale(20)}
                            color={theme.unread}
                        />
                        <Text
                            style={[
                                styles.inlineErrorText,
                                {color: theme.unread},
                            ]}>
                            {submitError}
                        </Text>
                    </View>
                ) : null}

                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{
                        disabled: isSubmitDisabled,
                    }}
                    disabled={isSubmitDisabled}
                    onPress={handleSubmit}
                    style={({pressed}) => [
                        styles.submitButton,
                        {
                            backgroundColor:
                                isSubmitDisabled
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
                            name={isEdit ? 'content-save-outline' : 'send'}
                            size={scale(20)}
                            color={theme.trueWhite}
                        />
                    )}
                    <Text
                        style={[
                            styles.submitButtonText,
                            {color: theme.trueWhite},
                        ]}>
                        {isUploadingImages
                            ? t('正在上傳圖片…')
                            : isSubmitting
                                ? t('正在提交…')
                                : isPreparingImages
                                    ? t('正在處理圖片…')
                                    : isEdit
                                        ? t('儲存修改')
                                        : isReply
                                            ? t('發布回覆')
                                            : t('發佈')}
                    </Text>
                </Pressable>
                {isEdit && editMetadata.canDelete ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{
                            disabled: isDeleting || isSubmitting,
                        }}
                        disabled={isDeleting || isSubmitting}
                        onPress={onPressDelete}
                        style={({pressed}) => [
                            styles.deleteButton,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.unread15
                                    : theme.white,
                                borderColor: theme.unread,
                                opacity:
                                    isDeleting || isSubmitting ? 0.5 : 1,
                            },
                        ]}>
                        {isDeleting ? (
                            <ActivityIndicator
                                size="small"
                                color={theme.unread}
                            />
                        ) : (
                            <MaterialCommunityIcons
                                name="delete-outline"
                                size={scale(20)}
                                color={theme.unread}
                            />
                        )}
                        <Text
                            style={[
                                styles.deleteButtonText,
                                {color: theme.unread},
                            ]}>
                            {isDeleting
                                ? t('正在刪除…')
                                : isEditingFirstPost
                                    ? t('刪除話題')
                                    : t('刪除帖子')}
                        </Text>
                    </Pressable>
                ) : null}
            </KeyboardAwareScrollView>

            <KeyboardToolbar />

            <HarborCategoryPickerSheet
                ref={categorySheetRef}
                categories={categories}
                onSelect={onSelectCategory}
                selectedCategoryId={categoryId}
            />

            <HarborTagPickerSheet
                ref={tagSheetRef}
                maximumTagCount={maximumTagCount}
                onChange={setSelectedTags}
                selectedTags={selectedTags}
                tags={tags}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    addImageButton: {
        alignItems: 'center',
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        gap: scale(8),
        justifyContent: 'center',
        minHeight: verticalScale(46),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(10),
    },
    deleteButton: {
        alignItems: 'center',
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        gap: scale(8),
        justifyContent: 'center',
        marginTop: verticalScale(10),
        paddingVertical: verticalScale(12),
    },
    deleteButtonText: {
        fontSize: scale(14),
        fontWeight: '700',
    },
    addImageText: {
        fontSize: scale(14),
        fontWeight: '600',
    },
    bodyInput: {
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        fontSize: scale(15),
        lineHeight: scale(22),
        minHeight: verticalScale(220),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(12),
    },
    bodyLabelRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    container: {
        flex: 1,
    },
    contextCard: {
        alignItems: 'center',
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        gap: scale(10),
        padding: scale(14),
    },
    contextTextContainer: {
        flex: 1,
        gap: verticalScale(3),
    },
    contextTitle: {
        fontSize: scale(14),
        fontWeight: '600',
    },
    fieldGroup: {
        gap: verticalScale(7),
    },
    fieldLabel: {
        fontSize: scale(13),
        fontWeight: '600',
    },
    fieldLabelRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: scale(8),
    },
    inlineError: {
        alignItems: 'flex-start',
        borderRadius: scale(10),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        gap: scale(8),
        padding: scale(12),
    },
    inlineErrorText: {
        flex: 1,
        fontSize: scale(12),
        lineHeight: scale(18),
        textAlign: 'center',
    },
    imageCard: {
        alignItems: 'center',
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        gap: scale(10),
        padding: scale(8),
    },
    imageDetails: {
        flex: 1,
        gap: verticalScale(7),
    },
    imageList: {
        gap: verticalScale(8),
    },
    imageRemoveButton: {
        alignItems: 'center',
        borderRadius: scale(16),
        height: scale(30),
        justifyContent: 'center',
        width: scale(30),
    },
    imageRetryButton: {
        alignSelf: 'flex-start',
        borderRadius: scale(7),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
    },
    imageRetryText: {
        fontSize: scale(12),
        fontWeight: '600',
    },
    imageStatus: {
        fontSize: scale(12),
        lineHeight: scale(17),
    },
    imageThumbnail: {
        borderRadius: scale(8),
        height: scale(62),
        width: scale(72),
    },
    markdownHelpButton: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: scale(3),
    },
    markdownHelpText: {
        fontSize: scale(11),
    },
    requirementCounter: {
        fontSize: scale(11),
        fontWeight: '600',
    },
    scrollContent: {
        gap: verticalScale(17),
        padding: scale(16),
        paddingBottom: verticalScale(36),
    },
    secondaryText: {
        fontSize: scale(12),
        lineHeight: scale(17),
    },
    selectorButton: {
        alignItems: 'center',
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        gap: scale(8),
        minHeight: verticalScale(48),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(10),
    },
    selectorCategoryIcon: {
        marginRight: scale(2),
    },
    selectorText: {
        flex: 1,
        fontSize: scale(14),
        lineHeight: scale(19),
    },
    singleLineInput: {
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        fontSize: scale(14),
        minHeight: verticalScale(48),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(10),
    },
    submitButton: {
        alignItems: 'center',
        borderRadius: scale(13),
        flexDirection: 'row',
        gap: scale(8),
        justifyContent: 'center',
        minHeight: verticalScale(50),
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(12),
    },
    submitButtonText: {
        fontSize: scale(15),
        fontWeight: '700',
    },
    webComposerButton: {
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: scale(8),
        flexDirection: 'row',
        gap: scale(6),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(7),
    },
    webComposerText: {
        fontSize: scale(12),
    },
});

export default HarborComposerForm;
