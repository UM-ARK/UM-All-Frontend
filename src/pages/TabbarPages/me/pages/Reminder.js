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

class Reminder extends Component {
    state = {  } 
    render() { 
        return (
            <View style={{
                height:'100%',
                width:'100%',
                alignItems:'center',
                justifyContent:'center'
            }}>
                <Text style={{fontSize:20}}>這一頁負責關注的</Text>
                <Text style={{fontSize:20}}>DDL和考試提醒</Text>
            </View>
        );
    }
}

export default Reminder;