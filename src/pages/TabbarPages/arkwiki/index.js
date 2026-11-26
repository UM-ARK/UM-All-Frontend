import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

import Ionicons from '@react-native-vector-icons/ionicons';
import { FlashList } from '@shopify/flash-list';
import { isLiquidGlassSupported } from '../../../utils/glassEffect';
import { useHeaderHeight } from '@react-navigation/elements';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import moment from 'moment';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
import TopScrollEdgeBackdrop, {
    SCROLL_EDGE_FADE_HEIGHT,
} from '../../../components/TopScrollEdgeBackdrop';
import { useFeaturesChrome } from '../features/FeaturesChromeContext';
import PhosphorFeatureIcon from '../info/home/search/components/PhosphorFeatureIcon';
import searchFieldStyles, {
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
} from '../../../components/searchFieldStyles';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { openLink } from '../../../utils/browser';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { ARK_WIKI } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import { fetchRandomWikiTitle, fetchWikiRecentChanges } from '../../../utils/wikiApi';
import { WIDE_CONTENT_MAX_WIDTH } from '../../../utils/windowSizeClass';

const CURATED_CATEGORIES = [
    {
        key: 'campus',
        title: 'ARK 與校園',
        articles: [
            {title: 'ARK捐贈榜', icon: 'hand-heart', tone: 'pink'},
            {title: '澳大大事', icon: 'sparkles', tone: 'orange'},
            {title: '常用口語黑話', icon: 'messages-square', tone: 'orange'},
            {title: 'ARK ALL', label: '關於 ARK ALL', icon: 'compass', tone: 'blue'},
            {title: '更換學分', icon: 'arrow-left-right', tone: 'blue'},
            {title: '常用工具', icon: 'wrench', tone: 'blue'},
            {title: '三院', label: '光明三院', icon: 'building', tone: 'green'},
            {title: 'ARK ALL開發踩坑指北', label: 'ARK ALL 開發踩坑指北', icon: 'code', tone: 'blue'},
            {title: 'ICTO 資訊及通訊科技部', label: 'ICTO', icon: 'desktop', tone: 'blue'},
            {title: '2FA 雙重認證', icon: 'shield', tone: 'pink'},
            {title: '澳門大學金融攻略', icon: 'landmark', tone: 'orange'},
        ],
    },
    {
        key: 'organizations',
        title: '學生組織',
        articles: [
            {title: '學生組織', icon: 'users', tone: 'orange'},
            {title: '電腦學會', icon: 'desktop', tone: 'blue'},
            {title: 'IET 英國機械工程師學會澳門大學學生分部', label: 'IET', icon: 'gear', tone: 'green'},
            {title: '攝影學會', icon: 'camera', tone: 'orange'},
        ],
    },
    {
        key: 'courses',
        title: '課程與學系',
        articles: [
            {title: 'CIS 計算機', icon: 'code', tone: 'blue'},
            {title: 'ECEN1000 ECEN1011 Digital System', label: 'ECEN1000 Digital System', icon: 'cpu', tone: 'green'},
            {title: 'ACCT 會計', icon: 'calculator', tone: 'orange'},
            {title: 'CISC1000', icon: 'desktop', tone: 'blue'},
            {title: 'CS/SP點', label: 'CS/SP 點', icon: 'graduation-cap', tone: 'blue'},
            {title: 'ECE 電機及電腦工程系', label: 'ECE 電機', icon: 'gear', tone: 'green'},
            {title: 'GELH2001 Sex and the Arts', icon: 'book-open', tone: 'pink'},
        ],
    },
];

const RECENT_PREVIEW_LIMIT = 3;

