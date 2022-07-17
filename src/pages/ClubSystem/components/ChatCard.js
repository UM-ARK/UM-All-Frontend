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

import {NavigationContext} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';

const {bg_color, black, white} = COLOR_DIY;

class ChatCard extends Component {
    render() {
        return (
            <View
                style={{
                    marginVertical: pxToDp(5),
                    marginHorizontal: pxToDp(10),
                }}>
                <TouchableOpacity
                    style={styles.chatItemBorder}
                    activeOpacity={0.8}
                    // TODO: 跳轉歷史消息詳情
                    onPress={() => {
                        alert('按下' + this.props.index);
                    }}>
                    <View style={styles.infoContainer}>
                        <Text
                            style={{fontSize: pxToDp(14), color: black.second}}
                            numberOfLines={2}>
                            {this.props.data.title}
                        </Text>
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
});

export default ChatCard;
