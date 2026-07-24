import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { Appearance, StyleSheet } from 'react-native';
import { verticalScale, scale } from 'react-native-size-matters';
import { getLocalStorage, setLocalStorage } from '../utils/storageKits';

export const ThemeContext = createContext();

// 主題模式常量
export const THEME_MODE = {
    SYSTEM: 0,  // 跟隨系統
    LIGHT: 1,   // 強制淺色
    DARK: 2,    // 強制深色
};

// rgba 輔助函數：將 hex 顏色轉為帶透明度的 rgba 字串
const rgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

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

    return {
        isLight: isLight,
        themeColor: themeColorValue,
        themeColorLight: isLight ? '#7ca8cc' : '#2d5f87',
        themeColorUltraLight: isLight ? '#c9e1f5' : '#23323d',
        secondThemeColor: secondThemeColorValue,

        // Tonal Color System — 主題色透明度分級背景色
        // 用於替代在組件中手寫 `${themeColor}XX` 的模式
        // 級別：08(極淺) → 15(淺) → 30(中) → 50(較深) → 實色
        tonal: {
            // 主題色 (themeColor) 背景分級
            primary08: `${themeColorValue}08`,   // ~3%  極淺底：大面積輸入區域
            primary15: `${themeColorValue}15`,   // ~8%  淺色底：普通按鈕、標籤
            primary30: `${themeColorValue}30`,   // ~19% 中等底：重點按鈕
            primary50: `${themeColorValue}50`,   // ~31% 較深底：強調容器、pressed態
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

        // 綠色，用在Toast上
        success: successValue,
        warning: '#f39c12',
        unread: unreadValue,
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

        // Harbor頁面配色
        harbor_bg_color: isLight ? '#fbfdff' : '#111111',

        // expo-image 通用圖片佔位（可直接傳給 placeholder prop）
        // 亮：淺灰；暗：深灰，避免深色模式下出現突兀亮塊
        imagePlaceholder: {
            blurhash: isLight
                ? 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'
                : 'L1O|oat7fQfQfQfQfQfQfQfQfQ',
        },

        // What2Reg，選咩課配色
        what2reg_color: '#30548b',

        // 提醒頁顏色
        messageScreenColor: {
            bg_color: isLight ? '#fbfbfb' : trueBlack,
        },

        // 陰影，IOS和Android要分開設置，shadow屬性只適用於IOS
        viewShadow: {
            shadowColor: blackMain,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 3,
            // RN 0.76 後加入的css屬性，但需要新架構支持，新架構目前仍未在項目中啟用
            // boxShadow: '1px 1px 3px 0px rgba(0,0,0,0.2)',
        },

        barStyle: isLight ? 'dark-content' : 'light-content',

        TIME_TABLE_COLOR: isLight ?
            [
                '#D6BEB8',
                '#8FCACA',
                '#BEC8D3',
                '#B6CFB6',
                '#d5bae3',
                '#f5b6e0',
                '#f7cd50',
                '#6dbed6',
                '#C6DBDA',
            ] :
            [
                '#786a67',
                '#486666',
                '#4e5c6b',
                '#4f5e4f',
                '#584861',
                '#6e5766',
                '#5e5743',
                '#30444a',
                '#4c6160',
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


export const VERSION_EMOJI = {
    ve_Left: '⛱️',
    ve_Right: '🕶️',
};

export const uiStyle = StyleSheet.create({
    defaultText: {
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
