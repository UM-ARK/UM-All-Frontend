// 失物招領
import React, { Component } from 'react';
import {
    Text,
    View,
    ScrollView,
    VirtualizedList,
    RefreshControl,
    TouchableOpacity,
    Linking,
    StyleSheet,
} from 'react-native';

// 引入本地工具
import { COLOR_DIY, uiStyle, } from '../../utils/uiMap';
import { UM_LOST_FOUND } from '../../utils/pathMap';
import { openLink } from '../../utils/browser';
import Header from '../../components/Header';
import Loading from '../../components/Loading';

import axios from 'axios';
import { scale } from 'react-native-size-matters';

const { black, white, themeColor, secondThemeColor, bg_color } = COLOR_DIY;

// 失物招領網頁數據轉json  (Lost and found)
function LaF_to_Json(html_source_data) {
    var return_js = [];
    // 正則條件
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
    // console.log(data);

    // 只記錄多少條數據
    // let recordNum = 200;
    // data.splice(recordNum, data.length - recordNum);
    // console.log(data);

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

// 整理需要返回的數據給renderItem
// 此處返回的數據會成為renderItem({item})獲取到的數據。。。
// 所以data數組需要在這裡引用一下
const getItem = (data, index) => {
    // data為VirtualizedList設置的data，index為當前渲染到的下標
    return data[index];
};

// 返回數據數組的長度
const getItemCount = data => {
    return data.length;
};

class LostAndFound extends Component {
    state = {
        data: undefined,
        isLoading: true,
    };

    constructor() {
        super();
        // 獲取數據
        this.getData();
    }

    async getData() {
        await axios
            .get(UM_LOST_FOUND)
            .then(res => {
                let html = res.data;
                // 截取20%，大概200條數據
                let recordNum = html.length / 5;
                html = html.slice(0, recordNum);
                let json = LaF_to_Json(html);
                this.setState({ data: json, isLoading: false });
            })
            .catch(err => {
                console.error(err);
            });
    }

    // 渲染失物卡片
    renderContent = item => {
        return (
            <View
                style={{
                    marginVertical: scale(5),
                    marginHorizontal: scale(15),
                    backgroundColor: white,
                    padding: scale(5),
                    borderRadius: scale(12),
                    ...COLOR_DIY.viewShadow,
                    overflow: 'visible',
                }}>
                {/* 物品名 */}
                <View
                    style={{
                        flexDirection: 'row',
                        marginLeft: scale(8),
                        marginVertical: scale(5),
                    }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: themeColor,
                            fontSize: scale(23),
                            fontWeight: 'bold',
                        }}>
                        {'物品: '}
                    </Text>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: secondThemeColor,
                            fontSize: scale(23),
                            fontWeight: 'bold',
                            marginLeft: scale(9)
                        }}>
                        {item.title}
                    </Text>
                </View>

                {/* 日期 */}
                <View
                    style={{
                        flexDirection: 'row',
                        paddingLeft: scale(8),
                        paddingBottom: scale(5),
                    }}>
                    <Text style={styles.titleText}>{'拾獲日期: '}</Text>
                    <Text style={styles.contentText}>{item.date}</Text>
                </View>

                {/* 地點 */}
                <View
                    style={{
                        flexDirection: 'row',
                        paddingLeft: scale(8),
                        paddingBottom: scale(5),
                        width: '75%',
                    }}>
                    <Text style={styles.titleText}>{'拾獲地點: '}</Text>
                    <Text style={styles.contentText}>{item.pick_up}</Text>
                </View>

                {/* 現時位置 */}
                <View
                    style={{
                        flexDirection: 'row',
                        paddingLeft: scale(8),
                        paddingBottom: scale(5),
                        width: '75%',
                    }}>
                    <Text style={styles.titleText}>{'現時位置: '}</Text>
                    <Text style={styles.contentText}>
                        {item.current.substr(7)}
                    </Text>
                </View>

                {/* 參考編號 */}
                <View
                    style={{
                        position: 'absolute',
                        top: scale(10),
                        right: scale(10),
                    }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.third,
                            fontSize: scale(12),
                            marginLeft: scale(80),
                        }}>
                        {item.ref.substr(1, 8)}
                    </Text>
                </View>
            </View>
        );
    };

    render() {
        const { data, isLoading } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: bg_color }}>
                <Header title={'失物招領'} />

                {!isLoading && data.length > 0 ? (
                    <VirtualizedList
                        data={data}
                        ref={'virtualizedList'}
                        // 初始渲染的元素，設置為剛好覆蓋屏幕
                        initialNumToRender={4}
                        renderItem={({ item }) => {
                            return this.renderContent(item);
                        }}
                        // 整理item數據
                        getItem={getItem}
                        // 渲染項目數量
                        getItemCount={getItemCount}
                        ListHeaderComponent={() => (
                            <>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        alignSelf: 'center',
                                        color: black.third,
                                    }}>
                                    Data from: um2.umac.mo
                                </Text>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    // onPress={() => Linking.openURL(UM_LOST_FOUND)}>
                                    onPress={() => openLink(UM_LOST_FOUND)}>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            alignSelf: 'center',
                                            color: themeColor,
                                            marginBottom: scale(5),
                                        }}>
                                        Check all
                                    </Text>
                                </TouchableOpacity>
                            </>
                        )}
                        // 列表底部渲染，防止Tabbar遮擋
                        ListFooterComponent={() => (
                            <View style={{ marginBottom: scale(50) }}></View>
                        )}
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={this.state.isLoading}
                                onRefresh={() => {
                                    // 展示Loading標識
                                    this.setState({ isLoading: true });
                                    this.getData();
                                }}
                            />
                        }
                    />
                ) : (
                    // 加載指示
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginTop: scale(-200),
                        }}>
                        <Loading />
                    </View>
                )}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    titleText: {
        ...uiStyle.defaultText,
        fontWeight: 'bold',
        color: themeColor,
        fontSize: scale(15),
    },
    contentText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        color: black.third,
    },
});

export default LostAndFound;
