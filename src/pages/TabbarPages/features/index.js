import React, { useState, useRef, useCallback, useContext, useMemo, useEffect } from 'react';
import {
    Animated as RNAnimated,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
import SegmentedTopTabBar, {
    SEGMENTED_TOP_TAB_BAR_HEIGHT,
} from '../../../components/SegmentedTopTabBar';
import TopScrollEdgeBackdrop, {
    SCROLL_EDGE_FADE_HEIGHT,
} from '../../../components/TopScrollEdgeBackdrop';
import { SEARCH_FIELD_MIN_HEIGHT } from '../../../components/searchFieldStyles';
import { useTheme, uiStyle } from '../../../components/ThemeContext';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { openLink } from '../../../utils/browser';
import { trigger } from '../../../utils/trigger';
import {
    COURSE_TAB_ROUTE,
    navigateToCourseTab,
} from '../../../utils/courseNavigation';
import { canNavigateTo } from '../../../utils/routeAvailability';
import {
    FREQUENT_FEATURES_DISPLAY_LIMIT,
    buildFrequentFeatures,
    getFeatureRecentUsage,
    recordFeatureUsage,
} from '../../../utils/featureRecentUsage';
import {
    getFeatureSearchText,
    getUmWebSearchUrl,
    normalizeSearchText,
} from '../../../utils/featureSearch';
import { addSearchHistory } from '../../../utils/searchHistory';
import {
    WIDE_CONTENT_MAX_WIDTH,
    useWindowSizeClass,
} from '../../../utils/windowSizeClass';
import { balanceColumns } from '../../../utils/balanceColumns';
import CustomBottomSheet from '../../../utils/BottomSheet';
import { getFunctionArr } from './FeatureList';
import FeatureSearchBar from './FeatureSearchBar';
import { FeaturesChromeProvider, useFeaturesChrome } from './FeaturesChromeContext';
import FeatureIcon from '../info/home/search/components/FeatureIcon';
import WikiHome from '../arkwiki';

import { FlatGrid } from 'react-native-super-grid';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import * as Clipboard from 'expo-clipboard';
import Ionicons from '@react-native-vector-icons/ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-simple-toast';
import TouchableScale from '../../../components/TouchableScale';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { cubicBezier } from 'react-native-reanimated';
import { useAppReducedMotion } from '../../../contexts/ReducedMotionContext';

const Tab = createMaterialTopTabNavigator();

// 功能詳情內容精簡；預設檔需高於底部懸浮 Tab Bar 避免遮擋按鈕，長說明可再上拉
const FEATURE_SHEET_SNAP_POINTS = ['44%', '56%'];
/** 分類卡欄數：expanded 兩欄、large 三欄；手機與 medium 維持單欄 */
const CARD_COLUMN_COUNT = {
    compact: 1,
    medium: 1,
    expanded: 2,
    large: 3,
};
/** 每行圖標上限：手機 4 個保持舒展留白；寬屏放寬到 8 個 */
const COMPACT_GRID_MAX_ITEMS_PER_ROW = 4;
const WIDE_GRID_MAX_ITEMS_PER_ROW = 8;
const SEARCH_HEADER_FADE_HEIGHT = verticalScale(12);
const SEARCH_HIGHLIGHT_ANIMATION = {
    animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
    animationDuration: 180,
    animationTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
};

const getGridItemsPerRow = (width, itemDimension, spacing, maxItemsPerRow) =>
    Math.max(1, Math.min(maxItemsPerRow, Math.floor((width - spacing) / (itemDimension + spacing))));

const getUrlHost = url => {
    if (!url || typeof url !== 'string') {
        return '';
    }
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
};

function FeatureSectionGrid({ data, matchedFeatures, ...gridProps }) {
    const [width, setWidth] = useState(0);
    const { itemDimension, spacing, maxItemsPerRow } = gridProps;
    const visibleItems = useMemo(() => {
        if (!matchedFeatures) {
            return data;
        }
        if (!width) {
            return [];
        }

        // 使用同一個實測寬度分行。保留命中行的整排圖示，避免命中項換欄。
        const itemsPerRow = getGridItemsPerRow(width, itemDimension, spacing, maxItemsPerRow);
        const items = [];
        for (let index = 0; index < data.length; index += itemsPerRow) {
            const row = data.slice(index, index + itemsPerRow);
            if (row.some(item => matchedFeatures.has(item))) {
                items.push(...row);
            }
        }
        return items;
    }, [data, matchedFeatures, width, itemDimension, spacing, maxItemsPerRow]);

    return (
        <FlatGrid
            {...gridProps}
            data={visibleItems}
            staticDimension={width || undefined}
            onLayout={event => setWidth(event.nativeEvent.layout.width)}
        />
    );
}

function FeatureListPage({ navigation }) {
    const { theme } = useTheme();
    const { isLight, white, trueWhite, black, trueBlack, featuresScreen, viewShadow, pressOverlay } = theme;
    const { status: harborStatus, user: harborUser, login } = useHarborSession();
    const { t, i18n } = useTranslation(['common', 'home', 'features']);
    const functionArr = useMemo(() => getFunctionArr(t), [t]);
    const { width: windowWidth, sizeClass, isCompact } = useWindowSizeClass();
    const isTc = i18n.language === 'tc';
    const fontSize = isTc ? verticalScale(11) : verticalScale(9);
    const [bottomSheetInfo, setBottomSheetInfo] = useState(null);
    const [usageRecords, setUsageRecords] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const bottomSheetRef = useRef(null);
    const searchInputRef = useRef(null);
    const listRef = useRef(null);
    const reducedMotion = useAppReducedMotion();
    const insets = useSafeAreaInsets();
    const { topChromeHeight } = useFeaturesChrome();
    const scrollY = useRef(new RNAnimated.Value(0)).current;
    const [searchHeaderHeight, setSearchHeaderHeight] = useState(
        SEARCH_FIELD_MIN_HEIGHT + 2 + verticalScale(10),
    );
    const totalSearchHeaderHeight = topChromeHeight + searchHeaderHeight;
    const handleSearchChromeScroll = useCallback(event => {
        scrollY.setValue(event.nativeEvent.contentOffset.y);
    }, [scrollY]);
    const handleSearchHeaderLayout = useCallback(event => {
        const nextHeight = event.nativeEvent.layout.height;
        setSearchHeaderHeight(current => (
            Math.abs(current - nextHeight) > 0.5 ? nextHeight : current
        ));
    }, []);
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;
    // 同 courseSim：Android 場景底已在 Tab 上方；iOS 浮動 Tab 需自行預留
    const listBottomPad =
        Platform.OS === 'ios'
            ? tabBarHeight + verticalScale(10)
            : verticalScale(10);
    // iOS sheet 延伸至螢幕底時，內容勿被 Tab 擋住
    const sheetContentBottomPad =
        Platform.OS === 'ios'
            ? tabBarHeight + verticalScale(12)
            : verticalScale(20);

    const featureByKey = useMemo(() => {
        const map = new Map();
        functionArr.forEach(section => {
            section.fn.forEach(item => {
                const key = item.key_name || item.fn_name;
                if (key) {
                    map.set(key, item);
                }
            });
        });
        return map;
    }, [functionArr]);

    const frequentFeatures = useMemo(
        () => buildFrequentFeatures(featureByKey, usageRecords),
        [featureByKey, usageRecords],
    );

    const searchTextByFeature = useMemo(() => new Map(
        functionArr.flatMap(({ title, fn }) =>
            fn.map(item => [item, getFeatureSearchText(item, title)]),
        ),
    ), [functionArr]);
    const normalizedQuery = normalizeSearchText(searchQuery);
    const isSearching = !!normalizedQuery;
    const matchedFeatures = useMemo(() => {
        if (!normalizedQuery) {
            return null;
        }

        const matches = new Set();
        searchTextByFeature.forEach((text, item) => {
            if (text.includes(normalizedQuery)) {
                matches.add(item);
            }
        });
        return matches;
    }, [normalizedQuery, searchTextByFeature]);
    const visibleSections = useMemo(
        () => matchedFeatures
            ? functionArr.filter(section => section.fn.some(item => matchedFeatures.has(item)))
            : functionArr,
        [functionArr, matchedFeatures],
    );

    const handleChangeSearchQuery = value => {
        setSearchQuery(value);
        listRef.current?.scrollTo({ y: 0, animated: false });
    };

    const handleWebSearch = () => {
        const query = searchQuery.trim();
        if (!query) {
            return;
        }

        trigger();
        searchInputRef.current?.blur();
        logToFirebase('funcUse', {
            funcName: 'searchBar_web',
            searchBarDetail: query,
        });
        openLink({ URL: getUmWebSearchUrl(query), mode: 'fullScreen' });
        addSearchHistory(query);
    };

    const refreshUsage = useCallback(async () => {
        const nextUsage = await getFeatureRecentUsage();
        setUsageRecords(nextUsage);
    }, []);

    useEffect(() => {
        refreshUsage();
    }, [refreshUsage]);

    useFocusEffect(
        useCallback(() => {
            refreshUsage();
            return () => {
                searchInputRef.current?.blur();
            };
        }, [refreshUsage]),
    );

    const handleFeaturePress = useCallback(
        item => {
            trigger();
            searchInputRef.current?.blur();
            logToFirebase('funcUse', {
                funcName: item.fn_name,
            });
            // 異步寫入常用紀錄，不阻塞導航
            recordFeatureUsage(item.key_name || item.fn_name).then(
                setUsageRecords,
            );

            const { go_where, webview_param, needLogin, loginRoute } = item;
            // web 端只掛了部分頁面（見 Nav.web.js），站內路由未註冊時提示改用 APP；
            // Webview／Linking 走瀏覽器新開分頁，不受影響
            const isInAppRoute =
                go_where !== 'Webview' && go_where !== 'Linking';
            if (
                Platform.OS === 'web' &&
                isInAppRoute &&
                !canNavigateTo(navigation, go_where)
            ) {
                Toast.show(
                    t('此功能網頁版暫未支持，請在 ARK ALL APP 中打開', {
                        ns: 'features',
                    }),
                    Toast.LONG,
                );
                return;
            }
            if (needLogin) {
                if (harborStatus === 'signedIn' && harborUser) {
                    navigation.navigate(go_where);
                } else if (
                    harborStatus !== 'restoring' &&
                    harborStatus !== 'authorizing'
                ) {
                    const loginIntent = loginRoute
                        ? { routeName: loginRoute }
                        : {
                            routeName: 'Tabbar',
                            params: { screen: go_where },
                        };
                    login(loginIntent).catch(() => {});
                }
                return;
            }

            setTimeout(() => {
                if (go_where === 'Webview' || go_where === 'Linking') {
                    // 有指定 mode（如校園地圖 fullScreen）時傳入；其餘預設 Modal
                    openLink({
                        URL: webview_param.url,
                        mode: webview_param.mode,
                    });
                } else if (go_where === COURSE_TAB_ROUTE) {
                    // 此入口對應「課表模擬」，需落在選課頁的課表段落
                    navigateToCourseTab(navigation, { segment: 'timetable' });
                } else {
                    navigation.navigate(go_where);
                }
            }, 50);
        },
        [harborStatus, harborUser, login, navigation, t],
    );

    // 繁中標籤按單行高度排版，英文預留兩行讓每列圖標對齊
    const featureLabelLineHeight = fontSize * 1.3;
    const featureLabelHeight = isTc ? undefined : featureLabelLineHeight * 2;
    // FlatGrid 末列會再加 marginBottom: spacing，與 row paddingBottom 重疊，需抵銷
    const gridSpacing = scale(10);
    const gridBottomTrim = -gridSpacing;
    const gridItemDimension = scale(64);
    const cardHorizontalMargin = scale(12);
    const cardHorizontalPadding = scale(6);
    const gridMaxItemsPerRow = isCompact
        ? COMPACT_GRID_MAX_ITEMS_PER_ROW
        : WIDE_GRID_MAX_ITEMS_PER_ROW;
    // 寬屏時常用服務只佔「4 個圖標 + 左右各一個間距」的寬度，不再被拉到整行
    const frequentGridMaxWidth = isCompact
        ? undefined
        : FREQUENT_FEATURES_DISPLAY_LIMIT * (gridItemDimension + gridSpacing * 2) + gridSpacing;
    const cardColumnCount = CARD_COLUMN_COUNT[sizeClass] || 1;

    // 相鄰分類可透過 groupKey 共用卡片，組內以細線分隔
    const sectionBlocks = useMemo(() => {
        const blocks = [];
        visibleSections.forEach(section => {
            const lastBlock = blocks[blocks.length - 1];
            if (section.groupKey && lastBlock?.groupKey === section.groupKey) {
                lastBlock.sections.push(section);
            } else {
                blocks.push({
                    key: section.groupKey || section.title,
                    groupKey: section.groupKey || null,
                    sections: [section],
                });
            }
        });
        return blocks;
    }, [visibleSections]);

    // 分類區塊分欄：用估算的每行圖標數換算行數作平衡權重（標題約 0.4 行），
    // 只決定區塊落在哪一欄；實際每行圖標數仍由 FlatGrid 量測後自行決定
    const sectionColumns = useMemo(() => {
        const columnWidth = Math.min(windowWidth, WIDE_CONTENT_MAX_WIDTH) / cardColumnCount - (cardHorizontalMargin + cardHorizontalPadding) * 2;
        const itemsPerRow = getGridItemsPerRow(columnWidth, gridItemDimension, gridSpacing, gridMaxItemsPerRow);
        return balanceColumns(
            sectionBlocks,
            cardColumnCount,
            block => block.sections.reduce(
                (sum, section) => sum + Math.ceil(section.fn.length / itemsPerRow) + 0.4,
                0,
            ),
        );
    }, [cardColumnCount, cardHorizontalMargin, cardHorizontalPadding, sectionBlocks, gridItemDimension, gridMaxItemsPerRow, gridSpacing, windowWidth]);

    const renderFeatureItem = useCallback(
        item => {
            const isMatch = matchedFeatures?.has(item);
            const isMuted = isMatch === false;
            return <TouchableScale
                accessibilityRole="button"
                style={{
                    width: '100%',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                }}
                activeOpacity={0.7}
                onPress={() => handleFeaturePress(item)}
                onLongPress={() => {
                    trigger('longPress');
                    searchInputRef.current?.blur();
                    setBottomSheetInfo(item);
                    bottomSheetRef.current?.snapToIndex(0);
                }}
                key={item.key_name || item.fn_name}>
                {isMatch ? (
                    <Animated.View
                        pointerEvents="none"
                        style={{
                            ...(!reducedMotion && SEARCH_HIGHLIGHT_ANIMATION),
                            position: 'absolute',
                            top: -verticalScale(3),
                            right: -scale(2),
                            bottom: -verticalScale(2),
                            left: -scale(2),
                            borderRadius: scale(12),
                            ...viewShadow,
                        }}
                    />
                ) : null}
                <FeatureIcon
                    item={item}
                    size={scale(26)}
                    muted={isMuted}
                    showBackground={false}
                />
                <Text
                    numberOfLines={isTc ? 1 : 2}
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: fontSize,
                        lineHeight: featureLabelLineHeight,
                        height: featureLabelHeight,
                        color: isMuted ? black.third : black.second,
                        textAlign: 'center',
                        marginTop: verticalScale(6),
                    }}>
                    {item.fn_name}
                </Text>
            </TouchableScale>;
        },
        [
            black.second,
            black.third,
            featureLabelHeight,
            featureLabelLineHeight,
            fontSize,
            handleFeaturePress,
            isTc,
            matchedFeatures,
            reducedMotion,
            viewShadow,
        ],
    );

    // 圓角白卡分類區塊，標題視覺退後讓彩色雙色圖標成為焦點
    const renderSectionBlock = useCallback(
        (block, blockIndex) => (
            <View
                key={block.key}
                style={{
                    backgroundColor: featuresScreen.cardBg,
                    borderRadius: scale(14),
                    marginTop: blockIndex === 0 ? verticalScale(2) : verticalScale(10),
                    paddingTop: verticalScale(12),
                    paddingBottom: verticalScale(12),
                    paddingHorizontal: cardHorizontalPadding,
                }}>
                {block.sections.map((section, sectionIndex) => (
                    <View
                        key={section.title}
                        style={{
                            marginTop: sectionIndex === 0 ? 0 : verticalScale(10),
                        }}>
                        {sectionIndex > 0 ? (
                            <View
                                style={{
                                    height: StyleSheet.hairlineWidth,
                                    backgroundColor: featuresScreen.divider,
                                    marginHorizontal: scale(10),
                                    marginBottom: verticalScale(10),
                                }}
                            />
                        ) : null}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: verticalScale(11.5),
                                color: black.third,
                                fontWeight: '500',
                                paddingHorizontal: scale(10),
                                paddingBottom: verticalScale(4),
                            }}>
                            {section.title}
                        </Text>

                        <FeatureSectionGrid
                            maxItemsPerRow={gridMaxItemsPerRow}
                            itemDimension={gridItemDimension}
                            spacing={gridSpacing}
                            style={{ marginBottom: gridBottomTrim }}
                            itemContainerStyle={{
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                            }}
                            data={section.fn}
                            matchedFeatures={matchedFeatures}
                            renderItem={({ item }) => renderFeatureItem(item)}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </View>
                ))}
            </View>
        ),
        [
            black.third,
            cardHorizontalPadding,
            featuresScreen.cardBg,
            featuresScreen.divider,
            gridBottomTrim,
            gridItemDimension,
            gridMaxItemsPerRow,
            gridSpacing,
            matchedFeatures,
            renderFeatureItem,
        ],
    );

    // BottomSheet內容渲染：左圖右文無底色資訊頭 + 墨黑極簡主按鈕
    const renderBottomSheet = () => {
        if (!bottomSheetInfo) {
            return null;
        }
        const { go_where, webview_param, describe, fn_name } = bottomSheetInfo;
        const haveLink = (go_where === 'Webview' || go_where === 'Linking') && Boolean(webview_param?.url);
        const urlHost = haveLink ? getUrlHost(webview_param.url) : '';
        const primaryButtonForeground = isLight ? trueWhite : trueBlack;
        const secondaryButtonBackground = isLight ? featuresScreen.bg_color : pressOverlay;
        return (
            <View
                style={{
                    backgroundColor: white,
                    paddingHorizontal: scale(20),
                    paddingTop: verticalScale(6),
                    paddingBottom: sheetContentBottomPad,
                }}>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        columnGap: scale(12),
                    }}>
                    <View style={{ paddingTop: verticalScale(1) }}>
                        <FeatureIcon
                            item={bottomSheetInfo}
                            size={scale(28)}
                            showBackground={false}
                        />
                    </View>
                    <View style={{ flex: 1, paddingTop: verticalScale(1) }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.main,
                                fontSize: verticalScale(15),
                                fontWeight: '600',
                            }}>
                            {fn_name}
                        </Text>
                        {describe ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: black.third,
                                    fontSize: verticalScale(12),
                                    lineHeight: verticalScale(17),
                                    marginTop: verticalScale(4),
                                }}
                                selectable>
                                {describe}
                            </Text>
                        ) : null}
                        {urlHost ? (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    columnGap: scale(4),
                                    marginTop: verticalScale(4),
                                }}>
                                <Ionicons
                                    name="link-outline"
                                    size={scale(12)}
                                    color={black.third}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        ...uiStyle.defaultText,
                                        flex: 1,
                                        color: black.third,
                                        fontSize: verticalScale(11),
                                    }}>
                                    {urlHost}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>

                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        columnGap: scale(10),
                        marginTop: verticalScale(16),
                    }}>
                    {haveLink ? (
                        <ScalePressable
                            style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: verticalScale(11),
                                paddingHorizontal: scale(12),
                                borderRadius: scale(14),
                                backgroundColor: secondaryButtonBackground,
                            }}
                            onPress={() => {
                                Clipboard.setStringAsync(webview_param.url);
                                trigger('success');
                                Toast.show(t('已複製Link到剪貼板！'));
                            }}>
                            <Ionicons
                                name="link-outline"
                                size={scale(15)}
                                color={black.second}
                                style={{ marginRight: scale(5) }}
                            />
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: black.second,
                                    fontSize: verticalScale(13),
                                    fontWeight: '500',
                                }}>
                                {t('複製連結')}
                            </Text>
                        </ScalePressable>
                    ) : null}
                    <ScalePressable
                        style={{
                            flex: haveLink ? 1.2 : 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: verticalScale(11),
                            paddingHorizontal: scale(12),
                            borderRadius: scale(14),
                            backgroundColor: black.second,
                        }}
                        onPress={() => {
                            bottomSheetRef.current?.close();
                            handleFeaturePress(bottomSheetInfo);
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: primaryButtonForeground,
                                fontSize: verticalScale(13),
                                fontWeight: '600',
                            }}>
                            {t('開啟服務', { ns: 'features' })}
                        </Text>
                        <Ionicons
                            name={haveLink ? 'open-outline' : 'arrow-forward-outline'}
                            size={scale(15)}
                            color={primaryButtonForeground}
                            style={{ marginLeft: scale(5) }}
                        />
                    </ScalePressable>
                </View>
            </View>
        );
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: featuresScreen.bg_color,
            }}>
            <ScrollView
                ref={listRef}
                showsVerticalScrollIndicator={true}
                contentInsetAdjustmentBehavior="never"
                automaticallyAdjustKeyboardInsets
                keyboardShouldPersistTaps="handled"
                scrollIndicatorInsets={{
                    top: totalSearchHeaderHeight,
                    bottom: listBottomPad,
                }}
                scrollEventThrottle={16}
                onScroll={handleSearchChromeScroll}
                contentContainerStyle={{
                    paddingTop: totalSearchHeaderHeight + SEARCH_HEADER_FADE_HEIGHT,
                    paddingBottom: listBottomPad,
                }}>
                {/* 超寬屏內容居中封頂，分類區塊再按尺寸等級分成 1／2／3 欄 */}
                <View
                    style={{
                        width: '100%',
                        maxWidth: WIDE_CONTENT_MAX_WIDTH,
                        alignSelf: 'center',
                        paddingHorizontal: cardHorizontalMargin,
                    }}>
                {!isSearching && frequentFeatures.length > 0 ? (
                    <View
                        style={{
                            width: '100%',
                            backgroundColor: featuresScreen.cardBg,
                            borderRadius: scale(14),
                            marginTop: verticalScale(2),
                            marginBottom: verticalScale(8),
                            paddingTop: verticalScale(12),
                            paddingBottom: verticalScale(12),
                            paddingHorizontal: cardHorizontalPadding,
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: verticalScale(11.5),
                                color: black.third,
                                fontWeight: '500',
                                paddingHorizontal: scale(10),
                                paddingBottom: verticalScale(4),
                            }}>
                            {t('常用服務', { ns: 'features' })}
                        </Text>
                        <FlatGrid
                            maxItemsPerRow={FREQUENT_FEATURES_DISPLAY_LIMIT}
                            maxDimension={frequentGridMaxWidth}
                            itemDimension={gridItemDimension}
                            spacing={gridSpacing}
                            style={{ marginBottom: gridBottomTrim }}
                            itemContainerStyle={{
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                            }}
                            data={frequentFeatures}
                            renderItem={({ item }) => renderFeatureItem(item)}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </View>
                ) : null}

                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        columnGap: cardColumnCount > 1 ? scale(12) : 0,
                    }}>
                    {sectionColumns.map((blocks, columnIndex) => (
                        <View key={columnIndex} style={{ flex: 1 }}>
                            {blocks.map((block, index) =>
                                renderSectionBlock(block, index),
                            )}
                        </View>
                    ))}
                </View>
                <View
                    style={{
                        marginHorizontal: scale(20),
                        marginVertical: scale(10),
                    }}
                />
                </View>
            </ScrollView>

            <View
                pointerEvents="box-none"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 2,
                }}>
                <TopScrollEdgeBackdrop
                    headerHeight={totalSearchHeaderHeight}
                    fadeHeight={SCROLL_EDGE_FADE_HEIGHT}
                    scrollY={scrollY}
                    backgroundColor={featuresScreen.bg_color}
                />
                <View
                    pointerEvents="box-none"
                    style={{ paddingTop: topChromeHeight, zIndex: 2 }}>
                    <View pointerEvents="box-none" onLayout={handleSearchHeaderLayout}>
                        <FeatureSearchBar
                            inputRef={searchInputRef}
                            query={searchQuery}
                            onChangeQuery={handleChangeSearchQuery}
                            onWebSearch={handleWebSearch}
                            hasQuery={isSearching}
                            matchCount={matchedFeatures?.size ?? 0}
                        />
                    </View>
                </View>
            </View>

            <CustomBottomSheet
                ref={bottomSheetRef}
                page={'features'}
                // 同 courseSim：sheet 延伸至螢幕底部，避免 Tab 上方露出 bg_color
                bottomInset={0}
                topCornerRadius={scale(26)}
                handleIndicatorStyle={{
                    backgroundColor: pressOverlay,
                    width: scale(34),
                    height: verticalScale(3.5),
                }}
                snapPoints={FEATURE_SHEET_SNAP_POINTS}>
                {renderBottomSheet()}
            </CustomBottomSheet>
        </View>
    );
}

