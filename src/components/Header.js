// 普通的只帶返回按鈕的白底黑字Header，需傳遞title屬性
import React, { Component } from 'react';
import {
    TouchableOpacity,
    Appearance,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';

import { COLOR_DIY, uiStyle, } from '../utils/uiMap';
import { trigger } from '../utils/trigger';
import { scale } from 'react-native-size-matters';

// 第三方庫
import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationContext } from '@react-navigation/native';

class HeaderDIY extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    render() {
        return (
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}><Header
                backgroundColor={COLOR_DIY.bg_color}
                leftComponent={
                    <TouchableOpacity onPress={() => {
                        trigger();
                        this.context.goBack();
                    }}>
                        <Ionicons
                            name="chevron-back-outline"
                            size={scale(25)}
                            color={COLOR_DIY.black.main}
                        />
                    </TouchableOpacity>
                }
                centerComponent={{
                    text: this.props.title,
                    style: {
                        ...uiStyle.defaultText,
                        color: COLOR_DIY.black.main,
                        fontSize: scale(15),
                    },
                }}
                centerContainerStyle={{
                    justifyContent: 'center',
                    // 修復深色模式頂部小白條問題
                    // borderBottomWidth: 0,
                }}
                statusBarProps={{
                    backgroundColor: 'transparent',
                    barStyle: COLOR_DIY.barStyle,
                }}
                containerStyle={{
                    // 修復深色模式頂部小白條問題
                    borderBottomWidth: 0,
                }}
            /></TouchableWithoutFeedback>
        );
    }
}

export default HeaderDIY;
