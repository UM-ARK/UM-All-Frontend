// 仿毛玻璃模糊圖片效果組件
// 必須指定參數：
// url 圖片鏈接字符串
// width 圖片尺寸
// height
// blurHeight 需要虛化的高度，接受num或%
// blurRadius 虛化半徑
// bgColor 模糊層顏色
import React from 'react';
import {View, ImageBackground, StyleSheet} from 'react-native';

// 用於判斷blurHeight是int單位還是%單位，從而決定子元素是否按父元素%確定高
function isHeightPercent(height) {
    return height.indexOf('%') != -1;
}

// 百分比高度轉父級高度的相對高度
function percentHeightToheight(percentHeightStr, fatherHeight) {
    return (percentHeightStr.replace('%', '') / 100) * fatherHeight;
}

const BlurViewWrapper = props => {
    return (
        <View style={{...styles.blurWrap, height: props.blurHeight}}>
            {/* blurHeight: 模糊層的高度 */}
            {/* 以外層View的height將原寬高的模糊圖片進行hidden裁切 */}
            <ImageBackground
                source={{uri: props.url}}
                // 圖片模糊半徑
                blurRadius={
                    Platform.OS === 'ios'
                        ? props.blurRadius + 5
                        : props.blurRadius
                }
                style={{
                    ...styles.blurImageStyle,
                    height: props.height,
                }}>
                {/* 模糊層覆蓋顏色 */}
                <View
                    style={{
                        ...styles.blurColorOverlay,
                        backgroundColor: props.bgColor,
                    }}
                />
                {/* 信息展示 */}
                <View
                    style={{
                        ...styles.blurInfoContainer,
                        // 判斷輸入的blurHeight是否為%單位
                        // 信息展示的高度應依據實際模糊的高度為準
                        height: isHeightPercent(props.blurHeight)
                            ? percentHeightToheight(
                                  props.blurHeight,
                                  props.height,
                              )
                            : props.blurHeight,
                    }}>
                    {props.children}
                </View>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    blurWrap: {
        width: '100%',
        overflow: 'hidden',
        position: 'absolute',
        bottom: 0,
    },
    blurImageStyle: {
        width: '100%',
        position: 'absolute',
        bottom: 0,
        justifyContent: 'flex-end',
    },
    blurColorOverlay: {
        height: '100%',
        width: '100%',
        position: 'absolute',
        bottom: 0,
    },
    blurInfoContainer: {
        width: '100%',
        zIndex: 99,
        // position: 'absolute',
        // bottom: 0,
    },
});

export default BlurViewWrapper;
