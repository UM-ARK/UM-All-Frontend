// 切換動畫
import React from 'react';
import {Animated} from 'react-native';

import {COLOR_DIY} from '../utils/uiMap';
import {pxToDp} from '../utils/stylesKits';

export const getTranslateX = (
    selectedIndex,
    componentIndex,
    props,
    inputRange,
) => {
    if (selectedIndex == 0) {
        if (componentIndex == 0) {
            return props.position.interpolate({
                inputRange,
                outputRange: [0, 100, 200],
            });
        } else if (componentIndex == 1) {
            return props.position.interpolate({
                inputRange,
                outputRange: [-220, 0, 200],
            });
        } else if (componentIndex == 2) {
            return props.position.interpolate({
                inputRange,
                outputRange: [-200, -200, 0],
            });
        }
    } else if (selectedIndex == 1) {
        if (componentIndex == 0) {
            return props.position.interpolate({
                inputRange,
                outputRange: [0, 60, 60],
            });
        } else if (componentIndex == 1) {
            return props.position.interpolate({
                inputRange,
                outputRange: [-200, 0, 100],
            });
        } else if (componentIndex == 2) {
            return props.position.interpolate({
                inputRange,
                outputRange: [-200, -200, 0],
            });
        }
    } else {
        //else if(selectedIndex == 2)
        if (componentIndex == 0) {
            return props.position.interpolate({
                inputRange,
                outputRange: [0, 200, 200],
            });
        } else if (componentIndex == 1) {
            return props.position.interpolate({
                inputRange,
                outputRange: [-200, 0, 100],
            });
        } else if (componentIndex == 2) {
            return props.position.interpolate({
                inputRange,
                outputRange: [-300, -200, 0],
            });
        }
    }
};

const ScrollAnimation = ({translateX}) => {
    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: pxToDp(150), //route.title.length * 50,
                height: pxToDp(30),
                borderRadius: pxToDp(10),
                zIndex: -10,
                backgroundColor: '#aed0ee',
                transform: [
                    {
                        translateX,
                    },
                ],
            }}></Animated.View>
    );
};

export default ScrollAnimation;
