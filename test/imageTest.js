// 保存圖片，參考：https://dev.to/majiyd/react-native-series-how-to-save-an-image-from-a-remote-url-in-react-native-109d
// 有iOS單獨配置項
import React, {Component} from 'react';
import {
    View,
    Text,
    Button,
    Image,
    PermissionsAndroid,
    Platform,
} from 'react-native';

import CameraRoll from '@react-native-community/cameraroll';
import RNFetchBlob from 'rn-fetch-blob';

// 請求保存權限
async function hasAndroidPermission() {
    const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;

    const hasPermission = await PermissionsAndroid.check(permission);
    if (hasPermission) {
        return true;
    }

    const status = await PermissionsAndroid.request(permission);
    return status === 'granted';
}

async function savePicture() {
    if (Platform.OS === 'android' && !(await hasAndroidPermission())) {
        return;
    }

    CameraRoll.save(tag, {type, album});
}

IMAGE_URL =
    'https://cdn.hk01.com/di/media/images/3112055/org/198b9182f4ede3c56172ee71730921d5.jpg/oqUv23FOaxynBKcl8aN_qeWZXALd06_tPMUc2jzFHNo?v=w1920';

class Test extends Component {
    getPermissionAndroid = async () => {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                {
                    title: 'Image Download Permission',
                    message:
                        'Your permission is required to save images to your device',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                },
            );
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                return true;
            }
            Alert.alert(
                'Save remote Image',
                'Grant Me Permission to save Image',
                [{text: 'OK', onPress: () => console.log('OK Pressed')}],
                {cancelable: false},
            );
        } catch (err) {
            Alert.alert(
                'Save remote Image',
                'Failed to save Image: ' + err.message,
                [{text: 'OK', onPress: () => console.log('OK Pressed')}],
                {cancelable: false},
            );
        }
    };

    handleDownload = async () => {
        if (Platform.OS === 'android') {
            const granted = await this.getPermissionAndroid();
            if (!granted) {
                return;
            }
        }

        // 保存圖片
        RNFetchBlob.config({
            fileCache: true,
            appendExt: 'png',
        })
            .fetch('GET', IMAGE_URL)
            .then(res => {
                CameraRoll.save(res.data, 'photo')
                    .then(res => console.log(res))
                    .catch(err => console.log(err));
            });
    };

    render() {
        return (
            <View style={{flex: 1}}>
                <Image
                    source={{
                        uri: IMAGE_URL,
                    }}
                    style={{width: '100%', height: '30%'}}
                />
                <Button
                    onPress={this.handleDownload}
                    title={'下載圖片'}></Button>
            </View>
        );
    }
}

export default Test;
