import React, { Component } from 'react';
import {
    Text,
    View,
    Image,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';

// 本地工具
import { COLOR_DIY } from '../../../utils/uiMap';
import { USUAL_Q } from '../../../utils/pathMap';
import Header from '../../../components/Header';

// 本Tabbar相關頁面
import Login from '../../../pages/ClubSystem/login';
import AppSetting from './pages/AppSetting';
import MyFollow from './pages/MyFollow';

// 第三方庫
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { inject } from 'mobx-react';
import { scale } from 'react-native-size-matters';

const { black, white } = COLOR_DIY;
const { bg_color, card_color } = COLOR_DIY.meScreenColor;

// 循環渲染選項
const optionsInfo = [
    {
        title: '我的追蹤',
        iconPath: 'heart-outline',
        routeName: 'MyFollow',
    },
    {
        title: '常見問題',
        iconPath: 'at-circle-outline',
        routeName: 'UsualQuestion',
    },
    {
        title: '設置',
        iconPath: 'settings-outline',
        routeName: 'AppSetting',
    },
];

// 學生個人用戶頁
class MeScreen extends Component {
    state = {
        // 是否已登錄
        isLogin: false,
        RootStoreChange: true,
        stdData: undefined,
    };

    componentDidMount() {
        const globalData = this.props.RootStore;
        if (globalData.userInfo && globalData.userInfo.stdData) {
            // console.log('Me檢測：有token緩存');
            this.setState({
                isLogin: true,
                stdData: globalData.userInfo.stdData,
            });
        }
    }

    // 渲染個人信息欄
    renderUserInfo = () => {
        const { Student_email, icon_url, name, _id } = this.state.stdData;
        return (
            <View style={{ ...s.personalInfoContainer }}>
                <View
                    style={{
                        height: '100%',
                        width: '80%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginLeft: scale(20),
                    }}>
                    {/* 頭像 */}
                    <Image
                        source={{ uri: icon_url }}
                        style={{
                            height: scale(70),
                            width: scale(70),
                            borderRadius: scale(70),
                        }}
                    />
                    {/* 暱稱 學號 展示 */}
                    <View
                        style={{
                            marginLeft: scale(20),
                            justifyContent: 'center',
                        }}>
                        <Text
                            style={{
                                color: COLOR_DIY.black.second,
                                fontSize: scale(20),
                                fontWeight: '600',
                            }}>
                            {name}
                        </Text>
                        <Text
                            style={{
                                color: COLOR_DIY.black.third,
                                fontSize: scale(16),
                                // fontWeight: '500',
                            }}>
                            {_id}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    // 渲染對應的選項
    renderOptions = optionsInfoIndex => {
        const { title, iconPath, routeName } = optionsInfo[optionsInfoIndex];
        return (
            <TouchableOpacity
                style={{ ...s.optionContainer }}
                activeOpacity={0.8}
                onPress={() => {
                    if (routeName == 'UsualQuestion') {
                        let webview_param = {
                            url: USUAL_Q,
                            title: '常見問題',
                        };
                        this.props.navigation.navigate(
                            'Webviewer',
                            webview_param,
                        );
                    } else {
                        this.props.navigation.navigate(routeName);
                    }
                }}>
                {/* 左側flex佈局 */}
                <View style={{ flexDirection: 'row' }}>
                    {/* 選項圖標 */}
                    <Ionicons
                        name={iconPath}
                        size={scale(22)}
                        color={COLOR_DIY.themeColor}
                    />
                    {/* 選項標題 */}
                    <Text style={{ ...s.optionTitle }}>{title}</Text>
                </View>

                {/* 右側flex佈局 */}
                {/* 引導點擊的 > 箭頭 */}
                <Ionicons
                    name="chevron-forward-outline"
                    color={black.third}
                    size={scale(20)}
                />
            </TouchableOpacity>
        );
    };

    handleRootStoreChange = () => {
        this.setState({ RootStoreChange: !this.state.RootStoreChange });
    };

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={'賬號登錄'} />

                {/* 檢查是否登錄 */}
                {this.state.isLogin ? (
                    // 展示學生個人系統頁面
                    <ScrollView>
                        {/* 個人信息欄 */}
                        {this.renderUserInfo()}

                        {/* 渲染選項 */}
                        {optionsInfo.map((_, index) =>
                            this.renderOptions(index),
                        )}

                        <View style={{ paddingBottom: scale(100) }} />
                    </ScrollView>
                ) : (
                    // 未登錄的用戶則展示登錄界面
                    <Login />
                )}
            </View>
        );
    }
}

const s = StyleSheet.create({
    personalInfoContainer: {
        height: scale(120),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLOR_DIY.meScreenColor.card_color,
        borderBottomLeftRadius: scale(40),
        borderBottomRightRadius: scale(40),
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: scale(45),
        padding: scale(10),
        backgroundColor: COLOR_DIY.meScreenColor.card_color,
        marginBottom: scale(1),
        borderRadius: scale(15),
        marginHorizontal: scale(10),
        marginVertical: scale(6),
    },
    optionTitle: {
        fontSize: scale(16),
        color: COLOR_DIY.black.main,
        marginLeft: scale(10),
    },
});

export default inject('RootStore')(MeScreen);
