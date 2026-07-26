import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import PagerView from 'react-native-pager-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import SegmentControl from '../../../components/SegmentControl';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import {
    fetchHarborCategories,
    fetchHarborTags,
} from '../../../utils/harbor/harborApi';
import {
    buildHarborCategoryRows,
    getHarborCategoryKey,
} from '../../../utils/harbor/harborCategories';
import { trigger } from '../../../utils/trigger';
import {
    HarborFullState,
    HarborInlineRetry,
    HarborTopicSkeleton,
} from './components/HarborListStates';

const SKELETON_ITEMS = ['one', 'two', 'three', 'four'];

const CategoryHierarchy = ({ item, color }) => {
    if (item.depth <= 0) {
        return null;
    }

    return (
        <View
            pointerEvents="none"
            style={[styles.hierarchyGuide, { width: scale(item.depth * 18) }]}>
            {Array.from({ length: item.depth }, (_, level) => {
                const isCurrentBranch = level === item.depth - 1;
                const showAncestorLine =
                    !isCurrentBranch && item.parentLineStates?.[level];
                if (!isCurrentBranch && !showAncestorLine) {
                    return null;
                }

                const left = scale(level * 18 + 7);
                return (
                    <React.Fragment key={`category-guide-${level}`}>
                        <View
                            style={[
                                styles.hierarchyVertical,
                                isCurrentBranch &&
                                item.isLastSibling &&
                                styles.hierarchyVerticalLast,
                                {
                                    backgroundColor: color,
                                    left,
                                },
                            ]}
                        />
                        {isCurrentBranch ? (
                            <View
                                style={[
                                    styles.hierarchyBranch,
                                    {
                                        backgroundColor: color,
                                        left,
                                    },
                                ]}
                            />
                        ) : null}
                    </React.Fragment>
                );
            })}
        </View>
    );
};

const CategoryRow = ({ item, onPress, onToggle, isPressAllowed }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const isSubcategory = item.depth > 0;

    return (
        <Pressable
            accessibilityRole="button"
            onPress={() => {
                if (isPressAllowed && !isPressAllowed()) {
                    return;
                }
                trigger();
                onPress(item);
            }}
            style={({ pressed }) => [
                styles.directoryRow,
                {
                    backgroundColor: pressed
                        ? theme.tonal.primary15
                        : isSubcategory
                            ? theme.tonal.primary08
                            : theme.white,
                    borderColor: theme.themeColorUltraLight,
                },
            ]}>
            <CategoryHierarchy item={item} color={theme.themeColorUltraLight} />
            <View
                style={[
                    styles.directoryIcon,
                    isSubcategory && styles.subcategoryIcon,
                    {
                        backgroundColor: isSubcategory
                            ? theme.tonal.secondary15
                            : theme.tonal.primary15,
                    },
                ]}>
                <MaterialCommunityIcons
                    name={
                        isSubcategory
                            ? 'folder-outline'
                            : 'folder-multiple-outline'
                    }
                    size={scale(isSubcategory ? 18 : 21)}
                    color={
                        isSubcategory
                            ? theme.secondThemeColor
                            : theme.themeColor
                    }
                />
            </View>
            <View style={styles.directoryText}>
                <View style={styles.nameRow}>
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.directoryName,
                            { color: theme.black.main },
                        ]}>
                        {item.name}
                    </Text>
                    {item.readRestricted ? (
                        <MaterialCommunityIcons
                            name="lock-outline"
                            size={scale(13)}
                            color={theme.unread}
                        />
                    ) : null}
                </View>
                {item.description ? (
                    <Text
                        numberOfLines={2}
                        style={[
                            styles.directoryDescription,
                            { color: theme.black.third },
                        ]}>
                        {item.description}
                    </Text>
                ) : null}
                <Text
                    style={[
                        styles.directoryCount,
                        { color: theme.themeColor },
                    ]}>
                    {t('{{topics}} 個話題 · {{posts}} 篇貼文', {
                        topics: item.topicCount || 0,
                        posts: item.postCount || 0,
                    })}
                </Text>
            </View>
            {item.hasChildren ? (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: item.isExpanded }}
                    accessibilityLabel={t(
                        item.isExpanded
                            ? '收起 {{name}} 的子分類'
                            : '展開 {{name}} 的子分類',
                        { name: item.name },
                    )}
                    hitSlop={scale(8)}
                    onPress={event => {
                        event.stopPropagation?.();
                        if (isPressAllowed && !isPressAllowed()) {
                            return;
                        }
                        trigger();
                        onToggle(item);
                    }}
                    style={({ pressed }) => [
                        styles.categoryToggle,
                        pressed && {
                            backgroundColor: theme.tonal.primary15,
                        },
                    ]}>
                    <MaterialCommunityIcons
                        name={
                            item.isExpanded
                                ? 'chevron-up'
                                : 'chevron-down'
                        }
                        size={scale(20)}
                        color={theme.themeColor}
                    />
                </Pressable>
            ) : null}
            <MaterialCommunityIcons
                name="chevron-right"
                size={scale(20)}
                color={theme.black.third}
            />
        </Pressable>
    );
};

