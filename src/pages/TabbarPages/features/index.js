import React, { useState, useRef, useCallback, useContext, useMemo, useEffect } from 'react';
import {
    Platform,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { useTheme, uiStyle } from '../../../components/ThemeContext';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { openLink } from '../../../utils/browser';
import { trigger } from '../../../utils/trigger';
import {
    COURSE_TAB_ROUTE,
    navigateToCourseTab,
} from '../../../utils/courseNavigation';
import {
    buildFrequentFeatures,
    getFeatureRecentUsage,
    recordFeatureUsage,
} from '../../../utils/featureRecentUsage';
import CustomBottomSheet from '../../../utils/BottomSheet';
import { getFunctionArr } from './FeatureList';
import SearchBar from '../info/home/components/SearchBar';
import FeatureIcon from '../info/home/search/components/FeatureIcon';
import WikiHome from '../arkwiki';

import { FlatGrid } from 'react-native-super-grid';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Clipboard from '@react-native-clipboard/clipboard';
import Ionicons from '@react-native-vector-icons/ionicons';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-simple-toast';
import TouchableScale from '../../../components/TouchableScale';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-screens/experimental';

const Tab = createMaterialTopTabNavigator();

const TOP_TAB_SCALE_FACTOR = 0.1;
const TAB_INDICATOR_WIDTH = moderateScale(25, TOP_TAB_SCALE_FACTOR);
const TAB_BAR_HEIGHT = moderateScale(30, TOP_TAB_SCALE_FACTOR);
const TAB_LABEL_FONT_SIZE = moderateScale(11, 0.3);
// 功能詳情內容精簡；最高檔供長按一次彈滿
const FEATURE_SHEET_SNAP_POINTS = ['32%', '48%'];

function FeatureListPage({ navigation }) {
    const { theme } = useTheme();
    const { themeColor, white, black, bg_color, tonal } = theme;
    const { t, i18n } = useTranslation(['common', 'home', 'features']);
    const functionArr = useMemo(() => getFunctionArr(t), [t]);
    const isTc = i18n.language === 'tc';
    const fontSize = isTc ? verticalScale(10) : verticalScale(8);
    const [bottomSheetInfo, setBottomSheetInfo] = useState(null);
    const [usageRecords, setUsageRecords] = useState([]);
    const bottomSheetRef = useRef(null);
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
        }, [refreshUsage]),
    );

    const handleFeaturePress = useCallback(
        item => {
            trigger();
            logToFirebase('funcUse', {
                funcName: item.fn_name,
            });
            // 異步寫入常用紀錄，不阻塞導航
            recordFeatureUsage(item.key_name || item.fn_name).then(
                setUsageRecords,
            );

            const { go_where, webview_param, needLogin } = item;
            if (needLogin) {
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
        [navigation],
    );

    const renderFeatureItem = useCallback(
        item => (
            <TouchableScale
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                activeOpacity={0.7}
                onPress={() => handleFeaturePress(item)}
                onLongPress={() => {
                    trigger();
                    setBottomSheetInfo(item);
                    // 一開始觸發即彈最高檔（同 courseSim 展開搜索）
                    bottomSheetRef.current?.snapToIndex(
                        FEATURE_SHEET_SNAP_POINTS.length - 1,
                    );
                }}
                key={item.key_name || item.fn_name}>
                <FeatureIcon item={item} size={scale(22)} />
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: fontSize,
                        color: black.second,
                        textAlign: 'center',
                        marginTop: verticalScale(4),
                    }}>
                    {item.fn_name}
                </Text>
            </TouchableScale>
        ),
        [black.second, fontSize, handleFeaturePress],
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

                <FlatGrid
                    maxItemsPerRow={5}
                    itemDimension={scale(50)}
                    spacing={scale(10)}
                    itemContainerStyle={{
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    data={fn_list}
                    renderItem={({ item }) => renderFeatureItem(item)}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                />
            </View>
            );
        },
        [white, bg_color, black.main, renderFeatureItem],
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
                    <Pressable
                        style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '100%',
                            marginTop: verticalScale(16),
                            paddingVertical: verticalScale(11),
                            paddingHorizontal: scale(14),
                            borderRadius: scale(12),
                            backgroundColor: pressed
                                ? tonal.primary50
                                : themeColor,
                        })}
                        onPress={() => {
                            trigger();
                            Clipboard.setString(webview_param.url);
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
                    </Pressable>
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
            <ScrollView
                showsVerticalScrollIndicator={true}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: listBottomPad }}>
                <SearchBar
                    navigation={navigation}
                    entryFuncName="features_search_entry"
                    // 與下方功能卡片 marginHorizontal: scale(10) 同寬
                    style={{
                        width: '100%',
                        paddingHorizontal: scale(10),
                    }}
                />

                {frequentFeatures.length > 0 ? (
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
                            maxItemsPerRow={4}
                            itemDimension={scale(50)}
                            spacing={scale(10)}
                            style={{ marginBottom: verticalScale(-6) }}
                            itemContainerStyle={{
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            data={frequentFeatures}
                            renderItem={({ item }) => renderFeatureItem(item)}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </View>
                ) : null}

                {functionArr.map((fn_card, index) =>
                    GetFunctionCard(fn_card.title, fn_card.fn, {
                        // 第一張分類卡貼近上方常用服務
                        marginTop: index === 0 ? verticalScale(2) : verticalScale(10),
                    }),
                )}
                <View
                    style={{
                        marginHorizontal: scale(20),
                        marginVertical: scale(10),
                    }}
                />
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
