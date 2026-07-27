import React, {
    useCallback,
    useEffect,
    useRef,
} from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import Toast from 'react-native-simple-toast';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import {useTheme} from '../../../components/ThemeContext';
import {openLink} from '../../../utils/browser';
import {
    ARK_HARBOR_NEW_TOPIC,
    MARKDOWN_BASIC_SYNTAX_URL,
} from '../../../utils/pathMap';
import {trigger} from '../../../utils/trigger';
import HarborComposerForm from './composer/HarborComposerForm';
import {useHarborComposer} from './composer/useHarborComposer';
import {useHarborDraft} from './composer/useHarborDraft';
import {useHarborComposerImages} from './composer/useHarborComposerImages';
import {useHarborComposerSubmit} from './composer/useHarborComposerSubmit';

const HarborComposerPage = ({route, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const categorySheetRef = useRef(null);
    const tagSheetRef = useRef(null);
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

    useEffect(() => {
        navigation.setOptions({
            headerTitle: isNewTopic
                ? t('建立話題')
                : isReply
                    ? t('回覆話題')
                    : t('編輯貼文'),
        });
    }, [isNewTopic, isReply, navigation, t]);

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
    } = useHarborComposerImages({composerSettings, t});

    const {
        clearDraftAfterPublish,
        draftKey,
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
    }, [login, setLoadError, t]);

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

    if (isLoading || isDraftLoading) {
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
            onSelectCategory={handleSelectCategory}
            route={route}
            submit={{
                handleSubmit,
                isPostLengthValid,
                isSubmitDisabled,
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
