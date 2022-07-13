import React, {Component} from 'react';
import {View, Text, Button} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import {handleLogout} from '../../utils/storageKits';

import {Dialog} from '@rneui/themed';

class ClubSetting extends Component {
    state = {
        // 退出提示Dialog
        logoutChoice: false,
    };

    render() {
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'設置'} />
                <Text>社團設置頁</Text>

                <Button
                    title="登出賬號"
                    onPress={() => handleLogout()}></Button>
                {/* 登出前提示 */}
                <Dialog
                    isVisible={this.state.logoutChoice}
                    onBackdropPress={() =>
                        this.setState({logoutChoice: false})
                    }>
                    <Dialog.Title title="UM ALL 提示" />
                    <Text style={{color: COLOR_DIY.black.second}}>
                        確定要登出賬號嗎？
                    </Text>
                    {/* 退出前提示 */}
                    <Dialog.Actions>
                        <Dialog.Button title="確認" onPress={handleLogout} />
                        <Dialog.Button
                            title="取消"
                            onPress={() => this.setState({logoutChoice: false})}
                        />
                    </Dialog.Actions>
                </Dialog>
            </View>
        );
    }
}

export default ClubSetting;
