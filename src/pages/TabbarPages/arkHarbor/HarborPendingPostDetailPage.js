import React, {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {HeaderHeightContext} from '@react-navigation/elements';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import ARKImageView from '../../../components/ARKImageView';
import Text from '../../../components/AppText';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {openLink} from '../../../utils/browser';
import {fetchHarborUploadUrls} from '../../../utils/harbor/harborApi';
import HarborPostContent from './topicDetail/HarborPostContent';

const getPendingUploadUrls = raw =>
    String(raw || '').match(/upload:\/\/[^\s)"']+/g) || [];

const escapeHtml = value =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const buildPendingPreviewHtml = raw => {
    const images = [];
    const contentWithImageTokens = String(raw || '').replace(
        /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g,
        (match, alt, url) => {
            const index = images.length;
            images.push({alt, url});
            return `\n\nHARBOR_PENDING_IMAGE_${index}\n\n`;
        },
    );
    const formattedContent = escapeHtml(contentWithImageTokens)
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`\n]+)`/g, '<code>$1</code>')
        .replace(
            /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g,
            '<a href="$2">$1</a>',
        );

    return formattedContent
        .split(/\n{2,}/)
        .map(block => {
            const imageMatch = block.match(/^HARBOR_PENDING_IMAGE_(\d+)$/);
            if (imageMatch) {
                const image = images[Number(imageMatch[1])];
                return image
                    ? `<img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" />`
                    : '';
            }
            return block ? `<p>${block.replace(/\n/g, '<br>')}</p>` : '';
        })
        .join('');
};

const HarborPendingPostDetailPage = ({navigation, route}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const headerHeight = useContext(HeaderHeightContext) || 0;
    const {width} = useWindowDimensions();
    const imageViewerRef = useRef(null);
    const pendingPost = route.params?.pendingPost;
    const [cooked, setCooked] = useState('');
    const [imageUrls, setImageUrls] = useState([]);
    const [isPreviewLoading, setIsPreviewLoading] = useState(true);
    const contentWidth = Math.max(scale(120), width - scale(60));
    const createdAt = useMemo(
        () => new Date(pendingPost?.createdAt),
        [pendingPost?.createdAt],
    );
    const timeLabel = Number.isNaN(createdAt.getTime())
        ? ''
        : createdAt.toLocaleString();

    useEffect(() => {
        navigation.setOptions({headerTitle: t('待審內容詳情')});
    }, [navigation, t]);

    useEffect(() => {
        const controller = new AbortController();
        const raw = pendingPost?.raw || '';
        const shortUrls = getPendingUploadUrls(raw);
        setIsPreviewLoading(true);

        fetchHarborUploadUrls(shortUrls, {signal: controller.signal})
            .then(uploads => {
                if (controller.signal.aborted) {
                    return;
                }
                const resolvedRaw = uploads.reduce(
                    (value, upload) =>
                        value.split(upload.shortUrl).join(upload.url),
                    raw,
                );
                setCooked(buildPendingPreviewHtml(resolvedRaw));
                setImageUrls(uploads.map(upload => upload.url));
            })
            .catch(() => {
                if (!controller.signal.aborted) {
                    setCooked(buildPendingPreviewHtml(raw));
                    setImageUrls([]);
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setIsPreviewLoading(false);
                }
            });

        return () => controller.abort();
    }, [pendingPost?.raw]);

    const handlePressLink = useCallback(url => {
        openLink({URL: url, mode: 'fullScreen'});
    }, []);

    const handleOpenImage = useCallback(imageIndex => {
        imageViewerRef.current?.handleOpenImage(imageIndex);
    }, []);

    return (
        <View style={[styles.page, {backgroundColor: theme.bg_color}]}>
            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    {
                        paddingTop: isLiquidGlassSupported
                            ? headerHeight + verticalScale(12)
                            : verticalScale(12),
                    },
                ]}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }>
                <View
                    style={[
                        styles.statusCard,
                        {backgroundColor: theme.tonal.secondary15},
                    ]}>
                    <MaterialCommunityIcons
                        name="clock-outline"
                        size={scale(20)}
                        color={theme.secondThemeColor}
                    />
                    <View style={styles.statusContent}>
                        <Text
                            style={[
                                styles.statusTitle,
                                {color: theme.secondThemeColor},
                            ]}>
                            {t('審核中')}
                        </Text>
                        {timeLabel ? (
                            <Text
                                style={[
                                    styles.statusTime,
                                    {color: theme.black.third},
                                ]}>
                                {t('提交時間：{{time}}', {time: timeLabel})}
                            </Text>
                        ) : null}
                    </View>
                </View>

                <View
                    style={[
                        styles.contentCard,
                        {
                            backgroundColor: theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.topicTitle,
                            {color: theme.black.main},
                        ]}>
                        {pendingPost?.title || t('待審回覆')}
                    </Text>
                    <View
                        style={[
                            styles.divider,
                            {backgroundColor: theme.disabled},
                        ]}
                    />
                    {isPreviewLoading ? (
                        <ActivityIndicator
                            color={theme.themeColor}
                            size="small"
                        />
                    ) : cooked ? (
                        <HarborPostContent
                            contentWidth={contentWidth}
                            cooked={cooked}
                            imageUrls={imageUrls}
                            onOpenImage={handleOpenImage}
                            onPressLink={handlePressLink}
                        />
                    ) : (
                        <Text
                            style={[
                                styles.emptyContent,
                                {color: theme.black.third},
                            ]}>
                            {t('此案件沒有可在 App 內顯示的內容。')}
                        </Text>
                    )}
                </View>
            </ScrollView>
            <ARKImageView ref={imageViewerRef} imageUrls={imageUrls} />
        </View>
    );
};

const styles = StyleSheet.create({
    content: {
        gap: verticalScale(12),
        paddingBottom: verticalScale(40),
        paddingHorizontal: scale(14),
    },
    contentCard: {
        borderRadius: scale(16),
        borderWidth: StyleSheet.hairlineWidth,
        padding: scale(16),
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: verticalScale(14),
    },
    emptyContent: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        lineHeight: scale(20),
        textAlign: 'center',
    },
    page: {
        flex: 1,
    },
    statusCard: {
        alignItems: 'center',
        borderRadius: scale(12),
        flexDirection: 'row',
        gap: scale(10),
        paddingHorizontal: scale(13),
        paddingVertical: verticalScale(11),
    },
    statusContent: {
        flex: 1,
        gap: verticalScale(2),
    },
    statusTime: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
    },
    statusTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
    },
    topicTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '700',
        lineHeight: scale(25),
    },
});

export default HarborPendingPostDetailPage;