const TagRow = ({ item, onPress, isPressAllowed }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');

    return (
        <Pressable
            accessibilityRole="button"
            onPress={() => {
                if (isPressAllowed && !isPressAllowed()) {
                    return;
                }
                trigger();
                onPress(item);
            }}
            style={({ pressed }) => [
                styles.directoryRow,
                {
                    backgroundColor: pressed
                        ? theme.tonal.primary08
                        : theme.white,
                    borderColor: theme.themeColorUltraLight,
                },
            ]}>
            <View
                style={[
                    styles.directoryIcon,
                    { backgroundColor: theme.tonal.primary15 },
                ]}>
                <MaterialCommunityIcons
                    name="tag-outline"
                    size={scale(21)}
                    color={theme.themeColor}
                />
            </View>
            <View style={styles.directoryText}>
                <Text
                    numberOfLines={1}
                    style={[styles.directoryName, { color: theme.black.main }]}>
                    #{item.name}
                </Text>
                {item.description ? (
                    <Text
                        numberOfLines={2}
                        style={[
                            styles.directoryDescription,
                            { color: theme.black.third },
                        ]}>
                        {item.description}
                    </Text>
                ) : null}
                <Text
                    style={[
                        styles.directoryCount,
                        { color: theme.themeColor },
                    ]}>
                    {t('{{count}} 個話題', { count: item.topicCount || 0 })}
                </Text>
            </View>
            <MaterialCommunityIcons
                name="chevron-right"
                size={scale(20)}
                color={theme.black.third}
            />
        </Pressable>
    );
};

