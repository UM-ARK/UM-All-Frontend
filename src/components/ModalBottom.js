// 自定義底部彈出層，用於保存圖片等
import React, { Component } from 'react';
import { Dimensions, View, Text, Button, TouchableOpacity } from 'react-native';

import Modal from 'react-native-modal';

import { COLOR_DIY, uiStyle, } from '../utils/uiMap';
import { scale } from 'react-native-size-matters';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const { height: PAGE_HEIGHT } = Dimensions.get('screen');

class ModalBottom extends Component {
    static defaultProps = {
        style: {},
    };

    state = {
        isModalBottomVisible: true,
    };

    // 開啟/關閉Modal
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
                backdropColor={COLOR_DIY.trueBlack}
                backdropOpacity={0.5}
                // animationIn='zoomIn'    animationOut='zoomOut'
                onBackButtonPress={this.tiggerModal}
                onBackdropPress={this.tiggerModal}
                style={{
                    margin: 0,
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                }}>
                <View
                    style={{
                        // height: '18%',
                        width: '100%',
                        backgroundColor: COLOR_DIY.bg_color,
                        borderTopLeftRadius: scale(15),
                        borderTopRightRadius: scale(15),
                        overflow: 'hidden',
                        // 可接收樣式覆蓋
                        ...this.props.style,
                    }}>
                    {this.props.children}
                </View>
            </Modal>
        );
    }
}

export default ModalBottom;
