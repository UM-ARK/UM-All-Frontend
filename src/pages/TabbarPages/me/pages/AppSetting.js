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
import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';
import {handleLogout} from '../../../../utils/storageKits';
import Header from '../../../../components/Header';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {Dialog} from '@rneui/themed';

class AppSetting extends Component {
    state = {
        // 退出提示Dialog
        logoutChoice: false,
    };

    render() {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: COLOR_DIY.meScreenColor.bg_color,
                }}>
                {/*标题栏*/}
                <Header title={'設置'} />
                {/* 通知設置 */}
                <TouchableOpacity
                    activeOpacity={0.5}
                    style={{
                        height: '7%',
                        width: '100%',
                        padding: 10,
                        marginTop: pxToDp(0.8),
                        backgroundColor: 'white',
                        justifyContent: 'center',
                    }}
                    onPress={() => alert('系統消息設置')}>
                    <View
                        style={{
                            height: 48,
                            marginLeft: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                        <Text
                            style={{
                                fontSize: 18,
                                alignItems: 'center',
                                color: 'black',
                                position: 'absolute',
                                left: pxToDp(0),
                            }}>
                            {'通知設置'}
                        </Text>
                        <Image
                            source={require('../icon/jiantou.png')}
                            style={{
                                width: pxToDp(10),
                                height: pxToDp(10),
                                position: 'absolute',
                                right: pxToDp(12),
                            }}
                        />
                    </View>
                </TouchableOpacity>
                {/* 語言設置 */}
                <TouchableOpacity
                    activeOpacity={0.5}
                    style={{
                        height: '7%',
                        width: '100%',
                        padding: 10,
                        marginTop: pxToDp(0.8),
                        backgroundColor: 'white',
                        justifyContent: 'center',
                    }}
                    onPress={() => alert('語言設置')}>
                    <View
                        style={{
                            height: 48,
                            marginLeft: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                        <Text
                            style={{
                                fontSize: 18,
                                alignItems: 'center',
                                color: 'black',
                                position: 'absolute',
                                left: pxToDp(0),
                            }}>
                            {'語言設置'}
                        </Text>
                        <Image
                            source={require('../icon/jiantou.png')}
                            style={{
                                width: pxToDp(10),
                                height: pxToDp(10),
                                position: 'absolute',
                                right: pxToDp(12),
                            }}
                        />
                    </View>
                </TouchableOpacity>
                {/* 檢察更新 */}
                <TouchableOpacity
                    activeOpacity={0.5}
                    style={{
                        height: '7%',
                        width: '100%',
                        padding: 10,
                        marginTop: pxToDp(0.8),
                        backgroundColor: 'white',
                        justifyContent: 'center',
                    }}
                    onPress={() => alert('檢察更新')}>
                    <View
                        style={{
                            height: 48,
                            marginLeft: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                        <Text
                            style={{
                                fontSize: 18,
                                alignItems: 'center',
                                color: 'black',
                                position: 'absolute',
                                left: pxToDp(0),
                            }}>
                            {'檢察更新'}
                        </Text>
                        <Image
                            source={require('../icon/jiantou.png')}
                            style={{
                                width: pxToDp(10),
                                height: pxToDp(10),
                                position: 'absolute',
                                right: pxToDp(12),
                            }}
                        />
                    </View>
                </TouchableOpacity>
                {/* 隱私設置 */}
                <TouchableOpacity
                    activeOpacity={0.5}
                    style={{
                        height: '7%',
                        width: '100%',
                        padding: 10,
                        marginTop: '10%',
                        backgroundColor: 'white',
                        justifyContent: 'center',
                    }}
                    onPress={() => alert('隱私設置')}>
                    <View
                        style={{
                            height: 48,
                            marginLeft: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                        <Image
                            source={require('../icon/umsetting.png')}
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
                            {'隱私設置'}
                        </Text>
                        <Image
                            source={require('../icon/jiantou.png')}
                            style={{
                                width: pxToDp(10),
                                height: pxToDp(10),
                                position: 'absolute',
                                right: pxToDp(12),
                            }}
                        />
                    </View>
                </TouchableOpacity>
                {/* 隱私條款 */}
                <TouchableOpacity
                    onPress={() => alert('閱讀並同意隱私條款')}
                    style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <Text
                        style={{
                            fontSize: pxToDp(13),
                            fontWeight: '600',
                            marginTop: pxToDp(15),
                            color: COLOR_DIY.themeColor,
                        }}>
                        {'《隱私信息收集與使用條款》'}
                    </Text>
                </TouchableOpacity>

                {/* 登出按鈕 */}
                <TouchableOpacity
                    style={{
                        backgroundColor: COLOR_DIY.themeColor,
                        padding: pxToDp(10),
                        borderRadius: pxToDp(10),
                        position: 'absolute',
                        bottom: pxToDp(40),
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
                <Dialog
                    isVisible={this.state.logoutChoice}
                    onBackdropPress={() =>
                        this.setState({logoutChoice: false})
                    }>
                    <Dialog.Title title="UM ALL 提示" />
                    <Text style={{color: COLOR_DIY.black.second}}>
                        確定要登出賬號嗎？
                    </Text>
                    <Dialog.Actions>
                        <Dialog.Button title="確認" onPress={handleLogout} />
                        <Dialog.Button
                            title="取消"
                            onPress={() => this.setState({logoutChoice: false})}
                        />
                    </Dialog.Actions>
                </Dialog>
            </View>
        );
    }
}

export default AppSetting;
