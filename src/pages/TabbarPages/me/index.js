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
import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'

import {Header} from 'react-native-elements'; // 4.0 Beta版

//个人信息页
class MeScreen extends Component {
    state = {} 

    render() {
        return (
        <View style={{ flex:1, backgroundColor:COLOR_DIY.meScreenColor.bg_color }}>
        <Header backgroundColor={COLOR_DIY.meScreenColor.card_color} statusBarProps={{backgroundColor:'transparent', barStyle:'dark-content'}} />
        <ScrollView>
            {/* TODO: 選項欄的顏色改為：COLOR_DIY.meScreenColor.card_color */}
            {/* 個人信息欄 */}
            <View
            style={{
                height: pxToDp(135),
                width: '100%',
                flexDirection:'row',
                alignItems: 'center',
                backgroundColor: COLOR_DIY.meScreenColor.card_color,
            }}>
                {/* TODO: 致敬微信的交互，點擊整塊個人信息欄都會跳轉個人信息設置頁 */}
                {/* 頭像 */}
                <TouchableOpacity activeOpacity={0.5}>
                    <Image
                        source={require('./icon/testphoto.png')}
                        style={{
                            height:pxToDp(70),
                            width:pxToDp(70),
                            borderRadius:pxToDp(70),
                            position:'absolute',
                            top:pxToDp(-23),
                            left:pxToDp(20),
                        }}
                    />
                </TouchableOpacity>
                <View style={{
                    marginLeft:pxToDp(10),
                    height:pxToDp(80),
                    position:'absolute',
                    top:pxToDp(47),
                    left:pxToDp(95),}}>
                <Text
                    style={{
                        color: 'black',
                        fontSize: 25,
                        fontWeight: '600',
                    }}>
                    {'Nick Name'}
                </Text>
                <View style={{
                    flexDirection:'row',
                }}>
                <Text
                    style={{
                        color: COLOR_DIY.black.second,
                        fontSize: 20,
                    }}>
                    {'FST'}
                </Text>
                <Text
                    style={{
                        color: COLOR_DIY.black.third,
                        fontSize: 20,
                    }}>
                    {'  |  '}
                </Text>
                <Text
                    style={{
                        color: COLOR_DIY.black.second,
                        fontSize: 20,
                    }}>
                    {'CKLC'}
                </Text>
                </View>
                </View>
                <TouchableOpacity style={{
                    width:pxToDp(20),
                    height:pxToDp(20),
                    position: 'absolute',
                    right:pxToDp(35),
                    top:pxToDp(70)
                    }}>
                <Image source={require('./icon/report.png')} style={{width:pxToDp(20),height:pxToDp(20)}}/>
                <Image source={require('./icon/jiantou.png')}
                            style={{
                                width:pxToDp(10), 
                                height:pxToDp(10), 
                                position:'absolute',
                                top:pxToDp(6),
                                right:pxToDp(-15),
                            }}/>
                </TouchableOpacity>
            </View>
            {/* TODO: UMPass Setting 集成進Setting選項 */}
            {/* UM PASS 設置 */}
            <TouchableOpacity
                activeOpacity={0.5}
                style={{
                    height: '7%',
                    width: '100%',
                    padding: 10,
                    marginTop:pxToDp(0.8),
                    backgroundColor: 'white',
                    justifyContent: 'center',
                }}>
                <View
                    style={{
                        height: 48,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                    <Image 
                        source={require('./icon/umsetting.png')}
                        style={{
                            width:pxToDp(25), 
                            height:pxToDp(25), 
                            position:'absolute',
                            left:pxToDp(0),
                        }}/>
                    <Text
                        style={{
                            fontSize: 20,
                            alignItems: 'center',
                            color: 'black',
                            position:'absolute',
                            left:pxToDp(40),
                        }}>
                        {'UMPass Settings'}
                    </Text>
                    <Image 
                    source={require('./icon/jiantou.png')}
                    style={{
                        width:pxToDp(10), 
                        height:pxToDp(10), 
                        position:'absolute',
                        right:pxToDp(12),
                    }}/>
                </View>
            </TouchableOpacity>

            {/* UM Pass 過期提示 */}
            <Text
                style={{
                    fontSize: 15,
                    fontWeight: '600',
                    marginTop: '2%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLOR_DIY.black.third,
                    marginLeft:pxToDp(15)
                }}>
                {'Dual Authentication Remains: 14 Days'}
            </Text>

            {/* Notifications 設置 */}
            <TouchableOpacity
                activeOpacity={0.5}
                style={{
                    height: '7%',
                    width: '100%',
                    padding: 10,
                    marginTop: '5%',
                    backgroundColor: 'white',
                    justifyContent: 'center',
                }}>
                <View>
                    <View
                        style={{
                            height: 48,
                            marginLeft: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                        <Image 
                            source={require('./icon/notification.png')}
                            style={{
                                width:pxToDp(25), 
                                height:pxToDp(25), 
                                position:'absolute',
                                left:pxToDp(0),
                            }}/>
                        <Text
                            style={{
                                fontSize: 20,
                                alignItems: 'center',
                                color: 'black',
                                position:'absolute',
                                left:pxToDp(40),
                            }}>
                            {'Notifications'}
                        </Text>
                        <Image 
                            source={require('./icon/jiantou.png')}
                            style={{
                                width:pxToDp(10), 
                                height:pxToDp(10), 
                                position:'absolute',
                                right:pxToDp(12),
                            }}/>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Your Reminder */}
            <TouchableOpacity
                activeOpacity={0.5}
                style={{
                    height: '7%',
                    width: '100%',
                    padding: 10,
                    backgroundColor: 'white',
                    justifyContent: 'center',
                    marginTop:pxToDp(0.8),
                }}>
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
                                width:pxToDp(25), 
                                height:pxToDp(25), 
                                position:'absolute',
                                left:pxToDp(0),
                            }}/>
                        <Text
                            style={{
                                fontSize: 20,
                                alignItems: 'center',
                                color: 'black',
                                position:'absolute',
                                left:pxToDp(40),
                            }}>
                            {'Your Reminder'}
                        </Text>
                        <Image 
                            source={require('./icon/jiantou.png')}
                            style={{
                                width:pxToDp(10), 
                                height:pxToDp(10), 
                                position:'absolute',
                                right:pxToDp(12),
                            }}/>
                    </View>
                </View>
            </TouchableOpacity>

            {/* QR Code */}
            <TouchableOpacity
                activeOpacity={0.5}
                style={{
                    height: '7%',
                    width: '100%',
                    padding: 10,
                    backgroundColor: 'white',
                    justifyContent: 'center',
                    marginTop:pxToDp(0.8),
                }}>
                <View>
                    <View
                        style={{
                            height: 48,
                            marginLeft: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                        <Image 
                            source={require('./icon/qrcode.png')}
                            style={{
                                width:pxToDp(25), 
                                height:pxToDp(25), 
                                position:'absolute',
                                left:pxToDp(0),
                            }}/>
                        <Text
                            style={{
                                fontSize: 20,
                                alignItems: 'center',
                                color: 'black',
                                position:'absolute',
                                left:pxToDp(40),
                            }}>
                            {'QR Code'}
                        </Text>
                        <Image 
                            source={require('./icon/jiantou.png')}
                            style={{
                                width:pxToDp(10), 
                                height:pxToDp(10), 
                                position:'absolute',
                                right:pxToDp(12),
                            }}/>
                    </View>
                </View>
            </TouchableOpacity>

            {/* Settings 欄 */}
            <TouchableOpacity
                activeOpacity={0.5}
                style={{
                    height: '7%',
                    width: '100%',
                    padding: 10,
                    marginTop: '4%',
                    backgroundColor: 'white',
                    justifyContent: 'center',
                }}>
                <View>
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
                                width:pxToDp(25), 
                                height:pxToDp(25), 
                                position:'absolute',
                                left:pxToDp(0),
                            }}/>
                        <Text
                            style={{
                                fontSize: 20,
                                alignItems: 'center',
                                color: 'black',
                                position:'absolute',
                                left:pxToDp(40),
                            }}>
                            {'Settings'}
                        </Text>
                        <Image 
                            source={require('./icon/jiantou.png')}
                            style={{
                                width:pxToDp(10), 
                                height:pxToDp(10), 
                                position:'absolute',
                                right:pxToDp(12),
                            }}/>
                    </View>
                </View>
            </TouchableOpacity>

            {/* 關於我們 入口 */}
            <TouchableOpacity
                activeOpacity={0.5}
                style={{
                    height: '7%',
                    width: '100%',
                    padding: 10,
                    backgroundColor: 'white',
                    justifyContent: 'center',
                    marginTop:pxToDp(0.8),
                }}>
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
                                width:pxToDp(25), 
                                height:pxToDp(25), 
                                position:'absolute',
                                left:pxToDp(0),
                            }}/>
                        <Text
                            style={{
                                fontSize: 20,
                                alignItems: 'center',
                                color: 'black',
                                position:'absolute',
                                left:pxToDp(40),
                            }}>
                            {'About us'}
                        </Text>
                        <Image 
                            source={require('./icon/jiantou.png')}
                            style={{
                                width:pxToDp(10), 
                                height:pxToDp(10), 
                                position:'absolute',
                                right:pxToDp(12),
                            }}/>
                    </View>
                </View>
            </TouchableOpacity>

        </ScrollView>
        </View>
        );
    }
}

export default MeScreen;