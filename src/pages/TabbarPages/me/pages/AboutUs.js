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

class About extends Component {
    state = {};
    render() {
        return (
            <View style={{flex: 1}}>
                <Header title={'關於我們'} />

                <Text style={{fontSize: 20}}>我求求你</Text>
                <Text style={{fontSize: 50}}>Donate</Text>
                <Text style={{fontSize: 20}}>我們一下吧！！！</Text>
            </View>
        );
    }
}

export default About;
