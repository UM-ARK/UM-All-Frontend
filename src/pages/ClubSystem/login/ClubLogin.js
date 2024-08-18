// 社團登錄頁
import React, { Component } from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    ScrollView,
} from 'react-native';

// 本地工具
import { COLOR_DIY, uiStyle, } from '../../../utils/uiMap';
import Header from '../../../components/Header';
import { handleLogin } from '../../../utils/storageKits';
import { BASE_URI, GET, USER_AGREE, USUAL_Q, } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import { openLink } from '../../../utils/browser';

import { Input } from '@rneui/themed';
import axios from 'axios';
import qs from 'qs';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from "react-native-toast-message";
import { CheckBox } from '@rneui/themed';
import { t } from 'i18next';

const { white, black, themeColor, } = COLOR_DIY;

// 存入臨時變量，準備提交後端驗證
let accountPassword = {
    account: '',
    password: '',
};

class ClubLogin extends Component {
    state = {
        ruleChoice: false,
    };

    handleLoginPress = () => {
        trigger();
        // 賬戶輸入未完成
        if (accountPassword.account == '' || accountPassword.password == '') {
            Toast.show({
                type: 'warning',
                text1: '賬號密碼輸入未完成！',
                topOffset: scale(100),
                onPress: () => Toast.hide(),
            });
        } else {
            if (!this.state.ruleChoice) {
                Toast.show({
                    type: 'warning',
                    text1: '請先閱讀和同意相關協議！',
                    topOffset: scale(100),
                    onPress: () => Toast.hide(),
                });
            } else {
                this.clubSignIn();
            }
        }
    };

    // 發送賬號密碼到服務器進行校驗
    clubSignIn = async () => {
        let data = {
            account: accountPassword.account + '',
            password: accountPassword.password + '',
        };
        await axios({
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', },
            method: 'post',
            url: BASE_URI + GET.CLUB_SIGN_IN,
            data: qs.stringify(data),
        }).then(res => {
            let json = res.data;
            // 登錄成功
            if (json.message == 'success') {
                Toast.show({
                    type: 'arkToast',
                    text1: 'Welcome Back ~',
                    topOffset: scale(100),
                    onPress: () => Toast.hide(),
                });
                handleLogin({ isClub: true, clubData: json.content, });
            }
            // 登錄失敗
            else {
                Toast.show({
                    type: 'error',
                    text1: '賬號或密碼錯誤！',
                    text2: '登錄失敗！',
                    topOffset: scale(100),
                    onPress: () => Toast.hide(),
                });
            }
        }).catch(err => {
            alert('Warning', err);
            Toast.show({
                type: 'warning',
                text1: '網絡錯誤！',
                topOffset: scale(100),
                onPress: () => Toast.hide(),
            });
        });
    }

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={'社團 | 組織 | 登錄'} />

                <ScrollView>
                    {/* 登錄提示 */}
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: COLOR_DIY.black.third,
                        fontSize: scale(13),
                        alignSelf: 'center',
                    }}>{t("社團/組織賬號登錄入口，請勿使用UMPASS", { ns: 'club' })}</Text>

                    {/* 賬號 */}
                    <Input
                        placeholder='賬號 | Account'
                        placeholderTextColor={black.third}
                        leftIcon={{ type: 'material-community', name: 'account-box', color: black.third }}
                        onChangeText={account => (accountPassword.account = account)}
                        style={{ color: themeColor, }}
                    />
                    {/* 密碼 */}
                    <Input
                        placeholder='密碼 | Password'
                        placeholderTextColor={black.third}
                        leftIcon={{ type: 'material-community', name: 'shield-sword', color: black.third }}
                        onChangeText={password => (accountPassword.password = password)}
                        style={{ color: themeColor, }}
                    />

                    {/* 登錄提示 */}
                    <View style={{ alignSelf: 'center', }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', }}>
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

                    {/* 註冊、進駐提示 */}
                    <TouchableOpacity
                        onPress={() => openLink(USUAL_Q)}
                        style={{
                            alignSelf: 'center',
                            backgroundColor: COLOR_DIY.themeColorLight,
                            padding: scale(5),
                            borderRadius: scale(5),
                            marginTop: verticalScale(10),
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: white,
                                fontSize: scale(12),
                            }}>
                            註冊/進駐ARK ALL
                        </Text>
                    </TouchableOpacity>

                    {/* 登錄按鈕 */}
                    <TouchableOpacity
                        style={{
                            justifyContent: 'center', alignItems: 'center',
                            marginTop: verticalScale(15),
                            padding: scale(10), paddingHorizontal: scale(20),
                            backgroundColor: this.state.ruleChoice ? COLOR_DIY.themeColor : COLOR_DIY.themeColorLight,
                            borderRadius: scale(10),
                            alignSelf: 'center',
                        }}
                        onPress={this.handleLoginPress}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(20),
                            color: white,
                        }}>
                            登錄
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View >
        );
    }
}

export default ClubLogin;
