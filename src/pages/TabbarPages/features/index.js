import React, { useState, useRef, useCallback, useContext, useMemo, useEffect } from 'react';
import {
    Platform,
    ScrollView,
    Text,
    View,
    TouchableOpacity,
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

function FeatureListPage({ navigation }) {
    const { theme } = useTheme();
    const { themeColor, white, black, bg_color } = theme;
    const { t, i18n } = useTranslation(['common', 'home', 'features']);
    const functionArr = useMemo(() => getFunctionArr(t), [t]);
    const isTc = i18n.language === 'tc';
    const fontSize = isTc ? verticalScale(10) : verticalScale(8);
    const [bottomSheetInfo, setBottomSheetInfo] = useState(null);
    const [usageRecords, setUsageRecords] = useState([]);
    const bottomSheetRef = useRef(null);

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
                    bottomSheetRef.current?.snapToIndex(1);
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
        const { go_where, webview_param, describe } = bottomSheetInfo;
        const haveLink = go_where === 'Webview' || go_where === 'Linking';
        return (
            <View
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: white,
                    padding: scale(20),
                }}>
                {describe && (
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            textAlign: 'center',
                        }}
                        selectable>
                        {describe}
                    </Text>
                )}
                {haveLink && (
                    <TouchableOpacity
                        style={{
                            backgroundColor: themeColor,
                            borderRadius: scale(5),
                            padding: scale(5),
                            marginTop: verticalScale(10),
                        }}
                        onPress={() => {
                            trigger();
                            Clipboard.setString(webview_param.url);
                            Toast.show(t('已複製Link到剪貼板！'));
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: white,
                                fontWeight: 'bold',
                            }}>
                            {t('複製功能Link', { ns: 'features' })}
                        </Text>
                    </TouchableOpacity>
                )}
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
                keyboardShouldPersistTaps="handled">
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

            <CustomBottomSheet ref={bottomSheetRef} page={'features'}>
                {renderBottomSheet()}
            </CustomBottomSheet>
        </View>
    );
}

export default function Index() {
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t } = useTranslation('common');
    const insets = useSafeAreaInsets();
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;
    // iOS 原生 Tab Bar 是浮動疊層，Top Tab 的場景需預留整個底欄高度
    const bottomInset = Platform.OS === 'ios' ? tabBarHeight : 0;

    return (
        <SafeAreaView
            style={{ backgroundColor: bg_color, flex: 1, paddingBottom: bottomInset }}
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
