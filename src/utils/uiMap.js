import React, { Component } from 'react';
import { StyleSheet, View, Text, Appearance } from 'react-native';
import { pxToDp } from './stylesKits';
import { scale } from 'react-native-size-matters';

const isLight = Appearance.getColorScheme() == 'light';

export const COLOR_DIY = {
    // 原主題色 #005F95；春日限定：#5f8e5a；夏日限定1：#328ad1;
    themeColor: '#4796d6',
    themeColorLight: '#7ca8cc',
    themeColorUltraLight: '#c9e1f5',
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
    // 當想用純白，或其他顏色背景，白色文字時用white的色值
    white: isLight ? '#fff' : '#272729',
    trueWhite: '#fff',
    // 全局背景白色(偏灰)
    bg_color: isLight ? '#F5F5F7' : '#121212',

    // 綠色，用在Toast上
    success: '#27ae60',
    warning: '#f39c12',
    unread: '#f75353',

    // 我的頁顏色
    meScreenColor: {
        bg_color: '#ededed',
        card_color: 'white',
    },

    // ARK Wiki配色
    wiki_bg_color: isLight ? '#fff' : '#272729',

    // What2Reg，選咩課配色
    what2reg_color: '#30548b',

    // 提醒頁顏色
    messageScreenColor: {
        bg_color: '#fbfbfb',
    },

    // 陰影，IOS和Android要分開設置，shadow屬性只適用於IOS
    viewShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        // 適用於Android
        elevation: 4,
    },

    barStyle: isLight ? 'dark-content' : 'light-content',
};

export const VERSION_EMOJI = {
    ve_Left: '⛱️',
    ve_Right: '🕶️',
}

export const uiStyle = StyleSheet.create({
    defaultText: {
        fontWeight: 'normal',
        fontSize: scale(12),
    },
    toastContainer: {
        backgroundColor: COLOR_DIY.themeColor,
        padding: pxToDp(10),
        borderRadius: pxToDp(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export const ToastText = props => {
    let backgroundColor = uiStyle.toastContainer.backgroundColor;
    let textColor = COLOR_DIY.white;
    if (props.backgroundColor) {
        backgroundColor = props.backgroundColor;
    }
    if (props.textColor) {
        textColor = props.textColor;
    }
    return (
        <View style={{ ...uiStyle.toastContainer, backgroundColor }}>
            <Text style={{ color: textColor }}>{props.text}</Text>
        </View>
    );
};
