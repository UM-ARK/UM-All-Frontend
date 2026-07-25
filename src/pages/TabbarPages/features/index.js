import React, { useState, useRef, useCallback } from 'react';
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
import CustomBottomSheet from '../courseSim/BottomSheet';
import { getFunctionArr } from './FeatureList';

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

function Index({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { themeColor, white, black, trueWhite, bg_color, viewShadow } = theme;
    const { t, i18n } = useTranslation(['common', 'home', 'features']);
    const functionArr = getFunctionArr(t);
    const isTc = i18n.language === 'tc';
    const fontSize = isTc ? verticalScale(10) : verticalScale(8);
    const [bottomSheetInfo, setBottomSheetInfo] = useState(null);
    const bottomSheetRef = useRef(null);

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
                    ...viewShadow,
                }}>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: scale(12),
                        paddingTop: verticalScale(16),
                        paddingBottom: verticalScale(12),
                        borderBottomWidth: verticalScale(2),
                        borderBottomColor: bg_color,
                    }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: verticalScale(15),
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
                    renderItem={({ item }) => {
                        let icon = null;
                        if (item.icon_type === 'ionicons') {
                            icon = (
                                <Ionicons
                                    name={item.icon_name}
                                    size={verticalScale(30)}
                                    color={themeColor}
                                />
                            );
                        } else if (
                            item.icon_type === 'MaterialCommunityIcons'
                        ) {
                            icon = (
                                <MaterialCommunityIcons
                                    name={item.icon_name}
                                    size={verticalScale(30)}
                                    color={themeColor}
                                />
                            );
                        } else if (item.icon_type === 'img') {
                            icon = (
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
                        const { go_where, webview_param, needLogin } = item;
                        return (
                            <TouchableScale
                                style={{
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                                activeOpacity={0.7}
                                onPress={() => {
                                    trigger();
                                    logToFirebase('funcUse', {
                                        funcName: item.fn_name,
                                    });
                                    if (!needLogin) {
                                        setTimeout(() => {
                                            if (
                                                go_where === 'Webview' ||
                                                go_where === 'Linking'
                                            ) {
                                                openLink(webview_param.url);
                                            } else if (
                                                go_where === COURSE_TAB_ROUTE
                                            ) {
                                                // 此入口對應「課表模擬」，需落在選課頁的課表段落
                                                navigateToCourseTab(
                                                    navigation,
                                                    { segment: 'timetable' },
                                                );
                                            } else {
                                                navigation.navigate(go_where);
                                            }
                                        }, 50);
                                    }
                                }}
                                onLongPress={() => {
                                    trigger();
                                    setBottomSheetInfo(item);
                                    bottomSheetRef.current?.snapToIndex(1);
                                }}
                                key={item.fn_name} // 確保每個項目都有唯一鍵
                            >
                                {icon}
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        fontSize: fontSize,
                                        color: black.second,
                                        textAlign: 'center',
                                    }}>
                                    {item.fn_name}
                                </Text>
                            </TouchableScale>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                />
            </View>
        ),
        [
            white,
            fontSize,
            bg_color,
            black,
            navigation,
            themeColor,
            trueWhite,
            viewShadow,
        ],
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
                contentInsetAdjustmentBehavior="automatic">
                {/* 服務頁操作入口已移至「我的」頁 */}
                <View
                    style={{
                        alignItems: 'center',
                        paddingHorizontal: scale(10),
                    }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: verticalScale(18),
                            color: black.main,
                            fontWeight: '700',
                            textAlign: 'center',
                            marginHorizontal: scale(4),
                        }}
                        numberOfLines={1}>
                        {t('服務一覽', { ns: 'features' })}
                    </Text>
                </View>

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
