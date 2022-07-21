import React, {Component} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';

import {pxToDp} from '../../utils/stylesKits';
import {COLOR_DIY} from '../../utils/uiMap';
import {handleLogout} from '../../utils/storageKits';
import DialogDIY from '../../components/DialogDIY';
import Header from '../../components/Header';

import Ionicons from 'react-native-vector-icons/Ionicons';

const {black, themeColor, white} = COLOR_DIY;

class ClubSetting extends Component {
    state = {
        // 退出提示Dialog
        logoutChoice: false,
    };

    render() {
        const {logoutChoice} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'社團設置'} />

                <ScrollView>
                    {/* 社團主頁設置 選項 */}
                    <TouchableOpacity
                        style={{...styles.optionContainer}}
                        activeOpacity={0.8}
                        onPress={() => {
                            // 跳轉社團info編輯頁，並傳遞刷新函數
                            this.props.navigation.navigate('ClubInfoEdit', {
                                refresh: this.props.route.params.refresh,
                            });
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

                    {/* 登出賬號 */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => this.setState({logoutChoice: true})}
                        style={styles.logoutButton}>
                        <Text style={{...styles.submitButtonText}}>
                            登出賬號
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* 登出前提示 */}
                <DialogDIY
                    showDialog={logoutChoice}
                    text={'確定要登出賬號嗎？'}
                    handleConfirm={handleLogout}
                    handleCancel={() => this.setState({logoutChoice: false})}
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
        marginVertical: pxToDp(20),
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
