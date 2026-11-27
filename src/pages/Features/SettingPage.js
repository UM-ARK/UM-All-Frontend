import React, { useCallback } from 'react';
import {
    View,
    ScrollView,
    Linking,
    Alert,
    Platform,
} from 'react-native';
import { useTheme } from '../../components/ThemeContext';
import { useHarborSession } from '../../contexts/HarborSessionContext';
import { openLink } from '../../utils/browser';
import { trigger } from '../../utils/trigger';
// @expo/ui MenuView 用 SwiftUI Host + matchContents 反向量測，無明確寬度會塌陷。
import { MenuView } from '@expo/ui/community/menu';
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
    ARK_HARBOR_FEEDBACK_CATEGORY_ID,
    ARK_HARBOR_FEEDBACK_CATEGORY_SLUG,
} from '../../utils/pathMap';
import { verticalScale } from 'react-native-size-matters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { useTranslation } from 'react-i18next';
import { useProgrammeLevel } from '../../contexts/ProgrammeLevelContext';
import { PROGRAMME_LEVELS } from '../../utils/courseProgramme';
import {
    fetchAppInfoFromServer,
    getLocalAppVersion,
    isLocalAppOlderThanServer,
    showAppStoreUpdateAlert,
} from '../../utils/appUpdateKits';
import {
    SettingSection,
    SettingSectionCard,
    SettingItem,
    SettingSegmentControl,
} from './components/SettingPrimitives';
import SettingReduceMotionItem from './components/SettingReduceMotionItem';

/**
 * 設置頁面主元件
 * @param {Object} navigation - 導航對象
 */
