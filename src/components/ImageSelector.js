// 圖片選擇器，最後的數據集中在父組件
// 必須提供props
// imageUrlArr 圖片數組，應默認為['', '', '', '']
// index 當前渲染的index，必須用圖片數組進行循環渲染
// setImageUrlArr 需指定父組件的setState入imageUrlArr方法

// 例子
/*
{this.state.imageUrlArr.map((item, index) => (
    <ImageSelector
        index={index}
        imageUrlArr={this.state.imageUrlArr}
        setImageUrlArr={this.setImageUrlArr.bind(
            this,
        )}></ImageSelector>
))}
*/

import React, {Component} from 'react';
import {View, Text, Button, Image, TouchableOpacity} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';

import {COLOR_DIY} from '../utils/uiMap';
import {pxToDp} from '../utils/stylesKits';
import {handleImageDownload, handleImageSelect} from '../utils/fileKits';

class ImageSelector extends Component {
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
            let imageUrlArr = this.props.imageUrlArr;
            imageUrlArr.splice(index, 1, imageUrl);
            this.props.setImageUrlArr(imageUrlArr);
        }
    }

    // 圖片刪除
    handleImageDelete = index => {
        let imageUrlArr = this.props.imageUrlArr;
        imageUrlArr.splice(index, 1);
        imageUrlArr.push('');
        this.props.setImageUrlArr(imageUrlArr);
    };

    render() {
        const {index, imageUrlArr} = this.props;
        // 僅允許點擊相鄰的圖片選擇器
        let shouldDisable = false;
        if (index != 0) {
            if (this.props.imageUrlArr[index - 1] == '') {
                shouldDisable = true;
            }
        }

        return (
            <TouchableOpacity
                style={{
                    width: pxToDp(160),
                    height: pxToDp(100),
                    backgroundColor: '#f0f0f0',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: pxToDp(5),
                    overflow: 'hidden',
                    ...this.props.style,
                }}
                activeOpacity={0.7}
                disabled={shouldDisable}
                onPress={this.handleSelect.bind(this, index)}>
                {/* 刪除圖片按鈕 */}
                {imageUrlArr[index].length > 0 && (
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
                            size={pxToDp(25)}
                            color={COLOR_DIY.unread}
                        />
                    </TouchableOpacity>
                )}

                {/* 未選擇圖片則顯示圖標，選中/已有圖片則顯示圖片 */}
                {imageUrlArr[index].length > 0 ? (
                    <FastImage
                        source={{
                            uri: imageUrlArr[index],
                            cache: FastImage.cacheControl.web,
                        }}
                        style={{width: '100%', height: '100%'}}
                    />
                ) : (
                    <Ionicons
                        name="camera-outline"
                        size={pxToDp(25)}
                        color={COLOR_DIY.black.main}
                    />
                )}
            </TouchableOpacity>
        );
    }
}

export default ImageSelector;
