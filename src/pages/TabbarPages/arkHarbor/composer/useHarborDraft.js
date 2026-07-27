import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {AppState} from 'react-native';

import Toast from 'react-native-simple-toast';

import {
    completeHarborDraftDeletion,
    deleteHarborDraftAtLatestSequence,
    getHarborComposerDraftKey,
    getHarborDraftAccountId,
    getHarborDraftAction,
    getHarborDraftMode,
    loadHarborComposerDraft,
    markHarborDraftForDeletion,
    saveLocalHarborDraft,
    syncLocalHarborDraft,
} from '../../../../utils/harbor/harborDrafts';
import {buildHarborComposerRaw} from '../harborComposerText';

const AUTOSAVE_DELAY = 1200;
const REMOTE_AUTOSAVE_DELAY = 15 * 1000;

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
        status: image.status,
    }));

export function useHarborDraft({
    categories,
    categoryId,
    editMetadata,
    images,
    isComposerLoading,
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
    const remoteAutosaveTimerRef = useRef(null);
    const remoteSyncQueueRef = useRef(Promise.resolve());
    const queuedRemoteSignaturesRef = useRef(new Set());
    const draftGenerationRef = useRef(0);
    const completedRef = useRef(false);
    const leavingRef = useRef(false);
    const allowNextRemovalRef = useRef(false);
    const conflictToastShownRef = useRef(false);
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
    const hasDraftContent = mode === 'edit'
        ? raw.trim() !== String(originalText || '').trim() ||
            (isEditingFirstPost &&
                title.trim() !== String(originalTitle).trim())
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
            appImages: supportsImages ? getDraftImages(images) : [],
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
        originalTitle,
        raw,
        route.params,
        selectedTags,
        supportsImages,
        title,
    ]);

    const saveCurrentDraft = useCallback(
        async ({syncRemote = true} = {}) => {
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
                draftRef.current &&
                (
                    !syncRemote ||
                    draftRef.current.syncStatus === 'synced'
                )
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

            if (syncRemote && sessionStatus === 'signedIn') {
                if (queuedRemoteSignaturesRef.current.has(signature)) {
                    return localDraft;
                }
                queuedRemoteSignaturesRef.current.add(signature);
                remoteSyncQueueRef.current =
                    remoteSyncQueueRef.current
                        .catch(() => null)
                        .then(async () => {
                            const draftToSync = {
                                ...localDraft,
                                sequence:
                                    draftRef.current?.sequence ||
                                    localDraft.sequence,
                            };
                            try {
                                const remoteData = {
                                    ...draftToSync.data,
                                    appImages: (
                                        draftToSync.data.appImages || []
                                    )
                                        .filter(image => image.shortUrl)
                                        .map(image => ({
                                            id: image.id,
                                            remoteUrl: image.remoteUrl,
                                            fileName: image.fileName,
                                            mimeType: image.mimeType,
                                            fileSize: image.fileSize,
                                            uploadId: image.uploadId,
                                            shortUrl: image.shortUrl,
                                            status: image.status,
                                        })),
                                };
                                const result =
                                    await syncLocalHarborDraft(
                                        accountId,
                                        draftToSync,
                                        {data: remoteData},
                                    );
                                draftRef.current = result.draft;
                                if (
                                    result.conflictUser &&
                                    !conflictToastShownRef.current
                                ) {
                                    conflictToastShownRef.current = true;
                                    Toast.show(
                                        t(
                                            '草稿已保存在本機，但 Harbor 上有較新的版本。',
                                        ),
                                    );
                                }
                            } catch (error) {
                                const nextStatus =
                                    error?.response?.status === 409
                                        ? 'conflict'
                                        : 'offline';
                                const offlineDraft =
                                    await saveLocalHarborDraft(
                                        accountId,
                                        {
                                            ...draftRef.current,
                                            syncStatus: nextStatus,
                                        },
                                    );
                                draftRef.current = offlineDraft;
                                if (
                                    nextStatus === 'conflict' &&
                                    !conflictToastShownRef.current
                                ) {
                                    conflictToastShownRef.current = true;
                                    Toast.show(
                                        t(
                                            '草稿已保存在本機，但 Harbor 上有較新的版本。',
                                        ),
                                    );
                                }
                            } finally {
                                queuedRemoteSignaturesRef.current.delete(
                                    signature,
                                );
                            }
                        });
            }
            return localDraft;
        },
        [
            accountId,
            buildDraftRecord,
            draftKey,
            hasDraftContent,
            sessionStatus,
            t,
        ],
    );

    const discardCurrentDraft = useCallback(async () => {
        const sequence = draftRef.current?.sequence || 0;
        draftGenerationRef.current += 1;
        const discardGeneration = draftGenerationRef.current;
        savedSignatureRef.current = '';
        draftRef.current = {
            sequence,
            createdAt: Date.now(),
            syncStatus: 'synced',
        };
        if (accountId && draftKey) {
            await markHarborDraftForDeletion(
                accountId,
                draftKey,
                sequence,
            );
        }
        if (!draftKey) {
            return;
        }
        remoteSyncQueueRef.current =
            remoteSyncQueueRef.current
                .catch(() => null)
                .then(async () => {
                    if (
                        draftGenerationRef.current !==
                        discardGeneration
                    ) {
                        return null;
                    }
                    const latestSequence =
                        draftRef.current?.sequence || sequence;
                    if (accountId) {
                        await markHarborDraftForDeletion(
                            accountId,
                            draftKey,
                            latestSequence,
                        );
                    }
                    try {
                        await deleteHarborDraftAtLatestSequence(
                            draftKey,
                            latestSequence,
                        );
                        if (accountId) {
                            await completeHarborDraftDeletion(
                                accountId,
                                draftKey,
                            );
                        }
                    } catch {
                        return null;
                    }
                    return draftKey;
                });
    }, [accountId, draftKey]);

    useEffect(() => {
        if (sessionStatus !== 'signedIn' || !draftKey) {
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

        loadHarborComposerDraft(accountId, draftKey, {
            signal: controller.signal,
        })
            .then(draft => {
                if (
                    !controller.signal.aborted &&
                    draft?.pendingDeletion
                ) {
                    draftRef.current = {
                        sequence: draft.sequence,
                        createdAt: Date.now(),
                        syncStatus: 'synced',
                    };
                    savedSignatureRef.current = '';
                    return;
                }
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
                setRaw(
                    typeof data.appText === 'string'
                        ? data.appText
                        : String(data.reply || ''),
                );
                if (
                    (mode === 'newTopic' || isEditingFirstPost) &&
                    typeof data.title === 'string'
                ) {
                    setTitle(data.title);
                }
                if (
                    mode === 'newTopic' &&
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
                    mode === 'newTopic' &&
                    data.categoryId == null &&
                    !requiresCategory
                ) {
                    setCategoryId(null);
                }
                if (mode === 'newTopic') {
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
                if (supportsImages) {
                    restoreDraftImages(data.appImages);
                }
                if (
                    draft.syncStatus === 'conflict' &&
                    !conflictToastShownRef.current
                ) {
                    conflictToastShownRef.current = true;
                    Toast.show(
                        t(
                            '已恢復本機草稿；Harbor 上另有較新的版本。',
                        ),
                    );
                }
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
        isEditingFirstPost,
        mode,
        requiresCategory,
        restoreDraftImages,
        sessionStatus,
        setCategoryId,
        setRaw,
        setSelectedTags,
        setTitle,
        supportsImages,
        t,
        tags,
    ]);

    useEffect(() => {
        clearTimeout(autosaveTimerRef.current);
        clearTimeout(remoteAutosaveTimerRef.current);
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
                clearTimeout(remoteAutosaveTimerRef.current);
            };
        }
        autosaveTimerRef.current = setTimeout(() => {
            saveCurrentDraft({syncRemote: false}).catch(() => null);
        }, AUTOSAVE_DELAY);
        remoteAutosaveTimerRef.current = setTimeout(() => {
            saveCurrentDraft().catch(() => null);
        }, REMOTE_AUTOSAVE_DELAY);
        return () => {
            clearTimeout(autosaveTimerRef.current);
            clearTimeout(remoteAutosaveTimerRef.current);
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
                    clearTimeout(remoteAutosaveTimerRef.current);
                    saveCurrentDraft({syncRemote: false}).catch(() => null);
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
                clearTimeout(remoteAutosaveTimerRef.current);
                saveCurrentDraft()
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
            },
        );
        return unsubscribe;
    }, [
        discardCurrentDraft,
        hasDraftContent,
        navigation,
        saveCurrentDraft,
        t,
    ]);

    const clearDraftAfterPublish = useCallback(async () => {
        completedRef.current = true;
        clearTimeout(autosaveTimerRef.current);
        clearTimeout(remoteAutosaveTimerRef.current);
        await discardCurrentDraft();
    }, [discardCurrentDraft]);

    const discardDraftAndExit = useCallback(async () => {
        completedRef.current = true;
        clearTimeout(autosaveTimerRef.current);
        clearTimeout(remoteAutosaveTimerRef.current);
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
