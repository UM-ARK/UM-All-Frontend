import React, { useState, useRef, useCallback } from 'react';
import {
    Platform,
    ScrollView,
    Text,
    View,
    TouchableOpacity,
    Linking,
} from 'react-native';

import { useTheme, uiStyle } from '../../../components/ThemeContext';
import { ARK_HARBOR_FEEDBACK, MAIL } from '../../../utils/pathMap';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { openLink } from '../../../utils/browser';
import { trigger } from '../../../utils/trigger';
import CustomBottomSheet from '../courseSim/BottomSheet';
import { getFunctionArr } from './FeatureList';

import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { FlatGrid } from 'react-native-super-grid';
import { Image } from 'expo-image';
import Clipboard from '@react-native-clipboard/clipboard';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-simple-toast';
import TouchableScale from '../../../components/TouchableScale';
import { useTranslation } from 'react-i18next';
// @expo/ui MenuView 用 SwiftUI Host + matchContents 反向量測，無明確寬度會塌陷。
import { MenuView } from '@expo/ui/community/menu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Index({ navigation }) {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { themeColor, white, black, trueWhite, bg_color, viewShadow, tonal } =
        theme;
    const { t, i18n } = useTranslation(['common', 'home', 'features']);
    const functionArr = getFunctionArr(t);
    const isTc = i18n.language === 'tc';
    const fontSize = isTc ? verticalScale(10) : verticalScale(8);
    // MenuView 需明確寬度以免塌陷；英文 Feedback / Setting 比中文長，加寬避免裁切
    const headerActionWidth = isTc ? scale(70) : scale(98);
    const headerActionStyle = {
        width: headerActionWidth,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tonal.primary15,
        borderRadius: scale(20),
        paddingVertical: scale(6),
        paddingHorizontal: scale(8),
    };
    const headerActionTextStyle = {
        ...uiStyle.defaultText,
        marginLeft: scale(3),
        fontSize: isTc ? verticalScale(12) : verticalScale(11),
        color: themeColor,
        fontWeight: '600',
        lineHeight: verticalScale(14),
        flexShrink: 1,
    };

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

    const handleSettingsPress = () => {
        trigger();
        navigation.navigate('SettingPage');
    };

    const feedbackActions = [
        {
            id: 'harbor',
            title: 'Harbor ⭐️',
            image: 'star.fill',
            imageColor: themeColor,
            titleColor: themeColor,
        },
        {
            id: 'email',
            title: 'Email',
            image: 'envelope',
            imageColor: themeColor,
            titleColor: themeColor,
        },
    ];

    const handleFeedbackAction = event => {
        trigger();
        switch (event.nativeEvent.event) {
            case 'harbor':
                openLink(ARK_HARBOR_FEEDBACK);
                break;
            case 'email':
                Clipboard.setString(MAIL);
                Toast.show(t('已複製Mail到剪貼板！'));
                Linking.openURL(`mailto:${MAIL}?subject=ARK功能反饋`);
                break;
            default:
                break;
        }
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
                {/* 標題與操作按鍵：左右 flex:1 槽位保持標題視覺置中 */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: scale(10),
                    }}>
                    {/* 左側：反饋 */}
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                        <MenuView
                            actions={feedbackActions}
                            onOpenMenu={() => trigger()}
                            onPressAction={handleFeedbackAction}
                            shouldOpenOnLongPress={false}
                            style={{ width: headerActionWidth }}>
                            <TouchableScale style={headerActionStyle}>
                                <MaterialIcons
                                    name={'feedback'}
                                    size={verticalScale(14)}
                                    color={themeColor}
                                />
                                <Text
                                    style={headerActionTextStyle}
                                    numberOfLines={1}>
                                    {t('反饋')}
                                </Text>
                            </TouchableScale>
                        </MenuView>
                    </View>

                    {/* 中間：標題 */}
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

                    {/* 右側：設置 */}
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <TouchableScale
                            style={headerActionStyle}
                            onPress={handleSettingsPress}>
                            <Ionicons
                                name={'settings-sharp'}
                                size={verticalScale(14)}
                                color={themeColor}
                            />
                            <Text
                                style={headerActionTextStyle}
                                numberOfLines={1}>
                                {t('設置')}
                            </Text>
                        </TouchableScale>
                    </View>
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
