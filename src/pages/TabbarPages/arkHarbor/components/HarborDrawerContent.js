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
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { FlashList } from '@shopify/flash-list';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import {
    SafeAreaView,
    useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { openLink } from '../../../../utils/browser';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import { fetchHarborCategories } from '../../../../utils/harbor/harborApi';
import {
    buildHarborCategoryRows,
    getHarborCategoryKey,
} from '../../../../utils/harbor/harborCategories';
import { ARK_HARBOR } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import { HarborInlineRetry } from './HarborListStates';
import HarborCategoryIcon from './HarborCategoryIcon';

const DrawerMenuItem = ({
    icon,
    label,
    active = false,
    onPress,
}) => {
    const { theme } = useTheme();

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
                trigger();
                onPress?.();
            }}
            style={({ pressed }) => [
                styles.menuItem,
                {
                    backgroundColor: active
                        ? theme.tonal.primary15
                        : pressed
                            ? theme.tonal.primary08
                            : theme.bg_color,
                },
            ]}>
            <MaterialCommunityIcons
                name={icon}
                size={scale(20)}
                color={active ? theme.themeColor : theme.black.third}
            />
            <Text
                numberOfLines={1}
                style={[
                    styles.menuLabel,
                    {
                        color: active ? theme.black.main : theme.black.second,
                    },
                ]}>
                {label}
            </Text>
        </Pressable>
    );
};

// 與分類列同構，讓「所有分類」入口不突兀
const AllCategoriesRow = ({ onPress }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('所有分類')}
            onPress={() => {
                trigger();
                onPress?.();
            }}
            style={({ pressed }) => [
                styles.categoryRow,
                {
                    backgroundColor: pressed
                        ? theme.tonal.primary15
                        : theme.bg_color,
                },
            ]}>
            <View
                style={[
                    styles.categoryIcon,
                    { backgroundColor: theme.tonal.primary15 },
                ]}>
                <MaterialCommunityIcons
                    name="view-grid-outline"
                    size={scale(17)}
                    color={theme.themeColor}
                />
            </View>
            <Text
                numberOfLines={1}
                style={[
                    styles.categoryName,
                    styles.rootCategoryName,
                    { color: theme.black.main },
                ]}>
                {t('所有分類')}
            </Text>
            <MaterialCommunityIcons
                name="chevron-right"
                size={scale(17)}
                color={theme.black.third}
            />
        </Pressable>
    );
};

const CategoryRow = ({ item, onPress, onToggle }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const isSubcategory = item.depth > 0;

    return (
        <Pressable
            accessibilityRole="button"
            onPress={() => {
                trigger();
                onPress(item);
            }}
            style={({ pressed }) => [
                styles.categoryRow,
                isSubcategory && styles.subcategoryRow,
                {
                    backgroundColor: pressed
                        ? theme.tonal.primary15
                        : theme.bg_color,
                },
            ]}>
            <View
                style={[
                    styles.categoryIcon,
                    {
                        backgroundColor: isSubcategory
                            ? theme.tonal.secondary15
                            : theme.tonal.primary15,
                    },
                ]}>
                <HarborCategoryIcon
                    category={item}
                    color={
                        isSubcategory
                            ? theme.secondThemeColor
                            : theme.themeColor
                    }
                    fallbackIcon={
                        isSubcategory ? 'folder-outline' : 'folder'
                    }
                    size={scale(isSubcategory ? 15 : 17)}
                />
            </View>
            <Text
                numberOfLines={1}
                style={[
                    styles.categoryName,
                    isSubcategory
                        ? styles.subcategoryName
                        : styles.rootCategoryName,
                    {
                        color: isSubcategory
                            ? theme.black.second
                            : theme.black.main,
                    },
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
                        size={scale(18)}
                        color={theme.themeColor}
                    />
                </Pressable>
            ) : null}
            <MaterialCommunityIcons
                name="chevron-right"
                size={scale(17)}
                color={theme.black.third}
            />
        </Pressable>
    );
};

