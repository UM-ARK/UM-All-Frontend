import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {useHeaderHeight} from '@react-navigation/elements';
import {File} from 'expo-file-system';
import {Image} from 'expo-image';
import {
    ImageManipulator,
    SaveFormat,
} from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import {
    KeyboardAwareScrollView,
    KeyboardToolbar,
} from 'react-native-keyboard-controller';
import Toast from 'react-native-simple-toast';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';

import {useTheme} from '../../../components/ThemeContext';
import SimpleProgressBar from '../../../components/SimpleProgressBar';
import {useHarborSession} from '../../../contexts/HarborSessionContext';
import CustomBottomSheet from '../../../utils/BottomSheet';
import {openLink} from '../../../utils/browser';
import {
    createHarborPost,
    fetchHarborCategories,
    fetchHarborComposerSettings,
    fetchHarborPostForEdit,
    fetchHarborTags,
    updateHarborPost,
    uploadHarborComposerImage,
} from '../../../utils/harbor/harborApi';
import {
    buildHarborCategoryRows,
    getHarborCategoryKey,
} from '../../../utils/harbor/harborCategories';
import {getHarborRateLimitDelayMs} from '../../../utils/harbor/harborRateLimit';
import {publishHarborTopicUpdate} from '../../../utils/harbor/harborTopicUpdates';
import {
    ARK_HARBOR_NEW_TOPIC,
    MARKDOWN_BASIC_SYNTAX_URL,
} from '../../../utils/pathMap';
import {trigger} from '../../../utils/trigger';
import {
    buildHarborComposerRaw,
    getHarborComposerResult,
} from './harborComposerText';
import HarborCategoryIcon from './components/HarborCategoryIcon';

const COMPOSER_MODES = new Set(['newTopic', 'reply', 'edit']);
const MAX_IMAGES_PER_POST = 6;
const MAX_CONCURRENT_IMAGE_UPLOADS = 3;
const MAX_COMPRESSED_IMAGE_DIMENSION = 2048;
const IMAGE_COMPRESSION_QUALITY = 0.82;

async function compressComposerImage(asset, imageId) {
    const context = ImageManipulator.manipulate(asset.uri);
    const width = Number(asset.width) || 0;
    const height = Number(asset.height) || 0;

    if (Math.max(width, height) > MAX_COMPRESSED_IMAGE_DIMENSION) {
        context.resize(
            width >= height
                ? {width: MAX_COMPRESSED_IMAGE_DIMENSION}
                : {height: MAX_COMPRESSED_IMAGE_DIMENSION},
        );
    }

    const renderedImage = await context.renderAsync();
    const compressedImage = await renderedImage.saveAsync({
        compress: IMAGE_COMPRESSION_QUALITY,
        format: SaveFormat.JPEG,
    });
    const compressedFile = new File(compressedImage.uri);
    const originalName = asset.fileName || `image_${imageId}`;
    const fileName = originalName.replace(/\.[^.]+$/, '') + '.jpg';

    return {
        localUri: compressedImage.uri,
        fileName,
        mimeType: 'image/jpeg',
        fileSize: compressedFile.size,
    };
}

function getServerErrorMessage(error) {
    const data = error?.response?.data;
    const errors = data?.errors;

    if (Array.isArray(errors)) {
        return errors.filter(Boolean).join('\n');
    }
    if (typeof errors === 'string') {
        return errors;
    }
    if (typeof data?.error === 'string') {
        return data.error;
    }
    if (typeof data?.message === 'string') {
        return data.message;
    }
    return '';
}

