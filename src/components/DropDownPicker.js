import React, {Component, useState} from 'react';
import {
    Text,
    View,
    StyleSheet,
    Dimensions,
    FlatList,
    ScrollView,
    TouchableWithoutFeedback,
    TouchableOpacity,
} from 'react-native';

import {COLOR_DIY} from '../utils/uiMap';
import {pxToDp} from '../utils/stylesKits';

import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ContentLoader, {Rect, Circle, Path} from 'react-content-loader/native';
import DropDownPicker from 'react-native-dropdown-picker';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const { height: PAGE_HEIGHT } = Dimensions.get('window');

class DropDown extends Component {
    //下拉菜单内容
    state = {
        Myfollow: false,
        open: false,
        value: 'default',
        items: [
            {label: '最新發佈', value: 'lastest'},
            {label: '最多追蹤', value: 'popular'},
            {label: '日期升序', value: 'oldest'},
            {label: '默認排序', value: 'default'},
        ],
    };

    render() {
        const {open, value, items, Myfollow} = this.state;

        return (
            <View
                style={{
                    width: '100%',
                    height: pxToDp(30),
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginLeft: pxToDp(30),
                    zIndex: 9,
                }}>
                <View>
                    {/*下拉菜单style*/}
                    <DropDownPicker
                        open={open}
                        value={value}
                        items={items}
                        setOpen={() => this.setState({open: !open})}
                        // 獲取當前選擇的項
                        onSelectItem={item => {
                            console.log(item);
                            this.setState({value: item.value});
                        }}
                        // 默認顯示，TODO: 應該與默認選擇一致
                        placeholder="排序"
                        style={{
                            marginTop: pxToDp(-24),
                            position:'absolute',
                            width: pxToDp(110),
                            height: pxToDp(35),
                            borderWidth: 0,
                            backgroundColor: 'transparent',
                            alignSelf: 'flex-start',
                            marginLeft: pxToDp(10),
                        }}
                        dropDownContainerStyle={{
                            width: PAGE_WIDTH,
                            position:'absolute',
                            marginLeft: pxToDp(-15),
                            marginTop: pxToDp(-37),
                            alignSelf: 'flex-start',
                            backgroundColor: COLOR_DIY.bg_color,
                            borderWidth: 0,
                            // TODO: 如果需要陰影，可以使用uiMap的viewShadow，還需增加自定義屬性可以直接覆蓋
                            shadowColor: '#000',
                            shadowOffset: {
                                width: 0,
                                height: 8,
                            },
                            shadowOpacity: 0.5,
                            shadowRadius: 3.84,
                            elevation: 5,
                            overflow: 'visible',
                        }}
                        textStyle={{
                            fontWeight: 'bold',
                            fontSize: pxToDp(13),
                            color: COLOR_DIY.themeColor,
                        }}
                    />
                </View>

                {/*我追踪的活动筛选*/}
                <TouchableOpacity
                    style={{
                        width: pxToDp(100),
                        position:'absolute',
                        marginTop:pxToDp(-10),
                        marginLeft:pxToDp(148),
                    }}
                    onPress={() =>
                        this.setState({Myfollow: Myfollow ? false : true})
                    }>
                    <Text
                        style={{
                            fontWeight: 'bold',
                            fontSize: pxToDp(13),
                            color: Myfollow ? '#FF8627' : COLOR_DIY.themeColor,
                        }}>
                        我的追蹤
                    </Text>
                </TouchableOpacity>

                {/*更多筛选的筛选器开关*/}
                <TouchableOpacity
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        width: pxToDp(100),
                        position:'absolute',
                        marginLeft:pxToDp(280),
                        marginTop:pxToDp(-10),
                    }}
                    onPress={() => alert('打開篩選器')}>
                    <Text
                        style={{
                            fontWeight: 'bold',
                            fontSize: pxToDp(13),
                            color: COLOR_DIY.themeColor,
                        }}>
                        篩選{' '}
                    </Text>
                    <Ionicons
                        name={'md-funnel-outline'}
                        size={pxToDp(10)}
                        color={COLOR_DIY.themeColor}
                    />
                </TouchableOpacity>
            </View>
        );
    }
}

export default DropDown;
