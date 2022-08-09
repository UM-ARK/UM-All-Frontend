import React, {Component} from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
} from 'react-native';

import {COLOR_DIY} from '../../../../../utils/uiMap';
import {pxToDp} from '../../../../../utils/stylesKits';
import Header from '../../../../../components/Header';

import {Switch} from 'react-native-ui-lib';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {bg_color, black, white, themeColor} = COLOR_DIY;

class LoginSetting extends Component {
    state = {
        enableQI: false,
        account: '',
        password: '',
    };

    async componentDidMount() {
        try {
            const strUmPassInfo = await AsyncStorage.getItem('umPass');
            const UmPassInfo = strUmPassInfo ? JSON.parse(strUmPassInfo) : {};
            if (JSON.stringify(UmPassInfo) != '{}') {
                this.setState({
                    enableQI: true,
                    account: UmPassInfo.account,
                    password: UmPassInfo.password,
                });
            }
        } catch (e) {
            alert(e);
        }
    }

    async handleSavePW(account, password) {
        try {
            const strUmPassInfo = JSON.stringify({account, password});
            await AsyncStorage.setItem('umPass', strUmPassInfo)
                .then(() => {
                    if (this.state.enableQI) {
                        alert('已將賬號密碼保存至本地~');
                    } else {
                        alert('已關閉該功能');
                    }
                })
                .catch(e => console.log(e));
        } catch (e) {
            alert(e);
        }
    }

    render() {
        const {enableQI, account, password} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'快捷登錄設置'}></Header>

                <ScrollView>
                    {/* 是否啟用快捷輸入功能 */}
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            alignSelf: 'center',
                            marginTop: pxToDp(10),
                        }}>
                        <Text style={styles.inputTitle}>
                            啟用快捷輸入UM PASS功能
                        </Text>
                        <Switch
                            value={enableQI}
                            onValueChange={(enableQI: boolean) => {
                                this.setState({enableQI});
                                if (!enableQI) {
                                    this.handleSavePW('', '');
                                }
                            }}
                            style={{marginLeft: pxToDp(5)}}
                            onColor={themeColor}
                        />
                    </View>

                    {enableQI ? (
                        <View
                            style={{
                                alignItems: 'center',
                                paddingVertical: pxToDp(10),
                            }}>
                            {/* 賬號輸入 */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}>
                                <Text style={{color: black.third}}>賬號：</Text>
                                <TextInput
                                    style={styles.inputContainer}
                                    maxLength={100}
                                    value={this.state.account}
                                    onChangeText={account =>
                                        this.setState({account})
                                    }
                                />
                            </View>

                            {/* 密碼輸入 */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginVertical: pxToDp(10),
                                }}>
                                <Text style={{color: black.third}}>密碼：</Text>
                                <TextInput
                                    style={styles.inputContainer}
                                    maxLength={100}
                                    value={this.state.password}
                                    onChangeText={password =>
                                        this.setState({password})
                                    }
                                    secureTextEntry={true}
                                />
                            </View>

                            {/* 保存 */}
                            <View>
                                <TouchableOpacity
                                    style={styles.saveButton}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        if (
                                            account.length > 0 &&
                                            password.length > 0
                                        ) {
                                            this.handleSavePW(
                                                account,
                                                password,
                                            );
                                        } else {
                                            alert('請輸入完整的賬號密碼');
                                        }
                                    }}>
                                    <Text style={{color: white}}>保存</Text>
                                </TouchableOpacity>
                            </View>

                            {/* 使用須知 */}
                            <View
                                style={{
                                    marginTop: pxToDp(10),
                                    justifyContent: 'flex-start',
                                    alignItems: 'flex-start',
                                }}>
                                <Text
                                    style={{
                                        color: black.second,
                                        alignSelf: 'center',
                                        fontSize: pxToDp(15),
                                    }}>
                                    使用須知
                                </Text>
                                <Text
                                    style={{
                                        color: black.third,
                                        marginHorizontal: pxToDp(15),
                                        marginTop: pxToDp(5),
                                    }}>
                                    {`重申：APP不會在用戶不知情、不同意的情況下，擅自搜集用戶的賬號密碼，和上傳至服務器。\n\n緣由：因雙重認證或UM Pass憑證過期，在使用APP其他服務時會需要重新登錄UM Pass。該功能將用戶輸入的賬號密碼儲存在用戶的設備中，當需要UM Pass登錄時會根據此處的輸入自動填入。\n\n該功能僅適用於APP內登錄需UM PASS認證的頁面，在您清空緩存或卸載APP後，儲存的密碼會自動清空。`}
                                </Text>
                            </View>
                        </View>
                    ) : null}
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    inputTitle: {
        color: themeColor,
        fontSize: pxToDp(16),
    },
    inputContainer: {
        width: '60%',
        height: pxToDp(40),
        borderWidth: 1,
        borderColor: themeColor,
        color: themeColor,
        paddingVertical: pxToDp(10),
        paddingHorizontal: pxToDp(15),
        borderRadius: pxToDp(10),
    },
    saveButton: {
        paddingVertical: pxToDp(10),
        paddingHorizontal: pxToDp(15),
        borderRadius: pxToDp(10),
        backgroundColor: themeColor,
    },
});

export default LoginSetting;
