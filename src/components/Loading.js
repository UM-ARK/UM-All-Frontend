import React, {Component} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';

import {pxToDp} from '../utils/stylesKits';
import {COLOR_DIY} from '../utils/uiMap';
const {black, white, themeColor, bg_color} = COLOR_DIY;

class Loading extends Component {
    render() {
        return (
            <View
                style={{
                    paddingHorizontal: pxToDp(20),
                    paddingVertical: pxToDp(10),
                    borderRadius: pxToDp(12),
                    backgroundColor: white,
                    alignItems: 'center',
                    ...COLOR_DIY.viewShadow,
                    overflow: 'visible',
                }}>
                <Text
                    style={{
                        fontSize: pxToDp(20),
                        fontWeight: '600',
                        color: themeColor,
                        marginTop: pxToDp(10),
                    }}>
                    Data is loading
                </Text>
                <Text
                    style={{
                        fontSize: pxToDp(15),
                        fontWeight: '600',
                        color: themeColor,
                    }}>
                    Please wait
                </Text>
                <ActivityIndicator size="large" color={themeColor} />
            </View>
        );
    }
}

export default Loading;
