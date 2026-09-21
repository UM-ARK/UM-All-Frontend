// Web / 桌面版設置頁：Metro 在 web 平台自動優先選用 .web.js，手機端仍走 SettingPage.js。
// 只保留網頁用得上的項：外觀（主題、語言）、課程（課表模式、選咩課節點與入口）、
// 本機數據、關於與聯繫。Harbor 帳戶、檢查更新、系統設定、瀏覽器快取說明等純手機能力不掛。
// 手機端用 @expo/ui MenuView 做下拉，web 沒有原生實現，這裡一律改用 SegmentControl
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';

import Text from '../../components/AppText';
import { useTheme, uiStyle } from '../../components/ThemeContext';
import SegmentControl from '../../components/SegmentControl';
import { useProgrammeLevel } from '../../contexts/ProgrammeLevelContext';
import { PROGRAMME_LEVELS } from '../../utils/courseProgramme';
import { openLink } from '../../utils/browser';
import {
    getUmehHostPref,
    setUmehHostPref,
    refreshUmehHost,
    useUmehHost,
} from '../../utils/umehHost';
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
    ARK_APP_LINK,
} from '../../utils/pathMap';
import { useWindowSizeClass } from '../../utils/windowSizeClass';
import {
    SettingSection,
    SettingSectionCard,
    SettingItem,
} from './components/SettingPrimitives';
import appConfig from '../../../app.json';

/** 設置列表在寬屏下的最大寬度：單欄列表拉太寬會讓左側圖標與右側控件離得太遠 */
const SETTINGS_CONTENT_MAX_WIDTH = 720;

const UMEH_HOST_PREFS = ['auto', 'primary', 'backup'];

