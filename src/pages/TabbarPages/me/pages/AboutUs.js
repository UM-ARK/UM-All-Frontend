import React, {Component} from 'react';
import {
    ScrollView,
    View,
    Text,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import Header from '../../../../components/Header';

import FastImage from 'react-native-fast-image';
import {pxToDp} from '../../../../utils/stylesKits';
import {COLOR_DIY} from '../../../../utils/uiMap';

const {black} = COLOR_DIY;

class About extends Component {
    componentDidMount() {
        alert('未完成');
    }

    render() {
        return (
            <View style={{flex: 1}}>
                <Header title={'關於我們'} />

                <ScrollView contentContainerStyle={{padding: pxToDp(20)}}>
                    {/* LOGO */}
                    <View style={{...s.logoContainer}}>
                        <FastImage
                            source={require('../../../../static/img/umallLogo.png')}
                            style={{width: 100, height: 100}}
                        />
                    </View>

                    {/* APP標語 */}
                    <View style={{marginTop: pxToDp(20), alignSelf: 'center'}}>
                        <Text
                            style={{fontSize: pxToDp(15), color: black.third}}>
                            致力成為 UMer 人手一個的校園資訊APP！
                        </Text>
                    </View>

                    {/* 發展時間軸 */}
                    <View></View>
                </ScrollView>
            </View>
        );
    }
}

const s = StyleSheet.create({
    logoContainer: {
        alignSelf: 'center',
        borderRadius: pxToDp(15),
        overflow: 'hidden',
        ...COLOR_DIY.viewShadow,
    },
});

export default About;
