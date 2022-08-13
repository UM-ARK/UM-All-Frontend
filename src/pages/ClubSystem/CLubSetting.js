import React, {Component} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Linking,
} from 'react-native';

import {pxToDp} from '../../utils/stylesKits';
import {COLOR_DIY} from '../../utils/uiMap';
import {handleLogout} from '../../utils/storageKits';
import {MAIL} from '../../utils/pathMap';
import DialogDIY from '../../components/DialogDIY';
import Header from '../../components/Header';

import Ionicons from 'react-native-vector-icons/Ionicons';

const {black, themeColor, white} = COLOR_DIY;

class ClubSetting extends Component {
    state = {
        // 退出提示Dialog
        logoutChoice: false,
        deleteChoice: false,
        fromEvent: false,
        eventID: undefined,
    };

    componentDidMount() {
        let param = this.props.route.params;
        if (param.eventID) {
            this.setState({fromEvent: true, eventID: param.eventID});
        } else {
            this.setState({fromEvent: false});
        }
    }

    render() {
        const {logoutChoice, fromEvent, eventID, deleteChoice} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={fromEvent ? '活動設置' : '組織賬號設置'} />

                <ScrollView>
                    {fromEvent ? (
                        // 活動設置
                        <View>
                            {/* 活動信息編輯 選項 */}
                            <TouchableOpacity
                                style={{...styles.optionContainer}}
                                activeOpacity={0.8}
                                onPress={() => {
                                    // 跳轉活動info編輯頁，並傳遞刷新函數
                                    this.props.navigation.navigate(
                                        'EventSetting',
                                        {
                                            mode: 'edit',
                                            eventData: {_id: eventID},
                                            refresh:
                                                this.props.route.params.refresh,
                                        },
                                    );
                                }}>
                                {/* 選項標題 */}
                                <Text style={{...styles.optionTitle}}>
                                    {'活動資訊編輯'}
                                </Text>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={pxToDp(20)}
                                />
                            </TouchableOpacity>

                            {/* Follower 選項 */}
                            <TouchableOpacity
                                style={{...styles.optionContainer}}
                                activeOpacity={0.8}
                                onPress={() => {
                                    // 跳轉Follower頁
                                    this.props.navigation.navigate(
                                        'FollowersPage',
                                        {from: 'event', eventID},
                                    );
                                }}>
                                {/* 選項標題 */}
                                <Text style={{...styles.optionTitle}}>
                                    {'關注者 - Followers'}
                                </Text>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={pxToDp(20)}
                                />
                            </TouchableOpacity>

                            {/* 歷史公告 選項 */}
                            <TouchableOpacity
                                style={{...styles.optionContainer}}
                                activeOpacity={0.8}
                                onPress={() =>
                                    this.props.navigation.navigate(
                                        'ChatDetail',
                                        {sendTo: eventID},
                                    )
                                }>
                                {/* 選項標題 */}
                                <Text style={{...styles.optionTitle}}>
                                    {'歷史公告'}
                                </Text>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={pxToDp(20)}
                                />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // 社團設置
                        <View>
                            {/* 社團主頁設置 選項 */}
                            <TouchableOpacity
                                style={{...styles.optionContainer}}
                                activeOpacity={0.8}
                                onPress={() => {
                                    // 跳轉社團info編輯頁，並傳遞刷新函數
                                    this.props.navigation.navigate(
                                        'ClubInfoEdit',
                                        {
                                            refresh:
                                                this.props.route.params.refresh,
                                        },
                                    );
                                }}>
                                {/* 選項標題 */}
                                <Text style={{...styles.optionTitle}}>
                                    {'主頁信息編輯'}
                                </Text>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={pxToDp(20)}
                                />
                            </TouchableOpacity>

                            {/* Follower 選項 */}
                            <TouchableOpacity
                                style={{...styles.optionContainer}}
                                activeOpacity={0.8}
                                onPress={() => {
                                    // 跳轉Follower頁
                                    this.props.navigation.navigate(
                                        'FollowersPage',
                                        {from: 'club'},
                                    );
                                }}>
                                {/* 選項標題 */}
                                <Text style={{...styles.optionTitle}}>
                                    {'關注者 - Followers'}
                                </Text>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={pxToDp(20)}
                                />
                            </TouchableOpacity>

                            {/* 歷史公告 選項 */}
                            <TouchableOpacity
                                style={{...styles.optionContainer}}
                                activeOpacity={0.8}
                                onPress={() =>
                                    this.props.navigation.navigate(
                                        'ChatDetail',
                                        {sendTo: 'all'},
                                    )
                                }>
                                {/* 選項標題 */}
                                <Text style={{...styles.optionTitle}}>
                                    {'歷史公告'}
                                </Text>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={pxToDp(20)}
                                />
                            </TouchableOpacity>

                            {/* 新增活動 選項 */}
                            <TouchableOpacity
                                style={{...styles.optionContainer}}
                                activeOpacity={0.8}
                                onPress={() => {
                                    // 跳轉活動info編輯頁，並傳遞刷新函數
                                    this.props.navigation.navigate(
                                        'EventSetting',
                                        {
                                            mode: 'create',
                                            refresh:
                                                this.props.route.params.refresh,
                                        },
                                    );
                                }}>
                                {/* 選項標題 */}
                                <Text style={{...styles.optionTitle}}>
                                    {'新增活動'}
                                </Text>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={pxToDp(20)}
                                />
                            </TouchableOpacity>

                            {/* 登出賬號 */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() =>
                                    this.setState({logoutChoice: true})
                                }
                                style={styles.logoutButton}>
                                <Text style={{...styles.submitButtonText}}>
                                    登出賬號
                                </Text>
                            </TouchableOpacity>

                            {/* 刪除賬號 */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() =>
                                    this.setState({deleteChoice: true})
                                }
                                style={styles.logoutButton}>
                                <Text style={{...styles.submitButtonText}}>
                                    刪除組織賬號
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>

                {/* 登出前提示 */}
                <DialogDIY
                    showDialog={logoutChoice}
                    text={'確定要登出賬號嗎？'}
                    handleConfirm={handleLogout}
                    handleCancel={() => this.setState({logoutChoice: false})}
                />

                {/* 登出前提示 */}
                <DialogDIY
                    showDialog={deleteChoice}
                    text={`即將跳轉email界面，您可以向服務器管理員提出刪除該組織賬號。\n該組織賬號所有內容，包括發佈的活動，都將被刪除。`}
                    handleConfirm={() => {
                        this.setState({deleteChoice: false});
                        Linking.openURL('mailto:' + MAIL);
                    }}
                    handleCancel={() => this.setState({deleteChoice: false})}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    logoutButton: {
        backgroundColor: COLOR_DIY.unread,
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: pxToDp(20),
        paddingHorizontal: pxToDp(20),
        paddingVertical: pxToDp(10),
        borderRadius: pxToDp(10),
        ...COLOR_DIY.viewShadow,
    },
    submitButtonText: {
        color: white,
        fontSize: pxToDp(18),
        fontWeight: '500',
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: pxToDp(45),
        padding: pxToDp(10),
        backgroundColor: COLOR_DIY.meScreenColor.card_color,
        marginBottom: pxToDp(1),
        borderRadius: pxToDp(15),
        marginHorizontal: pxToDp(10),
        marginVertical: pxToDp(6),
    },
    optionTitle: {
        fontSize: pxToDp(16),
        color: COLOR_DIY.black.main,
        marginLeft: pxToDp(10),
    },
});
export default ClubSetting;
