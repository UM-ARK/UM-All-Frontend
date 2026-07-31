import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useContext,
} from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {HeaderHeightContext} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {useFocusEffect} from '@react-navigation/native';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import Toast from 'react-native-simple-toast';
import {useTranslation} from 'react-i18next';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {useHarborSession} from '../../../contexts/HarborSessionContext';
import {fetchHarborDrafts} from '../../../utils/harbor/harborApi';
import {
    deleteHarborComposerDraft,
    flushPendingHarborDraftDeletes,
    getHarborDraftAccountId,
    getLocalHarborDrafts,
    getPendingHarborDraftDeletes,
    mergeHarborDrafts,
} from '../../../utils/harbor/harborDrafts';
import {trigger} from '../../../utils/trigger';

const DRAFT_ICONS = {
    edit: 'file-edit-outline',
    newTopic: 'note-plus-outline',
    reply: 'reply-outline',
};

const getDraftLabel = (mode, t) => {
    if (mode === 'newTopic') {
        return t('新話題草稿');
    }
    if (mode === 'edit') {
        return t('編輯草稿');
    }
    return t('回覆草稿');
};

const getDraftContext = draft => {
    const data = draft.data || {};
    const appContext = data.appContext || {};
    return {
        title:
            draft.mode === 'newTopic'
                ? data.title
                : appContext.topicTitle || data.topicTitle,
        excerpt: String(data.appText ?? data.reply ?? '')
            .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
            .replace(/\s+/g, ' ')
            .trim(),
        topicId: Number(appContext.topicId ?? data.topicId) || null,
        topicTitle: appContext.topicTitle || data.topicTitle || '',
        postId: Number(data.postId) || null,
        postNumber: Number(appContext.postNumber) || null,
        replyToPostNumber:
            Number(
                data.reply_to_post_number ??
                appContext.replyToPostNumber,
            ) || null,
        categoryId: Number(data.categoryId) || null,
    };
};

