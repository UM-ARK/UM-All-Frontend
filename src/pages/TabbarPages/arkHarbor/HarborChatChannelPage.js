import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useFocusEffect} from '@react-navigation/native';
import {useHeaderHeight} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {KeyboardStickyView} from 'react-native-keyboard-controller';
import moment from 'moment-timezone';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Text from '../../../components/AppText';
import TextInput from '../../../components/AppTextInput';
import HyperlinkText from '../../../components/HyperlinkText';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {useHarborSession} from '../../../contexts/HarborSessionContext';
import {splitArkAppLinkContent} from '../../../utils/appLinks';
import {
    fetchHarborChatMessages,
    markHarborChatChannelRead,
    sendHarborChatMessage,
} from '../../../utils/harbor/harborApi';
import {mergeHarborChatMessages} from '../../../utils/harbor/harborChat';
import {
    getHarborChatMessagesCacheKey,
    patchHarborChatChannelMessagesCache,
    patchHarborChatMessagesCache,
    readHarborChatMessagesCache,
    writeHarborChatMessagesCache,
} from '../../../utils/harbor/harborChatQueries';
import {trigger} from '../../../utils/trigger';
import {HarborFullState} from './components/HarborListStates';

const CHAT_POLL_INTERVAL_MS = 8000;

const HarborChatProfileButton = ({
    accessibilityLabel,
    onPress,
    themeColor,
}) => (
    <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={() => {
            trigger();
            onPress();
        }}
        style={styles.headerProfileButton}>
        <MaterialCommunityIcons
            color={themeColor}
            name="account-circle-outline"
            size={scale(22)}
        />
    </Pressable>
);

const createHarborChatProfileButton = props => () => (
    <HarborChatProfileButton {...props} />
);

const getHarborChatPeerUsername = ({
    channelUsers,
    currentUsername,
    isGroup,
    messages,
}) => {
    const users = Array.isArray(channelUsers) ? channelUsers : [];
    const others = users.filter(
        candidate =>
            candidate?.username &&
            candidate.username !== currentUsername,
    );
    if (others.length === 1) {
        return others[0].username;
    }
    if (isGroup || others.length > 1) {
        return '';
    }
    const otherMessage = messages.find(
        message =>
            message?.user?.username &&
            message.user.username !== currentUsername,
    );
    return otherMessage?.user?.username || '';
};

const formatMessageTime = (value, language) => {
    const date = moment(value);
    if (!date.isValid()) {
        return '';
    }
    const now = moment();
    const isEnglish = String(language).toLowerCase().startsWith('en');
    if (date.isSame(now, 'day')) {
        return date.format('HH:mm');
    }
    if (date.isSame(now, 'year')) {
        return isEnglish
            ? date.format('M/D HH:mm')
            : date.format('M月D日 HH:mm');
    }
    return date.format('YYYY/M/D HH:mm');
};

const MessageAvatar = ({user}) => {
    const {theme} = useTheme();
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [user.avatarUrl]);

    if (user.avatarUrl && !failed) {
        return (
            <Image
                contentFit="cover"
                onError={() => setFailed(true)}
                placeholder={theme.imagePlaceholder}
                placeholderContentFit="cover"
                source={{uri: user.avatarUrl}}
                style={styles.messageAvatar}
                transition={160}
            />
        );
    }

    return (
        <View
            style={[
                styles.messageAvatar,
                styles.avatarFallback,
                {backgroundColor: theme.tonal.primary15},
            ]}>
            <MaterialCommunityIcons
                color={theme.themeColor}
                name="account"
                size={scale(20)}
            />
        </View>
    );
};

