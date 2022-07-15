import React, {Component} from 'react';
import {
    Text,
    View,
    Image,
    TouchableOpacity,
    StatusBar,
    StyleSheet,
} from 'react-native';

// 本地工具
import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';
import Header from '../../../../components/Header';

import Ionicons from 'react-native-vector-icons/Ionicons';

const {bg_color} = COLOR_DIY.meScreenColor;
const {black} = COLOR_DIY;

// 循環渲染選項
const optionsInfo = [
    {
        title: '名字',
        content: 'Nick Name',
    },
    {
        title: '書院',
        content: 'CKLC',
    },
    {
        title: '學院',
        content: 'FST',
    },
];

class MeSetting extends Component {
    // 渲染對應的選項
    renderOptions = optionsInfoIndex => {
        const {title, content} = optionsInfo[optionsInfoIndex];
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                style={{...s.optionContainer}}
                onPress={() => alert('TODO: 對應func')}>
                {/* 左側flex佈局 */}
                {/* 選項標題 */}
                <Text style={{...s.optionTitle}}>{title}</Text>

                {/* 右側flex佈局 */}
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text
                        style={{
                            fontSize: pxToDp(18),
                            color: '#a1a1a1',
                            marginRight: pxToDp(5),
                        }}>
                        {content}
                    </Text>
                    {/* 引導點擊的 > 箭頭 */}
                    <Ionicons
                        name="chevron-forward-outline"
                        color={black.third}
                        size={pxToDp(20)}
                    />
                </View>
            </TouchableOpacity>
        );
    };

    render() {
        return (
            <View style={{flex: 1, backgroundColor: bg_color}}>
                {/*标题栏*/}
                <Header title={'APP設置'} />

                {/* 头像设置 */}
                {false && (
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
                                height: pxToDp(48),
                                marginLeft: pxToDp(10),
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
                )}

                {/* 渲染對應選項 */}
                {optionsInfo.map((_, index) => this.renderOptions(index))}

                {/* UMPass設置 */}
                <TouchableOpacity
                    activeOpacity={0.8}
                    style={{...s.optionContainer, marginTop: pxToDp(30)}}
                    onPress={() => alert('TODO: 對應func')}>
                    {/* 左側flex佈局 */}
                    {/* 選項標題 */}
                    <View style={{flexDirection: 'row'}}>
                        <Image
                            source={require('../icon/umsetting.png')}
                            style={{
                                width: pxToDp(25),
                                height: pxToDp(25),
                            }}
                        />
                        <Text
                            style={{
                                fontSize: pxToDp(18),
                                color: 'black',
                                marginLeft: pxToDp(5),
                            }}>
                            {'UMPass 設置'}
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

export default MeSetting;
