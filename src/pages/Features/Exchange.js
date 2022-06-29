import React, {Component} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import {pxToDp} from '../../utils/stylesKits';

import {WebView} from 'react-native-webview';
import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';

const bg_color = '#112a54';
const font_color = '#ffffff';

class Map extends Component {
    render() {
        return (
            <View style={{flex: 1}}>
                <Header
                    backgroundColor={bg_color}
                    leftComponent={
                        <TouchableOpacity
                            style={{flexDirection:'column',justifyContent:'center', alignItems:'center'}}
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={font_color}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '澳大交流項目',
                        style: {
                            color: font_color,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                    }}
                />

                <WebView
                    source={{uri: 'https://gao.um.edu.mo/mobility/?lang=zh-hant'}}
                    startInLoadingState={true}
                />
            </View>
        );
    }
}

export default Map;
