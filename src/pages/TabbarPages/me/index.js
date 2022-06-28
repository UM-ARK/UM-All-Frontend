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
import {MeSetting} from './pages/MeSetting'

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
            <TouchableOpacity
            style={{
                height: pxToDp(120),
                width: '100%',
                flexDirection:'row',
                alignItems: 'center',
                backgroundColor: COLOR_DIY.meScreenColor.card_color,
            }} onPress={()=>this.props.navigation.navigate('MeSetting')}>
                {/* TODO: 致敬微信的交互，點擊整塊個人信息欄都會跳轉個人信息設置頁 */}
                {/* 頭像 */}
                    <Image
                        source={require('./icon/testphoto.png')}
                        style={{
                            height:pxToDp(70),
                            width:pxToDp(70),
                            borderRadius:pxToDp(70),
                            position:'absolute',
                            top:pxToDp(20),
                            left:pxToDp(20),
                        }}
                    />
                <View style={{
                    marginLeft:pxToDp(10),
                    height:pxToDp(80),
                    position:'absolute',
                    top:pxToDp(22),
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
                <View style={{
                    width:pxToDp(20),
                    height:pxToDp(20),
                    position: 'absolute',
                    right:pxToDp(35),
                    top:pxToDp(45)
                    }}>
                <Image source={require('./icon/report.png')} style={{marginLeft:pxToDp(5),width:pxToDp(20),height:pxToDp(20)}}/>
                <Image source={require('./icon/jiantou.png')}
                            style={{
                                width:pxToDp(10), 
                                height:pxToDp(10), 
                                position:'absolute',
                                top:pxToDp(6),
                                right:pxToDp(-15),
                            }}/>
                </View>
            </TouchableOpacity>
            {/* UM Pass 過期提示 */}
            <View style={{
                alignItems:'center',
                }}>
            <Text
                style={{
                    fontSize: 15,
                    fontWeight: '600',
                    marginTop: '2%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: COLOR_DIY.black.third,
                }}>
                {'Dual Authentication Remains: 14 Days'}
            </Text>
            </View>

            {/* Notifications 設置 */}
            <TouchableOpacity
                activeOpacity={0.5}
                style={{
                    height: '8%',
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
                            source={require('./icon/favorites.png')}
                            style={{
                                width:pxToDp(25), 
                                height:pxToDp(25), 
                                position:'absolute',
                                left:pxToDp(-5),
                            }}/>
                        <Text
                            style={{
                                fontSize: 18,
                                alignItems: 'center',
                                color: 'black',
                                position:'absolute',
                                left:pxToDp(30),
                            }}>
                            {'Favorties'}
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
                    height: '8%',
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
                            source={require('./icon/notification.png')}
                            style={{
                                width:pxToDp(25), 
                                height:pxToDp(25), 
                                position:'absolute',
                                left:pxToDp(-5),
                            }}/>
                        <Text
                            style={{
                                fontSize: 18,
                                alignItems: 'center',
                                color: 'black',
                                position:'absolute',
                                left:pxToDp(30),
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

            {/* QR Code */}
            <TouchableOpacity
                activeOpacity={0.5}
                style={{
                    height: '8%',
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
                                left:pxToDp(-5),
                            }}/>
                        <Text
                            style={{
                                fontSize: 18,
                                alignItems: 'center',
                                color: 'black',
                                position:'absolute',
                                left:pxToDp(30),
                            }}>
                            {'Reminders'}
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
                    height: '8%',
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
                                left:pxToDp(-5),
                            }}/>
                        <Text
                            style={{
                                fontSize: 18,
                                alignItems: 'center',
                                color: 'black',
                                position:'absolute',
                                left:pxToDp(30),
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
                    height: '8%',
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
                                left:pxToDp(-5),
                            }}/>
                        <Text
                            style={{
                                fontSize: 18,
                                alignItems: 'center',
                                color: 'black',
                                position:'absolute',
                                left:pxToDp(30),
                            }}>
                            {'Contact us'}
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