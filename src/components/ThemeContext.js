import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance, StatusBar, StyleSheet } from 'react-native';
import { COLOR_DIY, isLight } from '../utils/uiMap';
import { verticalScale } from 'react-native-size-matters';

export const ThemeContext = createContext();

// 定义主题配置
const getColorDiy = (isLight) => ({
    isLight: isLight,
    // 原主題色 #005F95；春日限定：#5f8e5a；夏日限定1：#328ad1;
    themeColor: isLight ? '#4796d6' : '#4a9cde',
    themeColorLight: isLight ? '#7ca8cc' : '#2d5f87',
    themeColorUltraLight: isLight ? '#c9e1f5' : '#23323d',
    secondThemeColor: '#FF8627',
    // B站使用的安卓Material Design，亮色背景下87%的黑色用於顯示
    black: {
        // 最高層級，類似大標題
        main: isLight ? '#000' : '#fff',
        // 次標題
        second: isLight ? '#212121' : '#e5e5e7',
        // 次次標題
        third: isLight ? '#666666' : '#e1e1e3',
    },
    trueBlack: '#121212',

    // 當想用純白，或其他顏色背景，白色文字時用white的色值
    white: isLight ? '#fff' : '#272729',
    trueWhite: '#fff',

    // 半透明玻璃擬態效果顏色（20% 透明度）
    glass: 'rgba(255, 255, 255, 0.2)',

    // 全局背景白色(偏灰)
    bg_color: isLight ? '#F5F5F7' : '#121212',

    // 綠色，用在Toast上
    success: '#27ae60',
    warning: '#f39c12',
    unread: '#f75353',
    disabled: isLight ? '#cad5de' : '#3a3d40',

    // 我的頁顏色
    meScreenColor: {
        bg_color: isLight ? '#212121' : '#ededed',
        card_color: isLight ? '#fff' : '#272729',
    },

    // 組織活動編輯
    eventColor: {
        imageCard: isLight ? '#f0f0f0' : 'gray',
    },

    // ARK Wiki配色
    wiki_bg_color: isLight ? '#fff' : '#272729',

    // Harbor頁面配色
    harbor_bg_color: isLight ? '#fbfdff' : '#111111',

    // What2Reg，選咩課配色
    what2reg_color: '#30548b',

    // 提醒頁顏色
    messageScreenColor: {
        bg_color: '#fbfbfb',
    },

    // 陰影，IOS和Android要分開設置，shadow屬性只適用於IOS
    viewShadow: {
        shadowColor: isLight ? '#000' : '#fff',
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
});
// 导出主题常量，用于不需要响应式的地方
export const themes = {
    light: getColorDiy(true),
    dark: getColorDiy(false),
};
// TODO: uiMap.js剩餘的部分可以考慮移到ThemeContext.js中，這樣可以統一管理主題相關的顏色和樣式。

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = Appearance.getColorScheme();
    const [theme, setTheme] = useState(themes[systemColorScheme] || themes.light);
    const [isLight, setIsLight] = useState(systemColorScheme === 'light');

    useEffect(() => {
        const listener = Appearance.addChangeListener(({ colorScheme }) => {
            const newTheme = themes[colorScheme] || themes.light;
            setTheme(newTheme);
            setIsLight(colorScheme === 'light');
        });
        return () => listener.remove();
    }, []);

    const toggleTheme = () => {
        const newMode = isLight ? 'light' : 'dark';
        const newTheme = themes[newMode];
        setTheme(newTheme);
    };

    const themeContextValue = {
        theme,
        toggleTheme,
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
});
