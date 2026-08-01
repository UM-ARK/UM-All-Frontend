import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {Alert, AppState} from 'react-native';

import Toast from 'react-native-simple-toast';

import {
    deleteHarborComposerDraft,
    getHarborComposerDraftKey,
    getHarborDraftAccountId,
    getHarborDraftAction,
    getHarborDraftMode,
    hasHarborEditDraftConflict,
    loadHarborComposerDraft,
    saveLocalHarborDraft,
} from '../../../../utils/harbor/harborDrafts';
import {deleteHarborDraftImageFiles} from '../../../../utils/harbor/harborDraftImages';
import {trigger} from '../../../../utils/trigger';
import {
    buildHarborComposerRaw,
    canUseHarborComposerImageGrid,
    splitHarborComposerRaw,
} from '../harborComposerText';

const AUTOSAVE_DELAY = 1200;

const getRestoredTags = (draftTags, availableTags) => {
    if (!Array.isArray(draftTags)) {
        return [];
    }
    return draftTags
        .map(draftTag => {
            const name =
                typeof draftTag === 'string'
                    ? draftTag.trim()
                    : String(draftTag?.name || '').trim();
            if (!name) {
                return null;
            }
            const id =
                typeof draftTag === 'object'
                    ? Number(draftTag?.id)
                    : null;
            return (
                availableTags.find(
                    tag =>
                        (Number.isInteger(id) &&
                            id > 0 &&
                            Number(tag.id) === id) ||
                        tag.name === name,
                ) || null
            );
        })
        .filter(Boolean);
};

const getDraftImages = images =>
    images.map(image => ({
        id: image.id,
        localUri: image.localUri,
        remoteUrl: image.remoteUrl,
        fileName: image.fileName,
        mimeType: image.mimeType,
        fileSize: image.fileSize,
        uploadId: image.uploadId,
        shortUrl: image.shortUrl,
        markdown: image.markdown,
        isNew: image.isNew,
        status: image.status,
    }));

