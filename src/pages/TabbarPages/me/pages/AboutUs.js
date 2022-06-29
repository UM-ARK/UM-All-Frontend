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

class About extends Component {
    state = {  } 
    render() { 
        return (
            <View style={{
                height:'100%',
                width:'100%',
                alignItems:'center',
                justifyContent:'center'
            }}>
                <Text style={{fontSize:20}}>我求求你</Text>
                <Text style={{fontSize:50}}>Donate</Text>
                <Text style={{fontSize:20}}>我們一下吧！！！</Text>
            </View>
        );
    }
}

export default About;