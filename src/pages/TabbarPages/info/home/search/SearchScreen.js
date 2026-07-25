import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    Alert,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {useHeaderHeight} from '@react-navigation/elements';
import {useFocusEffect} from '@react-navigation/native';
import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';
import {scale, verticalScale} from 'react-native-size-matters';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as OpenCC from 'opencc-js';
import {useTranslation} from 'react-i18next';

import {getFunctionArr} from '../../../features/FeatureList';
import FeatureIcon from './components/FeatureIcon';
import {useTheme, uiStyle} from '../../../../../components/ThemeContext';
import {openLink} from '../../../../../utils/browser';
import {logToFirebase} from '../../../../../utils/firebaseAnalytics';
import {
    addSearchHistory,
    clearSearchHistory,
    getSearchHistory,
    removeSearchHistory,
} from '../../../../../utils/searchHistory';
import {trigger} from '../../../../../utils/trigger';

const converter = OpenCC.Converter({from: 'cn', to: 'tw'});
const MAX_LOCAL_RESULTS = 8;
const FOCUS_FALLBACK_DELAY_MS = 450;
const RECOMMENDED_FEATURE_KEYS = [
    '校園巴士',
    '校曆',
    '圖書館',
    '打印餘額',
    '失物認領',
];

const normalizeSearchText = value =>
    converter(
        String(value || '')
            .trim()
            .toLowerCase(),
    );

