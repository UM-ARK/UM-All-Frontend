import React, {Component} from 'react';
import {Text, View, Image, TouchableOpacity, ScrollView} from 'react-native';

// 本地工具
import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

// 本Tabbar相關頁面
import Login from './pages/Login';
import MeSetting from './pages/MeSetting';
import AppSetting from './pages/AppSetting';
import AboutUs from './pages/AboutUs';
import MyFollow from './pages/MyFollow';
import Reminder from './pages/Reminder';

// 第三方庫
import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {inject} from 'mobx-react';

const optionsInfo = [
    {
        title: '我的追蹤',
        iconPath: require('./icon/favorites.png'),
        routeName: 'MyFollow',
    },
    {
        title: '設置',
        iconPath: require('./icon/settings.png'),
        routeName: 'AppSetting',
    },
    {
        title: '關於我們',
        iconPath: require('./icon/contactus.png'),
        routeName: 'AboutUs',
    },
];

//个人信息页
class MeScreen extends Component {
    state = {
        // 是否已登錄
        isLogin: false,
        RootStoreChange: true,
    };

    componentDidMount() {
        const globalData = this.props.RootStore;
        if (
            globalData.userInfo &&
            JSON.stringify(globalData.userInfo) != '{}'
        ) {
            console.log('Me檢測：有token緩存');
            this.setState({
                isClub: globalData.userInfo.isClub,
                isLogin: true,
            });
        }
    }

    // 渲染個人信息欄
    renderUserInfo = () => {
        const {black, white} = COLOR_DIY;
        const {bg_color, card_color} = COLOR_DIY.meScreenColor;
        return (
            <TouchableOpacity
                style={{
                    height: pxToDp(120),
                    width: '100%',
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: card_color,
                }}
                onPress={() => this.props.navigation.navigate('MeSetting')}
                activeOpacity={0.7}>
                <View
                    style={{
                        height: '100%',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: pxToDp(20),
                    }}>
                    {/* 頭像 */}
                    <Image
                        source={require('./icon/testphoto.png')}
                        style={{
                            height: pxToDp(70),
                            width: pxToDp(70),
                            borderRadius: pxToDp(70),
                        }}
                    />
                    {/* 暱稱 & 書院 & 學院 展示 */}
                    <View
                        style={{
                            height: '100%',
                            marginLeft: pxToDp(20),
                            height: pxToDp(80),
                            justifyContent: 'center',
                        }}>
                        {/* 暱稱 Nick Name */}
                        <Text
                            style={{
                                color: 'black',
                                fontSize: 25,
                                fontWeight: '600',
                            }}>
                            {'暱稱顯示'}
                        </Text>
                        {/* 學院、書院 縮寫展示 */}
                        <View
                            style={{
                                flexDirection: 'row',
                            }}>
                            <Text
                                style={{
                                    color: black.second,
                                    fontSize: 20,
                                }}>
                                {'FST'}
                            </Text>
                            <Text
                                style={{
                                    color: black.third,
                                    fontSize: 20,
                                }}>
                                {'  |  '}
                            </Text>
                            <Text
                                style={{
                                    color: black.second,
                                    fontSize: 20,
                                }}>
                                {'CKLC'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* 右側編輯引導圖標 */}
                <View
                    style={{
                        width: pxToDp(20),
                        height: pxToDp(20),
                        position: 'absolute',
                        right: pxToDp(35),
                        top: pxToDp(45),
                    }}>
                    <Image
                        source={require('./icon/report.png')}
                        style={{
                            marginLeft: pxToDp(5),
                            width: pxToDp(20),
                            height: pxToDp(20),
                        }}
                    />
                    <Image
                        source={require('./icon/jiantou.png')}
                        style={{
                            width: pxToDp(10),
                            height: pxToDp(10),
                            position: 'absolute',
                            top: pxToDp(6),
                            right: pxToDp(-15),
                        }}
                    />
                </View>
            </TouchableOpacity>
        );
    };

    // 渲染對應的選項
    renderOptions = optionsInfoIndex => {
        const {title, iconPath, routeName} = optionsInfo[optionsInfoIndex];
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: pxToDp(45),
                    width: '100%',
                    padding: pxToDp(10),
                    backgroundColor: COLOR_DIY.meScreenColor.card_color,
                }}
                onPress={() => this.props.navigation.navigate(routeName)}>
                {/* 左側flex佈局 */}
                <View style={{flexDirection: 'row'}}>
                    {/* 選項圖標 */}
                    <Image
                        source={iconPath}
                        style={{
                            width: pxToDp(25),
                            height: pxToDp(25),
                        }}
                    />
                    {/* 選項標題 */}
                    <Text
                        style={{
                            fontSize: pxToDp(16),
                            color: 'black',
                            marginLeft: pxToDp(10),
                        }}>
                        {title}
                    </Text>
                </View>

                {/* 右側flex佈局 */}
                {/* 引導點擊的 > 箭頭 */}
                <Ionicons
                    name="chevron-forward-outline"
                    color={'#c3c3c3'}
                    size={pxToDp(20)}
                    style={{
                        position: 'absolute',
                        right: pxToDp(10),
                    }}
                />
            </TouchableOpacity>
        );
    };

    handleRootStoreChange = () => {
        this.setState({RootStoreChange: !this.state.RootStoreChange});
    };

    render() {
        const {black, white} = COLOR_DIY;
        const {bg_color, card_color} = COLOR_DIY.meScreenColor;
        return (
            <View style={{flex: 1}}>
                {/* 檢查是否登錄 */}
                {this.state.isLogin ? (
                    <ScrollView>
                        <Header
                            backgroundColor={card_color}
                            statusBarProps={{
                                backgroundColor: 'transparent',
                                barStyle: 'dark-content',
                                translucent: true,
                            }}
                        />
                        {/* 個人信息欄 */}
                        {this.renderUserInfo()}

                        {/* 我的追蹤 欄 */}
                        <View style={{marginTop: pxToDp(10)}} />
                        {this.renderOptions(0)}

                        {/* App Settings 欄 */}
                        {this.renderOptions(1)}

                        {/* 關於我們 欄 */}
                        <View style={{marginTop: pxToDp(10)}} />
                        {this.renderOptions(2)}

                        <View style={{paddingBottom: pxToDp(100)}} />
                    </ScrollView>
                ) : (
                    // 未登錄的用戶則展示登錄界面
                    <Login></Login>
                )}
            </View>
        );
    }
}

export default inject('RootStore')(MeScreen);
