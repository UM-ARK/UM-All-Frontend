import React from 'react';
import {View, ImageBackground, StyleSheet} from 'react-native';

const BlurViewWrapper = (props) => {
    return (
        <View style={[styles.blurWrap, {height: props.blurHeight, width: props.width}]}>
            <ImageBackground
                source={{uri: props.url}}
                blurRadius={Platform.OS === 'ios' ? props.blurRadius + 5 : props.blurRadius}
                style={[styles.blurImageStyle, {height: props.blurHeight, width: props.width}]}
            >
                <View style={{backgroundColor: props.bgColor, height: props.blurHeight}}>
                    {props.children}
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    blurWrap: {
        // height: 150,
        // overflow: 'hidden',
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
    blurImageStyle: {
        // height: 150,
        // width: 150,
        position: 'absolute',
        bottom: 0,
        justifyContent: 'flex-end',
    }
});

export default BlurViewWrapper;
