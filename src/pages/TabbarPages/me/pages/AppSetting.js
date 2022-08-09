import React, {Component} from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
} from 'react-native';

// 本地工具
import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';
import {handleLogout} from '../../../../utils/storageKits';
import {USER_AGREE} from '../../../../utils/pathMap';
import Header from '../../../../components/Header';
import DialogDIY from '../../../../components/DialogDIY';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {Dialog} from '@rneui/themed';
import CookieManager from '@react-native-cookies/cookies';

const {bg_color} = COLOR_DIY.meScreenColor;
const {black} = COLOR_DIY;

// 循環渲染選項
const optionsInfo = [
    {
        title: '通知設置',
        func: () => {
            alert('施工中');
        },
    },
    {
        title: '語言設置',
        func: () => {
            alert('施工中');
        },
    },
    {
        title: '檢查更新',
        func: () => {
            alert('施工中');
        },
    },
];

class AppSetting extends Component {
    state = {
        // 退出提示Dialog
        logoutChoice: false,
    };

    // 渲染對應的選項
    renderOptions = optionsInfoIndex => {
        const {title, func} = optionsInfo[optionsInfoIndex];
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                style={{...s.optionContainer}}
                onPress={func}>
                {/* 左側flex佈局 */}
                {/* 選項標題 */}
                <Text style={{...s.optionTitle}}>{title}</Text>

                {/* 右側flex佈局 */}
                {/* 引導點擊的 > 箭頭 */}
                <Ionicons
                    name="chevron-forward-outline"
                    color={black.third}
                    size={pxToDp(20)}
                />
            </TouchableOpacity>
        );
    };

    render() {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: COLOR_DIY.meScreenColor.bg_color,
                }}>
                {/*标题栏*/}
                <Header title={'APP設置'} />

                {/* TODO: 幾項設置 */}
                {/* {optionsInfo.map((_, index) => this.renderOptions(index))} */}

                {/* 快捷登錄設置 */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={{...s.optionContainer, marginTop: pxToDp(20)}}
                    onPress={() =>
                        this.props.navigation.navigate('LoginSetting')
                    }>
                    {/* 左側flex佈局 */}
                    <View style={{flexDirection: 'row'}}>
                        <Ionicons
                            name="shield-checkmark-outline"
                            color={COLOR_DIY.themeColor}
                            size={pxToDp(20)}
                        />
                        <Text
                            style={{
                                fontSize: pxToDp(18),
                                alignItems: 'center',
                                color: 'black',
                                marginLeft: pxToDp(5),
                            }}>
                            {'快捷登錄設置'}
                        </Text>
                    </View>

                    {/* 右側flex佈局 */}
                    {/* 引導點擊的 > 箭頭 */}
                    <Ionicons
                        name="chevron-forward-outline"
                        color={black.third}
                        size={pxToDp(20)}
                    />
                </TouchableOpacity>

                {/* 隱私條款 */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                        let webview_param = {
                            url: USER_AGREE,
                            title: '用戶協議',
                        };
                        this.props.navigation.navigate(
                            'Webviewer',
                            webview_param,
                        );
                    }}
                    style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: pxToDp(15),
                    }}>
                    <Text
                        style={{
                            fontSize: pxToDp(13),
                            color: COLOR_DIY.themeColor,
                        }}>
                        {'《隱私信息收集與使用條款》'}
                    </Text>
                </TouchableOpacity>

                {/* 登出按鈕 */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={{
                        marginTop: pxToDp(10),
                        backgroundColor: COLOR_DIY.unread,
                        padding: pxToDp(10),
                        borderRadius: pxToDp(10),
                        justifyContent: 'center',
                        alignSelf: 'center',
                    }}
                    onPress={() => this.setState({logoutChoice: true})}>
                    <Text
                        style={{
                            fontSize: pxToDp(20),
                            color: 'white',
                            fontWeight: '500',
                        }}>
                        登出賬號
                    </Text>
                </TouchableOpacity>
                {/* 登出前提示 */}
                <DialogDIY
                    showDialog={this.state.logoutChoice}
                    text={'確定要登出賬號嗎？'}
                    handleConfirm={handleLogout}
                    handleCancel={() => this.setState({logoutChoice: false})}
                />
            </View>
        );
    }
}

const s = StyleSheet.create({
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: pxToDp(45),
        padding: pxToDp(10),
        backgroundColor: COLOR_DIY.meScreenColor.card_color,
        marginBottom: pxToDp(1),
        borderRadius: pxToDp(15),
        marginHorizontal: pxToDp(10),
        marginVertical: pxToDp(6),
    },
    optionTitle: {
        fontSize: pxToDp(16),
        color: COLOR_DIY.black.main,
        marginLeft: pxToDp(10),
    },
});

export default AppSetting;
