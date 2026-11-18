import React, { useState, useRef, useCallback, useContext, useMemo, useEffect } from 'react';
import {
    Platform,
    ScrollView,
    View,
} from 'react-native';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
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
    TOP_TAB_STRIP_MAX_WIDTH,
    WIDE_CONTENT_MAX_WIDTH,
    useWindowSizeClass,
} from '../../../utils/windowSizeClass';
import { balanceColumns } from '../../../utils/balanceColumns';
import CustomBottomSheet from '../../../utils/BottomSheet';
import { getFunctionArr } from './FeatureList';
import FeatureSearchBar from './FeatureSearchBar';
import FeatureIcon from '../info/home/search/components/FeatureIcon';
import WikiHome from '../arkwiki';

import { FlatGrid } from 'react-native-super-grid';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@react-native-vector-icons/ionicons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-simple-toast';
import TouchableScale from '../../../components/TouchableScale';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-screens/experimental';
import Animated, { cubicBezier, useReducedMotion } from 'react-native-reanimated';

const Tab = createMaterialTopTabNavigator();

const TOP_TAB_SCALE_FACTOR = 0.1;
const TAB_INDICATOR_WIDTH = moderateScale(25, TOP_TAB_SCALE_FACTOR);
const TAB_BAR_HEIGHT = moderateScale(30, TOP_TAB_SCALE_FACTOR);
const TAB_LABEL_FONT_SIZE = moderateScale(11, 0.3);
// 功能詳情內容精簡；最高檔供長按一次彈滿
const FEATURE_SHEET_SNAP_POINTS = ['32%', '48%'];
/** 分類卡欄數：expanded 兩欄、large 三欄；手機與 medium 維持單欄 */
const CARD_COLUMN_COUNT = {
    compact: 1,
    medium: 1,
    expanded: 2,
    large: 3,
};
/** 每行圖標上限：手機 5 個剛好填滿；寬屏放寬到 8 個，避免 5 個圖標被拉開成大間距 */
const COMPACT_GRID_MAX_ITEMS_PER_ROW = 5;
const WIDE_GRID_MAX_ITEMS_PER_ROW = 8;
const SEARCH_HEADER_FADE_HEIGHT = verticalScale(12);
const SEARCH_HIGHLIGHT_ANIMATION = {
    animationName: { from: { opacity: 0 }, to: { opacity: 1 } },
    animationDuration: 180,
    animationTimingFunction: cubicBezier(0.23, 1, 0.32, 1),
};

