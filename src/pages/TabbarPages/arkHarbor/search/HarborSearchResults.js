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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';
import {
    HarborFullState,
    HarborInlineRetry,
} from '../components/HarborListStates';
import HarborSearchResultCard from './HarborSearchResultCard';

const HarborSearchResults = ({
    results,
    history,
    actions,
    headerHeight,
    onCollapseSearch,
    onResultPress,
    onAuthorPress,
    onCategoryPress,
    onTagPress,
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
    } = results;
    const {items: historyRecords} = history;
    const {
        setQuery,
        runSearch,
        handleLoadMore,
        removeHistory,
    } = actions;
    const historyItems = useMemo(
        () =>
            historyRecords.map(record => ({
                id: `history-${record.query.toLowerCase()}`,
                kind: 'history',
                ...record,
            })),
        [historyRecords],
    );
    const listData = hasSearched ? items : historyItems;

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

            return (
                <HarborSearchResultCard
                    item={item}
                    onPress={onResultPress}
                    onAuthorPress={onAuthorPress}
                    onCategoryPress={onCategoryPress}
                    onTagPress={onTagPress}
                />
            );
        },
        [
            onAuthorPress,
            onCategoryPress,
            onCollapseSearch,
            onResultPress,
            onTagPress,
            removeHistory,
            runSearch,
            setQuery,
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
        if (historyRecords.length === 0) {
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
    }, [
        error,
        hasSearched,
        historyRecords.length,
        isLoading,
        items.length,
        onClearHistory,
        onCollapseSearch,
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
        <FlashList
            data={listData}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListHeaderComponent={renderListHeader}
            ListEmptyComponent={renderEmptyState}
            ListFooterComponent={renderFooter}
            onEndReached={handleLoadMore}
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
