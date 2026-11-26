import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import TextInput from '../../../../components/AppTextInput';
import searchFieldStyles, {
    SEARCH_FIELD_CLEAR_ICON_SIZE,
    SEARCH_FIELD_FONT_SIZE,
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
} from '../../../../components/searchFieldStyles';
import TouchableScale from '../../../../components/TouchableScale';
import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import PhosphorFeatureIcon from '../../info/home/search/components/PhosphorFeatureIcon';
import SearchFilterChip from './SearchFilterChip';

const TIME_OPTIONS = [
    { key: 'all', label: '不限時間' },
    { key: 'week', label: '最近一週' },
    { key: 'month', label: '最近一個月' },
    { key: 'year', label: '最近一年' },
];

const ORDER_OPTIONS = [
    { key: 'relevance', label: '相關度' },
    { key: 'latest', label: '最新發布' },
    { key: 'likes', label: '最多讚好' },
    { key: 'views', label: '最多瀏覽' },
];

/** 對齊 ClubSearchBar 的搜尋操作滑入時長 */
const SEARCH_ACTION_TIMING_MS = 220;

const HarborSearchPanel = forwardRef(
    (
        { criteria, options, results, actions, onOpenOption, onSearchFocusChange, onFiltersExpandedChange },
        ref,
    ) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const inputRef = useRef(null);
        const searchFocused = useSharedValue(0);
        const searchCancelWidth = useSharedValue(0);
        const [filtersExpanded, setFiltersExpanded] = useState(false);

        useEffect(() => {
            onFiltersExpandedChange?.(filtersExpanded);
        }, [filtersExpanded, onFiltersExpandedChange]);

        const {
            query,
            category,
            tag,
            author,
            timeRange,
            order,
            resultTab,
            activeFilterCount,
            canSearch,
        } = criteria;
        const { filterOptionsError } = options;
        const { isLoading } = results;
        const {
            handleQueryChange,
            setAuthor,
            setTimeRange,
            selectOrder,
            selectResultTab,
            runSearch,
            invalidateSearchResults,
            resetFilters,
        } = actions;
        const isTopicsTab = resultTab === 'topics';

        const searchInputOuterAnimated = useAnimatedStyle(() => ({
            marginRight: withTiming(
                searchFocused.value * searchCancelWidth.value,
                { duration: SEARCH_ACTION_TIMING_MS },
            ),
        }));

        const searchCancelAnimated = useAnimatedStyle(() => ({
            opacity: searchCancelWidth.value > 1 ? 1 : 0,
            transform: [
                {
                    translateX: withTiming(
                        (1 - searchFocused.value) * searchCancelWidth.value,
                        { duration: SEARCH_ACTION_TIMING_MS },
                    ),
                },
            ],
        }));

        const handleSearchFocus = useCallback(() => {
            searchFocused.value = 1;
            onSearchFocusChange?.(true);
        }, [onSearchFocusChange, searchFocused]);

        const collapseSearchFocus = useCallback(() => {
            inputRef.current?.blur();
            searchFocused.value = 0;
            onSearchFocusChange?.(false);
        }, [onSearchFocusChange, searchFocused]);

        const handleSearchBlur = useCallback(() => {
            searchFocused.value = 0;
            onSearchFocusChange?.(false);
        }, [onSearchFocusChange, searchFocused]);

        useImperativeHandle(
            ref,
            () => ({
                focusSearch: () => inputRef.current?.focus(),
                collapseSearchFocus,
                expandFilters: () => setFiltersExpanded(true),
            }),
            [collapseSearchFocus],
        );

        const handleClearSearchQuery = useCallback(() => {
            trigger();
            handleQueryChange('');
        }, [handleQueryChange]);

        const handleSearchAction = useCallback(() => {
            trigger();
            // 無關鍵字時若已填作者，仍允許搜尋該作者貼文
            if (!query.trim() && !author.trim()) {
                collapseSearchFocus();
                return;
            }
            runSearch();
        }, [author, collapseSearchFocus, query, runSearch]);

        const handleSelectResultTab = useCallback(
            nextTab => {
                trigger();
                collapseSearchFocus();
                if (nextTab === 'users') {
                    setFiltersExpanded(false);
                    selectResultTab('users');
                    return;
                }
                // 已在話題分頁：再點一次才展開／收合篩選；從用戶切過來時不展開
                if (isTopicsTab) {
                    setFiltersExpanded(current => !current);
                    return;
                }
                setFiltersExpanded(false);
                selectResultTab('topics');
            },
            [collapseSearchFocus, isTopicsTab, selectResultTab],
        );

        const handleToggleFilters = useCallback(() => {
            trigger();
            collapseSearchFocus();
            // 僅在話題分頁可展開篩選；從用戶分頁點篩選圖示只切回話題
            if (!isTopicsTab) {
                setFiltersExpanded(false);
                selectResultTab('topics');
                return;
            }
            setFiltersExpanded(current => !current);
        }, [collapseSearchFocus, isTopicsTab, selectResultTab]);

        return (
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
                                searchFieldStyles.field,
                                styles.searchInputContainer,
                                {
                                    // 對齊 ClubSearchBar／iOS UISearchBar 常見底色（ThemeContext 無對應語義 token）
                                    backgroundColor: theme.isLight
                                        ? '#E5E5EA'
                                        : '#3A3A3C',
                                },
                            ]}>
                            <PhosphorFeatureIcon
                                name="search"
                                size={SEARCH_FIELD_ICON_SIZE}
                                color={theme.black.third}
                                weight="regular"
                            />
                            <TextInput
                                ref={inputRef}
                                value={query}
                                onChangeText={handleQueryChange}
                                onFocus={handleSearchFocus}
                                onBlur={handleSearchBlur}
                                onSubmitEditing={handleSearchAction}
                                placeholder={t('關鍵字或 Discourse 搜尋語法')}
                                placeholderTextColor={theme.black.third}
                                returnKeyType="search"
                                autoCapitalize="none"
                                autoCorrect={false}
                                clearButtonMode="never"
                                maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                                selectionColor={theme.themeColor}
                                style={[
                                    searchFieldStyles.text,
                                    searchFieldStyles.input,
                                    { color: theme.black.main },
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
                                    style={searchFieldStyles.clearButton}>
                                    <PhosphorFeatureIcon
                                        name="x-circle"
                                        size={SEARCH_FIELD_CLEAR_ICON_SIZE}
                                        color={theme.black.third}
                                        weight="fill"
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
                                disabled: !canSearch || isLoading,
                            }}
                            disabled={!canSearch || isLoading}
                            hitSlop={scale(6)}
                            onPress={handleSearchAction}>
                            <Text
                                style={[
                                    styles.searchActionText,
                                    {
                                        color:
                                            !canSearch || isLoading
                                                ? theme.disabled
                                                : theme.themeColor,
                                    },
                                ]}>
                                {t('搜尋')}
                            </Text>
                        </TouchableScale>
                    </Animated.View>
                </View>

                {/* 第一層：話題｜用戶 */}
                <View style={styles.resultTabRow}>
                    <View style={styles.resultTab}>
                        <Pressable
                            accessibilityRole="tab"
                            accessibilityState={{ selected: isTopicsTab }}
                            onPress={() => handleSelectResultTab('topics')}
                            style={({ pressed }) => [
                                styles.resultTabLabel,
                                pressed && { opacity: 0.7 },
                            ]}>
                            <Text
                                style={[
                                    styles.resultTabText,
                                    {
                                        color: isTopicsTab
                                            ? theme.black.main
                                            : theme.black.third,
                                        fontWeight: isTopicsTab
                                            ? '700'
                                            : '500',
                                    },
                                ]}>
                                {t('話題')}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                                activeFilterCount > 0
                                    ? t('篩選（{{count}}）', {
                                        count: activeFilterCount,
                                    })
                                    : t('篩選')
                            }
                            accessibilityState={{ expanded: filtersExpanded }}
                            hitSlop={scale(8)}
                            onPress={handleToggleFilters}
                            style={({ pressed }) => [
                                styles.topicFilterButton,
                                pressed && { opacity: 0.6 },
                            ]}>
                            <PhosphorFeatureIcon
                                name="funnel"
                                size={scale(16)}
                                color={
                                    activeFilterCount > 0 || filtersExpanded
                                        ? theme.themeColor
                                        : theme.black.third
                                }
                                weight={activeFilterCount > 0 || filtersExpanded ? 'duotone' : 'regular'}
                            />
                            {activeFilterCount > 0 ? (
                                <View
                                    style={[
                                        styles.topicFilterBadge,
                                        { backgroundColor: theme.themeColor },
                                    ]}>
                                    <Text
                                        style={[
                                            styles.topicFilterBadgeText,
                                            { color: theme.white },
                                        ]}>
                                        {activeFilterCount}
                                    </Text>
                                </View>
                            ) : null}
                        </Pressable>
                        {isTopicsTab ? (
                            <View
                                style={[
                                    styles.resultTabUnderline,
                                    { backgroundColor: theme.themeColor },
                                ]}
                            />
                        ) : null}
                    </View>
                    <Pressable
                        accessibilityRole="tab"
                        accessibilityState={{ selected: !isTopicsTab }}
                        onPress={() => handleSelectResultTab('users')}
                        style={styles.resultTab}>
                        <Text
                            style={[
                                styles.resultTabText,
                                {
                                    color: !isTopicsTab
                                        ? theme.black.main
                                        : theme.black.third,
                                    fontWeight: !isTopicsTab ? '700' : '500',
                                },
                            ]}>
                            {t('用戶')}
                        </Text>
                        {!isTopicsTab ? (
                            <View
                                style={[
                                    styles.resultTabUnderline,
                                    { backgroundColor: theme.themeColor },
                                ]}
                            />
                        ) : null}
                    </Pressable>
                </View>

                {/* 第二層：排序（僅話題分頁） */}
                {isTopicsTab ? (
                    <View style={styles.orderRow}>
                        {ORDER_OPTIONS.map(option => (
                            <SearchFilterChip
                                key={option.key}
                                label={t(option.label)}
                                selected={order === option.key}
                                onPress={() => {
                                    collapseSearchFocus();
                                    selectOrder(option.key);
                                }}
                            />
                        ))}
                    </View>
                ) : null}

                {/* 展開篩選（僅話題分頁） */}
                {isTopicsTab && filtersExpanded ? (
                    <View style={styles.filters}>
                        <View style={styles.filterSection}>
                            <Text
                                style={[
                                    styles.filterLabel,
                                    { color: theme.black.second },
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
                                        onOpenOption('category');
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
                                        onOpenOption('tag');
                                    }}
                                />
                            </View>
                        </View>
                        <View style={styles.filterSection}>
                            <Text
                                style={[
                                    styles.filterLabel,
                                    { color: theme.black.second },
                                ]}>
                                {t('作者')}
                            </Text>
                            <View
                                style={[
                                    searchFieldStyles.field,
                                    styles.authorInputContainer,
                                    {
                                        backgroundColor:
                                            theme.tonal.primary08,
                                        borderColor:
                                            theme.themeColorUltraLight,
                                    },
                                ]}>
                                <Text
                                    maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                                    style={[
                                        styles.authorPrefix,
                                        { color: theme.black.third },
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
                                    maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                                    returnKeyType="search"
                                    onSubmitEditing={() => {
                                        trigger();
                                        runSearch();
                                    }}
                                    style={[
                                        searchFieldStyles.text,
                                        searchFieldStyles.input,
                                        { color: theme.black.main },
                                    ]}
                                />
                            </View>
                        </View>
                        <View style={styles.filterSection}>
                            <Text
                                style={[
                                    styles.filterLabel,
                                    { color: theme.black.second },
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
                        {filterOptionsError ? (
                            <Text
                                style={[
                                    styles.filterOptionError,
                                    { color: theme.unread },
                                ]}>
                                {t('部分分類或標籤暫時無法載入。')}
                            </Text>
                        ) : null}
                        {activeFilterCount > 0 ? (
                            <ScalePressable
                                accessibilityRole="button"
                                onPress={() => {
                                    trigger();
                                    collapseSearchFocus();
                                    resetFilters();
                                }}
                                style={styles.resetFiltersButton}>
                                <Text
                                    style={[
                                        styles.resetFiltersText,
                                        { color: theme.themeColor },
                                    ]}>
                                    {t('重設篩選')}
                                </Text>
                            </ScalePressable>
                        ) : null}
                    </View>
                ) : null}
            </View>
        );
    },
);

const styles = StyleSheet.create({
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
        marginLeft: scale(4),
        marginRight: scale(4),
    },
    searchLoading: {
        marginRight: scale(4),
    },
    searchActionWrap: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingLeft: scale(6),
        paddingRight: scale(2),
    },
    searchActionText: {
        ...uiStyle.defaultText,
        fontSize: verticalScale(14),
        textAlign: 'center',
    },
    resultTabRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(10),
        paddingHorizontal: scale(4),
    },
    resultTab: {
        position: 'relative',
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scale(18),
        paddingBottom: verticalScale(6),
    },
    resultTabLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resultTabText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
    },
    resultTabUnderline: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: scale(2),
        borderRadius: scale(1),
    },
    topicFilterButton: {
        marginLeft: scale(4),
        flexDirection: 'row',
        alignItems: 'center',
    },
    topicFilterBadge: {
        minWidth: scale(14),
        height: scale(14),
        borderRadius: scale(7),
        marginLeft: scale(2),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(3),
    },
    topicFilterBadgeText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '700',
        lineHeight: scale(12),
    },
    orderRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: verticalScale(8),
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
    authorInputContainer: {
        borderWidth: StyleSheet.hairlineWidth,
    },
    authorPrefix: {
        ...uiStyle.defaultText,
        fontSize: SEARCH_FIELD_FONT_SIZE,
        fontWeight: '700',
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
});

export default HarborSearchPanel;
