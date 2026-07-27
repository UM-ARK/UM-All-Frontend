import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { FlatGrid } from 'react-native-super-grid';
import { Image } from 'expo-image';
import Clipboard from '@react-native-clipboard/clipboard';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-simple-toast';
import TouchableScale from '../../../components/TouchableScale';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

function Index({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const {
        themeColor,
        white,
        black,
        trueWhite,
        bg_color,
    } = theme;
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
                    openLink(webview_param.url);
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

    const renderFeatureIcon = useCallback(
        (item, iconSize = verticalScale(30)) => {
            if (item.icon_type === 'ionicons') {
                return (
                    <Ionicons
                        name={item.icon_name}
                        size={iconSize}
                        color={themeColor}
                    />
                );
            }
            if (item.icon_type === 'MaterialCommunityIcons') {
                return (
                    <MaterialCommunityIcons
                        name={item.icon_name}
                        size={iconSize}
                        color={themeColor}
                    />
                );
            }
            if (item.icon_type === 'img') {
                return (
                    <Image
                        source={item.icon_name}
                        style={{
                            backgroundColor: trueWhite,
                            height: scale(60),
                            width: scale(60),
                        }}
                    />
                );
            }
            return null;
        },
        [themeColor, trueWhite],
    );

    const renderFeatureItem = useCallback(
        (item, options = {}) => {
            const { iconSize, labelFontSize = fontSize } = options;
            return (
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
                    {renderFeatureIcon(item, iconSize)}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: labelFontSize,
                            color: black.second,
                            textAlign: 'center',
                        }}>
                        {item.fn_name}
                    </Text>
                </TouchableScale>
            );
        },
        [black.second, fontSize, handleFeaturePress, renderFeatureIcon],
    );

    // 功能卡片渲染，useCallback避免不必要的重渲染
    const GetFunctionCard = useCallback(
        (title, fn_list) => (
            <View
                key={title}
                style={{
                    backgroundColor: white,
                    borderRadius: scale(10),
                    marginHorizontal: scale(10),
                    marginTop: verticalScale(10),
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
        ),
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

    // Android 底欄外層不再包 SafeAreaView；此處單獨補頂部狀態列區，避免內容頂到螢幕
    const topInsetAndroid = Platform.OS === 'android' ? insets.top : 0;

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: bg_color,
                paddingTop: topInsetAndroid,
            }}>
            <ScrollView
                showsVerticalScrollIndicator={true}
                contentInsetAdjustmentBehavior="automatic"
                keyboardShouldPersistTaps="handled">
                <View
                    style={{
                        width: '100%',
                        alignItems: 'center',
                    }}>
                    <SearchBar
                        navigation={navigation}
                        entryFuncName="features_search_entry"
                    />
                </View>

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

                {functionArr.map(fn_card =>
                    GetFunctionCard(fn_card.title, fn_card.fn),
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

export default Index;
