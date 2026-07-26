import React, {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Image as NativeImage,
    Modal,
    Pressable,
    RefreshControl,
    Share,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import { FlashList } from '@shopify/flash-list';
import { MenuView } from '@react-native-menu/menu';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import Slider from '@react-native-community/slider';
import { useHeaderHeight } from '@react-navigation/elements';
import axios from 'axios';
import { Image } from 'expo-image';
import moment from 'moment-timezone';
import RenderHTML, {
    HTMLContentModel,
    HTMLElementModel,
    IMGElementContainer,
    IMGElementContentError,
    useIMGElementProps,
    useIMGElementState,
    useRendererProps,
} from 'react-native-render-html';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Toast from 'react-native-simple-toast';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import ARKImageView from '../../../components/ARKImageView';
import Loading from '../../../components/Loading';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { openLink } from '../../../utils/browser';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import {
    getHarborHtmlAttribute,
    replaceHarborEmojiImages,
} from '../../../utils/harbor/harborHtml';
import {
    createHarborPostBookmark,
    deleteHarborBookmark,
    fetchHarborTopic,
    fetchHarborTopicPosts,
    HARBOR_TOPIC_NOTIFICATION_LEVELS,
    likeHarborPost,
    markHarborTopicUnread,
    saveHarborTopicTimings,
    setHarborTopicNotificationLevel,
    toggleHarborPostReaction,
    unlikeHarborPost,
    updateHarborBookmark,
} from '../../../utils/harbor/harborApi';
import { parseHarborUrl } from '../../../utils/harbor/harborNavigation';
import { publishHarborTopicUpdate } from '../../../utils/harbor/harborTopicUpdates';
import {
    ARK_HARBOR,
    ARK_HARBOR_ABSOLUTE_URL,
    ARK_HARBOR_AVATAR_TEMPLATE,
    ARK_HARBOR_EMOJI_URL,
    ARK_HARBOR_TOPIC_URL,
} from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import HarborCategoryIcon from './components/HarborCategoryIcon';

const AVATAR_SIZE = 88;
// 常見 Discourse reaction shortcode → Unicode，優先於遠端圖片以提升清晰度
const HARBOR_REACTION_UNICODE = Object.freeze({
    heart: '❤️',
    '+1': '👍',
    '-1': '👎',
    laughing: '😆',
    open_mouth: '😮',
    clap: '👏',
    confetti_ball: '🎊',
    hugs: '🤗',
    smile: '😄',
    tada: '🎉',
    pray: '🙏',
    eyes: '👀',
    rocket: '🚀',
    heart_eyes: '😍',
    slightly_smiling_face: '🙂',
});
const HARBOR_REACTION_LABEL = Object.freeze({
    heart: '愛心',
    '+1': '讚同',
    '-1': '不讚同',
    laughing: '好笑',
    open_mouth: '驚訝',
    clap: '拍手',
    confetti_ball: '慶祝',
    hugs: '擁抱',
    smile: '微笑',
    tada: '太棒了',
    pray: '祈禱',
    eyes: '留意',
    rocket: '火箭',
    heart_eyes: '喜愛',
    slightly_smiling_face: '淡淡微笑',
});
const LIKE_ACTION_ID = 2;
const TOPIC_POST_BATCH_SIZE = 20;
const TIMINGS_REPORT_INTERVAL = 10000;
const TOPIC_HEADER_ITEM = Object.freeze({
    __harborItemType: 'topicHeader',
    id: 'topic-header',
});
// 列表前綴：話題標題
const LIST_POST_INDEX_OFFSET = 1;
const TOPIC_VIEWABILITY_CONFIG = {
    // 保留所有仍在畫面的樓層，再以標題下緣判斷目前閱讀樓層
    itemVisiblePercentThreshold: 1,
    minimumViewTime: 120,
};
const TOPIC_NOTIFICATION_OPTIONS = [
    {
        level: HARBOR_TOPIC_NOTIFICATION_LEVELS.normal,
        label: '一般',
        description: '只在有人提及或直接回覆你時通知',
        icon: 'bell-outline',
    },
    {
        level: HARBOR_TOPIC_NOTIFICATION_LEVELS.tracking,
        label: '追蹤',
        description: '顯示新回覆數量，但不主動通知',
        icon: 'bell-badge-outline',
    },
    {
        level: HARBOR_TOPIC_NOTIFICATION_LEVELS.watching,
        label: '關注',
        description: '每篇新回覆都會通知你',
        icon: 'bell-ring-outline',
    },
    {
        level: HARBOR_TOPIC_NOTIFICATION_LEVELS.watchingFirstPost,
        label: '只關注第一篇',
        description: '只在這個話題的第一篇有活動時通知',
        icon: 'bell-check-outline',
    },
    {
        level: HARBOR_TOPIC_NOTIFICATION_LEVELS.muted,
        label: '靜音',
        description: '不顯示這個話題的通知與未讀提示',
        icon: 'bell-off-outline',
    },
];

const iframeModel = HTMLElementModel.fromCustomModel({
    tagName: 'iframe',
    contentModel: HTMLContentModel.block,
    isOpaque: true,
});

// RenderHTML 預設把圖片視為區塊；Harbor emoji 需要留在文字流內。
const harborEmojiModel = HTMLElementModel.fromCustomModel({
    tagName: 'harbor-emoji',
    contentModel: HTMLContentModel.textual,
});

const customHTMLElementModels = {
    'harbor-emoji': harborEmojiModel,
    iframe: iframeModel,
};

const isCanceledRequest = (error, signal) => {
    return (
        signal?.aborted ||
        error?.code === 'ERR_CANCELED' ||
        axios.isCancel(error)
    );
};

const normalizeHtmlUrl = url => {
    return ARK_HARBOR_ABSOLUTE_URL(
        typeof url === 'string' ? url.replace(/&amp;/g, '&') : '',
    );
};

const extractPostImages = html => {
    if (!html || typeof html !== 'string') {
        return [];
    }

    const images = [];
    const lightboxTags =
        html.match(
            /<a\b[^>]*\bclass=(?:"[^"]*\blightbox\b[^"]*"|'[^']*\blightbox\b[^']*')[^>]*>/gi,
        ) || [];

    lightboxTags.forEach(tag => {
        const href = normalizeHtmlUrl(getHarborHtmlAttribute(tag, 'href'));
        if (href) {
            images.push(href);
        }
    });

    if (images.length === 0) {
        const imageTags = html.match(/<img\b[^>]*>/gi) || [];
        imageTags.forEach(tag => {
            const className = getHarborHtmlAttribute(tag, 'class');
            if (className.split(/\s+/).includes('emoji')) {
                return;
            }
            const src = normalizeHtmlUrl(getHarborHtmlAttribute(tag, 'src'));
            if (src) {
                images.push(src);
            }
        });
    }

    return [...new Set(images)];
};

const extractPostQuoteText = html => {
    if (!html || typeof html !== 'string') {
        return '';
    }

    return html
        .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(?:blockquote|div|h[1-6]|li|p|pre)>/gi, '\n')
        .replace(/<li\b[^>]*>/gi, '• ')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&hellip;/gi, '…')
        .replace(/&apos;/gi, "'")
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, '"')
        .replace(/&#x([0-9a-f]+);/gi, (match, entityValue) => {
            const codePoint = Number.parseInt(entityValue, 16);
            return Number.isFinite(codePoint) && codePoint <= 0x10ffff
                ? String.fromCodePoint(codePoint)
                : match;
        })
        .replace(/&#([0-9]+);/g, (match, entityValue) => {
            const codePoint = Number.parseInt(entityValue, 10);
            return Number.isFinite(codePoint) && codePoint <= 0x10ffff
                ? String.fromCodePoint(codePoint)
                : match;
        })
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/[ \t]{2,}/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const getReactionCount = post => {
    if (Number.isFinite(post?.reaction_users_count)) {
        return post.reaction_users_count;
    }
    if (Array.isArray(post?.reactions)) {
        return post.reactions.reduce((total, reaction) => {
            return total + Number(reaction?.count || 0);
        }, 0);
    }
    const likeAction = post?.actions_summary?.find(action => action?.id === 2);
    return Number(likeAction?.count || post?.like_count || 0);
};

const getLikeAction = post => {
    return post?.actions_summary?.find(action => action?.id === LIKE_ACTION_ID);
};

const getHarborMutationError = (error, fallback) => {
    const errors = error?.response?.data?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
        return errors.join(' ');
    }
    if (typeof errors === 'string' && errors) {
        return errors;
    }
    return error?.response?.data?.error || fallback;
};

const updateOptimisticLike = (post, liked) => {
    const currentAction = getLikeAction(post) || { id: LIKE_ACTION_ID };
    const currentCount = Number(
        currentAction.count ?? post?.like_count ?? 0,
    );
    const nextCount = Math.max(0, currentCount + (liked ? 1 : -1));
    const nextAction = {
        ...currentAction,
        id: LIKE_ACTION_ID,
        count: nextCount,
        acted: liked,
        can_act: !liked,
        can_undo: liked,
    };
    return {
        ...post,
        like_count: nextCount,
        actions_summary: [
            ...(post.actions_summary || []).filter(
                action => action?.id !== LIKE_ACTION_ID,
            ),
            nextAction,
        ],
    };
};

const updateOptimisticReaction = (post, reactionId) => {
    const currentReactionId = post?.current_user_reaction?.id || null;
    const isRemoving = currentReactionId === reactionId;
    const reactions = (Array.isArray(post?.reactions) ? post.reactions : [])
        .map(reaction => ({ ...reaction }))
        .filter(reaction => reaction?.id);
    const updateCount = (id, delta) => {
        if (!id) {
            return;
        }
        const existing = reactions.find(reaction => reaction.id === id);
        if (existing) {
            existing.count = Math.max(0, Number(existing.count || 0) + delta);
            return;
        }
        if (delta > 0) {
            reactions.push({ id, type: 'emoji', count: delta });
        }
    };

    if (currentReactionId) {
        updateCount(currentReactionId, -1);
    }
    if (!isRemoving) {
        updateCount(reactionId, 1);
    }

    return {
        ...post,
        reactions: reactions.filter(reaction => reaction.count > 0),
        current_user_reaction: isRemoving
            ? null
            : { id: reactionId, type: 'emoji', can_undo: true },
        reaction_users_count: Math.max(
            0,
            Number(post?.reaction_users_count || 0) +
                (currentReactionId ? (isRemoving ? -1 : 0) : 1),
        ),
    };
};

const getNotificationLevelLabel = level => {
    switch (Number(level)) {
        case HARBOR_TOPIC_NOTIFICATION_LEVELS.muted:
            return '靜音';
        case HARBOR_TOPIC_NOTIFICATION_LEVELS.tracking:
            return '追蹤';
        case HARBOR_TOPIC_NOTIFICATION_LEVELS.watching:
            return '關注';
        case HARBOR_TOPIC_NOTIFICATION_LEVELS.watchingFirstPost:
            return '只關注第一篇';
        default:
            return '一般';
    }
};

const getTagLabel = tag => {
    if (typeof tag === 'string') {
        return tag;
    }
    return tag?.name || tag?.id || '';
};

const mergeTopicWindow = (currentTopic, nextTopic) => {
    if (!currentTopic) {
        return nextTopic;
    }

    const currentPosts = currentTopic.post_stream?.posts || [];
    const nextPosts = nextTopic?.post_stream?.posts || [];
    const stream =
        nextTopic?.post_stream?.stream || currentTopic.post_stream?.stream || [];
    const streamIndex = new Map(
        stream.map((postId, index) => [Number(postId), index]),
    );
    const postsById = new Map();

    [...currentPosts, ...nextPosts].forEach(post => {
        if (post?.id) {
            postsById.set(Number(post.id), post);
        }
    });

    const posts = [...postsById.values()].sort((left, right) => {
        const leftIndex = streamIndex.get(Number(left.id));
        const rightIndex = streamIndex.get(Number(right.id));
        if (leftIndex !== undefined && rightIndex !== undefined) {
            return leftIndex - rightIndex;
        }
        return Number(left.post_number || 0) - Number(right.post_number || 0);
    });

    return {
        ...currentTopic,
        ...nextTopic,
        post_stream: {
            ...currentTopic.post_stream,
            ...nextTopic?.post_stream,
            stream,
            posts,
        },
    };
};

const appendTopicPosts = (currentTopic, nextPosts, stream) => {
    return mergeTopicWindow(currentTopic, {
        post_stream: {
            ...currentTopic?.post_stream,
            ...(stream ? { stream } : {}),
            posts: nextPosts,
        },
    });
};

const HarborIframeRenderer = ({ tnode }) => {
    const { theme } = useTheme();
    const sourceUrl = normalizeHtmlUrl(tnode?.attributes?.src);
    const requestedHeight = Number(tnode?.attributes?.height);
    const height = Number.isFinite(requestedHeight)
        ? Math.min(
            Math.max(requestedHeight, verticalScale(180)),
            verticalScale(420),
        )
        : verticalScale(240);

    if (!sourceUrl) {
        return null;
    }

    return (
        <View
            style={[
                styles.iframeContainer,
                { height, backgroundColor: theme.white },
            ]}>
            <WebView
                source={{ uri: sourceUrl }}
                style={{ backgroundColor: theme.white }}
                scrollEnabled={false}
                allowsInlineMediaPlayback
            />
        </View>
    );
};

const HarborEmojiRenderer = ({ tnode }) => {
    const sourceUrl = normalizeHtmlUrl(tnode?.attributes?.src);
    const label = tnode?.attributes?.alt || '';

    if (!sourceUrl) {
        return label ? <Text>{label}</Text> : null;
    }

    return (
        <NativeImage
            source={{ uri: sourceUrl }}
            style={styles.inlineEmoji}
            resizeMode="contain"
            accessible={Boolean(label)}
            accessibilityLabel={label || undefined}
        />
    );
};

