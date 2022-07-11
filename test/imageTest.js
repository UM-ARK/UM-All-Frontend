// 保存圖片，參考：https://dev.to/majiyd/react-native-series-how-to-save-an-image-from-a-remote-url-in-react-native-109d
// 有iOS單獨配置項
import React, {Component} from 'react';
import {View, Text, Button, Image, TouchableOpacity} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';

import {handleImageDownload, handleImageSelect} from '../src/utils/fileKits';

IMAGE_URL = 'https://www.cpsumsu.org/image/slideshow/slideshow_p1.jpg';

class Test extends Component {
    state = {
        imageUrl: '',
        imageUrlArr: ['', '', '', ''],
    };

    // 圖片選擇
    async handleSelect(index) {
        let imageUrl = '';
        try {
            let result = await handleImageSelect();
            if (result.didCancel) {
                console.log('取消選取圖片');
            } else {
                console.log('成功選取圖片', result.assets);
                imageUrl = result.assets[0].uri;
            }
        } catch (error) {
            console.log(error);
        } finally {
            // 修改this.state相片數組的值
            let imageUrlArr = this.state.imageUrlArr;
            imageUrlArr.splice(index, 1, imageUrl);
            this.setState({imageUrlArr});
        }
    }

    // 圖片刪除
    handleImageDelete = index => {
        let imageUrlArr = this.state.imageUrlArr;
        imageUrlArr.splice(index, 1);
        imageUrlArr.push('');
        this.setState({imageUrlArr});
    };

    handleDownload = () => {
        handleImageDownload(IMAGE_URL);
    };

    render() {
        // 渲染圖片選擇器
        renderImageSelector = index => {
            // 僅允許點擊相鄰的圖片選擇器
            let shouldDisable = false;
            if (index != 0) {
                if (this.state.imageUrlArr[index - 1] == '') {
                    shouldDisable = true;
                }
            }
            return (
                <TouchableOpacity
                    style={{
                        width: 160,
                        height: 100,
                        backgroundColor: '#f0f0f0',
                        justifyContent: 'center',
                        alignItems: 'center',
                        margin: 10,
                        borderRadius: 5,
                        overflow: 'hidden',
                    }}
                    activeOpacity={0.7}
                    onPress={this.handleSelect.bind(this, index)}
                    disabled={shouldDisable}>
                    {/* 刪除圖片按鈕 */}
                    {this.state.imageUrlArr[index].length > 0 && (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                zIndex: 9,
                            }}
                            onPress={() => this.handleImageDelete(index)}>
                            <Ionicons
                                name="close-circle"
                                size={25}
                                color={'red'}
                            />
                        </TouchableOpacity>
                    )}

                    {this.state.imageUrlArr[index].length > 0 ? (
                        <FastImage
                            source={{uri: this.state.imageUrlArr[index]}}
                            style={{width: '100%', height: '100%'}}
                        />
                    ) : (
                        <Ionicons
                            name="camera-outline"
                            size={25}
                            color={'black'}
                        />
                    )}
                </TouchableOpacity>
            );
        };

        return (
            <View style={{flex: 1}}>
                <FastImage
                    source={{uri: IMAGE_URL}}
                    style={{width: '100%', height: '30%'}}
                />
                <Button onPress={this.handleDownload} title={'下載圖片'} />

                {this.state.imageUrlArr.map((item, index) =>
                    renderImageSelector(index),
                )}
            </View>
        );
    }
}

export default Test;
