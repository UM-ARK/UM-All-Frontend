// 信息頁 - 聊天列表
import React, {Component} from 'react';
import {
    Text,
    View,
    TouchableHighlight,
    StyleSheet,
    Image,
    ImageBackground,
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {certificate} from '../../../static/icon/iconSvg';

import {SwipeListView} from 'react-native-swipe-list-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SvgUri from 'react-native-svg-uri';
import {SpringScrollView} from 'react-native-spring-scrollview';
import fontSize from 'twrnc/dist/esm/resolve/font-size';

// 每個聊天item的高度
const CHAT_ITEM_HEIGHT = pxToDp(60);
// 頭像標籤大小，使用的SVG貌似不是像素單位
const AVATOR_RIGHT_ICON_SIZE = pxToDp(18);

// 造出模擬數據的數組
const listData = Array(8)
    .fill('')
    .map((_, i) => ({key: `${i}`, text: `巴巴托斯`}));

class ChatList extends Component {
    constructor(props) {
        super(props);
        let res = [];
        for (let i = 0; i < this.props.data.length; i++) {
            if (this.props.data[i].type == this.props.tag) {
                res.push(this.props.data[i]);
                // console.log(this.props.tag)
            }
        }
        console.log('props tag', props.tag);
        if (this.props.tag == 0) {
            res = this.props.data;
        }
        this.state = {
            showData: res,
            data: this.props.data,
            tagIndex: this.props.tag,
        };
    }

    GetUnderNumber(message_history) {
        let n = 0;
        for (let i = 0; i < message_history.length; i++) {
            if (message_history[i].unread == 1) {
                n += 1;
            }
        }
        return n;
    }

    ShowRedPointWithNumber(data) {
        if (this.GetUnderNumber(data.item.message_history) > 0) {
            return (
                <View style={[styles.rightTopIconPosition, styles.unread]}>
                    <Text
                        style={{
                            color: 'white',
                            fontSize: pxToDp(10),
                            fontWeight: '700',
                            paddingHorizontal: pxToDp(4),
                        }}>
                        {this.GetUnderNumber(data.item.message_history)}
                    </Text>
                </View>
            );
        }
    }

    // 每個選項卡的渲染
    renderChatCard = () => {
        return (
            <View
                style={{
                    margin: 5,
                    marginLeft: 10,
                    marginRight: 10,
                }}>
                <TouchableHighlight
                    style={styles.chatItemBorder}
                    activeOpacity={0.7}
                    underlayColor={'#dfe6e9'}
                    onPress={() => alert('跳轉提醒詳情頁')}>
                    {/* 主要內容 */}
                    <View
                        style={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexDirection: 'row',
                            backgroundColor:
                                COLOR_DIY.messageScreenColor.bg_color,
                            height: CHAT_ITEM_HEIGHT,
                        }}>
                        {/* 靠左元素 */}
                        <View
                            style={{
                                marginLeft: pxToDp(15),
                                flexDirection: 'row',
                                width: '80%',
                                overflow: 'hidden',
                            }}>
                            {/* 頭像 */}
                            <View
                                style={{
                                    width: pxToDp(42),
                                    height: pxToDp(44),
                                }}>
                                <Image
                                    source={{
                                        uri: data.item.user.avatar_url,
                                    }}
                                    style={{
                                        resizeMode: 'cover',
                                        borderRadius: pxToDp(50),
                                        width: pxToDp(40),
                                        height: pxToDp(40),
                                    }}
                                />
                                {/* 頭像掛件 / 用戶標籤 */}
                                {/* TODO: 按用戶組展示不同的標籤 */}
                                {/* 認證標籤 */}
                                <View style={styles.rightBottomIconPosition}>
                                    <SvgUri
                                        svgXmlData={certificate}
                                        width={AVATOR_RIGHT_ICON_SIZE}
                                        height={AVATOR_RIGHT_ICON_SIZE}
                                    />
                                </View>
                                {/* TODO: 展示有多少信息未讀 */}
                                {/* 未讀信息標籤 */}
                                {/*<View style={[styles.rightTopIconPosition, styles.unread]}>*/}
                                {/*    <Text style={{ color:'white', fontSize:pxToDp(10), fontWeight:'700',paddingHorizontal:pxToDp(4)}}>{this.GetUnderNumber(data.item.message_history)}</Text>*/}
                                {/*</View>*/}
                                {this.ShowRedPointWithNumber(data)}
                            </View>

                            {/* 名字 & 簡略消息內容 */}
                            {/* TODO: 不同消息類型在這裡的顯示 */}
                            {/* TODO: 文本消息過長則顯示... */}
                            <View
                                style={{
                                    marginLeft: pxToDp(10),
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                }}>
                                {/* 名字 */}
                                <Text
                                    style={{
                                        color: black.main,
                                        fontSize: pxToDp(14),
                                    }}>
                                    {data.item.user.name}
                                </Text>

                                {/* 消息內容 */}
                                <View style={{marginTop: pxToDp(5)}}>
                                    <Text
                                        style={{
                                            color: black.second,
                                            fontSize: pxToDp(10),
                                        }}>
                                        {data.item.message_history[0].content}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* 靠右元素 - 圖標點擊提示 */}
                        <View style={{marginRight: pxToDp(20)}}>
                            {/*<Ionicons name="chevron-forward-outline" color={black.second} size={pxToDp(20)}></Ionicons>*/}
                            <Text style={{fontSize: pxToDp(10)}}>
                                {data.item.message_history[0].time}
                            </Text>
                        </View>
                    </View>
                </TouchableHighlight>
            </View>
        );
    };

    render() {
        console.log('render tag', this.state.tagIndex);
        const {bg_color, black, white, themeColor} = COLOR_DIY;
        return (
            <SwipeListView
                style={{backgroundColor: bg_color}}
                data={this.state.showData}
                // previewRowKey={'0'}
                // previewDuration={500}
                // 不滑動時能看到的元素
                renderItem={(data, rowMap) => {
                    // console.log(data)
                    return (
                        <View
                            style={{
                                margin: 5,
                                marginLeft: 10,
                                marginRight: 10,
                            }}>
                            <TouchableHighlight
                                style={styles.chatItemBorder}
                                activeOpacity={0.7}
                                underlayColor={'#dfe6e9'}
                                onPress={() => alert('跳轉提醒詳情頁')}>
                                {/* 主要內容 */}
                                <View
                                    style={{
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexDirection: 'row',
                                        backgroundColor:
                                            COLOR_DIY.messageScreenColor
                                                .bg_color,
                                        height: CHAT_ITEM_HEIGHT,
                                    }}>
                                    {/* 靠左元素 */}
                                    <View
                                        style={{
                                            marginLeft: pxToDp(15),
                                            flexDirection: 'row',
                                            width: '80%',
                                            overflow: 'hidden',
                                        }}>
                                        {/* 頭像 */}
                                        <View
                                            style={{
                                                width: pxToDp(42),
                                                height: pxToDp(44),
                                            }}>
                                            <Image
                                                source={{
                                                    uri: data.item.user
                                                        .avatar_url,
                                                }}
                                                style={{
                                                    resizeMode: 'cover',
                                                    borderRadius: pxToDp(50),
                                                    width: pxToDp(40),
                                                    height: pxToDp(40),
                                                }}
                                            />
                                            {/* 頭像掛件 / 用戶標籤 */}
                                            {/* TODO: 按用戶組展示不同的標籤 */}
                                            {/* 認證標籤 */}
                                            <View
                                                style={
                                                    styles.rightBottomIconPosition
                                                }>
                                                <SvgUri
                                                    svgXmlData={certificate}
                                                    width={
                                                        AVATOR_RIGHT_ICON_SIZE
                                                    }
                                                    height={
                                                        AVATOR_RIGHT_ICON_SIZE
                                                    }
                                                />
                                            </View>
                                            {/* TODO: 展示有多少信息未讀 */}
                                            {/* 未讀信息標籤 */}
                                            {/*<View style={[styles.rightTopIconPosition, styles.unread]}>*/}
                                            {/*    <Text style={{ color:'white', fontSize:pxToDp(10), fontWeight:'700',paddingHorizontal:pxToDp(4)}}>{this.GetUnderNumber(data.item.message_history)}</Text>*/}
                                            {/*</View>*/}
                                            {this.ShowRedPointWithNumber(data)}
                                        </View>

                                        {/* 名字 & 簡略消息內容 */}
                                        {/* TODO: 不同消息類型在這裡的顯示 */}
                                        {/* TODO: 文本消息過長則顯示... */}
                                        <View
                                            style={{
                                                marginLeft: pxToDp(10),
                                                flexDirection: 'column',
                                                justifyContent: 'center',
                                            }}>
                                            {/* 名字 */}
                                            <Text
                                                style={{
                                                    color: black.main,
                                                    fontSize: pxToDp(14),
                                                }}>
                                                {data.item.user.name}
                                            </Text>

                                            {/* 消息內容 */}
                                            <View
                                                style={{marginTop: pxToDp(5)}}>
                                                <Text
                                                    style={{
                                                        color: black.second,
                                                        fontSize: pxToDp(10),
                                                    }}>
                                                    {
                                                        data.item
                                                            .message_history[0]
                                                            .content
                                                    }
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    {/* 靠右元素 - 圖標點擊提示 */}
                                    <View style={{marginRight: pxToDp(20)}}>
                                        {/*<Ionicons name="chevron-forward-outline" color={black.second} size={pxToDp(20)}></Ionicons>*/}
                                        <Text style={{fontSize: pxToDp(10)}}>
                                            {data.item.message_history[0].time}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableHighlight>
                        </View>
                    );
                }}
                // 通過手勢滑動才看到的元素
                renderHiddenItem={(data, rowMap) => (
                    <View
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            backgroundColor: bg_color,
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: pxToDp(5),
                            paddingRight: pxToDp(0),
                            margin: pxToDp(11),
                        }}>
                        {/* 左邊按鈕位置 */}
                        <View></View>
                        {/* 右邊按鈕位置 */}
                        <View
                            style={{
                                borderRadius: 10,
                                height: CHAT_ITEM_HEIGHT,
                                flexDirection: 'row',
                                padding: pxToDp(1),
                            }}>
                            {/* 按鈕 1 */}
                            <TouchableHighlight
                                style={[
                                    styles.rightButtonContainer,
                                    {
                                        backgroundColor: '#ff9500',
                                    },
                                ]}
                                activeOpacity={0.7}
                                underlayColor={'#dfe6e9'}
                                onPress={() => console.log('點擊事件')}>
                                <Text style={styles.rightButtonText}>置頂</Text>
                            </TouchableHighlight>

                            {/* 按鈕 2 */}
                            <TouchableHighlight
                                style={[
                                    styles.rightButtonContainer,
                                    {
                                        backgroundColor: '#ff3b30',
                                        marginLeft: pxToDp(4),
                                    },
                                ]}
                                activeOpacity={0.7}
                                underlayColor={'#dfe6e9'}
                                onPress={() => console.log('')}>
                                <Text style={styles.rightButtonText}>刪除</Text>
                            </TouchableHighlight>
                        </View>
                    </View>
                )}
                // 在所有項目的末尾渲染，防止tabbar遮擋
                ListFooterComponent={() => (
                    <View style={{marginBottom: pxToDp(100)}}></View>
                )}
                // 關閉右滑手勢，即左側不能打開
                disableRightSwipe
                // 設置右側可打開的值，右側是負，左側是正
                rightOpenValue={-pxToDp(142)}
                // 当一行开始滑动打开时，关闭打开的行
                closeOnRowBeginSwipe={true}
                previewOpenValue={-40}
                previewOpenDelay={3000}
                // 禁用這個容器的滾動，使用外層SpringScrollView進行彈性滾動
                // scrollEnabled={false}
            />
        );
    }
}

const styles = StyleSheet.create({
    rightButtonContainer: {
        width: pxToDp(66),
        borderRadius: pxToDp(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightButtonText: {
        color: COLOR_DIY.white,
        fontSize: pxToDp(13),
    },
    chatItemBorder: {
        borderRadius: pxToDp(15),
        overflow: 'hidden',
        // 些許陰影
        shadowColor: '#000',
        shadowOffset: {width: 1, height: 1},
        shadowOpacity: 0.4,
        shadowRadius: 2,
        // 適用於Android
        elevation: 0.5,
    },
    // 頭像標籤位置
    // 右下角認證標籤
    rightBottomIconPosition: {
        position: 'absolute',
        right: 0,
        bottom: -pxToDp(1),
    },
    // 右上角消息提示
    rightTopIconPosition: {
        position: 'absolute',
        right: 0,
        top: 0,
    },
    // 未讀信息標籤樣式
    unread: {
        // minWidth:pxToDp(15),
        height: pxToDp(15),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'red',
        borderRadius: 50,
    },
});

export default ChatList;
