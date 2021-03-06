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
import {BASE_URI, POST} from '../../../../../utils/pathMap';
import Webviewer from '../../../../../components/Webviewer';
import {UM_Moodle} from '../../../../../utils/pathMap';
import DialogDIY from '../../../../../components/DialogDIY';
import ClubLogin from './ClubLogin';

import {Header, CheckBox} from '@rneui/themed';
import {NavigationContext} from '@react-navigation/native';
import CookieManager from '@react-native-cookies/cookies';
import WebView from 'react-native-webview';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

const {bg_color, black, themeColor, white} = COLOR_DIY;

class LoginChoose extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    state = {
        ruleChoice: false,
        haveAccount: false,
        showDialog: false,
        showMoodle: false,
        disabledButton: false,
    };

    handleStdLogin = async session => {
        let URL = BASE_URI + POST.STD_LOGIN;
        let data = new FormData();
        data.append('cookies', session);
        await axios
            .post(URL, data, {
                headers: {
                    'Content-Type': `multipart/form-data`,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    console.log('登錄結果', json.content);
                    // 設定本地緩存，並重啟APP
                    handleLogin({
                        isClub: false,
                        stdData: json.content,
                    });
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    };

    render() {
        const {disabledButton} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                        translucent: true,
                    }}
                    leftComponent={
                        this.state.showMoodle && (
                            <TouchableOpacity
                                onPress={() => {
                                    this.refs.webRef.reload();
                                    this.setState({showMoodle: false});
                                }}
                                disabled={disabledButton}>
                                <Ionicons
                                    name="chevron-back-outline"
                                    size={pxToDp(25)}
                                    color={COLOR_DIY.black.main}
                                />
                            </TouchableOpacity>
                        )
                    }
                />

                {this.state.showMoodle ? (
                    <WebView
                        source={{uri: UM_Moodle}}
                        ref={'webRef'}
                        startInLoadingState={true}
                        // TODO: 自動注入賬號密碼
                        // injectedJavaScript={`
                        //     document.getElementById("userNameInput").value="dc02581";
                        //     document.getElementById("passwordInput").value="";
                        // `}
                        onNavigationStateChange={e => {
                            // SSO密碼輸入頁面e.title為https://websso.....
                            // 雙重認證頁面e.title為Duo Security
                            // Moodle頁面e.title為Dashboard
                            // 已登錄到Moodle
                            if (e.url == UM_Moodle) {
                                this.setState({disabledButton: true});
                                // 獲取Moodle頁所有的cookies
                                CookieManager.get(UM_Moodle, true)
                                    .then(cookies => {
                                        console.log(
                                            'CookieManager.get =>',
                                            cookies,
                                        );
                                        if ('MoodleSession' in cookies) {
                                            alert(
                                                `Moodle登錄成功，正在登錄UM ALL...\n先不要進行其他操作...`,
                                            );
                                            console.log(
                                                'MoodleSession =>',
                                                cookies.MoodleSession.value,
                                            );
                                            this.handleStdLogin(
                                                cookies.MoodleSession.value,
                                            );
                                        } else {
                                            alert(
                                                '無法檢測Moodle登錄狀態，請聯繫開發者',
                                            );
                                        }
                                    })
                                    .catch(err => alert(err));
                                // 跳轉詳情頁
                                // this.refs.webRef.injectJavaScript(`
                                // window.location.href = 'https://ummoodle.um.edu.mo/user/profile.php';
                                // `)
                            }
                        }}
                    />
                ) : (
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        <View
                            style={{
                                alignItems: 'center',
                                marginBottom: pxToDp(10),
                            }}>
                            <Text
                                style={{
                                    color: COLOR_DIY.black.third,
                                    fontSize: pxToDp(18),
                                }}>
                                Welcome To UM ALL~
                            </Text>
                            <Text
                                style={{
                                    color: COLOR_DIY.black.third,
                                    fontSize: pxToDp(18),
                                }}>
                                []~(￣▽￣)~*
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
                                onPress={() => {
                                    this.setState({showDialog: true});
                                }}
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
                                onPress={() =>
                                    this.context.navigate('ClubLogin')
                                }
                                disabled={!this.state.ruleChoice}>
                                <Text style={{...s.roleCardText}}>
                                    社團/組織賬號
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* 登錄提示 */}
                        <View
                            style={{
                                marginTop: pxToDp(10),
                                alignItems: 'center',
                            }}>
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
                                {/* TODO: 跳轉用戶協議 */}
                                <TouchableOpacity>
                                    <Text
                                        style={{
                                            color: COLOR_DIY.themeColor,
                                            fontSize: pxToDp(13),
                                        }}
                                        activeOpacity={0.9}
                                        onPress={() => {
                                            let webview_param = {
                                                // import pathMap的鏈接進行跳轉
                                                url: 'https://umbbs.xyz/d/72/14',
                                                title: '用戶協議',
                                                // 標題顏色，默認為black.main
                                                // text_color: '#002c55',
                                                // 標題背景顏色，默認為bg_color
                                                // bg_color_diy: '#fff',
                                                // 狀態欄字體是否黑色，默認true
                                                // isBarStyleBlack: false,
                                            };
                                            this.context.navigate(
                                                'Webviewer',
                                                webview_param,
                                            );
                                            alert('未完成!');
                                        }}>
                                        《隱私政策與用戶協議》
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
                )}

                {/* 學生首次登錄提示 */}
                <DialogDIY
                    showDialog={this.state.showDialog}
                    text={
                        '將跳轉Moodle登錄頁，成功登錄進入Moodle後，會自動完成註冊！'
                    }
                    handleConfirm={() => {
                        this.setState({showDialog: false, showMoodle: true});
                    }}
                    handleCancel={() => this.setState({showDialog: false})}
                />
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
