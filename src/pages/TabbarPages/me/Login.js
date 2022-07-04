// MeTabbar會展示的登錄頁
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
import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

import {Header} from '@rneui/themed';
import {NavigationContext} from '@react-navigation/native';

//登录页面
class Login extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    render() {
        // TODO: 每個Text標籤都要設置color，避免深色模式字體默認變白色就看不見了
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                }}>
                <Image
                    source={require('./icon/moren.jpeg')}
                    style={{
                        height: pxToDp(80),
                        width: pxToDp(80),
                        marginTop: 60,
                        marginBottom: 30,
                        borderRadius: pxToDp(80),
                    }}
                />
                <TextInput
                    placeholder={'請輸入手機號/郵箱'}
                    style={{
                        width: pxToDp(250),
                        height: pxToDp(40),
                        borderColor: 'lightgrey',
                        borderWidth: 1,
                        marginBottom: 15,
                        borderRadius: 4,
                        textAlign: 'center',
                        alignSelf: 'center',
                    }}
                />
                <TextInput
                    placeholder={'請輸入密碼'}
                    password={true}
                    style={{
                        width: pxToDp(250),
                        height: pxToDp(40),
                        borderColor: 'lightgrey',
                        borderWidth: 1,
                        marginBottom: 8,
                        borderRadius: 4,
                        textAlign: 'center',
                        alignSelf: 'center',
                    }}
                />

                {/* 登錄按鈕 */}
                <TouchableOpacity
                    style={{
                        height: pxToDp(50),
                        width: pxToDp(200),
                        padding: 10,
                        marginTop: pxToDp(20),
                        backgroundColor: '#005F96',
                        borderRadius: pxToDp(10),
                        justifyContent: 'center',
                        alignSelf: 'center',
                    }}
                    onPress={() => {
                        // TODO: 校驗密碼等是否合法，修改登錄狀態
                        this.context.jumpTo('MeTabbar');
                    }}>
                    <Text
                        style={{
                            fontSize: 20,
                            alignSelf: 'center',
                            color: 'white',
                            fontWeight: '500',
                        }}>
                        登錄
                    </Text>
                </TouchableOpacity>

                <View
                    style={{
                        flexDirection: 'row',
                        width: '80%',
                        justifyContent: 'space-between',
                        marginTop: pxToDp(30),
                    }}>
                    <TouchableOpacity onPress={() => alert('忘記密碼')}>
                        <Text>无法登录</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => alert('新用戶註冊')}>
                        <Text>新用户</Text>
                    </TouchableOpacity>
                </View>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        position: 'absolute',
                        bottom: 10,
                        left: 10,
                    }}></View>
            </View>
        );
    }
}

export default Login;
