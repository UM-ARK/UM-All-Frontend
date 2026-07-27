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
    onSuccess,
    originalText,
    raw,
    requiresCategory,
    route,
    selectedTags,
    sessionStatus,
    supportsImages,
    t,
    title,
    titleLength,
}) {
    const submittingRef = useRef(false);
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const composedRaw = supportsImages
        ? buildHarborComposerRaw(raw, images)
        : raw;
    const rawLength = composedRaw.trim().length;
    const isPostLengthValid =
        rawLength >= minimumPostLength &&
        (maximumPostLength == null || rawLength <= maximumPostLength);
    const isSubmitDisabled =
        isSubmitting ||
        isPreparingImages ||
        isUploadingImages;

    const validateForm = useCallback(() => {
        if (supportsImages && hasUnreadyImages) {
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
        if (isNewTopic && requiresCategory && categoryId == null) {
            return t('請選擇話題分類。');
        }
        if (isNewTopic && selectedTags.length < minimumTagCount) {
            return t('此分類至少需要 {{count}} 個標籤。', {
                count: minimumTagCount,
            });
        }
        if (
            isNewTopic &&
            maximumTagCount != null &&
            selectedTags.length > maximumTagCount
        ) {
            return t('每個話題最多只能選擇 {{count}} 個標籤。', {
                count: maximumTagCount,
            });
        }
        if (rawLength < minimumPostLength) {
            return t('正文至少需要 {{count}} 個字。', {
                count: minimumPostLength,
            });
        }
        if (
            maximumPostLength != null &&
            rawLength > maximumPostLength
        ) {
            return t('正文最多只能有 {{count}} 個字。', {
                count: maximumPostLength,
            });
        }
        return '';
    }, [
        categoryId,
        hasUnreadyImages,
        isEditingFirstPost,
        isNewTopic,
        maximumPostLength,
        maximumTagCount,
        maximumTitleLength,
        minimumPostLength,
        minimumTagCount,
        minimumTitleLength,
        rawLength,
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

        const validationError = validateForm();
        if (validationError) {
            setSubmitError(validationError);
            Toast.show(validationError);
            return;
        }

        submittingRef.current = true;
        setIsSubmitting(true);
        setSubmitError('');

        try {
            const result = isEdit
                ? await updateHarborPost(route.params?.postId, {
                    raw,
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
                        ? {title: title.trim()}
                        : {}),
                })
                : await createHarborPost({
                    raw: composedRaw,
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

            publishHarborTopicUpdate(resultTopicId, {reloadLists: true});
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
                publishHarborTopicUpdate(resultTopicId, {reloadLists: true});
                Toast.show(
                    t('貼文正文已更新，但話題標題更新失敗，請重新載入確認。'),
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
        composedRaw,
        editMetadata,
        isEdit,
        isEditingFirstPost,
        isNewTopic,
        isReply,
        onLogin,
        onPending,
        onSuccess,
        originalText,
        raw,
        route.params,
        selectedTags,
        sessionStatus,
        t,
        title,
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