const HarborDraftsPage = ({
    navigation,
    embedded = false,
    contentBottomInset = verticalScale(40),
    contentTopInset = 0,
    onProfileRefresh,
    onScroll,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const headerHeight = useContext(HeaderHeightContext) || 0;
    const {
        login,
        status: sessionStatus,
        user,
    } = useHarborSession();
    const controllerRef = useRef(null);
    const [drafts, setDrafts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');
    const accountId = getHarborDraftAccountId(user);

    useEffect(() => {
        if (!embedded) {
            navigation.setOptions({headerTitle: t('草稿箱')});
        }
    }, [embedded, navigation, t]);

    // iOS 26 液態玻璃透明導覽列：內容需手動避開 header
    const pageStyle = useMemo(
        () => [
            styles.container,
            {
                backgroundColor: embedded
                    ? theme.white
                    : theme.bg_color,
                paddingTop:
                    !embedded && isLiquidGlassSupported ? headerHeight : 0,
            },
        ],
        [embedded, headerHeight, theme.bg_color, theme.white],
    );

    const loadDrafts = useCallback(async ({refreshing = false} = {}) => {
        if (sessionStatus !== 'signedIn') {
            setDrafts([]);
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setLoadError('');
        if (refreshing) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const [
                localDrafts,
                pendingDeletes,
            ] = await Promise.all([
                getLocalHarborDrafts(accountId),
                getPendingHarborDraftDeletes(accountId),
            ]);
            let remoteDrafts = [];
            try {
                const result = await fetchHarborDrafts({
                    signal: controller.signal,
                });
                remoteDrafts = result.items;
            } catch {
                if (!controller.signal.aborted) {
                    setLoadError(
                        t('Harbor 草稿暫時無法同步，已顯示本機草稿。'),
                    );
                }
            }
            if (!controller.signal.aborted) {
                setDrafts(
                    mergeHarborDrafts(
                        localDrafts,
                        remoteDrafts,
                        pendingDeletes,
                    ),
                );
                flushPendingHarborDraftDeletes(accountId).catch(() => null);
            }
        } catch {
            if (!controller.signal.aborted) {
                setLoadError(t('草稿載入失敗，請稍後再試。'));
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
                setIsRefreshing(false);
                controllerRef.current = null;
            }
        }
    }, [accountId, sessionStatus, t]);

    useFocusEffect(
        useCallback(() => {
            loadDrafts();
            return () => controllerRef.current?.abort();
        }, [loadDrafts]),
    );

    const openDraft = useCallback(
        draft => {
            trigger();
            const context = getDraftContext(draft);
            const composerParams = {
                mode: draft.mode,
                draftKey: draft.draftKey,
                fromDraftBox: true,
                categoryId: context.categoryId,
                topicId: context.topicId,
                topicTitle: context.topicTitle,
                postId: context.postId,
                postNumber: context.postNumber,
                replyToPostNumber: context.replyToPostNumber,
            };
            if (draft.mode === 'reply' && context.topicId) {
                navigation.navigate('HarborTopicDetail', {
                    topicId: context.topicId,
                    topicTitle: context.topicTitle,
                    postNumber:
                        context.replyToPostNumber ||
                        context.postNumber ||
                        1,
                    pendingReplyDraft: composerParams,
                });
                return;
            }
            navigation.navigate('HarborComposer', composerParams);
        },
        [navigation],
    );

    const confirmDeleteDraft = useCallback(
        draft => {
            trigger();
            Alert.alert(
                t('放棄草稿？'),
                t('刪除後將無法復原。'),
                [
                    {
                        text: t('取消'),
                        style: 'cancel',
                        onPress: trigger,
                    },
                    {
                        text: t('放棄'),
                        style: 'destructive',
                        onPress: async () => {
                            trigger();
                            setDrafts(current =>
                                current.filter(
                                    item =>
                                        item.draftKey !== draft.draftKey,
                                ),
                            );
                            try {
                                const deleted =
                                    await deleteHarborComposerDraft(
                                        accountId,
                                        draft.draftKey,
                                        draft.sequence,
                                    );
                                if (!deleted && !accountId) {
                                    throw new Error(
                                        'Harbor draft deletion failed',
                                    );
                                }
                                Toast.show(t('草稿已放棄。'));
                            } catch {
                                setDrafts(current =>
                                    current.some(
                                        item =>
                                            item.draftKey ===
                                            draft.draftKey,
                                    )
                                        ? current
                                        : [draft, ...current],
                                );
                                Toast.show(
                                    t('草稿放棄失敗，請稍後再試。'),
                                );
                            }
                        },
                    },
                ],
            );
        },
        [accountId, t],
    );

    const renderDraft = useCallback(
        ({item}) => {
            const context = getDraftContext(item);
            const updatedAt = new Date(item.updatedAt);
            const timeLabel = Number.isNaN(updatedAt.getTime())
                ? ''
                : updatedAt.toLocaleString();
            return (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => openDraft(item)}
                    style={({pressed}) => [
                        styles.draftCard,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary08
                                : theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    <View
                        style={[
                            styles.draftIcon,
                            {backgroundColor: theme.tonal.primary15},
                        ]}>
                        <MaterialCommunityIcons
                            name={DRAFT_ICONS[item.mode]}
                            size={scale(22)}
                            color={theme.themeColor}
                        />
                    </View>
                    <View style={styles.draftContent}>
                        <Text
                            style={[
                                styles.draftType,
                                {color: theme.themeColor},
                            ]}>
                            {getDraftLabel(item.mode, t)}
                        </Text>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.draftTitle,
                                {color: theme.black.main},
                            ]}>
                            {context.title || t('未命名草稿')}
                        </Text>
                        <Text
                            numberOfLines={2}
                            style={[
                                styles.draftExcerpt,
                                {color: theme.black.third},
                            ]}>
                            {context.excerpt || t('只有圖片或設定內容')}
                        </Text>
                        {timeLabel ? (
                            <Text
                                style={[
                                    styles.draftTime,
                                    {color: theme.black.third},
                                ]}>
                                {timeLabel}
                            </Text>
                        ) : null}
                    </View>
                    <Pressable
                        accessibilityLabel={t('放棄草稿')}
                        accessibilityRole="button"
                        hitSlop={scale(8)}
                        onPress={event => {
                            event.stopPropagation();
                            confirmDeleteDraft(item);
                        }}
                        style={({pressed}) => [
                            styles.deleteButton,
                            pressed && {
                                backgroundColor: theme.tonal.unread15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="delete-outline"
                            size={scale(21)}
                            color={theme.unread}
                        />
                    </Pressable>
                </Pressable>
            );
        },
        [confirmDeleteDraft, openDraft, t, theme],
    );

    if (
        sessionStatus === 'restoring' ||
        sessionStatus === 'authorizing'
    ) {
        return (
            <View
                style={[
                    styles.centered,
                    {
                        backgroundColor: embedded
                            ? theme.white
                            : theme.bg_color,
                    },
                ]}>
                <ActivityIndicator size="large" color={theme.themeColor} />
                <Text
                    style={[
                        styles.stateText,
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
                    styles.centered,
                    {
                        backgroundColor: embedded
                            ? theme.white
                            : theme.bg_color,
                    },
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
                    {t('登入後查看草稿箱')}
                </Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        trigger();
                        login({
                            routeName: 'HarborDrafts',
                        }).catch(() => {
                            Toast.show(
                                t('Harbor 登入失敗，請稍後再試。'),
                            );
                        });
                    }}
                    style={({pressed}) => [
                        styles.loginButton,
                        {
                            backgroundColor: pressed
                                ? theme.themeColorLight
                                : theme.themeColor,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.loginButtonText,
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
                    styles.centered,
                    {
                        backgroundColor: embedded
                            ? theme.white
                            : theme.bg_color,
                    },
                ]}>
                <ActivityIndicator size="large" color={theme.themeColor} />
                <Text
                    style={[
                        styles.stateText,
                        {color: theme.black.third},
                    ]}>
                    {t('正在載入草稿…')}
                </Text>
            </View>
        );
    }

    return (
        <View style={pageStyle}>
            {loadError ? (
                <View
                    style={[
                        styles.warning,
                        {
                            backgroundColor: theme.tonal.unread15,
                            borderColor: theme.tonal.unread30,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.warningText,
                            {color: theme.black.second},
                        ]}>
                        {loadError}
                    </Text>
                </View>
            ) : null}
            <View
                style={[
                    styles.storageNotice,
                    {
                        backgroundColor: theme.tonal.primary08,
                        borderColor: theme.themeColorUltraLight,
                    },
                ]}>
                <MaterialCommunityIcons
                    name="cellphone-information"
                    size={scale(18)}
                    color={theme.themeColor}
                />
                <Text
                    style={[
                        styles.storageNoticeText,
                        {color: theme.black.second},
                    ]}>
                    {t(
                        '本機草稿只保存在此裝置；清除 App 快取或重新安裝會失去草稿。',
                    )}
                </Text>
            </View>
            <FlashList
                data={drafts}
                keyExtractor={item => item.draftKey}
                renderItem={renderDraft}
                contentContainerStyle={[
                    styles.listContent,
                    {
                        paddingBottom: contentBottomInset,
                        paddingTop:
                            contentTopInset + verticalScale(12),
                    },
                ]}
                contentInsetAdjustmentBehavior={
                    embedded || isLiquidGlassSupported ? 'never' : 'automatic'
                }
                refreshing={isRefreshing}
                progressViewOffset={contentTopInset}
                onRefresh={() => {
                    trigger();
                    loadDrafts({refreshing: true});
                    onProfileRefresh?.();
                }}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons
                            name="file-document-outline"
                            size={scale(42)}
                            color={theme.black.third}
                        />
                        <Text
                            style={[
                                styles.stateTitle,
                                {color: theme.black.main},
                            ]}>
                            {t('草稿箱是空的')}
                        </Text>
                        <Text
                            style={[
                                styles.stateText,
                                {color: theme.black.third},
                            ]}>
                            {t('離開 Composer 時，有內容的草稿會自動保存在這裡。')}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    centered: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(28),
    },
    container: {
        flex: 1,
    },
    deleteButton: {
        alignItems: 'center',
        borderRadius: scale(17),
        height: scale(34),
        justifyContent: 'center',
        width: scale(34),
    },
    draftCard: {
        alignItems: 'flex-start',
        borderRadius: scale(16),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        gap: scale(11),
        marginBottom: verticalScale(10),
        padding: scale(13),
    },
    draftContent: {
        flex: 1,
        minWidth: 0,
    },
    draftExcerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: scale(17),
        marginTop: verticalScale(5),
    },
    draftIcon: {
        alignItems: 'center',
        borderRadius: scale(13),
        height: scale(42),
        justifyContent: 'center',
        width: scale(42),
    },
    draftTime: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(7),
    },
    draftTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '700',
        marginTop: verticalScale(2),
    },
    draftType: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
    },
    emptyState: {
        alignItems: 'center',
        minHeight: verticalScale(360),
        justifyContent: 'center',
        paddingHorizontal: scale(28),
    },
    listContent: {
        padding: scale(14),
        paddingBottom: verticalScale(40),
    },
    loginButton: {
        borderRadius: scale(12),
        marginTop: verticalScale(20),
        paddingHorizontal: scale(26),
        paddingVertical: verticalScale(12),
    },
    loginButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
    stateText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        lineHeight: scale(20),
        marginTop: verticalScale(10),
        textAlign: 'center',
    },
    stateTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '700',
        marginTop: verticalScale(14),
        textAlign: 'center',
    },
    storageNotice: {
        alignItems: 'center',
        borderRadius: scale(11),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        gap: scale(8),
        marginHorizontal: scale(14),
        marginTop: verticalScale(10),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(9),
    },
    storageNoticeText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(11),
        lineHeight: scale(16),
    },
    warning: {
        borderRadius: scale(11),
        borderWidth: StyleSheet.hairlineWidth,
        marginHorizontal: scale(14),
        marginTop: verticalScale(10),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(9),
    },
    warningText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: scale(16),
    },
});

export default HarborDraftsPage;
