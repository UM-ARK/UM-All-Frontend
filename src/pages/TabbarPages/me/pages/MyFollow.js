import React, {Component} from 'react';
import {
    ScrollView,
    View,
    Text,
    SafeAreaView,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';
import Header from '../../../../components/Header'

// 第三方庫
import Ionicons from 'react-native-vector-icons/Ionicons';

class Follow extends Component {
    state = {};
    render() {
        return (
            <View style={{flex: 1}}>
                <Header title={'我的追蹤'}/>

                <Text style={{fontSize: 20}}>這一頁負責關注的</Text>
                <Text style={{fontSize: 20}}>社團和活動的通知</Text>
            </View>
        );
    }
}

export default Follow;
