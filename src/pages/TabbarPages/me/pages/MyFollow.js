import React, {Component} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';
import Header from '../../../../components/Header';

// 第三方庫
import Ionicons from 'react-native-vector-icons/Ionicons';

const {bg_color} = COLOR_DIY.meScreenColor;
const {black} = COLOR_DIY;

// 循環渲染選項
const optionsInfo = [
    {
        title: '活動',
        func: '',
    },
    {
        title: '組織/社團',
        func: '',
    },
];

class MyFollow extends Component {
    // 渲染對應的選項
    renderOptions = optionsInfoIndex => {
        const {title, func} = optionsInfo[optionsInfoIndex];
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                style={{...s.optionContainer}}
                onPress={() => alert('TODO: 對應func')}>
                {/* 左側flex佈局 */}
                {/* 選項標題 */}
                <Text style={{...s.optionTitle}}>{title}</Text>

                {/* 右側flex佈局 */}
                {/* 引導點擊的 > 箭頭 */}
                <Ionicons
                    name="chevron-forward-outline"
                    color={black.third}
                    size={pxToDp(20)}
                />
            </TouchableOpacity>
        );
    };

    render() {
        return (
            <View style={{flex: 1}}>
                <Header title={'我的追蹤'} />

                {optionsInfo.map((_, index) => this.renderOptions(index))}
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

export default MyFollow;