const DrawerSectionTitle = ({
    icon,
    title,
    expanded,
    onToggle,
    count,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const isCollapsible = typeof onToggle === 'function';
    const isExpanded = expanded !== false;

    const content = (
        <>
            <MaterialCommunityIcons
                name={
                    isCollapsible
                        ? isExpanded
                            ? 'chevron-down'
                            : 'chevron-right'
                        : icon
                }
                size={scale(17)}
                color={
                    isCollapsible && !isExpanded
                        ? theme.themeColor
                        : theme.black.third
                }
            />
            <Text
                style={[
                    styles.sectionTitleText,
                    {
                        color:
                            isCollapsible && !isExpanded
                                ? theme.themeColor
                                : theme.black.second,
                    },
                ]}>
                {title}
            </Text>
            {isCollapsible && !isExpanded && count != null ? (
                <View
                    style={[
                        styles.sectionCountBadge,
                        { backgroundColor: theme.tonal.primary30 },
                    ]}>
                    <Text
                        style={[
                            styles.sectionCountText,
                            { color: theme.themeColor },
                        ]}>
                        {count}
                    </Text>
                </View>
            ) : null}
            {isCollapsible && !isExpanded ? (
                <Text
                    style={[
                        styles.sectionExpandHint,
                        { color: theme.themeColor },
                    ]}>
                    {t('展開')}
                </Text>
            ) : null}
        </>
    );

    if (!isCollapsible) {
        return <View style={styles.sectionTitle}>{content}</View>;
    }

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: isExpanded }}
            accessibilityLabel={t(isExpanded ? '收起分類' : '展開分類')}
            onPress={() => {
                trigger();
                onToggle();
            }}
            style={({ pressed }) => [
                styles.sectionTitle,
                styles.sectionTitleButton,
                {
                    backgroundColor: !isExpanded
                        ? theme.tonal.primary15
                        : pressed
                            ? theme.tonal.primary08
                            : undefined,
                },
            ]}>
            {content}
        </Pressable>
    );
};

