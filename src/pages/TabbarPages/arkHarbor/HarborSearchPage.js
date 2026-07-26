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
    Alert,
    Keyboard,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {Image} from 'expo-image';
import moment from 'moment-timezone';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import TouchableScale from '../../../components/TouchableScale';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {logToFirebase} from '../../../utils/firebaseAnalytics';
import {
    fetchHarborCategories,
    fetchHarborSearch,
    fetchHarborTags,
} from '../../../utils/harbor/harborApi';
import {
    buildHarborCategoryRows,
    getHarborCategoryKey,
} from '../../../utils/harbor/harborCategories';
import {
    addHarborSearchHistory,
    buildHarborSearchQuery,
    clearHarborSearchHistory,
    getHarborSearchAfterDate,
    getHarborSearchHistory,
    removeHarborSearchHistory,
} from '../../../utils/harbor/harborSearch';
import {trigger} from '../../../utils/trigger';
import {
    HarborFullState,
    HarborInlineRetry,
} from './components/HarborListStates';
import HarborCategoryIcon from './components/HarborCategoryIcon';

const TIME_OPTIONS = [
    {key: 'all', label: '不限時間'},
    {key: 'week', label: '最近一週'},
    {key: 'month', label: '最近一個月'},
    {key: 'year', label: '最近一年'},
];

const ORDER_OPTIONS = [
    {key: 'relevance', label: '相關度'},
    {key: 'latest', label: '最新發布'},
    {key: 'likes', label: '最多讚好'},
    {key: 'views', label: '最多瀏覽'},
];

/** 對齊 ClubSearchBar 的搜尋操作滑入時長 */
const SEARCH_ACTION_TIMING_MS = 220;

const SearchFilterChip = memo(({label, selected, onPress}) => {
    const {theme} = useTheme();

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{selected}}
            onPress={() => {
                trigger();
                onPress();
            }}
            style={({pressed}) => [
                styles.filterChip,
                {
                    backgroundColor: selected
                        ? pressed
                            ? theme.tonal.primary50
                            : theme.tonal.primary30
                        : pressed
                            ? theme.tonal.primary15
                            : theme.tonal.primary08,
                    borderColor: selected
                        ? theme.themeColor
                        : theme.themeColorUltraLight,
                },
            ]}>
            <Text
                numberOfLines={1}
                style={[
                    styles.filterChipText,
                    {
                        color: selected
                            ? theme.themeColor
                            : theme.black.second,
                    },
                ]}>
                {label}
            </Text>
        </Pressable>
    );
});

