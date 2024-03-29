// 選擇賬號登錄頁
import React, { Component } from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Linking,
    Alert,
} from 'react-native';

// 本地工具
import { COLOR_DIY, uiStyle, } from '../../../utils/uiMap';
import { handleLogin } from '../../../utils/storageKits';
import {
    BASE_URI,
    POST,
    USER_AGREE,
    USUAL_Q,
} from '../../../utils/pathMap';
import { UM_Moodle, APPSTORE_URL, BASE_HOST, } from '../../../utils/pathMap';
import { openLink } from '../../../utils/browser';
import { versionStringCompare } from '../../../utils/versionKits';
import { trigger } from '../../../utils/trigger';
import DialogDIY from '../../../components/DialogDIY';
import packageInfo from '../../../../package.json';

import { CheckBox } from '@rneui/themed';
import { NavigationContext } from '@react-navigation/native';
import CookieManager from '@react-native-cookies/cookies';
import WebView from 'react-native-webview';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale } from 'react-native-size-matters';
import Header from '../../../components/Header';

const { bg_color, black, themeColor, white } = COLOR_DIY;

class LoginChoose extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    state = {
        title: '',
        ruleChoice: false,
        haveAccount: false,
        showDialog: false,
        showMoodle: false,
        disabledButton: false,
        UmPassInfo: {
            account: '',
            password: '',
        },
    };

    componentDidMount() {
        this.getUmPass();
    }

    getUmPass = async () => {
        try {
            const strUmPassInfo = await AsyncStorage.getItem('umPass');
            const UmPassInfo = strUmPassInfo ? JSON.parse(strUmPassInfo) : {};
            if (JSON.stringify(UmPassInfo) != '{}') {
                this.setState({ UmPassInfo });
            }
        } catch (e) {
            alert(e);
        }
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
                    // console.log('登錄結果', json.content);
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
        const { disabledButton } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={'賬號登錄'} />

                {this.state.showMoodle ? (
                    <WebView
                        source={{ uri: UM_Moodle }}
                        // ref={'webRef'}
                        startInLoadingState={true}
                        // 自動注入賬號密碼
                        injectedJavaScript={`
                            document.getElementById("userNameInput").value="${this.state.UmPassInfo.account}";
                            document.getElementById("passwordInput").value="${this.state.UmPassInfo.password}";
                        `}
                        onNavigationStateChange={e => {
                            // SSO密碼輸入頁面e.title為https://websso.....
                            // 雙重認證頁面e.title為Duo Security
                            // Moodle頁面e.title為Dashboard
                            // 已登錄到Moodle
                            if (e.url == UM_Moodle) {
                                this.setState({
                                    disabledButton: true,
                                    title: '請等待..',
                                });
                                // 獲取Moodle頁所有的cookies
                                CookieManager.get(UM_Moodle, true)
                                    .then(cookies => {
                                        // console.log(
                                        //     'CookieManager.get =>',
                                        //     cookies,
                                        // );
                                        if ('MoodleSession' in cookies) {
                                            alert(
                                                `Moodle登錄成功，正在登錄ARK ALL...\n先不要進行其他操作...\n等待重新出現ARK ALL主頁則登錄成功！`,
                                            );
                                            // console.log(
                                            //     'MoodleSession =>',
                                            //     cookies.MoodleSession.value,
                                            // );
                                            this.handleStdLogin(
                                                cookies.MoodleSession.value,
                                            );
                                        }
                                    })
                                    .catch(err => {
                                        alert(
                                            '無法檢測Moodle登錄狀態，請聯繫開發者',
                                        );
                                    });
                                // 跳轉詳情頁
                                // this.refs.webRef.injectJavaScript(`
                                // window.location.href = 'https://ummoodle.um.edu.mo/user/profile.php';
                                // `)
                            }
                        }}
                        // IOS
                        sharedCookiesEnabled
                        // Android
                        thirdPartyCookiesEnabled
                        cacheEnabled
                        domStorageEnabled
                    />
                ) : (
                    <View style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <View style={{
                            alignItems: 'center',
                            marginBottom: scale(10),
                        }}>
                            <Text style={{
                                ...uiStyle.defaultText,
                                color: COLOR_DIY.black.third,
                                fontSize: scale(18),
                            }}>
                                Welcome To ARK ALL~
                            </Text>
                            <Text style={{
                                ...uiStyle.defaultText,
                                color: COLOR_DIY.black.third,
                                fontSize: scale(18),
                            }}>
                                []~(￣▽￣)~*
                            </Text>
                        </View>

                        {/* 登錄按鈕卡片 */}
                        <View style={{ width: '100%', flexDirection: 'row' }}>
                            {/* 社團賬號登錄 */}
                            <TouchableOpacity
                                style={{
                                    backgroundColor: themeColor,
                                    ...s.roleCardContainer,
                                }}
                                activeOpacity={0.7}
                                onPress={async () => {
                                    trigger();
                                    // 判斷版本號，強制組織賬號使用最新版APP
                                    const strAppInfo = await AsyncStorage.getItem('appInfo');
                                    const appInfo = strAppInfo ? JSON.parse(strAppInfo) : {};
                                    const serverVersion = appInfo.app_version ? appInfo.app_version : null;
                                    if (serverVersion) {
                                        // 判斷APP版本是否滯後，提示下載新版本
                                        const shouldUpdate = versionStringCompare(packageInfo.version, serverVersion) == -1;
                                        if (shouldUpdate) {
                                            Alert.alert(`ARK ${serverVersion} 現可更新！！`,
                                                `請先更新再使用組織賬號功能，不然可能觸發意外的BUG！\n現在前往更新嗎？`,
                                                [
                                                    {
                                                        text: "Yes",
                                                        onPress: () => {
                                                            trigger();
                                                            const url = Platform.OS === 'ios' ? APPSTORE_URL : BASE_HOST;
                                                            Linking.openURL(url);
                                                        },
                                                    },
                                                    {
                                                        text: "No",
                                                    },
                                                ])
                                        }
                                        else {
                                            // 版本通過，允許登錄
                                            this.context.navigate('ClubLogin');
                                        }
                                    }
                                    else {
                                        Alert.alert(`APP錯誤`, `沒有獲取到服務器版本信息，\n請檢查網絡再試，\n也可能是程序錯誤，\n嘗試聯繫開發者！`);
                                    }
                                }}
                                disabled={!this.state.ruleChoice}>
                                <Text style={{ ...s.roleCardText, textAlign: 'center' }}>
                                    {`社團 / 組織賬號\n點我登錄`}
                                </Text>
                            </TouchableOpacity>

                            {/* 個人賬號登錄 */}
                            {false && (
                                <TouchableOpacity
                                    style={{
                                        backgroundColor: '#a2d2e2',
                                        ...s.roleCardContainer,
                                    }}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        trigger();
                                        this.setState({ showDialog: true });
                                    }}
                                    disabled={!this.state.ruleChoice}>
                                    <Text style={{ ...s.roleCardText }}>
                                        UM PASS
                                    </Text>
                                    <Text style={{ ...s.roleCardText }}>
                                        學生個人賬號
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* 登錄提示 */}
                        <View
                            style={{
                                marginTop: scale(10),
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
                                    size={scale(20)}
                                    checked={this.state.ruleChoice}
                                    onPress={() => {
                                        trigger();
                                        this.setState({
                                            ruleChoice: !this.state.ruleChoice,
                                        });
                                    }}
                                />
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => {
                                        trigger();
                                        this.setState({
                                            ruleChoice: !this.state.ruleChoice,
                                        });
                                    }}>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            color: COLOR_DIY.black.third,
                                            fontSize: scale(13),
                                        }}>
                                        我已閱讀且同意遵守
                                    </Text>
                                </TouchableOpacity>
                                {/* 查看用戶協議 */}
                                <TouchableOpacity>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            color: COLOR_DIY.themeColor,
                                            fontSize: scale(13),
                                        }}
                                        activeOpacity={0.9}
                                        onPress={() => {
                                            openLink(USER_AGREE);
                                        }}>
                                        《隱私政策與用戶協議》
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* 進駐提示 */}
                        <TouchableOpacity
                            onPress={() => openLink(USUAL_Q)}
                            style={{
                                alignSelf: 'center',
                                backgroundColor: COLOR_DIY.themeColorLight,
                                padding: scale(5),
                                borderRadius: scale(5),
                            }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: white,
                                    fontSize: scale(12),
                                }}>
                                還沒有賬號? 點我查看如何進駐ARK ALL！
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* 學生首次登錄提示 */}
                <DialogDIY
                    showDialog={this.state.showDialog}
                    text={`將跳轉Moodle登錄頁，成功登錄進入Moodle後，會自動完成註冊！\n請確定您已閱讀用戶條款`}
                    handleConfirm={() => {
                        this.getUmPass();
                        this.setState({ showDialog: false, showMoodle: true });
                    }}
                    handleCancel={() => this.setState({ showDialog: false })}
                />
            </View>
        );
    }
}

const s = StyleSheet.create({
    roleCardContainer: {
        flex: 1,
        height: scale(160),
        margin: scale(10),
        borderRadius: scale(15),
        justifyContent: 'center',
        alignItems: 'center',
        ...COLOR_DIY.viewShadow,
    },
    roleCardText: {
        ...uiStyle.defaultText,
        color: COLOR_DIY.white,
        fontSize: scale(17),
    },
});

export default LoginChoose;
