// 保存圖片，參考：https://dev.to/majiyd/react-native-series-how-to-save-an-image-from-a-remote-url-in-react-native-109d
// 有iOS單獨配置項
import React, {Component} from 'react';
import {View, Text, Button, Image} from 'react-native';

import {handleImageDownload} from '../src/utils/fileKits';

IMAGE_URL =
    'https://cdn.hk01.com/di/media/images/3112055/org/198b9182f4ede3c56172ee71730921d5.jpg/oqUv23FOaxynBKcl8aN_qeWZXALd06_tPMUc2jzFHNo?v=w1920';

class Test extends Component {
    render() {
        return (
            <View style={{flex: 1}}>
                <Image
                    source={{uri: IMAGE_URL}}
                    style={{width: '100%', height: '30%'}}
                />
                <Button
                    onPress={() => handleImageDownload(IMAGE_URL)}
                    title={'下載圖片'}
                />
            </View>
        );
    }
}

export default Test;