const SearchOptionModal = ({
    visible,
    title,
    options,
    selectedKey,
    emptyLabel,
    hierarchical = false,
    onSelect,
    onClose,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(
        () => new Set(),
    );
    const visibleOptions = useMemo(
        () =>
            hierarchical
                ? buildHarborCategoryRows(options, collapsedCategoryIds)
                : options,
        [collapsedCategoryIds, hierarchical, options],
    );
    const data = useMemo(
        () => [{key: '', label: emptyLabel, value: null}, ...visibleOptions],
        [emptyLabel, visibleOptions],
    );

    useEffect(() => {
        if (visible && hierarchical) {
            setCollapsedCategoryIds(new Set());
        }
    }, [hierarchical, visible]);

    const handleToggleCategory = useCallback(item => {
        const categoryKey = getHarborCategoryKey(item);
        setCollapsedCategoryIds(current => {
            const next = new Set(current);
            if (next.has(categoryKey)) {
                next.delete(categoryKey);
            } else {
                next.add(categoryKey);
            }
            return next;
        });
    }, []);

    const renderItem = useCallback(
        ({item}) => {
            const selected = item.key === selectedKey;
            return (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{selected}}
                    onPress={() => {
                        trigger();
                        onSelect(item.value);
                    }}
                    style={({pressed}) => [
                        styles.optionRow,
                        hierarchical && item.depth > 0
                            ? {
                                paddingLeft: scale(
                                    15 + item.depth * 18,
                                ),
                            }
                            : null,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary15
                                : selected
                                    ? theme.tonal.primary08
                                    : theme.white,
                            borderBottomColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    {hierarchical && item.key !== '' ? (
                        <HarborCategoryIcon
                            category={item}
                            color={
                                selected
                                    ? theme.themeColor
                                    : theme.black.second
                            }
                            size={scale(16)}
                            style={styles.optionCategoryIcon}
                        />
                    ) : null}
                    <Text
                        numberOfLines={2}
                        style={[
                            styles.optionText,
                            {
                                color: selected
                                    ? theme.themeColor
                                    : theme.black.main,
                            },
                        ]}>
                        {item.label}
                    </Text>
                    {hierarchical && item.hasChildren ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityState={{
                                expanded: item.isExpanded,
                            }}
                            accessibilityLabel={t(
                                item.isExpanded
                                    ? '收起 {{name}} 的子分類'
                                    : '展開 {{name}} 的子分類',
                                {name: item.name},
                            )}
                            hitSlop={scale(8)}
                            onPress={event => {
                                event.stopPropagation?.();
                                trigger();
                                handleToggleCategory(item);
                            }}
                            style={({pressed}) => [
                                styles.optionToggle,
                                pressed && {
                                    backgroundColor:
                                        theme.tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name={
                                    item.isExpanded
                                        ? 'chevron-up'
                                        : 'chevron-down'
                                }
                                size={scale(19)}
                                color={theme.themeColor}
                            />
                        </Pressable>
                    ) : null}
                    {selected ? (
                        <MaterialCommunityIcons
                            name="check"
                            size={scale(19)}
                            color={theme.themeColor}
                        />
                    ) : null}
                </Pressable>
            );
        },
        [
            handleToggleCategory,
            hierarchical,
            onSelect,
            selectedKey,
            t,
            theme,
        ],
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => {
                trigger();
                onClose();
            }}>
            <View
                style={[
                    styles.modalBackdrop,
                    {backgroundColor: theme.tonal.primary50},
                ]}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('關閉')}
                    onPress={() => {
                        trigger();
                        onClose();
                    }}
                    style={StyleSheet.absoluteFill}
                />
                <View
                    style={[
                        styles.optionModal,
                        {
                            backgroundColor: theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                        theme.viewShadow,
                    ]}>
                    <View style={styles.optionModalHeader}>
                        <Text
                            style={[
                                styles.optionModalTitle,
                                {color: theme.black.main},
                            ]}>
                            {title}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('關閉')}
                            hitSlop={scale(8)}
                            onPress={() => {
                                trigger();
                                onClose();
                            }}
                            style={({pressed}) => [
                                styles.modalCloseButton,
                                pressed && {
                                    backgroundColor:
                                        theme.tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="close"
                                size={scale(20)}
                                color={theme.black.main}
                            />
                        </Pressable>
                    </View>
                    <FlashList
                        data={data}
                        keyExtractor={item => item.key}
                        renderItem={renderItem}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            </View>
        </Modal>
    );
};

const HarborSearchResultCard = memo(
    ({item, onPress, onAuthorPress, onCategoryPress, onTagPress}) => {
        const {theme} = useTheme();
        const {t} = useTranslation('harbor');

        if (item.kind === 'user') {
            const user = item.user;
            return (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={user.name || user.username}
                    onPress={() => {
                        trigger();
                        onAuthorPress(user);
                    }}
                    style={({pressed}) => [
                        styles.resultCard,
                        styles.userResultCard,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary08
                                : theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                        theme.viewShadow,
                    ]}>
                    {user.avatarUrl ? (
                        <Image
                            source={{uri: user.avatarUrl}}
                            style={[
                                styles.resultAvatar,
                                {backgroundColor: theme.tonal.primary15},
                            ]}
                            contentFit="cover"
                            placeholder={theme.imagePlaceholder}
                            transition={180}
                        />
                    ) : (
                        <View
                            style={[
                                styles.resultAvatarFallback,
                                {backgroundColor: theme.tonal.primary15},
                            ]}>
                            <MaterialCommunityIcons
                                name="account-outline"
                                size={scale(20)}
                                color={theme.themeColor}
                            />
                        </View>
                    )}
                    <View style={styles.userResultText}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.resultTitle,
                                {color: theme.black.main},
                            ]}>
                            {user.name || user.username}
                        </Text>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.resultMetaText,
                                {color: theme.black.third},
                            ]}>
                            @{user.username} · {t('查看此作者的貼文')}
                        </Text>
                    </View>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={scale(20)}
                        color={theme.black.third}
                    />
                </Pressable>
            );
        }

        const author = item.author;
        const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];
        return (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => {
                    trigger();
                    onPress(item);
                }}
                style={({pressed}) => [
                    styles.resultCard,
                    {
                        backgroundColor: pressed
                            ? theme.tonal.primary08
                            : theme.white,
                        borderColor: theme.themeColorUltraLight,
                    },
                    theme.viewShadow,
                ]}>
                <Text
                    selectable
                    numberOfLines={3}
                    style={[
                        styles.resultTitle,
                        {color: theme.black.main},
                    ]}>
                    {item.title}
                </Text>
                {item.excerpt ? (
                    <Text
                        numberOfLines={3}
                        style={[
                            styles.resultExcerpt,
                            {color: theme.black.third},
                        ]}>
                        {item.excerpt}
                    </Text>
                ) : null}
                <View style={styles.resultMetadata}>
                    {author?.username ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={event => {
                                event.stopPropagation?.();
                                trigger();
                                onAuthorPress(author);
                            }}
                            style={({pressed}) => [
                                styles.inlineMeta,
                                pressed && {
                                    backgroundColor:
                                        theme.tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="account-outline"
                                size={scale(13)}
                                color={theme.black.third}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.inlineMetaText,
                                    {color: theme.black.third},
                                ]}>
                                {author.name || author.username}
                            </Text>
                        </Pressable>
                    ) : null}
                    {item.createdAt ? (
                        <View style={styles.inlineMeta}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={scale(13)}
                                color={theme.black.third}
                            />
                            <Text
                                style={[
                                    styles.inlineMetaText,
                                    {color: theme.black.third},
                                ]}>
                                {moment
                                    .tz(item.createdAt, 'Asia/Macau')
                                    .format('YYYY/MM/DD')}
                            </Text>
                        </View>
                    ) : null}
                    {item.likeCount > 0 ? (
                        <View style={styles.inlineMeta}>
                            <MaterialCommunityIcons
                                name="heart-outline"
                                size={scale(13)}
                                color={theme.themeColor}
                            />
                            <Text
                                style={[
                                    styles.inlineMetaText,
                                    {color: theme.themeColor},
                                ]}>
                                {item.likeCount}
                            </Text>
                        </View>
                    ) : null}
                </View>
                {item.category?.name || tags.length > 0 ? (
                    <View style={styles.taxonomyRow}>
                        {item.category?.name ? (
                            <Pressable
                                accessibilityRole="button"
                                onPress={event => {
                                    event.stopPropagation?.();
                                    trigger();
                                    onCategoryPress(item.category);
                                }}
                                style={({pressed}) => [
                                    styles.taxonomyChip,
                                    {
                                        backgroundColor: pressed
                                            ? theme.tonal.secondary30
                                            : theme.tonal.secondary15,
                                    },
                                ]}>
                                <HarborCategoryIcon
                                    category={item.category}
                                    color={theme.secondThemeColor}
                                    size={scale(13)}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.taxonomyText,
                                        {color: theme.secondThemeColor},
                                    ]}>
                                    {item.category.name}
                                </Text>
                            </Pressable>
                        ) : null}
                        {tags.map(tag => (
                            <Pressable
                                key={tag.slug || tag.name}
                                accessibilityRole="button"
                                onPress={event => {
                                    event.stopPropagation?.();
                                    trigger();
                                    onTagPress(tag);
                                }}
                                style={({pressed}) => [
                                    styles.taxonomyChip,
                                    {
                                        backgroundColor: pressed
                                            ? theme.tonal.primary30
                                            : theme.tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.taxonomyText,
                                        {color: theme.themeColor},
                                    ]}>
                                    #{tag.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                ) : null}
            </Pressable>
        );
    },
);

const HarborSearchPage = ({route, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const inputRef = useRef(null);
    const controllerRef = useRef(null);
    const requestGenerationRef = useRef(0);
    const activeSearchRef = useRef(null);
    const loadingMoreRef = useRef(false);
    const initialSearchStartedRef = useRef(false);
    const searchFocused = useSharedValue(0);
    const searchCancelWidth = useSharedValue(0);
    const [query, setQuery] = useState(
        typeof route.params?.query === 'string' ? route.params.query : '',
    );
    const [history, setHistory] = useState([]);
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tags, setTags] = useState([]);
    const [category, setCategory] = useState(null);
    const [tag, setTag] = useState(null);
    const [author, setAuthor] = useState('');
    const [timeRange, setTimeRange] = useState('all');
    const [order, setOrder] = useState('relevance');
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [optionModal, setOptionModal] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [nextPage, setNextPage] = useState(null);
    const [error, setError] = useState(null);
    const [loadMoreError, setLoadMoreError] = useState(null);
    const [filterOptionsError, setFilterOptionsError] = useState(false);

    useEffect(() => {
        navigation.setOptions({headerTitle: t('Harbor 搜尋')});
        logToFirebase('openPage', {page: 'HarborNativeSearch'});
    }, [navigation, t]);

    useEffect(() => {
        let active = true;
        getHarborSearchHistory().then(savedHistory => {
            if (active) {
                setHistory(savedHistory);
            }
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        Promise.allSettled([
            fetchHarborCategories({signal: controller.signal}),
            fetchHarborTags({signal: controller.signal}),
        ]).then(([categoryResult, tagResult]) => {
            if (controller.signal.aborted) {
                return;
            }
            if (categoryResult.status === 'fulfilled') {
                setCategories(categoryResult.value.items);
            }
            if (tagResult.status === 'fulfilled') {
                setTags(tagResult.value.items);
            }
            setFilterOptionsError(
                categoryResult.status === 'rejected' ||
                    tagResult.status === 'rejected',
            );
        });
        return () => controller.abort();
    }, []);

    const invalidateSearchResults = useCallback(() => {
        requestGenerationRef.current += 1;
        controllerRef.current?.abort();
        controllerRef.current = null;
        loadingMoreRef.current = false;
        setHasSearched(false);
        setItems([]);
        setIsLoading(false);
        setIsLoadingMore(false);
        setHasMore(false);
        setNextPage(null);
        setError(null);
        setLoadMoreError(null);
    }, []);

    const handleQueryChange = useCallback(
        nextQuery => {
            setQuery(nextQuery);
            invalidateSearchResults();
        },
        [invalidateSearchResults],
    );

    const searchInputOuterAnimated = useAnimatedStyle(() => ({
        marginRight: withTiming(
            searchFocused.value * searchCancelWidth.value,
            {duration: SEARCH_ACTION_TIMING_MS},
        ),
    }));

    const searchCancelAnimated = useAnimatedStyle(() => ({
        opacity: searchCancelWidth.value > 1 ? 1 : 0,
        transform: [
            {
                translateX: withTiming(
                    (1 - searchFocused.value) * searchCancelWidth.value,
                    {duration: SEARCH_ACTION_TIMING_MS},
                ),
            },
        ],
    }));

    const handleSearchFocus = useCallback(() => {
        searchFocused.value = 1;
    }, [searchFocused]);

    const collapseSearchFocus = useCallback(() => {
        inputRef.current?.blur();
        searchFocused.value = 0;
    }, [searchFocused]);

    const handleClearSearchQuery = useCallback(() => {
        trigger();
        handleQueryChange('');
    }, [handleQueryChange]);

    const runSearch = useCallback(
        async ({
            queryOverride,
            authorOverride,
            page = 0,
            append = false,
        } = {}) => {
            const normalizedQuery = (
                queryOverride === undefined ? query : queryOverride
            ).trim();
            if (!normalizedQuery) {
                return;
            }

            Keyboard.dismiss();
            collapseSearchFocus();
            const normalizedAuthor =
                authorOverride === undefined ? author : authorOverride;
            const searchQuery = append
                ? activeSearchRef.current?.searchQuery
                : buildHarborSearchQuery({
                    query: normalizedQuery,
                    category,
                    tag,
                    author: normalizedAuthor,
                    after: getHarborSearchAfterDate(timeRange),
                    order,
                });
            const userQuery = append
                ? activeSearchRef.current?.userQuery
                : normalizedQuery;
            if (!searchQuery || (append && !activeSearchRef.current)) {
                return;
            }

            if (append) {
                if (loadingMoreRef.current) {
                    return;
                }
                loadingMoreRef.current = true;
                setIsLoadingMore(true);
                setLoadMoreError(null);
            } else {
                controllerRef.current?.abort();
                loadingMoreRef.current = false;
                setHasSearched(true);
                setIsLoading(true);
                setIsLoadingMore(false);
                setError(null);
                setLoadMoreError(null);
                setItems([]);
                setHasMore(false);
                setNextPage(null);
                activeSearchRef.current = {
                    searchQuery,
                    userQuery,
                };
                setQuery(normalizedQuery);
                if (authorOverride !== undefined) {
                    setAuthor(normalizedAuthor);
                }
                addHarborSearchHistory(normalizedQuery).then(setHistory);
                logToFirebase('harbor_search', {
                    hasCategory: Boolean(category),
                    hasTag: Boolean(tag),
                    hasAuthor: Boolean(normalizedAuthor),
                    timeRange,
                    order,
                });
            }

            const requestGeneration = ++requestGenerationRef.current;
            const controller = new AbortController();
            controllerRef.current = controller;

            try {
                const result = await fetchHarborSearch({
                    query: searchQuery,
                    userQuery,
                    page,
                    signal: controller.signal,
                });
                if (
                    controller.signal.aborted ||
                    requestGeneration !== requestGenerationRef.current
                ) {
                    return;
                }
                setItems(currentItems => {
                    if (!append) {
                        return result.items;
                    }
                    const seenIds = new Set(
                        currentItems.map(item => item.id),
                    );
                    return [
                        ...currentItems,
                        ...result.items.filter(item => !seenIds.has(item.id)),
                    ];
                });
                setHasMore(result.hasMore);
                setNextPage(result.nextPage);
            } catch (requestError) {
                if (!controller.signal.aborted) {
                    if (append) {
                        setLoadMoreError(requestError);
                    } else {
                        setError(requestError);
                    }
                }
            } finally {
                if (requestGeneration === requestGenerationRef.current) {
                    controllerRef.current = null;
                    setIsLoading(false);
                    setIsLoadingMore(false);
                    loadingMoreRef.current = false;
                }
            }
        },
        [author, category, collapseSearchFocus, order, query, tag, timeRange],
    );

    const handleSearchAction = useCallback(() => {
        trigger();
        if (!query.trim()) {
            collapseSearchFocus();
            return;
        }
        runSearch();
    }, [collapseSearchFocus, query, runSearch]);

    useEffect(() => {
        const transitionSubscription = navigation.addListener(
            'transitionEnd',
            event => {
                if (event.data?.closing) {
                    return;
                }
                inputRef.current?.focus();
            },
        );
        return () => {
            transitionSubscription();
            requestGenerationRef.current += 1;
            controllerRef.current?.abort();
        };
    }, [navigation]);

    useEffect(() => {
        const initialQuery =
            typeof route.params?.query === 'string'
                ? route.params.query.trim()
                : '';
        if (initialQuery && !initialSearchStartedRef.current) {
            initialSearchStartedRef.current = true;
            runSearch({queryOverride: initialQuery});
        }
    }, [route.params?.query, runSearch]);

    const handleLoadMore = useCallback(() => {
        if (
            !hasMore ||
            nextPage == null ||
            isLoading ||
            isLoadingMore ||
            error
        ) {
            return;
        }
        runSearch({
            page: nextPage,
            append: true,
        });
    }, [
        error,
        hasMore,
        isLoading,
        isLoadingMore,
        nextPage,
        runSearch,
    ]);

    const handleResultPress = useCallback(
        item => {
            collapseSearchFocus();
            navigation.navigate('HarborTopicDetail', {
                topicId: item.topicId,
                postNumber: item.postNumber || 1,
                topicTitle: item.title,
            });
        },
        [collapseSearchFocus, navigation],
    );

    const handleAuthorPress = useCallback(
        user => {
            const username = user?.username || '';
            if (!username) {
                return;
            }
            setFiltersExpanded(true);
            runSearch({
                queryOverride: query.trim() || username,
                authorOverride: username,
            });
        },
        [query, runSearch],
    );

    const handleCategoryPress = useCallback(
        selectedCategory => {
            collapseSearchFocus();
            navigation.navigate('HarborCategoryTopics', {
                categoryId: selectedCategory.id,
                categorySlug: selectedCategory.slug,
                categoryName: selectedCategory.name,
            });
        },
        [collapseSearchFocus, navigation],
    );

    const handleTagPress = useCallback(
        selectedTag => {
            collapseSearchFocus();
            navigation.navigate('HarborTagTopics', {
                tag: selectedTag.name || selectedTag,
            });
        },
        [collapseSearchFocus, navigation],
    );

    const handleClearHistory = useCallback(() => {
        Alert.alert(t('清除最近搜尋？'), t('清除後將無法復原。'), [
            {
                text: t('取消'),
                style: 'cancel',
                onPress: () => trigger(),
            },
            {
                text: t('清除'),
                style: 'destructive',
                onPress: async () => {
                    trigger();
                    setHistory(await clearHarborSearchHistory());
                },
            },
        ]);
    }, [t]);

    const activeFilterCount =
        Number(Boolean(category)) +
        Number(Boolean(tag)) +
        Number(Boolean(author.trim())) +
        Number(timeRange !== 'all') +
        Number(order !== 'relevance');

    const resetFilters = useCallback(() => {
        invalidateSearchResults();
        setCategory(null);
        setTag(null);
        setAuthor('');
        setTimeRange('all');
        setOrder('relevance');
    }, [invalidateSearchResults]);

    const historyItems = useMemo(
        () =>
            history.map(record => ({
                id: `history-${record.query.toLowerCase()}`,
                kind: 'history',
                ...record,
            })),
        [history],
    );
    const listData = hasSearched ? items : historyItems;
    const pageStyle = useMemo(
        () => [
            styles.page,
            {
                backgroundColor: theme.bg_color,
                paddingTop: isLiquidGlassSupported ? headerHeight : 0,
            },
        ],
        [headerHeight, theme.bg_color],
    );

    const categoryOptions = useMemo(
        () =>
            categories.map(item => ({
                ...item,
                key: String(item.id ?? item.slug),
                label: item.name,
                value: item,
            })),
        [categories],
    );
    const tagOptions = useMemo(
        () =>
            tags.map(item => ({
                key: String(item.id ?? item.name),
                label: `#${item.name}`,
                value: item,
            })),
        [tags],
    );

    const renderItem = useCallback(
        ({item}) => {
            if (item.kind === 'history') {
                return (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                            trigger();
                            collapseSearchFocus();
                            setQuery(item.query);
                            runSearch({queryOverride: item.query});
                        }}
                        style={({pressed}) => [
                            styles.historyRow,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary08
                                    : theme.white,
                                borderBottomColor:
                                    theme.themeColorUltraLight,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="history"
                            size={scale(18)}
                            color={theme.black.third}
                        />
                        <Text
                            numberOfLines={2}
                            style={[
                                styles.historyText,
                                {color: theme.black.main},
                            ]}>
                            {item.query}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t(
                                '刪除搜尋記錄：{{query}}',
                                {query: item.query},
                            )}
                            hitSlop={scale(8)}
                            onPress={async event => {
                                event.stopPropagation?.();
                                trigger();
                                collapseSearchFocus();
                                setHistory(
                                    await removeHarborSearchHistory(
                                        item.query,
                                    ),
                                );
                            }}
                            style={({pressed}) => [
                                styles.historyDeleteButton,
                                pressed && {
                                    backgroundColor:
                                        theme.tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="close"
                                size={scale(17)}
                                color={theme.black.third}
                            />
                        </Pressable>
                    </Pressable>
                );
            }

            return (
                <HarborSearchResultCard
                    item={item}
                    onPress={handleResultPress}
                    onAuthorPress={handleAuthorPress}
                    onCategoryPress={handleCategoryPress}
                    onTagPress={handleTagPress}
                />
            );
        },
        [
            collapseSearchFocus,
            handleAuthorPress,
            handleCategoryPress,
            handleResultPress,
            handleTagPress,
            runSearch,
            t,
            theme,
        ],
    );

    const renderListHeader = useCallback(() => {
        if (hasSearched) {
            if (isLoading || error || items.length === 0) {
                return null;
            }
            return (
                <Text
                    style={[
                        styles.sectionTitle,
                        {color: theme.black.second},
                    ]}>
                    {t('{{count}} 個搜尋結果', {count: items.length})}
                </Text>
            );
        }
        if (history.length === 0) {
            return null;
        }
        return (
            <View style={styles.historyHeader}>
                <Text
                    style={[
                        styles.sectionTitle,
                        {color: theme.black.second},
                    ]}>
                    {t('最近搜尋')}
                </Text>
                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        trigger();
                        collapseSearchFocus();
                        handleClearHistory();
                    }}
                    style={({pressed}) => [
                        styles.clearHistoryButton,
                        pressed && {
                            backgroundColor: theme.tonal.primary15,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.clearHistoryText,
                            {color: theme.themeColor},
                        ]}>
                        {t('清除全部')}
                    </Text>
                </Pressable>
            </View>
        );
    }, [
        collapseSearchFocus,
        error,
        handleClearHistory,
        hasSearched,
        history.length,
        isLoading,
        items.length,
        t,
        theme,
    ]);

    const renderEmptyState = useCallback(() => {
        if (isLoading) {
            return (
                <View style={styles.loadingState}>
                    <ActivityIndicator
                        size="large"
                        color={theme.themeColor}
                    />
                    <Text
                        style={[
                            styles.loadingText,
                            {color: theme.black.third},
                        ]}>
                        {t('正在搜尋 Harbor…')}
                    </Text>
                </View>
            );
        }
        if (error) {
            const noPermission = [401, 403].includes(error?.response?.status);
            return (
                <HarborFullState
                    icon={noPermission ? 'lock-outline' : 'cloud-alert-outline'}
                    title={
                        noPermission
                            ? t('你沒有權限查看此搜尋結果')
                            : t('搜尋失敗')
                    }
                    description={
                        noPermission
                            ? t('Harbor 已按你的帳號權限過濾搜尋內容。')
                            : t('請檢查網絡後再試。')
                    }
                    actionLabel={t('重試')}
                    onAction={() => runSearch()}
                />
            );
        }
        if (hasSearched) {
            return (
                <HarborFullState
                    icon="magnify-close"
                    title={t('沒有找到搜尋結果')}
                    description={t('試試其他關鍵字或調整搜尋篩選。')}
                />
            );
        }
        return (
            <HarborFullState
                icon="magnify"
                title={t('搜尋 Harbor')}
                description={t(
                    '搜尋話題、貼文與使用者，也可直接輸入 Discourse 進階語法。',
                )}
            />
        );
    }, [error, hasSearched, isLoading, runSearch, t, theme]);

    const renderFooter = useCallback(() => {
        if (isLoadingMore) {
            return (
                <View style={styles.footerLoading}>
                    <ActivityIndicator
                        size="small"
                        color={theme.themeColor}
                    />
                </View>
            );
        }
        if (loadMoreError) {
            return (
                <View style={styles.footerRetry}>
                    <HarborInlineRetry
                        message={t('暫時無法載入更多搜尋結果')}
                        actionLabel={t('重試')}
                        onRetry={handleLoadMore}
                    />
                </View>
            );
        }
        return <View style={styles.footerSpacing} />;
    }, [
        handleLoadMore,
        isLoadingMore,
        loadMoreError,
        t,
        theme.themeColor,
    ]);

    return (
        <View style={pageStyle}>
            <View
                style={[
                    styles.searchPanel,
                    {
                        backgroundColor: theme.bg_color,
                        borderBottomColor: theme.themeColorUltraLight,
                    },
                ]}>
                <View style={styles.searchRow}>
                    <Animated.View
                        style={[
                            styles.searchInputOuter,
                            searchInputOuterAnimated,
                        ]}>
                        <View
                            style={[
                                styles.searchInputContainer,
                                {
                                    // 對齊 ClubSearchBar／iOS UISearchBar 常見底色（ThemeContext 無對應語義 token）
                                    backgroundColor: theme.isLight
                                        ? '#E5E5EA'
                                        : '#3A3A3C',
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="magnify"
                                size={scale(15)}
                                color={theme.black.third}
                            />
                            <TextInput
                                ref={inputRef}
                                value={query}
                                onChangeText={handleQueryChange}
                                onFocus={handleSearchFocus}
                                onSubmitEditing={handleSearchAction}
                                placeholder={t('關鍵字或 Discourse 搜尋語法')}
                                placeholderTextColor={theme.black.third}
                                returnKeyType="search"
                                autoCapitalize="none"
                                autoCorrect={false}
                                clearButtonMode="never"
                                selectionColor={theme.themeColor}
                                style={[
                                    styles.searchInput,
                                    {color: theme.black.main},
                                ]}
                            />
                            {isLoading ? (
                                <ActivityIndicator
                                    size="small"
                                    color={theme.themeColor}
                                    style={styles.searchLoading}
                                />
                            ) : null}
                            {query ? (
                                <TouchableScale
                                    accessibilityRole="button"
                                    accessibilityLabel={t('清除搜尋內容')}
                                    hitSlop={scale(8)}
                                    onPress={handleClearSearchQuery}
                                    style={styles.inputActionButton}>
                                    <MaterialCommunityIcons
                                        name="close-circle"
                                        size={scale(17)}
                                        color={theme.black.third}
                                    />
                                </TouchableScale>
                            ) : null}
                        </View>
                    </Animated.View>
                    <Animated.View
                        style={[styles.searchActionWrap, searchCancelAnimated]}
                        onLayout={event => {
                            const width = event.nativeEvent.layout.width;
                            if (width > 0) {
                                searchCancelWidth.value = width;
                            }
                        }}>
                        <TouchableScale
                            accessibilityRole="button"
                            accessibilityState={{
                                disabled: !query.trim() || isLoading,
                            }}
                            disabled={!query.trim() || isLoading}
                            hitSlop={scale(6)}
                            onPress={handleSearchAction}>
                            <Text
                                style={[
                                    styles.searchActionText,
                                    {
                                        color:
                                            !query.trim() || isLoading
                                                ? theme.disabled
                                                : theme.themeColor,
                                    },
                                ]}>
                                {t('搜尋')}
                            </Text>
                        </TouchableScale>
                    </Animated.View>
                </View>
                <View style={styles.filterToolbar}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{expanded: filtersExpanded}}
                        onPress={() => {
                            trigger();
                            collapseSearchFocus();
                            setFiltersExpanded(current => !current);
                        }}
                        style={({pressed}) => [
                            styles.filterToggle,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary30
                                    : activeFilterCount > 0
                                        ? theme.tonal.primary15
                                        : theme.tonal.primary08,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="tune-variant"
                            size={scale(16)}
                            color={theme.themeColor}
                        />
                        <Text
                            style={[
                                styles.filterToggleText,
                                {color: theme.themeColor},
                            ]}>
                            {activeFilterCount > 0
                                ? t('篩選（{{count}}）', {
                                    count: activeFilterCount,
                                })
                                : t('篩選')}
                        </Text>
                        <MaterialCommunityIcons
                            name={
                                filtersExpanded
                                    ? 'chevron-up'
                                    : 'chevron-down'
                            }
                            size={scale(16)}
                            color={theme.themeColor}
                        />
                    </Pressable>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.syntaxHint,
                            {color: theme.black.third},
                        ]}>
                        in: · status: · category: · tags:
                    </Text>
                </View>
                {filtersExpanded ? (
                    <View style={styles.filters}>
                        <View style={styles.filterSection}>
                            <Text
                                style={[
                                    styles.filterLabel,
                                    {color: theme.black.second},
                                ]}>
                                {t('分類與標籤')}
                            </Text>
                            <View style={styles.filterChipRow}>
                                <SearchFilterChip
                                    label={
                                        category?.name || t('所有分類')
                                    }
                                    selected={Boolean(category)}
                                    onPress={() => {
                                        collapseSearchFocus();
                                        invalidateSearchResults();
                                        setOptionModal('category');
                                    }}
                                />
                                <SearchFilterChip
                                    label={
                                        tag?.name
                                            ? `#${tag.name}`
                                            : t('所有標籤')
                                    }
                                    selected={Boolean(tag)}
                                    onPress={() => {
                                        collapseSearchFocus();
                                        invalidateSearchResults();
                                        setOptionModal('tag');
                                    }}
                                />
                            </View>
                        </View>
                        <View style={styles.filterSection}>
                            <Text
                                style={[
                                    styles.filterLabel,
                                    {color: theme.black.second},
                                ]}>
                                {t('作者')}
                            </Text>
                            <View
                                style={[
                                    styles.authorInputContainer,
                                    {
                                        backgroundColor:
                                            theme.tonal.primary08,
                                        borderColor:
                                            theme.themeColorUltraLight,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.authorPrefix,
                                        {color: theme.black.third},
                                    ]}>
                                    @
                                </Text>
                                <TextInput
                                    value={author}
                                    onChangeText={nextAuthor => {
                                        invalidateSearchResults();
                                        setAuthor(nextAuthor);
                                    }}
                                    onFocus={collapseSearchFocus}
                                    placeholder={t('使用者名稱')}
                                    placeholderTextColor={theme.black.third}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    returnKeyType="search"
                                    onSubmitEditing={() => {
                                        trigger();
                                        runSearch();
                                    }}
                                    style={[
                                        styles.authorInput,
                                        {color: theme.black.main},
                                    ]}
                                />
                            </View>
                        </View>
                        <View style={styles.filterSection}>
                            <Text
                                style={[
                                    styles.filterLabel,
                                    {color: theme.black.second},
                                ]}>
                                {t('時間')}
                            </Text>
                            <View style={styles.filterChipRow}>
                                {TIME_OPTIONS.map(option => (
                                    <SearchFilterChip
                                        key={option.key}
                                        label={t(option.label)}
                                        selected={timeRange === option.key}
                                        onPress={() => {
                                            collapseSearchFocus();
                                            invalidateSearchResults();
                                            setTimeRange(option.key);
                                        }}
                                    />
                                ))}
                            </View>
                        </View>
                        <View style={styles.filterSection}>
                            <Text
                                style={[
                                    styles.filterLabel,
                                    {color: theme.black.second},
                                ]}>
                                {t('排序')}
                            </Text>
                            <View style={styles.filterChipRow}>
                                {ORDER_OPTIONS.map(option => (
                                    <SearchFilterChip
                                        key={option.key}
                                        label={t(option.label)}
                                        selected={order === option.key}
                                        onPress={() => {
                                            collapseSearchFocus();
                                            invalidateSearchResults();
                                            setOrder(option.key);
                                        }}
                                    />
                                ))}
                            </View>
                        </View>
                        {filterOptionsError ? (
                            <Text
                                style={[
                                    styles.filterOptionError,
                                    {color: theme.unread},
                                ]}>
                                {t('部分分類或標籤暫時無法載入。')}
                            </Text>
                        ) : null}
                        {activeFilterCount > 0 ? (
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => {
                                    trigger();
                                    collapseSearchFocus();
                                    resetFilters();
                                }}
                                style={({pressed}) => [
                                    styles.resetFiltersButton,
                                    pressed && {
                                        backgroundColor:
                                            theme.tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.resetFiltersText,
                                        {color: theme.themeColor},
                                    ]}>
                                    {t('重設篩選')}
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>
                ) : null}
            </View>
            <FlashList
                data={listData}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                ListHeaderComponent={renderListHeader}
                ListEmptyComponent={renderEmptyState}
                ListFooterComponent={renderFooter}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.35}
                onScrollBeginDrag={collapseSearchFocus}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                contentInsetAdjustmentBehavior="never"
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? {top: headerHeight} : undefined
                }
            />
            <SearchOptionModal
                visible={optionModal === 'category'}
                title={t('選擇分類')}
                options={categoryOptions}
                hierarchical
                selectedKey={category ? String(category.id ?? category.slug) : ''}
                emptyLabel={t('所有分類')}
                onSelect={value => {
                    collapseSearchFocus();
                    invalidateSearchResults();
                    setCategory(value);
                    setOptionModal(null);
                }}
                onClose={() => setOptionModal(null)}
            />
            <SearchOptionModal
                visible={optionModal === 'tag'}
                title={t('選擇標籤')}
                options={tagOptions}
                selectedKey={tag ? String(tag.id ?? tag.name) : ''}
                emptyLabel={t('所有標籤')}
                onSelect={value => {
                    collapseSearchFocus();
                    invalidateSearchResults();
                    setTag(value);
                    setOptionModal(null);
                }}
                onClose={() => setOptionModal(null)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    searchPanel: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(12),
        paddingTop: verticalScale(8),
        paddingBottom: verticalScale(7),
        zIndex: 2,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        width: '100%',
    },
    searchInputOuter: {
        flex: 1,
        minWidth: 0,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(9),
        minHeight: scale(32),
        paddingLeft: scale(6),
        paddingRight: scale(6),
        marginLeft: scale(4),
        marginRight: scale(4),
    },
    searchInput: {
        ...uiStyle.defaultText,
        flex: 1,
        minWidth: 0,
        marginLeft: scale(4),
        paddingVertical: scale(6),
        fontSize: verticalScale(12),
    },
    searchLoading: {
        marginRight: scale(4),
    },
    inputActionButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchActionWrap: {
        position: 'absolute',
        right: 0,
        justifyContent: 'center',
        paddingVertical: scale(6),
        paddingLeft: scale(6),
        paddingRight: scale(2),
    },
    searchActionText: {
        ...uiStyle.defaultText,
        fontSize: verticalScale(14),
        textAlign: 'center',
    },
    filterToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(7),
    },
    filterToggle: {
        minHeight: verticalScale(30),
        borderRadius: scale(9),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(9),
    },
    filterToggleText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
        marginHorizontal: scale(4),
    },
    syntaxHint: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(9),
        textAlign: 'right',
        marginLeft: scale(8),
    },
    filters: {
        paddingTop: verticalScale(8),
    },
    filterSection: {
        marginBottom: verticalScale(7),
    },
    filterLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
        marginBottom: verticalScale(4),
    },
    filterChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    filterChip: {
        maxWidth: scale(145),
        minHeight: verticalScale(27),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(9),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(6),
        marginBottom: verticalScale(5),
        paddingHorizontal: scale(9),
    },
    filterChipText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '600',
    },
    authorInputContainer: {
        minHeight: verticalScale(34),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(10),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(10),
    },
    authorPrefix: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '700',
    },
    authorInput: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(11),
        paddingHorizontal: scale(4),
        paddingVertical: verticalScale(6),
    },
    filterOptionError: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginBottom: verticalScale(4),
    },
    resetFiltersButton: {
        alignSelf: 'flex-start',
        borderRadius: scale(8),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(5),
    },
    resetFiltersText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
    },
    listContent: {
        paddingTop: verticalScale(10),
        paddingBottom: verticalScale(16),
    },
    sectionTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '700',
        marginHorizontal: scale(14),
        marginBottom: verticalScale(8),
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    clearHistoryButton: {
        borderRadius: scale(8),
        marginRight: scale(10),
        marginBottom: verticalScale(8),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(4),
    },
    clearHistoryText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
    },
    historyRow: {
        minHeight: verticalScale(46),
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: scale(14),
        paddingHorizontal: scale(8),
    },
    historyText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(12),
        marginHorizontal: scale(9),
    },
    historyDeleteButton: {
        width: scale(30),
        height: scale(30),
        borderRadius: scale(9),
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(15),
        marginHorizontal: scale(14),
        marginBottom: verticalScale(10),
        padding: scale(13),
    },
    userResultCard: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resultAvatar: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(19),
    },
    resultAvatarFallback: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(19),
        alignItems: 'center',
        justifyContent: 'center',
    },
    userResultText: {
        flex: 1,
        minWidth: 0,
        marginHorizontal: scale(10),
    },
    resultTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: verticalScale(7),
    },
    resultTypeChip: {
        borderRadius: scale(7),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(3),
    },
    resultTypeText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '700',
        marginLeft: scale(3),
    },
    resultTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        lineHeight: scale(21),
        fontWeight: '700',
    },
    resultExcerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: scale(17),
        marginTop: verticalScale(6),
    },
    resultMetaText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
    },
    resultMetadata: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: verticalScale(8),
    },
    inlineMeta: {
        minHeight: verticalScale(24),
        borderRadius: scale(7),
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scale(9),
        paddingHorizontal: scale(3),
    },
    inlineMetaText: {
        ...uiStyle.defaultText,
        maxWidth: scale(120),
        fontSize: scale(9),
        marginLeft: scale(3),
    },
    taxonomyRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: verticalScale(5),
    },
    taxonomyChip: {
        maxWidth: scale(130),
        borderRadius: scale(7),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        marginRight: scale(6),
        marginTop: verticalScale(4),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(4),
    },
    taxonomyText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '600',
    },
    loadingState: {
        minHeight: verticalScale(220),
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(10),
    },
    footerLoading: {
        minHeight: verticalScale(54),
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerRetry: {
        marginHorizontal: scale(14),
        marginBottom: verticalScale(10),
    },
    footerSpacing: {
        height: verticalScale(12),
    },
    modalBackdrop: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(20),
    },
    optionModal: {
        width: '100%',
        maxHeight: '72%',
        minHeight: verticalScale(260),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(18),
        overflow: 'hidden',
    },
    optionModalHeader: {
        minHeight: verticalScale(50),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(14),
    },
    optionModalTitle: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(16),
        fontWeight: '700',
    },
    modalCloseButton: {
        width: scale(32),
        height: scale(32),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionRow: {
        minHeight: verticalScale(48),
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(8),
    },
    optionText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(12),
        marginRight: scale(8),
    },
    optionCategoryIcon: {
        marginRight: scale(8),
    },
    optionToggle: {
        alignItems: 'center',
        borderRadius: scale(8),
        height: scale(30),
        justifyContent: 'center',
        marginRight: scale(2),
        width: scale(30),
    },
});

export default HarborSearchPage;
