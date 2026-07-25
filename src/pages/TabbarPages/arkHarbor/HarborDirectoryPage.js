import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { uiStyle, useTheme } from '../../../components/ThemeContext';
import {
    fetchHarborCategories,
    fetchHarborTags,
} from '../../../utils/harbor/harborApi';
import { trigger } from '../../../utils/trigger';
import {
    HarborFullState,
    HarborInlineRetry,
    HarborTopicSkeleton,
} from './components/HarborListStates';

const SKELETON_ITEMS = ['one', 'two', 'three', 'four'];

const flattenCategories = categories => {
    const categoriesByParent = new Map();
    const knownIds = new Set(categories.map(category => category.id));
    categories.forEach(category => {
        const parentId = category.parentCategoryId || null;
        const current = categoriesByParent.get(parentId) || [];
        current.push(category);
        categoriesByParent.set(parentId, current);
    });

    const rows = [];
    const visited = new Set();
    const appendCategory = (category, depth) => {
        if (visited.has(category.id)) {
            return;
        }
        visited.add(category.id);
        rows.push({ ...category, depth });
        (categoriesByParent.get(category.id) || []).forEach(child => {
            appendCategory(child, depth + 1);
        });
    };

    categories
        .filter(
            category =>
                !category.parentCategoryId ||
                !knownIds.has(category.parentCategoryId),
        )
        .forEach(category => appendCategory(category, 0));
    categories.forEach(category => appendCategory(category, 0));
    return rows;
};

const CategoryRow = ({ item, onPress }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');

    return (
        <Pressable
            accessibilityRole="button"
            onPress={() => {
                trigger();
                onPress(item);
            }}
            style={({ pressed }) => [
                styles.directoryRow,
                item.depth > 0 && styles.subcategoryRow,
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
                    {
                        backgroundColor:
                            item.depth > 0
                                ? theme.tonal.secondary15
                                : theme.tonal.primary15,
                    },
                ]}>
                <MaterialCommunityIcons
                    name={
                        item.depth > 0
                            ? 'folder-outline'
                            : 'folder-multiple-outline'
                    }
                    size={scale(21)}
                    color={
                        item.depth > 0
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
                    style={[styles.directoryCount, { color: theme.themeColor }]}>
                    {t('{{topics}} 個話題 · {{posts}} 篇貼文', {
                        topics: item.topicCount || 0,
                        posts: item.postCount || 0,
                    })}
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

const TagRow = ({ item, onPress }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');

    return (
        <Pressable
            accessibilityRole="button"
            onPress={() => {
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
                    style={[styles.directoryCount, { color: theme.themeColor }]}>
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

const HarborDirectoryPage = ({ type, navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const controllerRef = useRef(null);
    const requestGenerationRef = useRef(0);
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(null);
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
                        ? flattenCategories(result.items)
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
        navigation.setOptions({
            headerTitle: isCategory ? t('分類') : t('標籤'),
        });
        loadDirectory();
        return () => {
            requestGenerationRef.current += 1;
            controllerRef.current?.abort();
        };
    }, [isCategory, loadDirectory, navigation, t]);

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

    const renderItem = useCallback(
        ({ item }) =>
            isCategory ? (
                <CategoryRow item={item} onPress={handlePress} />
            ) : (
                <TagRow item={item} onPress={handlePress} />
            ),
        [handlePress, isCategory],
    );

    const topPadding = isLiquidGlassSupported
        ? headerHeight + verticalScale(10)
        : verticalScale(10);
    const listContentStyle = useMemo(
        () => ({
            paddingTop: topPadding,
            paddingBottom: verticalScale(36),
        }),
        [topPadding],
    );

    if (isLoading && items.length === 0) {
        return (
            <View style={[styles.page, { backgroundColor: theme.bg_color }]}>
                <FlashList
                    data={SKELETON_ITEMS}
                    keyExtractor={item => `harbor-directory-skeleton-${item}`}
                    renderItem={() => <HarborTopicSkeleton />}
                    contentContainerStyle={listContentStyle}
                    contentInsetAdjustmentBehavior={
                        isLiquidGlassSupported ? 'never' : 'automatic'
                    }
                    scrollIndicatorInsets={
                        isLiquidGlassSupported ? { top: headerHeight } : undefined
                    }
                />
            </View>
        );
    }

    return (
        <View style={[styles.page, { backgroundColor: theme.bg_color }]}>
            <FlashList
                data={items}
                keyExtractor={item =>
                    `harbor-${isCategory ? 'category' : 'tag'}-${item.id || item.slug}`
                }
                renderItem={renderItem}
                contentContainerStyle={listContentStyle}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? { top: headerHeight } : undefined
                }
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
    subcategoryRow: {
        marginLeft: scale(34),
    },
    directoryIcon: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(14),
        alignItems: 'center',
        justifyContent: 'center',
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
});
