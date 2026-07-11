import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Pressable,
    Linking,
    Alert,
    Platform,
} from 'react-native';
import { useTheme, uiStyle } from '../../components/ThemeContext';
import { openLink } from '../../utils/browser';
import { trigger } from '../../utils/trigger';
import { getLocalStorage, setLocalStorage } from '../../utils/storageKits';
import {
    getUmehHostPref,
    setUmehHostPref,
    refreshUmehHost,
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
} from '../../utils/pathMap';
import packageInfo from '../../../package.json';
import { scale, verticalScale } from 'react-native-size-matters';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { useTranslation } from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SegmentControl from '../../components/SegmentControl';
import {
    fetchAppInfoFromServer,
    isLocalAppOlderThanServer,
    showAppStoreUpdateAlert,
} from '../../utils/appUpdateKits';

/**
 * 用戶資料卡元件 - 玻璃擬態效果
 * @param {Object} userInfo - 用戶資訊對象
 * @param {string} userInfo.avatar - 頭像網址
 * @param {string} userInfo.name - 用戶名稱
 * @param {string} userInfo.type - 用戶類型（club/student）
 */
const ProfileCard = ({ userInfo }) => {
    const { theme } = useTheme();
    const { themeColor, white, black, glass, viewShadow } = theme;
    const { t } = useTranslation(['setting']);

    const avatarUrl = userInfo?.avatar;
    const userName = userInfo?.name || t('setting:Guest');
    const userType =
        userInfo?.type === 'club'
            ? t('setting:Organization')
            : t('setting:Student');

    return (
        <View
            style={{
                marginHorizontal: scale(15),
                marginTop: verticalScale(10),
                marginBottom: verticalScale(10),
                borderRadius: scale(16),
                overflow: 'hidden',
                backgroundColor: themeColor,
                ...viewShadow,
            }}>
            {/* 玻璃擬態效果覆蓋層 */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: scale(20),
                    backgroundColor: glass,
                    backdropFilter: 'blur(10px)',
                }}>
                {/* 頭像 */}
                <View
                    style={{
                        width: scale(60),
                        height: scale(60),
                        borderRadius: scale(30),
                        backgroundColor: white,
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                        borderWidth: 2,
                        borderColor: white,
                    }}>
                    {avatarUrl ? (
                        <Image
                            source={{ uri: avatarUrl }}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                        />
                    ) : (
                        <Ionicons
                            name="person"
                            size={scale(30)}
                            color={themeColor}
                        />
                    )}
                </View>

                {/* 用戶資訊 */}
                <View style={{ marginLeft: scale(15), flex: 1 }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(18),
                            fontWeight: '700',
                            color: white,
                        }}>
                        {userName} Still Building...
                    </Text>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: verticalScale(4),
                        }}>
                        <View
                            style={{
                                backgroundColor: glass,
                                paddingHorizontal: scale(8),
                                paddingVertical: verticalScale(2),
                                borderRadius: scale(10),
                            }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(10),
                                    color: white,
                                    fontWeight: '500',
                                }}>
                                {userType}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 箭頭 */}
                <Ionicons
                    name="chevron-forward"
                    size={scale(20)}
                    color={white}
                />
            </View>
        </View>
    );
};

/**
 * 同一分區內多個設置項的容器：單一圓角卡片；項間分隔與功能頁卡片標題底線相同（bg_color、verticalScale(2)）
 * @param {React.ReactNode} children - 子節點（通常為多個 SettingItem，需傳 grouped）
 */
const SettingSectionCard = ({ children }) => {
    const { theme } = useTheme();
    const { white, bg_color, viewShadow } = theme;
    const items = React.Children.toArray(children).filter(Boolean);

    return (
        <View
            style={{
                marginHorizontal: scale(15),
                marginBottom: verticalScale(8),
                borderRadius: scale(16),
                overflow: 'hidden',
                backgroundColor: white,
                ...viewShadow,
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
                marginTop: verticalScale(20),
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
 * @param {boolean} grouped - 是否置於 SettingSectionCard 內（共用外層圓角與陰影）
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
    const { white, black, viewShadow } = theme;

    return (
        <TouchableOpacity
            onPress={() => {
                trigger();
                onPress?.();
            }}
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
                          ...viewShadow,
                      }),
            }}
            activeOpacity={0.7}>
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
        </TouchableOpacity>
    );
};

/**
 * 設置頁面主元件
 * @param {Object} navigation - 導航對象
 */
const SettingPage = ({ navigation }) => {
    const { theme, themeMode, setThemeMode } = useTheme();
    const { bg_color, black } = theme;
    const { t, i18n } = useTranslation(['setting', 'about', 'common']);
    const [userInfo, setUserInfo] = useState({});
    const [umehHostPref, setUmehHostPrefState] = useState('auto');

    // 組件掛載時加載用戶資訊和 host 偏好
    useEffect(() => {
        loadUserInfo();
        getUmehHostPref().then(setUmehHostPrefState);
    }, []);

    /**
     * 從本地存儲加載用戶資訊
     */
    const loadUserInfo = async () => {
        const info = await getLocalStorage('userInfo');
        if (info) {
            setUserInfo(info);
        }
    };

    /**
     * 處理主題變更
     * @param {number} index - 主題模式索引（0:系統, 1:淺色, 2:深色）
     */
    const handleThemeChange = async index => {
        await setThemeMode(index);
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

    const umehHostPrefLabels = {
        auto: t('setting:Auto'),
        primary: 'umeh',
        backup: 'cf',
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

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            <ScrollView contentInsetAdjustmentBehavior="automatic">
                {/* TODO: 用戶資料卡，等做好了賬號系統就加回去 */}
                {/* <ProfileCard userInfo={userInfo} /> */}

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
                        icon="cloud-download"
                        iconColor="#34C759"
                        title={t('setting:Check Update')}
                        subtitle={`v${packageInfo.version}`}
                        onPress={handleCheckUpdate}
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
                                shouldOpenOnLongPress={false}
                                style={{ width: scale(72) }}>
                                <Pressable
                                    style={({ pressed }) => ({
                                        width: scale(72),
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: `${'#007AFF'}15`,
                                        borderRadius: scale(8),
                                        paddingHorizontal: scale(10),
                                        paddingVertical: scale(5),
                                        opacity: pressed ? 0.7 : 1,
                                    })}>
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
                                </Pressable>
                            </MenuView>
                        }
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
                        subtitle={`v${packageInfo.version}`}
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
                        icon="chatbubble-ellipses"
                        iconColor="#34C759"
                        title={t('setting:Feedback')}
                        onPress={() => {
                            trigger();
                            openLink(GITHUB_UPDATE_PLAN);
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
