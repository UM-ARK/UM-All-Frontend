import React, {Component} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import {pxToDp} from '../../utils/stylesKits';

import {WebView} from 'react-native-webview';
import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';

const bg_color = '#24417e';
const font_color = '#d5dbe6';

class Map extends Component {
    render() {
        return (
            <View style={{flex: 1}}>
                <Header
                    backgroundColor={bg_color}
                    leftComponent={
                        <TouchableOpacity
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={font_color}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '澳大獎學金',
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
                    source={{uri: 'https://sds.sao.um.edu.mo/whole-person-nurturing/scholarship-and-awards/?lang=zh-hant'}}
                    startInLoadingState={true}
                />
            </View>
        );
    }
}

export default Map;
