import React, { useMemo } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHeaderHeight } from '@react-navigation/elements';
import {
    KeyboardAwareScrollView,
    KeyboardToolbar,
} from 'react-native-keyboard-controller';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../../components/AppText';
import TextInput from '../../../../components/AppTextInput';
import { useTheme } from '../../../../components/ThemeContext';
import HarborCategoryIcon from '../components/HarborCategoryIcon';
import HarborCategoryPickerSheet from './HarborCategoryPickerSheet';
import HarborComposerImageGrid from './HarborComposerImageGrid';
import HarborTagPickerSheet from './HarborTagPickerSheet';
import { MAX_IMAGES_PER_POST } from './harborComposerImages';

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
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const {
        categories,
        categoryId,
        composerSettings,
        editMetadata,
        isEdit,
        isEditingFirstPost,
        isNewTopic,
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
        handleMoveImage,
        handleRemoveImage,
        handleRetryImage,
        hasReachedImageLimit,
        images,
        isPreparingImages,
        isUploadingImages,
    } = imagesState;
    const {
        isDeleting,
        isSubmitting,
        rawLength,
        submitError,
    } = submit;
    // iOS 26 液態玻璃透明導覽列：內容需手動避開 header，避免被 Title 遮擋
    const scrollContentStyle = useMemo(
        () => [
            styles.scrollContent,
            isLiquidGlassSupported
                ? { paddingTop: headerHeight + scale(8) }
                : null,
        ],
        [headerHeight],
    );

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: theme.bg_color },
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
                    isLiquidGlassSupported ? { top: headerHeight } : undefined
                }>
                {!isNewTopic ? (
                    <Pressable
                        accessibilityLabel={t('查看原帖')}
                        accessibilityRole="button"
                        onPress={onPressContext}
                        style={({ pressed }) => [
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
                                    { color: theme.black.main },
                                ]}
                                numberOfLines={2}>
                                {route.params?.topicTitle ||
                                    t('Harbor 話題')}
                            </Text>
                            <Text
                                style={[
                                    styles.secondaryText,
                                    { color: theme.black.third },
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

                <View
                    style={[
                        styles.composerBlock,
                        {
                            backgroundColor: theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    {isNewTopic || isEditingFirstPost ? (
                        <View>
                            {maximumTitleLength != null &&
                                titleLength > maximumTitleLength ? (
                                <Text
                                    style={[
                                        styles.requirementCounter,
                                        styles.inlineCounter,
                                        { color: theme.unread },
                                    ]}>
                                    {`${titleLength}/${maximumTitleLength}`}
                                </Text>
                            ) : null}
                            <TextInput
                                accessibilityLabel={t('話題標題')}
                                autoCapitalize="sentences"
                                multiline
                                numberOfLines={3}
                                onChangeText={setTitle}
                                placeholder={t('新增標題')}
                                placeholderTextColor={theme.black.third}
                                style={[
                                    styles.titleInput,
                                    { color: theme.black.main },
                                ]}
                                textAlignVertical="top"
                                value={title}
                            />
                            <View
                                style={[
                                    styles.titleBodyDivider,
                                    {backgroundColor: theme.disabled},
                                ]}
                            />
                        </View>
                    ) : null}

                    <View>
                        {maximumPostLength != null &&
                            (supportsImages
                                ? visibleTextLength
                                : rawLength) > maximumPostLength ? (
                            <Text
                                style={[
                                    styles.requirementCounter,
                                    styles.inlineCounter,
                                    { color: theme.unread },
                                ]}>
                                {`${supportsImages ? visibleTextLength : rawLength}/${maximumPostLength}`}
                            </Text>
                        ) : null}
                        <TextInput
                            accessibilityLabel={t('內容')}
                            autoCapitalize="sentences"
                            multiline
                            onChangeText={setRaw}
                            placeholder={t('分享你的想法…內容將自動儲存')}
                            placeholderTextColor={theme.black.third}
                            scrollEnabled
                            style={[
                                styles.bodyInput,
                                {color: theme.black.main},
                            ]}
                            textAlignVertical="top"
                            value={raw}
                        />
                    </View>

                    <Pressable
                        accessibilityLabel={t('查看 Markdown 基本語法')}
                        accessibilityRole="link"
                        hitSlop={scale(6)}
                        onPress={onOpenMarkdownGuide}
                        style={({ pressed }) => [
                            styles.markdownHelpButton,
                            pressed && { opacity: 0.7 },
                        ]}>
                        <Text
                            style={[
                                styles.markdownHelpText,
                                { color: theme.black.third },
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

                {isNewTopic || isEditingFirstPost ? (
                    <>
                        <View style={styles.fieldGroup}>
                            <Text
                                style={[
                                    styles.fieldLabel,
                                    { color: theme.black.second },
                                ]}>
                                {t('分類')}
                            </Text>
                            <Pressable
                                accessibilityRole="button"
                                onPress={onOpenCategorySheet}
                                style={({ pressed }) => [
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
                                        { color: theme.black.second },
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
                                style={({ pressed }) => [
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

                {supportsImages || isEdit ? (
                    <View style={styles.fieldGroup}>
                        {supportsImages ? (
                            <>
                                <View style={styles.bodyLabelRow}>
                                    <Text
                                        style={[
                                            styles.fieldLabel,
                                            { color: theme.black.second },
                                        ]}>
                                        {t('圖片')}
                                    </Text>
                                    {images.length > 0 ? (
                                        <Text
                                            style={[
                                                styles.requirementCounter,
                                                { color: theme.black.third },
                                            ]}>
                                            {`${images.length}/${MAX_IMAGES_PER_POST}`}
                                        </Text>
                                    ) : null}
                                </View>
                                <HarborComposerImageGrid
                                    handleMoveImage={handleMoveImage}
                                    handleRemoveImage={handleRemoveImage}
                                    handleRetryImage={handleRetryImage}
                                    images={images}
                                />
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
                                    style={({ pressed }) => [
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
                                            { color: theme.themeColor },
                                        ]}>
                                        {isPreparingImages
                                            ? t('正在處理圖片…')
                                            : hasReachedImageLimit
                                                ? t('已達 {{count}} 張上限', {
                                                    count: MAX_IMAGES_PER_POST,
                                                })
                                                : t('新增圖片')}
                                    </Text>
                                </Pressable>
                            </>
                        ) : null}
                        {isNewTopic ? (
                            <Pressable
                                accessibilityRole="link"
                                onPress={onOpenWebComposer}
                                style={({ pressed }) => [
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
                                        { color: theme.black.third },
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
                                { color: theme.unread },
                            ]}>
                            {submitError}
                        </Text>
                    </View>
                ) : null}

                {isEdit && editMetadata.canDelete ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{
                            disabled: isDeleting || isSubmitting,
                        }}
                        disabled={isDeleting || isSubmitting}
                        onPress={onPressDelete}
                        style={({ pressed }) => [
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
                                { color: theme.unread },
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
        fontSize: scale(15),
        height: verticalScale(180),
        lineHeight: scale(22),
        paddingHorizontal: 0,
        paddingVertical: verticalScale(4),
    },
    bodyLabelRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    composerBlock: {
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        gap: verticalScale(4),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(12),
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
    inlineCounter: {
        alignSelf: 'flex-end',
        marginBottom: verticalScale(2),
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
    markdownHelpButton: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        flexDirection: 'row',
        gap: scale(3),
        marginTop: verticalScale(4),
    },
    markdownHelpText: {
        fontSize: scale(11),
    },
    requirementCounter: {
        fontSize: scale(11),
        fontWeight: '600',
    },
    scrollContent: {
        gap: verticalScale(14),
        paddingHorizontal: scale(12),
        paddingTop: scale(8),
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
    titleBodyDivider: {
        height: StyleSheet.hairlineWidth,
        marginBottom: verticalScale(4),
        marginTop: verticalScale(2),
    },
    titleInput: {
        fontSize: scale(18),
        lineHeight: scale(26),
        maxHeight: scale(26) * 3 + verticalScale(12),
        paddingHorizontal: 0,
        paddingVertical: verticalScale(6),
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