const SettingPage = () => {
    const { theme, themeMode, setThemeMode } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t, i18n } = useTranslation(['setting', 'common']);
    const { programmeLevel, setProgrammeLevel } = useProgrammeLevel();
    const { baseHost: umehHost } = useUmehHost();
    const { isCompact } = useWindowSizeClass();
    const [umehHostPref, setUmehHostPrefState] = useState('auto');

    useEffect(() => {
        getUmehHostPref().then(setUmehHostPrefState);
    }, []);

    const handleUmehHostPrefChange = useCallback(async pref => {
        await setUmehHostPref(pref);
        setUmehHostPrefState(pref);
        refreshUmehHost();
    }, []);

    /**
     * 清除瀏覽器中保存的 ARK ALL 數據後重新載入頁面。
     * RN web 的 Alert.alert 是空實現，這裡直接用瀏覽器原生 confirm
     */
    const handleClearCache = useCallback(async () => {
        const confirmed = window.confirm(
            `${t('setting:Clear Cache Confirm')}\n\n${t('setting:Clear Cache Web Message')}`,
        );
        if (!confirmed) {
            return;
        }
        await AsyncStorage.clear();
        window.location.reload();
    }, [t]);

    const themeOptions = [
        { key: 'system', label: t('setting:System') },
        { key: 'light', label: t('setting:Light') },
        { key: 'dark', label: t('setting:Dark') },
    ];
    const languageOptions = [
        { key: 'tc', label: '繁中' },
        { key: 'en', label: 'EN' },
    ];
    const languageIndex = i18n.language === 'en' ? 1 : 0;
    const programmeLevelOptions = [
        {
            key: PROGRAMME_LEVELS.undergraduate,
            label: t('setting:Undergraduate'),
        },
        {
            key: PROGRAMME_LEVELS.postgraduate,
            label: t('setting:Postgraduate'),
        },
    ];
    const programmeLevelIndex =
        programmeLevel === PROGRAMME_LEVELS.postgraduate ? 1 : 0;
    const umehHostPrefLabels = {
        auto: t('setting:Auto'),
        primary: 'umeh',
        backup: 'cf',
    };
    const umehHostPrefOptions = UMEH_HOST_PREFS.map(pref => ({
        key: pref,
        label: umehHostPrefLabels[pref],
    }));
    const umehHostPrefIndex = Math.max(
        0,
        UMEH_HOST_PREFS.indexOf(umehHostPref),
    );

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            <ScrollView
                contentContainerStyle={{
                    width: '100%',
                    maxWidth: SETTINGS_CONTENT_MAX_WIDTH,
                    alignSelf: 'center',
                    paddingTop: verticalScale(isCompact ? 12 : 24),
                }}>
                {/* Tab 頁沒有 Stack 頭，自帶頁標題 */}
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(22),
                        fontWeight: '700',
                        color: black.main,
                        marginHorizontal: scale(15),
                        marginBottom: verticalScale(4),
                    }}>
                    {t('setting:Settings')}
                </Text>

                {/* 外觀 */}
                <SettingSection
                    title={t('setting:Appearance')}
                    icon="color-palette"
                />
                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="sunny"
                        iconColor="#FF9500"
                        title={t('setting:Theme')}
                        subtitle={themeOptions[themeMode].label}
                        showArrow={false}
                        rightElement={
                            <SegmentControl
                                options={themeOptions}
                                selectedIndex={themeMode}
                                onChange={setThemeMode}
                            />
                        }
                    />
                    <SettingItem
                        grouped
                        icon="language"
                        iconColor="#5856D6"
                        title={t('setting:Language')}
                        subtitle={
                            i18n.language === 'tc' ? '繁體中文' : 'English'
                        }
                        showArrow={false}
                        rightElement={
                            <SegmentControl
                                options={languageOptions}
                                selectedIndex={languageIndex}
                                onChange={index =>
                                    i18n.changeLanguage(
                                        languageOptions[index].key,
                                    )
                                }
                            />
                        }
                    />
                </SettingSectionCard>

                {/* 課程 */}
                <SettingSection title={t('setting:Courses')} icon="school" />
                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="school-outline"
                        iconColor={themeColor}
                        title={t('setting:Programme Level')}
                        subtitle={
                            programmeLevelOptions[programmeLevelIndex].label
                        }
                        showArrow={false}
                        rightElement={
                            <SegmentControl
                                options={programmeLevelOptions}
                                selectedIndex={programmeLevelIndex}
                                onChange={index =>
                                    setProgrammeLevel(
                                        programmeLevelOptions[index].key,
                                    )
                                }
                                compact
                            />
                        }
                    />
                    <SettingItem
                        grouped
                        icon="globe-outline"
                        iconColor="#007AFF"
                        title={t('setting:What2Reg Host')}
                        subtitle={umehHostPrefLabels[umehHostPref]}
                        showArrow={false}
                        rightElement={
                            <SegmentControl
                                options={umehHostPrefOptions}
                                selectedIndex={umehHostPrefIndex}
                                onChange={index =>
                                    handleUmehHostPrefChange(
                                        UMEH_HOST_PREFS[index],
                                    )
                                }
                                compact
                            />
                        }
                    />
                    <SettingItem
                        grouped
                        icon="open-outline"
                        iconColor="#007AFF"
                        title={t('setting:Open What2Reg')}
                        subtitle={`${umehHost}\n${t('setting:選咩課和ARK是兩個獨立項目')}`}
                        onPress={() => openLink(umehHost)}
                    />
                </SettingSectionCard>

                {/* 本機數據 */}
                <SettingSection title={t('setting:Application')} icon="apps" />
                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="trash"
                        iconColor="#FF3B30"
                        title={t('setting:Clear Cache')}
                        onPress={handleClearCache}
                    />
                    <SettingItem
                        grouped
                        icon="phone-portrait-outline"
                        iconColor="#34C759"
                        title={t('setting:Get the App')}
                        subtitle={t('setting:Get the App Hint')}
                        onPress={() => openLink(ARK_APP_LINK)}
                    />
                </SettingSectionCard>

                {/* 關於 */}
                <SettingSection
                    title={t('setting:About')}
                    icon="information-circle"
                />
                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="globe"
                        iconColor={black.main}
                        title={t('setting:Version')}
                        subtitle={`Web v${appConfig.expo.version}`}
                        showArrow={false}
                    />
                    <SettingItem
                        grouped
                        icon="logo-github"
                        iconColor={black.second}
                        title={t('setting:Open Source')}
                        onPress={() => openLink(GITHUB_PAGE)}
                    />
                    <SettingItem
                        grouped
                        icon="help-circle"
                        iconColor="#007AFF"
                        title={t('setting:Common Issues')}
                        onPress={() => openLink(USUAL_Q)}
                    />
                    <SettingItem
                        grouped
                        icon="shield-checkmark"
                        iconColor="#5856D6"
                        title={t('setting:Privacy Policy')}
                        onPress={() => openLink(USER_AGREE)}
                    />
                    <SettingItem
                        grouped
                        icon="heart"
                        iconColor="#FF2D55"
                        title={t('setting:Donate')}
                        onPress={() => openLink(GITHUB_DONATE)}
                    />
                    <SettingItem
                        grouped
                        icon="pulse"
                        iconColor="#FF9500"
                        title={t('setting:Activity')}
                        onPress={() => openLink(GITHUB_ACTIVITY)}
                    />
                    <SettingItem
                        grouped
                        icon="school"
                        iconColor="#4796d6"
                        title={`${t('common:ABOUT')} ARK ALL`}
                        onPress={() => openLink(ARK_WIKI_ABOUT_ARK)}
                    />
                </SettingSectionCard>

                {/* 聯繫我們：web 端無 Harbor 登入，反饋只走 GitHub Issues */}
                <SettingSection title={t('setting:Contact')} icon="mail" />
                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="chatbubble-ellipses"
                        iconColor="#34C759"
                        title={t('setting:Feedback')}
                        subtitle={t('setting:GitHub Issues')}
                        onPress={() => openLink(GITHUB_UPDATE_PLAN)}
                    />
                    <SettingItem
                        grouped
                        icon="globe"
                        iconColor="#007AFF"
                        title={t('setting:Official Website')}
                        subtitle={BASE_HOST}
                        onPress={() => openLink(BASE_HOST)}
                    />
                    <SettingItem
                        grouped
                        icon="mail"
                        iconColor="#5856D6"
                        title={t('setting:Email')}
                        subtitle={MAIL}
                        onPress={() => Linking.openURL('mailto:' + MAIL)}
                    />
                </SettingSectionCard>

                <View style={{ height: verticalScale(30) }} />
            </ScrollView>
        </View>
    );
};

export default SettingPage;
