import React, {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Image as NativeImage,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

import {FlashList} from '@shopify/flash-list';
import axios from 'axios';
import {Image} from 'expo-image';
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
import {WebView} from 'react-native-webview';
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import ARKImageView from '../../../../components/ARKImageView';
import Loading from '../../../../components/Loading';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {openLink} from '../../../../utils/browser';
import {logToFirebase} from '../../../../utils/firebaseAnalytics';
import {
    getHarborHtmlAttribute,
    replaceHarborEmojiImages,
} from '../../../../utils/harbor/harborHtml';
import {fetchHarborTopic} from '../../../../utils/harbor/harborApi';
import {parseHarborUrl} from '../../../../utils/harbor/harborNavigation';
import {
    ARK_HARBOR,
    ARK_HARBOR_ABSOLUTE_URL,
    ARK_HARBOR_AVATAR_TEMPLATE,
    ARK_HARBOR_TOPIC_URL,
} from '../../../../utils/pathMap';
import {trigger} from '../../../../utils/trigger';

const AVATAR_SIZE = 88;

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

const HarborIframeRenderer = ({tnode}) => {
    const {theme} = useTheme();
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
                {height, backgroundColor: theme.white},
            ]}>
            <WebView
                source={{uri: sourceUrl}}
                style={{backgroundColor: theme.white}}
                scrollEnabled={false}
                allowsInlineMediaPlayback
            />
        </View>
    );
};

const HarborEmojiRenderer = ({tnode}) => {
    const sourceUrl = normalizeHtmlUrl(tnode?.attributes?.src);
    const label = tnode?.attributes?.alt || '';

    if (!sourceUrl) {
        return label ? <Text>{label}</Text> : null;
    }

    return (
        <NativeImage
            source={{uri: sourceUrl}}
            style={styles.inlineEmoji}
            resizeMode="contain"
            accessible={Boolean(label)}
            accessibilityLabel={label || undefined}
        />
    );
};

