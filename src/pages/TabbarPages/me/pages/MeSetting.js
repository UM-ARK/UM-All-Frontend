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
import {MeScreen} from '../index';

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';

class MeSetting extends Component {
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
                        text: 'My Profile',
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
                {/* 头像设置 */}
                <TouchableOpacity
                    activeOpacity={0.5}
                    style={{
                        height: '10%',
                        width: '100%',
                        padding: 10,
                        backgroundColor: 'white',
                        justifyContent: 'center',
                    }}
                    onPress={() => alert('头像更换')}>
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
                            {'大頭貼'}
                        </Text>
                        <Image
                            source={require('../icon/testphoto.png')}
                            style={{
                                width: pxToDp(55),
                                height: pxToDp(55),
                                position: 'absolute',
                                right: pxToDp(25),
                            }}
                        />
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
                {/* 修改昵称 */}
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
                    onPress={() => alert('修改昵称')}>
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
                            {'名字'}
                        </Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                position: 'absolute',
                                right: pxToDp(10),
                            }}>
                            <Text
                                style={{
                                    fontSize: 18,
                                    alignItems: 'center',
                                    color: '#a1a1a1',
                                    marginRight: pxToDp(5),
                                }}>
                                Nick Name
                            </Text>
                            <Image
                                source={require('../icon/jiantou.png')}
                                style={{
                                    width: pxToDp(10),
                                    height: pxToDp(10),
                                }}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
                {/* 修改书院 */}
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
                    onPress={() => alert('修改书院')}>
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
                            {'書院'}
                        </Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                position: 'absolute',
                                right: pxToDp(10),
                            }}>
                            <Text
                                style={{
                                    fontSize: 18,
                                    alignItems: 'center',
                                    color: '#a1a1a1',
                                    marginRight: pxToDp(5),
                                }}>
                                CKLC
                            </Text>
                            <Image
                                source={require('../icon/jiantou.png')}
                                style={{
                                    width: pxToDp(10),
                                    height: pxToDp(10),
                                }}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
                {/* 修改学院 */}
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
                    onPress={() => alert('修改学院')}>
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
                            {'學院'}
                        </Text>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                position: 'absolute',
                                right: pxToDp(10),
                            }}>
                            <Text
                                style={{
                                    fontSize: 18,
                                    alignItems: 'center',
                                    color: '#a1a1a1',
                                    marginRight: pxToDp(5),
                                }}>
                                FST
                            </Text>
                            <Image
                                source={require('../icon/jiantou.png')}
                                style={{
                                    width: pxToDp(10),
                                    height: pxToDp(10),
                                }}
                            />
                        </View>
                    </View>
                </TouchableOpacity>
                {/* UMPass授权 */}
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
                    onPress={() => alert('UMPass授权')}>
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
                            {'UMPass 設置'}
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
            </View>
        );
    }
}

export default MeSetting;
