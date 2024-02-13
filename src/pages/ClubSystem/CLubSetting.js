import React, { Component } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Linking,
    Alert,
} from 'react-native';

import { pxToDp } from '../../utils/stylesKits';
import { COLOR_DIY, uiStyle, } from '../../utils/uiMap';
import { handleLogout } from '../../utils/storageKits';
import { MAIL } from '../../utils/pathMap';
import Header from '../../components/Header';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import { trigger } from '../../utils/trigger';

const { black, themeColor, white } = COLOR_DIY;

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
            this.setState({ fromEvent: true, eventID: param.eventID });
        } else {
            this.setState({ fromEvent: false });
        }
    }

    render() {
        const { fromEvent, eventID, } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={fromEvent ? '活動設置' : '組織賬號設置'} />

                <ScrollView>
                    {fromEvent ? (
                        // 活動設置
                        <View>
                            {/* 活動信息編輯 選項 */}
                            <TouchableOpacity
                                style={{ ...styles.optionContainer }}
                                activeOpacity={0.8}
                                onPress={() => {
                                    // 跳轉活動info編輯頁，並傳遞刷新函數
                                    this.props.navigation.navigate(
                                        'EventSetting',
                                        {
                                            mode: 'edit',
                                            eventData: { _id: eventID },
                                            refresh:
                                                this.props.route.params.refresh,
                                        },
                                    );
                                }}>
                                {/* 選項標題 */}
                                <Text style={{ ...styles.optionTitle }}>
                                    {'活動資訊編輯'}
                                </Text>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={scale(20)}
                                />
                            </TouchableOpacity>

                            {/* Follower 選項 */}
                            {false && (
                                <TouchableOpacity
                                    style={{ ...styles.optionContainer }}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        // 跳轉Follower頁
                                        this.props.navigation.navigate(
                                            'FollowersPage',
                                            { from: 'event', eventID },
                                        );
                                    }}>
                                    {/* 選項標題 */}
                                    <Text style={{ ...styles.optionTitle }}>
                                        {'關注者 - Followers'}
                                    </Text>

                                    {/* 右側flex佈局 */}
                                    {/* 引導點擊的 > 箭頭 */}
                                    <Ionicons
                                        name="chevron-forward-outline"
                                        color={black.third}
                                        size={scale(20)}
                                    />
                                </TouchableOpacity>
                            )}

                            {/* 歷史公告 選項 */}
                            {false && (
                                <TouchableOpacity
                                    style={{ ...styles.optionContainer }}
                                    activeOpacity={0.8}
                                    onPress={() =>
                                        this.props.navigation.navigate(
                                            'ChatDetail',
                                            { sendTo: eventID },
                                        )
                                    }>
                                    {/* 選項標題 */}
                                    <Text style={{ ...styles.optionTitle }}>
                                        {'歷史公告'}
                                    </Text>

                                    {/* 右側flex佈局 */}
                                    {/* 引導點擊的 > 箭頭 */}
                                    <Ionicons
                                        name="chevron-forward-outline"
                                        color={black.third}
                                        size={scale(20)}
                                    />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        // 社團設置
                        <View>
                            {/* 新增活動 選項 */}
                            <TouchableOpacity
                                style={{ ...styles.optionContainer }}
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
                                <View style={{ flexDirection: 'row', }}>
                                    <Ionicons
                                        name="add-circle-outline"
                                        color={black.main}
                                        size={scale(20)}
                                    />
                                    <Text style={{ ...styles.optionTitle }}>
                                        {'新增活動'}
                                    </Text>
                                </View>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={scale(20)}
                                />
                            </TouchableOpacity>

                            {/* 社團/組織面板設置 選項 */}
                            <TouchableOpacity
                                style={{ ...styles.optionContainer }}
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
                                <View style={{ flexDirection: 'row', }}>
                                    <Ionicons
                                        name="settings-outline"
                                        color={black.main}
                                        size={scale(20)}
                                    />
                                    <Text style={{ ...styles.optionTitle }}>
                                        {'組織主頁資料編輯'}
                                    </Text>
                                </View>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="chevron-forward-outline"
                                    color={black.third}
                                    size={scale(20)}
                                />
                            </TouchableOpacity>

                            {/* Follower 選項 */}
                            {false && (
                                <TouchableOpacity
                                    style={{ ...styles.optionContainer }}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        // 跳轉Follower頁
                                        this.props.navigation.navigate(
                                            'FollowersPage',
                                            { from: 'club' },
                                        );
                                    }}>
                                    {/* 選項標題 */}
                                    <Text style={{ ...styles.optionTitle }}>
                                        {'關注者 - Followers'}
                                    </Text>

                                    {/* 右側flex佈局 */}
                                    {/* 引導點擊的 > 箭頭 */}
                                    <Ionicons
                                        name="chevron-forward-outline"
                                        color={black.third}
                                        size={scale(20)}
                                    />
                                </TouchableOpacity>
                            )}

                            {/* 歷史公告 選項 */}
                            {false && (
                                <TouchableOpacity
                                    style={{ ...styles.optionContainer }}
                                    activeOpacity={0.8}
                                    onPress={() =>
                                        this.props.navigation.navigate(
                                            'ChatDetail',
                                            { sendTo: 'all' },
                                        )
                                    }>
                                    {/* 選項標題 */}
                                    <Text style={{ ...styles.optionTitle }}>
                                        {'歷史公告'}
                                    </Text>

                                    {/* 右側flex佈局 */}
                                    {/* 引導點擊的 > 箭頭 */}
                                    <Ionicons
                                        name="chevron-forward-outline"
                                        color={black.third}
                                        size={scale(20)}
                                    />
                                </TouchableOpacity>
                            )}

                            {/* 刪除組織賬號 */}
                            <TouchableOpacity
                                style={{ ...styles.optionContainer }}
                                activeOpacity={0.8}
                                onPress={() => {
                                    Alert.alert(`即將跳轉email界面`, `您需要向管理員提出刪除該組織賬號。\n該組織賬號所有內容，包括發佈的活動，都將被刪除。`,
                                        [
                                            {
                                                text: "確定",
                                                onPress: () => {
                                                    trigger();
                                                    Linking.openURL('mailto:' + MAIL);
                                                },
                                                style: 'destructive',
                                            },
                                            {
                                                text: "取消",
                                            },
                                        ]
                                    );
                                }}>
                                {/* 選項標題 */}
                                <View style={{ flexDirection: 'row', }}>
                                    <Ionicons
                                        name="trash-outline"
                                        color={black.third}
                                        size={scale(20)}
                                    />
                                    <Text style={{ ...styles.optionTitle, color: black.third }}>
                                        {'註銷組織賬號'}
                                    </Text>
                                </View>

                                {/* 右側flex佈局 */}
                                {/* 引導點擊的 > 箭頭 */}
                                <Ionicons
                                    name="close-sharp"
                                    color={black.third}
                                    size={scale(20)}
                                />
                            </TouchableOpacity>

                            <Text style={{
                                ...uiStyle.defaultText,
                                fontSize: verticalScale(12), fontWeight: 'bold',
                                color: COLOR_DIY.secondThemeColor,
                                alignSelf: 'center', textAlign: 'center', marginTop: scale(10)
                            }}>修改活動資料可進入具體活動頁面內操作！</Text>

                            {/* 登出賬號 */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    Alert.alert(`組織賬號提示`, `確定登出賬號嗎？`, [
                                        {
                                            text: "確定",
                                            onPress: () => {
                                                trigger();
                                                handleLogout();
                                            },
                                            style: 'destructive',
                                        },
                                        {
                                            text: "取消",
                                        },
                                    ]);
                                }}
                                style={{
                                    ...styles.logoutButton,
                                    marginTop: scale(300), marginBottom: scale(20)
                                }}>
                                <Text style={{ ...styles.submitButtonText }}>
                                    登出賬號
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    logoutButton: {
        backgroundColor: COLOR_DIY.unread,
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: scale(20),
        paddingHorizontal: scale(20),
        paddingVertical: scale(10),
        borderRadius: scale(10),
        ...COLOR_DIY.viewShadow,
    },
    submitButtonText: {
        ...uiStyle.defaultText,
        color: white,
        fontSize: scale(18),
        fontWeight: '500',
    },
    optionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: scale(45),
        padding: scale(10),
        backgroundColor: COLOR_DIY.meScreenColor.card_color,
        marginBottom: scale(1),
        borderRadius: scale(15),
        marginHorizontal: scale(10),
        marginVertical: scale(6),
    },
    optionTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(16),
        color: COLOR_DIY.black.main,
        marginLeft: scale(10),
    },
});
export default ClubSetting;
