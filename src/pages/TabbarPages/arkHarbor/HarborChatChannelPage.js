import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
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
import {
    fetchHarborChatMessages,
    markHarborChatChannelRead,
    sendHarborChatMessage,
} from '../../../utils/harbor/harborApi';
import {mergeHarborChatMessages} from '../../../utils/harbor/harborChat';
import {trigger} from '../../../utils/trigger';
import {HarborFullState} from './components/HarborListStates';

const CHAT_POLL_INTERVAL_MS = 8000;

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

const HarborChatMessage = ({isGroup, isOwn, language, message, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const content = message.deleted
        ? t('此訊息已刪除')
        : message.content;

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
                            {content}
                        </Text>
                    </HyperlinkText>
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
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [canLoadMorePast, setCanLoadMorePast] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingPast, setIsLoadingPast] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: route.params?.channelTitle || t('Chat'),
        });
    }, [navigation, route.params?.channelTitle, t]);

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
            if (!poll) {
                setIsLoading(true);
            }
            try {
                const result = await fetchHarborChatMessages(channelId, {
                    targetMessageId: initialTargetMessageRef.current,
                });
                initialTargetMessageRef.current = null;
                setMessages(current => {
                    const nextMessages = mergeHarborChatMessages(
                        current,
                        result.items,
                    );
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
        [channelId, markLatestRead],
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
            setMessages(current =>
                mergeHarborChatMessages(result.items, current),
            );
            setCanLoadMorePast(result.canLoadMorePast);
        } catch {
            Alert.alert(
                t('無法載入較早訊息'),
                t('請檢查網絡後再試。'),
                [{text: t('確定'), onPress: () => trigger()}],
            );
        } finally {
            setIsLoadingPast(false);
        }
    }, [canLoadMorePast, channelId, isLoadingPast, messages, t]);

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
                setMessages(current =>
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
    }, [channelId, draft, isSending, loadLatest, t, user]);

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
