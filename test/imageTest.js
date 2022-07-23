// 保存圖片，參考：https://dev.to/majiyd/react-native-series-how-to-save-an-image-from-a-remote-url-in-react-native-109d
// 有iOS單獨配置項
import React, {Component} from 'react';
import {View, Text, Button, Image, TouchableOpacity} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';

import {handleImageDownload, handleImageSelect} from '../src/utils/fileKits';

import ImageSelector from '../src/components/ImageSelector';

IMAGE_URL = 'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg';

class ImageTest extends Component {
    state = {
        imageUrlArr: ['', '', '', ''],
    };

    handleDownload = () => {
        handleImageDownload(IMAGE_URL);
    };

    setImageUrlArr = imageUrlArr => {
        this.setState({imageUrlArr});
    };

    render() {
        console.log(this.state.imageUrlArr);
        return (
            <View style={{flex: 1}}>
                <FastImage
                    source={{uri: IMAGE_URL, cache: FastImage.cacheControl.web}}
                    style={{width: '100%', height: '30%'}}
                />
                <Button onPress={this.handleDownload} title={'下載圖片'} />

                {this.state.imageUrlArr.map((item, index) => (
                    <ImageSelector
                        index={index}
                        imageUrlArr={this.state.imageUrlArr}
                        setImageUrlArr={this.setImageUrlArr.bind(
                            this,
                        )}></ImageSelector>
                ))}
            </View>
        );
    }
}

export default ImageTest;
