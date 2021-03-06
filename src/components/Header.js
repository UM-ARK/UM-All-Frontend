// 普通的只帶返回按鈕的白底黑字Header，需傳遞title屬性
import React, {Component} from 'react';
import {
    ScrollView,
    View,
    Text,
    SafeAreaView,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import {COLOR_DIY} from '../utils/uiMap';
import {pxToDp} from '../utils/stylesKits';

// 第三方庫
import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NavigationContext} from '@react-navigation/native';

class HeaderDIY extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    render() {
        return (
            <Header
                backgroundColor={COLOR_DIY.bg_color}
                leftComponent={
                    <TouchableOpacity onPress={() => this.context.goBack()}>
                        <Ionicons
                            name="chevron-back-outline"
                            size={pxToDp(25)}
                            color={COLOR_DIY.black.main}
                        />
                    </TouchableOpacity>
                }
                centerComponent={{
                    text: this.props.title,
                    style: {
                        color: COLOR_DIY.black.main,
                        fontSize: pxToDp(15),
                    },
                }}
                statusBarProps={{
                    backgroundColor: 'transparent',
                    barStyle: 'dark-content',
                }}
            />
        );
    }
}

export default HeaderDIY;
