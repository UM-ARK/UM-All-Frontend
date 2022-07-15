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
import {handleLogin} from '../../../../../utils/storageKits';
import ClubLogin from './ClubLogin';

import {Header, CheckBox} from '@rneui/themed';
import {NavigationContext} from '@react-navigation/native';

class LoginChoose extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    state = {
        ruleChoice: false,
    };

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
                    <View style={{marginBottom: pxToDp(10)}}>
                        <Text
                            style={{
                                color: COLOR_DIY.black.third,
                                fontSize: pxToDp(18),
                            }}>
                            Welcome To UM ALL!
                        </Text>
                    </View>

                    {/* 登錄按鈕卡片 */}
                    <View style={{width: '100%', flexDirection: 'row'}}>
                        {/* 個人賬號登錄 */}
                        <TouchableOpacity
                            style={{
                                backgroundColor: '#a2d2e2',
                                ...s.roleCardContainer,
                            }}
                            activeOpacity={0.7}
                            onPress={() =>
                                handleLogin({
                                    isClub: false,
                                    token: 'student',
                                })
                            }
                            disabled={!this.state.ruleChoice}>
                            <Text style={{...s.roleCardText}}>UM PASS</Text>
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
                            onPress={() => this.context.navigate('ClubLogin')}
                            disabled={!this.state.ruleChoice}>
                            <Text style={{...s.roleCardText}}>
                                社團/組織賬號
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* 登錄提示 */}
                    <View style={{marginTop: pxToDp(10), alignItems: 'center'}}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                            {/* 選中圖標 */}
                            <CheckBox
                                containerStyle={{
                                    backgroundColor: 'transparent',
                                    padding: 0,
                                }}
                                checkedIcon="dot-circle-o"
                                uncheckedIcon="circle-o"
                                size={pxToDp(20)}
                                checked={this.state.ruleChoice}
                                onPress={() =>
                                    this.setState({
                                        ruleChoice: !this.state.ruleChoice,
                                    })
                                }
                            />
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() =>
                                    this.setState({
                                        ruleChoice: !this.state.ruleChoice,
                                    })
                                }>
                                <Text
                                    style={{
                                        color: COLOR_DIY.black.third,
                                        fontSize: pxToDp(13),
                                    }}>
                                    我已閱讀且同意遵守
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity>
                                <Text
                                    style={{
                                        color: COLOR_DIY.themeColor,
                                        fontSize: pxToDp(13),
                                    }}
                                    activeOpacity={0.9}
                                    onPress={() => alert('底部彈出應用協議')}>
                                    《應用隱私政策與使用條款》
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text
                            style={{
                                color: COLOR_DIY.black.third,
                                fontSize: pxToDp(18),
                                marginTop: pxToDp(5),
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

export default LoginChoose;