const HarborDirectoryPane = ({
    type,
    navigation,
    contentContainerStyle,
    contentInsetAdjustmentBehavior = 'never',
    scrollIndicatorInsets,
    isPressAllowed,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const controllerRef = useRef(null);
    const requestGenerationRef = useRef(0);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(
        () => new Set(),
    );
    const isCategory = type === 'category';

    const loadDirectory = useCallback(
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
            setLoadError(null);

            try {
                const result = isCategory
                    ? await fetchHarborCategories({ signal: controller.signal })
                    : await fetchHarborTags({ signal: controller.signal });
                if (
                    controller.signal.aborted ||
                    requestGeneration !== requestGenerationRef.current
                ) {
                    return;
                }
                setItems(
                    isCategory
                        ? result.items
                        : result.items.filter(tag => !tag.pmOnly),
                );
            } catch (error) {
                if (!controller.signal.aborted) {
                    setLoadError(error);
                }
            } finally {
                if (requestGeneration === requestGenerationRef.current) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                    controllerRef.current = null;
                }
            }
        },
        [isCategory],
    );

    useEffect(() => {
        loadDirectory();
        return () => {
            requestGenerationRef.current += 1;
            controllerRef.current?.abort();
        };
    }, [loadDirectory]);

    const handlePress = useCallback(
        item => {
            if (isCategory) {
                navigation.navigate('HarborCategoryTopics', {
                    categoryId: item.id,
                    categorySlug: item.slug,
                    categoryName: item.name,
                });
                return;
            }
            navigation.navigate('HarborTagTopics', { tag: item.name });
        },
        [isCategory, navigation],
    );

    const visibleItems = useMemo(
        () =>
            isCategory
                ? buildHarborCategoryRows(items, collapsedCategoryIds)
                : items,
        [collapsedCategoryIds, isCategory, items],
    );
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
        ({ item }) =>
            isCategory ? (
                <CategoryRow
                    item={item}
                    onPress={handlePress}
                    onToggle={handleToggleCategory}
                    isPressAllowed={isPressAllowed}
                />
            ) : (
                <TagRow
                    item={item}
                    onPress={handlePress}
                    isPressAllowed={isPressAllowed}
                />
            ),
        [handlePress, handleToggleCategory, isCategory, isPressAllowed],
    );

    if (isLoading && items.length === 0) {
        return (
            <View style={[styles.page, { backgroundColor: theme.bg_color }]}>
                <FlashList
                    data={SKELETON_ITEMS}
                    keyExtractor={item => `harbor-directory-skeleton-${item}`}
                    renderItem={() => <HarborTopicSkeleton />}
                    contentContainerStyle={contentContainerStyle}
                    contentInsetAdjustmentBehavior={
                        contentInsetAdjustmentBehavior
                    }
                    scrollIndicatorInsets={scrollIndicatorInsets}
                />
            </View>
        );
    }

    return (
        <View style={[styles.page, { backgroundColor: theme.bg_color }]}>
            <FlashList
                data={visibleItems}
                keyExtractor={item =>
                    `harbor-${isCategory ? 'category' : 'tag'}-${item.id || item.slug}`
                }
                renderItem={renderItem}
                contentContainerStyle={contentContainerStyle}
                contentInsetAdjustmentBehavior={
                    contentInsetAdjustmentBehavior
                }
                scrollIndicatorInsets={scrollIndicatorInsets}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    loadError && items.length > 0 ? (
                        <HarborInlineRetry
                            message={t('更新失敗，已保留上次載入的內容')}
                            actionLabel={t('重試')}
                            onRetry={() => loadDirectory({ refresh: true })}
                        />
                    ) : null
                }
                ListEmptyComponent={
                    loadError ? (
                        <HarborFullState
                            icon="alert-circle-outline"
                            title={t('探索內容載入失敗')}
                            description={t('請檢查網絡後再試。')}
                            actionLabel={t('重新載入')}
                            onAction={() => loadDirectory()}
                        />
                    ) : (
                        <HarborFullState
                            icon={isCategory ? 'folder-outline' : 'tag-outline'}
                            title={
                                isCategory
                                    ? t('暫時沒有可瀏覽的分類')
                                    : t('暫時沒有可瀏覽的標籤')
                            }
                        />
                    )
                }
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        tintColor={theme.themeColor}
                        colors={[theme.themeColor]}
                        onRefresh={() => {
                            trigger();
                            loadDirectory({ refresh: true });
                        }}
                    />
                }
            />
        </View>
    );
};

const HarborDirectoryPage = ({ type, navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const isCategory = type === 'category';

    useEffect(() => {
        navigation.setOptions({
            headerTitle: isCategory ? t('分類') : t('標籤'),
        });
    }, [isCategory, navigation, t]);

    const contentContainerStyle = useMemo(
        () => ({
            paddingTop: isLiquidGlassSupported
                ? headerHeight + verticalScale(10)
                : verticalScale(10),
            paddingBottom: verticalScale(36),
        }),
        [headerHeight],
    );

    return (
        <View style={[styles.page, { backgroundColor: theme.bg_color }]}>
            <HarborDirectoryPane
                type={type}
                navigation={navigation}
                contentContainerStyle={contentContainerStyle}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? { top: headerHeight } : undefined
                }
            />
        </View>
    );
};

