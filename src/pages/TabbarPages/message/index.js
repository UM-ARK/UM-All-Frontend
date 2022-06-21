// 信息頁

import React, { Component } from "react";
import {
    Text,
    View,
} from "react-native";

import TopNav from '../../../components/TopNav';

class MesgScreen extends Component {
    state = {  } 
    render() { 
        return (
            <View>
                <TopNav title='提醒'/>

                <Text style={{ fontSize: 30, }}>Message Page</Text>
            </View>
        );
    }
}

export default MesgScreen;