import React, {Component} from 'react';
import {Text, View} from 'react-native';
import {NativeBaseProvider} from 'native-base';
import AnimatedSplash from 'react-native-animated-splash-screen';

// 本地引用
import Nav from './src/Nav';

import {SafeAreaProvider} from 'react-native-safe-area-context';

class App extends Component {
    state = {
        isLoaded: false,
    };

    async componentDidMount() {
        // 開屏動畫
        setTimeout(() => {
            this.setState({isLoaded: true});
        }, 1000);
    }

    render() {
        return (
            // 開屏動畫
            <AnimatedSplash
                translucent={true}
                isLoaded={this.state.isLoaded}
                logoImage={require('./src/static/UMARK_Assets/icons/Home-sk_thin_icons/AppIcons/appstore.png')}
                backgroundColor={'#fff'}
                logoHeight={150}
                logoWidth={150}>
                <SafeAreaProvider>
                    <NativeBaseProvider>
                        <View style={{flex: 1}}>
                            <Nav></Nav>
                        </View>
                    </NativeBaseProvider>
                </SafeAreaProvider>
            </AnimatedSplash>
        );
    }
}

export default App;
