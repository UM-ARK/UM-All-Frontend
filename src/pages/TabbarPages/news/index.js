import React, {Component} from 'react';
import {Text, View} from 'react-native';

import TopNav from '../../../components/TopNav';

class NewsScreen extends Component {
    render() {
        return (
            <View>
                <TopNav title='資訊'/>
                <Text>新聞頁</Text>
            </View>
        );
    }
}

export default NewsScreen;
