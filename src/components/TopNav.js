// 頂部標題，僅用於Tabbar頁面，非Tabbar頁面直接用React Navigation的header
import React, {Component} from 'react';
import {
    Text,
    View,
    StatusBar,
    TouchableOpacity,
    StyleSheet,
    Button,
    Dimensions,
} from 'react-native';

// 本地引用
import {pxToDp} from '../utils/stylesKits';
import {COLOR_DIY} from '../utils/uiMap';

// 第三方庫
import Icon from 'react-native-vector-icons/AntDesign';

class TopNavi extends Component {
    state = {};
    render() {
        return (
            <View>
                <View
                    style={{
                        backgroundColor: COLOR_DIY.bg_color,
                        height: pxToDp(35),
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <Text
                        style={{
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(18),
                        }}>
                        {this.props.title}
                    </Text>
                </View>
            </View>
        );
    }
}

export default TopNavi;
