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
import { BASE_URI, GET } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';

import { Input } from '@rneui/themed';
import axios from 'axios';
import qs from 'qs';
import { scale } from 'react-native-size-matters';
import Toast from "react-native-toast-message";

const { white, black, themeColor, } = COLOR_DIY;

// 存入臨時變量，準備提交後端驗證
let accountPassword = {
    account: '',
    password: '',
};

class ClubLogin extends Component {
    handleLoginPress = () => {
        trigger();
        // 賬戶輸入未完成
        if (accountPassword.account == '' || accountPassword.password == '') {
            Toast.show({
                type: 'warning',
                text1: '賬號密碼輸入未完成！'
            });
        } else {
            this.clubSignIn();
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
                    text1: 'Welcome Back ~'
                });
                handleLogin({ isClub: true, clubData: json.content, });
            }
            // 登錄失敗
            else {
                Toast.show({
                    type: 'error',
                    text1: '賬號或密碼錯誤！',
                    text2: '登錄失敗！'
                });
            }
        }).catch(err => {
            alert('Warning', err);
            Toast.show({
                type: 'warning',
                text1: '網絡錯誤！'
            });
        });
    }

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={'社團 | 組織 | 登錄'} />

                <ScrollView>
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

                    {/* 登錄按鈕 */}
                    <TouchableOpacity
                        style={{
                            justifyContent: 'center', alignItems: 'center',
                            marginTop: scale(5),
                            padding: scale(10), paddingHorizontal: scale(20),
                            backgroundColor: COLOR_DIY.themeColor,
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
