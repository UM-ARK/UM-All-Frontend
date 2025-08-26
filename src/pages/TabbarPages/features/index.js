import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
    ScrollView, Text, View, TouchableOpacity, Linking, Platform, Alert,
} from 'react-native';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../components/ThemeContext';
import { MAIL, } from '../../../utils/pathMap';
import { logToFirebase } from "../../../utils/firebaseAnalytics";
import { openLink } from "../../../utils/browser";
import { trigger } from "../../../utils/trigger";
import CustomBottomSheet from "../courseSim/BottomSheet";

import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { FlatGrid } from 'react-native-super-grid';
import FastImage from 'react-native-fast-image';
import Clipboard from '@react-native-clipboard/clipboard';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from "react-native-simple-toast";
import TouchableScale from "react-native-touchable-scale";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { t } from "i18next";
import { functionArr } from './FeatureList';

// 定義可使用icon，注意大小寫


const iconSize = scale(25);

function Index({ navigation }) {
    const { theme } = useTheme();
    const { themeColor, white, black, trueWhite, bg_color, barStyle } = theme;

    const [bottomSheetInfo, setBottomSheetInfo] = useState(null);
    const bottomSheetRef = useRef(null);
    const insets = useContext(SafeAreaInsetsContext);

    // 登錄檢查
    // useEffect(() => {
    //     console.log('RootStore:', RootStore);
    //     if (RootStore?.userInfo?.stdData) {
    //         setIsLogin(true);
    //     } 
    // }, [RootStore]);

    // 功能卡片渲染，useCallback避免不必要的重渲染
    const GetFunctionCard = useCallback((title, fn_list) => (
        <View key={title}
            style={{
                flex: 1, backgroundColor: white,
                borderRadius: scale(10),
                marginHorizontal: scale(10),
                marginTop: verticalScale(10),
            }}
        >
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: scale(12),
                paddingTop: verticalScale(12),
            }}>
                <Text style={{
                    ...uiStyle.defaultText,
                    fontSize: verticalScale(12),
                    color: black.main,
                    fontWeight: 'bold',
                }}>
                    {title}
                </Text>
            </View>
            <FlatGrid
                maxItemsPerRow={5}
                itemDimension={scale(50)}
                spacing={scale(10)}
                itemContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
                data={fn_list}
                renderItem={({ item }) => {
                    let icon = null;
                    if (item.icon_type === 'ionicons') {
                        icon = <Ionicons name={item.icon_name} size={verticalScale(30)} color={themeColor} />;
                    } else if (item.icon_type === 'MaterialCommunityIcons') {
                        icon = <MaterialCommunityIcons name={item.icon_name} size={verticalScale(30)} color={themeColor} />;
                    } else if (item.icon_type === 'img') {
                        icon = <FastImage source={{ uri: item.icon_name }} style={{ backgroundColor: trueWhite, height: scale(60), width: scale(60) }} />;
                    }
                    const { go_where, webview_param, needLogin } = item;
                    return (
                        <TouchableScale
                            style={{ justifyContent: 'center', alignItems: 'center' }}
                            activeOpacity={0.7}
                            onPress={() => {
                                trigger();
                                logToFirebase('funcUse', { funcName: item.fn_name });
                                if (!needLogin) {
                                    setTimeout(() => {
                                        if (go_where === 'Webview' || go_where === 'Linking') {
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
                            <Text style={{
                                ...uiStyle.defaultText,
                                fontSize: verticalScale(10),
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
    ), [white]);  // useCallback依賴於此

    // BottomSheet內容渲染
    const renderBottomSheet = () => {
        if (!bottomSheetInfo) return null;
        const { go_where, webview_param, describe } = bottomSheetInfo;
        const haveLink = (go_where === 'Webview' || go_where === 'Linking');
        return (
            <View style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: white, padding: scale(20) }}>
                {describe && <Text style={{
                    ...uiStyle.defaultText,
                    color: black.main,
                    textAlign: 'center'
                }} selectable>{describe}</Text>}
                {haveLink && <TouchableOpacity
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
                    }}
                >
                    <Text style={{ ...uiStyle.defaultText, color: white, fontWeight: 'bold' }}>{t('複製功能Link', { ns: 'features' })}</Text>
                </TouchableOpacity>}
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            <Header
                backgroundColor={bg_color}
                statusBarProps={{
                    backgroundColor: 'transparent',
                    barStyle: barStyle,
                }}
                containerStyle={{
                    height: Platform.select({
                        android: scale(38),
                        default: insets?.top || 0,
                    }),
                    paddingTop: 0,
                    borderBottomWidth: 0,
                }}
            />
            <ScrollView showsVerticalScrollIndicator={true}>
                <View style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: verticalScale(3), paddingHorizontal: scale(10),
                }}>
                    {/* 反饋按鈕 */}
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: themeColor,
                            borderRadius: scale(5),
                            padding: scale(5),
                        }}
                        onPress={() => {
                            trigger();
                            const mailMes = `mailto:${MAIL}?subject=ARK功能反饋`;
                            if (Platform.OS === 'android') {
                                Alert.alert(t('反饋'), t(`請在郵件${MAIL}中給我們建議！`), [
                                    {
                                        text: '複製Email', onPress: () => {
                                            Clipboard.setString(MAIL);
                                            Toast.show(t('已複製Mail到剪貼板！'));
                                            Linking.openURL(mailMes);
                                        }
                                    },
                                    { text: 'No', },
                                ]);
                            } else {
                                Linking.openURL(mailMes);
                            }
                        }}
                    >
                        <MaterialIcons name={'feedback'} size={verticalScale(15)} color={white} />
                        <Text style={{ ...uiStyle.defaultText, color: white, fontWeight: 'bold' }}>{t('反饋')}</Text>
                    </TouchableOpacity>
                    {/* 標題 */}
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <FastImage
                            source={require('../../../static/img/logo.png')}
                            style={{ height: iconSize, width: iconSize, borderRadius: scale(5) }}
                        />
                        <Text style={{
                            marginLeft: scale(5), ...uiStyle.defaultText, fontSize: scale(18),
                            color: themeColor, fontWeight: '600'
                        }}>{t('服務一覽', { ns: 'features' })}</Text>
                    </View>
                    {/* 設置按鈕 */}
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row', alignItems: 'center',
                            backgroundColor: themeColor,
                            borderRadius: scale(5),
                            padding: scale(5),
                        }}
                        onPress={() => {
                            trigger();
                            navigation.navigate('NewsTabbar', { screen: 'AboutPage' });
                        }}
                    >
                        <Ionicons name={'build'} size={verticalScale(15)} color={white} />
                        <Text style={{ ...uiStyle.defaultText, color: white, fontWeight: 'bold' }}>{t('設置')}</Text>
                    </TouchableOpacity>
                </View>
                {functionArr.map(fn_card => GetFunctionCard(fn_card.title, fn_card.fn))}
                <View style={{ marginHorizontal: scale(20), marginVertical: scale(10) }} />
            </ScrollView>

            <CustomBottomSheet ref={bottomSheetRef} page={'features'}>
                {renderBottomSheet()}
            </CustomBottomSheet>
        </View>
    );
}

export default Index;
