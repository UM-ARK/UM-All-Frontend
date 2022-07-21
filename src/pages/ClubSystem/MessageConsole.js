// 活動控制台
import React, {Component} from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    FlatList,
    ScrollView,
    StyleSheet,
} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import {pxToDp} from '../../utils/stylesKits';
import ChatCard from './components/ChatCard';

import {Header, SpeedDial} from '@rneui/themed';

const {bg_color, themeColor, white, viewShadow, black} = COLOR_DIY;

class MessageConsole extends Component {
    state = {
        // 打開右下角新建消息類型按鈕
        openOption: false,
        eventList: [],
    };

    constructor() {
        super();
        this.getData();
    }

    async getData() {
        console.log('獲取活動信息');

        // eventList 的子項僅需要title
    }

    renderFixButton = () => {
        const {openOption} = this.state;

        return (
            <SpeedDial
                isOpen={openOption}
                icon={{name: 'add', color: white}}
                openIcon={{name: 'close', color: white}}
                onOpen={() => this.setState({openOption: true})}
                onClose={() => this.setState({openOption: false})}
                style={{zIndex: 9}}
                buttonStyle={{backgroundColor: themeColor}}>
                <SpeedDial.Action
                    buttonStyle={{backgroundColor: themeColor}}
                    icon={{name: 'event-available', color: white}}
                    title="新增活動"
                    onPress={() => {
                        this.setState({openOption: false});
                        this.props.navigation.navigate('EventSetting');
                    }}
                />
                {/* <SpeedDial.Action
                    buttonStyle={{backgroundColor: themeColor}}
                    icon={{name: 'alternate-email', color: white}}
                    title="新增公告"
                    onPress={() => {
                        this.setState({openOption: false});
                        this.props.navigation.navigate('MessageSetting');
                    }}
                /> */}
            </SpeedDial>
        );
    };

    renderAtAllCard = () => {
        return (
            <View
                style={{
                    marginVertical: pxToDp(5),
                    marginHorizontal: pxToDp(10),
                }}>
                <TouchableOpacity
                    style={styles.chatItemBorder}
                    activeOpacity={0.8}
                    onPress={() => {
                        alert('按下');
                    }}>
                    <View style={styles.infoContainer}>
                        <Text
                            style={{
                                fontSize: pxToDp(14),
                                color: black.second,
                            }}
                            numberOfLines={2}>
                            {'@ 所有Follow該賬號的用戶'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    render() {
        const {eventList} = this.state;
        return (
            <View style={{backgroundColor: COLOR_DIY.bg_color, flex: 1}}>
                {/* 頂部標題 */}
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    centerComponent={{
                        text: '訊息發佈',
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

                {/* 右下角固定按鈕 */}
                {this.renderFixButton()}

                {/* 消息內容 */}
                <FlatList
                    data={eventList}
                    ListHeaderComponent={this.renderAtAllCard()}
                    renderItem={({item, index}) => {
                        return <ChatCard data={item} index={index}></ChatCard>;
                    }}
                    keyExtractor={item => item.id}
                />
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

export default MessageConsole;