const getArkAppLinkCardContent = (appLink, t) => {
    switch (appLink.type) {
        case 'course':
            return {
                description: t('查看課程資料、班別與時間'),
                icon: 'book-open-page-variant-outline',
                label: t('ARK ALL · 課程'),
                title: appLink.params.courseCode,
            };
        case 'club':
            return {
                description: t('查看社團資料與活動'),
                icon: 'account-group-outline',
                label: t('ARK ALL · 社團'),
                title: t('社團 #{{id}}', {id: appLink.params.clubNum}),
            };
        case 'event':
            return {
                description: t('查看校園活動詳情'),
                icon: 'calendar-star',
                label: t('ARK ALL · 活動'),
                title: t('校園活動'),
            };
        case 'harborTopic':
            return {
                description: t('查看 Harbor 帖子與回覆'),
                icon: 'forum-outline',
                label: t('ARK ALL · Harbor'),
                title: t('Harbor 帖子 #{{id}}', {
                    id: appLink.params.topicId,
                }),
            };
        case 'team':
            return {
                description: t('查看活動詳情與共享課表'),
                icon: 'calendar-account-outline',
                label: t('ARK ALL · 組隊約時間'),
                title: t('組隊活動'),
            };
        default:
            return null;
    }
};

const ArkAppLinkCard = ({appLink, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const content = getArkAppLinkCardContent(appLink, t);

    if (!content) {
        return null;
    }

    return (
        <Pressable
            accessibilityHint={t('在 ARK ALL 內開啟')}
            accessibilityLabel={`${content.label}，${content.title}`}
            accessibilityRole="link"
            onPress={() => {
                trigger();
                navigation.navigate(appLink.routeName, appLink.params);
            }}
            style={({pressed}) => [
                styles.appLinkCard,
                {
                    backgroundColor: theme.white,
                    borderColor: theme.themeColorUltraLight,
                    opacity: pressed ? 0.72 : 1,
                },
            ]}>
            <View
                style={[
                    styles.appLinkIcon,
                    {backgroundColor: theme.tonal.primary15},
                ]}>
                <MaterialCommunityIcons
                    color={theme.themeColor}
                    name={content.icon}
                    size={scale(22)}
                />
            </View>
            <View style={styles.appLinkContent}>
                <Text
                    numberOfLines={1}
                    style={[styles.appLinkLabel, {color: theme.themeColor}]}>
                    {content.label}
                </Text>
                <Text
                    numberOfLines={1}
                    style={[styles.appLinkTitle, {color: theme.black.main}]}>
                    {content.title}
                </Text>
                <Text
                    numberOfLines={2}
                    style={[styles.appLinkDescription, {color: theme.black.third}]}>
                    {content.description}
                </Text>
            </View>
            <MaterialCommunityIcons
                color={theme.black.third}
                name="chevron-right"
                size={scale(19)}
            />
        </Pressable>
    );
};

const HarborChatMessage = ({isGroup, isOwn, language, message, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const content = message.deleted
        ? t('此訊息已刪除')
        : message.content;
    const parts = message.deleted
        ? [{type: 'text', content}]
        : splitArkAppLinkContent(content);

    return (
        <View
            style={[
                styles.messageRow,
                isOwn && styles.messageRowOwn,
            ]}>
            {!isOwn ? <MessageAvatar user={message.user} /> : null}
            <View
                style={[
                    styles.messageColumn,
                    isOwn && styles.messageColumnOwn,
                ]}>
                {!isOwn && isGroup ? (
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.messageAuthor,
                            {color: theme.black.third},
                        ]}>
                        {message.user.displayName || message.user.username}
                    </Text>
                ) : null}
                <View
                    style={[
                        styles.messageParts,
                        isOwn && styles.messagePartsOwn,
                    ]}>
                    {parts.map((part, index) => part.type === 'appLink' ? (
                        <ArkAppLinkCard
                            appLink={part.appLink}
                            key={`${part.type}-${index}`}
                            navigation={navigation}
                        />
                    ) : (
                        <View
                            key={`${part.type}-${index}`}
                            style={[
                                styles.bubble,
                                {
                                    backgroundColor: isOwn
                                        ? theme.themeColor
                                        : theme.tonal.primary15,
                                },
                            ]}>
                            <HyperlinkText
                                linkStyle={[
                                    styles.messageLink,
                                    {
                                        color: isOwn
                                            ? theme.trueWhite
                                            : theme.themeColor,
                                    },
                                ]}
                                navigation={navigation}>
                                <Text
                                    selectable
                                    style={[
                                        styles.messageText,
                                        {
                                            color: isOwn
                                                ? theme.trueWhite
                                                : message.deleted
                                                    ? theme.black.third
                                                    : theme.black.main,
                                        },
                                    ]}>
                                    {part.content}
                                </Text>
                            </HyperlinkText>
                        </View>
                    ))}
                </View>
                <Text
                    style={[
                        styles.messageTime,
                        {color: theme.black.third},
                    ]}>
                    {formatMessageTime(message.createdAt, language)}
                    {message.edited ? ` · ${t('已編輯')}` : ''}
                </Text>
            </View>
        </View>
    );
};

