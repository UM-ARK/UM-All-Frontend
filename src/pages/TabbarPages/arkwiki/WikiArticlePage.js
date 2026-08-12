import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { MenuView } from '@react-native-menu/menu';
import { useHeaderHeight } from '@react-navigation/elements';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';

import Text from '../../../components/AppText';
import ARKImageView from '../../../components/ARKImageView';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { useAppShare } from '../../../contexts/AppShareContext';
import { openLink } from '../../../utils/browser';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { ARK_WIKI } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import {
    cacheWikiArticle,
    fetchWikiArticle,
    getCachedWikiArticle,
} from '../../../utils/wikiApi';
import WikiArticleWebView from './WikiArticleWebView';
import {
    buildWikiArticleUrl,
    extractWikiImageUrls,
    getWikiLinkAction,
    normalizeWikiTitle,
} from './wikiModels';

const WikiArticlePage = ({route, navigation}) => {
    const {theme} = useTheme();
    const {openShare} = useAppShare();
    const {t} = useTranslation('wiki');
    const headerHeight = useHeaderHeight();
    const title = normalizeWikiTitle(route.params?.title);
    const fragment = route.params?.fragment || '';
    const imageViewerRef = useRef(null);
    const requestControllerRef = useRef(null);
    const [article, setArticle] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isCached, setIsCached] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // 導覽列只顯示簡短標題；完整條目名稱改由頁面內標題區換行展示
        navigation.setOptions({headerTitle: 'ARK Wiki'});
    }, [navigation]);

    const loadArticle = useCallback(async ({refresh = false} = {}) => {
        if (!title) {
            setError(new Error(t('找不到這個條目')));
            setIsLoading(false);
            return undefined;
        }
        requestControllerRef.current?.abort();
        const controller = new AbortController();
        requestControllerRef.current = controller;
        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);
        let cached = null;
        try {
            cached = await getCachedWikiArticle(title);
            if (cached && !refresh) {
                setArticle(cached);
                setIsCached(true);
                setIsLoading(false);
            }
            const result = await fetchWikiArticle(title, {
                signal: controller.signal,
                etag: cached?.etag,
            });
            const nextArticle = result.notModified ? cached : result;
            if (!nextArticle) {
                throw new Error(t('找不到這個條目'));
            }
            setArticle(nextArticle);
            setIsCached(false);
            if (!result.notModified) {
                await cacheWikiArticle(nextArticle);
            }
        } catch (loadError) {
            if (loadError?.name !== 'AbortError') {
                if (cached) {
                    setArticle(cached);
                    setIsCached(true);
                } else {
                    setError(loadError);
                }
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [t, title]);

    useEffect(() => {
        loadArticle();
        logToFirebase('openPage', {page: 'WikiArticle', title});
        return () => requestControllerRef.current?.abort();
    }, [loadArticle, title]);

    const articleUrl = useMemo(
        () => buildWikiArticleUrl(article?.title || title, fragment),
        [article?.title, fragment, title],
    );
    const imageUrls = useMemo(
        () => extractWikiImageUrls(article?.html || ''),
        [article?.html],
    );
    const pageStyle = useMemo(() => [
        styles.page,
        {
            backgroundColor: theme.bg_color,
            paddingTop: isLiquidGlassSupported ? headerHeight : 0,
        },
    ], [headerHeight, theme.bg_color]);

    const handleLinkPress = useCallback(url => {
        trigger();
        const action = getWikiLinkAction(url);
        if (action.type === 'article') {
            navigation.push('WikiArticle', {
                title: action.title,
                fragment: action.fragment,
            });
        } else if (action.type === 'external') {
            openLink(action.url);
        }
    }, [navigation]);

    const handleImagePress = useCallback(url => {
        trigger();
        const index = imageUrls.indexOf(url);
        imageViewerRef.current?.handleOpenImage(Math.max(index, 0));
    }, [imageUrls]);

    const handleShare = () => {
        trigger();
        openShare({title: article.title || title, url: articleUrl});
    };

    const openWikiAction = path => {
        trigger();
        openLink(`${ARK_WIKI}${path}`);
    };

    const handleMoreAction = event => {
        trigger();
        switch (event.nativeEvent.event) {
            case 'edit':
                openLink(`${ARK_WIKI}/index.php?title=${encodeURIComponent(article.title)}&action=edit`);
                break;
            case 'history':
                openLink(`${ARK_WIKI}/index.php?title=${encodeURIComponent(article.title)}&action=history`);
                break;
            case 'browser':
                openLink(articleUrl);
                break;
            default:
                break;
        }
    };

    if (isLoading && !article) {
        return (
            <View style={[styles.center, {backgroundColor: theme.bg_color}]}>
                <ActivityIndicator color={theme.themeColor} />
                <Text style={[styles.statusText, {color: theme.black.third}]}>
                    {t('正在載入條目')}
                </Text>
            </View>
        );
    }

    if (error && !article) {
        return (
            <View style={[styles.center, {backgroundColor: theme.bg_color}]}>
                <MaterialCommunityIcons name="book-alert-outline" size={scale(44)} color={theme.black.third} />
                <Text style={[styles.errorTitle, {color: theme.black.main}]}>{t('條目載入失敗')}</Text>
                <Text style={[styles.statusText, {color: theme.black.third}]}>{t('請檢查網絡後再試')}</Text>
                <Pressable
                    onPress={() => {
                        trigger();
                        loadArticle({refresh: true});
                    }}
                    style={({pressed}) => [
                        styles.retryButton,
                        {backgroundColor: pressed ? theme.tonal.primary50 : theme.tonal.primary30},
                    ]}>
                    <Text style={[styles.buttonText, {color: theme.themeColor}]}>{t('重試')}</Text>
                </Pressable>
                <Pressable onPress={() => openWikiAction(`/wiki/${encodeURIComponent(title)}`)}>
                    <Text style={[styles.browserLink, {color: theme.themeColor}]}>{t('在瀏覽器開啟')}</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={pageStyle}>
            <View style={[styles.metadata, {backgroundColor: theme.white}]}>
                <View style={styles.metadataHeader}>
                    <Text style={[styles.title, {color: theme.black.main}]}>
                        {article.title}
                    </Text>
                    <View style={styles.toolbar}>
                        <Pressable
                            accessibilityLabel={t('分享')}
                            onPress={handleShare}
                            style={({pressed}) => [styles.iconButton, {backgroundColor: pressed ? theme.tonal.primary30 : theme.tonal.primary15}]}>
                            <MaterialCommunityIcons name="share-variant-outline" size={scale(20)} color={theme.themeColor} />
                        </Pressable>
                        <Pressable
                            accessibilityLabel={t('重新整理')}
                            disabled={isRefreshing}
                            onPress={() => {
                                trigger();
                                loadArticle({refresh: true});
                            }}
                            style={({pressed}) => [styles.iconButton, {backgroundColor: pressed ? theme.tonal.primary30 : theme.tonal.primary15}]}>
                            {isRefreshing
                                ? <ActivityIndicator size="small" color={theme.themeColor} />
                                : <MaterialCommunityIcons name="refresh" size={scale(21)} color={theme.themeColor} />}
                        </Pressable>
                        <MenuView
                            actions={[
                                {id: 'edit', title: t('編輯條目')},
                                {id: 'history', title: t('查看歷史')},
                                {id: 'browser', title: t('在瀏覽器開啟')},
                            ]}
                            onPressAction={handleMoreAction}
                            onOpenMenu={() => trigger()}
                            shouldOpenOnLongPress={false}>
                            <View
                                accessibilityLabel={t('更多操作')}
                                style={[styles.iconButton, {backgroundColor: theme.tonal.primary15}]}>
                                <MaterialCommunityIcons name="dots-horizontal" size={scale(21)} color={theme.themeColor} />
                            </View>
                        </MenuView>
                    </View>
                </View>
                <Text style={[styles.updated, {color: theme.black.third}]}>
                    {article.timestamp
                        ? t('最後更新：{{time}}', {time: moment(article.timestamp).format('YYYY-MM-DD HH:mm')})
                        : t('由 ARK Wiki 提供')}
                </Text>
                {isCached ? (
                    <Text style={[styles.cachedText, {color: theme.warning}]}>{t('目前顯示離線快取')}</Text>
                ) : null}
            </View>
            <WikiArticleWebView
                html={article.html}
                fragment={fragment}
                onLinkPress={handleLinkPress}
                onImagePress={handleImagePress}
            />
            <ARKImageView ref={imageViewerRef} imageUrls={imageUrls} />
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(28),
        gap: verticalScale(10),
    },
    statusText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        textAlign: 'center',
    },
    errorTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '700',
    },
    retryButton: {
        paddingHorizontal: scale(20),
        paddingVertical: verticalScale(9),
        borderRadius: scale(18),
    },
    buttonText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
    browserLink: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        padding: scale(6),
    },
    metadata: {
        paddingHorizontal: scale(16),
        paddingTop: verticalScale(10),
        paddingBottom: verticalScale(9),
    },
    metadataHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: scale(10),
    },
    title: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(18),
        fontWeight: '700',
    },
    updated: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(3),
    },
    cachedText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(2),
    },
    toolbar: {
        flexDirection: 'row',
        flexShrink: 0,
        gap: scale(6),
        marginTop: verticalScale(1),
    },
    iconButton: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(17),
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default WikiArticlePage;
