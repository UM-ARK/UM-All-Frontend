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
import { openLink } from '../../../utils/browser';
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
const iconSize = scale(25);

export default class AboutPage extends Component {

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color, alignItems: 'center' }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={{
                        alignSelf: 'center',
                        alignItems: 'center', justifyContent: 'center',
                        flexDirection: 'row',
                        marginTop: scale(10),
                    }}>
                        {/* ARK Logo */}
                        <FastImage
                            source={require('../../../static/img/logo.png')}
                            style={{
                                height: iconSize, width: iconSize,
                                borderRadius: scale(5),
                            }}
                        />
                        <Text style={{
                            fontSize: scale(18),
                            color: themeColor,
                            fontWeight: 'bold',
                            marginLeft: scale(5),
                        }}>關於 ARK ALL</Text>
                    </View>

                    {/* 版本說明 */}
                    <HomeCard>
                        {/* TODO: 應用版本號 */}
                        {/* TODO: 課表數據版本號 */}
                    </HomeCard>

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
                                    openLink(GITHUB_PAGE);
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
                                    openLink(BASE_HOST);
                                }}
                            >
                                <Text style={{ ...s.highlightText, }}>{BASE_HOST}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                openLink(GITHUB_UPDATE_PLAN);
                            }}
                        >
                            <Text style={{ ...s.highlightText, }}>更新計劃、問題區</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                openLink(GITHUB_DONATE);
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
                                // let webview_param = {
                                //     url: ARK_WIKI_ABOUT_ARK,
                                //     title: 'ARK Wiki',
                                //     text_color: black.main,
                                //     bg_color_diy: wiki_bg_color,
                                //     isBarStyleBlack: true,
                                // };
                                // this.props.navigation.navigate('Webviewer', webview_param);
                                openLink(ARK_WIKI_ABOUT_ARK);
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
                                // let webview_param = {
                                //     url: USUAL_Q,
                                //     title: 'ARK ALL常見問題',
                                // };
                                // this.props.navigation.navigate(
                                //     'Webviewer',
                                //     webview_param,
                                // );
                                openLink(USUAL_Q);
                            }}>
                            <Text style={{ ...s.highlightText, }}>{`ARK ALL常見問題`}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                // let webview_param = {
                                //     url: USER_AGREE,
                                //     title: 'ARK ALL 隱私政策 & 用戶協議',
                                // };
                                // this.props.navigation.navigate(
                                //     'Webviewer',
                                //     webview_param,
                                // );
                                openLink(USER_AGREE);
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
                            {`圖片更新不及時？網站響應出錯？\n‼️:您已登錄的界面可能會退出登錄\n‼️:您可能需要重新加載圖片，會消耗流量\n‼️:瀏覽器選項卡問題可以前往對應瀏覽器清除緩存~`}
                        </Text>
                        <TouchableOpacity
                            style={{
                                backgroundColor: themeColor,
                                borderRadius: scale(10),
                                padding: scale(5),
                                marginTop: scale(5),
                                width: scale(215),
                            }}
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
                                            style: 'destructive',
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
                            <Text style={{ ...s.highlightText, color: white, }}>
                                {`點我：清除APP內的圖片和Web緩存`}
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