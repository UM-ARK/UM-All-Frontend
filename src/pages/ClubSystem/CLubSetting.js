import React, {Component} from 'react';
import {View, Text, Button} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import {handleLogout} from '../../utils/storageKits';

class ClubSetting extends Component {
    render() {
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'設置'} />
                <Text>社團設置頁</Text>

                <Button
                    title="退出登錄"
                    onPress={() => handleLogout()}></Button>
            </View>
        );
    }
}

export default ClubSetting;
