import React, {Component} from 'react';
import {
    Text,
    View,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    StatusBar,
} from 'react-native';

import {Header} from 'react-native-elements';

// 本地工具
import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'

//个人信息页
function MePage() {
    return (
        <View
            style={{
                height: '100%',
                alignItems: 'center',
                backgroundColor: 'f4f7fd',
            }}>
                <StatusBar translucent={true} />
            <View
                style={{
                    height: pxToDp(135),
                    width: '100%',
                    flexDirection:'row',
                    alignItems: 'center',
                    backgroundColor: 'white',
                }}>
                {/*点击头像可以绑定更换头像*/}
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
                        color: '#909399',
                        fontSize: 20,
                    }}>
                    {'FST'}
                </Text>
                <Text
                    style={{
                        color: '#909399',
                        fontSize: 20,
                    }}>
                    {'  |  '}
                </Text>
                <Text
                    style={{
                        color: '#909399',
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
                <View>
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
                </View>
            </TouchableOpacity>
            <Text
                style={{
                    fontSize: 15,
                    fontWeight: '600',
                    marginTop: '2%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#909399',
                }}>
                {'Dual Authentication Remains: 14 Days'}
            </Text>
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
        </View>
    );
}

export default MePage;
