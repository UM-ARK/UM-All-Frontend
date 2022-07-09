import React from 'react';
import {View, ImageBackground, StyleSheet} from 'react-native';

const BlurViewWrapper = (props) => {
    return (
        /* 模糊部件*/
        <View style={[styles.blurWrap, {height: props.blurHeight, width: props.width}]}>
            {/* 模糊部份相片-取決於blurHeight*/}
            <ImageBackground
                source={{uri: props.url}}
                blurRadius={Platform.OS === 'ios' ? props.blurRadius + 5 : props.blurRadius}
                style={[styles.blurImageStyle, {height: props.height, width: props.width}]}
            >
                {/* 在模糊部件上的透明色塊 */}
                <View style={{backgroundColor: props.bgColor, height: props.blurHeight}}>
                    {props.children}
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    blurWrap: {
        overflow: 'hidden',
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
    blurImageStyle: {
        position: 'absolute',
        bottom: 0,
        justifyContent: 'flex-end',
    }
});

export default BlurViewWrapper;