const WikiHome = ({navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('wiki');
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const { topChromeHeight } = useFeaturesChrome();
    const hasFloatingChrome = topChromeHeight > 0;
    const scrollY = useRef(new Animated.Value(0)).current;
    const handleTopScroll = useCallback(event => {
        scrollY.setValue(event.nativeEvent.contentOffset.y);
    }, [scrollY]);
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

    const items = useMemo(() => {
        const nextItems = [];
        if (isLoadingRecent || recentChanges.length > 0) {
            nextItems.push({
                type: 'recentCard',
                title: t('最近更新'),
                action: recentChanges.length > RECENT_PREVIEW_LIMIT
                    ? showAllRecent ? t('收起') : t('查看全部')
                    : null,
                articles: recentChanges.slice(
                    0,
                    showAllRecent ? recentChanges.length : RECENT_PREVIEW_LIMIT,
                ),
            });
        }
        nextItems.push({type: 'heading', title: t('精選文章')});
        CURATED_CATEGORIES.forEach(category => {
            nextItems.push({...category, type: 'category'});
        });
        return nextItems;
    }, [isLoadingRecent, recentChanges, showAllRecent, t]);
    const { featuresScreen, featureIconTones } = theme;
    const pageStyle = useMemo(() => [
        styles.page,
        {
            backgroundColor: featuresScreen.bg_color,
            paddingTop: !hasFloatingChrome && isLiquidGlassSupported ? headerHeight : 0,
        },
    ], [featuresScreen.bg_color, hasFloatingChrome, headerHeight]);

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
                        {backgroundColor: featuresScreen.cardBg},
                    ]}>
                    <ScalePressable
                        accessibilityState={{expanded: !isCollapsed}}
                        onPress={() => toggleCategory(item.key)}
                        style={styles.categoryHeader}>
                        <View style={styles.categoryTitleRow}>
                            <Text style={[styles.categoryTitle, {color: theme.black.main}]}>
                                {t(item.title)}
                            </Text>
                            <Text style={[styles.categoryCount, {color: theme.black.third}]}>
                                {item.articles.length}
                            </Text>
                        </View>
                        <PhosphorFeatureIcon
                            name={isCollapsed ? 'caret-down' : 'caret-up'}
                            size={scale(16)}
                            color={theme.black.third}
                            weight="regular"
                        />
                    </ScalePressable>
                    {!isCollapsed ? (
                        <View style={styles.articleChips}>
                            {item.articles.map(article => {
                                const chipTone = featureIconTones[article.tone] || featureIconTones.blue;
                                return (
                                    <ScalePressable
                                        key={article.title}
                                        onPress={() => openArticle(article.title)}
                                        style={[
                                            styles.articleChip,
                                            {backgroundColor: featuresScreen.bg_color},
                                        ]}>
                                        <PhosphorFeatureIcon
                                            name={article.icon || 'book-open'}
                                            size={scale(15)}
                                            color={chipTone.foreground}
                                        />
                                        <Text style={[styles.articleChipText, {color: theme.black.main}]}>
                                            {article.label || article.title}
                                        </Text>
                                    </ScalePressable>
                                );
                            })}
                        </View>
                    ) : null}
                </View>
            );
        }
        if (item.type === 'heading') {
            return (
                <View style={styles.headingRow}>
                    <Text style={[styles.heading, {color: theme.black.third}]}>{item.title}</Text>
                </View>
            );
        }
        if (item.type === 'recentCard') {
            return (
                <View style={[styles.recentCard, {backgroundColor: featuresScreen.cardBg}]}>
                    <View style={styles.recentCardHeader}>
                        <Text style={[styles.recentCardTitle, {color: theme.black.third}]}>
                            {item.title}
                        </Text>
                        {isLoadingRecent ? (
                            <ActivityIndicator size="small" color={theme.themeColor} />
                        ) : item.action ? (
                            <ScalePressable
                                accessibilityRole="button"
                                hitSlop={scale(8)}
                                onPress={() => {
                                    trigger();
                                    setShowAllRecent(currentValue => !currentValue);
                                }}>
                                <Text style={[styles.headingAction, {color: theme.themeColor}]}>
                                    {item.action}
                                </Text>
                            </ScalePressable>
                        ) : null}
                    </View>
                    {item.articles.map((article, index) => (
                        <ScalePressable
                            key={`${article.title}-${article.timestamp || index}`}
                            onPress={() => openArticle(article.title)}
                            style={[
                                styles.recentRow,
                                index < item.articles.length - 1 && {
                                    borderBottomWidth: StyleSheet.hairlineWidth,
                                    borderBottomColor: featuresScreen.divider,
                                },
                            ]}>
                            <View
                                style={[
                                    styles.recentIconBadge,
                                    {backgroundColor: featureIconTones.blue.background},
                                ]}>
                                <PhosphorFeatureIcon
                                    name="clock-counter-clockwise"
                                    size={scale(16)}
                                    color={featureIconTones.blue.foreground}
                                />
                            </View>
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
                            <PhosphorFeatureIcon
                                name="caret-right"
                                size={scale(15)}
                                color={theme.black.third}
                                weight="regular"
                            />
                        </ScalePressable>
                    ))}
                </View>
            );
        }
        return null;
    };

    const listHeader = (
        <View style={styles.headerContainer}>
            <ScalePressable
                accessibilityRole="button"
                onPress={() => {
                    trigger();
                    navigation.navigate('WikiSearch');
                }}
                style={[
                    searchFieldStyles.field,
                    searchFieldStyles.borderedField,
                    {backgroundColor: featuresScreen.searchBg, borderColor: featuresScreen.searchBg},
                ]}>
                <Ionicons name="search" size={SEARCH_FIELD_ICON_SIZE} color={theme.black.third} />
                <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                    style={[searchFieldStyles.text, {color: theme.black.third}]}>
                    {t('搜尋 ARK Wiki')}
                </Text>
            </ScalePressable>
            <View style={styles.quickActions}>
                <ScalePressable
                    onPress={openRandomArticle}
                    style={[styles.quickButton, {backgroundColor: featuresScreen.cardBg}]}>
                    <View
                        style={[
                            styles.quickIconBadge,
                            {backgroundColor: featureIconTones.blue.background},
                        ]}>
                        <PhosphorFeatureIcon
                            name="shuffle"
                            size={scale(17)}
                            color={featureIconTones.blue.foreground}
                        />
                    </View>
                    <Text numberOfLines={1} style={[styles.quickText, {color: theme.black.main}]}>
                        {t('隨機條目')}
                    </Text>
                </ScalePressable>
                <ScalePressable
                    onPress={() => {
                        trigger();
                        openLink(ARK_WIKI);
                    }}
                    style={[styles.quickButton, {backgroundColor: featuresScreen.cardBg}]}>
                    <View
                        style={[
                            styles.quickIconBadge,
                            {backgroundColor: featureIconTones.orange.background},
                        ]}>
                        <PhosphorFeatureIcon
                            name="note"
                            size={scale(17)}
                            color={featureIconTones.orange.foreground}
                        />
                    </View>
                    <Text numberOfLines={1} style={[styles.quickText, {color: theme.black.main}]}>
                        {t('前往 Wiki 貢獻')}
                    </Text>
                </ScalePressable>
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
                    item.type === 'recentCard'
                        ? `recentCard-${item.articles.length}-${showAllRecent}`
                        : `${item.type}-${item.key || item.title}-${index}`
                }
                ListHeaderComponent={listHeader}
                scrollIndicatorInsets={
                    hasFloatingChrome
                        ? { top: topChromeHeight, bottom: listBottomPad }
                        : undefined
                }
                scrollEventThrottle={16}
                onScroll={hasFloatingChrome ? handleTopScroll : undefined}
                contentContainerStyle={[
                    styles.content,
                    { paddingTop: topChromeHeight, paddingBottom: listBottomPad },
                ]}
            />
            {hasFloatingChrome ? (
                <TopScrollEdgeBackdrop
                    headerHeight={topChromeHeight}
                    fadeHeight={SCROLL_EDGE_FADE_HEIGHT}
                    scrollY={scrollY}
                    zIndex={2}
                />
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    content: {
        width: '100%',
        maxWidth: WIDE_CONTENT_MAX_WIDTH,
        alignSelf: 'center',
        paddingHorizontal: scale(12),
        paddingBottom: verticalScale(28),
    },
    headerContainer: {
        marginTop: verticalScale(10),
    },
    quickActions: {
        flexDirection: 'row',
        gap: scale(10),
        marginTop: verticalScale(10),
        marginBottom: verticalScale(10),
    },
    quickButton: {
        flex: 1,
        minHeight: verticalScale(46),
        borderRadius: scale(14),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(9),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
    },
    quickIconBadge: {
        width: scale(32),
        height: scale(32),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    quickText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(13),
        fontWeight: '600',
    },
    headingRow: {
        marginTop: verticalScale(8),
        marginBottom: verticalScale(6),
        paddingHorizontal: scale(4),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heading: {
        ...uiStyle.defaultText,
        fontSize: verticalScale(11.5),
        fontWeight: '500',
    },
    headingAction: {
        ...uiStyle.defaultText,
        fontSize: scale(12.5),
        fontWeight: '600',
    },
    category: {
        borderRadius: scale(14),
        marginBottom: verticalScale(8),
        overflow: 'hidden',
    },
    categoryHeader: {
        minHeight: verticalScale(42),
        paddingHorizontal: scale(14),
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
        paddingHorizontal: scale(12),
        paddingBottom: verticalScale(12),
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(7),
    },
    articleChip: {
        maxWidth: '100%',
        minHeight: verticalScale(31),
        borderRadius: scale(10),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(6),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    articleChipText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(12),
        fontWeight: '600',
    },
    recentCard: {
        borderRadius: scale(14),
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(4),
        marginBottom: verticalScale(6),
    },
    recentCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: verticalScale(4),
    },
    recentCardTitle: {
        ...uiStyle.defaultText,
        fontSize: verticalScale(11.5),
        fontWeight: '500',
    },
    recentIconBadge: {
        width: scale(28),
        height: scale(28),
        borderRadius: scale(9),
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    recentRow: {
        minHeight: verticalScale(44),
        paddingVertical: verticalScale(9),
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
