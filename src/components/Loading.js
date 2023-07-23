import React, { Component } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import { COLOR_DIY } from '../utils/uiMap';
import { scale } from 'react-native-size-matters';
const { black, white, themeColor, bg_color } = COLOR_DIY;

class Loading extends Component {
    render() {
        return (
            <View
                style={{
                    paddingHorizontal: scale(20),
                    paddingVertical: scale(10),
                    borderRadius: scale(12),
                    borderWidth: scale(2),
                    borderColor: themeColor,
                    alignItems: 'center',
                }}>
                <Text
                    style={{
                        fontSize: scale(20),
                        fontWeight: '600',
                        color: themeColor,
                        marginTop: scale(2),
                    }}>
                    Data is loading
                </Text>
                <Text
                    style={{
                        fontSize: scale(15),
                        fontWeight: '600',
                        color: themeColor,
                        marginTop: scale(3),
                    }}>
                    Please wait
                </Text>
                <ActivityIndicator size="large" color={themeColor} style={{
                    marginTop: scale(10),
                }} />
            </View>
        );
    }
}

export default Loading;
