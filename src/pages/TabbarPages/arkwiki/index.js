import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { FlashList } from '@shopify/flash-list';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHeaderHeight } from '@react-navigation/elements';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../../../components/AppText';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { openLink } from '../../../utils/browser';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { ARK_WIKI } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import { fetchRandomWikiTitle, fetchWikiRecentChanges } from '../../../utils/wikiApi';

const CURATED_CATEGORIES = [
    {
        key: 'campus',
        title: 'ARK 與校園',
        articles: [
            {title: 'ARK捐贈榜'},
            {title: '澳大大事'},
            {title: '常用口語黑話'},
            {title: 'ARK ALL', label: '關於 ARK ALL'},
            {title: '更換學分'},
            {title: '常用工具'},
            {title: '三院', label: '光明三院'},
            {title: 'ARK ALL開發踩坑指北', label: 'ARK ALL 開發踩坑指北'},
            {title: 'ICTO 資訊及通訊科技部', label: 'ICTO'},
            {title: '2FA 雙重認證'},
            {title: '澳門大學金融攻略'},
        ],
    },
    {
        key: 'organizations',
        title: '學生組織',
        articles: [
            {title: '學生組織'},
            {title: '電腦學會'},
            {title: 'IET 英國機械工程師學會澳門大學學生分部', label: 'IET'},
            {title: '攝影學會'},
        ],
    },
    {
        key: 'courses',
        title: '課程與學系',
        articles: [
            {title: 'CIS 計算機'},
            {title: 'ECEN1000 ECEN1011 Digital System', label: 'ECEN1000 Digital System'},
            {title: 'ACCT 會計'},
            {title: 'CISC1000'},
            {title: 'CS/SP點', label: 'CS/SP 點'},
            {title: 'ECE 電機及電腦工程系', label: 'ECE 電機'},
            {title: 'GELH2001 Sex and the Arts'},
        ],
    },
];

const RECENT_PREVIEW_LIMIT = 3;

