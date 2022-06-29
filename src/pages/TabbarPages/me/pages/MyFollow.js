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

class Follow extends Component {
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
                <Text style={{fontSize:20}}>社團和活動的通知</Text>
            </View>
        );
    }
}

export default Follow;