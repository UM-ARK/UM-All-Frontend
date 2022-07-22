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

import Header from '../../../../components/Header';

class UsualQuestion extends Component {
    state = {};
    render() {
        return (
            <View style={{flex: 1}}>
                <Header title={'常見問題'} />
                <Text style={{fontSize: 20}}>常見問題</Text>
            </View>
        );
    }
}

export default UsualQuestion;
