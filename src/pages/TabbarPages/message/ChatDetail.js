// 信息頁 - 聊天詳情
import React, {Component} from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    ImageBackground,
    FlatList,
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

import FastImage from 'react-native-fast-image';
import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {GiftedChat} from 'react-native-gifted-chat';

const dataList = [
    {
        _id: 0,
        title: 'Test0',
        text: `最新的消息
        askdhfkqwhekfhweifuhw
        qweflihqwoighqeliurghi3uqrg
        qoweifhjoqwiehfoiwqehf
        qweoifhqwoiefghqwieopfghpqwuief
        elrghbnkfejbniuj`,
        type: 'text',
        createAt: 1656927421000,
        user: {
            _id: 1,
            name: '溫迪',
            avatar: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
    },
    {
        _id: 1,
        title: 'Test1',
        text: `舊的的消息
        welrfgjbweoihbrwt
        bertlikbhwroithe
        yrhrtwehrtewbrtwe
        brewbrewbertbrettb
        rebretbrtb`,
        type: 'text',
        createAt: 1656927421000,
        user: {
            _id: 1,
            name: '溫迪',
            avatar: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
    },
    {
        _id: 2,
        title: 'Test2',
        text: '非常舊的消息',
        type: 'text',
        createAt: 1656927421000,
        user: {
            _id: 1,
            name: '溫迪',
            avatar: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
    },
    {
        _id: 3,
        title: 'Test3',
        text: '非常舊的消息',
        type: 'text',
        createAt: 1656927421000,
        user: {
            _id: 1,
            name: '溫迪',
            avatar: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
    },
    {
        _id: 4,
        title: 'Test4',
        text: '非常舊的消息',
        type: 'text',
        createAt: 1656927421000,
        user: {
            _id: 1,
            name: '溫迪',
            avatar: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
    },
    {
        _id: 5,
        title: 'Test5',
        text: '非常舊的消息',
        type: 'text',
        createAt: 1656927421000,
        user: {
            _id: 1,
            name: '溫迪',
            avatar: 'https://i03piccdn.sogoucdn.com/a04373145d4b4341',
        },
    },
];

// 時間戳轉時間
function timeTrans(date) {
    var date = new Date(date);
    var Y = date.getFullYear();
    var M =
        date.getMonth() + 1 < 10
            ? '0' + (date.getMonth() + 1)
            : date.getMonth() + 1;
    var D = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    var h = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    var m =
        date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    var s =
        date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return Y + '/' + M + '/' + D + ', ' + h + ':' + m;
}

// 新——舊的不同顏色標題
const COLOR_TITLE_LEVEL = {
    // 最新
    new0: '#212121',
    new1: '#424242',
    new2: '#616161',
    new3: '#757575',
    new4: '#9e9e9e',
};
// 按最新程度來匹配標題顏色
function mapColorByIndex(index) {
    switch (index) {
        case 0:
            return COLOR_TITLE_LEVEL.new0;
            break;
        case 1:
            return COLOR_TITLE_LEVEL.new1;
            break;
        case 2:
            return COLOR_TITLE_LEVEL.new2;
            break;
        case 3:
            return COLOR_TITLE_LEVEL.new3;
            break;
        default:
            return COLOR_TITLE_LEVEL.new4;
            break;
    }
}

class ChatCard extends Component {
    constructor(props) {
        super(props);

        // 獲取上級頁面傳遞的數據
        // console.log(this.props.route.params);

        const host = {
            // 組織用戶的ID
            userID: 1,
            // 頭像鏈接
        };

        this.state = {
            // 最新的消息，數據庫設定返回數組下標0最新，1次新
            _id: 1,
            text: 'Hello developer',
            createdAt: new Date(),
            user: {
                _id: 2,
                name: 'React Native',
                avatar: 'https://placeimg.com/140/140/any',
            },
        };
    }

    // 渲染該條信息的時間
    // TODO: 今日的消息不加日期，只顯示時間，昨日或更早的消息加上日期
    renderMessageTime = timeStamp => {
        let timePhase = timeTrans(timeStamp);
        return (
            <View
                style={{
                    alignSelf: 'center',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#eaeaea',
                    borderRadius: pxToDp(10),
                    paddingHorizontal: pxToDp(8),
                    paddingVertical: pxToDp(2),
                }}>
                <Text style={{color: COLOR_DIY.black.third}}>{timePhase}</Text>
            </View>
        );
    };

    // 消息內容卡片
    renderMessageCard = (item, index) => {
        // 按最新程度來匹配標題顏色
        let titleColor = mapColorByIndex(index);

        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: COLOR_DIY.bg_color,
                    borderRadius: pxToDp(10),
                    marginHorizontal: pxToDp(15),
                    marginTop: pxToDp(10),
                    // 增加陰影
                    ...COLOR_DIY.viewShadow,
                }}>
                {/* 卡片標題 */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: pxToDp(10),
                        paddingVertical: pxToDp(10),
                    }}>
                    <Text
                        style={{
                            fontSize: pxToDp(12),
                            color: titleColor,
                            fontWeight: 'bold',
                            width: '90%',
                        }}
                        numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Ionicons
                        name="chevron-forward-outline"
                        size={pxToDp(14)}
                        color={COLOR_DIY.black.main}></Ionicons>
                </View>
                {/* 卡片內容 */}
                <View
                    style={{
                        justifyContent: 'space-around',
                        alignItems: 'flex-start',
                        margin: pxToDp(10),
                        marginTop: pxToDp(0),
                        flexDirection: 'column',
                    }}>
                    {/* 文字 */}
                    <Text style={{color: titleColor}}>{item.text}</Text>
                </View>
            </View>
        );
    };

    // 渲染推送的訊息，時間+內容
    renderMessageItem = (item, index) => {
        return (
            <View
                style={{
                    marginVertical: pxToDp(10),
                }}>
                {/* 渲染該條信息的發送時間 */}
                {this.renderMessageTime(item.createAt)}

                {/* 渲染信息卡片 */}
                {this.renderMessageCard(item, index)}
            </View>
        );
    };

    render() {
        // 解構全局UI樣式
        const {bg_color, black, white} = COLOR_DIY;
        // 解構從message的index傳來的用戶頭像、名字信息
        const {user} = this.props.route.params;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
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
                        text: user.name,
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                    }}
                />

                {/* 通知信息的渲染 */}
                <FlatList
                    data={dataList}
                    renderItem={({item, index}) =>
                        this.renderMessageItem(item, index)
                    }
                    // 翻轉渲染順序，從下往上
                    inverted={true}
                />

                {/* 回復提醒 */}
                <View
                    style={{
                        marginVertical: pxToDp(10),
                        borderRadius: pxToDp(20),
                        marginHorizontal: pxToDp(20),
                        backgroundColor: COLOR_DIY.white,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingVertical: pxToDp(10),
                        ...COLOR_DIY.viewShadow,
                    }}>
                    <Text>您無需回復此消息</Text>
                </View>
            </View>
        );
    }
}

export default ChatCard;
