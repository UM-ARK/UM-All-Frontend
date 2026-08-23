import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
    Platform,
} from 'react-native';
import Text from '../../components/AppText';
import { useTheme, uiStyle } from '../../components/ThemeContext';
import { useHarborSession } from '../../contexts/HarborSessionContext';
import { openLink } from '../../utils/browser';
import { trigger } from '../../utils/trigger';
import { setLocalStorage } from '../../utils/storageKits';
import {
    getUmehHostPref,
    setUmehHostPref,
    refreshUmehHost,
    getUmehOpenPref,
    setUmehOpenPref,
} from '../../utils/umehHost';
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
import { scale, verticalScale } from 'react-native-size-matters';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { useTranslation } from 'react-i18next';
import Ionicons from "@react-native-vector-icons/ionicons";
import SegmentControl from '../../components/SegmentControl';
import { useProgrammeLevel } from '../../contexts/ProgrammeLevelContext';
import { PROGRAMME_LEVELS } from '../../utils/courseProgramme';
import {
    fetchAppInfoFromServer,
    getLocalAppVersion,
    isLocalAppOlderThanServer,
    showAppStoreUpdateAlert,
} from '../../utils/appUpdateKits';

/**
 * 同一分區內多個設置項的容器：單一圓角卡片；項間分隔與功能頁卡片標題底線相同（bg_color、verticalScale(2)）
 * @param {React.ReactNode} children - 子節點（通常為多個 SettingItem，需傳 grouped）
 */
const SettingSectionCard = ({ children }) => {
    const { theme } = useTheme();
    const { white, bg_color } = theme;
    const items = React.Children.toArray(children).filter(Boolean);

    return (
        <View
            style={{
                marginHorizontal: scale(15),
                marginBottom: verticalScale(4),
                borderRadius: scale(16),
                backgroundColor: white,
                overflow: 'hidden',
            }}>
            {items.map((child, index) => (
                <React.Fragment key={index}>
                    {index > 0 ? (
                        <View
                            style={{
                                height: verticalScale(2),
                                width: '100%',
                                backgroundColor: bg_color,
                            }}
                        />
                    ) : null}
                    {child}
                </React.Fragment>
            ))}
        </View>
    );
};

/**
 * 設置分區標題元件
 * @param {string} title - 分區標題文字
 * @param {string} icon - Ionicons 圖標名稱
 */
const SettingSection = ({ title, icon }) => {
    const { theme } = useTheme();
    const { black } = theme;

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginHorizontal: scale(15),
                marginTop: verticalScale(12),
                marginBottom: verticalScale(6),
            }}>
            {icon && (
                <Ionicons
                    name={icon}
                    size={scale(14)}
                    color={black.third}
                    style={{ marginRight: scale(6) }}
                />
            )}
            <Text
                style={{
                    ...uiStyle.defaultText,
                    fontSize: scale(12),
                    fontWeight: '600',
                    color: black.third,
                    textTransform: 'uppercase',
                    letterSpacing: scale(0.5),
                }}>
                {title}
            </Text>
        </View>
    );
};

/**
 * 基礎設置項目元件
 * @param {string} icon - Ionicons 圖標名稱
 * @param {string} iconColor - 圖標顏色
 * @param {string} title - 項目標題
 * @param {string} subtitle - 項目副標題（可選）
 * @param {Function} onPress - 點擊回調函數
 * @param {ReactNode} rightElement - 右側自定義元素（可選）
 * @param {boolean} showArrow - 是否顯示右箭頭，默認為 true
 * @param {boolean} grouped - 是否置於 SettingSectionCard 內（共用外層圓角）
 */