function getComposerErrorMessage(error, t) {
    const status = error?.response?.status;
    const serverMessage = getServerErrorMessage(error);

    if (error?.code === 'INVALID_HARBOR_POST_RESULT') {
        return t('Harbor 沒有返回新貼文位置，請重新載入話題確認。');
    }
    if (status === 401) {
        return t('Harbor 登入已失效，請重新登入。');
    }
    if (status === 403) {
        return (
            serverMessage ||
            t('你目前沒有權限發布或編輯這篇內容。')
        );
    }
    if (status === 409) {
        return (
            serverMessage ||
            t('這篇內容已在其他地方更新，請重新載入後再編輯。')
        );
    }
    if (status === 422) {
        return (
            serverMessage ||
            t('Harbor 無法接受這篇內容，請檢查標題、分類、標籤及正文。')
        );
    }
    if (status === 429) {
        const seconds = Math.max(
            1,
            Math.ceil(getHarborRateLimitDelayMs(error) / 1000),
        );
        return serverMessage || t('操作太頻繁，請在 {{count}} 秒後再試。', {
            count: seconds,
        });
    }
    if (!error?.response) {
        return t('無法連接 Harbor，請檢查網絡後再試。');
    }
    return serverMessage || t('發布失敗，請稍後再試。');
}

function getEditPost(result) {
    return result?.post || result?.data?.post || result?.data || result || {};
}

function getUploadErrorMessage(error, t) {
    const serverMessage = getServerErrorMessage(error);

    if (error?.response?.status === 413) {
        return t('圖片檔案太大，請選擇較小的圖片。');
    }
    if (error?.response?.status === 422) {
        return serverMessage || t('Harbor 無法接受這張圖片。');
    }
    if (!error?.response) {
        return t('圖片上傳失敗，請檢查網絡後重試。');
    }
    return serverMessage || t('圖片上傳失敗，請稍後再試。');
}

