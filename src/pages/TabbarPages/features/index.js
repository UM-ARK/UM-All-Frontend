import React, { Component } from "react";
import {
    StyleSheet,
    Text,
    View,
} from "react-native";

import TopNav from '../../../components/TopNav';

class Index extends Component {
    state = {  } 
    render() { 
        return (
            <View>
                <TopNav title='服務'/>
                <Text>所有服務頁</Text>
            </View>
        );
    }
}

export default Index;