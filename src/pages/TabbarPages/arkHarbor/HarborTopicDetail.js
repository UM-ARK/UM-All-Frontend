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

import { FlashList } from '@shopify/flash-list';
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
    fetchHarborTopic,
    fetchHarborTopicPosts,
    saveHarborTopicTimings,
} from '../../../utils/harbor/harborApi';
import { parseHarborUrl } from '../../../utils/harbor/harborNavigation';
import {
    getHarborReadingPosition,
    saveHarborReadingPosition,
} from '../../../utils/harbor/harborReading';
import {
    ARK_HARBOR,
    ARK_HARBOR_ABSOLUTE_URL,
    ARK_HARBOR_AVATAR_TEMPLATE,
    ARK_HARBOR_TOPIC_URL,
} from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';

const AVATAR_SIZE = 88;
const TOPIC_POST_BATCH_SIZE = 20;
const READING_SAVE_DELAY = 1200;
const TIMINGS_REPORT_INTERVAL = 10000;
const TOPIC_HEADER_ITEM = Object.freeze({
    __harborItemType: 'topicHeader',
    id: 'topic-header',
});
// 列表前綴：話題標題
const LIST_POST_INDEX_OFFSET = 1;
const TOPIC_VIEWABILITY_CONFIG = {
    // 較低門檻，方便辨識畫面最上方仍露出的樓層
    itemVisiblePercentThreshold: 20,
    minimumViewTime: 120,
};

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
        onPressLink,
        onPressReply,
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
            post.notice ||
            post.small_action ||
            post.post_type === 3,
        );

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
                        icon="heart-outline"
                        value={reactionCount}
                        color={themeColor}
                    />
                </View>
            </View>
        );
    },
);