const SettingItem = ({
    icon,
    iconColor,
    title,
    subtitle,
    onPress,
    rightElement,
    showArrow = true,
    grouped = false,
}) => {
    const { theme } = useTheme();
    const { white, black } = theme;
    // 無 onPress 時用 View，供 MenuView 作為觸發錨點（避免內層 Touchable 搶手勢）
    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container
            {...(onPress
                ? {
                    onPress: () => {
                        trigger();
                        onPress();
                    },
                    activeOpacity: 0.7,
                }
                : {})}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: white,
                paddingHorizontal: scale(15),
                paddingVertical: verticalScale(12),
                ...(grouped
                    ? {}
                    : {
                        borderRadius: scale(16),
                        marginHorizontal: scale(15),
                        marginBottom: verticalScale(8),
                    }),
            }}>
            {/* 圖標 */}
            {icon && (
                <View
                    style={{
                        width: scale(32),
                        height: scale(32),
                        borderRadius: scale(12),
                        backgroundColor: `${iconColor}15`,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: scale(12),
                    }}>
                    <Ionicons name={icon} size={scale(18)} color={iconColor} />
                </View>
            )}

            {/* 內容 */}
            <View style={{ flex: 1 }}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(14),
                        fontWeight: '500',
                        color: black.main,
                    }}>
                    {title}
                </Text>
                {subtitle && (
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(11),
                            color: black.third,
                            marginTop: verticalScale(2),
                        }}>
                        {subtitle}
                    </Text>
                )}
            </View>

            {/* 右側元素 */}
            {rightElement}

            {/* 箭頭 */}
            {showArrow && (
                <Ionicons
                    name="chevron-forward"
                    size={scale(18)}
                    color={black.third}
                    style={{ marginLeft: scale(8) }}
                />
            )}
        </Container>
    );
};

/**
 * 設置頁面主元件
 * @param {Object} navigation - 導航對象
 */
