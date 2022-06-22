import React, {Component} from 'react';
import {Text, View} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'
import {Header} from 'react-native-elements'; // 4.0 Beta版


class NewsScreen extends Component {
    render() {
        return (
            <View>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    centerComponent={{
                        text: '資訊',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(20),
                        },
                    }}
                    statusBarProps={{backgroundColor:COLOR_DIY.bg_color, barStyle:'dark-content'}}
                />
                <Text>新聞頁</Text>
            </View>
        );
    }
}

export default NewsScreen;