const WikiHome = ({navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('wiki');
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;
    // 服務頁外層不再預留 Tab 高度；iOS 浮動 Tab 需列表自行留白
    const listBottomPad =
        Platform.OS === 'ios'
            ? tabBarHeight + verticalScale(10)
            : verticalScale(28);
    const [recentChanges, setRecentChanges] = useState([]);
    const [isLoadingRecent, setIsLoadingRecent] = useState(true);
    const [showAllRecent, setShowAllRecent] = useState(false);
    const [collapsedCategoryKeys, setCollapsedCategoryKeys] = useState(new Set());

    useEffect(() => {
        navigation.setOptions({headerTitle: 'ARK Wiki'});
        const controller = new AbortController();
        fetchWikiRecentChanges({signal: controller.signal})
            .then(setRecentChanges)
            .catch(error => {
                if (error?.name !== 'AbortError') {
                    setRecentChanges([]);
                }
            })
            .finally(() => setIsLoadingRecent(false));
        logToFirebase('openPage', {page: 'WikiHome'});
        return () => controller.abort();
    }, [navigation]);

    const items = useMemo(() => [
        {
            type: 'heading',
            section: 'recent',
            title: t('最近更新'),
            action: recentChanges.length > RECENT_PREVIEW_LIMIT
                ? showAllRecent ? t('收起') : t('查看全部')
                : null,
        },
        {
            type: 'recentList',
            articles: recentChanges.slice(
                0,
                showAllRecent ? recentChanges.length : RECENT_PREVIEW_LIMIT,
            ),
        },
        {type: 'heading', title: t('精選文章')},
        ...CURATED_CATEGORIES.map(category => ({...category, type: 'category'})),
    ], [recentChanges, showAllRecent, t]);
    const pageStyle = useMemo(() => [
        styles.page,
        {
            backgroundColor: theme.bg_color,
            paddingTop: isLiquidGlassSupported ? headerHeight : 0,
        },
    ], [headerHeight, theme.bg_color]);

    const openArticle = title => {
        trigger();
        navigation.navigate('WikiArticle', {title});
    };

    const formatRecentTimestamp = timestamp => {
        const updatedAt = moment(timestamp);
        const days = moment().diff(updatedAt, 'days');
        if (days < 1) {
            return t('今日更新');
        }
        if (days < 7) {
            return t('{{days}} 日前更新', {days});
        }
        return t('更新於 {{date}}', {date: updatedAt.format('YYYY-MM-DD')});
    };

    const toggleCategory = key => {
        trigger();
        setCollapsedCategoryKeys(currentKeys => {
            const nextKeys = new Set(currentKeys);
            if (nextKeys.has(key)) {
                nextKeys.delete(key);
            } else {
                nextKeys.add(key);
            }
            return nextKeys;
        });
    };

    const openRandomArticle = async () => {
        trigger();
        try {
            const title = await fetchRandomWikiTitle();
            if (!title) {
                throw new Error('Random article unavailable');
            }
            navigation.navigate('WikiArticle', {title});
        } catch (_error) {
            Alert.alert(t('暫時無法取得隨機條目'), t('請稍後再試'));
        }
    };

    const renderItem = ({item}) => {
        if (item.type === 'category') {
            const isCollapsed = collapsedCategoryKeys.has(item.key);
            return (
                <View
                    style={[
                        styles.category,
                        {backgroundColor: theme.white, borderColor: theme.disabled},
                    ]}>
                    <Pressable
                        accessibilityState={{expanded: !isCollapsed}}
                        onPress={() => toggleCategory(item.key)}
                        style={({pressed}) => [
                            styles.categoryHeader,
                            pressed && {backgroundColor: theme.tonal.primary15},
                        ]}>
                        <View style={styles.categoryTitleRow}>
                            <Text style={[styles.categoryTitle, {color: theme.black.main}]}>
                                {t(item.title)}
                            </Text>
                            <Text style={[styles.categoryCount, {color: theme.black.third}]}>
                                {item.articles.length}
                            </Text>
                        </View>
                        <MaterialCommunityIcons
                            name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                            size={scale(20)}
                            color={theme.black.third}
                        />
                    </Pressable>
                    {!isCollapsed ? (
                        <View style={styles.articleChips}>
                            {item.articles.map(article => (
                                <Pressable
                                    key={article.title}
                                    onPress={() => openArticle(article.title)}
                                    style={({pressed}) => [
                                        styles.articleChip,
                                        {
                                            backgroundColor: pressed
                                                ? theme.tonal.primary30
                                                : theme.tonal.primary08,
                                            borderColor: theme.disabled,
                                        },
                                    ]}>
                                    <MaterialCommunityIcons
                                        name="book-open-page-variant-outline"
                                        size={scale(15)}
                                        color={theme.themeColor}
                                    />
                                    <Text style={[styles.articleChipText, {color: theme.black.main}]}>
                                        {article.label || article.title}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    ) : null}
                </View>
            );
        }
        if (item.type === 'heading') {
            return (
                <View style={styles.headingRow}>
                    <Text style={[styles.heading, {color: theme.black.main}]}>{item.title}</Text>
                    {item.section === 'recent' && isLoadingRecent ? (
                        <ActivityIndicator size="small" color={theme.themeColor} />
                    ) : item.action ? (
                        <Pressable
                            accessibilityRole="button"
                            hitSlop={scale(8)}
                            onPress={() => {
                                trigger();
                                setShowAllRecent(currentValue => !currentValue);
                            }}>
                            <Text style={[styles.headingAction, {color: theme.themeColor}]}>
                                {item.action}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>
            );
        }
        if (item.type === 'recentList') {
            if (!item.articles.length) {
                return null;
            }
            return (
                <View style={styles.recentList}>
                    {item.articles.map((article, index) => (
                        <Pressable
                            key={`${article.title}-${article.timestamp || index}`}
                            onPress={() => openArticle(article.title)}
                            style={({pressed}) => [
                                styles.recentRow,
                                index < item.articles.length - 1 && {
                                    borderBottomWidth: StyleSheet.hairlineWidth,
                                    borderBottomColor: theme.disabled,
                                },
                                pressed && {backgroundColor: theme.tonal.primary15},
                            ]}>
                            <MaterialCommunityIcons
                                name="history"
                                size={scale(18)}
                                color={theme.themeColor}
                            />
                            <View style={styles.articleText}>
                                <Text style={[styles.articleTitle, {color: theme.black.main}]}>
                                    {article.label || article.title}
                                </Text>
                                {article.timestamp ? (
                                    <Text style={[styles.articleMeta, {color: theme.black.third}]}>
                                        {formatRecentTimestamp(article.timestamp)}
                                    </Text>
                                ) : null}
                            </View>
                            <MaterialCommunityIcons
                                name="chevron-right"
                                size={scale(20)}
                                color={theme.black.third}
                            />
                        </Pressable>
                    ))}
                </View>
            );
        }
        return null;
    };

    const listHeader = (
        <View>
            <Text style={[styles.intro, {color: theme.black.second}]}>
                {t('探索澳大資訊、攻略與學習經驗')}
            </Text>
            <Pressable
                onPress={() => {
                    trigger();
                    navigation.navigate('WikiSearch');
                }}
                style={({pressed}) => [
                    styles.searchButton,
                    {backgroundColor: pressed ? theme.tonal.primary30 : theme.white, borderColor: theme.disabled},
                ]}>
                <MaterialCommunityIcons name="magnify" size={scale(22)} color={theme.black.third} />
                <Text style={[styles.searchText, {color: theme.black.third}]}>{t('搜尋 ARK Wiki')}</Text>
            </Pressable>
            <View style={styles.quickActions}>
                <Pressable
                    onPress={openRandomArticle}
                    style={({pressed}) => [styles.quickButton, {backgroundColor: pressed ? theme.tonal.primary50 : theme.tonal.primary30}]}>
                    <MaterialCommunityIcons name="shuffle-variant" size={scale(20)} color={theme.themeColor} />
                    <Text style={[styles.quickText, {color: theme.themeColor}]}>{t('隨機條目')}</Text>
                </Pressable>
                <Pressable
                    onPress={() => {
                        trigger();
                        openLink(ARK_WIKI);
                    }}
                    style={({pressed}) => [styles.quickButton, {backgroundColor: pressed ? theme.tonal.secondary50 : theme.tonal.secondary30}]}>
                    <MaterialCommunityIcons name="pencil-outline" size={scale(20)} color={theme.secondThemeColor} />
                    <Text style={[styles.quickText, {color: theme.secondThemeColor}]}>{t('前往 Wiki 貢獻')}</Text>
                </Pressable>
            </View>
        </View>
    );

    return (
        <View style={pageStyle}>
            <FlashList
                data={items}
                extraData={collapsedCategoryKeys}
                renderItem={renderItem}
                keyExtractor={(item, index) =>
                    item.type === 'recentList'
                        ? `recentList-${item.articles.length}-${showAllRecent}`
                        : `${item.type}-${item.key || item.title}-${index}`
                }
                ListHeaderComponent={listHeader}
                contentContainerStyle={[styles.content, {paddingBottom: listBottomPad}]}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    content: {
        paddingHorizontal: scale(14),
        paddingBottom: verticalScale(28),
    },
    intro: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        lineHeight: scale(21),
        marginTop: verticalScale(12),
        marginBottom: verticalScale(10),
    },
    searchButton: {
        height: verticalScale(46),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(15),
        paddingHorizontal: scale(14),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(9),
    },
    searchText: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
    },
    quickActions: {
        flexDirection: 'row',
        gap: scale(9),
        marginTop: verticalScale(10),
    },
    quickButton: {
        flex: 1,
        minHeight: verticalScale(42),
        borderRadius: scale(14),
        paddingHorizontal: scale(10),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
    },
    quickText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
    },
    headingRow: {
        marginTop: verticalScale(17),
        marginBottom: verticalScale(8),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heading: {
        ...uiStyle.defaultText,
        fontSize: scale(17),
        fontWeight: '700',
    },
    headingAction: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
    },
    category: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(13),
        marginBottom: verticalScale(9),
        overflow: 'hidden',
    },
    categoryHeader: {
        minHeight: verticalScale(42),
        paddingHorizontal: scale(12),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(7),
    },
    categoryTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '700',
    },
    categoryCount: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
    },
    articleChips: {
        paddingHorizontal: scale(10),
        paddingBottom: verticalScale(10),
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(7),
    },
    articleChip: {
        maxWidth: '100%',
        minHeight: verticalScale(31),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(10),
        paddingHorizontal: scale(9),
        paddingVertical: verticalScale(6),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
    },
    articleChipText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(12),
        fontWeight: '600',
    },
    recentList: {
        marginBottom: verticalScale(2),
    },
    recentRow: {
        minHeight: verticalScale(44),
        paddingVertical: verticalScale(8),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },
    articleText: {
        flex: 1,
    },
    articleTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '600',
    },
    articleMeta: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(1),
    },
});

export default WikiHome;