const HarborChatChannelPage = ({navigation, route}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('harbor');
    const {user} = useHarborSession();
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const listRef = useRef(null);
    const initialScrollRef = useRef(false);
    const initialTargetMessageRef = useRef(Number(route.params?.messageId) || null);
    const lastMarkedReadRef = useRef(0);
    const loadingRef = useRef(false);
    const channelId = Number(route.params?.channelId);
    const isGroup = Boolean(route.params?.isGroup);
    const initialTargetMessageId = Number(route.params?.messageId) || null;
    const initialCacheKey = getHarborChatMessagesCacheKey(
        user?.username,
        channelId,
        initialTargetMessageId,
    );
    const initialCachedResultRef = useRef();
    if (initialCachedResultRef.current === undefined) {
        initialCachedResultRef.current =
            readHarborChatMessagesCache(initialCacheKey) || null;
    }
    const initialCachedResult = initialCachedResultRef.current;
    const currentCacheKeyRef = useRef(initialCacheKey);
    const messagesRef = useRef(initialCachedResult?.items || []);
    const hasCachedResultRef = useRef(Boolean(initialCachedResult));
    const [messages, setMessages] = useState(initialCachedResult?.items || []);
    const [draft, setDraft] = useState('');
    const [canLoadMorePast, setCanLoadMorePast] = useState(
        Boolean(initialCachedResult?.canLoadMorePast),
    );
    const [isLoading, setIsLoading] = useState(!initialCachedResult);
    const [isLoadingPast, setIsLoadingPast] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(false);
    const username = user?.username || '';
    const cacheIdentityRef = useRef(`${username}:${channelId}`);
    const peerUsername = useMemo(
        () =>
            getHarborChatPeerUsername({
                channelUsers: route.params?.channelUsers,
                currentUsername: username,
                isGroup,
                messages,
            }),
        [isGroup, messages, route.params?.channelUsers, username],
    );

    const openPeerProfile = useCallback(() => {
        if (!peerUsername) {
            return;
        }
        navigation.navigate('HarborProfile', {
            username: peerUsername,
            mode: 'preview',
        });
    }, [navigation, peerUsername]);

    const patchCachedMessages = useCallback(
        updater => patchHarborChatChannelMessagesCache(
            username,
            channelId,
            updater,
        ),
        [channelId, username],
    );

    const updateMessages = useCallback(
        updater => {
            setMessages(current => {
                const nextMessages =
                    typeof updater === 'function' ? updater(current) : updater;
                messagesRef.current = nextMessages;
                patchCachedMessages(currentCache => ({
                    ...currentCache,
                    items: nextMessages,
                }));
                return nextMessages;
            });
        },
        [patchCachedMessages],
    );

    useEffect(() => {
        const canOpenPeerProfile = Boolean(peerUsername);
        navigation.setOptions({
            headerTitle: route.params?.channelTitle || t('Chat'),
            // iOS：原生 UIBarButtonItem，液態玻璃下才是標準圓形
            headerRight: canOpenPeerProfile
                ? Platform.OS === 'ios'
                    ? undefined
                    : createHarborChatProfileButton({
                          accessibilityLabel: t('查看個人檔案'),
                          onPress: openPeerProfile,
                          themeColor: theme.themeColor,
                      })
                : undefined,
            unstable_headerRightItems:
                canOpenPeerProfile && Platform.OS === 'ios'
                    ? () => [
                          {
                              type: 'button',
                              label: t('查看個人檔案'),
                              accessibilityLabel: t('查看個人檔案'),
                              icon: {
                                  type: 'sfSymbol',
                                  name: 'person.crop.circle',
                              },
                              tintColor: theme.themeColor,
                              onPress: () => {
                                  trigger();
                                  openPeerProfile();
                              },
                          },
                      ]
                    : undefined,
        });
    }, [
        navigation,
        openPeerProfile,
        peerUsername,
        route.params?.channelTitle,
        t,
        theme.themeColor,
    ]);

    useEffect(() => {
        const cacheIdentity = `${username}:${channelId}`;
        if (cacheIdentityRef.current === cacheIdentity) {
            return;
        }
        cacheIdentityRef.current = cacheIdentity;
        const cacheKey = getHarborChatMessagesCacheKey(
            username,
            channelId,
            initialTargetMessageRef.current,
        );
        const cachedResult = readHarborChatMessagesCache(cacheKey);
        currentCacheKeyRef.current = cacheKey;
        hasCachedResultRef.current = Boolean(cachedResult);
        messagesRef.current = cachedResult?.items || [];
        setMessages(messagesRef.current);
        setCanLoadMorePast(Boolean(cachedResult?.canLoadMorePast));
        setIsLoading(!cachedResult);
        setError(false);
        initialScrollRef.current = false;
        lastMarkedReadRef.current = 0;
    }, [channelId, username]);

    const markLatestRead = useCallback(
        nextMessages => {
            const latest = nextMessages[nextMessages.length - 1];
            if (latest?.id && latest.id > lastMarkedReadRef.current) {
                lastMarkedReadRef.current = latest.id;
                markHarborChatChannelRead(channelId, latest.id).catch(() => {
                    if (lastMarkedReadRef.current === latest.id) {
                        lastMarkedReadRef.current = 0;
                    }
                });
            }
        },
        [channelId],
    );

    const loadLatest = useCallback(
        async ({poll = false} = {}) => {
            if (loadingRef.current) {
                return;
            }
            if (!channelId) {
                setError(true);
                setIsLoading(false);
                return;
            }
            loadingRef.current = true;
            if (!poll && !hasCachedResultRef.current) {
                setIsLoading(true);
            }
            try {
                const targetMessageId = initialTargetMessageRef.current;
                const result = await fetchHarborChatMessages(channelId, {
                    targetMessageId,
                });
                initialTargetMessageRef.current = null;
                const cacheKey = getHarborChatMessagesCacheKey(
                    username,
                    channelId,
                    targetMessageId,
                );
                currentCacheKeyRef.current = cacheKey;
                setMessages(current => {
                    const nextMessages = mergeHarborChatMessages(
                        current,
                        result.items,
                    );
                    messagesRef.current = nextMessages;
                    hasCachedResultRef.current = true;
                    writeHarborChatMessagesCache(cacheKey, {
                        canLoadMorePast: result.canLoadMorePast,
                        items: nextMessages,
                    });
                    patchCachedMessages(currentCache => ({
                        ...currentCache,
                        items: mergeHarborChatMessages(
                            currentCache.items,
                            result.items,
                        ),
                    }));
                    markLatestRead(nextMessages);
                    return nextMessages;
                });
                setCanLoadMorePast(result.canLoadMorePast);
                setError(false);
            } catch {
                if (!poll) {
                    setError(true);
                }
            } finally {
                loadingRef.current = false;
                if (!poll) {
                    setIsLoading(false);
                }
            }
        },
        [channelId, markLatestRead, patchCachedMessages, username],
    );

    useFocusEffect(
        useCallback(() => {
            loadLatest();
            const poller = setInterval(
                () => loadLatest({poll: true}),
                CHAT_POLL_INTERVAL_MS,
            );
            return () => clearInterval(poller);
        }, [loadLatest]),
    );

    const loadPast = useCallback(async () => {
        const firstMessage = messages[0];
        if (!firstMessage || !canLoadMorePast || isLoadingPast) {
            return;
        }
        setIsLoadingPast(true);
        try {
            const result = await fetchHarborChatMessages(channelId, {
                direction: 'past',
                targetMessageId: firstMessage.id,
            });
            updateMessages(current =>
                mergeHarborChatMessages(result.items, current),
            );
            setCanLoadMorePast(result.canLoadMorePast);
            patchHarborChatMessagesCache(currentCacheKeyRef.current, current => ({
                ...current,
                canLoadMorePast: result.canLoadMorePast,
            }));
        } catch {
            Alert.alert(
                t('無法載入較早訊息'),
                t('請檢查網絡後再試。'),
                [{text: t('確定'), onPress: () => trigger()}],
            );
        } finally {
            setIsLoadingPast(false);
        }
    }, [canLoadMorePast, channelId, isLoadingPast, messages, t, updateMessages]);

    const sendMessage = useCallback(async () => {
        const content = draft.trim();
        if (!content || isSending) {
            return;
        }
        trigger();
        setIsSending(true);
        try {
            const messageId = await sendHarborChatMessage(channelId, content);
            setDraft('');
            if (messageId) {
                const optimisticMessage = {
                    id: messageId,
                    channelId,
                    content,
                    createdAt: new Date().toISOString(),
                    deleted: false,
                    edited: false,
                    user: {
                        id: user?.id || null,
                        username: user?.username || '',
                        displayName: user?.displayName || user?.username || '',
                        avatarUrl: user?.avatarUrl || '',
                    },
                };
                updateMessages(current =>
                    mergeHarborChatMessages(current, [optimisticMessage]),
                );
                lastMarkedReadRef.current = messageId;
                markHarborChatChannelRead(channelId, messageId).catch(() => {
                    if (lastMarkedReadRef.current === messageId) {
                        lastMarkedReadRef.current = 0;
                    }
                });
            }
            await loadLatest();
            requestAnimationFrame(() => listRef.current?.scrollToEnd({animated: true}));
        } catch {
            Alert.alert(
                t('訊息傳送失敗'),
                t('訊息仍保留在輸入框，請稍後再試。'),
                [{text: t('確定'), onPress: () => trigger()}],
            );
        } finally {
            setIsSending(false);
        }
    }, [channelId, draft, isSending, loadLatest, t, updateMessages, user]);

    const contentContainerStyle = useMemo(
        () => ({
            paddingTop:
                (isLiquidGlassSupported ? headerHeight : 0) + verticalScale(12),
            paddingBottom: verticalScale(16),
        }),
        [headerHeight],
    );

    if (isLoading && messages.length === 0) {
        return (
            <View style={[styles.center, {backgroundColor: theme.bg_color}]}>
                <ActivityIndicator color={theme.themeColor} size="small" />
            </View>
        );
    }

    return (
        <View style={[styles.page, {backgroundColor: theme.bg_color}]}>
            <FlashList
                ref={listRef}
                contentContainerStyle={contentContainerStyle}
                data={messages}
                keyExtractor={item => String(item.id)}
                ListEmptyComponent={
                    error ? (
                        <HarborFullState
                            actionLabel={t('重試')}
                            description={t('暫時無法取得 Chat 訊息。')}
                            icon="chat-alert-outline"
                            onAction={loadLatest}
                            title={t('無法載入對話')}
                        />
                    ) : (
                        <HarborFullState
                            description={t('傳送第一則訊息，開始這段 Chat。')}
                            icon="message-text-outline"
                            title={t('開始聊聊吧')}
                        />
                    )
                }
                ListHeaderComponent={
                    canLoadMorePast ? (
                        <Pressable
                            accessibilityRole="button"
                            disabled={isLoadingPast}
                            onPress={() => {
                                trigger();
                                loadPast();
                            }}
                            style={styles.loadPastButton}>
                            {isLoadingPast ? (
                                <ActivityIndicator
                                    color={theme.themeColor}
                                    size="small"
                                />
                            ) : (
                                <Text
                                    style={[
                                        styles.loadPastText,
                                        {color: theme.themeColor},
                                    ]}>
                                    {t('載入較早訊息')}
                                </Text>
                            )}
                        </Pressable>
                    ) : null
                }
                onContentSizeChange={() => {
                    if (!initialScrollRef.current && messages.length > 0) {
                        initialScrollRef.current = true;
                        listRef.current?.scrollToEnd({animated: false});
                    }
                }}
                renderItem={({item}) => (
                    <HarborChatMessage
                        isGroup={isGroup}
                        isOwn={item.user.username === user?.username}
                        language={i18n.language}
                        message={item}
                        navigation={navigation}
                    />
                )}
            />
            <KeyboardStickyView>
                <View
                    style={[
                        styles.composer,
                        {
                            backgroundColor: theme.white,
                            borderTopColor: theme.disabled,
                            paddingBottom: Math.max(
                                insets.bottom,
                                verticalScale(8),
                            ),
                        },
                    ]}>
                    <TextInput
                        accessibilityLabel={t('Chat 訊息')}
                        maxLength={6000}
                        multiline
                        onChangeText={setDraft}
                        placeholder={t('輸入訊息')}
                        placeholderTextColor={theme.black.third}
                        style={[
                            styles.input,
                            {
                                backgroundColor: theme.tonal.primary08,
                                color: theme.black.main,
                            },
                        ]}
                        value={draft}
                    />
                    <Pressable
                        accessibilityLabel={t('傳送')}
                        accessibilityRole="button"
                        accessibilityState={{disabled: !draft.trim() || isSending}}
                        disabled={!draft.trim() || isSending}
                        onPress={sendMessage}
                        style={({pressed}) => [
                            styles.sendButton,
                            {
                                backgroundColor:
                                    !draft.trim() || isSending
                                        ? theme.disabled
                                        : pressed
                                            ? theme.themeColorLight
                                            : theme.themeColor,
                            },
                        ]}>
                        {isSending ? (
                            <ActivityIndicator
                                color={theme.trueWhite}
                                size="small"
                            />
                        ) : (
                            <MaterialCommunityIcons
                                color={theme.trueWhite}
                                name="send"
                                size={scale(17)}
                            />
                        )}
                    </Pressable>
                </View>
            </KeyboardStickyView>
        </View>
    );
};