const HarborImageRenderer = props => {
    const { theme } = useTheme();
    const imageProps = useIMGElementProps(props);
    const rendererProps = useRendererProps('img');
    const state = useIMGElementState(imageProps);
    const parentUrl = props.tnode?.parent?.attributes?.href;
    const imageUrl = parentUrl || imageProps.source?.uri;

    if (state.type === 'error') {
        return (
            <IMGElementContainer
                style={state.containerStyle}
                onPress={() => rendererProps.onPress?.(imageUrl)}>
                <IMGElementContentError {...state} />
            </IMGElementContainer>
        );
    }

    return (
        <IMGElementContainer
            style={state.containerStyle}
            onPress={() => rendererProps.onPress?.(imageUrl)}>
            <Image
                source={{ uri: state.source?.uri }}
                style={[
                    state.dimensions,
                    state.type === 'success' ? state.imageStyle : null,
                ]}
                contentFit="cover"
                placeholder={theme.imagePlaceholder}
                placeholderContentFit="cover"
                transition={300}
                accessibilityLabel={state.alt || undefined}
            />
        </IMGElementContainer>
    );
};

const htmlRenderers = {
    'harbor-emoji': HarborEmojiRenderer,
    iframe: HarborIframeRenderer,
    img: HarborImageRenderer,
};

const HarborPostContent = memo(
    ({ cooked, contentWidth, imageUrls, onOpenImage, onPressLink, postUrl }) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const { black, themeColor, themeColorUltraLight, tonal, white } = theme;
        const normalizedCooked = useMemo(() => {
            return replaceHarborEmojiImages(cooked || '');
        }, [cooked]);
        const requiresInteractiveFallback = useMemo(() => {
            return /<(?:video|audio)\b|class=(?:"[^"]*\bpoll\b[^"]*"|'[^']*\bpoll\b[^']*')/i.test(
                cooked,
            );
        }, [cooked]);

        const baseStyle = useMemo(
            () => ({
                ...uiStyle.defaultText,
                color: black.second,
                fontSize: scale(14),
                lineHeight: scale(21),
            }),
            [black.second],
        );

        const tagsStyles = useMemo(
            () => ({
                body: {
                    color: black.second,
                },
                p: {
                    marginTop: 0,
                    marginBottom: verticalScale(8),
                },
                a: {
                    color: themeColor,
                    textDecorationLine: 'underline',
                },
                h1: {
                    color: black.main,
                    fontSize: scale(21),
                    lineHeight: scale(28),
                    marginTop: verticalScale(10),
                    marginBottom: verticalScale(8),
                },
                h2: {
                    color: black.main,
                    fontSize: scale(18),
                    lineHeight: scale(25),
                    marginTop: verticalScale(9),
                    marginBottom: verticalScale(7),
                },
                h3: {
                    color: black.main,
                    fontSize: scale(16),
                    lineHeight: scale(23),
                    marginTop: verticalScale(8),
                    marginBottom: verticalScale(6),
                },
                blockquote: {
                    backgroundColor: tonal.primary08,
                    borderLeftColor: themeColor,
                    borderLeftWidth: scale(3),
                    paddingHorizontal: scale(10),
                    paddingVertical: verticalScale(8),
                    marginVertical: verticalScale(8),
                },
                pre: {
                    color: black.second,
                    backgroundColor: tonal.primary08,
                    borderColor: themeColorUltraLight,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderRadius: scale(8),
                    padding: scale(10),
                    marginVertical: verticalScale(8),
                },
                code: {
                    color: black.second,
                    backgroundColor: tonal.primary15,
                    fontFamily: 'monospace',
                },
                img: {
                    borderRadius: scale(8),
                    marginVertical: verticalScale(5),
                },
                hr: {
                    backgroundColor: themeColorUltraLight,
                    height: StyleSheet.hairlineWidth,
                    marginVertical: verticalScale(10),
                },
                table: {
                    borderColor: themeColorUltraLight,
                    borderWidth: StyleSheet.hairlineWidth,
                    marginVertical: verticalScale(8),
                },
                th: {
                    color: black.main,
                    backgroundColor: tonal.primary15,
                    borderColor: themeColorUltraLight,
                    borderWidth: StyleSheet.hairlineWidth,
                    padding: scale(6),
                },
                td: {
                    color: black.second,
                    backgroundColor: white,
                    borderColor: themeColorUltraLight,
                    borderWidth: StyleSheet.hairlineWidth,
                    padding: scale(6),
                },
            }),
            [
                black.main,
                black.second,
                themeColor,
                themeColorUltraLight,
                tonal.primary08,
                tonal.primary15,
                white,
            ],
        );

        const classesStyles = useMemo(
            () => ({
                meta: { display: 'none' },
                onebox: {
                    backgroundColor: tonal.primary08,
                    borderColor: themeColorUltraLight,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderRadius: scale(10),
                    padding: scale(10),
                    marginVertical: verticalScale(8),
                },
                quote: {
                    backgroundColor: tonal.primary08,
                    borderLeftColor: themeColor,
                    borderLeftWidth: scale(3),
                    padding: scale(10),
                    marginVertical: verticalScale(8),
                },
            }),
            [themeColor, themeColorUltraLight, tonal.primary08],
        );

        const renderersProps = useMemo(
            () => ({
                a: {
                    onPress: (event, href) => {
                        trigger();
                        const normalizedUrl = normalizeHtmlUrl(href);
                        const imageIndex = imageUrls.indexOf(normalizedUrl);
                        if (imageIndex >= 0) {
                            onOpenImage(imageIndex);
                            return;
                        }

                        if (!normalizedUrl || normalizedUrl.startsWith('#')) {
                            return;
                        }

                        onPressLink(normalizedUrl);
                    },
                },
                img: {
                    enableExperimentalPercentWidth: true,
                    initialDimensions: {
                        width: Math.min(contentWidth, scale(240)),
                        height: verticalScale(160),
                    },
                    onPress: url => {
                        const normalizedUrl = normalizeHtmlUrl(url);
                        const imageIndex = imageUrls.indexOf(normalizedUrl);
                        if (imageIndex >= 0) {
                            trigger();
                            onOpenImage(imageIndex);
                        }
                    },
                },
            }),
            [contentWidth, imageUrls, onOpenImage, onPressLink],
        );

        return (
            <View>
                <RenderHTML
                    source={{ html: normalizedCooked, baseUrl: ARK_HARBOR }}
                    contentWidth={contentWidth}
                    baseStyle={baseStyle}
                    tagsStyles={tagsStyles}
                    classesStyles={classesStyles}
                    renderers={htmlRenderers}
                    renderersProps={renderersProps}
                    customHTMLElementModels={customHTMLElementModels}
                    ignoredDomTags={['svg']}
                    defaultTextProps={{ selectable: true }}
                    enableExperimentalBRCollapsing
                    enableExperimentalGhostLinesPrevention
                    enableExperimentalMarginCollapsing
                />
                {requiresInteractiveFallback ? (
                    <Pressable
                        onPress={() => {
                            trigger();
                            openLink({ URL: postUrl, mode: 'fullScreen' });
                        }}
                        style={({ pressed }) => [
                            styles.interactiveFallback,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="open-in-new"
                            size={scale(15)}
                            color={themeColor}
                        />
                        <Text
                            style={[
                                styles.interactiveFallbackText,
                                { color: themeColor },
                            ]}>
                            {t('查看互動內容')}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        );
    },
);

const normalizeHarborReactionName = name => {
    if (!name || typeof name !== 'string') {
        return '';
    }
    return name.replace(/^:|:$/g, '').trim();
};

const HarborReactionIcon = ({ name, size = scale(24), color }) => {
    const reactionName = normalizeHarborReactionName(name);
    const unicode = HARBOR_REACTION_UNICODE[reactionName];
    if (unicode) {
        return (
            <Text
                allowFontScaling={false}
                style={[
                    styles.reactionGlyph,
                    {
                        color: color || undefined,
                        fontSize: size,
                        lineHeight: size * 1.15,
                    },
                ]}>
                {unicode}
            </Text>
        );
    }

    const emojiUrl = ARK_HARBOR_EMOJI_URL(reactionName);
    if (emojiUrl) {
        return (
            <Image
                source={{ uri: emojiUrl }}
                style={{ width: size, height: size }}
                contentFit="contain"
                accessibilityLabel={`:${reactionName}:`}
            />
        );
    }

    if (!reactionName) {
        return null;
    }

    return (
        <Text
            numberOfLines={1}
            style={[
                styles.reactionFallbackText,
                { color: color || undefined, fontSize: size * 0.45 },
            ]}>
            :{reactionName}:
        </Text>
    );
};

const MetaItem = ({ icon, value, color }) => {
    if (!value) {
        return null;
    }
    return (
        <View style={styles.metaItem}>
            <MaterialCommunityIcons
                name={icon}
                size={scale(15)}
                color={color}
            />
            <Text style={[styles.metaText, { color }]}>{value}</Text>
        </View>
    );
};

const HarborPostCard = memo(
    ({
        post,
        contentWidth,
        imageUrls,
        onOpenImage,
        onPressAuthor,
        onPressBookmark,
        onPressComposeReply,
        onPressCopy,
        onPressEdit,
        onPressLike,
        onPressLink,
        onPressQuote,
        onPressReply,
        onPressShare,
        onSelectReaction,
        canReply,
        pendingBookmark,
        pendingLike,
        pendingReaction,
        reactions,
        reactionsEnabled,
    }) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const {
            black,
            themeColor,
            themeColorUltraLight,
            tonal,
            white,
            viewShadow,
        } = theme;
        const reactionCount = getReactionCount(post);
        const likeAction = getLikeAction(post);
        const isLiked = Boolean(likeAction?.acted);
        const currentReaction = post?.current_user_reaction?.id;
        const avatarUrl = ARK_HARBOR_AVATAR_TEMPLATE(
            post.avatar_template,
            AVATAR_SIZE,
        );
        const displayName = post.name || post.display_username || post.username;
        const wasEdited =
            post.updated_at &&
            post.created_at &&
            moment(post.updated_at).diff(moment(post.created_at), 'seconds') >
            60;
        const isDeleted = Boolean(post.deleted_at || post.user_deleted);
        const isHidden = Boolean(post.hidden);
        const isNotice = Boolean(
            post.action_code ||
            post.small_action ||
            post.post_type === 3,
        );
        const reactionMenuActions = useMemo(() => {
            return reactions.map(reaction => {
                const reactionName = normalizeHarborReactionName(reaction);
                const unicode = HARBOR_REACTION_UNICODE[reactionName];
                const label = t(
                    HARBOR_REACTION_LABEL[reactionName] ||
                        reactionName.replace(/_/g, ' '),
                );
                return {
                    id: reaction,
                    title: unicode
                        ? `${unicode}  ${label}`
                        : label,
                    state:
                        currentReaction === reaction
                            ? 'on'
                            : 'off',
                    attributes: {
                        disabled: Boolean(pendingLike || pendingReaction),
                    },
                };
            });
        }, [currentReaction, pendingLike, pendingReaction, reactions, t]);
        const composerMenuActions = useMemo(() => {
            const actions = [];
            if (canReply) {
                actions.push({
                    id: 'quote',
                    title: t('引用'),
                    image: 'quote.bubble',
                });
            }
            if (post.can_edit) {
                actions.push({
                    id: 'edit',
                    title: t('編輯'),
                    image: 'pencil',
                });
            }
            return actions;
        }, [canReply, post.can_edit, t]);

        if (isDeleted || isHidden) {
            return (
                <View
                    style={[
                        styles.postStateCard,
                        {
                            backgroundColor: tonal.primary08,
                            borderColor: themeColorUltraLight,
                        },
                    ]}>
                    <MaterialCommunityIcons
                        name={isHidden ? 'eye-off-outline' : 'delete-outline'}
                        size={scale(18)}
                        color={black.third}
                    />
                    <Text
                        style={[styles.postStateText, { color: black.third }]}>
                        {isHidden
                            ? t('此帖子已被隱藏')
                            : t('此帖子已被刪除')}
                    </Text>
                    <Text
                        style={[styles.postStateNumber, { color: black.third }]}>
                        #{post.post_number}
                    </Text>
                </View>
            );
        }

        if (isNotice) {
            return (
                <View
                    style={[
                        styles.postStateCard,
                        {
                            backgroundColor: tonal.primary08,
                            borderColor: themeColorUltraLight,
                        },
                    ]}>
                    <MaterialCommunityIcons
                        name="information-outline"
                        size={scale(18)}
                        color={themeColor}
                    />
                    <View style={styles.noticeContent}>
                        <Text
                            style={[
                                styles.noticeTitle,
                                { color: themeColor },
                            ]}>
                            {t('系統提示')}
                            {post.action_code ? ` · ${post.action_code}` : ''}
                        </Text>
                        {typeof post.cooked === 'string' &&
                            post.cooked.trim().length > 0 ? (
                            <HarborPostContent
                                cooked={post.cooked}
                                contentWidth={contentWidth - scale(38)}
                                imageUrls={imageUrls}
                                onOpenImage={onOpenImage}
                                onPressLink={onPressLink}
                                postUrl={ARK_HARBOR_TOPIC_URL(
                                    post.topic_id,
                                    post.post_number,
                                )}
                            />
                        ) : null}
                    </View>
                    <Text
                        style={[styles.postStateNumber, { color: black.third }]}>
                        #{post.post_number}
                    </Text>
                </View>
            );
        }

        return (
            <View
                style={[
                    styles.postCard,
                    { backgroundColor: white, borderColor: themeColorUltraLight },
                    viewShadow,
                ]}>
                <View style={styles.postHeader}>
                    <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={displayName}
                        onPress={() => {
                            trigger();
                            onPressAuthor(post.username);
                        }}
                        style={({ pressed }) => [
                            styles.authorLink,
                            pressed ? styles.pressedLink : null,
                        ]}>
                        <Image
                            source={{ uri: avatarUrl }}
                            style={[
                                styles.avatar,
                                { backgroundColor: tonal.primary15 },
                            ]}
                            contentFit="cover"
                            placeholder={theme.imagePlaceholder}
                            placeholderContentFit="cover"
                            transition={200}
                        />
                        <View style={styles.authorArea}>
                            <Text
                                style={[styles.authorName, { color: black.main }]}
                                numberOfLines={1}>
                                {displayName}
                            </Text>
                            <View style={styles.authorDetails}>
                                {post.user_title ? (
                                    <Text
                                        style={[
                                            styles.userTitle,
                                            { color: themeColor },
                                        ]}
                                        numberOfLines={1}>
                                        {post.user_title}
                                    </Text>
                                ) : null}
                                {post.staff ? (
                                    <Text
                                        style={[
                                            styles.staffBadge,
                                            {
                                                color: themeColor,
                                                backgroundColor:
                                                    tonal.primary15,
                                            },
                                        ]}>
                                        Staff
                                    </Text>
                                ) : null}
                            </View>
                            <Text
                                style={[styles.postTime, { color: black.third }]}>
                                {moment
                                    .tz(post.created_at, 'Asia/Macau')
                                    .format('YYYY/MM/DD HH:mm')}
                                {wasEdited ? ` · ${t('已編輯')}` : ''}
                            </Text>
                        </View>
                    </Pressable>
                    <Text style={[styles.postNumber, { color: black.third }]}>
                        #{post.post_number}
                    </Text>
                </View>

                {post.reply_to_post_number ? (
                    <Pressable
                        onPress={() => {
                            trigger();
                            onPressReply(post.reply_to_post_number);
                        }}
                        style={({ pressed }) => [
                            styles.replyBadge,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="reply-outline"
                            size={scale(14)}
                            color={themeColor}
                        />
                        <Text style={[styles.replyText, { color: themeColor }]}>
                            {t('回覆樓層', {
                                postNumber: post.reply_to_post_number,
                            })}
                        </Text>
                    </Pressable>
                ) : null}

                <View style={styles.postBody}>
                    <HarborPostContent
                        cooked={post.cooked}
                        contentWidth={contentWidth}
                        imageUrls={imageUrls}
                        onOpenImage={onOpenImage}
                        onPressLink={onPressLink}
                        postUrl={ARK_HARBOR_TOPIC_URL(
                            post.topic_id,
                            post.post_number,
                        )}
                    />
                </View>

                <View
                    style={[
                        styles.postFooter,
                        { borderTopColor: themeColorUltraLight },
                    ]}>
                    <View style={styles.footerMeta}>
                        <MetaItem
                            icon="eye-outline"
                            value={post.reads}
                            color={black.third}
                        />
                        <MetaItem
                            icon="comment-outline"
                            value={post.reply_count}
                            color={black.third}
                        />
                    </View>
                    <MetaItem
                        icon={currentReaction || isLiked ? 'heart' : 'heart-outline'}
                        value={reactionCount}
                        color={themeColor}
                    />
                </View>
                {canReply || post.can_edit ? (
                    <View style={styles.composerActionRow}>
                        {canReply ? (
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    onPressComposeReply(post);
                                }}
                                style={({ pressed }) => [
                                    styles.postActionButton,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary30
                                            : tonal.primary15,
                                    },
                                ]}>
                                <MaterialCommunityIcons
                                    name="reply-outline"
                                    size={scale(15)}
                                    color={themeColor}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.postActionText,
                                        { color: themeColor },
                                    ]}>
                                    {t('回覆')}
                                </Text>
                            </Pressable>
                        ) : null}
                        {composerMenuActions.length > 0 ? (
                            <MenuView
                                actions={composerMenuActions}
                                onOpenMenu={() => trigger()}
                                onPressAction={event => {
                                    trigger();
                                    if (event.nativeEvent.event === 'edit') {
                                        onPressEdit(post);
                                        return;
                                    }
                                    onPressQuote(post);
                                }}
                                shouldOpenOnLongPress={false}
                                style={styles.composerMenuView}>
                                <View
                                    style={[
                                        styles.postActionButton,
                                        styles.reactionMenuButton,
                                        { backgroundColor: tonal.primary15 },
                                    ]}>
                                    <MaterialCommunityIcons
                                        name="dots-horizontal"
                                        size={scale(16)}
                                        color={themeColor}
                                    />
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.postActionText,
                                            { color: themeColor },
                                        ]}>
                                        {t('更多')}
                                    </Text>
                                </View>
                            </MenuView>
                        ) : null}
                    </View>
                ) : null}
                <View style={styles.postActionRow}>
                    {reactionsEnabled ? (
                        <MenuView
                            actions={reactionMenuActions}
                            onOpenMenu={() => trigger()}
                            onPressAction={event => {
                                trigger();
                                onSelectReaction(
                                    post.id,
                                    event.nativeEvent.event,
                                );
                            }}
                            shouldOpenOnLongPress={false}
                            style={styles.reactionMenuView}>
                            <View
                                style={[
                                    styles.postActionButton,
                                    styles.reactionMenuButton,
                                    { backgroundColor: tonal.primary15 },
                                ]}>
                                {pendingReaction ? (
                                    <ActivityIndicator
                                        size="small"
                                        color={themeColor}
                                    />
                                ) : currentReaction ? (
                                    <HarborReactionIcon
                                        name={currentReaction}
                                        size={scale(16)}
                                    />
                                ) : (
                                    <MaterialCommunityIcons
                                        name="emoticon-outline"
                                        size={scale(15)}
                                        color={themeColor}
                                    />
                                )}
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.postActionText,
                                        { color: themeColor },
                                    ]}>
                                    {t('回應')}
                                </Text>
                            </View>
                        </MenuView>
                    ) : (
                        <Pressable
                            disabled={pendingLike}
                            onPress={() => {
                                trigger();
                                onPressLike(post);
                            }}
                            style={({ pressed }) => [
                                styles.postActionButton,
                                {
                                    backgroundColor: pressed
                                        ? tonal.primary30
                                        : tonal.primary15,
                                },
                            ]}>
                            {pendingLike ? (
                                <ActivityIndicator
                                    size="small"
                                    color={themeColor}
                                />
                            ) : (
                                <MaterialCommunityIcons
                                    name={isLiked ? 'heart' : 'heart-outline'}
                                    size={scale(15)}
                                    color={themeColor}
                                />
                            )}
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.postActionText,
                                    { color: themeColor },
                                ]}>
                                {isLiked ? t('取消讚好') : t('讚好')}
                            </Text>
                        </Pressable>
                    )}
                    <Pressable
                        disabled={pendingBookmark}
                        onPress={() => {
                            trigger();
                            onPressBookmark(post);
                        }}
                        style={({ pressed }) => [
                            styles.postActionButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        {pendingBookmark ? (
                            <ActivityIndicator size="small" color={themeColor} />
                        ) : (
                            <MaterialCommunityIcons
                                name={
                                    post.bookmarked
                                        ? 'bookmark'
                                        : 'bookmark-outline'
                                }
                                size={scale(15)}
                                color={themeColor}
                            />
                        )}
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.postActionText,
                                { color: themeColor },
                            ]}>
                            {post.bookmarked ? t('已收藏') : t('收藏')}
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            trigger();
                            onPressCopy(post);
                        }}
                        style={({ pressed }) => [
                            styles.postIconButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="link-variant"
                            size={scale(16)}
                            color={themeColor}
                        />
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            trigger();
                            onPressShare(post);
                        }}
                        style={({ pressed }) => [
                            styles.postIconButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="share-variant-outline"
                            size={scale(16)}
                            color={themeColor}
                        />
                    </Pressable>
                </View>
            </View>
        );
    },
);

