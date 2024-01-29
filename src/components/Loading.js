import React, { Component } from 'react';
import { View, Text, } from 'react-native';

import LoadingDotsDIY from './LoadingDots';
import { COLOR_DIY, uiStyle, } from '../utils/uiMap';
import { scale } from 'react-native-size-matters';
import { t } from "i18next";

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
                    backgroundColor: bg_color,
                }}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(20),
                        fontWeight: '600',
                        color: themeColor,
                        marginTop: scale(2),
                    }}>
                    {t('ARK ALL瘋狂加載中')}
                </Text>
                <View style={{ marginVertical: scale(10), }}>
                    <LoadingDotsDIY />
                </View>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(15),
                        fontWeight: '600',
                        color: themeColor,
                        marginTop: scale(3),
                        textAlign: 'center',
                    }}>
                    {`${t('確保網絡正常')}\n${t('可以刷新或重啟APP再試')}`}
                </Text>
            </View>
        );
    }
}

export default Loading;
