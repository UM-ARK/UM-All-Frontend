// 選擇賬號登錄頁
import React, {Component} from 'react';
import {
    Text,
    View,
    Image,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    AppRegistry,
    StyleSheet,
    TextInput,
} from 'react-native';

// 本地工具
import {COLOR_DIY} from '../../../../../utils/uiMap';
import {pxToDp} from '../../../../../utils/stylesKits';
import ClubLogin from './ClubLogin';

import {Header} from '@rneui/themed';
import {NavigationContext} from '@react-navigation/native';
import {inject} from 'mobx-react';

class LoginChoose extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    render() {
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                        translucent: true,
                    }}
                />

                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                    {/* 登錄按鈕卡片 */}
                    <View style={{width: '100%', flexDirection: 'row'}}>
                        {/* 個人賬號登錄 */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#a2d2e2',
                                ...s.roleCardContainer,
                            }}
                            activeOpacity={0.7}
                            onPress={() => alert('跳轉學生賬號登錄')}>
                            <Text style={{...s.roleCardText}}>
                                學生個人賬號
                            </Text>
                        </TouchableOpacity>
                        {/* 社團賬號登錄 */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#4994c4',
                                ...s.roleCardContainer,
                            }}
                            activeOpacity={0.7}
                            onPress={() => this.context.navigate('ClubLogin')}>
                            <Text style={{...s.roleCardText}}>
                                社團/組織賬號
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* 登錄提示 */}
                    <View style={{marginTop: pxToDp(10)}}>
                        <Text
                            style={{
                                color: COLOR_DIY.black.third,
                                fontSize: pxToDp(18),
                            }}>
                            請選擇您的角色
                        </Text>
                    </View>
                </View>
            </View>
        );
    }
}

const s = StyleSheet.create({
    roleCardContainer: {
        flex: 1,
        height: pxToDp(200),
        margin: pxToDp(10),
        borderRadius: pxToDp(15),
        justifyContent: 'center',
        alignItems: 'center',
        ...COLOR_DIY.viewShadow,
    },
    roleCardText: {
        color: COLOR_DIY.white,
        fontSize: pxToDp(17),
    },
});

export default inject('RootStore')(LoginChoose);
