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
import {MeScreen} from '../MeScreen';
import {Logining} from '../index'

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';

class AppSetting extends Component {
    state = {};
    render() {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: COLOR_DIY.meScreenColor.bg_color,
                }}>
                {/*标题栏*/}
                <Header
                    backgroundColor={COLOR_DIY.meScreenColor.bg_color}
                    leftComponent={
                        <TouchableOpacity
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={COLOR_DIY.black.main}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '設置',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(18),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                    }}
                />
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
                                    position:'absolute',
                                    right:pxToDp(12),
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
                                    position:'absolute',
                                    right:pxToDp(12)
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
                                    position:'absolute',
                                    right:pxToDp(12)
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
                    <TouchableOpacity onPress={() => alert('閱讀並同意隱私條款')}
                        style={{
                            alignItems: 'center',
                            justifyContent:'center'
                        }}>
                        <Text
                            style={{
                                fontSize: pxToDp(13),
                                fontWeight: '600',
                                marginTop: pxToDp(15),
                                color:'#005F96',
                            }}>
                            {'《隱私信息收集與使用條款》'}
                        </Text>
                    </TouchableOpacity>               
                <TouchableOpacity style={{
                        height: '4%',
                        width: '35%',
                        padding: 10,
                        marginTop: '10%',
                        backgroundColor: '#005F96',
                        borderRadius:pxToDp(10),
                        justifyContent: 'center',
                        position:'absolute',
                        bottom:pxToDp(40),   
                        alignSelf:'center'                 
                }} onPress={() => this.props.navigation.navigate('Logining')}>
                    <Text style={{
                        fontSize:20,
                        alignSelf:'center',
                        color:'white',
                        fontWeight:'500'
                    }}>
                        退出登錄
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }
}

export default AppSetting;