const SettingPage = ({ navigation }) => {
    const { theme, themeMode, setThemeMode } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t, i18n } = useTranslation(['setting', 'about', 'common', 'my']);
    const { status, user, login } = useHarborSession();
    const { programmeLevel, setProgrammeLevel } = useProgrammeLevel();
    const [umehHostPref, setUmehHostPrefState] = useState('auto');
    const [umehOpenPref, setUmehOpenPrefState] = useState('inApp');

    useEffect(() => {
        getUmehHostPref().then(setUmehHostPrefState);
        getUmehOpenPref().then(setUmehOpenPrefState);
    }, []);

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
        setLocalStorage('language', lang);
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

    const handleUmehHostPrefChange = async pref => {
        await setUmehHostPref(pref);
        setUmehHostPrefState(pref);
        refreshUmehHost();
    };

    const handleUmehOpenPrefChange = async pref => {
        await setUmehOpenPref(pref);
        setUmehOpenPrefState(pref);
    };

    const umehHostPrefLabels = {
        auto: t('setting:Auto'),
        primary: 'umeh',
        backup: 'cf',
    };
    const umehOpenPrefLabels = {
        inApp: t('setting:In-App Browser'),
        system: t('setting:System Browser'),
    };

    // 主題選項配置
    const themeOptions = [
        { key: 'system', label: t('setting:System') },
        { key: 'light', label: t('setting:Light') },
        { key: 'dark', label: t('setting:Dark') },
    ];

    // 語言選項（與主題列共用 SegmentControl 樣式：灰底容器、選中白底主題色字）
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
                            icon="person-circle"
                        />

                        <SettingSectionCard>
                            <SettingItem
                                grouped
                                icon="person-circle-outline"
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
                                onChange={handleThemeChange}
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
                                    handleLanguageChange(
                                        languageOptions[index].key,
                                    )
                                }
                            />
                        }
                    />
                </SettingSectionCard>

                <SettingSection title={t('setting:Courses')} icon="school" />

                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon="school-outline"
                        iconColor={themeColor}
                        title={t('setting:Programme Level')}
                        subtitle={programmeLevelOptions[programmeLevelIndex].label}
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
                            <MenuView
                                actions={['auto', 'primary', 'backup'].map(
                                    pref => ({
                                        id: pref,
                                        title: umehHostPrefLabels[pref],
                                        state:
                                            umehHostPref === pref
                                                ? 'on'
                                                : 'off',
                                    }),
                                )}
                                onPressAction={event =>
                                    handleUmehHostPrefChange(
                                        event.nativeEvent.event,
                                    )
                                }
                                onOpenMenu={() => trigger()}
                                shouldOpenOnLongPress={false}
                                style={{ width: scale(72) }}>
                                <View
                                    style={{
                                        width: scale(72),
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: `${'#007AFF'}15`,
                                        borderRadius: scale(8),
                                        paddingHorizontal: scale(10),
                                        paddingVertical: scale(5),
                                    }}>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            fontSize: scale(13),
                                            color: '#007AFF',
                                            fontWeight: '500',
                                        }}>
                                        {umehHostPrefLabels[umehHostPref]}
                                    </Text>
                                    <Ionicons
                                        name="chevron-down"
                                        size={scale(12)}
                                        color="#007AFF"
                                        style={{ marginLeft: scale(4) }}
                                    />
                                </View>
                            </MenuView>
                        }
                    />
                    <SettingItem
                        grouped
                        icon="open-outline"
                        iconColor="#007AFF"
                        title={t('setting:What2Reg Open')}
                        subtitle={`${umehOpenPrefLabels[umehOpenPref]}\n${t('選咩課和ARK是兩個獨立項目')}`}
                        showArrow={false}
                        rightElement={
                            <MenuView
                                actions={['inApp', 'system'].map(pref => ({
                                    id: pref,
                                    title: umehOpenPrefLabels[pref],
                                    state:
                                        umehOpenPref === pref
                                            ? 'on'
                                            : 'off',
                                }))}
                                onPressAction={event =>
                                    handleUmehOpenPrefChange(
                                        event.nativeEvent.event,
                                    )
                                }
                                onOpenMenu={() => trigger()}
                                shouldOpenOnLongPress={false}
                                style={{ width: scale(108) }}>
                                <View
                                    style={{
                                        width: scale(108),
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: `${'#007AFF'}15`,
                                        borderRadius: scale(8),
                                        paddingHorizontal: scale(10),
                                        paddingVertical: scale(5),
                                    }}>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            fontSize: scale(13),
                                            color: '#007AFF',
                                            fontWeight: '500',
                                        }}>
                                        {umehOpenPrefLabels[umehOpenPref]}
                                    </Text>
                                    <Ionicons
                                        name="chevron-down"
                                        size={scale(12)}
                                        color="#007AFF"
                                        style={{ marginLeft: scale(4) }}
                                    />
                                </View>
                            </MenuView>
                        }
                    />
                </SettingSectionCard>

                {/* 應用設置分區 */}
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
                        icon="globe-outline"
                        iconColor={themeColor}
                        title={t('setting:Browser Cache Help')}
                        subtitle={t('setting:Browser Cache Help Hint')}
                        onPress={handleBrowserCacheHelp}
                    />
                    <SettingItem
                        grouped
                        icon="cloud-download"
                        iconColor="#34C759"
                        title={t('setting:Check Update')}
                        subtitle={`v${getLocalAppVersion()}`}
                        onPress={handleCheckUpdate}
                    />
                    <SettingItem
                        grouped
                        icon="settings-outline"
                        iconColor="#5856D6"
                        title={t('setting:App Settings')}
                        subtitle={t('setting:App Settings Hint')}
                        onPress={() => Linking.openSettings()}
                    />
                </SettingSectionCard>

                {/* 關於分區 */}
                <SettingSection
                    title={t('setting:About')}
                    icon="information-circle"
                />

                <SettingSectionCard>
                    <SettingItem
                        grouped
                        icon={
                            Platform.OS === 'android'
                                ? 'logo-android'
                                : 'logo-apple'
                        }
                        iconColor={black.main}
                        title={t('setting:Version')}
                        subtitle={`v${getLocalAppVersion()}`}
                        showArrow={false}
                    />
                    <SettingItem
                        grouped
                        icon="logo-github"
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
                        iconColor="#007AFF"
                        title={t('setting:Common Issues')}
                        onPress={() => {
                            trigger();
                            openLink(USUAL_Q);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="shield-checkmark"
                        iconColor="#5856D6"
                        title={t('setting:Privacy Policy')}
                        onPress={() => {
                            trigger();
                            openLink(USER_AGREE);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="heart"
                        iconColor="#FF2D55"
                        title={t('setting:Donate')}
                        onPress={() => {
                            trigger();
                            openLink(GITHUB_DONATE);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="pulse"
                        iconColor="#FF9500"
                        title={t('setting:Activity')}
                        onPress={() => {
                            trigger();
                            openLink(GITHUB_ACTIVITY);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="school"
                        iconColor="#4796d6"
                        title={`${t('common:ABOUT')} ARK ALL`}
                        onPress={() => {
                            trigger();
                            openLink(ARK_WIKI_ABOUT_ARK);
                        }}
                    />
                </SettingSectionCard>

                {/* 聯繫我們分區 */}
                <SettingSection title={t('setting:Contact')} icon="mail" />

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
                            icon="chatbubble-ellipses"
                            iconColor="#34C759"
                            title={t('setting:Feedback')}
                        />
                    </MenuView>
                    <SettingItem
                        grouped
                        icon="globe"
                        iconColor="#007AFF"
                        title={t('setting:Official Website')}
                        subtitle={BASE_HOST}
                        onPress={() => {
                            trigger();
                            openLink(BASE_HOST);
                        }}
                    />
                    <SettingItem
                        grouped
                        icon="mail"
                        iconColor="#5856D6"
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