const HarborImageRenderer = props => {
    const {theme} = useTheme();
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
                source={{uri: state.source?.uri}}
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
    ({cooked, contentWidth, imageUrls, onOpenImage, onPressLink, postUrl}) => {
        const {theme} = useTheme();
        const {t} = useTranslation('harbor');
        const {black, themeColor, themeColorUltraLight, tonal, white} = theme;
        const normalizedCooked = useMemo(() => {
            return replaceHarborEmojiImages(cooked);
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
                meta: {display: 'none'},
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
                    source={{html: normalizedCooked, baseUrl: ARK_HARBOR}}
                    contentWidth={contentWidth}
                    baseStyle={baseStyle}
                    tagsStyles={tagsStyles}
                    classesStyles={classesStyles}
                    renderers={htmlRenderers}
                    renderersProps={renderersProps}
                    customHTMLElementModels={customHTMLElementModels}
                    ignoredDomTags={['svg']}
                    defaultTextProps={{selectable: true}}
                    enableExperimentalBRCollapsing
                    enableExperimentalGhostLinesPrevention
                    enableExperimentalMarginCollapsing
                />
                {requiresInteractiveFallback ? (
                    <Pressable
                        onPress={() => {
                            trigger();
                            openLink({URL: postUrl, mode: 'fullScreen'});
                        }}
                        style={({pressed}) => [
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
                                {color: themeColor},
                            ]}>
                            {t('查看互動內容')}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        );
    },
);

const MetaItem = ({icon, value, color}) => {
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
            <Text style={[styles.metaText, {color}]}>{value}</Text>
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
        const {theme} = useTheme();
        const {t} = useTranslation('harbor');
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

        return (
            <View
                style={[
                    styles.postCard,
                    {backgroundColor: white, borderColor: themeColorUltraLight},
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
                        style={({pressed}) => [
                            styles.authorLink,
                            pressed ? styles.pressedLink : null,
                        ]}>
                        <Image
                            source={{uri: avatarUrl}}
                            style={[
                                styles.avatar,
                                {backgroundColor: tonal.primary15},
                            ]}
                            contentFit="cover"
                            placeholder={theme.imagePlaceholder}
                            placeholderContentFit="cover"
                            transition={200}
                        />
                        <View style={styles.authorArea}>
                            <Text
                                style={[styles.authorName, {color: black.main}]}
                                numberOfLines={1}>
                                {displayName}
                            </Text>
                            <View style={styles.authorDetails}>
                                {post.user_title ? (
                                    <Text
                                        style={[
                                            styles.userTitle,
                                            {color: themeColor},
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
                                style={[styles.postTime, {color: black.third}]}>
                                {moment
                                    .tz(post.created_at, 'Asia/Macau')
                                    .format('YYYY/MM/DD HH:mm')}
                                {wasEdited ? ` · ${t('已編輯')}` : ''}
                            </Text>
                        </View>
                    </Pressable>
                    <Text style={[styles.postNumber, {color: black.third}]}>
                        #{post.post_number}
                    </Text>
                </View>

                {post.reply_to_post_number ? (
                    <Pressable
                        onPress={() => {
                            trigger();
                            onPressReply(post.reply_to_post_number);
                        }}
                        style={({pressed}) => [
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
                        <Text style={[styles.replyText, {color: themeColor}]}>
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
                        {borderTopColor: themeColorUltraLight},
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
    ({topic, onOpenOriginal, onPressCategory, onPressTag}) => {
        const {theme} = useTheme();
        const {t} = useTranslation('harbor');
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
                    {backgroundColor: white, borderColor: themeColorUltraLight},
                    viewShadow,
                ]}>
                <Text
                    selectable
                    style={[styles.topicTitle, {color: black.main}]}>
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
                        style={({pressed}) => [
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
                            style={[styles.categoryText, {color: themeColor}]}>
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
                                style={({pressed}) => [
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
                                        {color: themeColor},
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
                    <Text style={[styles.lastUpdated, {color: black.third}]}>
                        {t('最後更新')} ·{' '}
                        {moment
                            .tz(topic.last_posted_at, 'Asia/Macau')
                            .format('YYYY/MM/DD HH:mm')}
                    </Text>
                ) : null}

                <Pressable
                    onPress={onOpenOriginal}
                    style={({pressed}) => [
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
                    <Text style={[styles.webOriginalText, {color: themeColor}]}>
                        {t('查看 Web 原文')}
                    </Text>
                    <MaterialCommunityIcons
                        name="open-in-new"
                        size={scale(14)}
                        color={themeColor}
                    />
                </Pressable>
            </View>
        );
    },
);

const HarborTopicDetail = ({route, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const {width} = useWindowDimensions();
    const {black, bg_color, themeColor, tonal, trueWhite} = theme;
    const topicId = Number(route.params?.topicId);
    const initialPostNumber = Number(route.params?.postNumber);
    const initialTopicTitle = route.params?.topicTitle;
    const listRef = useRef(null);
    const imageViewerRef = useRef(null);
    const requestGenerationRef = useRef(0);
    const controllerRef = useRef(null);
    const [topic, setTopic] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const posts = useMemo(() => {
        const topicPosts = topic?.post_stream?.posts;
        if (!Array.isArray(topicPosts)) {
            return [];
        }
        return topicPosts.filter(post => {
            return (
                !post?.deleted_at &&
                !post?.user_deleted &&
                typeof post?.cooked === 'string' &&
                post.cooked.trim().length > 0
            );
        });
    }, [topic]);

    const imageUrls = useMemo(() => {
        const urls = posts.flatMap(post => extractPostImages(post.cooked));
        return [...new Set(urls)];
    }, [posts]);

    const contentWidth = Math.max(width - scale(48), scale(220));

    useEffect(() => {
        navigation.setOptions({
            headerTitle: topic?.title || initialTopicTitle || 'Harbor',
        });
    }, [initialTopicTitle, navigation, topic?.title]);

    const loadTopic = useCallback(
        async ({refresh = false} = {}) => {
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
                const nextTopic = await fetchHarborTopic(topicId, {
                    signal: controller.signal,
                });
                if (
                    controller.signal.aborted ||
                    requestGeneration !== requestGenerationRef.current
                ) {
                    return;
                }
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
        logToFirebase('openPage', {
            page: 'HarborTopicDetail',
            topicId,
        });
        loadTopic();

        return () => {
            requestGenerationRef.current += 1;
            controllerRef.current?.abort();
        };
    }, [loadTopic, topicId]);

    const scrollToPost = useCallback(
        postNumber => {
            const postIndex = posts.findIndex(post => {
                return Number(post.post_number) === Number(postNumber);
            });
            if (postIndex < 0) {
                return;
            }
            listRef.current?.scrollToIndex({
                index: postIndex,
                animated: true,
                viewPosition: 0,
            });
        },
        [posts],
    );

    useEffect(() => {
        if (
            !topic ||
            !Number.isInteger(initialPostNumber) ||
            initialPostNumber <= 0
        ) {
            return undefined;
        }
        const timeout = setTimeout(() => {
            scrollToPost(initialPostNumber);
        }, 350);
        return () => clearTimeout(timeout);
    }, [initialPostNumber, scrollToPost, topic]);

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
                        ? {postNumber: target.postNumber}
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
                navigation.navigate('HarborTagTopics', {tag: target.tag});
                return;
            }

            if (target?.type === 'search') {
                navigation.navigate('HarborSearch', {query: target.query});
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
            navigation.navigate('HarborTagTopics', {tag});
        },
        [navigation],
    );

    const renderPost = useCallback(
        ({item}) => (
            <HarborPostCard
                post={item}
                contentWidth={contentWidth}
                imageUrls={imageUrls}
                onOpenImage={openImage}
                onPressAuthor={openAuthor}
                onPressLink={openHarborLink}
                onPressReply={scrollToPost}
            />
        ),
        [
            contentWidth,
            imageUrls,
            openAuthor,
            openHarborLink,
            openImage,
            scrollToPost,
        ],
    );

    const openOriginalTopic = useCallback(() => {
        trigger();
        openLink({
            URL: ARK_HARBOR_TOPIC_URL(
                topicId,
                Number.isInteger(initialPostNumber)
                    ? initialPostNumber
                    : undefined,
            ),
            mode: 'fullScreen',
        });
    }, [initialPostNumber, topicId]);

    if (isLoading && !topic) {
        return (
            <View style={[styles.centeredPage, {backgroundColor: bg_color}]}>
                <Loading />
            </View>
        );
    }

    if (!topic) {
        return (
            <View style={[styles.centeredPage, {backgroundColor: bg_color}]}>
                <View
                    style={[
                        styles.errorIcon,
                        {backgroundColor: tonal.primary15},
                    ]}>
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={scale(34)}
                        color={themeColor}
                    />
                </View>
                <Text style={[styles.errorTitle, {color: black.main}]}>
                    {t('暫時無法顯示帖子')}
                </Text>
                <Text style={[styles.errorDescription, {color: black.third}]}>
                    {errorMessage || t('請稍後再試')}
                </Text>
                <Pressable
                    onPress={() => {
                        trigger();
                        loadTopic();
                    }}
                    style={({pressed}) => [
                        styles.primaryButton,
                        {
                            backgroundColor: pressed
                                ? tonal.primary50
                                : themeColor,
                        },
                    ]}>
                    <Text
                        style={[styles.primaryButtonText, {color: trueWhite}]}>
                        {t('重新載入')}
                    </Text>
                </Pressable>
                {Number.isInteger(topicId) && topicId > 0 ? (
                    <Pressable
                        onPress={openOriginalTopic}
                        style={({pressed}) => [
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
                                {color: themeColor},
                            ]}>
                            {t('在 Harbor 開啟')}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        );
    }

    return (
        <View style={[styles.page, {backgroundColor: bg_color}]}>
            <FlashList
                ref={listRef}
                data={posts}
                renderItem={renderPost}
                keyExtractor={item => `harbor-post-${item.id}`}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
                drawDistance={700}
                ListHeaderComponent={
                    <HarborTopicHeader
                        topic={topic}
                        onOpenOriginal={openOriginalTopic}
                        onPressCategory={openCategory}
                        onPressTag={openTag}
                    />
                }
                ListFooterComponent={<View style={styles.listFooter} />}
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            trigger();
                            loadTopic({refresh: true});
                        }}
                    />
                }
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
        marginBottom: verticalScale(8),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(14),
    },
    topicTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(22),
        lineHeight: scale(29),
        fontWeight: '700',
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
    webOriginalButton: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(9),
        marginTop: verticalScale(11),
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
    listFooter: {
        height: verticalScale(50),
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
