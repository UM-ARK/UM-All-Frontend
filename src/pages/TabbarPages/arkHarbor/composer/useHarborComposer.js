import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {
    fetchHarborCategories,
    fetchHarborComposerSettings,
    fetchHarborPostForEdit,
    fetchHarborTags,
    fetchHarborTopic,
} from '../../../../utils/harbor/harborApi';
import {getComposerErrorMessage} from './harborComposerErrors';
import {
    COMPOSER_MODES,
    getEditPost,
} from './harborComposerModels';

export function useHarborComposer({route, t}) {
    const {
        login,
        status: sessionStatus,
        user,
    } = useHarborSession();
    const loadControllerRef = useRef(null);
    const routeMode = route.params?.mode;
    const mode = COMPOSER_MODES.has(routeMode) ? routeMode : 'newTopic';
    const isNewTopic = mode === 'newTopic';
    const isReply = mode === 'reply';
    const isEdit = mode === 'edit';
    const supportsImages = isNewTopic || isReply;
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
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [composerSettings, setComposerSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(
        isEdit || supportsImages,
    );
    const [loadError, setLoadError] = useState('');
    const [publishRestriction, setPublishRestriction] = useState('');
    const [editMetadata, setEditMetadata] = useState({});
    const isEditingFirstPost =
        isEdit &&
        Number(
            editMetadata.postNumber ??
            editMetadata.post_number ??
            routePostNumber,
        ) === 1;

    const loadComposerData = useCallback(async () => {
        if (sessionStatus !== 'signedIn') {
            return;
        }

        loadControllerRef.current?.abort();
        const controller = new AbortController();
        loadControllerRef.current = controller;
        setLoadError('');
        setPublishRestriction('');
        setIsLoading(true);

        try {
            if (isNewTopic) {
                const [
                    categoryResult,
                    tagResult,
                    settingsResult,
                ] = await Promise.all([
                    fetchHarborCategories({signal: controller.signal}),
                    fetchHarborTags({signal: controller.signal}),
                    fetchHarborComposerSettings({
                        signal: controller.signal,
                    }),
                ]);
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
                    fetchHarborComposerSettings({
                        signal: controller.signal,
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
                setRaw(postRaw);
                setOriginalText(
                    String(post.originalText ?? post.original_text ?? postRaw),
                );
                setTitle(post.title || route.params?.topicTitle || '');
                setEditMetadata(post);
            }
        } catch (error) {
            if (!controller.signal.aborted) {
                setLoadError(getComposerErrorMessage(error, t));
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
                loadControllerRef.current = null;
            }
        }
    }, [
        isEdit,
        isNewTopic,
        isReply,
        route.params?.postId,
        route.params?.fromDraftBox,
        route.params?.topicId,
        route.params?.topicTitle,
        sessionStatus,
        t,
    ]);

    useEffect(() => {
        loadComposerData();
        return () => {
            loadControllerRef.current?.abort();
        };
    }, [loadComposerData]);

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
        isEdit,
        isEditingFirstPost,
        isLoading,
        isNewTopic,
        isReply,
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
        requiresCategory,
        routePostNumber,
        selectedCategory,
        selectedTagNames,
        selectedTags,
        sessionStatus,
        setCategoryId,
        setLoadError,
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
