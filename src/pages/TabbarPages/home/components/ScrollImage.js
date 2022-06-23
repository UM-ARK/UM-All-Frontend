import * as React from 'react';
import { View, Dimensions, Text, Image } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';

import {pxToDp} from '../../../../utils/stylesKits'
import {COLOR_DIY} from '../../../../utils/uiMap'

const {width: PAGE_WIDTH} = Dimensions.get('window');

let colors = [
    COLOR_DIY.themeColor,
    COLOR_DIY.themeColor,
    COLOR_DIY.themeColor,
    COLOR_DIY.themeColor,
    COLOR_DIY.themeColor,
    COLOR_DIY.themeColor,
];

function ScrollImage(props) {
    const progressValue = useSharedValue(0);
    const {imageData} = props;
    // imageData.map()

    return (
        <View style={{ alignItems:'center', width:PAGE_WIDTH, marginTop:pxToDp(-10) }} >
        {/* 1.0 輪播圖組件 開始 */}
            <Carousel
                vertical= {false}
                width= {PAGE_WIDTH}
                height= {pxToDp(180)}
                loop
                autoPlay={true}
                autoPlayInterval={1500}
                onProgressChange={(_, absoluteProgress) => progressValue.value = absoluteProgress }
                mode="parallax"
                modeConfig={{
                    parallaxScrollingScale: 0.79,
                    parallaxScrollingOffset: 100,
                }}
                data={imageData}
                renderItem={({item}) => (
                    <View style={{ flex: 1 }}>
                        {/* 1.1 圖片展示 開始 */}
                        <View style={{
                            borderRadius: pxToDp(20),
                            borderWidth:pxToDp(2),
                            borderColor:COLOR_DIY.black.third,
                            overflow:'hidden',
                            width:"100%", 
                            height:"95%",
                            // 添加陰影
                            ...COLOR_DIY.viewShadow, 
                        }}>
                            <Image 
                                resizeMode='cover'
                                style={{ width:"100%", height:"100%"}}
                                source={{uri:item.uri}}
                            >
                            </Image>
                        </View>
                        {/* 1.1 圖片展示 結束 */}

                        {/* 1.2 圖片說明 開始 */}
                        <Text style={{
                            fontSize:pxToDp(18), 
                            color: COLOR_DIY.black.second, 
                            marginTop:pxToDp(3), marginLeft:pxToDp(25),
                        }}>{item.title}</Text>
                        {/* 1.2 圖片說明 結束 */}
                    </View>
                )}
            />
            
            <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                width: 100,
                alignSelf: 'center',
            }} >
                {colors.map((backgroundColor, index) => {
                    return (
                        <PaginationItem
                            backgroundColor={backgroundColor}
                            animValue={progressValue}
                            index={index}
                            key={index}
                            isRotate={false}
                            length={imageData.length}
                        />
                    );
                })}
            </View>

        {/* 1.0 輪播圖組件 結束 */}
        </View>
    );
}

const PaginationItem: React.FC<{
    index: number;
    backgroundColor: string;
    length: number;
    animValue: Animated.SharedValue;
    isRotate?: boolean;
}> = (props) => {
    const { animValue, index, length, backgroundColor, isRotate } = props;
    let width = (length-6)?(10-length+6):10;

    const animStyle = useAnimatedStyle(() => {
        let inputRange = [index - 1, index, index + 1];
        let outputRange = [-width, 0, width];

        if (index === 0 && animValue?.value > length - 1) {
            inputRange = [length - 1, length, length + 1];
            outputRange = [-width, 0, width];
        }

        return {
            transform: [
                {
                    translateX: interpolate(
                        animValue?.value,
                        inputRange,
                        outputRange,
                        Extrapolate.CLAMP
                    ),
                },
            ],
        };
    }, [animValue, index, length]);

    return (
        <View
            style={{
                backgroundColor: '#c0c3d6',
                width,
                height: width,
                borderRadius: 50,
                overflow: 'hidden',
                transform: [
                    {
                        rotateZ: isRotate ? '90deg' : '0deg',
                    },
                ],
            }}
        >
            <Animated.View
                style={[
                    {
                        borderRadius: 50,
                        backgroundColor,
                        flex: 1,
                    },
                    animStyle,
                ]}
            />
        </View>
    );
};

export default ScrollImage;