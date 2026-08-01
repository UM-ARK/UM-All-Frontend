import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Alert,
    StyleSheet,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import {useTranslation} from 'react-i18next';

import {useTheme} from '../../../components/ThemeContext';
import {logToFirebase} from '../../../utils/firebaseAnalytics';
import {trigger} from '../../../utils/trigger';
import HarborSearchPanel from './search/HarborSearchPanel';
import HarborSearchResults from './search/HarborSearchResults';
import SearchOptionModal from './search/SearchOptionModal';
import useHarborSearch from './search/useHarborSearch';

const HarborSearchPage = ({route, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const headerHeight = useHeaderHeight();
    const searchPanelRef = useRef(null);
    const initialSearchStartedRef = useRef(false);
    const [optionModal, setOptionModal] = useState(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    useEffect(() => {
        navigation.setOptions({headerTitle: t('Harbor 搜尋')});
        logToFirebase('openPage', {page: 'HarborNativeSearch'});
    }, [navigation, t]);

    const collapseSearchFocus = useCallback(() => {
        searchPanelRef.current?.collapseSearchFocus();
    }, []);

    const search = useHarborSearch({
        initialQuery: route.params?.query,
        onSearchStart: collapseSearchFocus,
    });
    const {criteria, options, results, history, actions} = search;
    const {category, tag, resultTab} = criteria;
    const {categories, tags} = options;
    const {
        setCategory,
        setTag,
        selectResultTab,
        runSearch,
        invalidateSearchResults,
        clearHistory,
        cancelSearch,
    } = actions;

    useEffect(() => {
        const transitionSubscription = navigation.addListener(
            'transitionEnd',
            event => {
                if (event.data?.closing) {
                    return;
                }
                searchPanelRef.current?.focusSearch();
            },
        );
        return () => {
            transitionSubscription();
            cancelSearch();
        };
    }, [cancelSearch, navigation]);

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
            // 切回話題分頁，清空關鍵字並以作者篩選列出貼文
            selectResultTab('topics');
            searchPanelRef.current?.expandFilters();
            runSearch({
                queryOverride: '',
                authorOverride: username,
            });
        },
        [runSearch, selectResultTab],
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
                    await clearHistory();
                },
            },
        ]);
    }, [clearHistory, t]);

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

    return (
        <View style={pageStyle}>
            <HarborSearchPanel
                ref={searchPanelRef}
                criteria={criteria}
                options={options}
                results={results}
                actions={actions}
                onOpenOption={setOptionModal}
                onSearchFocusChange={setIsSearchFocused}
                onFiltersExpandedChange={setFiltersExpanded}
            />
            <HarborSearchResults
                results={results}
                history={history}
                actions={actions}
                resultTab={resultTab}
                query={criteria.query}
                isSearchFocused={isSearchFocused}
                filtersExpanded={filtersExpanded}
                headerHeight={headerHeight}
                onCollapseSearch={collapseSearchFocus}
                onResultPress={handleResultPress}
                onAuthorPress={handleAuthorPress}
                onCategoryPress={handleCategoryPress}
                onClearHistory={handleClearHistory}
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
});

export default HarborSearchPage;
