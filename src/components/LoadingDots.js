import React, { Component } from 'react';
import { View, Text } from 'react-native';

import { COLOR_DIY } from '../utils/uiMap';

import LoadingDots from "react-native-loading-dots";
import { scale } from 'react-native-size-matters';

export default class LoadingDotsDIY extends Component {
    render() {
        return (
            <LoadingDots
                size={this.props.size ? this.props.size : scale(10)}
                bounceHeight={this.props.bounceHeight ? this.props.bounceHeight : scale(5)}
                dots={this.props.dots ? this.props.dots : 3}
                colors={[COLOR_DIY.themeColor, COLOR_DIY.themeColorLight, COLOR_DIY.themeColorUltraLight]}
            />
        );
    }
}