const SearchScreen = ({navigation}) => {
    const {theme} = useTheme();
    const {
        bg_color,
        black,
        themeColor,
        themeColorUltraLight,
        tonal,
        viewShadow,
        white,
    } = theme;
    const {t} = useTranslation(['common', 'home', 'features']);
    const headerHeight = useHeaderHeight();
    const inputRef = useRef(null);
    const [query, setQuery] = useState('');
    const [history, setHistory] = useState([]);

    const featureSections = useMemo(() => getFunctionArr(t), [t]);
    const flattenedFeatures = useMemo(
        () =>
            featureSections.flatMap(section =>
                section.fn.map(item => ({
                    ...item,
                    category: section.title,
                })),
            ),
        [featureSections],
    );
    const featureByKey = useMemo(
        () =>
            new Map(
                flattenedFeatures.map(item => [
                    item.key_name || item.fn_name,
                    item,
                ]),
            ),
        [flattenedFeatures],
    );
    const recommendedFeatures = useMemo(
        () =>
            RECOMMENDED_FEATURE_KEYS.map(key => featureByKey.get(key)).filter(
                Boolean,
            ),
        [featureByKey],
    );
    const normalizedQuery = useMemo(() => normalizeSearchText(query), [query]);
    const screenInsetStyle = useMemo(
        () => ({
            paddingTop: isLiquidGlassSupported ? headerHeight : 0,
        }),
        [headerHeight],
    );
    const localResults = useMemo(() => {
        if (!normalizedQuery) {
            return [];
        }

        return flattenedFeatures
            .filter(item => {
                const searchableText = normalizeSearchText(
                    [
                        item.fn_name,
                        item.describe,
                        item.keywords,
                        item.key_name,
                        item.category,
                    ]
                        .filter(Boolean)
                        .join(' '),
                );

                return searchableText.includes(normalizedQuery);
            })
            .slice(0, MAX_LOCAL_RESULTS);
    }, [flattenedFeatures, normalizedQuery]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const focusTimer = setTimeout(() => {
                inputRef.current?.focus();
            }, FOCUS_FALLBACK_DELAY_MS);

            getSearchHistory().then(savedHistory => {
                if (isActive) {
                    setHistory(savedHistory);
                }
            });

            return () => {
                isActive = false;
                clearTimeout(focusTimer);
            };
        }, []),
    );

    useEffect(() => {
        const unsubscribe = navigation.addListener('transitionEnd', event => {
            if (!event.data.closing) {
                inputRef.current?.focus();
            }
        });

        return unsubscribe;
    }, [navigation]);

    useEffect(() => {
        logToFirebase('screen_view', {screen_name: 'HomeSearch'});
    }, []);

    const saveHistory = useCallback(async (searchQuery, selectedKey) => {
        const nextHistory = await addSearchHistory(searchQuery, selectedKey);
        setHistory(nextHistory);
    }, []);

    const executeFeature = useCallback(
        async (item, searchQuery) => {
            trigger();
            const capturedQuery = searchQuery.trim() || item.fn_name;
            Keyboard.dismiss();
            await saveHistory(capturedQuery, item.key_name || item.fn_name);
            logToFirebase('funcUse', {
                funcName: 'searchBar_features',
                searchBarDetail: `${capturedQuery}-${item.fn_name}`,
            });

            if (item.go_where === 'Webview' || item.go_where === 'Linking') {
                if (item.webview_param?.url) {
                    openLink(item.webview_param.url);
                }
                return;
            }

            if (item.go_where === 'CourseSimTab') {
                navigation.navigate('Tabbar', {screen: 'CourseSimTab'});
                return;
            }

            if (item.go_where) {
                navigation.navigate(item.go_where);
            }
        },
        [navigation, saveHistory],
    );

    const handleWebSearch = useCallback(async () => {
        const capturedQuery = query.trim();
        if (!capturedQuery) {
            return;
        }

        trigger();
        Keyboard.dismiss();
        await saveHistory(capturedQuery);
        logToFirebase('funcUse', {
            funcName: 'searchBar_web',
            searchBarDetail: capturedQuery,
        });
        const encodedQuery = encodeURIComponent(
            `site:umall.one OR site:um.edu.mo ${capturedQuery}`,
        );
        openLink({
            URL: `https://www.google.com/search?q=${encodedQuery}`,
            mode: 'fullScreen',
        });
    }, [query, saveHistory]);

    const handleHistoryPress = useCallback(record => {
        trigger();
        setQuery(record.query);
        inputRef.current?.focus();
    }, []);

    const handleRemoveHistory = useCallback(async record => {
        trigger();
        const nextHistory = await removeSearchHistory(record.query);
        setHistory(nextHistory);
    }, []);

    const handleClearHistory = useCallback(() => {
        trigger();
        Alert.alert(
            t('清除搜索歷史？', {ns: 'home'}),
            t('清除後將無法復原。', {ns: 'home'}),
            [
                {
                    text: t('取消', {ns: 'common'}),
                    style: 'cancel',
                },
                {
                    text: t('清除', {ns: 'home'}),
                    style: 'destructive',
                    onPress: async () => {
                        trigger();
                        await clearSearchHistory();
                        setHistory([]);
                    },
                },
            ],
        );
    }, [t]);

    const handleRecommendedPress = useCallback(item => {
        trigger();
        setQuery(item.fn_name);
        inputRef.current?.focus();
    }, []);

    const renderSectionHeader = (title, action) => (
        <View style={styles.sectionHeader}>
            <Text
                style={[
                    uiStyle.defaultText,
                    styles.sectionTitle,
                    {color: black.main},
                ]}>
                {title}
            </Text>
            {action}
        </View>
    );

    const renderHistory = () => {
        if (history.length === 0) {
            return (
                <View
                    style={[
                        styles.emptyWelcome,
                        {
                            backgroundColor: white,
                            borderColor: themeColorUltraLight,
                        },
                        viewShadow,
                    ]}>
                    <View
                        style={[
                            styles.emptyIcon,
                            {backgroundColor: tonal.primary15},
                        ]}>
                        <Ionicons
                            name="sparkles-outline"
                            size={scale(27)}
                            color={themeColor}
                        />
                    </View>
                    <Text
                        style={[
                            uiStyle.defaultText,
                            styles.emptyTitle,
                            {color: black.main},
                        ]}>
                        {t('搜索關於澳大的一切', {ns: 'home'})}
                    </Text>
                    <Text
                        style={[
                            uiStyle.defaultText,
                            styles.emptyDescription,
                            {color: black.third},
                        ]}>
                        {t('功能、服務與澳大網頁，一次找到。', {
                            ns: 'home',
                        })}
                    </Text>
                </View>
            );
        }

        return (
            <>
                {renderSectionHeader(
                    t('最近搜索', {ns: 'home'}),
                    <Pressable
                        onPress={handleClearHistory}
                        hitSlop={scale(8)}
                        accessibilityRole="button"
                        accessibilityLabel={t('清除全部', {ns: 'home'})}>
                        {({pressed}) => (
                            <Text
                                style={[
                                    uiStyle.defaultText,
                                    styles.headerAction,
                                    {
                                        color: themeColor,
                                    },
                                    pressed && styles.pressedAction,
                                ]}>
                                {t('清除全部', {ns: 'home'})}
                            </Text>
                        )}
                    </Pressable>,
                )}
                <View
                    style={[styles.card, {backgroundColor: white}, viewShadow]}>
                    {history.map((record, index) => {
                        const selectedFeature = record.selectedKey
                            ? featureByKey.get(record.selectedKey)
                            : null;

                        return (
                            <View key={record.query.toLowerCase()}>
                                <Pressable
                                    onPress={() => handleHistoryPress(record)}
                                    accessibilityRole="button"
                                    style={({pressed}) => [
                                        styles.historyRow,
                                        pressed && {
                                            backgroundColor: tonal.primary08,
                                        },
                                    ]}>
                                    <View
                                        style={[
                                            styles.historyIcon,
                                            {
                                                backgroundColor:
                                                    tonal.primary15,
                                            },
                                        ]}>
                                        <Ionicons
                                            name="time-outline"
                                            size={scale(17)}
                                            color={themeColor}
                                        />
                                    </View>
                                    <View style={styles.rowText}>
                                        <Text
                                            numberOfLines={1}
                                            style={[
                                                uiStyle.defaultText,
                                                styles.rowTitle,
                                                {color: black.main},
                                            ]}>
                                            {record.query}
                                        </Text>
                                        {selectedFeature ? (
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    uiStyle.defaultText,
                                                    styles.rowDescription,
                                                    {color: black.third},
                                                ]}>
                                                {selectedFeature.fn_name}
                                            </Text>
                                        ) : null}
                                    </View>
                                    <Pressable
                                        onPress={event => {
                                            event.stopPropagation();
                                            handleRemoveHistory(record);
                                        }}
                                        hitSlop={scale(8)}
                                        accessibilityRole="button"
                                        accessibilityLabel={t(
                                            '刪除搜索記錄：{{query}}',
                                            {
                                                ns: 'home',
                                                query: record.query,
                                            },
                                        )}
                                        style={({pressed}) => [
                                            styles.removeButton,
                                            pressed && {
                                                backgroundColor:
                                                    tonal.primary15,
                                            },
                                        ]}>
                                        <Ionicons
                                            name="close"
                                            size={scale(17)}
                                            color={black.third}
                                        />
                                    </Pressable>
                                </Pressable>
                                {index < history.length - 1 ? (
                                    <View
                                        style={[
                                            styles.divider,
                                            {
                                                backgroundColor:
                                                    themeColorUltraLight,
                                            },
                                        ]}
                                    />
                                ) : null}
                            </View>
                        );
                    })}
                </View>
            </>
        );
    };

    const renderRecommended = () => (
        <View style={styles.recommendedSection}>
            {renderSectionHeader(t('推薦服務', {ns: 'home'}))}
            <View style={styles.chips}>
                {recommendedFeatures.map(item => (
                    <Pressable
                        key={item.key_name}
                        onPress={() => handleRecommendedPress(item)}
                        accessibilityRole="button"
                        style={({pressed}) => [
                            styles.chip,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <Ionicons
                            name="search-outline"
                            size={scale(14)}
                            color={themeColor}
                        />
                        <Text
                            numberOfLines={1}
                            style={[
                                uiStyle.defaultText,
                                styles.chipText,
                                {color: themeColor},
                            ]}>
                            {item.fn_name}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );

    const renderResultRow = (item, index) => (
        <View key={item.key_name || item.fn_name}>
            <Pressable
                onPress={() => executeFeature(item, query)}
                accessibilityRole="button"
                style={({pressed}) => [
                    styles.resultRow,
                    pressed && {backgroundColor: tonal.primary08},
                ]}>
                <FeatureIcon item={item} />
                <View style={styles.rowText}>
                    <Text
                        numberOfLines={1}
                        style={[
                            uiStyle.defaultText,
                            styles.resultTitle,
                            {color: black.main},
                        ]}>
                        {item.fn_name}
                    </Text>
                    <Text
                        numberOfLines={1}
                        style={[
                            uiStyle.defaultText,
                            styles.rowDescription,
                            {color: black.third},
                        ]}>
                        {item.describe}
                    </Text>
                </View>
                <Ionicons
                    name="chevron-forward"
                    size={scale(18)}
                    color={black.third}
                />
            </Pressable>
            {index < localResults.length - 1 ? (
                <View
                    style={[
                        styles.divider,
                        {backgroundColor: themeColorUltraLight},
                    ]}
                />
            ) : null}
        </View>
    );

    const renderResults = () => (
        <>
            {renderSectionHeader(t('相關服務', {ns: 'home'}))}
            <View style={[styles.card, {backgroundColor: white}, viewShadow]}>
                {localResults.length > 0 ? (
                    localResults.map(renderResultRow)
                ) : (
                    <View style={styles.noResults}>
                        <View
                            style={[
                                styles.emptyIcon,
                                {backgroundColor: tonal.primary15},
                            ]}>
                            <Ionicons
                                name="search-outline"
                                size={scale(25)}
                                color={themeColor}
                            />
                        </View>
                        <Text
                            style={[
                                uiStyle.defaultText,
                                styles.noResultsTitle,
                                {color: black.main},
                            ]}>
                            {t('沒有找到相關服務', {ns: 'home'})}
                        </Text>
                        <Text
                            style={[
                                uiStyle.defaultText,
                                styles.emptyDescription,
                                {color: black.third},
                            ]}>
                            {t('試試其他關鍵詞，或搜索澳大網頁。', {
                                ns: 'home',
                            })}
                        </Text>
                    </View>
                )}
            </View>
            <Pressable
                onPress={handleWebSearch}
                accessibilityRole="button"
                style={({pressed}) => [
                    styles.webSearchButton,
                    {
                        backgroundColor: pressed
                            ? tonal.primary30
                            : tonal.primary15,
                    },
                ]}>
                <View
                    style={[
                        styles.webSearchIcon,
                        {backgroundColor: themeColor},
                    ]}>
                    <Ionicons
                        name="globe-outline"
                        size={scale(19)}
                        color={white}
                    />
                </View>
                <Text
                    numberOfLines={2}
                    style={[
                        uiStyle.defaultText,
                        styles.webSearchText,
                        {color: themeColor},
                    ]}>
                    {t('在澳大網頁搜索「{{query}}」', {
                        ns: 'home',
                        query: query.trim(),
                    })}
                </Text>
                <Ionicons
                    name="open-outline"
                    size={scale(18)}
                    color={themeColor}
                />
            </Pressable>
        </>
    );

    return (
        <View
            style={[
                styles.screen,
                {
                    backgroundColor: bg_color,
                },
                screenInsetStyle,
            ]}>
            <View style={styles.searchHeader}>
                <View
                    style={[
                        styles.inputContainer,
                        {
                            backgroundColor: tonal.primary08,
                            borderColor: themeColorUltraLight,
                        },
                    ]}>
                    <Ionicons
                        name="search"
                        size={scale(19)}
                        color={themeColor}
                    />
                    <TextInput
                        ref={inputRef}
                        value={query}
                        onChangeText={setQuery}
                        onSubmitEditing={handleWebSearch}
                        placeholder={t('輸入關鍵詞', {ns: 'home'})}
                        placeholderTextColor={black.third}
                        selectionColor={themeColor}
                        returnKeyType="search"
                        autoCapitalize="none"
                        autoCorrect={false}
                        accessibilityLabel={t('搜索', {ns: 'common'})}
                        style={[
                            uiStyle.defaultText,
                            styles.input,
                            {color: black.main},
                        ]}
                    />
                    {query.length > 0 ? (
                        <Pressable
                            onPress={() => {
                                trigger();
                                setQuery('');
                                inputRef.current?.focus();
                            }}
                            hitSlop={scale(8)}
                            accessibilityRole="button"
                            accessibilityLabel={t('清除搜索內容', {
                                ns: 'home',
                            })}
                            style={({pressed}) => [
                                styles.clearInputButton,
                                pressed && {
                                    backgroundColor: tonal.primary15,
                                },
                            ]}>
                            <Ionicons
                                name="close-circle"
                                size={scale(19)}
                                color={black.third}
                            />
                        </Pressable>
                    ) : null}
                </View>
            </View>

            <KeyboardAwareScrollView
                bottomOffset={verticalScale(24)}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}>
                {normalizedQuery ? renderResults() : renderHistory()}
                {!normalizedQuery ? renderRecommended() : null}
            </KeyboardAwareScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    searchHeader: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(10),
        paddingBottom: verticalScale(8),
    },
    inputContainer: {
        minHeight: verticalScale(44),
        borderRadius: scale(15),
        borderWidth: StyleSheet.hairlineWidth,
        paddingLeft: scale(13),
        paddingRight: scale(8),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    input: {
        flex: 1,
        minHeight: verticalScale(44),
        paddingVertical: 0,
        fontSize: scale(14),
    },
    clearInputButton: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(8),
        paddingBottom: verticalScale(40),
    },
    sectionHeader: {
        minHeight: verticalScale(34),
        paddingHorizontal: scale(2),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionTitle: {
        fontSize: scale(15),
        fontWeight: '700',
    },
    headerAction: {
        fontSize: scale(12),
        fontWeight: '600',
        paddingVertical: verticalScale(7),
    },
    pressedAction: {
        opacity: 0.55,
    },
    card: {
        borderRadius: scale(18),
        overflow: 'hidden',
    },
    historyRow: {
        minHeight: verticalScale(58),
        paddingLeft: scale(12),
        paddingRight: scale(7),
        paddingVertical: verticalScale(8),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },
    historyIcon: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(11),
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowText: {
        flex: 1,
        minWidth: 0,
    },
    rowTitle: {
        fontSize: scale(13),
        fontWeight: '600',
    },
    rowDescription: {
        marginTop: verticalScale(2),
        fontSize: scale(11),
    },
    removeButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: scale(56),
    },
    emptyWelcome: {
        paddingHorizontal: scale(24),
        paddingVertical: verticalScale(25),
        borderRadius: scale(18),
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
    },
    emptyIcon: {
        width: scale(62),
        height: scale(62),
        borderRadius: scale(21),
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        marginTop: verticalScale(13),
        fontSize: scale(16),
        fontWeight: '700',
        textAlign: 'center',
    },
    emptyDescription: {
        marginTop: verticalScale(5),
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        textAlign: 'center',
    },
    recommendedSection: {
        marginTop: verticalScale(17),
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(8),
    },
    chip: {
        minHeight: verticalScale(34),
        maxWidth: '100%',
        borderRadius: scale(17),
        paddingHorizontal: scale(12),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    chipText: {
        maxWidth: scale(150),
        fontSize: scale(12),
        fontWeight: '600',
    },
    resultRow: {
        minHeight: verticalScale(67),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(11),
    },
    resultTitle: {
        fontSize: scale(13),
        fontWeight: '700',
    },
    noResults: {
        paddingHorizontal: scale(22),
        paddingVertical: verticalScale(23),
        alignItems: 'center',
    },
    noResultsTitle: {
        marginTop: verticalScale(11),
        fontSize: scale(14),
        fontWeight: '700',
        textAlign: 'center',
    },
    webSearchButton: {
        minHeight: verticalScale(58),
        marginTop: verticalScale(12),
        borderRadius: scale(18),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(9),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(11),
    },
    webSearchIcon: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(13),
        alignItems: 'center',
        justifyContent: 'center',
    },
    webSearchText: {
        flex: 1,
        fontSize: scale(13),
        fontWeight: '700',
    },
});

export default SearchScreen;
