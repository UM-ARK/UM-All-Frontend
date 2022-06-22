import React, {Component} from 'react';
import {
    Dimensions,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
} from 'react-native';

import {COLOR_DIY} from '../src/utils/uiMap';
import { pxToDp } from '../src/utils/stylesKits';

// 文檔：https://github.com/dohooo/react-native-reanimated-carousel/
import Carousel from 'react-native-reanimated-carousel';
import {Header} from 'react-native-elements'; // 4.0 Beta版
import {NavigationContext} from '@react-navigation/native'
import Ionicons from 'react-native-vector-icons/Ionicons';

const {width: PAGE_WIDTH} = Dimensions.get('window');

class TestScreen extends Component {
    static contextType = NavigationContext;
    // this.context === this.props.navigation
    render() {
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    leftComponent={
                        <TouchableOpacity onPress={()=>this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={COLOR_DIY.black.main}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '測試頁',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(22),
                        },
                    }}
                    statusBarProps={{backgroundColor:COLOR_DIY.bg_color, barStyle:'dark-content'}}
                />
            </View>
        );
    }
}

export default TestScreen;
