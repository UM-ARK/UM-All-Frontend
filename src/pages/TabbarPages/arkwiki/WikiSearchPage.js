import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { FlashList } from '@shopify/flash-list';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHeaderHeight } from '@react-navigation/elements';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';

import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { openLink } from '../../../utils/browser';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { ARK_WIKI_SEARCH } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import { fetchWikiFullSearch, fetchWikiPrefixSearch } from '../../../utils/wikiApi';

const WikiSearchPage = ({route, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('wiki');
    const headerHeight = useHeaderHeight();
    const inputRef = useRef(null);
    const autoOpenHandledRef = useRef(false);
    const searchRequestIdRef = useRef(0);
    const initialQuery = typeof route.params?.query === 'string' ? route.params.query : '';
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(Boolean(initialQuery));
    const [error, setError] = useState(false);

    useEffect(() => {
        navigation.setOptions({headerTitle: t('搜尋 ARK Wiki')});
        logToFirebase('openPage', {page: 'WikiSearch'});
    }, [navigation, t]);

    const openArticle = useCallback(item => {
        trigger();
        Keyboard.dismiss();
        navigation.navigate('WikiArticle', {title: item.title});
    }, [navigation]);

    useEffect(() => {
        const value = query.trim();
        if (!value) {
            setResults([]);
            setHasSearched(false);
            setError(false);
            return undefined;
        }
        const controller = new AbortController();
        const requestId = ++searchRequestIdRef.current;
        const timeout = setTimeout(async () => {
            setIsLoading(true);
            setError(false);
            try {
                const nextResults = await fetchWikiPrefixSearch(value, {signal: controller.signal});
                if (requestId !== searchRequestIdRef.current) {
                    return;
                }
                setResults(nextResults);
                setHasSearched(true);
                if (
                    route.params?.autoOpenUnique &&
                    value === initialQuery.trim() &&
                    !autoOpenHandledRef.current &&
                    nextResults.length === 1
                ) {
                    autoOpenHandledRef.current = true;
                    navigation.replace('WikiArticle', {title: nextResults[0].title});
                }
            } catch (searchError) {
                if (searchError?.name !== 'AbortError') {
                    setError(true);
                }
            } finally {
                setIsLoading(false);
            }
        }, 350);
        return () => {
            clearTimeout(timeout);
            controller.abort();
        };
    }, [initialQuery, navigation, query, route.params?.autoOpenUnique]);

    const pageStyle = useMemo(() => [
        styles.page,
        {
            backgroundColor: theme.bg_color,
            paddingTop: isLiquidGlassSupported ? headerHeight : 0,
        },
    ], [headerHeight, theme.bg_color]);

    const submitSearch = async () => {
        const value = query.trim();
        if (!value) {
            inputRef.current?.focus();
            return;
        }
        trigger();
        Keyboard.dismiss();
        const requestId = ++searchRequestIdRef.current;
        setIsLoading(true);
        setError(false);
        setHasSearched(true);
        try {
            const nextResults = await fetchWikiFullSearch(value);
            if (requestId === searchRequestIdRef.current) {
                setResults(nextResults);
            }
        } catch (_error) {
            setError(true);
        } finally {
            if (requestId === searchRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    };

    const renderResult = ({item}) => (
        <Pressable
            onPress={() => openArticle(item)}
            style={({pressed}) => [
                styles.result,
                {
                    backgroundColor: pressed ? theme.tonal.primary15 : theme.white,
                    borderColor: theme.disabled,
                },
            ]}>
            <View style={styles.resultText}>
                <Text style={[styles.resultTitle, {color: theme.black.main}]}>{item.title}</Text>
                {item.snippet ? (
                    <Text numberOfLines={2} style={[styles.snippet, {color: theme.black.third}]}>
                        {item.snippet}
                    </Text>
                ) : null}
            </View>
            <MaterialCommunityIcons name="chevron-right" size={scale(22)} color={theme.black.third} />
        </Pressable>
    );

    const emptyState = (
        <View style={styles.empty}>
            {isLoading ? (
                <ActivityIndicator color={theme.themeColor} />
            ) : (
                <MaterialCommunityIcons
                    name={error ? 'cloud-alert-outline' : 'book-search-outline'}
                    size={scale(44)}
                    color={theme.black.third}
                />
            )}
            <Text style={[styles.emptyTitle, {color: theme.black.main}]}>
                {error
                    ? t('搜尋失敗')
                    : hasSearched
                        ? t('找不到相關條目')
                        : t('輸入關鍵字開始搜尋')}
            </Text>
            {hasSearched && query.trim() ? (
                <Pressable
                    onPress={() => {
                        trigger();
                        openLink(ARK_WIKI_SEARCH + encodeURIComponent(query.trim()));
                    }}
                    style={({pressed}) => [
                        styles.webButton,
                        {backgroundColor: pressed ? theme.tonal.primary50 : theme.tonal.primary30},
                    ]}>
                    <Text style={[styles.webButtonText, {color: theme.themeColor}]}>
                        {t('前往 Wiki 搜尋或建立')}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    );

    return (
        <View style={pageStyle}>
            <View style={[styles.searchBar, {backgroundColor: theme.white, borderColor: theme.disabled}]}>
                <MaterialCommunityIcons name="magnify" size={scale(22)} color={theme.black.third} />
                <TextInput
                    ref={inputRef}
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={submitSearch}
                    placeholder={t('搜尋條目')}
                    placeholderTextColor={theme.black.third}
                    returnKeyType="search"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                    style={[styles.input, {color: theme.black.main}]}
                />
                {isLoading ? <ActivityIndicator size="small" color={theme.themeColor} /> : null}
            </View>
            <FlashList
                data={results}
                renderItem={renderResult}
                keyExtractor={item => item.title}
                ListEmptyComponent={emptyState}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    searchBar: {
        marginHorizontal: scale(14),
        marginTop: verticalScale(10),
        marginBottom: verticalScale(8),
        height: verticalScale(44),
        paddingHorizontal: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(14),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    input: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(15),
        paddingVertical: 0,
    },
    listContent: {
        paddingHorizontal: scale(14),
        paddingBottom: verticalScale(24),
    },
    result: {
        minHeight: verticalScale(58),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(13),
        paddingHorizontal: scale(13),
        paddingVertical: verticalScale(10),
        marginBottom: verticalScale(8),
        flexDirection: 'row',
        alignItems: 'center',
    },
    resultText: {
        flex: 1,
    },
    resultTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '600',
    },
    snippet: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        marginTop: verticalScale(3),
    },
    empty: {
        alignItems: 'center',
        paddingTop: verticalScale(80),
        paddingHorizontal: scale(24),
        gap: verticalScale(10),
    },
    emptyTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(16),
        fontWeight: '600',
        textAlign: 'center',
    },
    webButton: {
        borderRadius: scale(18),
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(9),
    },
    webButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '600',
    },
});

export default WikiSearchPage;
