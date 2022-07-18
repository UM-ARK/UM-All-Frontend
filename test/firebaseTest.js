import React, {Component} from 'react';
import {View, Text, Button} from 'react-native';

import messaging from '@react-native-firebase/messaging';

import {pxToDp} from '../src/utils/stylesKits';

class Test extends Component {
    async checkToken() {
        const fcmToken = await messaging()
            .getToken()
            .then(res => {
                console.log('res', res);
                alert(res);
            })
            .catch(err => {
                console.error('err', err);
                alert(err);
            });
        if (fcmToken) {
            console.log(fcmToken);
            alert(fcmToken);
        }
    }

    render() {
        console.log(messaging);
        return (
            <View style={{style: 1, paddingTop: pxToDp(50)}}>
                <Text>Test</Text>
                <Button title="自動初始化" onPress={this.checkToken}></Button>
            </View>
        );
    }
}

export default Test;
