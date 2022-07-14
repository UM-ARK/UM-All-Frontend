import React, {Component} from 'react';
import {View, Text, Button} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import {handleLogout} from '../../utils/storageKits';
import DialogDIY from '../../components/DialogDIY';

class ClubSetting extends Component {
    state = {
        // 退出提示Dialog
        logoutChoice: false,
    };

    render() {
        const {logoutChoice} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'設置'} />
                <Text>社團設置頁</Text>

                <Button
                    title="登出賬號"
                    onPress={() => this.setState({logoutChoice: true})}
                />

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

export default ClubSetting;
