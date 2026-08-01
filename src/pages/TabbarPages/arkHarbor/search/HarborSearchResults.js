import React, {
    useCallback,
    useMemo,
} from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {FlashList} from '@shopify/flash-list';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {filterHarborSearchItems} from '../../../../utils/harbor/harborSearch';
import {trigger} from '../../../../utils/trigger';
import {
    HarborFullState,
    HarborInlineRetry,
} from '../components/HarborListStates';
import HarborTopicCard from '../components/HarborTopicCard';
import HarborSearchResultCard from './HarborSearchResultCard';

/** 無輸入時疊加顯示的最近搜尋筆數 */
const HISTORY_PREVIEW_LIMIT = 3;

/** 將搜尋命中合併進 topic，供 HarborTopicCard 直接複用 */
const toTopicCardTopic = item => {
    if (!item?.topic) {
        return null;
    }
    return {
        ...item.topic,
        // 搜尋命中作者（貼文 username）優先；topic 摘要常缺 posters 會變成「Harbor 會員」
        author: item.author || item.topic.author,
        excerpt: item.excerpt || item.topic.excerpt,
        activityAt:
            item.createdAt ||
            item.topic.activityAt ||
            item.topic.lastPostedAt ||
            item.topic.createdAt,
    };
};

const HarborSearchResults = ({
    results,
    history,
    actions,
    resultTab,
    query = '',
    isSearchFocused = false,
    filtersExpanded = false,
    headerHeight,
    onCollapseSearch,
    onResultPress,
    onAuthorPress,
    onCategoryPress,
    onClearHistory,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const {
        items,
        hasSearched,
        isLoading,
        isLoadingMore,
        error,
        loadMoreError,
        isQueryDirty = false,
    } = results;
    const {items: historyRecords} = history;
    const {
        setQuery,
        runSearch,
        handleLoadMore,
        removeHistory,
    } = actions;
    const isUsersTab = resultTab === 'users';
    // 僅在無輸入、未展開篩選時顯示最近搜尋（聚焦或尚未搜尋）
    const showHistoryPreview =
        historyRecords.length > 0 &&
        !query.trim() &&
        !filtersExpanded &&
        (isSearchFocused || !hasSearched);
    const historyItems = useMemo(
        () =>
            historyRecords.slice(0, HISTORY_PREVIEW_LIMIT).map(record => ({
                id: `history-${record.query.toLowerCase()}`,
                kind: 'history',
                ...record,
            })),
        [historyRecords],
    );
    const filteredItems = useMemo(() => {
        const tabItems = isUsersTab
            ? items.filter(item => item.kind === 'user')
            : items.filter(item => item.kind !== 'user');
        // 輸入中：先對既有結果做本地篩選；防抖 API 回來後 isQueryDirty=false
        if (isQueryDirty) {
            return filterHarborSearchItems(tabItems, query);
        }
        return tabItems;
    }, [isQueryDirty, isUsersTab, items, query]);
    const showResultsCount =
        hasSearched && !error && filteredItems.length > 0;
    const listData = useMemo(() => {
        if (!hasSearched) {
            return historyItems;
        }
        if (!showHistoryPreview) {
            return filteredItems;
        }
        // 聚焦時：最近搜尋 → 結果標題 → 既有結果
        const nextItems = [...historyItems];
        if (showResultsCount) {
            nextItems.push({
                id: 'results-header',
                kind: 'resultsHeader',
                count: filteredItems.length,
            });
        }
        return nextItems.concat(filteredItems);
    }, [
        filteredItems,
        hasSearched,
        historyItems,
        showHistoryPreview,
        showResultsCount,
    ]);

    const renderItem = useCallback(
        ({item}) => {
            if (item.kind === 'history') {
                return (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                            trigger();
                            onCollapseSearch();
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
                                onCollapseSearch();
                                await removeHistory(item.query);
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

            if (item.kind === 'resultsHeader') {
                return (
                    <Text
                        style={[
                            styles.sectionTitle,
                            styles.resultsTitleAfterHistory,
                            {color: theme.black.second},
                        ]}>
                        {t('{{count}} 個搜尋結果', {count: item.count})}
                    </Text>
                );
            }

            if (item.kind === 'user') {
                return (
                    <HarborSearchResultCard
                        user={item.user}
                        onPress={onAuthorPress}
                    />
                );
            }

            const topic = toTopicCardTopic(item);
            if (!topic) {
                return null;
            }

            return (
                <HarborTopicCard
                    topic={topic}
                    onPress={() => onResultPress(item)}
                    onCategoryPress={onCategoryPress}
                />
            );
        },
        [
            onAuthorPress,
            onCategoryPress,
            onCollapseSearch,
            onResultPress,
            removeHistory,
            runSearch,
            setQuery,
            t,
            theme,
        ],
    );

    const renderListHeader = useCallback(() => {
        if (showHistoryPreview) {
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
                            onCollapseSearch();
                            onClearHistory();
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
        }
        if (!showResultsCount) {
            return null;
        }
        return (
            <Text
                style={[
                    styles.sectionTitle,
                    {color: theme.black.second},
                ]}>
                {t('{{count}} 個搜尋結果', {count: filteredItems.length})}
            </Text>
        );
    }, [
        filteredItems.length,
        onClearHistory,
        onCollapseSearch,
        showHistoryPreview,
        showResultsCount,
        t,
        theme,
    ]);

    const renderEmptyState = useCallback(() => {
        if (filteredItems.length > 0) {
            return null;
        }
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
        // 輸入中等待防抖：只留最近搜尋，不搶先顯示「無結果」
        if (isQueryDirty) {
            return null;
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
                    title={
                        isUsersTab
                            ? t('沒有找到使用者')
                            : t('沒有找到搜尋結果')
                    }
                    description={
                        isUsersTab
                            ? t('試試其他關鍵字。')
                            : t('試試其他關鍵字或調整搜尋篩選。')
                    }
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
    }, [
        error,
        filteredItems.length,
        hasSearched,
        isLoading,
        isQueryDirty,
        isUsersTab,
        runSearch,
        t,
        theme,
    ]);

    const renderFooter = useCallback(() => {
        // 用戶分頁僅首頁結果，不顯示載入更多
        if (isUsersTab) {
            return <View style={styles.footerSpacing} />;
        }
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
        isUsersTab,
        loadMoreError,
        t,
        theme.themeColor,
    ]);

    return (
        <FlashList
            data={listData}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderFooter}
            onEndReached={isUsersTab ? undefined : handleLoadMore}
            onEndReachedThreshold={0.35}
            onScrollBeginDrag={onCollapseSearch}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            contentInsetAdjustmentBehavior="never"
            scrollIndicatorInsets={
                isLiquidGlassSupported ? {top: headerHeight} : undefined
            }
        />
    );
};

const styles = StyleSheet.create({
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
    resultsTitleAfterHistory: {
        marginTop: verticalScale(12),
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
});

export default HarborSearchResults;
