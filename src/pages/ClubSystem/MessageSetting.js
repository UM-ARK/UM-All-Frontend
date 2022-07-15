import React, {Component} from 'react';
import {View, Text, Button} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import {handleLogout} from '../../utils/storageKits';
import DialogDIY from '../../components/DialogDIY';

class MessageSetting extends Component {
    state = {
        // 退出提示Dialog
        logoutChoice: false,
    };

    render() {
        const {logoutChoice} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'公告推送設置'} />
                
            </View>
        );
    }
}

export default MessageSetting;
