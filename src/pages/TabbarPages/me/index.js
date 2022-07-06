import React, {Component} from 'react';
import {
    Text,
    View,
    Image,
    TouchableOpacity,
    ScrollView,
    StatusBar,
} from 'react-native';

// 本地工具
import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

// 本Tabbar相關頁面
import Login from './Login';
import MeSetting from './pages/MeSetting';
import AppSetting from './pages/AppSetting';
import AboutUs from './pages/AboutUs';
import MyFollow from './pages/MyFollow';
import Reminder from './pages/Reminder';

// 第三方庫
import {Header} from '@rneui/themed';

//个人信息页
class MeScreen extends Component {
    state = {
        // 是否已登錄
        isLogin: true,
    };

    render() {
        const {black, white} = COLOR_DIY;
        const {bg_color, card_color} = COLOR_DIY.meScreenColor;
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: bg_color,
                }}>
                <Header
                    backgroundColor={card_color}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                        translucent: true,
                    }}
                />

                {/* 檢查是否登錄 */}
                {this.state.isLogin ? (
                    <ScrollView>
                        {/* 個人信息欄 */}
                        <TouchableOpacity
                            style={{
                                height: pxToDp(120),
                                width: '100%',
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: card_color,
                            }}
                            onPress={() =>
                                this.props.navigation.navigate('MeSetting')
                            }>
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

                        {/* UM Pass 過期提示 */}
                        <View
                            style={{
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                            <Text
                                style={{
                                    fontSize: pxToDp(13),
                                    fontWeight: '600',
                                    marginTop: pxToDp(15),
                                    color: black.third,
                                }}>
                                {'距離您的雙重認證過期還有 14 天'}
                            </Text>
                        </View>

                        {/* TODO: 我的追蹤 */}
                        {/* Notifications 設置 */}
                        <TouchableOpacity
                            activeOpacity={0.5}
                            style={{
                                height: '11%',
                                width: '100%',
                                padding: 10,
                                marginTop: '5%',
                                backgroundColor: 'white',
                                justifyContent: 'center',
                            }}
                            onPress={() =>
                                this.props.navigation.navigate('MyFollow')
                            }>
                            <View>
                                <View
                                    style={{
                                        height: 48,
                                        marginLeft: 10,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}>
                                    <Image
                                        source={require('./icon/favorites.png')}
                                        style={{
                                            width: pxToDp(25),
                                            height: pxToDp(25),
                                            position: 'absolute',
                                            left: pxToDp(-5),
                                        }}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 18,
                                            alignItems: 'center',
                                            color: 'black',
                                            position: 'absolute',
                                            left: pxToDp(30),
                                        }}>
                                        {'我的追蹤'}
                                    </Text>
                                    <Image
                                        source={require('./icon/jiantou.png')}
                                        style={{
                                            width: pxToDp(10),
                                            height: pxToDp(10),
                                            position: 'absolute',
                                            right: pxToDp(12),
                                        }}
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                        {/* 提醒事項 */}
                        <TouchableOpacity
                            activeOpacity={0.5}
                            style={{
                                height: '11%',
                                width: '100%',
                                padding: 10,
                                backgroundColor: 'white',
                                justifyContent: 'center',
                                marginTop: pxToDp(0.8),
                            }}
                            onPress={() =>
                                this.props.navigation.navigate('Reminder')
                            }>
                            <View>
                                <View
                                    style={{
                                        height: 48,
                                        marginLeft: 10,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}>
                                    <Image
                                        source={require('./icon/reminder.png')}
                                        style={{
                                            width: pxToDp(25),
                                            height: pxToDp(25),
                                            position: 'absolute',
                                            left: pxToDp(-5),
                                        }}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 18,
                                            alignItems: 'center',
                                            color: 'black',
                                            position: 'absolute',
                                            left: pxToDp(30),
                                        }}>
                                        {'提醒事項'}
                                    </Text>
                                    <Image
                                        source={require('./icon/jiantou.png')}
                                        style={{
                                            width: pxToDp(10),
                                            height: pxToDp(10),
                                            position: 'absolute',
                                            right: pxToDp(12),
                                        }}
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* App Settings 欄 */}
                        <TouchableOpacity
                            activeOpacity={0.5}
                            style={{
                                height: '11%',
                                width: '100%',
                                padding: 10,
                                marginTop: pxToDp(0.8),
                                backgroundColor: 'white',
                                justifyContent: 'center',
                            }}
                            onPress={() =>
                                this.props.navigation.navigate('AppSetting')
                            }>
                            <View
                                style={{
                                    height: 48,
                                    marginLeft: 10,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}>
                                <Image
                                    source={require('./icon/settings.png')}
                                    style={{
                                        width: pxToDp(25),
                                        height: pxToDp(25),
                                        position: 'absolute',
                                        left: pxToDp(-5),
                                    }}
                                />
                                <Text
                                    style={{
                                        fontSize: 18,
                                        alignItems: 'center',
                                        color: 'black',
                                        position: 'absolute',
                                        left: pxToDp(30),
                                    }}>
                                    {'設置'}
                                </Text>
                                <Image
                                    source={require('./icon/jiantou.png')}
                                    style={{
                                        width: pxToDp(10),
                                        height: pxToDp(10),
                                        position: 'absolute',
                                        right: pxToDp(12),
                                    }}
                                />
                            </View>
                        </TouchableOpacity>

                        {/* 關於我們 入口 */}
                        <TouchableOpacity
                            activeOpacity={0.5}
                            style={{
                                height: '11%',
                                width: '100%',
                                padding: 10,
                                backgroundColor: 'white',
                                justifyContent: 'center',
                                marginTop: '8%',
                            }}
                            onPress={() =>
                                this.props.navigation.navigate('AboutUs')
                            }>
                            <View>
                                <View
                                    style={{
                                        height: 48,
                                        marginLeft: 10,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}>
                                    <Image
                                        source={require('./icon/contactus.png')}
                                        style={{
                                            width: pxToDp(25),
                                            height: pxToDp(25),
                                            position: 'absolute',
                                            left: pxToDp(-5),
                                        }}
                                    />
                                    <Text
                                        style={{
                                            fontSize: 18,
                                            alignItems: 'center',
                                            color: 'black',
                                            position: 'absolute',
                                            left: pxToDp(30),
                                        }}>
                                        {'關於我們'}
                                    </Text>
                                    <Image
                                        source={require('./icon/jiantou.png')}
                                        style={{
                                            width: pxToDp(10),
                                            height: pxToDp(10),
                                            position: 'absolute',
                                            right: pxToDp(12),
                                        }}
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    // 未登錄的展示登錄界面
                    <Login></Login>
                )}
            </View>
        );
    }
}

export default MeScreen;
