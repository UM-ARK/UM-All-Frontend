// 社團登錄頁
import React, { Component } from 'react';
import {
    Text,
    View,
    Image,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
    Linking,
} from 'react-native';

// 本地工具
import { COLOR_DIY, ToastText, uiStyle, } from '../../../../../utils/uiMap';
import Header from '../../../../../components/Header';
import { ToastDIY } from '../../../../../components/ToastDIY';
import { handleLogin } from '../../../../../utils/storageKits';
import ModalBottom from '../../../../../components/ModalBottom';
import { BASE_URI, GET, USUAL_Q } from '../../../../../utils/pathMap';

import { NavigationContext } from '@react-navigation/native';
import { Input, Box, Center, Stack, Icon } from 'native-base';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useToast } from 'native-base';
import axios from 'axios';
import qs from 'qs';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { scale } from 'react-native-size-matters';

// 存入臨時變量，準備提交後端驗證
let accountPassword = {
    account: '',
    password: '',
};

// 賬號密碼輸入框
const NBTextInput = () => {
    const [show, setShow] = React.useState(false);
    return (
        <Stack space={4} w="100%" alignItems="center">
            <Input
                variant="rounded"
                w={{
                    base: '75%',
                    md: '25%',
                }}
                InputLeftElement={
                    <Icon
                        as={<MaterialIcons name="person" />}
                        size={scale(20)}
                        ml="2"
                        color="muted.400"
                    />
                }
                placeholder="Club Account"
                onChangeText={account => (accountPassword.account = account)}
                color={COLOR_DIY.themeColor}
                fontSize={scale(15)}
            />
            <Input
                variant="rounded"
                w={{
                    base: '75%',
                    md: '25%',
                }}
                type={show ? 'text' : 'password'}
                InputRightElement={
                    <Icon
                        as={
                            <MaterialIcons
                                name={show ? 'visibility' : 'visibility-off'}
                            />
                        }
                        size={scale(20)}
                        mr="2"
                        color="muted.400"
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('soft');
                            setShow(!show);
                        }}
                    />
                }
                placeholder="Password"
                onChangeText={password => (accountPassword.password = password)}
                color={COLOR_DIY.themeColor}
                fontSize={scale(15)}
            />
        </Stack>
    );
};

// 渲染登錄按鈕，帶Toast提示
function RenderLoginButton(props) {
    const toast = useToast();
    const { unread, white, black, success } = COLOR_DIY;

    handleLoginPress = () => {
        ReactNativeHapticFeedback.trigger('soft');
        // 賬戶輸入未完成
        if (accountPassword.account == '' || accountPassword.password == '') {
            toast.show({
                placement: 'top',
                render: () => (
                    <ToastText
                        backgroundColor={unread}
                        text={`賬號密碼輸入未完成！`}
                    />
                ),
            });
        } else {
            clubSignIn();
        }
    };

    // 發送賬號密碼到服務器進行校驗
    async function clubSignIn() {
        let data = {
            account: accountPassword.account + '',
            password: accountPassword.password + '',
        };
        await axios({
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'post',
            url: BASE_URI + GET.CLUB_SIGN_IN,
            data: qs.stringify(data),
        })
            .then(res => {
                let json = res.data;
                // 登錄成功
                if (json.message == 'success') {
                    toast.show({
                        placement: 'top',
                        render: () => (
                            <ToastText
                                backgroundColor={success}
                                text={`Welcome Back ~\n━(*｀∀´*)ノ!`}
                            />
                        ),
                    });
                    handleLogin({
                        isClub: true,
                        clubData: json.content,
                    });
                }
                // 登錄失敗
                else {
                    toast.show({
                        placement: 'top',
                        render: () => (
                            <ToastText
                                backgroundColor={unread}
                                text={`賬號或密碼錯誤\n登錄失敗！`}
                            />
                        ),
                    });
                }
            })
            .catch(err => {
                alert('Warning', err);
                toast.show({
                    placement: 'top',
                    render: () => (
                        <ToastText
                            backgroundColor={unread}
                            text={`網絡錯誤！`}
                        />
                    ),
                });
            });
    }

    return (
        <TouchableOpacity
            style={{
                height: scale(50),
                width: scale(100),
                padding: scale(10),
                marginTop: scale(20),
                backgroundColor: COLOR_DIY.themeColor,
                borderRadius: scale(10),
                justifyContent: 'center',
                alignSelf: 'center',
            }}
            onPress={handleLoginPress}>
            <Text
                style={{
                    ...uiStyle.defaultText,
                    fontSize: scale(20),
                    alignSelf: 'center',
                    color: 'white',
                    fontWeight: '500',
                }}>
                登錄
            </Text>
        </TouchableOpacity>
    );
}

class ClubLogin extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    state = {
        // 展示長按圖片菜單
        isModalBottomVisible: false,
    };

    // 渲染聯繫我們 / 沒有社團賬號的幫助
    renderContactHelp = () => {
        return (
            <ModalBottom
                cancel={() => this.setState({ isModalBottomVisible: false })}
                style={{ height: '60%' }}>
                <ScrollView>
                    <View style={{ padding: scale(20) }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: COLOR_DIY.black.third,
                                fontSize: scale(13),
                            }}>
                            註冊須知:
                        </Text>
                        {/* TODO: 跳轉聯繫我們網頁 */}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: COLOR_DIY.black.second,
                                fontSize: scale(15),
                            }}>
                            {`歡迎各社團/組織使用ARK ALL~\n進駐ARK ALL，註冊一個“社團/組織”賬號，無需費用。\n進駐請將文件：1、組織頭像圖片。2、社團名字(簡稱)。3、需要設置的賬號&密碼。4、任何一種組織在澳大服務的證明。\n發送到郵箱xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n即有運營的同學幫忙註冊！`}
                        </Text>
                    </View>
                </ScrollView>
            </ModalBottom>
        );
    };

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={'社團 | 組織 | 登錄'} />

                {/* 聯繫我們彈出框 */}
                {/* {this.state.isModalBottomVisible && this.renderContactHelp()} */}

                <ScrollView>
                    <Icon
                        as={<MaterialCommunityIcons name="human-queue" />}
                        size={scale(120)}
                        ml="2"
                        color="muted.400"
                        style={{ alignSelf: 'center' }}
                    />

                    {/* 賬號密碼輸入框 */}
                    <View style={{ marginTop: scale(20) }}>
                        <NBTextInput />
                    </View>

                    {/* 登錄按鈕 */}
                    <RenderLoginButton />
                </ScrollView>
            </View>
        );
    }
}

export default ClubLogin;
