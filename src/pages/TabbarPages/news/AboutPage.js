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

import { setLanguage } from '../../../i18n/i18n';
import { COLOR_DIY, uiStyle } from '../../../utils/uiMap';
import { openLink } from '../../../utils/browser';
import HomeCard from '../home/components/HomeCard';
import {
    USUAL_Q,
    USER_AGREE,
    BASE_HOST,
    MAIL,
    GITHUB_PAGE,
    GITHUB_DONATE,
    GITHUB_UPDATE_PLAN,
    ARK_WIKI_ABOUT_ARK,
    GITHUB_ACTIVITY,
} from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import packageInfo from '../../../../package.json';
import coursePlanFile from "../../../static/UMCourses/coursePlan";
import offerCourseFile from "../../../static/UMCourses/offerCourses";

import { scale } from 'react-native-size-matters';
import FastImage from 'react-native-fast-image';
import CookieManager from '@react-native-cookies/cookies';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart';
import { t } from 'i18next';

const { black, themeColor, white, } = COLOR_DIY;
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
                        }}>{
                                t("ABOUT")
                            } ARK ALL</Text>
                    </View>

                    {/* 版本說明 */}
                    <HomeCard>
                        {/* 應用版本號 */}
                        <Text style={{ ...s.bodyText, }}>
                            {t("APP Version", { ns: 'about' })}
                            <Text style={{ ...s.highlightText }}>{packageInfo.version}</Text>
                        </Text>

                        {/* 課表數據版本號 */}
                        <Text style={{ ...s.bodyText, }}>
                            {t('Add Drop Data Version', { ns: 'about' })}
                            <Text style={{ ...s.highlightText }}>{coursePlanFile.updateTime}</Text>
                        </Text>
                        <Text style={{ ...s.bodyText, }}>
                            {t('PreEnroll Data Version', { ns: 'about' })}
                            <Text style={{ ...s.highlightText }}>{offerCourseFile.updateTime}</Text>
                        </Text>

                        <View style={{ flexDirection: 'row', }}>
                            <Text style={{ ...s.bodyText, }}>
                                {t('Language Setting', { ns: 'about' })}
                            </Text>
                            <TouchableOpacity
                                style={{ marginLeft: scale(10), }}
                                onPress={() => {
                                    setLanguage('tc');
                                }}
                            >
                                <Text style={{ ...s.highlightText }}>中</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={{ marginLeft: scale(10), }}
                                onPress={() => {
                                    setLanguage('en');
                                }}
                            >
                                <Text style={{ ...s.highlightText }}>EN</Text>
                            </TouchableOpacity>
                        </View>
                    </HomeCard>

                    {/* 提示資訊 */}
                    <HomeCard>
                        <Text style={{ ...s.bodyText, }}>
                            {t("ARK Describe 1", { ns: 'about' })}
                        </Text>
                        <View style={{ alignItems: 'center', flexDirection: 'row', }}>
                            <Text style={{ ...s.bodyText, }}>
                                {t("ARK Describe 4_1", { ns: 'about' })}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    trigger();
                                    openLink(GITHUB_PAGE);
                                }}
                            >
                                <Text style={{ ...s.highlightText }}>{`Github`}</Text>
                            </TouchableOpacity>
                            <Text style={{ ...s.bodyText }}>
                                {t("ARK Describe 4_2", { ns: 'about' })}
                            </Text>
                        </View>
                        <Text style={{ ...s.bodyText, }}>
                            {t("ARK Describe 5", { ns: 'about' })}
                        </Text>

                        <View style={{ alignItems: 'center', flexDirection: 'row', marginTop: scale(5), }}>
                            <Text style={{ ...s.bodyText, }}>
                                {t("Official Website", { ns: 'about' })}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    trigger();
                                    openLink(BASE_HOST);
                                }}
                            >
                                <Text style={{ ...s.highlightText, }}>{BASE_HOST}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={{ alignItems: 'center', flexDirection: 'row', }}>
                            <Text style={{ ...s.bodyText, }}>
                                {`Email: `}
                            </Text>
                            <TouchableOpacity
                                onPress={() => {
                                    trigger();
                                    Linking.openURL('mailto:' + MAIL);
                                }}>
                                <Text style={{ ...s.highlightText, }}>{MAIL}</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                trigger();
                                openLink(GITHUB_DONATE);
                            }}
                            style={{ marginTop: scale(5), }}
                        >
                            <Text
                                style={{ ...s.highlightText, }}>{t("Donate", { ns: 'about' })}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                trigger();
                                openLink(GITHUB_UPDATE_PLAN);
                            }}
                            style={{ marginTop: scale(5), }}
                        >
                            <Text style={{ ...s.highlightText, }}>{t("Issues", { ns: 'about' })}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                trigger();
                                openLink(GITHUB_ACTIVITY);
                            }}
                            style={{ marginTop: scale(5), }}
                        >
                            <Text style={{ ...s.highlightText, }}>{t("Activity", { ns: 'about' })}</Text>
                        </TouchableOpacity>
                    </HomeCard>

                    {/* 其他提示 */}
                    <HomeCard>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                trigger();
                                openLink(ARK_WIKI_ABOUT_ARK);
                            }}>
                            <Text style={{ ...s.highlightText, }}>{`關於ARK ALL`}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                trigger();
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
                                trigger();
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
                                trigger();
                                Alert.alert(
                                    "關鍵操作!!",
                                    `將清除所有緩存並重啟，您確定繼續嗎？`,
                                    [
                                        {
                                            text: "Yes",
                                            onPress: async () => {
                                                trigger();
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
                                                trigger();
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