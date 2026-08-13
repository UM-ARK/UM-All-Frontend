import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {
    fetchCachedHarborComposerSettings,
    fetchHarborComposerMetadata,
    fetchHarborPostForEdit,
    fetchHarborTopic,
    readCachedHarborCategories,
    readCachedHarborComposerSettings,
    readCachedHarborTags,
} from '../../../../utils/harbor/harborApi';
import {
    getHarborRateLimitDelayMs,
    isHarborRateLimited,
} from '../../../../utils/harbor/harborRateLimit';
import {getComposerErrorMessage} from './harborComposerErrors';
import {
    COMPOSER_MODES,
    getEditPost,
} from './harborComposerModels';
import {
    canUseHarborComposerImageGrid,
    splitHarborComposerRaw,
} from '../harborComposerText';

export function useHarborComposer({route, t}) {
    const {
        login,
        status: sessionStatus,
        user,
    } = useHarborSession();
    const loadControllerRef = useRef(null);
    const retryTimerRef = useRef(null);
    const routeMode = route.params?.mode;
    const mode = COMPOSER_MODES.has(routeMode) ? routeMode : 'newTopic';
    const isNewTopic = mode === 'newTopic';
    const isReply = mode === 'reply';
    const isEdit = mode === 'edit';
    const supportsImages = isNewTopic || isReply || isEdit;
    const routePostNumber = Number(route.params?.postNumber);
    const routeQuoteRaw = route.params?.quoteRaw;
    const initialRaw = routeQuoteRaw
        ? `${String(routeQuoteRaw).trimEnd()}\n\n`
        : '';
    const [title, setTitle] = useState(route.params?.topicTitle || '');
    const [categoryId, setCategoryId] = useState(
        route.params?.categoryId == null
            ? null
            : Number(route.params.categoryId),
    );
    const [selectedTags, setSelectedTags] = useState([]);
    const [raw, setRaw] = useState(initialRaw);
    const [originalText, setOriginalText] = useState('');
    const cachedCategoriesRef = useRef(readCachedHarborCategories());
    const cachedTagsRef = useRef(readCachedHarborTags());
    const cachedComposerSettingsRef = useRef(
        readCachedHarborComposerSettings(),
    );
    const cachedCategories = cachedCategoriesRef.current;
    const cachedTags = cachedTagsRef.current;
    const cachedComposerSettings = cachedComposerSettingsRef.current;
    const hasCachedNewTopicMetadata = Boolean(
        cachedCategories && cachedTags && cachedComposerSettings,
    );
    const [categories, setCategories] = useState(
        () => cachedCategories?.items || [],
    );
    const [tags, setTags] = useState(
        () => (cachedTags?.items || []).filter(tag => !tag.pmOnly),
    );
    const [composerSettings, setComposerSettings] = useState(
        cachedComposerSettings || null,
    );
    const [isLoading, setIsLoading] = useState(
        isEdit ||
            (supportsImages &&
                !(isNewTopic
                    ? hasCachedNewTopicMetadata
                    : cachedComposerSettings)),
    );
    const [loadError, setLoadError] = useState('');
    const [isRetryBlocked, setIsRetryBlocked] = useState(false);
    const [publishRestriction, setPublishRestriction] = useState('');
    const [editMetadata, setEditMetadata] = useState({});
    const [initialEditImages, setInitialEditImages] = useState([]);
    const [requiresWebImageEditing, setRequiresWebImageEditing] =
        useState(false);
    const isEditingFirstPost =
        isEdit &&
        Number(
            editMetadata.postNumber ??
            editMetadata.post_number ??
            routePostNumber,
        ) === 1;

    const loadComposerData = useCallback(async ({
        forceRefresh = false,
    } = {}) => {
        if (sessionStatus !== 'signedIn') {
            return;
        }

        loadControllerRef.current?.abort();
        const controller = new AbortController();
        loadControllerRef.current = controller;
        setLoadError('');
        setPublishRestriction('');
        if (
            forceRefresh ||
            isEdit ||
            (isNewTopic
                ? !hasCachedNewTopicMetadata
                : !cachedComposerSettings)
        ) {
            setIsLoading(true);
        }

        try {
            if (isNewTopic) {
                const {
                    categories: categoryResult,
                    tags: tagResult,
                    settings: settingsResult,
                } = await fetchHarborComposerMetadata({forceRefresh});
                if (controller.signal.aborted) {
                    return;
                }
                const categoryItems = categoryResult.items || [];
                setCategories(categoryItems);
                setTags(
                    (tagResult.items || []).filter(tag => !tag.pmOnly),
                );
                setComposerSettings(settingsResult);
                setCategoryId(currentCategoryId => {
                    const currentCategory = categoryItems.find(
                        category =>
                            Number(category.id) ===
                            Number(currentCategoryId),
                    );
                    if (currentCategory) {
                        return currentCategory.id;
                    }
                    const defaultCategory = categoryItems.find(
                        category =>
                            Number(category.id) ===
                            Number(settingsResult.defaultCategoryId),
                    );
                    return defaultCategory?.id ?? null;
                });
                return;
            }

            if (isReply) {
                const [
                    settingsResult,
                    topicResult,
                ] = await Promise.all([
                    fetchCachedHarborComposerSettings({
                        forceRefresh,
                    }),
                    route.params?.fromDraftBox
                        ? fetchHarborTopic(
                            route.params?.topicId,
                            {signal: controller.signal},
                        ).catch(() => null)
                        : Promise.resolve(null),
                ]);
                if (controller.signal.aborted) {
                    return;
                }
                setComposerSettings(settingsResult);
                if (
                    topicResult?.closed ||
                    topicResult?.archived
                ) {
                    setPublishRestriction(
                        topicResult.closed
                            ? t('此話題已關閉，暫時無法發布回覆。')
                            : t('此話題已封存，暫時無法發布回覆。'),
                    );
                } else if (
                    topicResult &&
                    (topicResult.can_create_post === false ||
                        topicResult.details?.can_create_post === false)
                ) {
                    setPublishRestriction(
                        t('你目前沒有權限回覆這個話題。'),
                    );
                }
                return;
            }

            if (isEdit) {
                const result = await fetchHarborPostForEdit(
                    route.params?.postId,
                    {signal: controller.signal},
                );
                if (controller.signal.aborted) {
                    return;
                }
                const post = getEditPost(result);
                if (!post.canEdit) {
                    setLoadError(
                        t('你目前沒有權限編輯這篇貼文。'),
                    );
                    return;
                }
                const postRaw = String(post.raw || '');
                const isFirstPost = Number(
                    post.postNumber ??
                    post.post_number ??
                    routePostNumber,
                ) === 1;
                const metadata = isFirstPost
                    ? await fetchHarborComposerMetadata({forceRefresh})
                    : {
                        settings: await fetchCachedHarborComposerSettings({
                            forceRefresh,
                        }),
                    };
                if (controller.signal.aborted) {
                    return;
                }
                const routeImageUrls = Array.isArray(
                    route.params?.editImageUrls,
                )
                    ? route.params.editImageUrls
                    : [];
                const splitPost = splitHarborComposerRaw(postRaw, {
                    previewUrls:
                        routeImageUrls.length > 0
                            ? routeImageUrls
                            : post.imageUrls || [],
                });
                const canUseImageGrid =
                    canUseHarborComposerImageGrid(postRaw);
                setRequiresWebImageEditing(!canUseImageGrid);
                setRaw(canUseImageGrid ? splitPost.text : postRaw);
                setInitialEditImages(splitPost.images);
                setOriginalText(
                    String(post.originalText ?? post.original_text ?? postRaw),
                );
                setTitle(post.title || route.params?.topicTitle || '');
                setComposerSettings(metadata.settings);
                if (isFirstPost) {
                    const categoryItems = metadata.categories?.items || [];
                    const availableTagItems = (metadata.tags?.items || []).filter(
                        tag => !tag.pmOnly,
                    );
                    const postCategoryId = Number(
                        post.categoryId ??
                        post.category_id ??
                        route.params?.categoryId,
                    );
                    const postTags = Array.isArray(post.tags)
                        ? post.tags
                        : Array.isArray(route.params?.tags)
                            ? route.params.tags
                            : [];
                    const normalizedPostTags = postTags
                        .map(postTag => {
                            const name = String(
                                postTag?.name || postTag || '',
                            ).trim();
                            if (!name) {
                                return null;
                            }
                            return availableTagItems.find(tag =>
                                tag.name === name,
                            ) || {
                                ...(postTag?.id == null
                                    ? {}
                                    : {id: postTag.id}),
                                name,
                            };
                        })
                        .filter(Boolean);
                    const existingTagNames = new Set(
                        availableTagItems.map(tag => tag.name),
                    );
                    const tagItems = [
                        ...availableTagItems,
                        ...normalizedPostTags.filter(tag =>
                            !existingTagNames.has(tag.name),
                        ),
                    ];
                    setCategories(categoryItems);
                    setTags(tagItems);
                    setCategoryId(
                        Number.isInteger(postCategoryId) && postCategoryId > 0
                            ? postCategoryId
                            : null,
                    );
                    setSelectedTags(normalizedPostTags);
                }
                setEditMetadata(post);
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                if (isHarborRateLimited(error)) {
                    clearTimeout(retryTimerRef.current);
                    setIsRetryBlocked(true);
                    retryTimerRef.current = setTimeout(() => {
                        setIsRetryBlocked(false);
                        retryTimerRef.current = null;
                    }, getHarborRateLimitDelayMs(error));
                }
                setLoadError(getComposerErrorMessage(error, t));
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
                loadControllerRef.current = null;
            }
        }
    }, [
        cachedComposerSettings,
        hasCachedNewTopicMetadata,
        isEdit,
        isNewTopic,
        isReply,
        route.params?.postId,
        route.params?.fromDraftBox,
        route.params?.categoryId,
        route.params?.editImageUrls,
        route.params?.topicId,
        route.params?.tags,
        route.params?.topicTitle,
        routePostNumber,
        sessionStatus,
        t,
    ]);

    useEffect(() => {
        loadComposerData();
        return () => {
            loadControllerRef.current?.abort();
        };
    }, [loadComposerData]);

    useEffect(
        () => () => clearTimeout(retryTimerRef.current),
        [],
    );

    const selectedCategory = useMemo(
        () => categories.find(item => Number(item.id) === Number(categoryId)),
        [categories, categoryId],
    );
    const selectedTagNames = useMemo(
        () => selectedTags.map(tag => tag.name).filter(Boolean),
        [selectedTags],
    );
    const selectableTags = useMemo(() => {
        const allowedTags = selectedCategory?.allowedTags;
        if (!Array.isArray(allowedTags) || allowedTags.length === 0) {
            return tags;
        }
        const allowedTagNames = new Set(allowedTags);
        return tags.filter(tag => allowedTagNames.has(tag.name));
    }, [selectedCategory?.allowedTags, tags]);
    const areSelectedTagsAllowed = selectedTags.every(selectedTag =>
        selectableTags.some(tag => tag.name === selectedTag.name),
    );
    const titleLength = title.trim().length;
    const visibleTextLength = raw.trim().length;
    const minimumTitleLength =
        composerSettings?.minTopicTitleLength ?? 1;
    const maximumTitleLength =
        composerSettings?.maxTopicTitleLength;
    const minimumPostLength = isNewTopic
        ? composerSettings?.minFirstPostLength ?? 1
        : composerSettings?.minPostLength ?? 1;
    const maximumPostLength = composerSettings?.maxPostLength;
    const maximumTagCount = composerSettings?.maxTagsPerTopic;
    const minimumTagCount = selectedCategory?.minimumRequiredTags ?? 0;
    const requiresCategory =
        composerSettings?.allowUncategorizedTopics !== true;
    const isTitleLengthValid =
        titleLength >= minimumTitleLength &&
        (maximumTitleLength == null ||
            titleLength <= maximumTitleLength);
    const isTagCountValid =
        selectedTags.length >= minimumTagCount &&
        (maximumTagCount == null ||
            selectedTags.length <= maximumTagCount);

    return {
        allTags: tags,
        areSelectedTagsAllowed,
        categories,
        categoryId,
        composerSettings,
        editMetadata,
        initialEditImages,
        isEdit,
        isEditingFirstPost,
        isLoading,
        isNewTopic,
        isReply,
        isRetryBlocked,
        isTagCountValid,
        isTitleLengthValid,
        loadComposerData,
        loadError,
        login,
        maximumPostLength,
        maximumTagCount,
        maximumTitleLength,
        minimumPostLength,
        minimumTagCount,
        minimumTitleLength,
        mode,
        originalText,
        publishRestriction,
        raw,
        requiresWebImageEditing,
        requiresCategory,
        routePostNumber,
        selectedCategory,
        selectedTagNames,
        selectedTags,
        sessionStatus,
        setCategoryId,
        setLoadError,
        setRequiresWebImageEditing,
        setRaw,
        setSelectedTags,
        setTitle,
        supportsImages,
        tags: selectableTags,
        title,
        titleLength,
        user,
        visibleTextLength,
    };
}
