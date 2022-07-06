import React from 'react';
import {Animated} from 'react-native';

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
                width: 200, //route.title.length * 50,
                height: 30,
                zIndex: -10,
                backgroundColor: 'lightblue',
                transform: [
                    {
                        translateX,
                    },
                ],
            }}></Animated.View>
    );
};

export default ScrollAnimation;
