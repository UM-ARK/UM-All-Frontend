// 自定義底部彈出層，用於保存圖片等
import React, { Component } from 'react';
import { Dimensions, View, Text, Button, TouchableOpacity } from 'react-native';

import { COLOR_DIY, uiStyle, } from '../utils/uiMap';
import { handleImageDownload } from '../utils/fileKits';

import Modal from 'react-native-modal';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { scale } from 'react-native-size-matters';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const { height: PAGE_HEIGHT } = Dimensions.get('screen');

class ModalSave extends Component {
    state = {
        isModalBottomVisible: true,
    };

    tiggerModal = () => {
        this.setState({ isModalBottomVisible: !this.state.isModalBottomVisible });
        this.props.cancel();
    };

    render() {
        const { isModalBottomVisible } = this.state;
        return (
            <Modal
                isVisible={isModalBottomVisible}
                statusBarTranslucent
                deviceHeight={PAGE_HEIGHT}
                backdropColor={COLOR_DIY.black.main}
                backdropOpacity={0.5}
                onBackButtonPress={this.tiggerModal}
                onBackdropPress={this.tiggerModal}
                style={{
                    margin: 0,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                }}>
                <View
                    style={{
                        height: '18%',
                        width: '100%',
                        backgroundColor: COLOR_DIY.bg_color,
                        borderTopLeftRadius: scale(15),
                        borderTopRightRadius: scale(15),
                        overflow: 'hidden',
                    }}>
                    <View style={{ padding: scale(20) }}>
                        <View
                            style={{
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: COLOR_DIY.white,
                                    width: scale(70),
                                    height: scale(70),
                                    borderRadius: scale(20),
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('soft');
                                    handleImageDownload(
                                        this.props.imageUrl.url,
                                    );
                                    this.props.cancel();
                                }}>
                                <Ionicons
                                    name="images-outline"
                                    color={COLOR_DIY.themeColor}
                                    size={scale(30)}></Ionicons>
                            </TouchableOpacity>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    marginTop: scale(2),
                                    color: COLOR_DIY.themeColor,
                                }}>
                                保存圖片
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }
}

export default ModalSave;