const styles = StyleSheet.create({
    appLinkCard: {
        alignItems: 'center',
        borderRadius: scale(15),
        borderWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        gap: scale(9),
        maxWidth: '100%',
        paddingHorizontal: scale(11),
        paddingVertical: verticalScale(11),
        width: scale(240),
    },
    appLinkContent: {
        flex: 1,
    },
    appLinkDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(14),
        marginTop: verticalScale(3),
    },
    appLinkIcon: {
        alignItems: 'center',
        borderRadius: scale(11),
        height: scale(42),
        justifyContent: 'center',
        width: scale(42),
    },
    appLinkLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '620',
    },
    appLinkTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
        marginTop: verticalScale(1),
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    bubble: {
        maxWidth: '100%',
        borderRadius: scale(15),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(9),
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerProfileButton: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    composer: {
        borderTopWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: scale(8),
        paddingHorizontal: scale(10),
        paddingTop: verticalScale(8),
    },
    input: {
        ...uiStyle.defaultText,
        flex: 1,
        minHeight: verticalScale(38),
        maxHeight: verticalScale(110),
        borderRadius: scale(16),
        fontSize: scale(13),
        lineHeight: verticalScale(18),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(9),
    },
    loadPastButton: {
        minHeight: verticalScale(38),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(12),
    },
    loadPastText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '620',
    },
    messageAuthor: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        marginBottom: verticalScale(3),
        marginLeft: scale(3),
    },
    messageAvatar: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(10),
        marginRight: scale(8),
    },
    messageColumn: {
        maxWidth: '78%',
        alignItems: 'flex-start',
    },
    messageColumnOwn: {
        alignItems: 'flex-end',
    },
    messageLink: {
        textDecorationLine: 'underline',
    },
    messageParts: {
        alignItems: 'flex-start',
        gap: verticalScale(5),
        maxWidth: '100%',
    },
    messagePartsOwn: {
        alignItems: 'flex-end',
    },
    messageRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(5),
    },
    messageRowOwn: {
        justifyContent: 'flex-end',
    },
    messageText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        lineHeight: verticalScale(19),
    },
    messageTime: {
        ...uiStyle.defaultText,
        fontSize: scale(8),
        marginHorizontal: scale(3),
        marginTop: verticalScale(3),
    },
    page: {
        flex: 1,
    },
    sendButton: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default HarborChatChannelPage;
