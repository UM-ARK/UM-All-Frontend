import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import Toast from 'react-native-simple-toast';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import {useTheme} from '../../../components/ThemeContext';
import {openLink} from '../../../utils/browser';
import {deleteHarborPost} from '../../../utils/harbor/harborApi';
import {publishHarborTopicUpdate} from '../../../utils/harbor/harborTopicUpdates';
import {
    ARK_HARBOR_NEW_TOPIC,
    MARKDOWN_BASIC_SYNTAX_URL,
} from '../../../utils/pathMap';
import {trigger} from '../../../utils/trigger';
import HarborComposerForm from './composer/HarborComposerForm';
import HarborReplyComposerForm, {
    HarborReplyComposerState,
} from './composer/HarborReplyComposerForm';
import {useHarborComposer} from './composer/useHarborComposer';
import {useHarborDraft} from './composer/useHarborDraft';
import {useHarborComposerImages} from './composer/useHarborComposerImages';
import {useHarborComposerSubmit} from './composer/useHarborComposerSubmit';

const HarborComposerPage = ({route, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const categorySheetRef = useRef(null);
    const tagSheetRef = useRef(null);
    const deletingRef = useRef(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const {
        allTags,
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
        user,
        visibleTextLength,
    } = useHarborComposer({route, t});

    const {
        images,
        hasReachedImageLimit,
        hasUnreadyImages,
        handleAddImages,
        handleRemoveImage,
        handleRetryImage,
        isPreparingImages,
        isUploadingImages,
        restoreDraftImages,
        uploadImages,
    } = useHarborComposerImages({composerSettings, t});

    const {
        clearDraftAfterPublish,
        discardDraftAndExit,
        draftKey,
        hasDraftContent,
        isDraftLoading,
    } = useHarborDraft({
        categories,
        categoryId,
        editMetadata,
        images,
        isComposerLoading: isLoading,
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
        tags: allTags,
        title,
        user,
    });

    const handleDiscard = useCallback(() => {
        trigger();
        Alert.alert(
            t('捨棄這次修改？'),
            t('這次修改不會保存。'),
            [
                {
                    text: t('取消'),
                    style: 'cancel',
                    onPress: trigger,
                },
                {
                    text: t('捨棄'),
                    style: 'destructive',
                    onPress: async () => {
                        trigger();
                        try {
                            await discardDraftAndExit();
                            Toast.show(t('草稿已放棄。'));
                        } catch {
                            Toast.show(
                                t('草稿放棄失敗，請稍後再試。'),
                            );
                        }
                    },
                },
            ],
        );
    }, [discardDraftAndExit, t]);

    useEffect(() => {
        const shouldShowDiscard =
            sessionStatus === 'signedIn' &&
            !isLoading &&
            !isDraftLoading &&
            !loadError &&
            hasDraftContent;
        navigation.setOptions({
            headerTitle: isNewTopic
                ? t('發佈話題')
                : isReply
                    ? t('回覆話題')
                    : t('編輯貼文'),
            headerRight: shouldShowDiscard
                ? () => (
                    <Pressable
                        accessibilityLabel={t('捨棄這次修改')}
                        accessibilityRole="button"
                        hitSlop={scale(8)}
                        onPress={handleDiscard}
                        style={({pressed}) => [
                            styles.discardButton,
                            pressed && {opacity: 0.6},
                        ]}>
                        <Text
                            style={[
                                styles.discardButtonText,
                                {color: theme.unread},
                            ]}>
                            {t('捨棄')}
                        </Text>
                    </Pressable>
                )
                : undefined,
        });
    }, [
        handleDiscard,
        hasDraftContent,
        isDraftLoading,
        isLoading,
        isNewTopic,
        isReply,
        loadError,
        navigation,
        sessionStatus,
        t,
        theme.unread,
    ]);

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

    // 點擊回覆／編輯上下文：從話題詳情進入則返回；從草稿箱進入則跳到對應樓層
    const handlePressContext = useCallback(() => {
        trigger();
        if (!route.params?.fromDraftBox) {
            if (navigation.canGoBack()) {
                navigation.goBack();
            }
            return;
        }

        const topicId = Number(route.params?.topicId);
        if (!Number.isInteger(topicId) || topicId <= 0) {
            return;
        }

        const targetPostNumber = isEdit
            ? Number(
                editMetadata.postNumber ??
                editMetadata.post_number ??
                routePostNumber,
            )
            : Number(route.params?.replyToPostNumber);

        navigation.navigate('HarborTopicDetail', {
            topicId,
            topicTitle: route.params?.topicTitle || title,
            ...(Number.isInteger(targetPostNumber) &&
            targetPostNumber > 0
                ? {postNumber: targetPostNumber}
                : null),
        });
    }, [
        editMetadata.postNumber,
        editMetadata.post_number,
        isEdit,
        navigation,
        route.params?.fromDraftBox,
        route.params?.replyToPostNumber,
        route.params?.topicId,
        route.params?.topicTitle,
        routePostNumber,
        title,
    ]);

    const handleLogin = useCallback(async () => {
        trigger();
        setLoadError('');
        try {
            await login({
                routeName: 'HarborComposer',
                params: route.params,
            });
        } catch {
            const message = t('Harbor 登入失敗，請稍後再試。');
            setLoadError(message);
            Toast.show(message);
        }
    }, [login, route.params, setLoadError, t]);

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

    const handlePending = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleDeletePost = useCallback(() => {
        trigger();
        const postNumber = Number(
            editMetadata.postNumber ??
            editMetadata.post_number ??
            route.params?.postNumber,
        );
        const topicId = Number(
            editMetadata.topicId ??
            editMetadata.topic_id ??
            route.params?.topicId,
        );
        const isFirstPost = postNumber === 1;
        Alert.alert(
            isFirstPost
                ? t('刪除整個話題？')
                : t('刪除這篇帖子？'),
            isFirstPost
                ? t('刪除後，這個話題將無法再瀏覽。')
                : t('刪除後，其他人將無法再看到這篇帖子。'),
            [
                {
                    text: t('取消'),
                    style: 'cancel',
                    onPress: trigger,
                },
                {
                    text: t('刪除'),
                    style: 'destructive',
                    onPress: async () => {
                        trigger();
                        if (deletingRef.current) {
                            return;
                        }
                        deletingRef.current = true;
                        setIsDeleting(true);
                        try {
                            await deleteHarborPost(route.params?.postId);
                            publishHarborTopicUpdate(topicId, {
                                reloadLists: true,
                                ...(isFirstPost
                                    ? {removeFromLists: true}
                                    : {}),
                            });
                            await clearDraftAfterPublish().catch(() => null);
                            Toast.show(
                                isFirstPost
                                    ? t('話題已刪除')
                                    : t('帖子已刪除'),
                            );
                            if (isFirstPost) {
                                if (
                                    !route.params?.fromDraftBox &&
                                    typeof navigation.pop === 'function'
                                ) {
                                    navigation.pop(2);
                                } else {
                                    navigation.goBack();
                                }
                                return;
                            }
                            const params = {
                                topicId,
                                topicTitle:
                                    title || route.params?.topicTitle,
                                postNumber: Math.max(postNumber - 1, 1),
                                composerRefreshAt: Date.now(),
                            };
                            if (route.params?.fromDraftBox) {
                                navigation.replace(
                                    'HarborTopicDetail',
                                    params,
                                );
                            } else {
                                navigation.popTo(
                                    'HarborTopicDetail',
                                    params,
                                    {merge: true},
                                );
                            }
                        } catch (error) {
                            const serverErrors =
                                error?.response?.data?.errors;
                            const serverMessage = Array.isArray(serverErrors)
                                ? serverErrors.join(' ')
                                : serverErrors ||
                                error?.response?.data?.error;
                            Toast.show(
                                serverMessage ||
                                (error?.response?.status === 403
                                    ? t(
                                        '你目前沒有權限刪除這篇帖子。',
                                    )
                                    : t('刪除失敗，請稍後再試。')),
                            );
                        } finally {
                            deletingRef.current = false;
                            setIsDeleting(false);
                        }
                    },
                },
            ],
        );
    }, [
        clearDraftAfterPublish,
        editMetadata.postNumber,
        editMetadata.post_number,
        editMetadata.topicId,
        editMetadata.topic_id,
        navigation,
        route.params?.fromDraftBox,
        route.params?.postId,
        route.params?.postNumber,
        route.params?.topicId,
        route.params?.topicTitle,
        t,
        title,
    ]);

    const {
        handleSubmit,
        isPostLengthValid,
        isSubmitDisabled,
        isSubmitting,
        rawLength,
        submitError,
    } = useHarborComposerSubmit({
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
        onLogin: handleLogin,
        onPending: handlePending,
        onPublished: clearDraftAfterPublish,
        onSuccess: showTopicResult,
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
        draftKey,
    });

    const handleSelectCategory = useCallback(item => {
        setCategoryId(Number(item.id));
        categorySheetRef.current?.close();
    }, [setCategoryId]);

    const openCategorySheet = useCallback(() => {
        trigger();
        Keyboard.dismiss();
        categorySheetRef.current?.expand();
    }, []);

    const openTagSheet = useCallback(() => {
        trigger();
        Keyboard.dismiss();
        tagSheetRef.current?.expand();
    }, []);

    const closeReplyComposer = useCallback(() => {
        trigger();
        Keyboard.dismiss();
        navigation.goBack();
    }, [navigation]);

    if (
        sessionStatus === 'restoring' ||
        sessionStatus === 'authorizing'
    ) {
        if (isReply) {
            return (
                <HarborReplyComposerState
                    description={t('正在確認 Harbor 登入狀態…')}
                    isLoading
                    onClose={closeReplyComposer}
                />
            );
        }
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
        if (isReply) {
            return (
                <HarborReplyComposerState
                    actionLabel={t('登入 Harbor')}
                    description={
                        loadError ||
                        t('登入後可建立話題、回覆及編輯自己的貼文。')
                    }
                    icon="account-lock-outline"
                    onAction={handleLogin}
                    onClose={closeReplyComposer}
                    title={t('登入後即可使用 Harbor Composer')}
                />
            );
        }
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

    if (isLoading || isDraftLoading) {
        if (isReply) {
            return (
                <HarborReplyComposerState
                    description={t('正在準備 Composer…')}
                    isLoading
                    onClose={closeReplyComposer}
                />
            );
        }
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
        if (isReply) {
            return (
                <HarborReplyComposerState
                    actionLabel={t('重試')}
                    description={loadError}
                    icon="cloud-alert-outline"
                    onAction={() => {
                        trigger();
                        loadComposerData();
                    }}
                    onClose={closeReplyComposer}
                    title={t('Composer 載入失敗')}
                />
            );
        }
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
                    disabled={isRetryBlocked}
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
                            opacity: isRetryBlocked ? 0.5 : 1,
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

    if (isReply) {
        return (
            <HarborReplyComposerForm
                composer={{
                    composerSettings,
                    maximumPostLength,
                    raw,
                    setRaw,
                    visibleTextLength,
                }}
                imagesState={{
                    handleAddImages,
                    handleRemoveImage,
                    handleRetryImage,
                    hasReachedImageLimit,
                    images,
                    isPreparingImages,
                    isUploadingImages,
                }}
                onClose={closeReplyComposer}
                route={route}
                submit={{
                    handleSubmit,
                    isPostLengthValid,
                    isSubmitDisabled,
                    isSubmitting,
                    submitError,
                }}
            />
        );
    }

    return (
        <HarborComposerForm
            categorySheetRef={categorySheetRef}
            composer={{
                categories,
                categoryId,
                composerSettings,
                editMetadata,
                isEdit,
                isEditingFirstPost,
                isNewTopic,
                isReply,
                isTagCountValid,
                isTitleLengthValid,
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
            }}
            imagesState={{
                handleAddImages,
                handleRemoveImage,
                handleRetryImage,
                hasReachedImageLimit,
                images,
                isPreparingImages,
                isUploadingImages,
            }}
            onOpenCategorySheet={openCategorySheet}
            onOpenMarkdownGuide={handleOpenMarkdownGuide}
            onOpenTagSheet={openTagSheet}
            onOpenWebComposer={handleOpenWebComposer}
            onPressContext={handlePressContext}
            onPressDelete={handleDeletePost}
            onSelectCategory={handleSelectCategory}
            route={route}
            submit={{
                handleSubmit,
                isPostLengthValid,
                isDeleting,
                isSubmitDisabled: isSubmitDisabled || isDeleting,
                isSubmitting,
                rawLength,
                submitError,
            }}
            tagSheetRef={tagSheetRef}
        />
    );
};

const styles = StyleSheet.create({
    centeredState: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(28),
    },
    discardButton: {
        paddingHorizontal: scale(6),
        paddingVertical: verticalScale(6),
    },
    discardButtonText: {
        fontSize: scale(14),
        fontWeight: '600',
    },
    inlineErrorText: {
        flex: 1,
        fontSize: scale(12),
        lineHeight: scale(18),
        textAlign: 'center',
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
});

export default HarborComposerPage;
