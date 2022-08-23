// 信息頁 - 聊天選項卡
import React, {Component} from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    ImageBackground,
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {certificate} from '../../../static/icon/iconSvg';

import {NavigationContext} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';

// 頭像右下角 認證標籤大小，使用的SVG貌似不是像素單位
const AVATOR_RIGHT_ICON_SIZE = pxToDp(18);

class ChatCard extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    constructor(props) {
        super(props);
        let {message_history} = this.props.messages;
        // 計算未讀消息數
        // TODO: 1. 數據庫只儲存消息通知，客戶端只請求數據庫獲取通知，所有未讀狀態在本地緩存。
        // TODO: 2. 當用戶進入該聊天的詳情頁，未讀狀態清空。未讀消息數為0。
        let unreadNum = this.GetUnderNumber(message_history);

        this.state = {
            // 未讀消息數
            unreadNum,
            // 最新的消息，數據庫設定返回數組下標0最新，1次新
            message: message_history[0],
        };
    }

    // 返回用戶對該組織消息的未讀消息數
    GetUnderNumber = message_history => {
        let n = 0;
        message_history.map(itm => {
            // 每條消息的未讀儲存格式為：未讀1，已讀0
            if (itm.unread == 1) {
                n++;
            }
        });
        return n;
    };

    // 渲染未讀標籤
    RenderRedPointWithNumber = () => {
        let {unreadNum} = this.state;
        // 如果未讀數大於0，渲染紅點未讀掛件
        if (unreadNum > 0) {
            return (
                <View style={[styles.rightTopIconPosition, styles.unread]}>
                    <Text
                        style={{
                            color: 'white',
                            fontSize: pxToDp(10),
                            fontWeight: '700',
                            paddingHorizontal: pxToDp(4),
                        }}>
                        {unreadNum}
                    </Text>
                </View>
            );
        }
    };

    render() {
        // 解構全局UI樣式
        const {bg_color, black, white} = COLOR_DIY;
        // 解構從message的index傳來的用戶頭像、名字信息
        const {_id, name, avatar} = this.props.messages.user;
        return (
            <View
                style={{
                    marginVertical: pxToDp(5),
                    marginHorizontal: pxToDp(10),
                }}>
                <TouchableOpacity
                    style={styles.chatItemBorder}
                    activeOpacity={0.8}
                    onPress={() =>
                        this.context.navigate('ChatDetail', {
                            user: this.props.messages.user,
                        })
                    }>
                    <View style={styles.infoContainer}>
                        {/* 1.0 靠左元素-頭像/名字等 */}
                        <View
                            style={{
                                flexDirection: 'row',
                                width: '75%',
                            }}>
                            {/* 1.1 頭像 */}
                            <View>
                                <FastImage
                                    source={{
                                        uri: avatar,
                                        cache: FastImage.cacheControl.web,
                                    }}
                                    style={styles.avatarStyle}
                                />
                                {/* 未讀信息紅點標籤 */}
                                {this.RenderRedPointWithNumber()}
                            </View>

                            {/* 1.2 名字 & 簡略消息內容 */}
                            <View
                                style={{
                                    marginLeft: pxToDp(10),
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                }}>
                                {/* 用戶名字 */}
                                <Text
                                    style={{
                                        color: black.main,
                                        fontSize: pxToDp(14),
                                    }}>
                                    {name}
                                </Text>

                                {/* 最新消息 */}
                                <View style={{marginTop: pxToDp(5)}}>
                                    <Text
                                        style={{
                                            color: black.second,
                                            fontSize: pxToDp(10),
                                        }}
                                        numberOfLines={1}>
                                        {this.state.message.content}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        {/* 1.0 靠左元素-頭像/名字等 */}

                        {/* 2.0 靠右元素-消息的時間展示 */}
                        <View
                            style={{
                                position: 'absolute',
                                top: pxToDp(12),
                                right: pxToDp(12),
                            }}>
                            <Text
                                style={{
                                    fontSize: pxToDp(10),
                                    color: black.third,
                                }}>
                                {this.state.message.time}
                            </Text>
                        </View>
                        {/* 2.0 靠右元素-消息的時間展示 */}
                    </View>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    // 聊天卡片的邊框效果
    chatItemBorder: {
        borderRadius: pxToDp(15),
        overflow: 'hidden',
        // 些許陰影
        shadowColor: '#000',
        shadowOffset: {width: 1, height: 1},
        shadowOpacity: 0.4,
        shadowRadius: 2,
        // 適用於Android
        elevation: 0.8,
    },
    // 內容展示容器
    infoContainer: {
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
        backgroundColor: COLOR_DIY.messageScreenColor.bg_color,
        // 每個聊天item的高度
        height: pxToDp(60),
        paddingHorizontal: pxToDp(15),
    },

    // 頭像Image樣式
    avatarStyle: {
        resizeMode: 'cover',
        borderRadius: pxToDp(50),
        width: pxToDp(42),
        height: pxToDp(42),
    },
    // 右下角認證標籤
    rightBottomIconPosition: {
        position: 'absolute',
        right: 0,
        bottom: -pxToDp(1),
    },
    // 右上角紅點消息提示位置
    rightTopIconPosition: {
        position: 'absolute',
        right: 0,
        top: 0,
    },
    // 未讀信息紅點標籤樣式
    unread: {
        // minWidth:pxToDp(15),
        height: pxToDp(15),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLOR_DIY.unread,
        borderRadius: 50,
    },
});

export default ChatCard;