const HarborTopicHeader = memo(
    ({ topic, onOpenOriginal, onShare, onPressCategory, onPressTag }) => {
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
                        <MaterialCommunityIcons
                            name="folder-outline"
                            size={scale(13)}
                            color={themeColor}
                        />
                        <Text
                            style={[styles.categoryText, { color: themeColor }]}>
                            {categoryName || `分類 #${categoryId}`}
                        </Text>
                    </Pressable>
                ) : null}

                {tags.length > 0 ? (
                    <View style={styles.tagRow}>
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
        onSeek,
        onLayoutHeight,
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
        // 避免同一樓層在拖曳中重複觸發跳轉
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
                        seekToFloor(value, { scrubbing: true });
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
    const { status: sessionStatus } = useHarborSession();
    const { width } = useWindowDimensions();
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const { black, bg_color, themeColor, tonal, trueWhite } = theme;
    const topicId = Number(route.params?.topicId);
    const initialPostNumber = Number(route.params?.postNumber);
    const initialTopicTitle = route.params?.topicTitle;
    const listRef = useRef(null);
    const imageViewerRef = useRef(null);
    const requestGenerationRef = useRef(0);
    const controllerRef = useRef(null);
    const latestTopicRef = useRef(null);
    const pendingTopicRef = useRef(null);
    const pendingScrollRef = useRef(null);
    const hasPerformedInitialScrollRef = useRef(false);
    const adjacentLoadingRef = useRef({ previous: false, next: false });
    const latestVisiblePostRef = useRef(0);
    const readingSaveTimeoutRef = useRef(null);
    const lastTimingsAtRef = useRef(Date.now());
    const sessionStatusRef = useRef(sessionStatus);
    // 主動跳樓後忽略 viewability，避免短帖同屏時被最高可見樓層蓋回
    const ignoreViewabilityFromSeekRef = useRef(false);
    // 底部懸浮閱讀進度高度（含 safe area），供列表底部留白
    const [readingControlsDockHeight, setReadingControlsDockHeight] = useState(
        verticalScale(120),
    );
    const [topic, setTopic] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
    const [isLoadingNext, setIsLoadingNext] = useState(false);
    const [pendingNewPostIds, setPendingNewPostIds] = useState([]);
    const [unreadAfterPostNumber, setUnreadAfterPostNumber] = useState(0);
    const [currentPostNumber, setCurrentPostNumber] = useState(1);
    const [isJumpVisible, setIsJumpVisible] = useState(false);
    const [jumpPostNumber, setJumpPostNumber] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const posts = useMemo(() => {
        const topicPosts = topic?.post_stream?.posts;
        if (!Array.isArray(topicPosts)) {
            return [];
        }
        return topicPosts.filter(post => post?.id);
    }, [topic]);

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

    // 僅一層樓時無需閱讀進度導航
    const showReadingControls = useMemo(() => {
        return (
            posts.length > 1 || Number(topic?.posts_count || 0) > 1
        );
    }, [posts.length, topic?.posts_count]);

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
                const localPostNumber = refresh
                    ? null
                    : await getHarborReadingPosition(topicId);
                const hasRoutePostNumber =
                    Number.isInteger(initialPostNumber) &&
                    initialPostNumber > 0;
                let targetPostNumber =
                    hasRoutePostNumber
                        ? initialPostNumber
                        : localPostNumber;
                let nextTopic = await fetchHarborTopic(topicId, {
                    ...(targetPostNumber
                        ? { postNumber: targetPostNumber }
                        : {}),
                    signal: controller.signal,
                });
                if (
                    controller.signal.aborted ||
                    requestGeneration !== requestGenerationRef.current
                ) {
                    return;
                }
                if (targetPostNumber) {
                    targetPostNumber = Math.min(
                        Math.max(Number(targetPostNumber), 1),
                        Number(
                            nextTopic.highest_post_number ||
                            nextTopic.posts_count ||
                            targetPostNumber,
                        ),
                    );
                }

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
                setUnreadAfterPostNumber(serverLastReadPostNumber);
                latestTopicRef.current = nextTopic;
                setTopic(nextTopic);
                if (!hasRoutePostNumber && serverLastReadPostNumber > 0) {
                    const serverResumePostNumber = Math.min(
                        serverLastReadPostNumber +
                        (Number(nextTopic.unread_posts || 0) > 0 ? 1 : 0),
                        Number(
                            nextTopic.highest_post_number ||
                            nextTopic.posts_count ||
                            serverLastReadPostNumber,
                        ),
                    );
                    targetPostNumber = Math.max(
                        Number(targetPostNumber || 0),
                        serverResumePostNumber,
                    );
                    const targetIsLoaded = nextTopic.post_stream.posts.some(
                        post =>
                            Number(post.post_number) === targetPostNumber,
                    );
                    if (!targetIsLoaded) {
                        const targetTopic = await fetchHarborTopic(topicId, {
                            postNumber: targetPostNumber,
                            signal: controller.signal,
                        });
                        nextTopic = mergeTopicWindow(nextTopic, targetTopic);
                    }
                }

                pendingScrollRef.current = targetPostNumber || 1;
                latestVisiblePostRef.current = targetPostNumber || 1;
                setCurrentPostNumber(targetPostNumber || 1);
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
        [initialPostNumber, t, topicId],
    );

    useEffect(() => {
        logToFirebase('openPage', {
            page: 'HarborTopicDetail',
            topicId,
        });
        loadTopic();

        return () => {
            requestGenerationRef.current += 1;
            controllerRef.current?.abort();
            clearTimeout(readingSaveTimeoutRef.current);
            const lastPostNumber = latestVisiblePostRef.current;
            if (lastPostNumber > 0) {
                saveHarborReadingPosition(topicId, lastPostNumber);
                if (sessionStatusRef.current === 'signedIn') {
                    const now = Date.now();
                    saveHarborTopicTimings(topicId, {
                        postNumber: lastPostNumber,
                        timeMs: now - lastTimingsAtRef.current,
                        topicTimeMs: now - lastTimingsAtRef.current,
                    }).catch(() => { });
                }
            }
        };
    }, [loadTopic, topicId]);

    const handleScrollToIndexFailed = useCallback(info => {
        const index = Math.max(Number(info?.index || 0), 0);
        const viewOffset = Number(info?.viewOffset || 0);
        listRef.current?.scrollToOffset({
            offset: Math.max(index * verticalScale(260) - viewOffset, 0),
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
        return isLiquidGlassSupported ? headerHeight : 0;
    }, [headerHeight]);

    const scrollToLoadedPost = useCallback(
        (postNumber, animated = true) => {
            const loadedPosts =
                latestTopicRef.current?.post_stream?.posts?.filter(
                    post => post?.id,
                ) || [];
            const postIndex = loadedPosts.findIndex(post => {
                return Number(post.post_number) === Number(postNumber);
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
            setCurrentPostNumber(normalizedPostNumber);
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
        [scrollToLoadedPost, t, topicId],
    );

    // 閱讀進度 Slider：拖曳中只滾動已載入樓層，鬆手後再允許網路補抓
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
                    hasPerformedInitialScrollRef.current,
                )
            ) {
                pendingScrollRef.current = null;
                hasPerformedInitialScrollRef.current = true;
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

    const handleViewableItemsChanged = useCallback(
        ({ viewableItems }) => {
            // 主動跳樓期間不跟畫面可見樓層，避免短帖同屏或滾動動畫中途覆寫進度
            if (ignoreViewabilityFromSeekRef.current) {
                return;
            }
            const visiblePosts = viewableItems
                .filter(viewableItem =>
                    Number.isInteger(Number(viewableItem.item?.post_number)),
                )
                .sort(
                    (left, right) =>
                        Number(left.index) - Number(right.index),
                );
            if (visiblePosts.length === 0) {
                return;
            }

            // 閱讀進度：取畫面最上方那層樓（索引最小的可見帖）
            const topVisiblePostNumber = Number(
                visiblePosts[0].item.post_number,
            );
            setCurrentPostNumber(topVisiblePostNumber);

            // 已讀位置仍用可見範圍內最高樓層，供未讀／進度同步
            const furthestVisiblePostNumber = Math.max(
                ...visiblePosts.map(viewableItem =>
                    Number(viewableItem.item.post_number),
                ),
            );
            if (furthestVisiblePostNumber <= latestVisiblePostRef.current) {
                return;
            }
            latestVisiblePostRef.current = furthestVisiblePostNumber;
            clearTimeout(readingSaveTimeoutRef.current);
            readingSaveTimeoutRef.current = setTimeout(() => {
                saveHarborReadingPosition(
                    topicId,
                    furthestVisiblePostNumber,
                );
                const now = Date.now();
                if (
                    sessionStatusRef.current === 'signedIn' &&
                    now - lastTimingsAtRef.current >= TIMINGS_REPORT_INTERVAL
                ) {
                    saveHarborTopicTimings(topicId, {
                        postNumber: furthestVisiblePostNumber,
                        timeMs: now - lastTimingsAtRef.current,
                        topicTimeMs: now - lastTimingsAtRef.current,
                    }).catch(() => { });
                    lastTimingsAtRef.current = now;
                }
            }, READING_SAVE_DELAY);
        },
        [topicId],
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
                            onOpenOriginal={openOriginalTopic}
                            onShare={shareCurrentPost}
                            onPressCategory={openCategory}
                            onPressTag={openTag}
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
                unreadAfterPostNumber > 0 &&
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
                        onPressLink={openHarborLink}
                        onPressReply={scrollToPost}
                    />
                </View>
            );
        },
        [
            contentWidth,
            imageUrls,
            isLoadingPrevious,
            openAuthor,
            openCategory,
            openHarborLink,
            openImage,
            openOriginalTopic,
            openTag,
            posts,
            scrollToPost,
            shareCurrentPost,
            t,
            themeColor,
            topic,
            unreadAfterPostNumber,
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
                        onSeek={seekReadingProgress}
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
        marginTop: verticalScale(8),
    },
    category: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(7),
        marginTop: verticalScale(8),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
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