const HarborTopicHeader = memo(
    ({
        topic,
        onCopy,
        onMarkUnread,
        onOpenNotifications,
        onOpenOriginal,
        onShare,
        onPressCategory,
        onPressTag,
        pendingMarkUnread,
        pendingNotification,
    }) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const {
            black,
            themeColor,
            themeColorUltraLight,
            tonal,
            white,
            viewShadow,
        } = theme;
        const tags = Array.isArray(topic.tags)
            ? topic.tags.map(getTagLabel).filter(Boolean)
            : [];
        const categoryId = Number(topic.category_id);
        const categorySlug = topic.category_slug || topic.category?.slug;
        const categoryName = topic.category_name || topic.category?.name;

        return (
            <View
                style={[
                    styles.topicHeader,
                    { backgroundColor: white, borderColor: themeColorUltraLight },
                    viewShadow,
                ]}>
                <Text
                    selectable
                    style={[styles.topicTitle, { color: black.main }]}>
                    {topic.title}
                </Text>

                {(Number.isInteger(categoryId) && categoryId > 0) ||
                tags.length > 0 ? (
                    <View style={styles.tagRow}>
                        {Number.isInteger(categoryId) && categoryId > 0 ? (
                            <Pressable
                                accessibilityRole="link"
                                onPress={() => {
                                    trigger();
                                    onPressCategory({
                                        categoryId,
                                        categorySlug,
                                        categoryName,
                                    });
                                }}
                                style={({ pressed }) => [
                                    styles.category,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary30
                                            : tonal.primary15,
                                    },
                                ]}>
                                <HarborCategoryIcon
                                    category={
                                        topic.category || {
                                            id: categoryId,
                                            name: categoryName,
                                            slug: categorySlug,
                                        }
                                    }
                                    color={themeColor}
                                    size={scale(13)}
                                />
                                <Text
                                    style={[
                                        styles.categoryText,
                                        { color: themeColor },
                                    ]}>
                                    {categoryName || `分類 #${categoryId}`}
                                </Text>
                            </Pressable>
                        ) : null}
                        {tags.map(tag => (
                            <Pressable
                                key={tag}
                                accessibilityRole="link"
                                onPress={() => {
                                    trigger();
                                    onPressTag(tag);
                                }}
                                style={({ pressed }) => [
                                    styles.tag,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary30
                                            : tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.tagText,
                                        { color: themeColor },
                                    ]}>
                                    #{tag}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                ) : null}

                <View style={styles.topicMetaRow}>
                    <MetaItem
                        icon="eye-outline"
                        value={`${topic.views || 0} ${t('瀏覽')}`}
                        color={black.third}
                    />
                    <MetaItem
                        icon="comment-outline"
                        value={`${topic.posts_count || 0} ${t('帖子')}`}
                        color={black.third}
                    />
                    <MetaItem
                        icon="heart-outline"
                        value={`${topic.like_count || 0} ${t('讚')}`}
                        color={themeColor}
                    />
                </View>

                {topic.last_posted_at ? (
                    <Text style={[styles.lastUpdated, { color: black.third }]}>
                        {t('最後更新')} ·{' '}
                        {moment
                            .tz(topic.last_posted_at, 'Asia/Macau')
                            .format('YYYY/MM/DD HH:mm')}
                    </Text>
                ) : null}

                <View style={styles.webActionRow}>
                    <Pressable
                        onPress={onOpenOriginal}
                        style={({ pressed }) => [
                            styles.webOriginalButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="web"
                            size={scale(16)}
                            color={themeColor}
                        />
                        <Text
                            style={[
                                styles.webOriginalText,
                                { color: themeColor },
                            ]}>
                            {t('查看 Web 原文')}
                        </Text>
                        <MaterialCommunityIcons
                            name="open-in-new"
                            size={scale(14)}
                            color={themeColor}
                        />
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            trigger();
                            onCopy();
                        }}
                        style={({ pressed }) => [
                            styles.webOriginalButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="link-variant"
                            size={scale(16)}
                            color={themeColor}
                        />
                        <Text
                            style={[
                                styles.webOriginalText,
                                { color: themeColor },
                            ]}>
                            {t('複製連結')}
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            trigger();
                            onShare();
                        }}
                        style={({ pressed }) => [
                            styles.webOriginalButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="share-variant-outline"
                            size={scale(16)}
                            color={themeColor}
                        />
                        <Text
                            style={[
                                styles.webOriginalText,
                                { color: themeColor },
                            ]}>
                            {t('分享')}
                        </Text>
                    </Pressable>
                    <Pressable
                        disabled={pendingNotification}
                        onPress={() => {
                            trigger();
                            onOpenNotifications();
                        }}
                        style={({ pressed }) => [
                            styles.webOriginalButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        {pendingNotification ? (
                            <ActivityIndicator size="small" color={themeColor} />
                        ) : (
                            <MaterialCommunityIcons
                                name="bell-outline"
                                size={scale(16)}
                                color={themeColor}
                            />
                        )}
                        <Text
                            style={[
                                styles.webOriginalText,
                                { color: themeColor },
                            ]}>
                            {t(
                                getNotificationLevelLabel(
                                    topic.details?.notification_level,
                                ),
                            )}
                        </Text>
                    </Pressable>
                    <Pressable
                        disabled={pendingMarkUnread}
                        onPress={() => {
                            trigger();
                            onMarkUnread();
                        }}
                        style={({ pressed }) => [
                            styles.webOriginalButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        {pendingMarkUnread ? (
                            <ActivityIndicator size="small" color={themeColor} />
                        ) : (
                            <MaterialCommunityIcons
                                name="email-mark-as-unread"
                                size={scale(16)}
                                color={themeColor}
                            />
                        )}
                        <Text
                            style={[
                                styles.webOriginalText,
                                { color: themeColor },
                            ]}>
                            {t('標為未讀')}
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    },
);

const HarborReadingControls = memo(
    ({
        currentPostNumber,
        highestPostNumber,
        onFirst,
        onJump,
        onLatest,
        onUnread,
        onSeek,
        onLayoutHeight,
        unreadPostNumber,
    }) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const { black, themeColor, themeColorUltraLight, tonal, white } = theme;
        const maxPostNumber = Math.max(Number(highestPostNumber) || 1, 1);
        const syncedPostNumber = Math.min(
            Math.max(Number(currentPostNumber) || 1, 1),
            maxPostNumber,
        );
        const [isSliding, setIsSliding] = useState(false);
        const [slidingValue, setSlidingValue] = useState(syncedPostNumber);
        // 鬆手後暫鎖目標樓層，避免列表尚未同步時滑桿被拉回舊值
        const [pendingSeek, setPendingSeek] = useState(null);
        // 記錄最後跳轉樓層，避免重複觸發
        const lastSeekedRef = useRef(syncedPostNumber);
        const isUserDriving = isSliding || pendingSeek != null;
        const displayPostNumber = isUserDriving
            ? Math.round(isSliding ? slidingValue : pendingSeek)
            : syncedPostNumber;
        const sliderValue = isUserDriving
            ? isSliding
                ? slidingValue
                : Number(pendingSeek)
            : syncedPostNumber;
        const progress =
            maxPostNumber > 0
                ? Math.min(displayPostNumber / maxPostNumber, 1)
                : 0;
        const controls = [
            { icon: 'page-first', label: t('第一篇'), onPress: onFirst },
            { icon: 'format-list-numbered', label: t('跳至樓層'), onPress: onJump },
            { icon: 'page-last', label: t('最新一篇'), onPress: onLatest },
        ];

        useEffect(() => {
            if (isSliding) {
                return;
            }
            if (pendingSeek != null) {
                if (syncedPostNumber === pendingSeek) {
                    setPendingSeek(null);
                    setSlidingValue(syncedPostNumber);
                    lastSeekedRef.current = syncedPostNumber;
                }
                return;
            }
            setSlidingValue(syncedPostNumber);
            lastSeekedRef.current = syncedPostNumber;
        }, [isSliding, pendingSeek, syncedPostNumber]);

        const seekToFloor = useCallback(
            (value, { scrubbing } = {}) => {
                const targetPostNumber = Math.round(value);
                if (
                    scrubbing &&
                    targetPostNumber === lastSeekedRef.current
                ) {
                    return;
                }
                lastSeekedRef.current = targetPostNumber;
                onSeek?.(targetPostNumber, { scrubbing: Boolean(scrubbing) });
            },
            [onSeek],
        );

        return (
            <View
                onLayout={event => {
                    const nextHeight = event.nativeEvent.layout.height;
                    if (nextHeight > 0) {
                        onLayoutHeight?.(nextHeight);
                    }
                }}
                style={[
                    styles.readingControls,
                    theme.viewShadow,
                    { backgroundColor: white, borderColor: themeColorUltraLight },
                ]}>
                <View style={styles.progressHeader}>
                    <Text style={[styles.progressText, { color: black.second }]}>
                        {t('閱讀進度')} · {displayPostNumber}/{maxPostNumber}
                    </Text>
                    <Text style={[styles.progressPercent, { color: themeColor }]}>
                        {Math.round(progress * 100)}%
                    </Text>
                </View>
                <Slider
                    style={styles.progressSlider}
                    minimumValue={1}
                    maximumValue={maxPostNumber}
                    step={1}
                    value={sliderValue}
                    disabled={maxPostNumber <= 1}
                    // iOS：點擊軌道即可跳轉；Android 原生已支援點擊
                    tapToSeek={true}
                    minimumTrackTintColor={themeColor}
                    maximumTrackTintColor={tonal.primary15}
                    thumbTintColor={themeColor}
                    onSlidingStart={value => {
                        setPendingSeek(null);
                        setIsSliding(true);
                        lastSeekedRef.current = Math.round(value);
                    }}
                    onValueChange={value => {
                        setSlidingValue(value);
                    }}
                    onSlidingComplete={value => {
                        const targetPostNumber = Math.round(value);
                        setSlidingValue(targetPostNumber);
                        setPendingSeek(targetPostNumber);
                        setIsSliding(false);
                        trigger();
                        seekToFloor(targetPostNumber, { scrubbing: false });
                    }}
                />
                {unreadPostNumber > 0 ? (
                    <Pressable
                        onPress={() => {
                            trigger();
                            onUnread();
                        }}
                        style={({ pressed }) => [
                            styles.controlButton,
                            styles.unreadButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="email-mark-as-unread"
                            size={scale(15)}
                            color={themeColor}
                        />
                        <Text
                            style={[
                                styles.controlButtonText,
                                { color: themeColor },
                            ]}>
                            {t('跳到未讀')}
                        </Text>
                    </Pressable>
                ) : null}
                <View style={styles.controlRow}>
                    {controls.map(control => (
                        <Pressable
                            key={control.label}
                            onPress={() => {
                                trigger();
                                control.onPress();
                            }}
                            style={({ pressed }) => [
                                styles.controlButton,
                                {
                                    backgroundColor: pressed
                                        ? tonal.primary30
                                        : tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name={control.icon}
                                size={scale(15)}
                                color={themeColor}
                            />
                            <Text
                                style={[
                                    styles.controlButtonText,
                                    { color: themeColor },
                                ]}>
                                {control.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            </View>
        );
    },
);

const HarborRelatedTopics = memo(({ topics, onPressTopic }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const { black, themeColor, themeColorUltraLight, tonal, white } = theme;

    if (!Array.isArray(topics) || topics.length === 0) {
        return <View style={styles.listFooter} />;
    }

    return (
        <View
            style={[
                styles.relatedTopics,
                { backgroundColor: white, borderColor: themeColorUltraLight },
            ]}>
            <Text style={[styles.relatedTitle, { color: black.main }]}>
                {t('相關話題')}
            </Text>
            {topics.map(relatedTopic => (
                <Pressable
                    key={relatedTopic.id}
                    onPress={() => {
                        trigger();
                        onPressTopic(relatedTopic);
                    }}
                    style={({ pressed }) => [
                        styles.relatedTopic,
                        {
                            backgroundColor: pressed
                                ? tonal.primary15
                                : white,
                            borderTopColor: themeColorUltraLight,
                        },
                    ]}>
                    <Text
                        style={[styles.relatedTopicTitle, { color: black.second }]}
                        numberOfLines={2}>
                        {relatedTopic.title}
                    </Text>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={scale(18)}
                        color={themeColor}
                    />
                </Pressable>
            ))}
        </View>
    );
});

const HarborTopicDetail = ({ route, navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const { login, status: sessionStatus } = useHarborSession();
    const { width } = useWindowDimensions();
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const {
        black,
        bg_color,
        themeColor,
        themeColorUltraLight,
        tonal,
        trueWhite,
    } = theme;
    const topicId = Number(route.params?.topicId);
    const initialTopicTitle = route.params?.topicTitle;
    const requestedPostNumber = Number(route.params?.postNumber);
    const composerRefreshAt = route.params?.composerRefreshAt;
    const listRef = useRef(null);
    const imageViewerRef = useRef(null);
    const requestGenerationRef = useRef(0);
    const controllerRef = useRef(null);
    const latestTopicRef = useRef(null);
    const trackedPageViewTopicIdRef = useRef(null);
    const pendingTopicRef = useRef(null);
    const pendingScrollRef = useRef(null);
    const adjacentLoadingRef = useRef({ previous: false, next: false });
    const latestVisiblePostRef = useRef(0);
    const viewablePostsRef = useRef([]);
    const lastTimingsAtRef = useRef(Date.now());
    const sessionStatusRef = useRef(sessionStatus);
    const handledPostRequestRef = useRef(null);
    const pendingMutationsRef = useRef(new Set());
    // 主動跳樓後忽略 viewability，避免短帖同屏時被最高可見樓層蓋回
    const ignoreViewabilityFromSeekRef = useRef(false);
    // 底部懸浮閱讀進度高度（含 safe area），供列表底部留白
    const [readingControlsDockHeight, setReadingControlsDockHeight] = useState(
        verticalScale(120),
    );
    const [topic, setTopic] = useState(null);
    const [topicSessionStatus, setTopicSessionStatus] = useState(sessionStatus);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
    const [isLoadingNext, setIsLoadingNext] = useState(false);
    const [pendingNewPostIds, setPendingNewPostIds] = useState([]);
    const [unreadAfterPostNumber, setUnreadAfterPostNumber] = useState(-1);
    const [currentPostNumber, setCurrentPostNumber] = useState(1);
    const [isJumpVisible, setIsJumpVisible] = useState(false);
    const [jumpPostNumber, setJumpPostNumber] = useState('');
    const [bookmarkEditor, setBookmarkEditor] = useState(null);
    const [isBookmarkReminderVisible, setIsBookmarkReminderVisible] =
        useState(false);
    const [isNotificationVisible, setIsNotificationVisible] = useState(false);
    const [pendingMutations, setPendingMutations] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const posts = useMemo(() => {
        const topicPosts = topic?.post_stream?.posts;
        if (!Array.isArray(topicPosts)) {
            return [];
        }
        return topicPosts.filter(post => post?.id);
    }, [topic]);

    const validReactions = useMemo(() => {
        return Array.isArray(topic?.valid_reactions)
            ? topic.valid_reactions.filter(
                reaction =>
                    typeof reaction === 'string' && reaction.trim().length > 0,
            )
            : [];
    }, [topic?.valid_reactions]);

    const listData = useMemo(() => {
        if (!topic) {
            return [];
        }
        return [TOPIC_HEADER_ITEM, ...posts];
    }, [posts, topic]);

    const highestPostNumber = useMemo(() => {
        return Math.max(
            Number(topic?.highest_post_number || 0),
            Number(topic?.posts_count || 0),
            ...posts.map(post => Number(post.post_number || 0)),
        );
    }, [posts, topic?.highest_post_number, topic?.posts_count]);

    const firstUnreadPostNumber = useMemo(() => {
        const unreadCount = Math.max(
            Number(topic?.unread_posts ?? topic?.new_posts ?? 0),
            0,
        );
        if (unreadCount <= 0) {
            return 0;
        }
        const lastReadPostNumber = Number(
            topic?.last_read_post_number || 0,
        );
        const inferredUnreadPostNumber = Math.max(
            highestPostNumber - unreadCount + 1,
            1,
        );
        return Math.min(
            lastReadPostNumber > 0
                ? lastReadPostNumber + 1
                : inferredUnreadPostNumber,
            highestPostNumber,
        );
    }, [
        highestPostNumber,
        topic?.last_read_post_number,
        topic?.new_posts,
        topic?.unread_posts,
    ]);

    // 僅一層樓時無需閱讀進度導航
    const showReadingControls = useMemo(() => {
        return (
            posts.length > 1 || Number(topic?.posts_count || 0) > 1
        );
    }, [posts.length, topic?.posts_count]);

    const canReplyToTopic =
        !topic?.closed &&
        !topic?.archived &&
        (topicSessionStatus !== 'signedIn' ||
            (topic?.can_create_post !== false &&
                topic?.details?.can_create_post !== false));

    const imageUrls = useMemo(() => {
        const urls = posts.flatMap(post => extractPostImages(post?.cooked));
        return [...new Set(urls)];
    }, [posts]);

    const contentWidth = Math.max(width - scale(48), scale(220));

    const listBottomInset = showReadingControls
        ? readingControlsDockHeight + verticalScale(8)
        : verticalScale(12);

    const listContentContainerStyle = useMemo(
        () => ({
            // 液態玻璃透明導覽列下的頂部留白
            paddingTop: isLiquidGlassSupported ? headerHeight : 0,
            // 有進度條時預留底部懸浮高度；單層樓僅保留小間距
            paddingBottom: listBottomInset,
        }),
        [headerHeight, listBottomInset],
    );

    useEffect(() => {
        latestTopicRef.current = topic;
    }, [topic]);

    useEffect(() => {
        sessionStatusRef.current = sessionStatus;
    }, [sessionStatus]);

    const beginMutation = useCallback(key => {
        if (pendingMutationsRef.current.has(key)) {
            return false;
        }
        pendingMutationsRef.current.add(key);
        setPendingMutations(current => ({ ...current, [key]: true }));
        return true;
    }, []);

    const finishMutation = useCallback(key => {
        pendingMutationsRef.current.delete(key);
        setPendingMutations(current => {
            const next = { ...current };
            delete next[key];
            return next;
        });
    }, []);

    const requireHarborSignIn = useCallback(async () => {
        if (sessionStatusRef.current === 'signedIn') {
            return true;
        }
        try {
            await login();
            return true;
        } catch (error) {
            Toast.show(t('需要登入 Harbor 才能完成此操作'));
            return false;
        }
    }, [login, t]);

    const updateTopicPost = useCallback((postId, updater) => {
        setTopic(current => {
            if (!current) {
                return current;
            }
            return {
                ...current,
                post_stream: {
                    ...current.post_stream,
                    posts: (current.post_stream?.posts || []).map(post =>
                        Number(post.id) === Number(postId)
                            ? updater(post)
                            : post,
                    ),
                },
            };
        });
    }, []);

    useEffect(() => {
        navigation.setOptions({
            headerTitle: topic?.title || initialTopicTitle || 'Harbor',
        });
    }, [initialTopicTitle, navigation, topic?.title]);

    const loadTopic = useCallback(
        async ({ refresh = false } = {}) => {
            const requestGeneration = ++requestGenerationRef.current;
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;
            const requestSessionStatus = sessionStatusRef.current;

            if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }
            setErrorMessage('');

            if (!Number.isInteger(topicId) || topicId <= 0) {
                setErrorMessage(t('帖子地址無效'));
                setIsLoading(false);
                setIsRefreshing(false);
                controllerRef.current = null;
                return;
            }

            try {
                const shouldTrackPageView =
                    !refresh &&
                    trackedPageViewTopicIdRef.current !== topicId;
                const nextTopic = await fetchHarborTopic(topicId, {
                    signal: controller.signal,
                    trackPageView: shouldTrackPageView,
                });
                if (shouldTrackPageView) {
                    trackedPageViewTopicIdRef.current = topicId;
                }
                if (
                    controller.signal.aborted ||
                    requestGeneration !== requestGenerationRef.current
                ) {
                    return;
                }
                setTopicSessionStatus(requestSessionStatus);

                if (refresh) {
                    const currentTopic = latestTopicRef.current;
                    const currentStream = currentTopic?.post_stream?.stream || [];
                    const currentIds = new Set(currentStream.map(Number));
                    const nextStream = nextTopic.post_stream?.stream || [];
                    const newPostIds = nextStream.filter(postId => {
                        return !currentIds.has(Number(postId));
                    });

                    if (newPostIds.length > 0) {
                        pendingTopicRef.current = nextTopic;
                        setPendingNewPostIds(newPostIds);
                        setTopic(current => ({
                            ...current,
                            ...nextTopic,
                            post_stream: current.post_stream,
                        }));
                    } else {
                        setTopic(current =>
                            mergeTopicWindow(current, nextTopic),
                        );
                    }
                    return;
                }

                const serverLastReadPostNumber = Number(
                    nextTopic.last_read_post_number || 0,
                );
                const serverUnreadCount = Number(
                    nextTopic.unread_posts ?? nextTopic.new_posts ?? 0,
                );
                setUnreadAfterPostNumber(
                    serverUnreadCount > 0 ? serverLastReadPostNumber : -1,
                );
                listRef.current?.scrollToOffset({
                    offset: 0,
                    animated: false,
                });
                pendingScrollRef.current = null;
                latestVisiblePostRef.current = 1;
                setCurrentPostNumber(1);
                latestTopicRef.current = nextTopic;
                setTopic(nextTopic);
            } catch (error) {
                if (!isCanceledRequest(error, controller.signal)) {
                    setErrorMessage(t('帖子載入失敗，請檢查網絡後再試'));
                    if (refresh) {
                        Toast.show(t('帖子更新失敗，請稍後再試'));
                    }
                }
            } finally {
                if (requestGeneration === requestGenerationRef.current) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                    controllerRef.current = null;
                }
            }
        },
        [t, topicId],
    );

    useEffect(() => {
        if (
            topic?.id &&
            topicSessionStatus !== sessionStatus
        ) {
            loadTopic({ refresh: true });
        }
    }, [loadTopic, sessionStatus, topic?.id, topicSessionStatus]);

    useEffect(() => {
        logToFirebase('openPage', {
            page: 'HarborTopicDetail',
            topicId,
        });
        loadTopic();

        return () => {
            requestGenerationRef.current += 1;
            controllerRef.current?.abort();
            const lastPostNumber = latestVisiblePostRef.current;
            if (
                lastPostNumber > 0 &&
                sessionStatusRef.current === 'signedIn'
            ) {
                const now = Date.now();
                saveHarborTopicTimings(topicId, {
                    postNumber: lastPostNumber,
                    timeMs: now - lastTimingsAtRef.current,
                    topicTimeMs: now - lastTimingsAtRef.current,
                }).catch(() => { });
            }
        };
    }, [loadTopic, topicId]);

    const updateReadingPost = useCallback(
        postNumber => {
            const normalizedPostNumber = Number(postNumber);
            if (
                !Number.isInteger(normalizedPostNumber) ||
                normalizedPostNumber <= 0 ||
                normalizedPostNumber === latestVisiblePostRef.current
            ) {
                return;
            }

            latestVisiblePostRef.current = normalizedPostNumber;
            setCurrentPostNumber(normalizedPostNumber);
            const now = Date.now();
            if (
                sessionStatusRef.current === 'signedIn' &&
                now - lastTimingsAtRef.current >= TIMINGS_REPORT_INTERVAL
            ) {
                saveHarborTopicTimings(topicId, {
                    postNumber: normalizedPostNumber,
                    timeMs: now - lastTimingsAtRef.current,
                    topicTimeMs: now - lastTimingsAtRef.current,
                }).catch(() => { });
                lastTimingsAtRef.current = now;
            }
        },
        [topicId],
    );

    const handleScrollToIndexFailed = useCallback(info => {
        const index = Math.max(Number(info?.index || 0), 0);
        const viewOffset = Number(info?.viewOffset || 0);
        listRef.current?.scrollToOffset({
            offset: Math.max(index * verticalScale(260) + viewOffset, 0),
            animated: false,
        });
        setTimeout(() => {
            listRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0,
                viewOffset,
            });
        }, 250);
    }, []);

    const getPostScrollViewOffset = useCallback(() => {
        // 進度條改為底部懸浮後，頂部只需避開液態玻璃導覽列
        return isLiquidGlassSupported ? -headerHeight : 0;
    }, [headerHeight]);

    const scrollToLoadedPost = useCallback(
        (postNumber, animated = true) => {
            const normalizedPostNumber = Number(postNumber);
            // 第一層回到列表頂部，保留話題頭卡與發帖人資訊
            if (normalizedPostNumber === 1) {
                listRef.current?.scrollToOffset({
                    offset: 0,
                    animated,
                });
                return true;
            }
            const loadedPosts =
                latestTopicRef.current?.post_stream?.posts?.filter(
                    post => post?.id,
                ) || [];
            const postIndex = loadedPosts.findIndex(post => {
                return Number(post.post_number) === normalizedPostNumber;
            });
            if (postIndex < 0) {
                return false;
            }
            // 列表前綴為話題標題，帖子索引需偏移
            const listIndex = postIndex + LIST_POST_INDEX_OFFSET;
            // 預留頂部導覽列高度，讓目標樓層出現在可見區域上方
            const viewOffset = getPostScrollViewOffset();
            try {
                listRef.current?.scrollToIndex({
                    index: listIndex,
                    animated,
                    viewPosition: 0,
                    viewOffset,
                });
            } catch (error) {
                handleScrollToIndexFailed({ index: listIndex, viewOffset });
            }
            return true;
        },
        [getPostScrollViewOffset, handleScrollToIndexFailed],
    );

    const scrollToPost = useCallback(
        async (postNumber, options = {}) => {
            const animated = options.animated !== false;
            const allowFetch = options.allowFetch !== false;
            const normalizedPostNumber = Math.min(
                Math.max(Number(postNumber), 1),
                Number(
                    latestTopicRef.current?.highest_post_number ||
                    latestTopicRef.current?.posts_count ||
                    postNumber,
                ),
            );
            if (!Number.isInteger(normalizedPostNumber)) {
                return;
            }
            // 先鎖定進度到目標樓層，再滾動，避免同屏多樓時立刻被蓋回
            ignoreViewabilityFromSeekRef.current = true;
            updateReadingPost(normalizedPostNumber);
            if (scrollToLoadedPost(normalizedPostNumber, animated)) {
                return;
            }
            if (!allowFetch) {
                return;
            }

            pendingScrollRef.current = normalizedPostNumber;
            setIsLoadingNext(true);
            try {
                const targetTopic = await fetchHarborTopic(topicId, {
                    postNumber: normalizedPostNumber,
                });
                setTopic(current => mergeTopicWindow(current, targetTopic));
            } catch (error) {
                if (!isCanceledRequest(error)) {
                    Toast.show(t('樓層載入失敗，請稍後再試'));
                    pendingScrollRef.current = null;
                }
            } finally {
                setIsLoadingNext(false);
            }
        },
        [scrollToLoadedPost, t, topicId, updateReadingPost],
    );

    useEffect(() => {
        if (
            !topic?.id ||
            !Number.isInteger(requestedPostNumber) ||
            requestedPostNumber <= 0
        ) {
            return;
        }
        const requestKey =
            `${topicId}:${requestedPostNumber}:${composerRefreshAt || 'route'}`;
        if (handledPostRequestRef.current === requestKey) {
            return;
        }
        handledPostRequestRef.current = requestKey;

        const revealRequestedPost = async () => {
            if (composerRefreshAt) {
                await loadTopic();
            }
            await scrollToPost(requestedPostNumber, { animated: false });
        };
        revealRequestedPost();
    }, [
        composerRefreshAt,
        loadTopic,
        requestedPostNumber,
        scrollToPost,
        topic?.id,
        topicId,
    ]);

    // 閱讀進度 Slider：鬆手後只執行一次跳轉，避免多個非同步滾動互相覆蓋
    const seekReadingProgress = useCallback(
        (postNumber, options = {}) => {
            const scrubbing = Boolean(options.scrubbing);
            return scrollToPost(postNumber, {
                animated: !scrubbing,
                allowFetch: !scrubbing,
            });
        },
        [scrollToPost],
    );

    useEffect(() => {
        const targetPostNumber = pendingScrollRef.current;
        if (!targetPostNumber || posts.length === 0) {
            return undefined;
        }
        const timeout = setTimeout(() => {
            if (
                scrollToLoadedPost(
                    targetPostNumber,
                    true,
                )
            ) {
                pendingScrollRef.current = null;
            }
        }, 250);
        return () => clearTimeout(timeout);
    }, [posts, scrollToLoadedPost]);

    const loadAdjacentPosts = useCallback(
        async direction => {
            if (adjacentLoadingRef.current[direction]) {
                return;
            }
            const currentTopic = latestTopicRef.current;
            const stream = currentTopic?.post_stream?.stream || [];
            const loadedPosts = currentTopic?.post_stream?.posts || [];
            const streamIndex = new Map(
                stream.map((postId, index) => [Number(postId), index]),
            );
            const loadedIndexes = loadedPosts
                .map(post => streamIndex.get(Number(post.id)))
                .filter(Number.isInteger)
                .sort((left, right) => left - right);
            if (loadedIndexes.length === 0) {
                return;
            }

            let postIds = [];
            if (direction === 'previous') {
                const firstLoadedIndex = loadedIndexes[0];
                postIds = stream.slice(
                    Math.max(firstLoadedIndex - TOPIC_POST_BATCH_SIZE, 0),
                    firstLoadedIndex,
                );
            } else {
                const loadedIndexSet = new Set(loadedIndexes);
                let firstMissingIndex = loadedIndexes[loadedIndexes.length - 1] + 1;
                for (
                    let index = loadedIndexes[0];
                    index <= loadedIndexes[loadedIndexes.length - 1];
                    index += 1
                ) {
                    if (!loadedIndexSet.has(index)) {
                        firstMissingIndex = index;
                        break;
                    }
                }
                postIds = stream.slice(
                    firstMissingIndex,
                    firstMissingIndex + TOPIC_POST_BATCH_SIZE,
                );
            }

            const loadedIds = new Set(loadedPosts.map(post => Number(post.id)));
            postIds = postIds.filter(postId => !loadedIds.has(Number(postId)));
            if (postIds.length === 0) {
                return;
            }

            adjacentLoadingRef.current[direction] = true;
            if (direction === 'previous') {
                setIsLoadingPrevious(true);
            } else {
                setIsLoadingNext(true);
            }
            try {
                const nextPosts = await fetchHarborTopicPosts(
                    topicId,
                    postIds,
                );
                setTopic(current => appendTopicPosts(current, nextPosts));
            } catch (error) {
                if (!isCanceledRequest(error)) {
                    Toast.show(t('帖子載入失敗，請稍後再試'));
                }
            } finally {
                adjacentLoadingRef.current[direction] = false;
                if (direction === 'previous') {
                    setIsLoadingPrevious(false);
                } else {
                    setIsLoadingNext(false);
                }
            }
        },
        [t, topicId],
    );

    const updateReadingPostFromOffset = useCallback(
        scrollOffset => {
            // 主動跳樓期間不跟畫面可見樓層，避免滾動動畫中途覆寫目標
            if (ignoreViewabilityFromSeekRef.current) {
                return;
            }
            const visiblePosts = viewablePostsRef.current;
            if (visiblePosts.length === 0) {
                return;
            }
            const firstItemOffset =
                Number(listRef.current?.getFirstItemOffset?.()) || 0;
            const readingLineOffset =
                scrollOffset - getPostScrollViewOffset();
            const readingPost =
                visiblePosts.find(viewableItem => {
                    const layout = listRef.current?.getLayout?.(
                        Number(viewableItem.index),
                    );
                    return (
                        layout &&
                        layout.y +
                        firstItemOffset +
                        layout.height >
                        readingLineOffset
                    );
                }) || visiblePosts[visiblePosts.length - 1];
            updateReadingPost(
                Number(readingPost.item.post_number),
            );
        },
        [getPostScrollViewOffset, updateReadingPost],
    );

    const handleViewableItemsChanged = useCallback(
        ({ viewableItems }) => {
            viewablePostsRef.current = viewableItems
                .filter(viewableItem =>
                    Number.isInteger(Number(viewableItem.item?.post_number)),
                )
                .sort(
                    (left, right) =>
                        Number(left.index) - Number(right.index),
                );
            updateReadingPostFromOffset(
                Number(listRef.current?.getAbsoluteLastScrollOffset?.()) || 0,
            );
        },
        [updateReadingPostFromOffset],
    );

    const handleScroll = useCallback(
        event => {
            updateReadingPostFromOffset(
                Number(event.nativeEvent.contentOffset.y || 0),
            );
        },
        [updateReadingPostFromOffset],
    );

    const handleScrollBeginDrag = useCallback(() => {
        ignoreViewabilityFromSeekRef.current = false;
    }, []);

    const openImage = useCallback(index => {
        imageViewerRef.current?.handleOpenImage(index);
    }, []);

    const openHarborLink = useCallback(
        url => {
            const target = parseHarborUrl(url, ARK_HARBOR);

            if (target?.type === 'topic') {
                navigation.navigate('HarborTopicDetail', {
                    topicId: target.topicId,
                    ...(target.postNumber
                        ? { postNumber: target.postNumber }
                        : {}),
                });
                return;
            }

            if (target?.type === 'category') {
                navigation.navigate('HarborCategoryTopics', {
                    categoryId: target.categoryId,
                    categorySlug: target.categorySlug,
                });
                return;
            }

            if (target?.type === 'tag') {
                navigation.navigate('HarborTagTopics', { tag: target.tag });
                return;
            }

            if (target?.type === 'search') {
                navigation.navigate('HarborSearch', { query: target.query });
                return;
            }

            openLink({
                URL: target?.url || url,
                mode: 'fullScreen',
            });
        },
        [navigation],
    );

    const openAuthor = useCallback(
        username => {
            if (!username) {
                return;
            }
            openHarborLink(`${ARK_HARBOR}/u/${encodeURIComponent(username)}`);
        },
        [openHarborLink],
    );

    const openCategory = useCallback(
        category => {
            navigation.navigate('HarborCategoryTopics', category);
        },
        [navigation],
    );

    const openTag = useCallback(
        tag => {
            navigation.navigate('HarborTagTopics', { tag });
        },
        [navigation],
    );

    const loadNewReplies = useCallback(async () => {
        if (pendingNewPostIds.length === 0 || isLoadingNext) {
            return;
        }
        setIsLoadingNext(true);
        try {
            const nextPosts = await fetchHarborTopicPosts(
                topicId,
                pendingNewPostIds,
            );
            const pendingTopic = pendingTopicRef.current;
            setTopic(current =>
                mergeTopicWindow(current, {
                    ...pendingTopic,
                    post_stream: {
                        ...pendingTopic?.post_stream,
                        posts: [
                            ...(pendingTopic?.post_stream?.posts || []),
                            ...nextPosts,
                        ],
                    },
                }),
            );
            pendingTopicRef.current = null;
            setPendingNewPostIds([]);
            const latestPostNumber = Math.max(
                ...nextPosts.map(post => Number(post.post_number || 0)),
            );
            if (latestPostNumber > 0) {
                pendingScrollRef.current = latestPostNumber;
            }
        } catch (error) {
            if (!isCanceledRequest(error)) {
                Toast.show(t('新回覆載入失敗，請稍後再試'));
            }
        } finally {
            setIsLoadingNext(false);
        }
    }, [isLoadingNext, pendingNewPostIds, t, topicId]);

    const showMutationFailure = useCallback(
        error => {
            const reason = getHarborMutationError(
                error,
                t('Harbor 暫時無法完成此操作'),
            );
            Toast.show(
                t('{{reason}}，已還原狀態，請重試', {
                    reason,
                }),
            );
        },
        [t],
    );

    const togglePostLike = useCallback(
        async post => {
            const key = `like:${post.id}`;
            const wasSignedIn = sessionStatusRef.current === 'signedIn';
            if (!(await requireHarborSignIn()) || !beginMutation(key)) {
                return;
            }

            const likeAction = getLikeAction(post);
            const liked = Boolean(likeAction?.acted);
            if (
                wasSignedIn &&
                ((!liked && !likeAction?.can_act) ||
                    (liked && !likeAction?.can_undo))
            ) {
                finishMutation(key);
                Toast.show(t('你目前沒有權限變更這篇帖子的讚好'));
                return;
            }

            const nextLiked = !liked;
            const previousTopicLikeCount = Number(
                latestTopicRef.current?.like_count || 0,
            );
            const topicLikeDelta = nextLiked ? 1 : -1;
            updateTopicPost(post.id, current =>
                updateOptimisticLike(current, nextLiked),
            );
            setTopic(current => ({
                ...current,
                like_count: Math.max(
                    0,
                    Number(current?.like_count || 0) + topicLikeDelta,
                ),
            }));
            publishHarborTopicUpdate(topicId, {
                likeCount: Math.max(
                    0,
                    previousTopicLikeCount + topicLikeDelta,
                ),
            });

            try {
                const updatedPost = nextLiked
                    ? await likeHarborPost(post.id)
                    : await unlikeHarborPost(post.id);
                updateTopicPost(post.id, current => ({
                    ...current,
                    ...updatedPost,
                }));
            } catch (error) {
                updateTopicPost(post.id, current => ({
                    ...current,
                    like_count: post.like_count,
                    actions_summary: post.actions_summary,
                }));
                setTopic(current => ({
                    ...current,
                    like_count: previousTopicLikeCount,
                }));
                publishHarborTopicUpdate(topicId, {
                    likeCount: previousTopicLikeCount,
                });
                showMutationFailure(error);
            } finally {
                finishMutation(key);
            }
        },
        [
            beginMutation,
            finishMutation,
            requireHarborSignIn,
            showMutationFailure,
            t,
            topicId,
            updateTopicPost,
        ],
    );

    const selectPostReaction = useCallback(
        async (postId, reactionId) => {
            const post = latestTopicRef.current?.post_stream?.posts?.find(
                item => Number(item.id) === Number(postId),
            );
            if (!post) {
                return;
            }
            if (!(await requireHarborSignIn())) {
                return;
            }
            if (
                post?.current_user_reaction &&
                post.current_user_reaction.can_undo === false
            ) {
                Toast.show(t('你目前不能取消這個回應'));
                return;
            }

            const key = `reaction:${post.id}`;
            if (!beginMutation(key)) {
                return;
            }
            updateTopicPost(post.id, current =>
                updateOptimisticReaction(current, reactionId),
            );
            try {
                const updatedPost = await toggleHarborPostReaction(
                    post.id,
                    reactionId,
                );
                updateTopicPost(post.id, current => ({
                    ...current,
                    ...updatedPost,
                }));
            } catch (error) {
                updateTopicPost(post.id, current => ({
                    ...current,
                    reactions: post.reactions,
                    current_user_reaction: post.current_user_reaction,
                    reaction_users_count: post.reaction_users_count,
                    like_count: post.like_count,
                    actions_summary: post.actions_summary,
                }));
                showMutationFailure(error);
            } finally {
                finishMutation(key);
            }
        },
        [
            beginMutation,
            finishMutation,
            requireHarborSignIn,
            showMutationFailure,
            t,
            updateTopicPost,
        ],
    );

    const openBookmarkEditor = useCallback(
        async post => {
            if (!(await requireHarborSignIn())) {
                return;
            }
            setBookmarkEditor({
                postId: post.id,
                bookmarkId: post.bookmark_id || null,
                name: post.bookmark_name || '',
                reminderAt: post.bookmark_reminder_at || null,
                previous: {
                    bookmarked: Boolean(post.bookmarked),
                    bookmark_id: post.bookmark_id || null,
                    bookmark_name: post.bookmark_name || null,
                    bookmark_reminder_at: post.bookmark_reminder_at || null,
                },
            });
        },
        [requireHarborSignIn],
    );

    const savePostBookmark = useCallback(async () => {
        if (!bookmarkEditor) {
            return;
        }
        const editor = bookmarkEditor;
        const key = `bookmark:${editor.postId}`;
        if (!beginMutation(key)) {
            return;
        }
        setBookmarkEditor(null);
        updateTopicPost(editor.postId, current => ({
            ...current,
            bookmarked: true,
            bookmark_id:
                editor.bookmarkId || `pending-bookmark-${editor.postId}`,
            bookmark_name: editor.name.trim() || null,
            bookmark_reminder_at: editor.reminderAt,
        }));

        try {
            if (editor.bookmarkId) {
                await updateHarborBookmark(editor.bookmarkId, {
                    name: editor.name,
                    reminderAt: editor.reminderAt,
                });
            } else {
                const result = await createHarborPostBookmark(editor.postId, {
                    name: editor.name,
                    reminderAt: editor.reminderAt,
                });
                if (!result?.id) {
                    throw new Error(t('Harbor 沒有返回收藏狀態'));
                }
                updateTopicPost(editor.postId, current => ({
                    ...current,
                    bookmark_id: result.id,
                }));
            }
            Toast.show(t('收藏已儲存'));
        } catch (error) {
            updateTopicPost(editor.postId, current => ({
                ...current,
                ...editor.previous,
            }));
            showMutationFailure(error);
        } finally {
            finishMutation(key);
        }
    }, [
        beginMutation,
        bookmarkEditor,
        finishMutation,
        showMutationFailure,
        t,
        updateTopicPost,
    ]);

    const removePostBookmark = useCallback(async () => {
        if (!bookmarkEditor?.bookmarkId) {
            return;
        }
        const editor = bookmarkEditor;
        const key = `bookmark:${editor.postId}`;
        if (!beginMutation(key)) {
            return;
        }
        setBookmarkEditor(null);
        updateTopicPost(editor.postId, current => ({
            ...current,
            bookmarked: false,
            bookmark_id: null,
            bookmark_name: null,
            bookmark_reminder_at: null,
        }));

        try {
            await deleteHarborBookmark(editor.bookmarkId);
            Toast.show(t('已取消收藏'));
        } catch (error) {
            updateTopicPost(editor.postId, current => ({
                ...current,
                ...editor.previous,
            }));
            showMutationFailure(error);
        } finally {
            finishMutation(key);
        }
    }, [
        beginMutation,
        bookmarkEditor,
        finishMutation,
        showMutationFailure,
        t,
        updateTopicPost,
    ]);

    const copyPostPermalink = useCallback(
        post => {
            Clipboard.setString(
                ARK_HARBOR_TOPIC_URL(topicId, post?.post_number),
            );
            Toast.show(t('永久連結已複製'));
        },
        [t, topicId],
    );

    const sharePost = useCallback(
        post => {
            const url = ARK_HARBOR_TOPIC_URL(topicId, post?.post_number);
            Share.share({
                message: `${topic?.title || 'Harbor'}\n${url}`,
                url,
            }).catch(() => {
                Toast.show(t('分享失敗，請稍後再試'));
            });
        },
        [t, topic?.title, topicId],
    );

    const openNotificationLevels = useCallback(async () => {
        if (await requireHarborSignIn()) {
            setIsNotificationVisible(true);
        }
    }, [requireHarborSignIn]);

    const changeNotificationLevel = useCallback(
        async level => {
            setIsNotificationVisible(false);
            const key = `notification:${topicId}`;
            if (!beginMutation(key)) {
                return;
            }
            const previousLevel = Number(
                latestTopicRef.current?.details?.notification_level ??
                    HARBOR_TOPIC_NOTIFICATION_LEVELS.normal,
            );
            const previousMuted = Boolean(latestTopicRef.current?.muted);
            const muted = level === HARBOR_TOPIC_NOTIFICATION_LEVELS.muted;
            setTopic(current => ({
                ...current,
                muted,
                details: {
                    ...current.details,
                    notification_level: level,
                },
            }));
            publishHarborTopicUpdate(topicId, {
                muted,
                statuses: {
                    ...(latestTopicRef.current?.statuses || {}),
                    muted,
                },
            });

            try {
                await setHarborTopicNotificationLevel(topicId, level);
                Toast.show(t('話題通知設定已更新'));
            } catch (error) {
                setTopic(current => ({
                    ...current,
                    muted: previousMuted,
                    details: {
                        ...current.details,
                        notification_level: previousLevel,
                    },
                }));
                publishHarborTopicUpdate(topicId, {
                    muted: previousMuted,
                    statuses: {
                        ...(latestTopicRef.current?.statuses || {}),
                        muted: previousMuted,
                    },
                });
                showMutationFailure(error);
            } finally {
                finishMutation(key);
            }
        },
        [
            beginMutation,
            finishMutation,
            showMutationFailure,
            t,
            topicId,
        ],
    );

    const markTopicUnread = useCallback(async () => {
        if (!(await requireHarborSignIn())) {
            return;
        }
        const key = `unread:${topicId}`;
        if (!beginMutation(key)) {
            return;
        }
        const currentTopic = latestTopicRef.current;
        const previous = {
            last_read_post_number: currentTopic?.last_read_post_number,
            unread_posts: currentTopic?.unread_posts,
            new_posts: currentTopic?.new_posts,
            unread: currentTopic?.unread,
        };
        const previousUnreadAfterPostNumber = unreadAfterPostNumber;
        setUnreadAfterPostNumber(0);
        setTopic(current => ({
            ...current,
            last_read_post_number: 0,
            unread_posts: highestPostNumber,
            unread: true,
        }));
        publishHarborTopicUpdate(topicId, {
            unreadCount: highestPostNumber,
            lastReadPostNumber: 0,
            isUnread: true,
        });

        try {
            await markHarborTopicUnread(topicId);
            publishHarborTopicUpdate(topicId, { reloadLists: true });
            Toast.show(t('話題已標為未讀'));
        } catch (error) {
            setUnreadAfterPostNumber(previousUnreadAfterPostNumber);
            setTopic(current => ({ ...current, ...previous }));
            publishHarborTopicUpdate(topicId, {
                unreadCount: Math.max(
                    Number(previous.unread_posts ?? previous.new_posts ?? 0),
                    0,
                ),
                lastReadPostNumber:
                    Number(previous.last_read_post_number) || null,
                isUnread: Boolean(
                    previous.unread ||
                        Number(
                            previous.unread_posts ?? previous.new_posts ?? 0,
                        ) > 0,
                ),
            });
            showMutationFailure(error);
        } finally {
            finishMutation(key);
        }
    }, [
        beginMutation,
        finishMutation,
        highestPostNumber,
        requireHarborSignIn,
        showMutationFailure,
        t,
        topicId,
        unreadAfterPostNumber,
    ]);

    const shareCurrentPost = useCallback(() => {
        const url = ARK_HARBOR_TOPIC_URL(
            topicId,
            currentPostNumber > 0 ? currentPostNumber : undefined,
        );
        Share.share({
            message: `${topic?.title || 'Harbor'}\n${url}`,
            url,
        }).catch(() => {
            Toast.show(t('分享失敗，請稍後再試'));
        });
    }, [currentPostNumber, t, topic?.title, topicId]);

    const copyCurrentPost = useCallback(() => {
        copyPostPermalink({ post_number: currentPostNumber });
    }, [copyPostPermalink, currentPostNumber]);

    const openTopicReplyComposer = useCallback(() => {
        navigation.navigate('HarborComposer', {
            mode: 'reply',
            topicId,
            topicTitle: topic?.title || initialTopicTitle,
            categoryId: topic?.category_id,
        });
    }, [
        initialTopicTitle,
        navigation,
        topic?.category_id,
        topic?.title,
        topicId,
    ]);

    const openPostReplyComposer = useCallback(
        post => {
            navigation.navigate('HarborComposer', {
                mode: 'reply',
                topicId,
                topicTitle: topic?.title || initialTopicTitle,
                categoryId: topic?.category_id,
                replyToPostNumber: post.post_number,
            });
        },
        [
            initialTopicTitle,
            navigation,
            topic?.category_id,
            topic?.title,
            topicId,
        ],
    );

    const openPostQuoteComposer = useCallback(
        post => {
            const username = String(
                post.username || post.display_username || '',
            ).replace(/["\r\n]/g, '');
            const quoteText = extractPostQuoteText(post.cooked).replace(
                /\[\/quote\]/gi,
                '[／quote]',
            );
            const quoteRaw =
                `[quote="${username}, post:${post.post_number}, topic:${topicId}"]\n` +
                `${quoteText}\n[/quote]\n\n`;
            navigation.navigate('HarborComposer', {
                mode: 'reply',
                topicId,
                topicTitle: topic?.title || initialTopicTitle,
                categoryId: topic?.category_id,
                replyToPostNumber: post.post_number,
                quoteRaw,
            });
        },
        [
            initialTopicTitle,
            navigation,
            topic?.category_id,
            topic?.title,
            topicId,
        ],
    );

    const openPostEditComposer = useCallback(
        post => {
            navigation.navigate('HarborComposer', {
                mode: 'edit',
                postId: post.id,
                postNumber: post.post_number,
                topicId,
                topicTitle: topic?.title || initialTopicTitle,
                categoryId: topic?.category_id,
            });
        },
        [
            initialTopicTitle,
            navigation,
            topic?.category_id,
            topic?.title,
            topicId,
        ],
    );

    const openRelatedTopic = useCallback(
        relatedTopic => {
            navigation.push('HarborTopicDetail', {
                topicId: relatedTopic.id,
                topicTitle: relatedTopic.title,
            });
        },
        [navigation],
    );

    const submitPostJump = useCallback(() => {
        const nextPostNumber = Number(jumpPostNumber);
        if (
            !Number.isInteger(nextPostNumber) ||
            nextPostNumber <= 0 ||
            nextPostNumber > highestPostNumber
        ) {
            Toast.show(t('請輸入有效樓層'));
            return;
        }
        trigger();
        setIsJumpVisible(false);
        scrollToPost(nextPostNumber);
    }, [highestPostNumber, jumpPostNumber, scrollToPost, t]);

    const openOriginalTopic = useCallback(() => {
        trigger();
        openLink({
            URL: ARK_HARBOR_TOPIC_URL(
                topicId,
                currentPostNumber > 0
                    ? currentPostNumber
                    : undefined,
            ),
            mode: 'fullScreen',
        });
    }, [currentPostNumber, topicId]);

    const renderPost = useCallback(
        ({ item, index }) => {
            if (item?.__harborItemType === 'topicHeader') {
                return (
                    <View>
                        <HarborTopicHeader
                            topic={topic}
                            onCopy={copyCurrentPost}
                            onMarkUnread={markTopicUnread}
                            onOpenNotifications={openNotificationLevels}
                            onOpenOriginal={openOriginalTopic}
                            onShare={shareCurrentPost}
                            onPressCategory={openCategory}
                            onPressTag={openTag}
                            pendingMarkUnread={
                                pendingMutations[`unread:${topicId}`]
                            }
                            pendingNotification={
                                pendingMutations[`notification:${topicId}`]
                            }
                        />
                        {isLoadingPrevious ? (
                            <ActivityIndicator
                                size="small"
                                color={themeColor}
                                style={styles.edgeLoader}
                            />
                        ) : null}
                    </View>
                );
            }

            const postIndex = index - LIST_POST_INDEX_OFFSET;
            const previousPostNumber =
                postIndex > 0
                    ? Number(posts[postIndex - 1]?.post_number || 0)
                    : 0;
            const showUnreadDivider =
                unreadAfterPostNumber >= 0 &&
                Number(item.post_number) > unreadAfterPostNumber &&
                (postIndex === 0 ||
                    previousPostNumber <= unreadAfterPostNumber);

            return (
                <View>
                    {showUnreadDivider ? (
                        <View style={styles.unreadDivider}>
                            <View
                                style={[
                                    styles.unreadDividerLine,
                                    { backgroundColor: themeColor },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.unreadDividerText,
                                    { color: themeColor },
                                ]}>
                                {t('未讀回覆')}
                            </Text>
                            <View
                                style={[
                                    styles.unreadDividerLine,
                                    { backgroundColor: themeColor },
                                ]}
                            />
                        </View>
                    ) : null}
                    <HarborPostCard
                        post={item}
                        contentWidth={contentWidth}
                        imageUrls={imageUrls}
                        onOpenImage={openImage}
                        onPressAuthor={openAuthor}
                        onPressBookmark={openBookmarkEditor}
                        onPressComposeReply={openPostReplyComposer}
                        onPressCopy={copyPostPermalink}
                        onPressEdit={openPostEditComposer}
                        onPressLike={togglePostLike}
                        onPressLink={openHarborLink}
                        onPressQuote={openPostQuoteComposer}
                        onPressReply={scrollToPost}
                        onPressShare={sharePost}
                        onSelectReaction={selectPostReaction}
                        canReply={canReplyToTopic}
                        pendingBookmark={
                            pendingMutations[`bookmark:${item.id}`]
                        }
                        pendingLike={pendingMutations[`like:${item.id}`]}
                        pendingReaction={
                            pendingMutations[`reaction:${item.id}`]
                        }
                        reactions={validReactions}
                        reactionsEnabled={validReactions.length > 0}
                    />
                </View>
            );
        },
        [
            canReplyToTopic,
            contentWidth,
            imageUrls,
            isLoadingPrevious,
            copyCurrentPost,
            copyPostPermalink,
            markTopicUnread,
            openAuthor,
            openBookmarkEditor,
            openCategory,
            openHarborLink,
            openImage,
            openNotificationLevels,
            openOriginalTopic,
            openPostEditComposer,
            openPostQuoteComposer,
            openPostReplyComposer,
            openTag,
            pendingMutations,
            posts,
            scrollToPost,
            selectPostReaction,
            sharePost,
            shareCurrentPost,
            t,
            themeColor,
            togglePostLike,
            topic,
            topicId,
            unreadAfterPostNumber,
            validReactions,
        ],
    );

    if (isLoading && !topic) {
        return (
            <View style={[styles.centeredPage, { backgroundColor: bg_color }]}>
                <Loading />
            </View>
        );
    }

    if (!topic) {
        return (
            <View style={[styles.centeredPage, { backgroundColor: bg_color }]}>
                <View
                    style={[
                        styles.errorIcon,
                        { backgroundColor: tonal.primary15 },
                    ]}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={scale(34)}
                        color={themeColor}
                    />
                </View>
                <Text style={[styles.errorTitle, { color: black.main }]}>
                    {t('暫時無法顯示帖子')}
                </Text>
                <Text style={[styles.errorDescription, { color: black.third }]}>
                    {errorMessage || t('請稍後再試')}
                </Text>
                <Pressable
                    onPress={() => {
                        trigger();
                        loadTopic();
                    }}
                    style={({ pressed }) => [
                        styles.primaryButton,
                        {
                            backgroundColor: pressed
                                ? tonal.primary50
                                : themeColor,
                        },
                    ]}>
                    <Text
                        style={[styles.primaryButtonText, { color: trueWhite }]}>
                        {t('重新載入')}
                    </Text>
                </Pressable>
                {Number.isInteger(topicId) && topicId > 0 ? (
                    <Pressable
                        onPress={openOriginalTopic}
                        style={({ pressed }) => [
                            styles.secondaryButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.secondaryButtonText,
                                { color: themeColor },
                            ]}>
                            {t('在 Harbor 開啟')}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        );
    }

    return (
        <View style={[styles.page, { backgroundColor: bg_color }]}>
            <FlashList
                ref={listRef}
                data={listData}
                renderItem={renderPost}
                keyExtractor={item => {
                    if (item?.__harborItemType === 'topicHeader') {
                        return 'harbor-topic-header';
                    }
                    return `harbor-post-${item.id}`;
                }}
                getItemType={item => {
                    if (item?.__harborItemType === 'topicHeader') {
                        return 'topicHeader';
                    }
                    return 'post';
                }}
                contentContainerStyle={listContentContainerStyle}
                extraData={currentPostNumber}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                scrollIndicatorInsets={
                    isLiquidGlassSupported
                        ? {
                            top: headerHeight,
                            bottom: showReadingControls
                                ? readingControlsDockHeight
                                : 0,
                        }
                        : {
                            bottom: showReadingControls
                                ? readingControlsDockHeight
                                : 0,
                        }
                }
                showsVerticalScrollIndicator={false}
                drawDistance={700}
                ListFooterComponent={
                    <View>
                        {isLoadingNext ? (
                            <ActivityIndicator
                                size="small"
                                color={themeColor}
                                style={styles.edgeLoader}
                            />
                        ) : null}
                        {canReplyToTopic ? (
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    openTopicReplyComposer();
                                }}
                                style={({ pressed }) => [
                                    styles.topicReplyButton,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary50
                                            : themeColor,
                                    },
                                ]}>
                                <MaterialCommunityIcons
                                    name="reply-outline"
                                    size={scale(18)}
                                    color={trueWhite}
                                />
                                <Text
                                    style={[
                                        styles.topicReplyButtonText,
                                        { color: trueWhite },
                                    ]}>
                                    {t('回覆話題')}
                                </Text>
                            </Pressable>
                        ) : null}
                        <HarborRelatedTopics
                            topics={topic.suggested_topics}
                            onPressTopic={openRelatedTopic}
                        />
                    </View>
                }
                onStartReached={() => loadAdjacentPosts('previous')}
                onStartReachedThreshold={0.25}
                onEndReached={() => loadAdjacentPosts('next')}
                onEndReachedThreshold={0.4}
                onViewableItemsChanged={handleViewableItemsChanged}
                viewabilityConfig={TOPIC_VIEWABILITY_CONFIG}
                onScroll={handleScroll}
                scrollEventThrottle={80}
                onScrollBeginDrag={handleScrollBeginDrag}
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        progressViewOffset={
                            isLiquidGlassSupported ? headerHeight : undefined
                        }
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            trigger();
                            loadTopic({ refresh: true });
                        }}
                    />
                }
            />

            {showReadingControls ? (
                <View
                    pointerEvents="box-none"
                    style={[
                        styles.readingControlsDock,
                        {
                            paddingBottom: Math.max(
                                insets.bottom,
                                verticalScale(8),
                            ),
                        },
                    ]}>
                    <HarborReadingControls
                        currentPostNumber={currentPostNumber}
                        highestPostNumber={highestPostNumber}
                        onFirst={() => scrollToPost(1)}
                        onJump={() => {
                            setJumpPostNumber(String(currentPostNumber || 1));
                            setIsJumpVisible(true);
                        }}
                        onLatest={() => scrollToPost(highestPostNumber)}
                        onUnread={() => scrollToPost(firstUnreadPostNumber)}
                        onSeek={seekReadingProgress}
                        unreadPostNumber={firstUnreadPostNumber}
                        onLayoutHeight={height => {
                            setReadingControlsDockHeight(
                                height +
                                Math.max(insets.bottom, verticalScale(8)) +
                                verticalScale(8),
                            );
                        }}
                    />
                </View>
            ) : null}

            {pendingNewPostIds.length > 0 ? (
                <Pressable
                    onPress={() => {
                        trigger();
                        loadNewReplies();
                    }}
                    style={({ pressed }) => [
                        styles.newRepliesButton,
                        {
                            bottom: showReadingControls
                                ? readingControlsDockHeight + verticalScale(10)
                                : Math.max(insets.bottom, verticalScale(18)),
                            backgroundColor: pressed
                                ? tonal.primary50
                                : themeColor,
                        },
                    ]}>
                    {isLoadingNext ? (
                        <ActivityIndicator
                            size="small"
                            color={trueWhite}
                        />
                    ) : (
                        <MaterialCommunityIcons
                            name="arrow-down-circle-outline"
                            size={scale(18)}
                            color={trueWhite}
                        />
                    )}
                    <Text
                        style={[
                            styles.newRepliesButtonText,
                            { color: trueWhite },
                        ]}>
                        {t('{{count}} 個新回覆', {
                            count: pendingNewPostIds.length,
                        })}
                    </Text>
                </Pressable>
            ) : null}

            <Modal
                transparent
                visible={isJumpVisible}
                animationType="fade"
                onRequestClose={() => setIsJumpVisible(false)}>
                <View style={styles.modalPage}>
                    <Pressable
                        style={[
                            StyleSheet.absoluteFill,
                            styles.modalBackdrop,
                            { backgroundColor: theme.trueBlack },
                        ]}
                        onPress={() => {
                            trigger();
                            setIsJumpVisible(false);
                        }}
                    />
                    <View
                        style={[
                            styles.jumpDialog,
                            { backgroundColor: theme.white },
                        ]}>
                        <Text
                            style={[
                                styles.jumpDialogTitle,
                                { color: black.main },
                            ]}>
                            {t('跳至樓層')}
                        </Text>
                        <Text
                            style={[
                                styles.jumpDialogHint,
                                { color: black.third },
                            ]}>
                            {t('樓層範圍：{{first}}–{{last}}', {
                                first: 1,
                                last: highestPostNumber,
                            })}
                        </Text>
                        <TextInput
                            value={jumpPostNumber}
                            onChangeText={setJumpPostNumber}
                            keyboardType="number-pad"
                            returnKeyType="go"
                            onSubmitEditing={submitPostJump}
                            autoFocus
                            selectTextOnFocus
                            style={[
                                styles.jumpInput,
                                {
                                    color: black.main,
                                    backgroundColor: tonal.primary08,
                                    borderColor: themeColor,
                                },
                            ]}
                        />
                        <View style={styles.jumpDialogActions}>
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    setIsJumpVisible(false);
                                }}
                                style={({ pressed }) => [
                                    styles.jumpDialogButton,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary30
                                            : tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.jumpDialogButtonText,
                                        { color: themeColor },
                                    ]}>
                                    {t('取消')}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={submitPostJump}
                                style={({ pressed }) => [
                                    styles.jumpDialogButton,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary50
                                            : themeColor,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.jumpDialogButtonText,
                                        { color: trueWhite },
                                    ]}>
                                    {t('前往')}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={Boolean(bookmarkEditor)}
                animationType="fade"
                onRequestClose={() => setBookmarkEditor(null)}>
                <View style={styles.modalPage}>
                    <Pressable
                        style={[
                            StyleSheet.absoluteFill,
                            styles.modalBackdrop,
                            { backgroundColor: theme.trueBlack },
                        ]}
                        onPress={() => {
                            trigger();
                            setBookmarkEditor(null);
                        }}
                    />
                    <View
                        style={[
                            styles.actionDialog,
                            { backgroundColor: theme.white },
                        ]}>
                        <Text
                            style={[
                                styles.actionDialogTitle,
                                { color: black.main },
                            ]}>
                            {bookmarkEditor?.bookmarkId
                                ? t('編輯收藏')
                                : t('收藏帖子')}
                        </Text>
                        <Text
                            style={[
                                styles.actionDialogLabel,
                                { color: black.second },
                            ]}>
                            {t('收藏名稱')}
                        </Text>
                        <TextInput
                            value={bookmarkEditor?.name || ''}
                            onChangeText={name =>
                                setBookmarkEditor(current =>
                                    current ? { ...current, name } : current,
                                )
                            }
                            maxLength={100}
                            placeholder={t('選填，方便日後尋找')}
                            placeholderTextColor={black.third}
                            style={[
                                styles.bookmarkNameInput,
                                {
                                    color: black.main,
                                    backgroundColor: tonal.primary08,
                                    borderColor: themeColor,
                                },
                            ]}
                        />
                        <Text
                            style={[
                                styles.actionDialogLabel,
                                { color: black.second },
                            ]}>
                            {t('提醒日期')}
                        </Text>
                        <View style={styles.bookmarkReminderRow}>
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    setBookmarkEditor(current =>
                                        current
                                            ? { ...current, reminderAt: null }
                                            : current,
                                    );
                                }}
                                style={({ pressed }) => [
                                    styles.reminderButton,
                                    {
                                        backgroundColor:
                                            !bookmarkEditor?.reminderAt || pressed
                                                ? tonal.primary30
                                                : tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.reminderButtonText,
                                        { color: themeColor },
                                    ]}>
                                    {t('無提醒')}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    setIsBookmarkReminderVisible(true);
                                }}
                                style={({ pressed }) => [
                                    styles.reminderButton,
                                    styles.reminderDateButton,
                                    {
                                        backgroundColor:
                                            bookmarkEditor?.reminderAt || pressed
                                                ? tonal.primary30
                                                : tonal.primary15,
                                    },
                                ]}>
                                <MaterialCommunityIcons
                                    name="calendar-clock-outline"
                                    size={scale(15)}
                                    color={themeColor}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.reminderButtonText,
                                        { color: themeColor },
                                    ]}>
                                    {bookmarkEditor?.reminderAt
                                        ? moment(bookmarkEditor.reminderAt).format(
                                            'YYYY/MM/DD HH:mm',
                                        )
                                        : t('選擇日期')}
                                </Text>
                            </Pressable>
                        </View>
                        <View style={styles.actionDialogActions}>
                            {bookmarkEditor?.bookmarkId ? (
                                <Pressable
                                    onPress={() => {
                                        trigger();
                                        removePostBookmark();
                                    }}
                                    style={({ pressed }) => [
                                        styles.actionDialogButton,
                                        {
                                            backgroundColor: pressed
                                                ? tonal.primary30
                                                : tonal.primary15,
                                        },
                                    ]}>
                                    <Text
                                        style={[
                                            styles.actionDialogButtonText,
                                            { color: themeColor },
                                        ]}>
                                        {t('取消收藏')}
                                    </Text>
                                </Pressable>
                            ) : null}
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    setBookmarkEditor(null);
                                }}
                                style={({ pressed }) => [
                                    styles.actionDialogButton,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary30
                                            : tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.actionDialogButtonText,
                                        { color: themeColor },
                                    ]}>
                                    {t('取消')}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    savePostBookmark();
                                }}
                                style={({ pressed }) => [
                                    styles.actionDialogButton,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary50
                                            : themeColor,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.actionDialogButtonText,
                                        { color: trueWhite },
                                    ]}>
                                    {t('儲存')}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={isNotificationVisible}
                animationType="fade"
                onRequestClose={() => setIsNotificationVisible(false)}>
                <View style={styles.modalPage}>
                    <Pressable
                        style={[
                            StyleSheet.absoluteFill,
                            styles.modalBackdrop,
                            { backgroundColor: theme.trueBlack },
                        ]}
                        onPress={() => {
                            trigger();
                            setIsNotificationVisible(false);
                        }}
                    />
                    <View
                        style={[
                            styles.actionDialog,
                            { backgroundColor: theme.white },
                        ]}>
                        <Text
                            style={[
                                styles.actionDialogTitle,
                                { color: black.main },
                            ]}>
                            {t('話題通知')}
                        </Text>
                        {TOPIC_NOTIFICATION_OPTIONS.map(option => {
                            const selected =
                                Number(topic.details?.notification_level) ===
                                option.level;
                            return (
                                <Pressable
                                    key={option.level}
                                    onPress={() => {
                                        trigger();
                                        changeNotificationLevel(option.level);
                                    }}
                                    style={({ pressed }) => [
                                        styles.notificationOption,
                                        {
                                            backgroundColor:
                                                selected || pressed
                                                    ? tonal.primary15
                                                    : theme.white,
                                            borderTopColor:
                                                themeColorUltraLight,
                                        },
                                    ]}>
                                    <MaterialCommunityIcons
                                        name={option.icon}
                                        size={scale(19)}
                                        color={themeColor}
                                    />
                                    <View style={styles.notificationContent}>
                                        <Text
                                            style={[
                                                styles.notificationLabel,
                                                { color: black.main },
                                            ]}>
                                            {t(option.label)}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.notificationDescription,
                                                { color: black.third },
                                            ]}>
                                            {t(option.description)}
                                        </Text>
                                    </View>
                                    {selected ? (
                                        <MaterialCommunityIcons
                                            name="check"
                                            size={scale(18)}
                                            color={themeColor}
                                        />
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </Modal>

            <DateTimePickerModal
                isVisible={isBookmarkReminderVisible}
                mode="datetime"
                date={
                    bookmarkEditor?.reminderAt
                        ? new Date(bookmarkEditor.reminderAt)
                        : new Date(Date.now() + 60 * 60 * 1000)
                }
                minimumDate={new Date()}
                onConfirm={date => {
                    trigger();
                    setIsBookmarkReminderVisible(false);
                    setBookmarkEditor(current =>
                        current
                            ? { ...current, reminderAt: date.toISOString() }
                            : current,
                    );
                }}
                onCancel={() => {
                    trigger();
                    setIsBookmarkReminderVisible(false);
                }}
            />

            <ARKImageView ref={imageViewerRef} imageUrls={imageUrls} />
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    centeredPage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(28),
    },
    topicHeader: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(16),
        marginHorizontal: scale(12),
        marginTop: verticalScale(12),
        marginBottom: verticalScale(0),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(14),
    },
    topicTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(22),
        lineHeight: scale(29),
        fontWeight: '700',
    },
    readingControlsDock: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
    },
    readingControls: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(14),
        marginHorizontal: scale(12),
        marginTop: verticalScale(8),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    progressText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
    },
    progressPercent: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
    },
    progressSlider: {
        width: '100%',
        height: verticalScale(28),
        marginTop: verticalScale(2),
    },
    controlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: verticalScale(4),
    },
    unreadButton: {
        alignSelf: 'center',
        marginTop: verticalScale(2),
        paddingHorizontal: scale(10),
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(7),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(5),
    },
    controlButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '600',
        marginLeft: scale(3),
    },
    topicMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: verticalScale(10),
    },
    tagRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: verticalScale(8),
    },
    category: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(7),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        marginRight: scale(6),
        marginBottom: verticalScale(5),
    },
    categoryText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
        marginLeft: scale(4),
    },
    tag: {
        borderRadius: scale(7),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
        marginRight: scale(6),
        marginBottom: verticalScale(5),
    },
    tagText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
    },
    lastUpdated: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(7),
    },
    webActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: verticalScale(11),
    },
    webOriginalButton: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(9),
        marginRight: scale(6),
        marginBottom: verticalScale(4),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(7),
    },
    webOriginalText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
        marginHorizontal: scale(6),
    },
    postCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(14),
        marginHorizontal: scale(12),
        marginVertical: verticalScale(6),
        paddingHorizontal: scale(12),
        paddingTop: verticalScale(12),
        overflow: 'hidden',
    },
    postStateCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(12),
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginHorizontal: scale(12),
        marginVertical: verticalScale(6),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(12),
    },
    postStateText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(12),
        marginLeft: scale(7),
    },
    postStateNumber: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginLeft: scale(7),
    },
    noticeContent: {
        flex: 1,
        marginLeft: scale(7),
    },
    noticeTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
        marginBottom: verticalScale(3),
    },
    postHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    authorLink: {
        flex: 1,
        flexDirection: 'row',
        minWidth: 0,
    },
    pressedLink: {
        opacity: 0.7,
    },
    avatar: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(21),
    },
    authorArea: {
        flex: 1,
        marginLeft: scale(9),
        minWidth: 0,
    },
    authorName: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        lineHeight: scale(18),
        fontWeight: '600',
    },
    authorDetails: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(2),
    },
    userTitle: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        lineHeight: scale(14),
    },
    staffBadge: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '700',
        borderRadius: scale(5),
        marginLeft: scale(5),
        paddingHorizontal: scale(5),
        paddingVertical: verticalScale(1),
        overflow: 'hidden',
    },
    postTime: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(2),
    },
    postNumber: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
        marginLeft: scale(8),
    },
    replyBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(7),
        marginTop: verticalScale(9),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(5),
    },
    replyText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '600',
        marginLeft: scale(4),
    },
    postBody: {
        marginTop: verticalScale(11),
    },
    inlineEmoji: {
        width: scale(18),
        height: scale(18),
    },
    iframeContainer: {
        overflow: 'hidden',
        borderRadius: scale(10),
        marginVertical: verticalScale(8),
    },
    interactiveFallback: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(8),
        marginBottom: verticalScale(8),
        paddingHorizontal: scale(9),
        paddingVertical: verticalScale(7),
    },
    interactiveFallbackText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
        marginLeft: scale(5),
    },
    postFooter: {
        minHeight: verticalScale(38),
        borderTopWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: verticalScale(5),
    },
    postActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: verticalScale(10),
    },
    composerActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: verticalScale(6),
    },
    composerMenuView: {
        flex: 1,
    },
    reactionMenuView: {
        flex: 1,
        marginRight: scale(6),
    },
    reactionMenuButton: {
        marginRight: 0,
    },
    postActionButton: {
        minWidth: scale(72),
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(8),
        marginRight: scale(6),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(7),
    },
    postActionText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        fontWeight: '600',
        marginLeft: scale(4),
    },
    postIconButton: {
        width: scale(34),
        height: verticalScale(30),
        borderRadius: scale(8),
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: scale(4),
    },
    footerMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scale(12),
    },
    metaText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginLeft: scale(3),
    },
    unreadDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: scale(16),
        marginVertical: verticalScale(7),
    },
    unreadDividerLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
    },
    unreadDividerText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
        marginHorizontal: scale(8),
    },
    edgeLoader: {
        marginVertical: verticalScale(12),
    },
    topicReplyButton: {
        minHeight: verticalScale(42),
        borderRadius: scale(11),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: scale(12),
        marginTop: verticalScale(10),
        paddingHorizontal: scale(16),
    },
    topicReplyButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
        marginLeft: scale(6),
    },
    relatedTopics: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(14),
        marginHorizontal: scale(12),
        marginTop: verticalScale(10),
        marginBottom: verticalScale(10),
        overflow: 'hidden',
    },
    relatedTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '700',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(11),
    },
    relatedTopic: {
        minHeight: verticalScale(42),
        borderTopWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
    },
    relatedTopicTitle: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(12),
        lineHeight: scale(17),
    },
    listFooter: {
        height: verticalScale(12),
    },
    newRepliesButton: {
        position: 'absolute',
        left: scale(28),
        right: scale(28),
        minHeight: verticalScale(42),
        borderRadius: scale(21),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(16),
        zIndex: 21,
    },
    newRepliesButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
        marginLeft: scale(6),
    },
    modalPage: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(28),
    },
    modalBackdrop: {
        opacity: 0.55,
    },
    jumpDialog: {
        width: '100%',
        borderRadius: scale(16),
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(16),
    },
    jumpDialogTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(17),
        fontWeight: '700',
    },
    jumpDialogHint: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(4),
    },
    jumpInput: {
        ...uiStyle.defaultText,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(9),
        fontSize: scale(16),
        marginTop: verticalScale(12),
        paddingHorizontal: scale(11),
        paddingVertical: verticalScale(8),
    },
    jumpDialogActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: verticalScale(12),
    },
    jumpDialogButton: {
        minWidth: scale(72),
        alignItems: 'center',
        borderRadius: scale(8),
        marginLeft: scale(8),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
    },
    jumpDialogButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '700',
    },
    actionDialog: {
        width: '100%',
        maxHeight: '88%',
        borderRadius: scale(16),
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(16),
    },
    actionDialogTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(17),
        fontWeight: '700',
        marginBottom: verticalScale(10),
    },
    actionDialogLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
        marginBottom: verticalScale(5),
    },
    bookmarkNameInput: {
        ...uiStyle.defaultText,
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(9),
        fontSize: scale(13),
        marginBottom: verticalScale(12),
        paddingHorizontal: scale(11),
        paddingVertical: verticalScale(8),
    },
    bookmarkReminderRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reminderButton: {
        minHeight: verticalScale(34),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(8),
        paddingHorizontal: scale(10),
    },
    reminderDateButton: {
        flex: 1,
        marginLeft: scale(7),
    },
    reminderButtonText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(11),
        fontWeight: '600',
        marginLeft: scale(4),
    },
    actionDialogActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        marginTop: verticalScale(16),
    },
    actionDialogButton: {
        minWidth: scale(70),
        alignItems: 'center',
        borderRadius: scale(8),
        marginLeft: scale(7),
        marginTop: verticalScale(5),
        paddingHorizontal: scale(11),
        paddingVertical: verticalScale(8),
    },
    actionDialogButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
    },
    reactionGlyph: {
        textAlign: 'center',
    },
    reactionFallbackText: {
        ...uiStyle.defaultText,
        fontWeight: '600',
        textAlign: 'center',
    },
    notificationOption: {
        minHeight: verticalScale(54),
        borderTopWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(8),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(7),
    },
    notificationContent: {
        flex: 1,
        marginHorizontal: scale(9),
    },
    notificationLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '700',
    },
    notificationDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: scale(14),
        marginTop: verticalScale(2),
    },
    errorIcon: {
        width: scale(64),
        height: scale(64),
        borderRadius: scale(32),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(14),
    },
    errorTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '700',
        textAlign: 'center',
    },
    errorDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        lineHeight: scale(19),
        textAlign: 'center',
        marginTop: verticalScale(6),
    },
    primaryButton: {
        minWidth: scale(150),
        alignItems: 'center',
        borderRadius: scale(11),
        marginTop: verticalScale(18),
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(10),
    },
    primaryButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
    secondaryButton: {
        minWidth: scale(150),
        alignItems: 'center',
        borderRadius: scale(11),
        marginTop: verticalScale(8),
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(10),
    },
    secondaryButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
    },
});

export default HarborTopicDetail;
