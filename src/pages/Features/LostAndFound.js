// 失物招領
import React, { Component } from 'react';
import {
    Text,
    View,
    ActivityIndicator,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
} from 'react-native';

// 引入本地工具
import { pxToDp } from '../../utils/stylesKits';
import { COLOR_DIY } from '../../utils/uiMap';
import Header from '../../components/Header';
import Loading from '../../components/Loading';

import axios from 'axios';

const { black, white, themeColor, bg_color } = COLOR_DIY;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center"
    },
    horizontal: {
        flexDirection: "row",
        justifyContent: "space-around",
        padding: 10
    }
});

//失物招領網頁數據轉json  (Lost and found)
function LaF_to_Json(html_source_data) {
    var return_js = [];
    //正則條件
    var patt = /<tr valign="top"[\s\S]*?Current Location : /g;
    var patt1 = /<font size="2">[\s\S]*?<\/font>/g;
    var patt2 = /拾獲地點 : [\s\S]*?<br>/g;
    var patt3 = /現時位置 : [\s\S]*?<\/font>/g;
    //用來刪除多餘的字符串
    var replace1 = /<font size="2">物品名稱 : <font color=red>/g;
    var replace2 = /<\/font>/g;
    var replace3 = /<font size="2">/g;
    var replace4 = /拾獲地點 : /g;
    var replace5 = /<br>/g;
    var replace6 = /現時位置 :  /g;

    data = html_source_data.match(patt); // 先將數據分割成塊

    for (i in data) {
        var js_piece = {};
        var temp_data;
        data1 = data[i].match(patt1);

        temp_data = data1[3];
        temp_data = temp_data.replace(replace1, '');
        temp_data = temp_data.replace(replace2, '');
        js_piece['title'] = temp_data;

        temp_data = data1[1];
        temp_data = temp_data.replace(replace2, '');
        temp_data = temp_data.replace(replace3, '');
        js_piece['date'] = temp_data;

        temp_data = data1[2];
        temp_data = temp_data.replace(replace2, '');
        temp_data = temp_data.replace(replace3, '');
        js_piece['ref'] = temp_data;

        data2 = data[i].match(patt2);
        temp_data = data2[0];
        temp_data = temp_data.replace(replace4, '');
        temp_data = temp_data.replace(replace5, '');
        js_piece['pick_up'] = temp_data;

        data3 = data[i].match(patt3);
        temp_data = data3[0];
        temp_data = temp_data.replace(replace6, '');
        temp_data = temp_data.replace(replace2, '');
        js_piece['current'] = temp_data;

        return_js[i] = js_piece;
    }

    return return_js;
}

class LostAndFound extends Component {
    state = {
        data: [],
    };

    constructor() {
        super();
        // 獲取數據
        this.getData();
    }

    async getData() {
        axios
            .get('https://um2.umac.mo/apps/com/umlostfound.nsf')
            .then(res => {
                let html = res.data;
                let json = LaF_to_Json(html);
                this.setState({ data: json });
            })
            .catch(err => {
                console.error(err);
            });
    }

    render() {
        const { data } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: bg_color }}>
                <Header title={'失物招領'} />

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: pxToDp(10) }}>
                    <Text
                        style={{
                            alignSelf: 'center',
                            marginBottom: pxToDp(10),
                            color: black.third,
                        }}>
                        Data from: um2.umac.mo
                    </Text>
                    {data.length > 0 ? (
                        data.map(item => {
                            return (
                                <View style={{
                                    marginVertical: pxToDp(5),
                                    width: pxToDp(340),
                                    height: pxToDp(200),
                                    backgroundColor: 'white',
                                    alignSelf: 'center',
                                    justifyContent: "space-around",
                                    borderRadius: pxToDp(12),
                                    shadowColor: '#000',
                                    shadowOffset: {
                                        width: 0,
                                        height: 3,
                                    },
                                    shadowOpacity: 0.3,
                                    shadowRadius: 3.84,
                                    elevation: 5,
                                    overflow: 'visible',
                                }}>
                                    <View style={{
                                        flexDirection: 'row',
                                        marginLeft: pxToDp(5)
                                    }}>
                                        <Text style={{
                                            color: COLOR_DIY.themeColor,
                                            fontSize: 23,
                                            fontWeight: 'bold',
                                            marginLeft: pxToDp(20),
                                            marginTop: pxToDp(8),
                                        }}>物品: </Text>
                                        <Text style={{
                                            color: '#FF8627',
                                            fontSize: 23,
                                            fontWeight: 'bold',
                                            marginTop: pxToDp(8),
                                        }}>{item.title}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', marginLeft: pxToDp(8) }}>
                                        <Text style={{
                                            fontWeight: 'bold',
                                            color: COLOR_DIY.themeColor,
                                            fontSize: 15,
                                        }}>拾獲日期: </Text>
                                        <Text style={{ fontSize: 15, }}>{item.date}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', marginLeft: pxToDp(8), width: pxToDp(260) }}>
                                        <Text style={{
                                            fontWeight: 'bold',
                                            color: COLOR_DIY.themeColor,
                                            fontSize: 15,
                                        }}>拾獲地點: </Text>
                                        <Text style={{ fontSize: 15, }}>{item.pick_up}</Text>
                                    </View>
                                    <View style={{
                                        flexDirection: 'row',
                                        marginLeft: pxToDp(8),
                                        width: pxToDp(260),
                                        marginBottom: pxToDp(6)
                                    }}>
                                        <Text style={{
                                            fontWeight: 'bold',
                                            color: COLOR_DIY.themeColor,
                                            fontSize: 15,
                                        }}>現時位置: </Text>
                                        <Text style={{ fontSize: 15, }}>{item.current.substr(7)}</Text>
                                    </View>
                                    <View style={{
                                        flexDirection: 'row',
                                        position: "absolute",
                                        marginTop: (13),
                                        width: pxToDp(150),
                                        alignSelf: 'flex-end',
                                    }}>
                                        <Text style={{
                                            color: black.third,
                                        }}>參考編號: </Text>
                                        <Text style={{
                                            color: black.third,
                                        }}>{item.ref}</Text>
                                    </View>
                                </View>
                            );
                        })
                    ) :
                        //加载动画
                        (
                            <View style={{
                                marginTop: pxToDp(200),
                                width: pxToDp(200),
                                height: pxToDp(110),
                                borderRadius: pxToDp(12),
                                backgroundColor: 'white',
                                alignSelf: 'center',
                                justifyContent: 'center',
                                alignItems: 'center',
                                shadowColor: '#000',
                                shadowOffset: {
                                    width: 0,
                                    height: 3,
                                },
                                shadowOpacity: 0.3,
                                shadowRadius: 3.84,
                                elevation: 3,
                                overflow: 'visible',
                            }}>
                                <Text style={{
                                    fontSize: 20,
                                    fontWeight: '600',
                                    color: COLOR_DIY.themeColor,
                                    marginTop: pxToDp(10),
                                }}>Data is loading </Text>
                                <Text style={{
                                    fontSize: 15,
                                    fontWeight: '600',
                                    color: COLOR_DIY.themeColor,
                                }}>Please wait</Text>
                                <Loading />
                            </View>
                        )
                    }
                </ScrollView>
            </View>
        );
    }
}

export default LostAndFound;
