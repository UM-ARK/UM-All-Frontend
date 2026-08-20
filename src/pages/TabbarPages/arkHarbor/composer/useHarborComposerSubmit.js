import {
    useCallback,
    useRef,
    useState,
} from 'react';

import Toast from 'react-native-simple-toast';

import {
    createHarborPost,
    updateHarborPost,
} from '../../../../utils/harbor/harborApi';
import {publishHarborTopicUpdate} from '../../../../utils/harbor/harborTopicUpdates';
import {trigger} from '../../../../utils/trigger';
import {
    buildHarborComposerRaw,
    getHarborComposerResult,
} from '../harborComposerText';
import {getComposerErrorMessage} from './harborComposerErrors';

export function useHarborComposerSubmit({
    areSelectedTagsAllowed,
    categoryId,
    editMetadata,
    hasUnreadyImages,
    images,
    isEdit,
    isEditingFirstPost,
    isNewTopic,
    isPreparingImages,
    isReply,
    isUploadingImages,
    maximumPostLength,
    maximumTagCount,
    maximumTitleLength,
    minimumPostLength,
    minimumTagCount,
    minimumTitleLength,
    onLogin,
    onPending,
    onPublished,
    onSuccess,
    originalText,
    publishRestriction,
    raw,
    requiresCategory,
    route,
    selectedTags,
    sessionStatus,
    supportsImages,
    t,
    title,
    titleLength,
    uploadImages,
}) {
    const submittingRef = useRef(false);
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const composedRaw = supportsImages
        ? buildHarborComposerRaw(raw, images)
        : raw;
    const rawLength = composedRaw.trim().length;
    const isPostLengthValid =
        (rawLength >= minimumPostLength ||
            (supportsImages && images.length > 0)) &&
        (maximumPostLength == null || rawLength <= maximumPostLength);
    const isSubmitDisabled =
        isSubmitting ||
        isPreparingImages ||
        isUploadingImages;

    const validateForm = useCallback(({
        beforeUpload = false,
        contentRaw = composedRaw,
        unreadyImages = hasUnreadyImages,
    } = {}) => {
        const contentLength = contentRaw.trim().length;
        if (publishRestriction) {
            return publishRestriction;
        }
        if (supportsImages && unreadyImages && !beforeUpload) {
            return t('請等待圖片上傳完成，或移除上傳失敗的圖片。');
        }
        if (
            (isNewTopic || isEditingFirstPost) &&
            titleLength < minimumTitleLength
        ) {
            return t('話題標題至少需要 {{count}} 個字。', {
                count: minimumTitleLength,
            });
        }
        if (
            (isNewTopic || isEditingFirstPost) &&
            maximumTitleLength != null &&
            titleLength > maximumTitleLength
        ) {
            return t('話題標題最多只能有 {{count}} 個字。', {
                count: maximumTitleLength,
            });
        }
        if (
            (isNewTopic || isEditingFirstPost) &&
            requiresCategory &&
            categoryId == null
        ) {
            return t('請選擇話題分類。');
        }
        if (
            (isNewTopic || isEditingFirstPost) &&
            selectedTags.length < minimumTagCount
        ) {
            return t('此分類至少需要 {{count}} 個標籤。', {
                count: minimumTagCount,
            });
        }
        if (
            (isNewTopic || isEditingFirstPost) &&
            !areSelectedTagsAllowed
        ) {
            return t('此分類不接受已選擇的部分標籤，請重新選擇。');
        }
        if (
            (isNewTopic || isEditingFirstPost) &&
            maximumTagCount != null &&
            selectedTags.length > maximumTagCount
        ) {
            return t('每個話題最多只能選擇 {{count}} 個標籤。', {
                count: maximumTagCount,
            });
        }
        if (
            contentLength < minimumPostLength &&
            !(beforeUpload && supportsImages && images.length > 0)
        ) {
            return isReply
                ? t('回覆至少需要 {{count}} 個字。', {
                    count: minimumPostLength,
                })
                : t('正文至少需要 {{count}} 個字。', {
                    count: minimumPostLength,
                });
        }
        if (
            maximumPostLength != null &&
            contentLength > maximumPostLength
        ) {
            return isReply
                ? t('回覆最多只能有 {{count}} 個字。', {
                    count: maximumPostLength,
                })
                : t('正文最多只能有 {{count}} 個字。', {
                    count: maximumPostLength,
                });
        }
        return '';
    }, [
        areSelectedTagsAllowed,
        categoryId,
        composedRaw,
        hasUnreadyImages,
        images.length,
        isEditingFirstPost,
        isNewTopic,
        isReply,
        maximumPostLength,
        maximumTagCount,
        maximumTitleLength,
        minimumPostLength,
        minimumTagCount,
        minimumTitleLength,
        publishRestriction,
        requiresCategory,
        selectedTags.length,
        supportsImages,
        t,
        titleLength,
    ]);

    const handleSubmit = useCallback(async () => {
        trigger();
        if (submittingRef.current) {
            return;
        }
        if (sessionStatus !== 'signedIn') {
            await onLogin();
            return;
        }

        const validationError = validateForm({beforeUpload: true});
        if (validationError) {
            setSubmitError(validationError);
            Toast.show(validationError);
            return;
        }

        submittingRef.current = true;
        setIsSubmitting(true);
        setSubmitError('');

        try {
            const submissionImages =
                supportsImages && hasUnreadyImages
                    ? await uploadImages()
                    : images;
            const stillUnready =
                supportsImages &&
                submissionImages.some(
                    image => image.status !== 'uploaded',
                );
            if (stillUnready) {
                const uploadError = t(
                    '部分圖片上傳失敗，請重試或移除後再發布。',
                );
                setSubmitError(uploadError);
                Toast.show(uploadError);
                return;
            }
            const submissionRaw = supportsImages
                ? buildHarborComposerRaw(raw, submissionImages)
                : raw;
            const finalValidationError = validateForm({
                contentRaw: submissionRaw,
                unreadyImages: false,
            });
            if (finalValidationError) {
                setSubmitError(finalValidationError);
                Toast.show(finalValidationError);
                return;
            }
            const result = isEdit
                ? await updateHarborPost(route.params?.postId, {
                    raw: submissionRaw,
                    originalText,
                    topicId: Number(
                        editMetadata.topicId ??
                        editMetadata.topic_id ??
                        route.params?.topicId,
                    ),
                    originalTitle:
                        editMetadata.originalTitle ||
                        editMetadata.original_title ||
                        editMetadata.title ||
                        route.params?.topicTitle,
                    ...(isEditingFirstPost
                        ? {
                            title: title.trim(),
                            categoryId,
                            tags: selectedTags,
                            originalTags:
                                editMetadata.tags ||
                                route.params?.tags ||
                                [],
                        }
                        : {}),
                })
                : await createHarborPost({
                    raw: submissionRaw,
                    ...(isNewTopic
                        ? {
                            title: title.trim(),
                            categoryId,
                            tags: selectedTags,
                        }
                        : {
                            topicId: Number(route.params?.topicId),
                            ...(route.params?.replyToPostNumber
                                ? {
                                    replyToPostNumber: Number(
                                        route.params.replyToPostNumber,
                                    ),
                                }
                                : {}),
                        }),
                });
            const composerResult = getHarborComposerResult(result);
            if (composerResult.pending) {
                await onPublished();
                Toast.show(
                    t('內容已送交審核，通過後會顯示在 Harbor。'),
                );
                onPending();
                return;
            }
            const resultTopicId =
                composerResult.topicId ??
                Number(
                    editMetadata.topicId ??
                    editMetadata.topic_id ??
                    route.params?.topicId,
                );
            const resultPostNumber =
                composerResult.postNumber ??
                Number(
                    editMetadata.postNumber ??
                    editMetadata.post_number ??
                    route.params?.postNumber,
                );
            if (
                !Number.isInteger(resultTopicId) ||
                resultTopicId <= 0 ||
                !Number.isInteger(resultPostNumber) ||
                resultPostNumber <= 0
            ) {
                const resultError = new Error(
                    'Invalid Harbor post result',
                );
                resultError.code = 'INVALID_HARBOR_POST_RESULT';
                throw resultError;
            }

            publishHarborTopicUpdate(resultTopicId, {
                invalidateActivity: true,
                invalidateDetail: true,
                invalidateSearch: true,
                reloadLists: true,
            });
            await onPublished();
            Toast.show(
                isEdit
                    ? t('貼文已更新。')
                    : isReply
                        ? t('回覆已發布。')
                        : t('話題已建立。'),
            );
            onSuccess(resultTopicId, resultPostNumber);
        } catch (error) {
            if (error?.harborPostUpdated) {
                const partialResult = getHarborComposerResult(
                    error.harborUpdatedPost,
                );
                const resultTopicId =
                    partialResult.topicId ??
                    Number(
                        editMetadata.topicId ??
                        editMetadata.topic_id ??
                        route.params?.topicId,
                    );
                const resultPostNumber =
                    partialResult.postNumber ??
                    Number(
                        editMetadata.postNumber ??
                        editMetadata.post_number ??
                        route.params?.postNumber,
                    );
                publishHarborTopicUpdate(resultTopicId, {
                    invalidateActivity: true,
                    invalidateDetail: true,
                    invalidateSearch: true,
                    reloadLists: true,
                });
                await onPublished();
                Toast.show(
                    t('貼文正文已更新，但部分話題資料更新失敗，請重新載入確認。'),
                );
                onSuccess(resultTopicId, resultPostNumber);
                return;
            }
            const message = getComposerErrorMessage(error, t);
            setSubmitError(message);
            Toast.show(message);
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }, [
        categoryId,
        editMetadata,
        hasUnreadyImages,
        images,
        isEdit,
        isEditingFirstPost,
        isNewTopic,
        isReply,
        onLogin,
        onPending,
        onPublished,
        onSuccess,
        originalText,
        raw,
        route.params,
        selectedTags,
        sessionStatus,
        supportsImages,
        t,
        title,
        uploadImages,
        validateForm,
    ]);

    return {
        handleSubmit,
        isPostLengthValid,
        isSubmitDisabled,
        isSubmitting,
        rawLength,
        submitError,
    };
}
