import React, {
    memo,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Image as NativeImage,
    Modal,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import { Image } from 'expo-image';
import RenderHTML, {
    HTMLContentModel,
    HTMLElementModel,
    IMGElementContainer,
    IMGElementContentError,
    useIMGElementProps,
    useIMGElementState,
    useRendererProps,
} from '@native-html/render';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../../components/AppText';
import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { openLink } from '../../../../utils/browser';
import {
    groupConsecutiveHarborImages,
    replaceHarborEmojiImages,
    stripTrailingEmptyHarborHtml,
} from '../../../../utils/harbor/harborHtml';
import { hasHarborInteractiveContent } from '../../../../utils/harbor/harborPostEvent';
import { ARK_HARBOR } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import {
    getHarborImagePressAction,
    normalizeHtmlUrl,
} from './harborTopicModels';
import styles from './styles';

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

const harborImageGridModel = HTMLElementModel.fromCustomModel({
    tagName: 'harbor-image-grid',
    contentModel: HTMLContentModel.block,
});

const harborGridImgModel = HTMLElementModel.fromCustomModel({
    tagName: 'harbor-grid-img',
    contentModel: HTMLContentModel.block,
    isVoid: true,
});

const customHTMLElementModels = {
    'harbor-emoji': harborEmojiModel,
    'harbor-grid-img': harborGridImgModel,
    'harbor-image-grid': harborImageGridModel,
    iframe: iframeModel,
};

const HARBOR_IMAGE_GRID_COLUMNS = 3;

const HarborIframeRenderer = ({ tnode }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const insets = useSafeAreaInsets();
    const embeddedWebViewRef = useRef(null);
    const [fullscreen, setFullscreen] = useState(false);
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

    const openFullscreen = () => {
        trigger();
        embeddedWebViewRef.current?.injectJavaScript(
            `document.querySelectorAll('video').forEach(video => video.pause()); true;`,
        );
        setFullscreen(true);
    };

    const closeFullscreen = () => {
        trigger();
        setFullscreen(false);
    };

    return (
        <>
            <View
                style={[
                    styles.iframeContainer,
                    { height, backgroundColor: theme.white },
                ]}>
                <WebView
                    ref={embeddedWebViewRef}
                    source={{ uri: sourceUrl }}
                    style={{ backgroundColor: theme.white }}
                    scrollEnabled={false}
                    allowsInlineMediaPlayback
                    allowsFullscreenVideo
                />
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('全螢幕播放')}
                    hitSlop={scale(8)}
                    onPress={openFullscreen}
                    style={({ pressed }) => [
                        styles.iframeExpandButton,
                        {
                            backgroundColor: theme.trueWhite,
                            shadowColor: theme.trueBlack,
                            opacity: pressed ? 0.8 : 1,
                        },
                    ]}>
                    <MaterialCommunityIcons
                        name="fullscreen"
                        size={scale(22)}
                        color={theme.trueBlack}
                    />
                </Pressable>
            </View>
            <Modal
                visible={fullscreen}
                animationType="fade"
                presentationStyle="fullScreen"
                statusBarTranslucent
                onRequestClose={closeFullscreen}>
                <View
                    style={[
                        styles.iframeFullscreenModal,
                        { backgroundColor: theme.trueBlack },
                    ]}>
                    {fullscreen ? (
                        <WebView
                            source={{ uri: sourceUrl }}
                            style={[
                                styles.iframeFullscreenWebView,
                                { backgroundColor: theme.trueBlack },
                            ]}
                            scrollEnabled={false}
                            allowsInlineMediaPlayback
                            allowsFullscreenVideo
                        />
                    ) : null}
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('關閉')}
                        hitSlop={scale(8)}
                        onPress={closeFullscreen}
                        style={({ pressed }) => [
                            styles.iframeFullscreenClose,
                            {
                                top: Math.max(insets.top, verticalScale(12)),
                                backgroundColor: theme.trueWhite,
                                shadowColor: theme.trueBlack,
                                opacity: pressed ? 0.8 : 1,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="close"
                            size={scale(22)}
                            color={theme.trueBlack}
                        />
                    </Pressable>
                </View>
            </Modal>
        </>
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
    const sourceUrl = imageProps.source?.uri;

    if (state.type === 'error') {
        return (
            <IMGElementContainer
                style={state.containerStyle}
                onPress={() =>
                    rendererProps.onPress?.({ parentUrl, sourceUrl })
                }>
                <IMGElementContentError {...state} />
            </IMGElementContainer>
        );
    }

    return (
        <IMGElementContainer
            style={state.containerStyle}
            onPress={() => rendererProps.onPress?.({ parentUrl, sourceUrl })}>
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

const collectHarborGridImages = tnode => {
    const images = [];
    const walk = node => {
        if (!node) {
            return;
        }
        if (node.tagName === 'harbor-grid-img') {
            const src = normalizeHtmlUrl(node.attributes?.src);
            const href = normalizeHtmlUrl(node.attributes?.href) || src;
            if (src) {
                images.push({
                    src,
                    href,
                    alt: node.attributes?.alt || '',
                });
            }
            return;
        }
        node.children?.forEach(walk);
    };
    walk(tnode);
    return images;
};

const HarborImageGridRenderer = ({ tnode }) => {
    const { theme } = useTheme();
    const rendererProps = useRendererProps('harbor-image-grid');
    const contentWidth = Number(rendererProps?.contentWidth) || 0;
    const onPressImage = rendererProps?.onPressImage;
    const images = useMemo(() => collectHarborGridImages(tnode), [tnode]);
    const gap = scale(4);
    const cellSize =
        contentWidth > 0
            ? Math.floor(
                (contentWidth - gap * (HARBOR_IMAGE_GRID_COLUMNS - 1)) /
                HARBOR_IMAGE_GRID_COLUMNS,
            )
            : scale(100);

    if (images.length === 0) {
        return null;
    }

    return (
        <View style={[styles.imageGrid, { gap }]}>
            {images.map((image, index) => (
                <Pressable
                    key={`${image.href || image.src}-${index}`}
                    accessibilityRole="imagebutton"
                    accessibilityLabel={image.alt || undefined}
                    onPress={() => onPressImage?.(image)}
                    style={({ pressed }) => [
                        styles.imageGridItem,
                        {
                            width: cellSize,
                            height: cellSize,
                            opacity: pressed ? 0.85 : 1,
                        },
                    ]}>
                    <Image
                        source={{ uri: image.src }}
                        style={styles.imageGridImage}
                        contentFit="cover"
                        placeholder={theme.imagePlaceholder}
                        placeholderContentFit="cover"
                        transition={300}
                        accessibilityLabel={image.alt || undefined}
                    />
                </Pressable>
            ))}
        </View>
    );
};

const htmlRenderers = {
    'harbor-emoji': HarborEmojiRenderer,
    'harbor-image-grid': HarborImageGridRenderer,
    iframe: HarborIframeRenderer,
    img: HarborImageRenderer,
};

const HarborPostContent = memo(
    ({
        cooked,
        contentWidth,
        imageUrls,
        onOpenImage,
        onPressLink,
        postUrl,
        forceInteractiveFallback = false,
        // 回覆帖用較小字級，主帖維持預設
        compact = false,
        children,
    }) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const { black, disabled, themeColor, tonal, white } = theme;
        const normalizedCooked = useMemo(() => {
            return stripTrailingEmptyHarborHtml(
                groupConsecutiveHarborImages(
                    replaceHarborEmojiImages(cooked || ''),
                ),
            );
        }, [cooked]);
        const requiresInteractiveFallback = useMemo(() => {
            return (
                forceInteractiveFallback || hasHarborInteractiveContent(cooked)
            );
        }, [cooked, forceInteractiveFallback]);

        const bodyFontSize = scale(compact ? 13 : 14);
        // compact 回覆用更緊行高，避免短文下方被撐出大塊空白
        const bodyLineHeight = scale(compact ? 17 : 21);

        const baseStyle = useMemo(
            () => ({
                ...uiStyle.defaultText,
                color: black.second,
                fontSize: bodyFontSize,
                lineHeight: bodyLineHeight,
                margin: 0,
                padding: 0,
            }),
            [black.second, bodyFontSize, bodyLineHeight],
        );

        const tagsStyles = useMemo(
            () => ({
                body: {
                    color: black.second,
                    margin: 0,
                    padding: 0,
                },
                div: {
                    marginTop: 0,
                    marginBottom: 0,
                },
                p: {
                    marginTop: 0,
                    // compact 去掉段底距，避免短回覆下方被撐高
                    marginBottom: compact ? 0 : verticalScale(4),
                },
                a: {
                    color: themeColor,
                    fontSize: scale(12),
                    lineHeight: scale(18),
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
                    borderColor: disabled,
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
                    // 限制單圖高度，避免多圖／直圖把帖子撐得過長
                    maxHeight: verticalScale(200),
                },
                hr: {
                    backgroundColor: disabled,
                    height: StyleSheet.hairlineWidth,
                    marginVertical: verticalScale(10),
                },
                table: {
                    borderColor: disabled,
                    borderWidth: StyleSheet.hairlineWidth,
                    marginVertical: verticalScale(8),
                },
                th: {
                    color: black.main,
                    backgroundColor: tonal.primary15,
                    borderColor: disabled,
                    borderWidth: StyleSheet.hairlineWidth,
                    padding: scale(6),
                },
                td: {
                    color: black.second,
                    backgroundColor: white,
                    borderColor: disabled,
                    borderWidth: StyleSheet.hairlineWidth,
                    padding: scale(6),
                },
            }),
            [
                black.main,
                black.second,
                compact,
                disabled,
                themeColor,
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
                    borderColor: disabled,
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
            [disabled, themeColor, tonal.primary08],
        );

        const renderersProps = useMemo(
            () => ({
                a: {
                    onPress: (event, href) => {
                        event?.stopPropagation?.();
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
                    onPress: ({ parentUrl, sourceUrl }) => {
                        const action = getHarborImagePressAction({
                            parentUrl,
                            sourceUrl,
                            imageUrls,
                        });
                        if (action?.type === 'image') {
                            trigger();
                            onOpenImage(action.imageIndex);
                            return;
                        }
                        if (action?.type === 'link') {
                            trigger();
                            onPressLink(action.url);
                        }
                    },
                },
                'harbor-image-grid': {
                    contentWidth,
                    onPressImage: ({ href, src }) => {
                        const action = getHarborImagePressAction({
                            parentUrl: href,
                            sourceUrl: src,
                            imageUrls,
                        });
                        if (action?.type === 'image') {
                            trigger();
                            onOpenImage(action.imageIndex);
                            return;
                        }
                        if (action?.type === 'link') {
                            trigger();
                            onPressLink(action.url);
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
                    defaultTextProps={{
                        selectable: !compact,
                        style: styles.renderedText,
                    }}
                    enableExperimentalBRCollapsing
                    enableExperimentalGhostLinesPrevention
                    enableExperimentalMarginCollapsing
                />
                {children}
                {requiresInteractiveFallback ? (
                    <Pressable
                        onPress={() => {
                            trigger();
                            console.warn(
                                '[HarborPostContent] Web fallback link:',
                                postUrl,
                            );
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
                            {t('在 Web 查看完整詳情')}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        );
    },
);


export default HarborPostContent;
