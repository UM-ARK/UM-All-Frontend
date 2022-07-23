// 活動控制台
import React, {Component} from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    FlatList,
    ScrollView,
    StyleSheet,
    RefreshControl,
} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import {pxToDp} from '../../utils/stylesKits';
import Loading from '../../components/Loading';
import {BASE_URI, GET} from '../../utils/pathMap';
import ChatCard from './components/ChatCard';
import axios from 'axios';
import qs from 'qs';
import {inject} from 'mobx-react';

import {Header, SpeedDial} from '@rneui/themed';

const {bg_color, themeColor, white, viewShadow, black} = COLOR_DIY;

class MessageConsole extends Component {
    state = {
        // 打開右下角新建消息類型按鈕
        openOption: false,
        eventData: [],
        clubData: {},
        isLoading: true,
    };

    componentDidMount() {
        let clubData = this.props.RootStore.userInfo.clubData;
        this.setState({clubData});
        this.getData(clubData.club_num);
    }

    // 獲取指定club num的活動
    async getData(club_num) {
        await axios
            .get(BASE_URI + GET.EVENT_INFO_CLUB_NUM + club_num)
            .then(res => {
                let result = res.data;
                if (result.message == 'success') {
                    let eventData = result.content;
                    this.setState({eventData, isLoading: false});
                }
            })
            .catch(err => {
                console.error(err);
            });
    }

    renderFixButton = () => {
        const {openOption, clubData} = this.state;
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
                        this.props.navigation.navigate('EventSetting', {
                            mode: 'create',
                            refresh: this.getData.bind(this, clubData.club_num), // 傳遞回調函數
                        });
                    }}
                />
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
                        this.props.navigation.navigate('ChatDetail', {
                            user: {name: '@ All Followers'},
                            sendTo: 'all',
                        });
                    }}>
                    <View style={styles.infoContainer}>
                        <Text
                            style={{
                                fontSize: pxToDp(14),
                                color: black.second,
                            }}
                            numberOfLines={2}>
                            {'@ All Followers'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    render() {
        const {eventData, clubData, isLoading} = this.state;
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
                {!isLoading ? (
                    <FlatList
                        data={eventData}
                        ListHeaderComponent={this.renderAtAllCard()}
                        renderItem={({item, index}) => {
                            return (
                                <ChatCard data={item} index={index}></ChatCard>
                            );
                        }}
                        keyExtractor={item => item.id}
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={this.state.isLoading}
                                onRefresh={() => {
                                    // 展示Loading標識
                                    this.setState({isLoading: true});
                                    this.getData(clubData.club_num);
                                }}
                            />
                        }
                    />
                ) : (
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        <Loading />
                    </View>
                )}
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

export default inject('RootStore')(MessageConsole);
