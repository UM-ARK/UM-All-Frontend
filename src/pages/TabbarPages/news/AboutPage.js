import React, { Component } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Linking,
    Image,
    Alert,
    StyleSheet,
} from 'react-native';

import { COLOR_DIY, uiStyle } from '../../../utils/uiMap';
import HomeCard from '../home/components/HomeCard';
import {
    UM_WHOLE,
    WHAT_2_REG,
    NEW_SCZN,
    USUAL_Q,
    USER_AGREE,
    BASE_HOST,
    ARK_LETTER_IMG,
    UMALL_LOGO,
    BASE_URI,
    GET,
    addHost,
    MAIL,
    GITHUB_PAGE,
    GITHUB_DONATE,
    GITHUB_UPDATE_PLAN,
    ARK_WIKI_ABOUT_ARK,
} from '../../../utils/pathMap';

import { scale } from 'react-native-size-matters';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import FastImage from 'react-native-fast-image';
import CookieManager from '@react-native-cookies/cookies';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart';

const { black, themeColor, secondThemeColor, white, wiki_bg_color } = COLOR_DIY;
const IMG_WIDTH = scale(160);

export default class AboutPage extends Component {

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color, alignItems: 'center' }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{
                            fontSize: scale(18),
                            color: themeColor,
                            fontWeight: 'bold',
                            marginTop: scale(10),
                        }}>關於 ARK ALL</Text>
                    </View>

                    {/* 提示資訊 */}
                    <HomeCard>
                        <Text style={{ ...s.bodyText, }}>
                            {`ARK ALL源自FST同學為愛發電，並非官方應用程式！`}
                        </Text>
                        <Text style={{ ...s.bodyText, }}>
                            {`ARK ALL並非澳大官方應用‼️`}
                        </Text>
                        <Text style={{ ...s.bodyText, }}>
                            {`ARK ALL is not an official APP of UM‼️`}
                        </Text>
                        <Text style={{ ...s.bodyText, }}>
                            {`感謝您的認可和使用 ♪(･ω･)ﾉ`}
                        </Text>
                        <View style={{ alignItems: 'center', flexDirection: 'row', }}>
                            <Text style={{ ...s.bodyText, }}>
                                {`本軟件在 `}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('soft');
                                    Linking.openURL(GITHUB_PAGE);
                                }}
                            >
                                <Text style={{ ...s.highlightText }}>{`Github`}</Text>
                            </TouchableOpacity>
                            <Text style={{ ...s.bodyText }}>
                                {` 開源，歡迎給個Star!!✨✨`}
                            </Text>
                        </View>
                        <Text style={{ ...s.bodyText, }}>
                            {`歡迎澳大同學齊來建造ARK！`}
                        </Text>
                        <View style={{ alignItems: 'center', flexDirection: 'row', }}>
                            <Text style={{ ...s.bodyText, }}>
                                {`立即通過Email聯繫我們：`}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('soft');
                                    Linking.openURL('mailto:' + MAIL);
                                }}>
                                <Text style={{ ...s.highlightText, }}>{MAIL}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ alignItems: 'center', flexDirection: 'row', }}>
                            <Text style={{ ...s.bodyText, }}>
                                {`訪問我們的官網：`}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('soft');
                                    Linking.openURL(BASE_HOST);
                                }}
                            >
                                <Text style={{ ...s.highlightText, }}>{BASE_HOST}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                Linking.openURL(GITHUB_UPDATE_PLAN);
                            }}
                        >
                            <Text style={{ ...s.highlightText, }}>更新計劃、問題區</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                Linking.openURL(GITHUB_DONATE);
                            }}
                        >
                            <Text
                                style={{ ...s.highlightText, }}>Donate/捐贈/贊助/支持我們！</Text>
                        </TouchableOpacity>
                    </HomeCard>

                    {/* 其他提示 */}
                    <HomeCard>
                        <Text style={{ ...s.bodyText, }}>
                            您可能想先了解：
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                let webview_param = {
                                    url: ARK_WIKI_ABOUT_ARK,
                                    title: 'ARK Wiki',
                                    text_color: black.main,
                                    bg_color_diy: wiki_bg_color,
                                    isBarStyleBlack: true,
                                };
                                this.props.navigation.navigate('Webviewer', webview_param);
                            }}>
                            <Text style={{ ...s.highlightText, }}>{`這個APP是?`}</Text>
                        </TouchableOpacity>

                        <Text style={{ ...s.bodyText, }}>
                            您可能還有很多疑問...
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                let webview_param = {
                                    url: USUAL_Q,
                                    title: 'ARK ALL常見問題',
                                };
                                this.props.navigation.navigate(
                                    'Webviewer',
                                    webview_param,
                                );
                            }}>
                            <Text style={{ ...s.highlightText, }}>{`ARK ALL常見問題`}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                let webview_param = {
                                    url: USER_AGREE,
                                    title: 'ARK ALL 隱私政策 & 用戶協議',
                                };
                                this.props.navigation.navigate(
                                    'Webviewer',
                                    webview_param,
                                );
                            }}>
                            <Text style={{ ...s.highlightText }}>{`ARK ALL 隱私政策 & 用戶協議`}</Text>
                        </TouchableOpacity>
                    </HomeCard>

                    {/* 清除緩存 */}
                    <HomeCard>
                        <Text style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(12),
                            color: black.third
                        }}>
                            {`圖片更新不及時？網站響應出錯？`}
                        </Text>
                        <Text style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(12),
                            color: black.third
                        }}>
                            {`‼️:您已登錄的界面可能會退出登錄`}
                        </Text>
                        <Text style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(12),
                            color: black.third
                        }}>
                            {`‼️:您可能需要重新加載圖片，會消耗流量`}
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                Alert.alert(
                                    "關鍵操作!!",
                                    `將清除所有緩存並重啟，您確定繼續嗎？`,
                                    [
                                        {
                                            text: "Yes",
                                            onPress: async () => {
                                                ReactNativeHapticFeedback.trigger('soft');
                                                await FastImage.clearDiskCache();
                                                await FastImage.clearMemoryCache();
                                                await CookieManager.clearAll();
                                                await AsyncStorage.clear();
                                                RNRestart.Restart();
                                                Alert.alert('已清除所有緩存');
                                            },
                                        },
                                        {
                                            text: "No",
                                            onPress: () => {
                                                ReactNativeHapticFeedback.trigger('soft');
                                            }
                                        },
                                    ]
                                );

                            }}>
                            <Text style={{ ...s.highlightText }}>
                                {`清除圖片和Web緩存`}
                            </Text>
                        </TouchableOpacity>
                    </HomeCard>

                    {/* 請喝咖啡 */}
                    {false && (
                        <HomeCard>
                            <Text style={{ ...s.bodyText, color: black.third }}>
                                {`為愛發電ing`}
                            </Text>
                            <Text style={{ ...s.bodyText, color: black.third }}>
                                {`請開發者團隊喝杯咖啡QAQ`}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                                <View>
                                    <Image
                                        source={require('../../../static/img/donate/boc.jpg')}
                                        style={{
                                            width: IMG_WIDTH,
                                            height: IMG_WIDTH,
                                        }}
                                    />
                                    <Text style={{ ...s.bodyText, color: black.third, alignSelf: 'center' }}>
                                        {`中銀`}
                                    </Text>
                                </View>
                                <View>
                                    <Image
                                        source={require('../../../static/img/donate/mpay.jpg')}
                                        style={{
                                            width: IMG_WIDTH - 15,
                                            height: IMG_WIDTH - 15,
                                        }}
                                    />
                                    <Text style={{ ...s.bodyText, color: black.third, alignSelf: 'center' }}>
                                        {`Mpay`}
                                    </Text>
                                </View>
                            </View>
                            <Text style={{ ...s.bodyText, color: black.third, alignSelf: 'center' }}>
                                {`如有捐贈，請留下您的暱稱和對本軟件的評價，我們可以在版本更新中留下您的足跡！`}
                            </Text>
                        </HomeCard>
                    )}
                </ScrollView>
            </View >
        );
    }
}

const s = StyleSheet.create({
    highlightText: {
        fontSize: scale(12),
        color: themeColor,
        fontWeight: '600',
    },
    bodyText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        color: black.third,
        marginTop: scale(3),
    },
})