const HarborDrawerContent = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const insets = useSafeAreaInsets();
    // 抽屜在 Tab 內：底部需避開浮動 Tabbar，避免末項被遮擋
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;
    const controllerRef = useRef(null);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(
        () => new Set(),
    );
    // 抽屜「分類」整段預設展開；收起後標題列仍可點擊展開
    const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);

    const loadCategories = useCallback(async ({ refreshing = false } = {}) => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setLoadError(false);
        if (refreshing) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const response = await fetchHarborCategories({
                signal: controller.signal,
            });
            if (!controller.signal.aborted) {
                setCategories(response.items);
            }
        } catch {
            if (!controller.signal.aborted) {
                setLoadError(true);
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        loadCategories();
        return () => controllerRef.current?.abort();
    }, [loadCategories]);

    const categoryRows = useMemo(
        () => buildHarborCategoryRows(categories, collapsedCategoryIds),
        [categories, collapsedCategoryIds],
    );

    const navigateFromDrawer = useCallback(
        (routeName, params) => {
            // 不自動收起抽屜，由用戶自行關閉（關閉鈕 / 手勢）
            navigation.navigate(routeName, params);
        },
        [navigation],
    );

    // 切到底部「我的」Tab 時關閉抽屜，避免跨 Tab 後抽屜殘留
    const handleMyPress = useCallback(() => {
        logToFirebase('harbor_drawer_my', {});
        navigation.closeDrawer();
        navigation.navigate('MyTabbar');
    }, [navigation]);

    const handleCategoryPress = useCallback(
        category => {
            logToFirebase('harbor_drawer_category', {
                category_id: category.id,
                category_depth: category.depth,
            });
            navigateFromDrawer('HarborCategoryTopics', {
                categoryId: category.id,
                categorySlug: category.slug,
                categoryName: category.name,
            });
        },
        [navigateFromDrawer],
    );

    const handleToggleCategory = useCallback(category => {
        const categoryKey = getHarborCategoryKey(category);
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

    const renderCategory = useCallback(
        ({ item }) => (
            <CategoryRow
                item={item}
                onPress={handleCategoryPress}
                onToggle={handleToggleCategory}
            />
        ),
        [handleCategoryPress, handleToggleCategory],
    );

    const listHeader = useMemo(
        () => (
            <View>
                <View
                    style={[
                        styles.drawerHeader,
                        { borderBottomColor: theme.themeColorUltraLight },
                    ]}>
                    <Pressable
                        accessibilityRole="link"
                        accessibilityLabel={t('Harbor 職涯港')}
                        onPress={() => {
                            trigger();
                            logToFirebase('openPage', { page: 'harbor_web' });
                            openLink({ URL: ARK_HARBOR, mode: 'fullScreen' });
                        }}
                        style={({ pressed }) => [
                            styles.brandPressable,
                            pressed && { opacity: 0.7 },
                        ]}>
                        <View style={styles.brandIcon}>
                            <Image
                                source={require('../../../../static/img/logo.png')}
                                style={styles.brandLogo}
                            />
                        </View>
                        <View style={styles.drawerTitleArea}>
                            <Text
                                style={[
                                    styles.drawerTitle,
                                    { color: theme.black.main },
                                ]}>
                                {t('Harbor 職涯港')}
                            </Text>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.drawerSubtitle,
                                    { color: theme.black.third },
                                ]}>
                                {t('求職、提問、校友、應有盡有！')}
                            </Text>
                        </View>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('關閉選單')}
                        hitSlop={scale(8)}
                        onPress={() => {
                            trigger();
                            navigation.closeDrawer();
                        }}
                        style={({ pressed }) => [
                            styles.closeButton,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary30
                                    : theme.tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="close"
                            size={scale(19)}
                            color={theme.themeColor}
                        />
                    </Pressable>
                </View>

                <View style={styles.menuGroup}>
                    <DrawerMenuItem
                        icon="layers-triple-outline"
                        label={t('討論話題')}
                        active
                    />
                    <DrawerMenuItem
                        icon="account-outline"
                        label={t('個人中心')}
                        onPress={handleMyPress}
                    />
                    <DrawerMenuItem
                        icon="file-document-edit-outline"
                        label={t('草稿箱')}
                        onPress={() => navigateFromDrawer('HarborDrafts')}
                    />
                </View>

                <DrawerSectionTitle
                    title={t('分類')}
                    expanded={isCategoriesExpanded}
                    count={categories.length}
                    onToggle={() =>
                        setIsCategoriesExpanded(current => !current)
                    }
                />
                {isCategoriesExpanded ? (
                    <>
                        <AllCategoriesRow
                            onPress={() =>
                                navigateFromDrawer('HarborCategoryList')
                            }
                        />
                        {loadError ? (
                            <HarborInlineRetry
                                message={t('分類載入失敗')}
                                actionLabel={t('重新載入')}
                                onRetry={() => loadCategories()}
                            />
                        ) : null}
                    </>
                ) : null}
            </View>
        ),
        [
            categories.length,
            handleMyPress,
            isCategoriesExpanded,
            loadCategories,
            loadError,
            navigateFromDrawer,
            navigation,
            t,
            theme,
        ],
    );

    const listEmpty = useMemo(() => {
        if (isLoading) {
            return (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="small" color={theme.themeColor} />
                    <Text
                        style={[
                            styles.loadingText,
                            { color: theme.black.third },
                        ]}>
                        {t('正在載入分類…')}
                    </Text>
                </View>
            );
        }
        if (loadError) {
            return null;
        }
        return (
            <Text style={[styles.emptyText, { color: theme.black.third }]}>
                {t('暫時沒有可瀏覽的分類')}
            </Text>
        );
    }, [isLoading, loadError, t, theme]);

    const listFooter = useMemo(
        () => (
            <View style={styles.drawerFooter}>
                <DrawerSectionTitle icon="chevron-down" title={t('標籤')} />
                <DrawerMenuItem
                    icon="tag-multiple-outline"
                    label={t('熱門標籤')}
                    onPress={() => navigateFromDrawer('HarborTagList')}
                />
            </View>
        ),
        [navigateFromDrawer, t],
    );

    const listContentStyle = useMemo(
        () => ({
            paddingBottom: tabBarHeight + verticalScale(18),
        }),
        [tabBarHeight],
    );

    return (
        <SafeAreaView
            edges={['top']}
            style={[styles.page, { backgroundColor: theme.bg_color }]}>
            <FlashList
                data={isCategoriesExpanded ? categoryRows : []}
                keyExtractor={item =>
                    `harbor-drawer-category-${item.id ?? item.slug}`
                }
                renderItem={renderCategory}
                ListHeaderComponent={listHeader}
                ListEmptyComponent={
                    isCategoriesExpanded ? listEmpty : null
                }
                ListFooterComponent={listFooter}
                refreshing={isRefreshing}
                onRefresh={() => loadCategories({ refreshing: true })}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={listContentStyle}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    drawerHeader: {
        minHeight: verticalScale(58),
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(8),
    },
    brandPressable: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandIcon: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(13),
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandLogo: {
        width: scale(38),
        height: scale(38),
    },
    drawerTitleArea: {
        flex: 1,
        minWidth: 0,
        marginLeft: scale(9),
    },
    drawerTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(17),
        lineHeight: scale(21),
        fontWeight: '800',
    },
    drawerSubtitle: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(1),
    },
    closeButton: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: scale(8),
    },
    menuGroup: {
        paddingHorizontal: scale(8),
        paddingTop: verticalScale(8),
    },
    menuItem: {
        minHeight: verticalScale(43),
        borderRadius: scale(11),
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(2),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(7),
    },
    menuLabel: {
        ...uiStyle.defaultText,
        flex: 1,
        minWidth: 0,
        fontSize: scale(13),
        fontWeight: '600',
        marginLeft: scale(12),
    },
    sectionTitle: {
        minHeight: verticalScale(40),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(16),
        paddingTop: verticalScale(8),
    },
    sectionTitleButton: {
        marginHorizontal: scale(8),
        marginTop: verticalScale(4),
        paddingHorizontal: scale(8),
        paddingTop: verticalScale(6),
        paddingBottom: verticalScale(6),
        borderRadius: scale(11),
    },
    sectionTitleText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(12),
        fontWeight: '800',
        marginLeft: scale(8),
    },
    sectionCountBadge: {
        borderRadius: scale(8),
        marginLeft: scale(8),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(2),
    },
    sectionCountText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
    },
    sectionExpandHint: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
        marginLeft: 'auto',
        paddingLeft: scale(8),
    },
    categoryRow: {
        minHeight: verticalScale(43),
        borderRadius: scale(11),
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: scale(8),
        marginBottom: verticalScale(2),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(6),
    },
    subcategoryRow: {
        marginLeft: scale(30),
    },
    categoryIcon: {
        width: scale(31),
        height: scale(31),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    categoryName: {
        ...uiStyle.defaultText,
        flex: 1,
        minWidth: 0,
        fontSize: scale(12),
        marginLeft: scale(9),
    },
    rootCategoryName: {
        fontWeight: '700',
    },
    subcategoryName: {
        fontWeight: '500',
    },
    categoryToggle: {
        alignItems: 'center',
        borderRadius: scale(8),
        height: scale(30),
        justifyContent: 'center',
        marginRight: scale(1),
        width: scale(30),
    },
    loadingState: {
        minHeight: verticalScale(90),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(18),
    },
    loadingText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(8),
    },
    emptyText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        textAlign: 'center',
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(22),
    },
    drawerFooter: {
        paddingHorizontal: scale(8),
        paddingTop: verticalScale(6),
    },
});

export default HarborDrawerContent;
