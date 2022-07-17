// 失物招領
import React, {Component} from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
} from 'react-native';

// 引入本地工具
import {pxToDp} from '../../utils/stylesKits';
import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';

import axios from 'axios';

const {black, white, themeColor, bg_color} = COLOR_DIY;

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
                this.setState({data: json});
            })
            .catch(err => {
                console.error(err);
            });
    }

    render() {
        const {data} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: bg_color}}>
                <Header title={'失物招領'} />

                <ScrollView
                    contentContainerStyle={{paddingHorizontal: pxToDp(10)}}>
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
                                <View style={{marginVertical: pxToDp(5)}}>
                                    <Text>{item.current}</Text>
                                    <Text>{'拾獲日期: ' + item.date}</Text>
                                    <Text>{'拾獲地點: ' + item.pick_up}</Text>
                                    <Text>{'參考編號: ' + item.ref}</Text>
                                    <Text>{'物品: ' + item.title}</Text>
                                </View>
                            );
                        })
                    ) : (
                        <Text>Data is loading... Please waite a minute!</Text>
                    )}
                </ScrollView>
            </View>
        );
    }
}

export default LostAndFound;
