
import React, {Component} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

import {Header} from '@rneui/themed';

import TabPage from './TabPage';

class NewsScreen extends Component {
    render() {
        const {bg_color, themeColor, white, viewShadow} = COLOR_DIY;
        return (
            <View style={{backgroundColor: COLOR_DIY.bg_color, flex: 1}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    centerComponent={{
                        text: '資訊',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                    }}
                />
                {/* 能左右切換的TabPage */}
                <TabPage></TabPage>
            </View>
        );
    }
}

export default NewsScreen;
