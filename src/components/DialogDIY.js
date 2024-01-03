import React, { Component } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';

import { COLOR_DIY, uiStyle, } from '../utils/uiMap';

import { Dialog } from '@rneui/themed';

class DialogDIY extends Component {
    state = {};
    render() {
        return (
            <Dialog
                isVisible={this.props.showDialog}
                onBackdropPress={this.props.handleCancel}
                overlayStyle={{ backgroundColor: COLOR_DIY.white }}
            >
                <Dialog.Title
                    title="ARK ALL 提示"
                    titleStyle={{ color: COLOR_DIY.black.main }}
                />
                <Text style={{ ...uiStyle.defaultText, color: COLOR_DIY.black.second }}>
                    {this.props.text}
                </Text>
                <Dialog.Actions>
                    <Dialog.Button
                        title="確認"
                        onPress={this.props.handleConfirm}
                    />
                    <Dialog.Button
                        title="取消"
                        onPress={this.props.handleCancel}
                    />
                </Dialog.Actions>
            </Dialog>
        );
    }
}

export default DialogDIY;
