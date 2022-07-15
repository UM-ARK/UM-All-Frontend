import React, { Component, useState } from 'react';
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

import { COLOR_DIY } from '../src/utils/uiMap';
import { pxToDp } from '../src/utils/stylesKits';

import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ContentLoader, { Rect, Circle, Path } from 'react-content-loader/native';
import DropDownPicker from 'react-native-dropdown-picker';

class DropDown extends Component {
    state = {
        Myfollow: false,
        open: false,
        value: 'default',
        items: [
            { label: '最新發佈', value: 'lastest' },
            { label: '最多追蹤', value: 'popular' },
            { label: '日期升序', value: 'oldest' },
            { label: '默認排序', value: 'default' },
        ],
    }

    render() {

        const { open, value, items, Myfollow } = this.state;

        return (
            <View style={{
                width: '100%',
                height: pxToDp(30),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginLeft: pxToDp(30),
                zIndex: 1000,
            }}>
                <View style={{
                    marginTop: pxToDp(-3.5),
                }}>
                    <DropDownPicker
                        open={open}
                        value={value}
                        items={items}
                        setOpen={value => this.setState({ open: value })}
                        setValue={value => this.setState({ value: value })}
                        setItems={value => this.setState({ items: value })}
                        placeholder="排序"
                        style={{
                            marginTop: pxToDp(-10),
                            width: pxToDp(100),
                            height: pxToDp(35),
                            borderWidth: 0,
                            backgroundColor: 'transparent',
                            alignSelf: 'flex-start',
                            marginLeft: pxToDp(20),
                        }}
                        dropDownContainerStyle={{
                            width: pxToDp(375),
                            marginLeft: pxToDp(-15),
                            marginTop: pxToDp(-22),
                            alignSelf: 'flex-start',
                            backgroundColor: COLOR_DIY.bg_color,
                            borderWidth: 0,
                            shadowColor: "#000",
                            shadowOffset: {
                                width: 0,
                                height: 8,
                            },
                            shadowOpacity: 0.5,
                            shadowRadius: 3.84,
                            elevation: 5,
                            overflow: 'visible'
                        }}
                        textStyle={{
                            fontWeight: "bold",
                            fontSize: pxToDp(13),
                            color: COLOR_DIY.themeColor
                        }}
                    />
                </View>
                <TouchableOpacity style={{
                    width: pxToDp(100),
                }}
                    onPress={() => this.setState({ Myfollow: Myfollow ? false : true })}>
                    <Text style={{
                        fontWeight: "bold",
                        fontSize: pxToDp(13),
                        //color: COLOR_DIY.themeColor,
                        color: Myfollow ? "#FF8627" : COLOR_DIY.themeColor,
                    }}>我的追蹤</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    width: pxToDp(100),
                }}
                    onPress={() => alert("打開篩選器")}>
                    <Text style={{
                        fontWeight: "bold",
                        fontSize: pxToDp(13),
                        color: COLOR_DIY.themeColor
                    }}>篩選 </Text>
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