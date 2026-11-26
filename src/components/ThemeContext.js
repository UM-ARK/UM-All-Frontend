import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Appearance, Platform, StyleSheet } from 'react-native';
import { verticalScale, scale } from 'react-native-size-matters';
import { getLocalStorage, setLocalStorage } from '../utils/storageKits';
import { ANDROID_UI_FONT_FAMILY } from './typography';

export const ThemeContext = createContext();

// 主題模式常量
export const THEME_MODE = {
    SYSTEM: 0,  // 跟隨系統
    LIGHT: 1,   // 強制淺色
    DARK: 2,    // 強制深色
};

// 將色值混合至底色，用於生成與其他頁面一致的 Tonal 課卡底色
const mixHex = (baseHex, tintHex, ratio) => {
    const parse = hex => {
        const normalized = hex.length === 4
            ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
            : hex;
        return [
            parseInt(normalized.slice(1, 3), 16),
            parseInt(normalized.slice(3, 5), 16),
            parseInt(normalized.slice(5, 7), 16),
        ];
    };
    const [r1, g1, b1] = parse(baseHex);
    const [r2, g2, b2] = parse(tintHex);
    const toHex = n => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(r1 + (r2 - r1) * ratio)}${toHex(g1 + (g2 - g1) * ratio)}${toHex(b1 + (b2 - b1) * ratio)}`;
};

// rgba 輔助函數：將 hex 顏色轉為帶透明度的 rgba 字串
const rgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// Android 9 以下不支援外陰影的 boxShadow。
const supportsBoxShadow = Platform.OS !== 'android' || Platform.Version >= 28;
const createShadow = (offsetY, blurRadius, color, elevation) => (
    supportsBoxShadow
        ? { boxShadow: [{ offsetX: 0, offsetY, blurRadius, spreadDistance: 0, color }] }
        : { elevation }
);

// 定義主題配置
const getColorDiy = (isLight) => {
    // 基礎色值定義，避免重複硬編碼
    const trueWhite = '#fff';
    const trueBlack = '#121212';
    const whiteColor = isLight ? trueWhite : '#272729';
    const blackMain = isLight ? '#000' : trueWhite;

    // 色值提取為局部變量以便生成 Tonal 色階
    // 原主題色 #005F95；春日限定：#5f8e5a；夏日限定1：#328ad1;
    const themeColorValue = isLight ? '#4796d6' : '#4a9cde';
    const secondThemeColorValue = '#FF8627';
    const successValue = '#27ae60';
    const unreadValue = '#f75353';
    const warningValue = '#f39c12';
    const what2regColorValue = '#30548b';
    const featureGreenValue = isLight ? '#18A957' : '#4ADE80';
    const featureOrangeValue = isLight ? '#EA7615' : '#FB923C';
    const featurePinkValue = isLight ? '#E6536C' : '#FB7185';
    const featureTealValue = isLight ? '#199E9A' : '#2DD4BF';
    const achievementGoldValue = isLight ? '#B77900' : '#F2C14E';
    const achievementSilverValue = isLight ? '#6F7C87' : '#C2CBD3';
    const achievementBronzeValue = isLight ? '#A85D32' : '#D9915B';
    const timetableSurfaceBase = isLight ? trueWhite : '#1A1C1F';
    const timetableTintRatio = isLight ? 0.17 : 0.24;

    return {
        isLight: isLight,
        themeColor: themeColorValue,
        themeColorLight: isLight ? '#7ca8cc' : '#2d5f87',
        themeColorUltraLight: isLight ? '#c9e1f5' : '#23323d',
        accentForeground: isLight ? '#195985' : '#83C7F7',
        secondThemeColor: secondThemeColorValue,

        // Tonal Color System — 主題色透明度分級背景色
        // 用於替代在組件中手寫 `${themeColor}XX` 的模式
        // 級別：08(極淺) → 15(淺) → 30(中) → 50(較深) → 實色
        tonal: {
            // 主題色 (themeColor) 背景分級
            primary08: `${themeColorValue}08`,   // ~3%  極淺底：大面積輸入區域
            primary15: `${themeColorValue}15`,   // ~8%  淺色底：普通按鈕、標籤
            primary30: `${themeColorValue}30`,   // ~19% 中等底：重點按鈕
            primary50: `${themeColorValue}50`,   // ~31% 較深底：強調容器
            // 副主題色 (secondThemeColor) 背景分級
            secondary08: `${secondThemeColorValue}08`,
            secondary15: `${secondThemeColorValue}15`,
            secondary30: `${secondThemeColorValue}30`,
            secondary50: `${secondThemeColorValue}50`,
            // 語義色 (success / unread) 背景分級
            success15: `${successValue}15`,
            success30: `${successValue}30`,
            unread15: `${unreadValue}15`,
            unread30: `${unreadValue}30`,
        },
        // B站使用的安卓Material Design，亮色背景下87%的黑色用於顯示
        black: {
            // 最高層級，類似大標題
            main: blackMain,
            // 次標題
            second: isLight ? '#212121' : '#e5e5e7',
            // 次次標題
            third: isLight ? '#666666' : '#e1e1e3',
        },
        trueBlack,

        // Harbor 成就等級配色
        achievement: {
            gold: achievementGoldValue,
            goldTonal: `${achievementGoldValue}18`,
            silver: achievementSilverValue,
            silverTonal: `${achievementSilverValue}18`,
            bronze: achievementBronzeValue,
            bronzeTonal: `${achievementBronzeValue}18`,
        },

        // 當想用純白，或其他顏色背景，白色文字時用white的色值
        white: whiteColor,
        trueWhite,

        // 半透明玻璃擬態效果顏色（基於 trueWhite 生成不同透明度）
        glass: rgba(trueWhite, isLight ? 0.4 : 0.15),
        // 玻璃態搜索欄專用顏色
        glassBorder: rgba(trueWhite, isLight ? 0.5 : 0.2),
        glassBg: isLight ? rgba(trueWhite, 0.3) : rgba('#1e1e1e', 0.6),

        // 全局背景白色(偏灰)
        bg_color: isLight ? '#F5F5F7' : trueBlack,
        pressOverlay: rgba(isLight ? trueBlack : trueWhite, 0.12),

        // 綠色，用在Toast上
        success: successValue,
        successForeground: isLight ? '#114D30' : '#78DBAB',
        warning: warningValue,
        unread: unreadValue,
        unreadForeground: isLight ? '#AB2935' : '#FF9C9F',
        disabled: isLight ? '#cad5de' : '#3a3d40',

        // 我的頁顏色
        meScreenColor: {
            bg_color: isLight ? '#212121' : '#ededed',
            card_color: whiteColor,
        },

        // 組織活動編輯
        eventColor: {
            imageCard: isLight ? '#f0f0f0' : 'gray',
        },

        // ARK Wiki配色（與 white 相同）
        wiki_bg_color: whiteColor,

        // 服務頁灰底白卡分組表面與功能性質語義色（嚴格收斂於 4 組低疲勞線性圖標配色）
        featuresScreen: {
            bg_color: isLight ? '#F5F5F7' : trueBlack,
            bgTransparent: rgba(isLight ? '#F5F5F7' : trueBlack, 0),
            cardBg: whiteColor,
            searchBg: isLight ? '#FFFFFF' : whiteColor,
            divider: rgba(isLight ? trueBlack : trueWhite, isLight ? 0.06 : 0.09),
        },
        featureIconTones: {
            // 線性圖標四色語義色盤（亮色確保白卡 >=3:1 對比度；暗色提亮保持柔和通透）
            // 核心平台、查詢工具與知識資料（主題藍）
            blue: {
                foreground: themeColorValue,
                background: isLight ? rgba(themeColorValue, 0.1) : rgba(themeColorValue, 0.16),
            },
            // 實時狀態、出行交通、場地預約與協作（翠綠）
            green: {
                foreground: featureGreenValue,
                background: rgba(featureGreenValue, isLight ? 0.1 : 0.16),
            },
            // 餐飲生活、指南攻略、社群與成長（暖橘）
            orange: {
                foreground: featureOrangeValue,
                background: rgba(featureOrangeValue, isLight ? 0.1 : 0.16),
            },
            // 截止提醒、官方公告、安全警示與報修（珊瑚紅）
            pink: {
                foreground: featurePinkValue,
                background: rgba(featurePinkValue, isLight ? 0.1 : 0.16),
            },
        },

        // Harbor頁面配色
        harbor_bg_color: isLight ? '#fbfdff' : '#111111',
        harborSearch: {
            background: isLight ? '#EDF0F2' : whiteColor,
            foreground: isLight ? '#666666' : '#A8A8AC',
        },

        // expo-image 通用圖片佔位（可直接傳給 placeholder prop）
        // 亮：淺灰；暗：深灰，避免深色模式下出現突兀亮塊
        imagePlaceholder: {
            blurhash: isLight
                ? 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'
                : 'L1O|oat7fQfQfQfQfQfQfQfQfQ',
        },

        // What2Reg，選咩課配色
        what2reg_color: what2regColorValue,

        // 提醒頁顏色
        messageScreenColor: {
            bg_color: isLight ? '#fbfbfb' : trueBlack,
        },

        // 內容卡片、浮動控制與彈層的陰影層次
        viewShadow: createShadow(2, isLight ? 12 : 8, rgba(trueBlack, isLight ? 0.06 : 0.45), 2),
        floatingShadow: createShadow(4, 16, rgba(trueBlack, isLight ? 0.14 : 0.55), 6),
        modalShadow: createShadow(8, 24, rgba(trueBlack, isLight ? 0.18 : 0.6), 12),
        tabBarShadow: createShadow(-2, 12, rgba(trueBlack, isLight ? 0.1 : 0.45), 8),

        barStyle: isLight ? 'dark-content' : 'light-content',

        // 沿用全站語義色（主題藍、服務綠/橘/珊瑚、提醒金、選咩課靛藍等）生成一致的 Tonal 課卡底色
        TIME_TABLE_COLOR: [
            mixHex(timetableSurfaceBase, themeColorValue, timetableTintRatio),
            mixHex(timetableSurfaceBase, featureGreenValue, timetableTintRatio),
            mixHex(timetableSurfaceBase, featureOrangeValue, timetableTintRatio),
            mixHex(timetableSurfaceBase, featurePinkValue, timetableTintRatio),
            mixHex(timetableSurfaceBase, warningValue, timetableTintRatio),
            mixHex(timetableSurfaceBase, what2regColorValue, isLight ? 0.16 : 0.34),
            mixHex(timetableSurfaceBase, featureTealValue, timetableTintRatio),
            mixHex(timetableSurfaceBase, achievementSilverValue, isLight ? 0.19 : 0.22),
            mixHex(timetableSurfaceBase, achievementBronzeValue, isLight ? 0.16 : 0.24),
        ],
    };
};
// 导出主题常量，用于不需要响应式的地方
export const themes = {
    light: getColorDiy(true),
    dark: getColorDiy(false),
};

// 根據主題模式和系統顏色方案計算實際主題
const getEffectiveTheme = (themeMode, systemColorScheme) => {
    switch (themeMode) {
        case THEME_MODE.LIGHT:
            return themes.light;
        case THEME_MODE.DARK:
            return themes.dark;
        case THEME_MODE.SYSTEM:
        default:
            return themes[systemColorScheme] || themes.light;
    }
};

// 根據主題模式判斷是否為淺色模式
const getIsLight = (themeMode, systemColorScheme) => {
    switch (themeMode) {
        case THEME_MODE.LIGHT:
            return true;
        case THEME_MODE.DARK:
            return false;
        case THEME_MODE.SYSTEM:
        default:
            return systemColorScheme === 'light';
    }
};

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = Appearance.getColorScheme();
    const [themeMode, setThemeMode] = useState(THEME_MODE.SYSTEM);
    const [theme, setTheme] = useState(themes[systemColorScheme] || themes.light);
    const [isLightMode, setIsLightMode] = useState(systemColorScheme === 'light');

    // 加載保存的主題偏好設置
    useEffect(() => {
        const loadThemePreference = async () => {
            try {
                const savedMode = await getLocalStorage('themePreference');
                if (savedMode !== undefined && savedMode !== null) {
                    const parsedMode = parseInt(savedMode, 10);
                    if (!isNaN(parsedMode) && parsedMode >= 0 && parsedMode <= 2) {
                        setThemeMode(parsedMode);
                        setTheme(getEffectiveTheme(parsedMode, Appearance.getColorScheme()));
                        setIsLightMode(getIsLight(parsedMode, Appearance.getColorScheme()));
                    }
                }
            } catch (error) {
                console.error('Failed to load theme preference:', error);
            }
        };
        loadThemePreference();
    }, []);

    // 監聽系統顏色方案變化（僅在 SYSTEM 模式下生效）
    useEffect(() => {
        const listener = Appearance.addChangeListener(({ colorScheme }) => {
            if (themeMode === THEME_MODE.SYSTEM) {
                const newTheme = themes[colorScheme] || themes.light;
                setTheme(newTheme);
                setIsLightMode(colorScheme === 'light');
            }
        });
        return () => listener.remove();
    }, [themeMode]);

    // 設置主題模式
    const setThemeModeWithStorage = useCallback(async (mode) => {
        setThemeMode(mode);
        const effectiveTheme = getEffectiveTheme(mode, Appearance.getColorScheme());
        setTheme(effectiveTheme);
        setIsLightMode(getIsLight(mode, Appearance.getColorScheme()));
        await setLocalStorage('themePreference', mode);
    }, []);

    const themeContextValue = {
        theme,
        themeMode,
        setThemeMode: setThemeModeWithStorage,
        isLight: isLightMode,
    };

    return (
        <ThemeContext.Provider value={themeContextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

// 自定义 Hook 方便使用
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};


export const uiStyle = StyleSheet.create({
    defaultText: {
        ...(Platform.OS === 'android' && { fontFamily: ANDROID_UI_FONT_FAMILY }),
        fontWeight: 'normal',
        fontSize: verticalScale(12),
    },
    toastContainer: {
        padding: scale(10),
        borderRadius: scale(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
});
