// 體育設施頁
import React, {Component} from 'react';
import {Text, View, TouchableOpacity} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';

import IntegratedWebView from '../../components/IntegratedWebView';
import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale } from 'react-native-size-matters';

class UMWhole extends Component {
    constructor(props) {
        super(props);
        this.state = {
            progress: 0,
            // 默認刷新標識
            needRefresh: false,
        };
    }

    // 切換刷新標識
    triggerRefresh = () => {
        this.setState({needRefresh: !this.state.needRefresh});
    };

    render() {
        return (
            <View style={{flex: 1}}>
                <Header
                    backgroundColor={'#1f5288'}
                    leftComponent={
                        <TouchableOpacity
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={scale(25)}
                                color={COLOR_DIY.white}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '澳大選咩課',
                        style: {
                            color: COLOR_DIY.white,
                            fontSize: scale(15),
                        },
                    }}
                    rightComponent={
                        <TouchableOpacity onPress={() => this.triggerRefresh()}>
                            <Ionicons
                                name="refresh"
                                size={scale(25)}
                                color={COLOR_DIY.white}
                            />
                        </TouchableOpacity>
                    }
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                    }}
                />
                <IntegratedWebView
                    source={{uri: 'https://www.umeh.top/'}}
                    needRefresh={this.state.needRefresh}
                    triggerRefresh={this.triggerRefresh}
                />
            </View>
        );
    }
}

export default UMWhole;