const HarborComposerPage = ({route, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const {login, status: sessionStatus} = useHarborSession();
    const categorySheetRef = useRef(null);
    const tagSheetRef = useRef(null);
    const loadControllerRef = useRef(null);
    const uploadControllersRef = useRef(new Map());
    const uploadQueueRef = useRef([]);
    const activeUploadCountRef = useRef(0);
    const drainUploadQueueRef = useRef(null);
    const submittingRef = useRef(false);
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
    const [images, setImages] = useState([]);
    const [originalText, setOriginalText] = useState('');
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [composerSettings, setComposerSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(
        isEdit || supportsImages,
    );
    const [loadError, setLoadError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPreparingImages, setIsPreparingImages] = useState(false);
    const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(
        () => new Set(),
    );
    const [editMetadata, setEditMetadata] = useState({});
    const isEditingFirstPost =
        isEdit &&
        Number(
            editMetadata.postNumber ??
            editMetadata.post_number ??
            routePostNumber,
        ) === 1;

    useEffect(() => {
        navigation.setOptions({
            headerTitle: isNewTopic
                ? t('建立話題')
                : isReply
                    ? t('回覆話題')
                    : t('編輯貼文'),
        });
    }, [isNewTopic, isReply, navigation, t]);

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

    useEffect(() => {
        const uploadControllers = uploadControllersRef.current;
        return () => {
            uploadQueueRef.current = [];
            drainUploadQueueRef.current = null;
            uploadControllers.forEach(controller => controller.abort());
            uploadControllers.clear();
        };
    }, []);

    const selectedCategory = useMemo(
        () => categories.find(item => Number(item.id) === Number(categoryId)),
        [categories, categoryId],
    );
    const categoryRows = useMemo(
        () => buildHarborCategoryRows(categories, collapsedCategoryIds),
        [categories, collapsedCategoryIds],
    );
    const selectedTagNames = useMemo(
        () => selectedTags.map(tag => tag.name).filter(Boolean),
        [selectedTags],
    );
    const titleLength = title.trim().length;
    const composedRaw = supportsImages
        ? buildHarborComposerRaw(raw, images)
        : raw;
    const rawLength = composedRaw.trim().length;
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
    const maximumConcurrentUploads = Math.max(
        1,
        Math.min(
            MAX_CONCURRENT_IMAGE_UPLOADS,
            composerSettings?.simultaneousUploads ??
                MAX_CONCURRENT_IMAGE_UPLOADS,
        ),
    );
    const hasUnreadyImages = images.some(
        image => image.status !== 'uploaded',
    );
    const isUploadingImages = images.some(
        image =>
            image.status === 'pending' ||
            image.status === 'uploading',
    );
    const hasReachedImageLimit =
        images.length >= MAX_IMAGES_PER_POST;
    const isTitleLengthValid =
        titleLength >= minimumTitleLength &&
        (maximumTitleLength == null ||
            titleLength <= maximumTitleLength);
    const isPostLengthValid =
        rawLength >= minimumPostLength &&
        (maximumPostLength == null || rawLength <= maximumPostLength);
    const isTagCountValid =
        selectedTags.length >= minimumTagCount &&
        (maximumTagCount == null ||
            selectedTags.length <= maximumTagCount);
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

    const uploadImage = useCallback(async image => {
        if (uploadControllersRef.current.has(image.id)) {
            return;
        }
        const controller = new AbortController();
        uploadControllersRef.current.set(image.id, controller);
        setImages(current =>
            current.map(item =>
                item.id === image.id
                    ? {
                        ...item,
                        progress: 0,
                        status: 'uploading',
                        error: '',
                    }
                    : item,
            ),
        );

        try {
            const upload = await uploadHarborComposerImage(
                {
                    uri: image.localUri,
                    fileName: image.fileName,
                    mimeType: image.mimeType,
                },
                {
                    signal: controller.signal,
                    onUploadProgress: event => {
                        const progress = event.total
                            ? event.loaded / event.total
                            : 0;
                        setImages(current =>
                            current.map(item =>
                                item.id === image.id
                                    ? {...item, progress}
                                    : item,
                            ),
                        );
                    },
                },
            );
            setImages(current =>
                current.map(item =>
                    item.id === image.id
                        ? {
                            ...item,
                            uploadId: upload.id,
                            shortUrl: upload.shortUrl,
                            progress: 1,
                            status: 'uploaded',
                        }
                        : item,
                ),
            );
        } catch (error) {
            if (controller.signal.aborted) {
                return;
            }
            setImages(current =>
                current.map(item =>
                    item.id === image.id
                        ? {
                            ...item,
                            status: 'failed',
                            error: getUploadErrorMessage(error, t),
                        }
                        : item,
                ),
            );
        } finally {
            uploadControllersRef.current.delete(image.id);
        }
    }, [t]);

    const drainUploadQueue = useCallback(() => {
        while (
            activeUploadCountRef.current <
                maximumConcurrentUploads &&
            uploadQueueRef.current.length > 0
        ) {
            const image = uploadQueueRef.current.shift();
            activeUploadCountRef.current += 1;
            uploadImage(image).finally(() => {
                activeUploadCountRef.current = Math.max(
                    0,
                    activeUploadCountRef.current - 1,
                );
                drainUploadQueueRef.current?.();
            });
        }
    }, [maximumConcurrentUploads, uploadImage]);

    useEffect(() => {
        drainUploadQueueRef.current = drainUploadQueue;
        drainUploadQueue();
        return () => {
            drainUploadQueueRef.current = null;
        };
    }, [drainUploadQueue]);

    const enqueueImages = useCallback(nextImages => {
        const queuedIds = new Set(
            uploadQueueRef.current.map(image => image.id),
        );
        const imagesToQueue = nextImages.filter(
            image =>
                !queuedIds.has(image.id) &&
                !uploadControllersRef.current.has(image.id),
        );
        if (imagesToQueue.length === 0) {
            return;
        }

        setImages(current =>
            current.map(image =>
                imagesToQueue.some(item => item.id === image.id)
                    ? {
                        ...image,
                        progress: 0,
                        status: 'pending',
                        error: '',
                    }
                    : image,
            ),
        );
        uploadQueueRef.current.push(...imagesToQueue);
        drainUploadQueue();
    }, [drainUploadQueue]);

    const handleAddImages = useCallback(async () => {
        trigger();
        Keyboard.dismiss();

        if (hasReachedImageLimit) {
            Toast.show(
                t('每篇貼文最多只能加入 {{count}} 張圖片。', {
                    count: MAX_IMAGES_PER_POST,
                }),
            );
            return;
        }

        try {
            const permission =
                await ImagePicker.getMediaLibraryPermissionsAsync();
            let permissionStatus = permission.status;
            if (permissionStatus !== 'granted') {
                const result =
                    await ImagePicker.requestMediaLibraryPermissionsAsync();
                permissionStatus = result.status;
            }
            if (permissionStatus !== 'granted') {
                Toast.show(t('請允許相片權限後再新增圖片。'));
                return;
            }

            const selectionLimit =
                MAX_IMAGES_PER_POST - images.length;
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                allowsMultipleSelection: true,
                orderedSelection: true,
                quality: 1,
                selectionLimit,
            });
            if (result.canceled) {
                return;
            }

            setIsPreparingImages(true);
            const maxImageBytes = composerSettings?.maxImageSizeKb == null
                ? null
                : composerSettings.maxImageSizeKb * 1024;
            const selectedAt = Date.now();
            const selectedAssets = result.assets.slice(
                0,
                selectionLimit,
            );
            const nextImages = [];
            let oversizedImageCount = 0;
            let compressionFailureCount = 0;

            for (let index = 0; index < selectedAssets.length; index += 1) {
                const asset = selectedAssets[index];
                const imageId = `${selectedAt}-${index}`;
                try {
                    const compressedImage =
                        await compressComposerImage(asset, imageId);
                    if (
                        maxImageBytes != null &&
                        compressedImage.fileSize > maxImageBytes
                    ) {
                        oversizedImageCount += 1;
                        continue;
                    }
                    nextImages.push({
                        id: imageId,
                        ...compressedImage,
                        progress: 0,
                        status: 'pending',
                    });
                } catch {
                    compressionFailureCount += 1;
                }
            }

            if (result.assets.length > selectionLimit) {
                Toast.show(
                    t('每篇貼文最多只能加入 {{count}} 張圖片。', {
                        count: MAX_IMAGES_PER_POST,
                    }),
                );
            }
            if (oversizedImageCount > 0) {
                Toast.show(
                    t('{{count}} 張圖片超過 Harbor 的大小限制。', {
                        count: oversizedImageCount,
                    }),
                );
            }
            if (compressionFailureCount > 0) {
                Toast.show(
                    t('{{count}} 張圖片處理失敗，請重新選擇。', {
                        count: compressionFailureCount,
                    }),
                );
            }
            if (nextImages.length === 0) {
                return;
            }

            setImages(current => [...current, ...nextImages]);
            enqueueImages(nextImages);
        } catch {
            Toast.show(t('無法開啟相片圖庫，請稍後再試。'));
        } finally {
            setIsPreparingImages(false);
        }
    }, [
        composerSettings,
        enqueueImages,
        hasReachedImageLimit,
        images.length,
        t,
    ]);

    const handleRemoveImage = useCallback(imageId => {
        trigger();
        uploadQueueRef.current = uploadQueueRef.current.filter(
            image => image.id !== imageId,
        );
        uploadControllersRef.current.get(imageId)?.abort();
        uploadControllersRef.current.delete(imageId);
        setImages(current =>
            current.filter(image => image.id !== imageId),
        );
    }, []);

    const handleRetryImage = useCallback(image => {
        trigger();
        enqueueImages([image]);
    }, [enqueueImages]);

    const handleOpenWebComposer = useCallback(() => {
        trigger();
        openLink({URL: ARK_HARBOR_NEW_TOPIC, mode: 'fullScreen'});
    }, []);

    const handleOpenMarkdownGuide = useCallback(() => {
        trigger();
        openLink({
            URL: MARKDOWN_BASIC_SYNTAX_URL,
            mode: 'fullScreen',
        });
    }, []);

    const handleLogin = useCallback(async () => {
        trigger();
        setLoadError('');
        try {
            await login();
        } catch {
            const message = t('Harbor 登入失敗，請稍後再試。');
            setLoadError(message);
            Toast.show(message);
        }
    }, [login, t]);

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

    const showTopicResult = useCallback(
        (resultTopicId, resultPostNumber) => {
            const params = {
                topicId: resultTopicId,
                topicTitle: title || route.params?.topicTitle,
                postNumber: resultPostNumber,
            };
            if (isNewTopic || typeof navigation.popTo !== 'function') {
                navigation.replace('HarborTopicDetail', params);
                return;
            }
            navigation.popTo(
                'HarborTopicDetail',
                {
                    ...params,
                    composerRefreshAt: Date.now(),
                },
                {merge: true},
            );
        },
        [
            isNewTopic,
            navigation,
            route.params?.topicTitle,
            title,
        ],
    );

    const handleSubmit = useCallback(async () => {
        trigger();
        if (submittingRef.current) {
            return;
        }
        if (sessionStatus !== 'signedIn') {
            await handleLogin();
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
                navigation.goBack();
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
            showTopicResult(resultTopicId, resultPostNumber);
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
                showTopicResult(resultTopicId, resultPostNumber);
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
        handleLogin,
        isEdit,
        isEditingFirstPost,
        isNewTopic,
        isReply,
        navigation,
        originalText,
        raw,
        route.params,
        selectedTags,
        sessionStatus,
        showTopicResult,
        t,
        title,
        validateForm,
    ]);

    const handleSelectCategory = useCallback(item => {
        setCategoryId(Number(item.id));
        categorySheetRef.current?.close();
    }, []);

    const handleToggleCategory = useCallback(item => {
        const categoryKey = getHarborCategoryKey(item);
        setCollapsedCategoryIds(current => {
            const next = new Set(current);
            if (next.has(categoryKey)) {
                next.delete(categoryKey);
            } else {
                next.add(categoryKey);
            }
            return next;
        });
    }, []);

    const openCategorySheet = useCallback(() => {
        trigger();
        Keyboard.dismiss();
        setCollapsedCategoryIds(new Set());
        categorySheetRef.current?.expand();
    }, []);

    const renderCategoryItem = useCallback(
        ({item}) => {
            const selected = Number(item.id) === Number(categoryId);
            return (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{selected}}
                    onPress={() => {
                        trigger();
                        handleSelectCategory(item);
                    }}
                    style={({pressed}) => [
                        styles.optionRow,
                        item.depth > 0
                            ? {
                                paddingLeft: scale(
                                    18 + item.depth * 18,
                                ),
                            }
                            : null,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary15
                                : selected
                                    ? theme.tonal.primary08
                                    : theme.white,
                            borderBottomColor:
                                theme.themeColorUltraLight,
                        },
                    ]}>
                    <HarborCategoryIcon
                        category={item}
                        color={
                            selected
                                ? theme.themeColor
                                : theme.black.second
                        }
                        size={scale(18)}
                        style={styles.optionCategoryIcon}
                    />
                    <Text
                        numberOfLines={2}
                        style={[
                            styles.optionLabel,
                            {
                                color: selected
                                    ? theme.themeColor
                                    : theme.black.main,
                            },
                        ]}>
                        {item.name}
                    </Text>
                    {item.hasChildren ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{
                                expanded: item.isExpanded,
                            }}
                            accessibilityLabel={t(
                                item.isExpanded
                                    ? '收起 {{name}} 的子分類'
                                    : '展開 {{name}} 的子分類',
                                {name: item.name},
                            )}
                            hitSlop={scale(8)}
                            onPress={event => {
                                event.stopPropagation?.();
                                trigger();
                                handleToggleCategory(item);
                            }}
                            style={({pressed}) => [
                                styles.optionToggle,
                                pressed && {
                                    backgroundColor:
                                        theme.tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name={
                                    item.isExpanded
                                        ? 'chevron-up'
                                        : 'chevron-down'
                                }
                                size={scale(20)}
                                color={theme.themeColor}
                            />
                        </Pressable>
                    ) : null}
                    {selected ? (
                        <MaterialCommunityIcons
                            name="check"
                            size={scale(20)}
                            color={theme.themeColor}
                        />
                    ) : null}
                </Pressable>
            );
        },
        [
            categoryId,
            handleSelectCategory,
            handleToggleCategory,
            t,
            theme,
        ],
    );

    const handleToggleTag = useCallback(item => {
        const itemName = String(item.name);
        if (
            selectedTags.some(tag => String(tag.name) === itemName)
        ) {
            setSelectedTags(current =>
                current.filter(tag => String(tag.name) !== itemName),
            );
            return;
        }
        if (
            maximumTagCount != null &&
            selectedTags.length >= maximumTagCount
        ) {
            Toast.show(
                t('每個話題最多只能選擇 {{count}} 個標籤。', {
                    count: maximumTagCount,
                }),
            );
            return;
        }
        setSelectedTags(current => [...current, item]);
    }, [maximumTagCount, selectedTags, t]);

    const openTagSheet = useCallback(() => {
        trigger();
        Keyboard.dismiss();
        tagSheetRef.current?.expand();
    }, []);

    const renderTagItem = useCallback(
        ({item}) => {
            const selected = selectedTags.some(
                tag => String(tag.name) === String(item.name),
            );
            return (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{selected}}
                    onPress={() => {
                        trigger();
                        handleToggleTag(item);
                    }}
                    style={({pressed}) => [
                        styles.optionRow,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary15
                                : selected
                                    ? theme.tonal.primary08
                                    : theme.white,
                            borderBottomColor:
                                theme.themeColorUltraLight,
                        },
                    ]}>
                    <Text
                        numberOfLines={2}
                        style={[
                            styles.optionLabel,
                            {
                                color: selected
                                    ? theme.themeColor
                                    : theme.black.main,
                            },
                        ]}>
                        {`#${item.name}`}
                    </Text>
                    {selected ? (
                        <MaterialCommunityIcons
                            name="check"
                            size={scale(20)}
                            color={theme.themeColor}
                        />
                    ) : null}
                </Pressable>
            );
        },
        [handleToggleTag, selectedTags, theme],
    );

    if (
        sessionStatus === 'restoring' ||
        sessionStatus === 'authorizing'
    ) {
        return (
            <View
                style={[
                    styles.centeredState,
                    {backgroundColor: theme.bg_color},
                ]}>
                <ActivityIndicator size="large" color={theme.themeColor} />
                <Text
                    style={[
                        styles.stateDescription,
                        {color: theme.black.third},
                    ]}>
                    {t('正在確認 Harbor 登入狀態…')}
                </Text>
            </View>
        );
    }

    if (sessionStatus !== 'signedIn') {
        return (
            <View
                style={[
                    styles.centeredState,
                    {backgroundColor: theme.bg_color},
                ]}>
                <MaterialCommunityIcons
                    name="account-lock-outline"
                    size={scale(42)}
                    color={theme.themeColor}
                />
                <Text
                    style={[
                        styles.stateTitle,
                        {color: theme.black.main},
                    ]}>
                    {t('登入後即可使用 Harbor Composer')}
                </Text>
                <Text
                    style={[
                        styles.stateDescription,
                        {color: theme.black.third},
                    ]}>
                    {t('登入後可建立話題、回覆及編輯自己的貼文。')}
                </Text>
                {loadError ? (
                    <Text
                        style={[
                            styles.inlineErrorText,
                            {color: theme.unread},
                        ]}>
                        {loadError}
                    </Text>
                ) : null}
                <Pressable
                    accessibilityRole="button"
                    onPress={handleLogin}
                    style={({pressed}) => [
                        styles.primaryButton,
                        {
                            backgroundColor: pressed
                                ? theme.themeColorLight
                                : theme.themeColor,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.primaryButtonText,
                            {color: theme.trueWhite},
                        ]}>
                        {t('登入 Harbor')}
                    </Text>
                </Pressable>
            </View>
        );
    }

    if (isLoading) {
        return (
            <View
                style={[
                    styles.centeredState,
                    {backgroundColor: theme.bg_color},
                ]}>
                <ActivityIndicator size="large" color={theme.themeColor} />
                <Text
                    style={[
                        styles.stateDescription,
                        {color: theme.black.third},
                    ]}>
                    {isEdit
                        ? t('正在載入貼文…')
                        : t('正在準備 Composer…')}
                </Text>
            </View>
        );
    }

    if (loadError) {
        return (
            <View
                style={[
                    styles.centeredState,
                    {backgroundColor: theme.bg_color},
                ]}>
                <MaterialCommunityIcons
                    name="cloud-alert-outline"
                    size={scale(42)}
                    color={theme.unread}
                />
                <Text
                    style={[
                        styles.stateTitle,
                        {color: theme.black.main},
                    ]}>
                    {t('Composer 載入失敗')}
                </Text>
                <Text
                    style={[
                        styles.stateDescription,
                        {color: theme.black.third},
                    ]}>
                    {loadError}
                </Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        trigger();
                        loadComposerData();
                    }}
                    style={({pressed}) => [
                        styles.secondaryButton,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary30
                                : theme.tonal.primary15,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.secondaryButtonText,
                            {color: theme.themeColor},
                        ]}>
                        {t('重試')}
                    </Text>
                </Pressable>
            </View>
        );
    }

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
                    <View
                        style={[
                            styles.contextCard,
                            {
                                backgroundColor: theme.tonal.primary08,
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
                    </View>
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
                            {composerSettings ? (
                                <Text
                                    style={[
                                        styles.requirementCounter,
                                        {
                                            color: isTitleLengthValid
                                                ? theme.success
                                                : theme.unread,
                                        },
                                    ]}>
                                    {`${titleLength}/${maximumTitleLength ?? '—'}`}
                                </Text>
                            ) : null}
                        </View>
                        <TextInput
                            accessibilityLabel={t('話題標題')}
                            autoCapitalize="sentences"
                            onChangeText={setTitle}
                            placeholder={t('輸入清楚的話題標題')}
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
                                onPress={openCategorySheet}
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
                                onPress={openTagSheet}
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
                                onPress={handleOpenMarkdownGuide}
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
                        {composerSettings ? (
                            <Text
                                style={[
                                    styles.requirementCounter,
                                    {
                                        color: isPostLengthValid
                                            ? theme.success
                                            : theme.unread,
                                    },
                                ]}>
                                {`${supportsImages ? visibleTextLength : rawLength}/${maximumPostLength ?? '—'}`}
                            </Text>
                        ) : null}
                    </View>
                    <TextInput
                        accessibilityLabel={t('內容')}
                        autoCapitalize="sentences"
                        multiline
                        onChangeText={setRaw}
                        placeholder={t('分享你的想法…')}
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
                                                            : t('正在上傳…')}
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
                                onPress={handleOpenWebComposer}
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
                        disabled:
                            isSubmitting ||
                            isPreparingImages ||
                            isUploadingImages,
                    }}
                    disabled={
                        isSubmitting ||
                        isPreparingImages ||
                        isUploadingImages
                    }
                    onPress={handleSubmit}
                    style={({pressed}) => [
                        styles.submitButton,
                        {
                            backgroundColor:
                                isSubmitting ||
                                isPreparingImages ||
                                isUploadingImages
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
                        {isSubmitting
                            ? t('正在提交…')
                            : isPreparingImages
                                ? t('正在處理圖片…')
                                : isUploadingImages
                                    ? t('正在上傳圖片…')
                                : isEdit
                                    ? t('儲存修改')
                                    : isReply
                                        ? t('發布回覆')
                                        : t('建立話題')}
                    </Text>
                </Pressable>
            </KeyboardAwareScrollView>

            <KeyboardToolbar />

            <CustomBottomSheet
                ref={categorySheetRef}
                bottomInset={insets.bottom}
                enablePanDownToClose
                page="harborComposer">
                <View
                    style={[
                        styles.modalHeader,
                        {borderBottomColor: theme.themeColorUltraLight},
                    ]}>
                    <Text
                        style={[
                            styles.modalTitle,
                            {color: theme.black.main},
                        ]}>
                        {t('選擇分類')}
                    </Text>
                    <Pressable
                        accessibilityLabel={t('完成')}
                        accessibilityRole="button"
                        onPress={() => {
                            trigger();
                            categorySheetRef.current?.close();
                        }}
                        style={({pressed}) => [
                            styles.modalDoneButton,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary30
                                    : theme.tonal.primary15,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.modalDoneText,
                                {color: theme.themeColor},
                            ]}>
                            {t('完成')}
                        </Text>
                    </Pressable>
                </View>
                {categoryRows.length > 0 ? (
                    <BottomSheetFlatList
                        data={categoryRows}
                        keyExtractor={item => String(item.id ?? item.name)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={renderCategoryItem}
                    />
                ) : (
                    <View style={styles.modalEmptyState}>
                        <Text
                            style={[
                                styles.secondaryText,
                                {color: theme.black.third},
                            ]}>
                            {t('目前沒有可選項目')}
                        </Text>
                    </View>
                )}
            </CustomBottomSheet>

            <CustomBottomSheet
                ref={tagSheetRef}
                bottomInset={insets.bottom}
                enablePanDownToClose
                page="harborComposer">
                <View
                    style={[
                        styles.modalHeader,
                        {borderBottomColor: theme.themeColorUltraLight},
                    ]}>
                    <Text
                        style={[
                            styles.modalTitle,
                            {color: theme.black.main},
                        ]}>
                        {t('選擇標籤')}
                    </Text>
                    <Pressable
                        accessibilityLabel={t('完成')}
                        accessibilityRole="button"
                        onPress={() => {
                            trigger();
                            tagSheetRef.current?.close();
                        }}
                        style={({pressed}) => [
                            styles.modalDoneButton,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary30
                                    : theme.tonal.primary15,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.modalDoneText,
                                {color: theme.themeColor},
                            ]}>
                            {t('完成')}
                        </Text>
                    </Pressable>
                </View>
                {tags.length > 0 ? (
                    <BottomSheetFlatList
                        data={tags}
                        keyExtractor={item => String(item.name)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={renderTagItem}
                    />
                ) : (
                    <View style={styles.modalEmptyState}>
                        <Text
                            style={[
                                styles.secondaryText,
                                {color: theme.black.third},
                            ]}>
                            {t('目前沒有可選項目')}
                        </Text>
                    </View>
                )}
            </CustomBottomSheet>
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
    centeredState: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(28),
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
    modalDoneButton: {
        borderRadius: scale(8),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(7),
    },
    modalDoneText: {
        fontSize: scale(13),
        fontWeight: '600',
    },
    modalEmptyState: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    modalHeader: {
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(12),
    },
    modalTitle: {
        fontSize: scale(17),
        fontWeight: '700',
    },
    optionLabel: {
        flex: 1,
        fontSize: scale(14),
    },
    optionCategoryIcon: {
        marginRight: scale(10),
    },
    optionRow: {
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        minHeight: verticalScale(50),
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(10),
    },
    optionToggle: {
        alignItems: 'center',
        borderRadius: scale(8),
        height: scale(32),
        justifyContent: 'center',
        marginLeft: scale(4),
        width: scale(32),
    },
    primaryButton: {
        borderRadius: scale(12),
        marginTop: verticalScale(20),
        paddingHorizontal: scale(26),
        paddingVertical: verticalScale(12),
    },
    primaryButtonText: {
        fontSize: scale(14),
        fontWeight: '700',
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
    secondaryButton: {
        borderRadius: scale(12),
        marginTop: verticalScale(16),
        paddingHorizontal: scale(24),
        paddingVertical: verticalScale(11),
    },
    secondaryButtonText: {
        fontSize: scale(14),
        fontWeight: '600',
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
    stateDescription: {
        fontSize: scale(13),
        lineHeight: scale(20),
        marginTop: verticalScale(10),
        textAlign: 'center',
    },
    stateTitle: {
        fontSize: scale(18),
        fontWeight: '700',
        marginTop: verticalScale(14),
        textAlign: 'center',
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

export default HarborComposerPage;
