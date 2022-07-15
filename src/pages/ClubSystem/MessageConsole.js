// 信息頁
import React, {Component} from 'react';
import {Text, View, TouchableOpacity, FlatList, ScrollView} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import {pxToDp} from '../../utils/stylesKits';
import ChatCard from '../TabbarPages/message/ChatCard';

import {Header, SpeedDial} from '@rneui/themed';

const {bg_color, themeColor, white, viewShadow} = COLOR_DIY;

// 模擬服務器請求回來的data
const messages = [
    {
        user: {
            _id: '0',
            name: '澳大電子通告',
            avatar: 'http://images.jjl.cn/ugc/2018/1129/20181129152330319.png',
        },
        message_history: [
            {
                content:
                    '請全澳居民於6月22日內進行一次快速抗原檢測。知道了嗎阿是離開打飛機拉克絲定積分了卡時代峻峰',
                time: '2022/6/26 2:30',
                unread: 1,
            },
            {
                content: 'hahahaha',
                time: '2022/6/26 1:30',
                unread: 1,
            },
        ],
    },
    {
        user: {
            _id: '3',
            name: '鄭裕彤書院(CYTC)',
            avatar: 'https://cytc.rc.um.edu.mo/wp-content/uploads/2019/09/CYTC-Logo-2014-Purple-1.png',
        },
        message_history: [
            {
                content:
                    '書院活動 purple dating 現已開啟，一切唉算了東風科技唉算了到科技付。',
                time: '2022/6/26 2:30',
                unread: 0,
            },
            {
                content: 'hahahaha',
                time: '2022/6/26 1:30',
                unread: 0,
            },
        ],
    },
    {
        user: {
            _id: '4',
            name: '電腦學會',
            avatar: 'https://info.umsu.org.mo/storage/affiliate/images/da6f2ec4b5ec3216f9344453f796a97c.jpg',
        },
        message_history: [
            {
                content: '遊戲工作坊',
                time: '2022/6/26 2:30',
                unread: 1,
            },
            {
                content: 'hahahaha',
                time: '2022/6/26 1:30',
                unread: 1,
            },
        ],
    },
];

class MessageConsole extends Component {
    state = {
        // 打開右下角新建消息類型按鈕
        openOption: false,
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
                    onPress={() =>
                        this.props.navigation.navigate('EventSetting')
                    }
                />
                <SpeedDial.Action
                    buttonStyle={{backgroundColor: themeColor}}
                    icon={{name: 'alternate-email', color: white}}
                    title="新增公告"
                    onPress={() => console.log('Delete Something')}
                />
            </SpeedDial>
        );
    };

    render() {
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
                <ScrollView style={{marginTop: pxToDp(5)}}>
                    <Text>展示歷史推送的公告</Text>
                </ScrollView>
            </View>
        );
    }
}

export default MessageConsole;