export const HarborExplorePage = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const pagerRef = useRef(null);
    const blockPressUntilRef = useRef(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [mountedPages, setMountedPages] = useState({
        category: true,
        tag: false,
    });

    useEffect(() => {
        navigation.setOptions({ headerTitle: t('探索') });
    }, [navigation, t]);

    const options = useMemo(
        () => [
            { key: 'category', label: t('分類') },
            { key: 'tag', label: t('標籤') },
        ],
        [t],
    );
    const contentContainerStyle = useMemo(
        () => ({
            paddingTop: verticalScale(10),
            paddingBottom: verticalScale(36),
        }),
        [],
    );
    const headerTopPadding = isLiquidGlassSupported
        ? headerHeight + verticalScale(8)
        : verticalScale(8);

    const ensureMounted = useCallback(type => {
        setMountedPages(current =>
            current[type] ? current : { ...current, [type]: true },
        );
    }, []);

    const selectPage = useCallback(
        index => {
            const type = index === 0 ? 'category' : 'tag';
            ensureMounted(type);
            setCurrentIndex(index);
            pagerRef.current?.setPage(index);
        },
        [ensureMounted],
    );

    const handlePageSelected = useCallback(
        event => {
            const index = event.nativeEvent.position;
            ensureMounted(index === 0 ? 'category' : 'tag');
            setCurrentIndex(index);
        },
        [ensureMounted],
    );

    const handlePageScrollStateChanged = useCallback(event => {
        const pageScrollState = event.nativeEvent.pageScrollState;
        const guardDuration = pageScrollState === 'idle' ? 180 : 320;
        blockPressUntilRef.current = Date.now() + guardDuration;
    }, []);

    const isPressAllowed = useCallback(
        () => Date.now() >= blockPressUntilRef.current,
        [],
    );

    return (
        <View style={[styles.page, { backgroundColor: theme.bg_color }]}>
            <View
                style={[
                    styles.exploreHeader,
                    {
                        paddingTop: headerTopPadding,
                        backgroundColor: theme.bg_color,
                        borderBottomColor: theme.themeColorUltraLight,
                    },
                ]}>
                <SegmentControl
                    options={options}
                    selectedIndex={currentIndex}
                    onChange={selectPage}
                    trackBackgroundColor={theme.white}
                    style={styles.segment}
                />
            </View>
            <PagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={0}
                onPageSelected={handlePageSelected}
                onPageScrollStateChanged={handlePageScrollStateChanged}>
                <View key="category" style={styles.page} collapsable={false}>
                    {mountedPages.category ? (
                        <HarborDirectoryPane
                            type="category"
                            navigation={navigation}
                            contentContainerStyle={contentContainerStyle}
                            isPressAllowed={isPressAllowed}
                        />
                    ) : null}
                </View>
                <View key="tag" style={styles.page} collapsable={false}>
                    {mountedPages.tag ? (
                        <HarborDirectoryPane
                            type="tag"
                            navigation={navigation}
                            contentContainerStyle={contentContainerStyle}
                            isPressAllowed={isPressAllowed}
                        />
                    ) : null}
                </View>
            </PagerView>
        </View>
    );
};

export const HarborCategoryListPage = props => (
    <HarborDirectoryPage {...props} type="category" />
);

export const HarborTagListPage = props => (
    <HarborDirectoryPage {...props} type="tag" />
);

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    directoryRow: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(15),
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: scale(14),
        marginBottom: verticalScale(9),
        padding: scale(13),
    },
    hierarchyGuide: {
        alignSelf: 'stretch',
        position: 'relative',
    },
    hierarchyVertical: {
        position: 'absolute',
        top: -verticalScale(10),
        bottom: -verticalScale(10),
        width: StyleSheet.hairlineWidth,
    },
    hierarchyVerticalLast: {
        bottom: '50%',
    },
    hierarchyBranch: {
        position: 'absolute',
        top: '50%',
        width: scale(11),
        height: StyleSheet.hairlineWidth,
    },
    directoryIcon: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    subcategoryIcon: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(12),
    },
    directoryText: {
        flex: 1,
        minWidth: 0,
        marginHorizontal: scale(11),
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    directoryName: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(14),
        fontWeight: '700',
        marginRight: scale(5),
    },
    directoryDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: scale(15),
        marginTop: verticalScale(3),
    },
    directoryCount: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '600',
        marginTop: verticalScale(4),
    },
    categoryToggle: {
        alignItems: 'center',
        borderRadius: scale(9),
        height: scale(34),
        justifyContent: 'center',
        marginRight: scale(2),
        width: scale(34),
    },
    exploreHeader: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(14),
        paddingBottom: verticalScale(8),
    },
    segment: {
        alignSelf: 'center',
    },
    pager: {
        flex: 1,
    },
});
