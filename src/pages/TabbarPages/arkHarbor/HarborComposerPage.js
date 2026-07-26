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
import {useHarborSession} from '../../../contexts/HarborSessionContext';
import CustomBottomSheet from '../../../utils/BottomSheet';
import {
    createHarborPost,
    fetchHarborCategories,
    fetchHarborPostForEdit,
    fetchHarborTags,
    updateHarborPost,
} from '../../../utils/harbor/harborApi';
import {
    buildHarborCategoryRows,
    getHarborCategoryKey,
} from '../../../utils/harbor/harborCategories';
import {getHarborRateLimitDelayMs} from '../../../utils/harbor/harborRateLimit';
import {publishHarborTopicUpdate} from '../../../utils/harbor/harborTopicUpdates';
import {trigger} from '../../../utils/trigger';
import {
    applyHarborComposerFormat,
    getHarborComposerResult,
} from './harborComposerText';
import HarborCategoryIcon from './components/HarborCategoryIcon';

const COMPOSER_MODES = new Set(['newTopic', 'reply', 'edit']);

const FORMAT_ACTIONS = [
    {key: 'bold', icon: 'format-bold', label: '粗體'},
    {key: 'italic', icon: 'format-italic', label: '斜體'},
    {key: 'link', icon: 'link-variant', label: '連結'},
    {key: 'quote', icon: 'format-quote-close', label: '引用'},
    {key: 'code', icon: 'code-tags', label: '行內程式碼'},
];

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

const HarborComposerPage = ({route, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const {login, status: sessionStatus} = useHarborSession();
    const inputRef = useRef(null);
    const categorySheetRef = useRef(null);
    const tagSheetRef = useRef(null);
    const loadControllerRef = useRef(null);
    const submittingRef = useRef(false);
    const routeMode = route.params?.mode;
    const mode = COMPOSER_MODES.has(routeMode) ? routeMode : 'newTopic';
    const isNewTopic = mode === 'newTopic';
    const isReply = mode === 'reply';
    const isEdit = mode === 'edit';
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
    const [selection, setSelection] = useState({
        start: initialRaw.length,
        end: initialRaw.length,
    });
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [isLoading, setIsLoading] = useState(isEdit);
    const [loadError, setLoadError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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
                const [categoryResult, tagResult] = await Promise.all([
                    fetchHarborCategories({signal: controller.signal}),
                    fetchHarborTags({signal: controller.signal}),
                ]);
                if (controller.signal.aborted) {
                    return;
                }
                setCategories(categoryResult.items || []);
                setTags(
                    (tagResult.items || []).filter(tag => !tag.pmOnly),
                );
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
                setSelection({
                    start: postRaw.length,
                    end: postRaw.length,
                });
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
    const categoryRows = useMemo(
        () => buildHarborCategoryRows(categories, collapsedCategoryIds),
        [categories, collapsedCategoryIds],
    );
    const selectedTagNames = useMemo(
        () => selectedTags.map(tag => tag.name).filter(Boolean),
        [selectedTags],
    );
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

    const applyFormat = useCallback(format => {
        const result = applyHarborComposerFormat(
            raw,
            selection,
            format,
            {linkLabel: t('連結文字')},
        );
        setRaw(result.text);
        setSelection(result.selection);
        inputRef.current?.focus();
    }, [raw, selection, t]);

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
        if ((isNewTopic || isEditingFirstPost) && !title.trim()) {
            return t('請輸入話題標題。');
        }
        if (isNewTopic && categoryId == null) {
            return t('請選擇話題分類。');
        }
        if (!raw.trim()) {
            return t('請輸入正文。');
        }
        return '';
    }, [
        categoryId,
        isEditingFirstPost,
        isNewTopic,
        raw,
        t,
        title,
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
                    raw,
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
        setSelectedTags(current => {
            const itemName = String(item.name);
            return current.some(tag => String(tag.name) === itemName)
                ? current.filter(tag => String(tag.name) !== itemName)
                : [...current, item];
        });
    }, []);

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
                        <Text
                            style={[
                                styles.fieldLabel,
                                {color: theme.black.second},
                            ]}>
                            {t('標題')}
                        </Text>
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
                            <Text
                                style={[
                                    styles.fieldLabel,
                                    {color: theme.black.second},
                                ]}>
                                {t('標籤')}
                            </Text>
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
                        <Text
                            style={[
                                styles.fieldLabel,
                                {color: theme.black.second},
                            ]}>
                            {t('正文')}
                        </Text>
                        <Text
                            style={[
                                styles.markdownLabel,
                                {color: theme.black.third},
                            ]}>
                            {t('Markdown')}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.formatToolbar,
                            {
                                backgroundColor: theme.tonal.primary08,
                                borderColor: theme.themeColorUltraLight,
                            },
                        ]}>
                        {FORMAT_ACTIONS.map(action => (
                            <Pressable
                                accessibilityLabel={t(action.label)}
                                accessibilityRole="button"
                                key={action.key}
                                onPress={() => {
                                    trigger();
                                    applyFormat(action.key);
                                }}
                                style={({pressed}) => [
                                    styles.formatButton,
                                    pressed && {
                                        backgroundColor:
                                            theme.tonal.primary30,
                                    },
                                ]}>
                                <MaterialCommunityIcons
                                    name={action.icon}
                                    size={scale(20)}
                                    color={theme.themeColor}
                                />
                            </Pressable>
                        ))}
                    </View>
                    <TextInput
                        accessibilityLabel={t('正文')}
                        autoCapitalize="sentences"
                        multiline
                        onChangeText={setRaw}
                        onSelectionChange={event =>
                            setSelection(event.nativeEvent.selection)
                        }
                        placeholder={t('使用 Markdown 輸入正文…')}
                        placeholderTextColor={theme.black.third}
                        ref={inputRef}
                        selection={selection}
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
                    accessibilityState={{disabled: isSubmitting}}
                    disabled={isSubmitting}
                    onPress={handleSubmit}
                    style={({pressed}) => [
                        styles.submitButton,
                        {
                            backgroundColor: isSubmitting
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
    formatButton: {
        alignItems: 'center',
        borderRadius: scale(8),
        height: scale(36),
        justifyContent: 'center',
        width: scale(42),
    },
    formatToolbar: {
        borderRadius: scale(10),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: scale(4),
        paddingVertical: verticalScale(4),
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
    markdownLabel: {
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
});

export default HarborComposerPage;