const getGridItemsPerRow = (width, itemDimension, spacing, maxItemsPerRow) =>
    Math.max(1, Math.min(maxItemsPerRow, Math.floor((width - spacing) / (itemDimension + spacing))));

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
    const { themeColor, white, black, bg_color, tonal } = theme;
    const { status: harborStatus, user: harborUser, login } = useHarborSession();
    const { t, i18n } = useTranslation(['common', 'home', 'features']);
    const functionArr = useMemo(() => getFunctionArr(t), [t]);
    const { width: windowWidth, sizeClass, isCompact } = useWindowSizeClass();
    const isTc = i18n.language === 'tc';
    const fontSize = isTc ? verticalScale(10) : verticalScale(8);
    const [bottomSheetInfo, setBottomSheetInfo] = useState(null);
    const [usageRecords, setUsageRecords] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const bottomSheetRef = useRef(null);
    const searchInputRef = useRef(null);
    const listRef = useRef(null);
    const reducedMotion = useReducedMotion();
    const insets = useSafeAreaInsets();
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
    const featureLabelLineHeight = fontSize * 1.25;
    const featureLabelHeight = isTc ? undefined : featureLabelLineHeight * 2;
    // FlatGrid 末列會再加 marginBottom: spacing，與 row paddingBottom 重疊，需抵銷
    const gridSpacing = scale(10);
    const gridBottomTrim = -gridSpacing;
    const gridItemDimension = scale(50);
    const gridMaxItemsPerRow = isCompact
        ? COMPACT_GRID_MAX_ITEMS_PER_ROW
        : WIDE_GRID_MAX_ITEMS_PER_ROW;
    // 寬屏時常用服務只佔「4 個圖標 + 左右各一個間距」的寬度，不再被拉到整行
    const frequentGridMaxWidth = isCompact
        ? undefined
        : FREQUENT_FEATURES_DISPLAY_LIMIT * (gridItemDimension + gridSpacing * 2) + gridSpacing;
    const cardColumnCount = CARD_COLUMN_COUNT[sizeClass] || 1;

    // 分類卡分欄：用估算的每行圖標數換算行數作平衡權重（標題約半行），
    // 只決定卡片落在哪一欄；實際每行圖標數仍由 FlatGrid 量測後自行決定
    const cardColumns = useMemo(() => {
        const columnWidth = Math.min(windowWidth, WIDE_CONTENT_MAX_WIDTH) / cardColumnCount - gridSpacing * 2;
        const itemsPerRow = getGridItemsPerRow(columnWidth, gridItemDimension, gridSpacing, gridMaxItemsPerRow);
        return balanceColumns(
            visibleSections,
            cardColumnCount,
            section => Math.ceil(section.fn.length / itemsPerRow) + 0.5,
        );
    }, [cardColumnCount, visibleSections, gridItemDimension, gridMaxItemsPerRow, gridSpacing, windowWidth]);

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
                    trigger();
                    searchInputRef.current?.blur();
                    setBottomSheetInfo(item);
                    // 一開始觸發即彈最高檔（同 courseSim 展開搜索）
                    bottomSheetRef.current?.snapToIndex(
                        FEATURE_SHEET_SNAP_POINTS.length - 1,
                    );
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
                            borderWidth: 1.5,
                            borderColor: themeColor,
                            backgroundColor: tonal.primary30,
                        }}
                    />
                ) : null}
                <FeatureIcon item={item} size={scale(22)} muted={isMuted} />
                <Text
                    numberOfLines={isTc ? 1 : 2}
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: fontSize,
                        lineHeight: featureLabelLineHeight,
                        height: featureLabelHeight,
                        color: isMuted ? black.third : black.second,
                        textAlign: 'center',
                        marginTop: verticalScale(4),
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
            themeColor,
            tonal.primary30,
        ],
    );

    // 功能卡片渲染，useCallback避免不必要的重渲染
    const GetFunctionCard = useCallback(
        (title, fn_list, options = {}) => {
            const { marginTop = verticalScale(10) } = options;
            return (
            <View
                key={title}
                style={{
                    backgroundColor: white,
                    borderRadius: scale(10),
                    marginHorizontal: scale(10),
                    marginTop,
                }}>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: scale(10),
                        paddingTop: verticalScale(10),
                        paddingBottom: verticalScale(8),
                        borderBottomWidth: verticalScale(2),
                        borderBottomColor: bg_color,
                    }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: verticalScale(13),
                            color: black.main,
                            fontWeight: '500',
                        }}>
                        {title}
                    </Text>
                </View>

                <FeatureSectionGrid
                    maxItemsPerRow={gridMaxItemsPerRow}
                    itemDimension={gridItemDimension}
                    spacing={gridSpacing}
                    style={{ marginBottom: gridBottomTrim }}
                    itemContainerStyle={{
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                    }}
                    data={fn_list}
                    matchedFeatures={matchedFeatures}
                    renderItem={({ item }) => renderFeatureItem(item)}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                />
            </View>
            );
        },
        [white, bg_color, black.main, renderFeatureItem, gridSpacing, gridBottomTrim, gridItemDimension, gridMaxItemsPerRow, matchedFeatures],
    );

    // BottomSheet內容渲染
    const renderBottomSheet = () => {
        if (!bottomSheetInfo) {
            return null;
        }
        const { go_where, webview_param, describe, fn_name } = bottomSheetInfo;
        const haveLink = go_where === 'Webview' || go_where === 'Linking';
        return (
            <View
                style={{
                    alignItems: 'center',
                    backgroundColor: white,
                    paddingHorizontal: scale(20),
                    paddingTop: verticalScale(4),
                    paddingBottom: sheetContentBottomPad,
                }}>
                <FeatureIcon item={bottomSheetInfo} size={scale(26)} />
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: black.main,
                        fontSize: verticalScale(15),
                        fontWeight: '600',
                        textAlign: 'center',
                        marginTop: verticalScale(12),
                    }}>
                    {fn_name}
                </Text>
                {describe ? (
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.third,
                            fontSize: verticalScale(12),
                            lineHeight: verticalScale(18),
                            textAlign: 'center',
                            marginTop: verticalScale(6),
                        }}
                        selectable>
                        {describe}
                    </Text>
                ) : null}
                {haveLink ? (
                    <ScalePressable
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            marginTop: verticalScale(16),
                            paddingVertical: verticalScale(11),
                            paddingHorizontal: scale(14),
                            borderRadius: scale(12),
                            backgroundColor: themeColor,
                        }}
                        onPress={() => {
                            trigger();
                            Clipboard.setStringAsync(webview_param.url);
                            Toast.show(t('已複製Link到剪貼板！'));
                        }}>
                        <Ionicons
                            name="link-outline"
                            size={scale(16)}
                            color={white}
                            style={{ marginRight: scale(6) }}
                        />
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: white,
                                fontSize: verticalScale(13),
                                fontWeight: '600',
                            }}>
                            {t('複製功能Link', { ns: 'features' })}
                        </Text>
                    </ScalePressable>
                ) : null}
            </View>
        );
    };

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: bg_color,
            }}>
            <View style={{ zIndex: 1 }}>
                <FeatureSearchBar
                    inputRef={searchInputRef}
                    query={searchQuery}
                    onChangeQuery={handleChangeSearchQuery}
                    onWebSearch={handleWebSearch}
                    hasQuery={isSearching}
                    matchCount={matchedFeatures?.size ?? 0}
                />
                <LinearGradient
                    pointerEvents="none"
                    colors={[bg_color, `${bg_color}00`]}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        height: SEARCH_HEADER_FADE_HEIGHT,
                    }}
                />
            </View>
            <ScrollView
                ref={listRef}
                showsVerticalScrollIndicator={true}
                contentInsetAdjustmentBehavior="automatic"
                automaticallyAdjustKeyboardInsets
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                    paddingTop: SEARCH_HEADER_FADE_HEIGHT,
                    paddingBottom: listBottomPad,
                }}>
                {/* 超寬屏內容居中封頂，分類卡再按尺寸等級分成 1／2／3 欄 */}
                <View
                    style={{
                        width: '100%',
                        maxWidth: WIDE_CONTENT_MAX_WIDTH,
                        alignSelf: 'center',
                    }}>
                {!isSearching && frequentFeatures.length > 0 ? (
                    <View
                        style={{
                            width: '100%',
                            marginTop: verticalScale(8),
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: verticalScale(13),
                                color: black.main,
                                fontWeight: '600',
                                paddingHorizontal: scale(16),
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

                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    {cardColumns.map((sections, columnIndex) => (
                        <View key={columnIndex} style={{ flex: 1 }}>
                            {sections.map((fn_card, index) =>
                                GetFunctionCard(fn_card.title, fn_card.fn, {
                                    // 每欄第一張分類卡貼近上方常用服務
                                    marginTop: index === 0 ? verticalScale(2) : verticalScale(10),
                                }),
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

            <CustomBottomSheet
                ref={bottomSheetRef}
                page={'features'}
                // 同 courseSim：sheet 延伸至螢幕底部，避免 Tab 上方露出 bg_color
                bottomInset={0}
                snapPoints={FEATURE_SHEET_SNAP_POINTS}>
                {renderBottomSheet()}
            </CustomBottomSheet>
        </View>
    );
}

export default function Index() {
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t } = useTranslation('common');

    return (
        <SafeAreaView
            style={{ backgroundColor: bg_color, flex: 1 }}
            edges={{ top: true }}>
            <Tab.Navigator
                screenOptions={{
                    tabBarLabelStyle: {
                        fontSize: TAB_LABEL_FONT_SIZE,
                        fontWeight: 'bold',
                    },
                    tabBarStyle: {
                        backgroundColor: bg_color,
                        height: TAB_BAR_HEIGHT,
                        overflow: 'hidden',
                        // 寬屏時兩個 Tab 不再被拉到左右兩端，手機寬度小於此值不受影響
                        width: '100%',
                        maxWidth: TOP_TAB_STRIP_MAX_WIDTH,
                        alignSelf: 'center',
                    },
                    tabBarItemStyle: {
                        minHeight: TAB_BAR_HEIGHT,
                        paddingVertical: 0,
                    },
                    tabBarContentContainerStyle: {
                        alignItems: 'center',
                        justifyContent: 'center',
                    },
                    tabBarBounces: false,
                    tabBarActiveTintColor: themeColor,
                    tabBarInactiveTintColor: black.third,
                    tabBarPressColor: bg_color,
                    tabBarIndicatorStyle: {
                        backgroundColor: themeColor,
                        width: TAB_INDICATOR_WIDTH,
                        marginHorizontal: 'auto',
                    },
                    lazy: true,
                }}
                initialRouteName="FeatureList">
                <Tab.Screen
                    name="FeatureList"
                    component={FeatureListPage}
                    options={{ title: t('服務') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}
                />
                <Tab.Screen
                    name="WikiHome"
                    component={WikiHome}
                    options={{ title: t('百科') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}
                />
            </Tab.Navigator>
        </SafeAreaView>
    );
}