export default function Index() {
    const { theme } = useTheme();
    const { featuresScreen } = theme;
    const { t } = useTranslation('common');
    const insets = useSafeAreaInsets();
    const [topBarRowHeight, setTopBarRowHeight] = useState(
        SEGMENTED_TOP_TAB_BAR_HEIGHT,
    );
    const handleTopBarLayout = useCallback(event => {
        const nextHeight = event.nativeEvent.layout.height;
        setTopBarRowHeight(current =>
            Math.abs(current - nextHeight) > 0.5 ? nextHeight : current,
        );
    }, []);
    const topChromeHeight = insets.top + topBarRowHeight;
    const renderTopTabBar = useCallback(
        props => (
            <View
                pointerEvents="box-none"
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    paddingTop: insets.top,
                }}>
                <View pointerEvents="box-none" onLayout={handleTopBarLayout}>
                    <SegmentedTopTabBar {...props} backgroundColor="transparent" />
                </View>
            </View>
        ),
        [handleTopBarLayout, insets.top],
    );

    return (
        <View style={{ flex: 1, backgroundColor: featuresScreen.bg_color }}>
            <FeaturesChromeProvider topChromeHeight={topChromeHeight}>
                <Tab.Navigator
                    tabBar={renderTopTabBar}
                    screenOptions={{
                        lazy: true,
                    }}
                    initialRouteName="FeatureList">
                    <Tab.Screen
                        name="FeatureList"
                        component={FeatureListPage}
                        options={{ title: t('服務') }}
                    />
                    <Tab.Screen
                        name="WikiHome"
                        component={WikiHome}
                        options={{ title: t('百科') }}
                    />
                </Tab.Navigator>
            </FeaturesChromeProvider>
        </View>
    );
}
