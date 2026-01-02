import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Image, Alert, StyleSheet, } from 'react-native';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../components/ThemeContext';
import { openLink } from '../../../utils/browser';
import HomeCard from './home/components/HomeCard';
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

import { scale, verticalScale } from 'react-native-size-matters';
import FastImage from 'react-native-fast-image';
import CookieManager from '@react-native-cookies/cookies';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart';
import { useTranslation } from 'react-i18next';

const IMG_WIDTH = scale(160);
const iconSize = verticalScale(25);

const AboutPage = () => {
    const { theme } = useTheme();
    const { black, themeColor, white, bg_color, themeColorUltraLight } = theme;
    const s = StyleSheet.create({
        highlightText: {
            fontSize: verticalScale(12),
            color: themeColor,
            fontWeight: '600',
        },
        bodyText: {
            ...uiStyle.defaultText,
            fontSize: verticalScale(12),
            color: black.third,
            marginTop: verticalScale(3),
        },
        buttonContainer: {
            marginLeft: scale(10),
            backgroundColor: themeColor,
            paddingHorizontal: scale(5),
            paddingVertical: verticalScale(3),
            borderRadius: scale(10),
        },
    });
    const { t, i18n } = useTranslation(['common', 'about']);

    return (
        <View style={{ flex: 1, backgroundColor: bg_color, alignItems: 'center' }}>
            <ScrollView showsVerticalScrollIndicator={true}>
                <View style={{
                    alignSelf: 'center',
                    alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'row',
                    marginTop: verticalScale(10),
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
                        fontSize: verticalScale(18),
                        color: themeColor,
                        fontWeight: 'bold',
                        marginLeft: verticalScale(5),
                    }}>
                        {t("ABOUT")} ARK ALL
                    </Text>
                </View>

                {/* 版本說明 */}
                <HomeCard>
                    {/* 應用版本號 */}
                    <Text style={{ ...s.bodyText }}>
                        {t("APP Version", { ns: 'about' })}
                        <Text style={{ ...s.highlightText }}>{packageInfo.version}</Text>
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', }}>
                        <Text style={{ ...s.bodyText }}>
                            {t('Language Setting', { ns: 'about' })}
                        </Text>
                        <TouchableOpacity
                            style={{
                                ...s.buttonContainer,
                                backgroundColor: i18n.language === 'tc' ? `${themeColor}15` : null,
                                borderWidth: verticalScale(1),
                                borderColor: themeColorUltraLight,
                            }}
                            onPress={() => {
                                trigger();
                                i18n.changeLanguage('tc');
                            }}
                            disabled={i18n.language === 'tc'}
                        >
                            <Text style={{ ...s.highlightText, color: i18n.language === 'tc' ? themeColor : black.third }}>中</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={{
                                ...s.buttonContainer,
                                backgroundColor: i18n.language === 'en' ? `${themeColor}15` : null,
                                borderWidth: verticalScale(1),
                                borderColor: themeColorUltraLight,
                            }}
                            onPress={() => {
                                trigger();
                                i18n.changeLanguage('en');
                            }}
                            disabled={i18n.language === 'en'}
                        >
                            <Text style={{ ...s.highlightText, color: i18n.language === 'en' ? themeColor : black.third }}>EN</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: black.third }}>
                        {`${t('圖片更新不及時？網站響應出錯？課表同步問題？', { ns: 'about' })}`}
                    </Text>
                    <TouchableOpacity
                        style={{
                            backgroundColor: `${themeColor}15`, borderRadius: scale(10),
                            padding: scale(5), marginTop: scale(5),
                        }}
                        activeOpacity={0.8}
                        onPress={() => {
                            trigger();
                            Alert.alert(
                                t('重要提示', { ns: 'about' }),
                                `${t('您可能需要重新加載圖片，會消耗流量！', { ns: 'about' })}\n${t('課表數據和版本將被還原，你需要再進行手動更新！', { ns: 'about' })}\n${t('將清除所有緩存並重啟，您確定繼續嗎？', { ns: 'about' })}`,
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
                        <Text style={{ ...s.highlightText, color: themeColor }}>
                            {`${t('清除APP內所有緩存（包括課表模擬與時間版本）', { ns: 'about' })}`}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{
                            backgroundColor: `${themeColor}15`, borderRadius: scale(10),
                            padding: scale(5), marginTop: scale(5),
                        }}
                        activeOpacity={0.8}
                        onPress={async () => {
                            trigger();
                            await CookieManager.clearAll();
                            Alert.alert('已清除Cookies');
                        }}>
                        <Text style={{ ...s.highlightText, color: themeColor }}>
                            {`${t('清除APP內Cookies', { ns: 'about' })}`}
                        </Text>
                    </TouchableOpacity>
                </HomeCard>

                {/* 提示資訊 */}
                <HomeCard>
                    <Text style={{ ...s.bodyText }}>
                        {t("ARK Describe 1", { ns: 'about' })}
                    </Text>
                    {/* 開源地址 */}
                    <View style={{ flexDirection: 'row', }}>
                        <Text style={{ ...s.bodyText }}>
                            {t("ARK Describe 4_1", { ns: 'about' })}
                            <Text style={{ ...s.highlightText }}
                                onPress={() => {
                                    trigger();
                                    openLink(GITHUB_PAGE);
                                }}
                            >
                                Github
                            </Text>
                            <Text style={{ ...s.bodyText }}>
                                {t("ARK Describe 4_2", { ns: 'about' })}
                            </Text>
                        </Text>
                    </View>
                    <Text style={{ ...s.bodyText }}>
                        {t("ARK Describe 5", { ns: 'about' })}
                    </Text>

                    {/* 官網 */}
                    <View style={{ flexDirection: 'row', marginTop: scale(5) }}>
                        <Text style={{ ...s.bodyText }}>
                            {t("Official Website", { ns: 'about' })}
                            <Text style={{ ...s.highlightText }} onPress={() => {
                                trigger();
                                openLink(BASE_HOST);
                            }}
                                selectable
                            >{BASE_HOST}</Text>
                        </Text>
                    </View>
                    {/* Email */}
                    <View style={{ flexDirection: 'row' }}>
                        <Text style={{ ...s.bodyText }}>
                            {`Email: `}
                            <Text style={{ ...s.highlightText }}
                                selectable
                                onPress={() => {
                                    trigger();
                                    Linking.openURL('mailto:' + MAIL);
                                }}
                            >{MAIL}</Text>
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => {
                            trigger();
                            openLink(GITHUB_DONATE);
                        }}
                        style={{ marginTop: scale(5) }}
                    >
                        <Text style={{ ...s.highlightText }}>{t("Donate", { ns: 'about' })}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            trigger();
                            openLink(GITHUB_UPDATE_PLAN);
                        }}
                        style={{ marginTop: scale(5) }}
                    >
                        <Text style={{ ...s.highlightText }}>{t("Issues", { ns: 'about' })}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            trigger();
                            openLink(GITHUB_ACTIVITY);
                        }}
                        style={{ marginTop: scale(5) }}
                    >
                        <Text style={{ ...s.highlightText }}>{t("Activity", { ns: 'about' })}</Text>
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
                        <Text style={{ ...s.highlightText }}>{`${t('ABOUT')} ARK ALL`}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                            trigger();
                            openLink(USUAL_Q);
                        }}>
                        <Text style={{ ...s.highlightText }}>{`${t("Common Issues", { ns: 'about' })}`}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                            trigger();
                            openLink(USER_AGREE);
                        }}>
                        <Text style={{ ...s.highlightText }}>{`${t("Privacy Policy & User Agreement", { ns: 'about' })}`}</Text>
                    </TouchableOpacity>
                </HomeCard>
            </ScrollView>
        </View >
    );
};

export default AboutPage;
