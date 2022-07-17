// 信息頁
import React, {Component} from 'react';
import {Text, View, TouchableOpacity, FlatList, ScrollView} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import {pxToDp} from '../../utils/stylesKits';
import ChatCard from './components/ChatCard';

import {Header, SpeedDial} from '@rneui/themed';

const {bg_color, themeColor, white, viewShadow} = COLOR_DIY;

class MessageConsole extends Component {
    state = {
        // 打開右下角新建消息類型按鈕
        openOption: false,
        eventList: [
            {title: 'asldkfjsadlf'},
            {title: 'wrehgwterhwrth'},
            {title: 'asldkfghjfghmrumryumyjsadlf'},
            {title: 'asldkfjsayukryukryukryukrytukryukyrutkyrukyuktyukytukdlf'},
        ],
    };

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
                <SpeedDial.Action
                    buttonStyle={{backgroundColor: themeColor}}
                    icon={{name: 'alternate-email', color: white}}
                    title="新增公告"
                    onPress={() => {
                        this.setState({openOption: false});
                        this.props.navigation.navigate('MessageSetting');
                    }}
                />
            </SpeedDial>
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
                    renderItem={({item, index}) => {
                        return <ChatCard data={item} index={index}></ChatCard>;
                    }}
                    keyExtractor={item => item.id}
                />
            </View>
        );
    }
}

export default MessageConsole;
