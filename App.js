import 'react-native-gesture-handler';
import React, {Component} from 'react';
import {Text, View} from 'react-native';

// 本地引用
import Nav from './src/Nav';

import {SafeAreaProvider} from 'react-native-safe-area-context';

class App extends Component {
    render() {
        return (
            <SafeAreaProvider>
                <View style={{flex: 1}}>
                    <Nav></Nav>
                </View>
            </SafeAreaProvider>
        );
    }
}

export default App;