const SettingPage = ({ navigation }) => {
    const { theme, themeMode, setThemeMode } = useTheme();
    const { bg_color, black, themeColor, featureIconTones } = theme;
    const { t, i18n } = useTranslation(['setting', 'about', 'common', 'my']);
    const { status, user, login } = useHarborSession();
    const { programmeLevel, setProgrammeLevel } = useProgrammeLevel();

    /**
     * 處理主題變更
     * @param {number} index - 主題模式索引（0:系統, 1:淺色, 2:深色）
     */
    const handleThemeChange = async index => {
        await setThemeMode(index);
    };

    /**
     * 顯示 Harbor 操作錯誤
     * @param {Object} sessionError - Harbor session 錯誤
     */
    const presentHarborError = useCallback(
        sessionError => {
            if (!sessionError) {
                return;
            }

            const message =
                sessionError.code === 'HARBOR_SESSION_EXPIRED'
                    ? t('Harbor 登入已失效，請重新登入。', { ns: 'my' })
                    : t('無法完成 Harbor 操作，請稍後再試。', { ns: 'my' });
            Alert.alert(
                t('Harbor 操作失敗', { ns: 'my' }),
                message,
                [
                    {
                        text: t('確定', { ns: 'my' }),
                        onPress: () => trigger(),
                    },
                ],
                { cancelable: false },
            );
        },
        [t],
    );

    /**
     * 開啟 Harbor 論壇反饋發帖頁
     */
    const openHarborFeedbackComposer = useCallback(() => {
        navigation.navigate('HarborComposer', {
            mode: 'newTopic',
            categoryId: ARK_HARBOR_FEEDBACK_CATEGORY_ID,
            categorySlug: ARK_HARBOR_FEEDBACK_CATEGORY_SLUG,
        });
    }, [navigation]);

    /**
     * 問題反饋 Menu：論壇反饋 / GitHub Issues
     * @param {Object} event - MenuView onPressAction 事件
     */
    const handleFeedbackAction = event => {
        trigger();
        switch (event.nativeEvent.event) {
            case 'harbor':
                if (status === 'signedIn') {
                    openHarborFeedbackComposer();
                    break;
                }
                Alert.alert(
                    t('需要登入 Harbor', { ns: 'my' }),
                    t('登入後即可在論壇提交反饋。', { ns: 'my' }),
                    [
                        {
                            text: t('取消'),
                            style: 'cancel',
                            onPress: () => trigger(),
                        },
                        {
                            text: t('登入 Harbor', { ns: 'my' }),
                            onPress: async () => {
                                trigger();
                                try {
                                    const signedIn = await login({
                                        routeName: 'HarborComposer',
                                        params: {
                                            mode: 'newTopic',
                                            categoryId:
                                                ARK_HARBOR_FEEDBACK_CATEGORY_ID,
                                            categorySlug:
                                                ARK_HARBOR_FEEDBACK_CATEGORY_SLUG,
                                        },
                                    });
                                    if (signedIn) {
                                        openHarborFeedbackComposer();
                                    }
                                } catch (sessionError) {
                                    presentHarborError(sessionError);
                                }
                            },
                        },
                    ],
                    { cancelable: true },
                );
                break;
            case 'github':
                openLink(GITHUB_UPDATE_PLAN);
                break;
            default:
                break;
        }
    };

    /**
     * 處理語言變更
     * @param {string} lang - 語言代碼（'tc' 或 'en'）
     */
    const handleLanguageChange = lang => {
        i18n.changeLanguage(lang);
    };

    /**
     * 處理清除緩存操作
     * 顯示確認對話框，確認後清除所有本地數據並重啟應用
     */
    const handleClearCache = () => {
        Alert.alert(
            t('setting:Clear Cache Confirm'),
            t('setting:Clear Cache Message'),
            [
                {
                    text: t('setting:Cancel'),
                    style: 'cancel',
                    onPress: () => trigger(),
                },
                {
                    text: t('setting:Confirm'),
                    style: 'destructive',
                    onPress: async () => {
                        trigger();
                        await AsyncStorage.clear();
                        reloadAppAsync();
                    },
                },
            ],
        );
    };

    /**
     * 顯示目前平台的系統瀏覽器快取清除方法
     */
    const handleBrowserCacheHelp = () => {
        Alert.alert(
            t('setting:Browser Cache Help'),
            t(
                Platform.OS === 'android'
                    ? 'setting:Android Browser Cache Message'
                    : 'setting:iOS Browser Cache Message',
            ),
        );
    };

    /**
     * 向伺服器查詢 app_version，若有新版本則與首頁相同方式 Alert 並可跳轉商店／官網
     */
    const handleCheckUpdate = useCallback(async () => {
        trigger();
        const result = await fetchAppInfoFromServer();
        if (!result.ok) {
            Alert.alert(
                t('setting:Check Update'),
                t('setting:Check Update Error'),
            );
            return;
        }
        if (isLocalAppOlderThanServer(result.content)) {
            showAppStoreUpdateAlert(result.content);
        } else {
            Alert.alert(t('setting:Check Update'), t('setting:Latest Version'));
        }
    }, [t]);

    // 主題選項配置
    const themeOptions = [
        { key: 'system', label: t('setting:System') },
        { key: 'light', label: t('setting:Light') },
        { key: 'dark', label: t('setting:Dark') },
    ];

    // 語言選項
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
    const programmeLevelIndex = programmeLevel === PROGRAMME_LEVELS.postgraduate
        ? 1
        : 0;

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            <ScrollView contentInsetAdjustmentBehavior="automatic">
                {status === 'signedIn' && user ? (
                    <>
                        <SettingSection
                            title="Harbor"
                            icon="user-circle"
                        />

                        <SettingSectionCard>
                            <SettingItem
                                grouped
                                icon="user-circle"
                                iconColor={themeColor}
                                title={t('帳戶設定', { ns: 'my' })}
                                subtitle={`@${user.username}`}
                                onPress={() =>
                                    navigation.navigate(
                                        'HarborAccountSettings',
                                    )
                                }
                            />
                        </SettingSectionCard>
                    </>
                ) : null}

                {/* 外觀設置分區 */}
                <SettingSection
                    title={t('setting:Appearance')}
                    icon="palette"
                />

                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="sun"
                        iconColor={featureIconTones.orange.foreground}
                        title={t('setting:Theme')}
                        subtitle={themeOptions[themeMode].label}
                        showArrow={false}
                        rightElement={
                            <SettingSegmentControl
                                options={themeOptions}
                                selectedIndex={themeMode}
                                onChange={handleThemeChange}
                            />
                        }
                    />
                    <SettingItem
                        grouped
                        icon="translate"
                        iconColor={featureIconTones.blue.foreground}
                        title={t('setting:Language')}
                        subtitle={
                            i18n.language === 'tc' ? '繁體中文' : 'English'
                        }
                        showArrow={false}
                        rightElement={
                            <SettingSegmentControl
                                options={languageOptions}
                                selectedIndex={languageIndex}
                                onChange={index =>
                                    handleLanguageChange(
                                        languageOptions[index].key,
                                    )
                                }
                            />
                        }
                    />
                    <SettingReduceMotionItem />
                </SettingSectionCard>

                <SettingSection title={t('setting:Courses')} icon="graduation-cap" />

                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="graduation-cap"
                        iconColor={themeColor}
                        title={t('setting:Programme Level')}
                        subtitle={programmeLevelOptions[programmeLevelIndex].label}
                        showArrow={false}
                        rightElement={
                            <SettingSegmentControl
                                options={programmeLevelOptions}
                                selectedIndex={programmeLevelIndex}
                                onChange={index =>
                                    setProgrammeLevel(
                                        programmeLevelOptions[index].key,
                                    )
                                }
                            />
                        }
                    />
                </SettingSectionCard>

                {/* 應用設置分區 */}
                <SettingSection title={t('setting:Application')} icon="grid" />

                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="trash"
                        iconColor={featureIconTones.pink.foreground}
                        title={t('setting:Clear Cache')}
                        onPress={handleClearCache}
                    />
                    <SettingItem
                        grouped
                        icon="globe"
                        iconColor={themeColor}
                        title={t('setting:Browser Cache Help')}
                        subtitle={t('setting:Browser Cache Help Hint')}
                        onPress={handleBrowserCacheHelp}
                    />
                    <SettingItem
                        grouped
                        icon="cloud-arrow-down"
                        iconColor={featureIconTones.green.foreground}
                        title={t('setting:Check Update')}
                        subtitle={`v${getLocalAppVersion()}`}
                        onPress={handleCheckUpdate}
                    />
                    <SettingItem
                        grouped
                        icon="gear"
                        iconColor={featureIconTones.blue.foreground}
                        title={t('setting:App Settings')}
                        subtitle={t('setting:App Settings Hint')}
                        onPress={() => Linking.openSettings()}
                    />
                </SettingSectionCard>

                {/* 關於分區 */}
                <SettingSection
                    title={t('setting:About')}
                    icon="info"
                />

                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon={
                            Platform.OS === 'android'
                                ? 'android-logo'
                                : 'apple-logo'
                        }
                        iconColor={black.main}
                        title={t('setting:Version')}
                        subtitle={`v${getLocalAppVersion()}`}
                        showArrow={false}
                    />
                    <SettingItem
                        grouped
                        icon="github-logo"
                        iconColor={black.second}
                        title={t('setting:Open Source')}
                        onPress={() => {
                            trigger();
                            openLink(GITHUB_PAGE);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="help-circle"
                        iconColor={featureIconTones.blue.foreground}
                        title={t('setting:Common Issues')}
                        onPress={() => {
                            trigger();
                            openLink(USUAL_Q);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="shield"
                        iconColor={featureIconTones.blue.foreground}
                        title={t('setting:Privacy Policy')}
                        onPress={() => {
                            trigger();
                            openLink(USER_AGREE);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="heart"
                        iconColor={featureIconTones.pink.foreground}
                        title={t('setting:Donate')}
                        onPress={() => {
                            trigger();
                            openLink(GITHUB_DONATE);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="pulse"
                        iconColor={featureIconTones.orange.foreground}
                        title={t('setting:Activity')}
                        onPress={() => {
                            trigger();
                            openLink(GITHUB_ACTIVITY);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="graduation-cap"
                        iconColor={featureIconTones.blue.foreground}
                        title={`${t('common:ABOUT')} ARK ALL`}
                        onPress={() => {
                            trigger();
                            openLink(ARK_WIKI_ABOUT_ARK);
                        }}
                    />
                </SettingSectionCard>

                {/* 聯繫我們分區 */}
                <SettingSection title={t('setting:Contact')} icon="envelope" />

                <SettingSectionCard>
                    <MenuView
                        actions={[
                            {
                                id: 'harbor',
                                title: t('setting:Forum Feedback'),
                                image: 'bubble.left.and.bubble.right',
                                imageColor: themeColor,
                                titleColor: themeColor,
                            },
                            {
                                id: 'github',
                                title: t('setting:GitHub Issues'),
                                image: 'chevron.left.forwardslash.chevron.right',
                                imageColor: themeColor,
                                titleColor: themeColor,
                            },
                        ]}
                        onOpenMenu={() => trigger()}
                        onPressAction={handleFeedbackAction}
                        shouldOpenOnLongPress={false}
                        style={{ width: '100%' }}>
                        <SettingItem
                            grouped
                            icon="message-circle"
                            iconColor={featureIconTones.green.foreground}
                            title={t('setting:Feedback')}
                        />
                    </MenuView>
                    <SettingItem
                        grouped
                        icon="globe"
                        iconColor={featureIconTones.blue.foreground}
                        title={t('setting:Official Website')}
                        subtitle={BASE_HOST}
                        onPress={() => {
                            trigger();
                            openLink(BASE_HOST);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="envelope"
                        iconColor={featureIconTones.blue.foreground}
                        title={t('setting:Email')}
                        subtitle={MAIL}
                        onPress={() => {
                            trigger();
                            Linking.openURL('mailto:' + MAIL);
                        }}
                    />
                </SettingSectionCard>

                {/* 底部間距 */}
                <View style={{ height: verticalScale(30) }} />
            </ScrollView>
        </View>
    );
};

export default SettingPage;
