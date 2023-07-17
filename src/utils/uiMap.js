import React, {Component} from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {pxToDp} from './stylesKits';

export const COLOR_DIY = {
    // 原主題色 #005F95；春日限定：#5f8e5a；夏日限定：#6ab6eb;
    themeColor: '#6ab6eb',
    secondThemeColor:'#FF8627',
    // B站使用的安卓Material Design，亮色背景下87%的黑色用於顯示
    black: {
        // 最高層級，類似大標題
        main: '#000',
        // 次標題
        second: '#212121',
        // 次次標題
        third: '#666666',
    },
    // 當想用純白，或其他顏色背景，白色文字時用white的色值
    white: '#fff',
    // 全局背景白色(偏灰)
    bg_color: '#F5F5F7',

    // 綠色，用在Toast上
    success: '#27ae60',
    warning: '#f39c12',
    unread: '#f75353',

    // 我的頁顏色
    meScreenColor: {
        bg_color: '#ededed',
        card_color: 'white',
    },

    // 提醒頁顏色
    messageScreenColor: {
        bg_color: '#fbfbfb',
    },

    // 陰影，IOS和Android要分開設置，shadow屬性只適用於IOS
    viewShadow: {
        shadowColor: '#000',
        shadowOffset: {width: 1, height: 1},
        shadowOpacity: 0.2,
        shadowRadius: 3,
        // 適用於Android
        elevation: 4,
    },
};

export const uiStyle = StyleSheet.create({
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
        <View style={{...uiStyle.toastContainer, backgroundColor}}>
            <Text style={{color: textColor}}>{props.text}</Text>
        </View>
    );
};
