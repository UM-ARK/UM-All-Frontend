// 普通的只帶返回按鈕的白底黑字Header，需傳遞title屬性
import React, { useContext } from 'react';
import {
    TouchableOpacity,
    TouchableWithoutFeedback,
    Keyboard,
    Platform,
    View,
    StatusBar,
    Text,
} from 'react-native';

import { useTheme, themes, uiStyle, ThemeContext, } from './ThemeContext';
import { trigger } from '../utils/trigger';
import { scale, verticalScale } from 'react-native-size-matters';

// 第三方庫
import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationContext } from '@react-navigation/native';

const HeaderDIY = (props) => {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    const navigation = useContext(NavigationContext);
    const { theme } = useTheme();
    const { barStyle, black, bg_color, } = theme;

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            {props.iOSDIY && Platform.OS === 'ios' && !Platform.isPad ? (
                <View style={{
                    flexDirection: 'row',
                    padding: scale(15),
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <StatusBar
                        backgroundColor={'transparent'}
                        barStyle={barStyle}
                    />

                    <TouchableOpacity
                        style={{ position: 'absolute', left: scale(5) }}
                        onPress={() => {
                            trigger();
                            navigation.goBack();
                        }}>
                        <Ionicons
                            name="chevron-back-outline"
                            size={scale(25)}
                            color={black.main}
                        />
                    </TouchableOpacity>

                    <Text style={{
                        ...uiStyle.defaultText,
                        color: black.main,
                        fontSize: verticalScale(15),
                        alignSelf: 'center',
                    }}>
                        {props.title}
                    </Text>
                </View>
            ) : (
                <Header
                    backgroundColor={bg_color}
                    leftComponent={
                        <TouchableOpacity onPress={() => {
                            trigger();
                            navigation.goBack();
                        }}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={scale(25)}
                                color={black.main}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: props.title,
                        style: {
                            ...uiStyle.defaultText,
                            color: black.main,
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
                        barStyle: barStyle,
                    }}
                    containerStyle={{
                        // 修復深色模式頂部小白條問題
                        borderBottomWidth: 0,
                    }}
                />
            )}
        </TouchableWithoutFeedback>
    );
};

export default HeaderDIY;
