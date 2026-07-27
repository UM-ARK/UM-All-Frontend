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
} from '../../../../utils/harbor/harborApi';
import {getComposerErrorMessage} from './harborComposerErrors';
import {
    COMPOSER_MODES,
    getEditPost,
} from './harborComposerModels';

export function useHarborComposer({route, t}) {
    const {login, status: sessionStatus} = useHarborSession();
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
                    if (currentCategoryId != null) {
                        return currentCategoryId;
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
                const settingsResult =
                    await fetchHarborComposerSettings({
                        signal: controller.signal,
                    });
                if (controller.signal.aborted) {
                    return;
                }
                setComposerSettings(settingsResult);
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
        originalText,
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
        tags,
        title,
        titleLength,
        visibleTextLength,
    };
}
