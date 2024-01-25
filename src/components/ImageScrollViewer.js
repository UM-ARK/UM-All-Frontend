import React, { Component } from 'react';
import { Dimensions, View, Text, ActivityIndicator } from 'react-native';

import { COLOR_DIY } from '../utils/uiMap';
import { trigger } from '../utils/trigger';
import ModalBottom from './ModalSave';

import Ionicons from 'react-native-vector-icons/Ionicons';
import Modal from 'react-native-modal';
import ImageViewer from 'react-native-image-zoom-viewer';
import FastImage from 'react-native-fast-image';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const { height: PAGE_HEIGHT } = Dimensions.get('screen');

class ImageScrollViewer extends Component {
    state = {
        // 展示圖片查看的modal
        isModalVisible: false,
        // 展示圖片的下標
        imagesIndex: 0,
        // 展示長按圖片菜單
        isModalBottomVisible: true,
        isLoading: true,
    };

    componentWillUnmount() {
        FastImage.clearMemoryCache();
    }

    // 打開和關閉顯示照片的彈出層
    tiggerModal = () => {
        this.setState({
            isModalVisible: !this.state.isModalVisible,
        });
    };

    // 打開圖片數組內的某張圖片
    handleOpenImage = index => {
        this.setState({
            imagesIndex: index,
            isModalVisible: true,
        });
    };

    render() {
        const { isModalVisible, isModalBottomVisible, imagesIndex } = this.state;
        const { imageUrls } = this.props;

        let imageUrlsObjArr = [];
        if (typeof imageUrls == 'string') {
            imageUrlsObjArr.push({ url: imageUrls });
        } else {
            imageUrls.map(item => {
                if (typeof item == 'object' && item.url) {
                    imageUrlsObjArr.push(item);
                } else {
                    imageUrlsObjArr.push({ url: item });
                }
            });
        }

        return (
            <Modal
                // 彈出層展示圖片查看器
                isVisible={isModalVisible}
                statusBarTranslucent
                style={{ margin: 0 }}
                deviceHeight={PAGE_HEIGHT}
                deviceWidth={PAGE_WIDTH}
                backdropColor={'black'}
                backdropOpacity={0.85}
                onBackButtonPress={this.tiggerModal}
                onBackdropPress={this.tiggerModal}>
                <ImageViewer
                    backgroundColor={'transparent'}
                    useNativeDriver={true}
                    imageUrls={imageUrlsObjArr}
                    renderImage={props => (
                        <FastImage
                            source={{
                                uri: props.source.uri,
                            }}
                            style={{ backgroundColor: COLOR_DIY.trueWhite, ...props.style }}
                            onLoadStart={() => {
                                this.setState({ isLoading: true });
                            }}
                            onLoad={() => {
                                this.setState({ isLoading: false });
                            }}
                        />
                    )}
                    // 打開的imageUrls的索引
                    index={imagesIndex}
                    // 注釋掉renderIndicator屬性則 默認會有頁數顯示
                    onClick={this.tiggerModal}
                    doubleClickInterval={300}
                    enableSwipeDown={true}
                    onSwipeDown={this.tiggerModal}
                    // 自定義長按菜單
                    menus={({ cancel, _ }) => {
                        trigger();
                        return (
                            <ModalBottom
                                cancel={cancel}
                                imageUrl={imageUrlsObjArr[imagesIndex]}
                            />
                        );
                    }}
                />

                {this.state.isLoading ? (
                    <ActivityIndicator
                        size={'large'}
                        color={COLOR_DIY.white}
                        style={{
                            alignSelf: 'center',
                            justifyContent: 'center',
                            position: 'absolute',
                        }}
                    />
                ) : null}
            </Modal>
        );
    }
}

export default ImageScrollViewer;
