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

// 文檔：https://github.com/dohooo/react-native-reanimated-carousel/
import Carousel from 'react-native-reanimated-carousel';
import {Header} from 'react-native-elements'; // 4.0 Beta版
import {NavigationContext} from '@react-navigation/native'
import Ionicons from 'react-native-vector-icons/Ionicons';
import { pxToDp } from '../src/utils/stylesKits';

const {width: PAGE_WIDTH} = Dimensions.get('window');

class TestScreen extends Component {
    static contextType = NavigationContext;
    // this.context === this.props.navigation
    render() {
        const baseOptions = {
            vertical: false,
            width: PAGE_WIDTH,
            height: PAGE_WIDTH / 2,
        };

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

                <View style={{paddingTop: 50}}>
                    <Carousel
                        {...baseOptions}
                        loop
                        autoPlay={true}
                        autoPlayInterval={2000}
                        data={[1, 2, 3]}
                        renderItem={({index}: {index: number}) => (
                            <View
                                style={{
                                    borderWidth: 1,
                                    borderColor: 'red',
                                    flex: 1,
                                    borderRadius: 20,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingHorizontal: 10,
                                }}>
                                <Text>{index}</Text>
                            </View>
                        )}
                    />
                </View>
            </View>
        );
    }
}

export default TestScreen;
