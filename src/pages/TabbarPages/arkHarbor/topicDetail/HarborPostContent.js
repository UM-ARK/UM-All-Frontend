import React, {
    memo,
    useMemo,
} from 'react';
import {
    Image as NativeImage,
    Pressable,
    StyleSheet,
    Text,
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
} from 'react-native-render-html';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { WebView } from 'react-native-webview';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { openLink } from '../../../../utils/browser';
import { replaceHarborEmojiImages } from '../../../../utils/harbor/harborHtml';
import { hasHarborInteractiveContent } from '../../../../utils/harbor/harborPostEvent';
import { ARK_HARBOR } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import { normalizeHtmlUrl } from './harborTopicModels';
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

const customHTMLElementModels = {
    'harbor-emoji': harborEmojiModel,
    iframe: iframeModel,
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
    ({
        cooked,
        contentWidth,
        imageUrls,
        onOpenImage,
        onPressLink,
        postUrl,
        forceInteractiveFallback = false,
        children,
    }) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const { black, themeColor, themeColorUltraLight, tonal, white } = theme;
        const normalizedCooked = useMemo(() => {
            return replaceHarborEmojiImages(cooked || '');
        }, [cooked]);
        const requiresInteractiveFallback = useMemo(() => {
            return (
                forceInteractiveFallback || hasHarborInteractiveContent(cooked)
            );
        }, [cooked, forceInteractiveFallback]);

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
                {children}
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
                            {t('在 Web 查看完整詳情')}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        );
    },
);


export default HarborPostContent;