export function useHarborDraft({
    categories,
    categoryId,
    editMetadata,
    images,
    isComposerLoading,
    isEditingBlocked,
    isEditingFirstPost,
    mode,
    navigation,
    originalText,
    raw,
    requiresCategory,
    restoreDraftImages,
    route,
    selectedTags,
    sessionStatus,
    setCategoryId,
    setRaw,
    setRequiresWebImageEditing,
    setSelectedTags,
    setTitle,
    supportsImages,
    t,
    tags,
    title,
    user,
}) {
    const accountId = getHarborDraftAccountId(user);
    const draftKey =
        route.params?.draftKey ||
        getHarborComposerDraftKey({
            mode,
            topicId: route.params?.topicId,
        });
    const loadControllerRef = useRef(null);
    const draftRef = useRef(null);
    const savedSignatureRef = useRef('');
    const autosaveTimerRef = useRef(null);
    const draftGenerationRef = useRef(0);
    const completedRef = useRef(false);
    const leavingRef = useRef(false);
    const allowNextRemovalRef = useRef(false);
    const isTopicDetailEdit =
        mode === 'edit' && route.params?.fromTopicDetail === true;
    const [isDraftLoading, setIsDraftLoading] = useState(
        sessionStatus === 'signedIn' && Boolean(draftKey),
    );

    const composedRaw = supportsImages
        ? buildHarborComposerRaw(raw, images)
        : raw;
    const originalTitle =
        editMetadata.originalTitle ||
        editMetadata.original_title ||
        editMetadata.title ||
        route.params?.topicTitle ||
        '';
    const originalCategoryValue =
        editMetadata.categoryId ??
        editMetadata.category_id ??
        route.params?.categoryId;
    const originalCategoryId = originalCategoryValue == null
        ? null
        : Number(originalCategoryValue);
    const selectedCategoryId = categoryId == null
        ? null
        : Number(categoryId);
    const originalTags = Array.isArray(editMetadata.tags)
        ? editMetadata.tags
        : Array.isArray(route.params?.tags)
            ? route.params.tags
            : [];
    const originalTagNames = originalTags
        .map(tag => String(tag?.name || tag || '').trim())
        .filter(Boolean)
        .sort()
        .join('\n');
    const selectedTagNames = selectedTags
        .map(tag => String(tag?.name || '').trim())
        .filter(Boolean)
        .sort()
        .join('\n');
    const hasDraftContent = isEditingBlocked
        ? false
        : mode === 'edit'
        ? composedRaw.trim() !== String(originalText || '').trim() ||
            (isEditingFirstPost &&
                (title.trim() !== String(originalTitle).trim() ||
                    selectedCategoryId !== originalCategoryId ||
                    selectedTagNames !== originalTagNames))
        : Boolean(
            raw.trim() ||
            images.length > 0 ||
            (mode === 'newTopic' && title.trim()),
        );

    const buildDraftRecord = useCallback(() => {
        const now = Date.now();
        const data = {
            reply: composedRaw,
            action: getHarborDraftAction(mode),
            archetypeId: 'regular',
            appText: raw,
            appImages:
                supportsImages || mode === 'edit'
                    ? getDraftImages(images)
                    : [],
            appImageEditMode: mode === 'edit' ? 'grid' : undefined,
            appContext: {
                topicId: Number(route.params?.topicId) || null,
                topicTitle: route.params?.topicTitle || '',
                postNumber: Number(route.params?.postNumber) || null,
                replyToPostNumber:
                    Number(route.params?.replyToPostNumber) || null,
            },
        };
        if (mode === 'newTopic') {
            data.title = title;
            data.categoryId = categoryId;
            data.tags = selectedTags.map(tag => ({
                ...(tag.id == null ? {} : {id: tag.id}),
                name: tag.name,
            }));
        }
        if (mode === 'reply') {
            data.categoryId = categoryId;
            if (route.params?.replyToPostNumber) {
                data.reply_to_post_number = Number(
                    route.params.replyToPostNumber,
                );
            }
        }
        if (mode === 'edit') {
            data.postId = Number(route.params?.postId);
            data.original_text = originalText;
            if (isEditingFirstPost) {
                data.title = title;
                data.original_title = originalTitle;
                data.original_category_id = originalCategoryId;
                data.original_tags = originalTagNames
                    ? originalTagNames.split('\n')
                    : [];
                data.categoryId = categoryId;
                data.tags = selectedTags.map(tag => ({
                    ...(tag.id == null ? {} : {id: tag.id}),
                    name: tag.name,
                }));
            }
        }
        return {
            draftKey,
            sequence: draftRef.current?.sequence || 0,
            mode,
            data,
            createdAt: draftRef.current?.createdAt || now,
            updatedAt: now,
            syncStatus: 'local',
        };
    }, [
        categoryId,
        composedRaw,
        draftKey,
        images,
        isEditingFirstPost,
        mode,
        originalText,
        originalCategoryId,
        originalTagNames,
        originalTitle,
        raw,
        route.params,
        selectedTags,
        supportsImages,
        title,
    ]);

    const saveCurrentDraft = useCallback(async () => {
        if (
            completedRef.current ||
            !accountId ||
            !draftKey ||
            !hasDraftContent
        ) {
            return draftRef.current;
        }
        const record = buildDraftRecord();
        const signature = JSON.stringify(record.data);
        if (
            signature === savedSignatureRef.current &&
            draftRef.current
        ) {
            return draftRef.current;
        }
        const localDraft = await saveLocalHarborDraft(
            accountId,
            record,
        );
        draftRef.current = localDraft;
        draftGenerationRef.current += 1;
        savedSignatureRef.current = signature;
        return localDraft;
    }, [
        accountId,
        buildDraftRecord,
        draftKey,
        hasDraftContent,
    ]);

    const discardCurrentDraft = useCallback(async () => {
        draftGenerationRef.current += 1;
        savedSignatureRef.current = '';
        const imagesToDelete = [
            ...(Array.isArray(draftRef.current?.data?.appImages)
                ? draftRef.current.data.appImages
                : []),
            ...(supportsImages || mode === 'edit'
                ? getDraftImages(images)
                : []),
        ];
        draftRef.current = {
            sequence: 0,
            createdAt: Date.now(),
            syncStatus: 'local',
        };
        if (accountId && draftKey) {
            await deleteHarborComposerDraft(accountId, draftKey);
        }
        deleteHarborDraftImageFiles(imagesToDelete);
    }, [accountId, draftKey, images, mode, supportsImages]);

    useEffect(() => {
        if (
            sessionStatus !== 'signedIn' ||
            !draftKey ||
            isEditingBlocked
        ) {
            setIsDraftLoading(false);
            return;
        }

        // Composer 尚未就緒時維持 loading，避免中間露出空白表單造成閃爍
        if (isComposerLoading) {
            setIsDraftLoading(true);
            return;
        }

        loadControllerRef.current?.abort();
        const controller = new AbortController();
        loadControllerRef.current = controller;
        setIsDraftLoading(true);

        loadHarborComposerDraft(accountId, draftKey)
            .then(draft => {
                if (
                    controller.signal.aborted ||
                    !draft ||
                    getHarborDraftMode(draft.data, draft.mode) !== mode
                ) {
                    return;
                }
                const data = draft.data;
                draftRef.current = draft;
                savedSignatureRef.current = JSON.stringify(data);
                const restoreDraft = () => {
                    const draftText =
                        typeof data.appText === 'string'
                            ? data.appText
                            : String(data.reply || '');
                    const fullDraftText =
                        mode === 'edit' &&
                        data.appImageEditMode === 'grid'
                            ? buildHarborComposerRaw(
                                draftText,
                                data.appImages,
                            )
                            : draftText;
                    if (mode === 'edit') {
                        const canUseImageGrid =
                            canUseHarborComposerImageGrid(fullDraftText);
                        setRequiresWebImageEditing(!canUseImageGrid);
                        if (canUseImageGrid) {
                            const splitDraft = splitHarborComposerRaw(
                                fullDraftText,
                                {existingImages: data.appImages},
                            );
                            const pendingImages = (
                                Array.isArray(data.appImages)
                                    ? data.appImages
                                    : []
                            ).filter(image => !image?.shortUrl);
                            setRaw(splitDraft.text);
                            restoreDraftImages([
                                ...splitDraft.images,
                                ...pendingImages,
                            ]);
                        } else {
                            setRaw(fullDraftText);
                            restoreDraftImages(data.appImages);
                        }
                    } else {
                        setRaw(draftText);
                        restoreDraftImages(data.appImages);
                    }
                    if (
                        (mode === 'newTopic' || isEditingFirstPost) &&
                        typeof data.title === 'string'
                    ) {
                        setTitle(data.title);
                    }
                    if (
                        (mode === 'newTopic' || isEditingFirstPost) &&
                        data.categoryId != null
                    ) {
                        const restoredCategoryId = Number(data.categoryId);
                        if (
                            categories.some(
                                category =>
                                    Number(category.id) ===
                                    restoredCategoryId,
                            )
                        ) {
                            setCategoryId(restoredCategoryId);
                        }
                    } else if (
                        (mode === 'newTopic' || isEditingFirstPost) &&
                        data.categoryId == null &&
                        !requiresCategory
                    ) {
                        setCategoryId(null);
                    }
                    if (mode === 'newTopic' || isEditingFirstPost) {
                        const draftCategory = categories.find(
                            category =>
                                Number(category.id) ===
                                Number(data.categoryId),
                        );
                        const allowedTagNames = new Set(
                            Array.isArray(draftCategory?.allowedTags)
                                ? draftCategory.allowedTags
                                : [],
                        );
                        const availableTags =
                            allowedTagNames.size > 0
                                ? tags.filter(tag =>
                                    allowedTagNames.has(tag.name),
                                )
                                : tags;
                        setSelectedTags(
                            getRestoredTags(data.tags, availableTags),
                        );
                    }
                };
                if (
                    isTopicDetailEdit &&
                    hasHarborEditDraftConflict(data, originalText, {
                        title: originalTitle,
                        categoryId: originalCategoryId,
                        tags: originalTagNames
                            ? originalTagNames.split('\n')
                            : [],
                    })
                ) {
                    return new Promise((resolve, reject) => {
                        Alert.alert(
                            t('Web 端帖子已有更新'),
                            t('此帖子在 App 草稿保存後已於 Web 端更新。若以 Web 為準，App 草稿修改將被覆蓋，包括圖片位置與排序。'),
                            [
                                {
                                    text: t('保留 App 草稿'),
                                    onPress: () => {
                                        trigger();
                                        restoreDraft();
                                        resolve();
                                    },
                                },
                                {
                                    text: t('以 Web 為準'),
                                    style: 'destructive',
                                    onPress: async () => {
                                        trigger();
                                        try {
                                            const deleted =
                                                await deleteHarborComposerDraft(
                                                    accountId,
                                                    draftKey,
                                                );
                                            if (!deleted) {
                                                throw new Error(
                                                    'Harbor draft deletion failed',
                                                );
                                            }
                                            draftGenerationRef.current += 1;
                                            savedSignatureRef.current = '';
                                            draftRef.current = {
                                                sequence: 0,
                                                createdAt: Date.now(),
                                                syncStatus: 'local',
                                            };
                                            resolve();
                                        } catch (error) {
                                            reject(error);
                                        }
                                    },
                                },
                            ],
                            {cancelable: false},
                        );
                    });
                }
                restoreDraft();
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    Toast.show(t('草稿載入失敗，請稍後再試。'));
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsDraftLoading(false);
                    loadControllerRef.current = null;
                }
            });

        return () => controller.abort();
    }, [
        accountId,
        categories,
        draftKey,
        isComposerLoading,
        isEditingBlocked,
        isEditingFirstPost,
        isTopicDetailEdit,
        mode,
        originalCategoryId,
        originalText,
        originalTagNames,
        originalTitle,
        requiresCategory,
        restoreDraftImages,
        sessionStatus,
        setCategoryId,
        setRaw,
        setRequiresWebImageEditing,
        setSelectedTags,
        setTitle,
        t,
        tags,
    ]);

    useEffect(() => {
        clearTimeout(autosaveTimerRef.current);
        if (
            isComposerLoading ||
            isDraftLoading ||
            completedRef.current
        ) {
            return;
        }
        if (!hasDraftContent) {
            if (draftRef.current?.data) {
                autosaveTimerRef.current = setTimeout(() => {
                    discardCurrentDraft().catch(() => null);
                }, AUTOSAVE_DELAY);
            }
            return () => {
                clearTimeout(autosaveTimerRef.current);
            };
        }
        autosaveTimerRef.current = setTimeout(() => {
            saveCurrentDraft().catch(() => null);
        }, AUTOSAVE_DELAY);
        return () => {
            clearTimeout(autosaveTimerRef.current);
        };
    }, [
        categoryId,
        discardCurrentDraft,
        hasDraftContent,
        images,
        isComposerLoading,
        isDraftLoading,
        raw,
        saveCurrentDraft,
        selectedTags,
        title,
    ]);

    useEffect(() => {
        const subscription = AppState.addEventListener(
            'change',
            nextState => {
                if (
                    nextState !== 'active' &&
                    hasDraftContent &&
                    !completedRef.current
                ) {
                    clearTimeout(autosaveTimerRef.current);
                    saveCurrentDraft().catch(() => null);
                }
            },
        );
        return () => subscription.remove();
    }, [hasDraftContent, saveCurrentDraft]);

    useEffect(() => {
        const unsubscribe = navigation.addListener(
            'beforeRemove',
            event => {
                if (
                    allowNextRemovalRef.current ||
                    completedRef.current
                ) {
                    return;
                }
                if (!hasDraftContent) {
                    if (!draftRef.current?.data) {
                        return;
                    }
                    event.preventDefault();
                    discardCurrentDraft()
                        .then(() => {
                            allowNextRemovalRef.current = true;
                            navigation.dispatch(event.data.action);
                        })
                        .catch(() => {
                            Toast.show(
                                t('草稿保存失敗，請稍後再試。'),
                            );
                        });
                    return;
                }
                event.preventDefault();
                if (leavingRef.current) {
                    return;
                }
                leavingRef.current = true;
                clearTimeout(autosaveTimerRef.current);
                const saveAndLeave = () => saveCurrentDraft()
                    .then(() => {
                        Toast.show(t('草稿已自動保存。'));
                        allowNextRemovalRef.current = true;
                        navigation.dispatch(event.data.action);
                    })
                    .catch(() => {
                        leavingRef.current = false;
                        Toast.show(
                            t('草稿保存失敗，請稍後再試。'),
                        );
                    });
                if (isTopicDetailEdit) {
                    Alert.alert(
                        t('尚未上傳修改'),
                        t('修改將保存為 App 草稿。若帖子之後在 Web 端更新，下次進入編輯時可能需要覆蓋 App 草稿並以 Web 版本為準。建議即時上傳修改。'),
                        [
                            {
                                text: t('繼續編輯'),
                                style: 'cancel',
                                onPress: () => {
                                    trigger();
                                    leavingRef.current = false;
                                },
                            },
                            {
                                text: t('保存草稿並退出'),
                                onPress: () => {
                                    trigger();
                                    saveAndLeave();
                                },
                            },
                        ],
                        {
                            cancelable: true,
                            onDismiss: () => {
                                leavingRef.current = false;
                            },
                        },
                    );
                    return;
                }
                saveAndLeave();
            },
        );
        return unsubscribe;
    }, [
        discardCurrentDraft,
        hasDraftContent,
        isTopicDetailEdit,
        navigation,
        saveCurrentDraft,
        t,
    ]);

    const clearDraftAfterPublish = useCallback(async () => {
        completedRef.current = true;
        clearTimeout(autosaveTimerRef.current);
        await discardCurrentDraft();
    }, [discardCurrentDraft]);

    const discardDraftAndExit = useCallback(async () => {
        completedRef.current = true;
        clearTimeout(autosaveTimerRef.current);
        try {
            await discardCurrentDraft();
            allowNextRemovalRef.current = true;
            navigation.goBack();
        } catch (error) {
            completedRef.current = false;
            throw error;
        }
    }, [discardCurrentDraft, navigation]);

    return useMemo(
        () => ({
            clearDraftAfterPublish,
            discardDraftAndExit,
            draftKey,
            hasDraftContent,
            isDraftLoading,
        }),
        [
            clearDraftAfterPublish,
            discardDraftAndExit,
            draftKey,
            hasDraftContent,
            isDraftLoading,
        ],
    );
}
