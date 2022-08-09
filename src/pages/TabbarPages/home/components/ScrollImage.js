import React, {useRef, useState} from 'react';
import {
    View,
    Dimensions,
    Text,
    Image,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';

import {pxToDp, pcHeightToNumHeight} from '../../../../utils/stylesKits';
import {COLOR_DIY} from '../../../../utils/uiMap';
import BlurViewWrapper from '../../../../components/BlurViewWrapper';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';

import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import Carousel from 'react-native-reanimated-carousel';
import {TouchableWithoutFeedback} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import FastImage from 'react-native-fast-image';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');

let colors = [COLOR_DIY.themeColor];

const {white, bg_color, black, viewShadow} = COLOR_DIY;

function ScrollImage(props) {
    const progressValue = useSharedValue(0);
    const {imageData} = props;
    const imageScrollViewerRef = useRef(null);
    const [imgLoading, SetImgLoading] = useState(true);

    // 以接收的圖像數據，調整圓點數量
    let numDiff = imageData.length - colors.length;
    if (numDiff > 0) {
        for (let i = 0; i < numDiff; i++) {
            colors.push(COLOR_DIY.themeColor);
        }
    } else if (numDiff < 0) {
        for (let i = 0; i < numDiff; i++) {
            colors.pop(COLOR_DIY.themeColor);
        }
    }

    // 點擊圖片事件
    function handleOnClickImage(item, index) {
        imageScrollViewerRef.current.handleOpenImage(index);
    }

    // 輪播圖渲染
    return (
        <View
            style={{
                alignItems: 'center',
                width: PAGE_WIDTH,
                marginVertical: pxToDp(-10),
            }}>
            {/* 輪播圖組件 */}
            <Carousel
                vertical={false}
                width={PAGE_WIDTH}
                height={pcHeightToNumHeight('45%', PAGE_HEIGHT)}
                loop
                autoPlay={true}
                autoPlayInterval={3000}
                onProgressChange={(_, absoluteProgress) =>
                    (progressValue.value = absoluteProgress)
                }
                mode="parallax"
                modeConfig={{
                    // parallaxScrollingScale: 0.79,
                    // parallaxScrollingOffset: 100,
                    parallaxScrollingScale: 0.9,
                    parallaxScrollingOffset: 30,
                }}
                data={imageData}
                renderItem={({item, index}) => (
                    <View style={{flex: 1}}>
                        {/* 圖片展示 */}
                        <TouchableWithoutFeedback
                            style={{
                                borderRadius: pxToDp(10),
                                overflow: 'hidden',
                                width: '100%',
                                height: '100%',
                                ...viewShadow,
                            }}
                            onPress={() => handleOnClickImage(item, index)}>
                            {false && (
                                <View style={{width: '100%', height: '100%'}}>
                                    <FastImage
                                        resizeMode={FastImage.resizeMode.cover}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                        }}
                                        source={{
                                            uri: item.uri,
                                            cache: FastImage.cacheControl.web,
                                        }}>
                                        {/* 1.2 圖片附文字說明展示 開始 */}
                                        <LinearGradient
                                            start={{x: 0, y: 0}}
                                            end={{x: 0, y: 0.8}}
                                            colors={[
                                                'rgba(255, 255, 255, 0)',
                                                'rgba(0,0,0,0.7)',
                                            ]}
                                            style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                height: '15%',
                                                width: '100%',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}>
                                            <Text
                                                style={{
                                                    fontSize: pxToDp(14),
                                                    color: COLOR_DIY.white,
                                                }}>
                                                {item.title}
                                            </Text>
                                        </LinearGradient>
                                    </FastImage>
                                </View>
                            )}
                            <FastImage
                                source={{
                                    uri: item.url.replace('http:', 'https:'),
                                    cache: FastImage.cacheControl.web,
                                }}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: COLOR_DIY.white,
                                }}
                                resizeMode={FastImage.resizeMode.cover}
                                onLoadStart={() => {
                                    SetImgLoading(true);
                                }}
                                onLoad={() => {
                                    SetImgLoading(false);
                                }}
                            />
                            {imgLoading ? (
                                <ActivityIndicator
                                    size={'large'}
                                    color={COLOR_DIY.white}
                                    style={{
                                        alignSelf: 'center',
                                        justifyContent: 'center',
                                        position: 'absolute',
                                    }}
                                />
                            ) : null}
                        </TouchableWithoutFeedback>
                    </View>
                )}
            />

            {/* 彈出層展示圖片查看器 */}
            <ImageScrollViewer
                ref={imageScrollViewerRef}
                imageUrls={imageData}
            />

            {/* 圓點下標標識 */}
            {false && (
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        width: pxToDp(100),
                        alignSelf: 'center',
                        marginTop: -pxToDp(10),
                    }}>
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
            )}
        </View>
    );
}

// 圓點渲染
const PaginationItem: React.FC<{
    index: number,
    backgroundColor: string,
    length: number,
    animValue: Animated.SharedValue,
    isRotate?: boolean,
}> = props => {
    const {animValue, index, length, backgroundColor, isRotate} = props;
    let width = length - 6 ? 10 - length + 6 : 10;

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
                        Extrapolate.CLAMP,
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
            }}>
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

const styles = StyleSheet.create({
    topNewsContainer: {
        borderRadius: pxToDp(10),
        overflow: 'hidden',
        marginHorizontal: pxToDp(10),
        marginVertical: pxToDp(5),
        height: pxToDp(200),
        backgroundColor: white,
        ...viewShadow,
    },
    topNewsOverlay: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: pxToDp(15),
        justifyContent: 'flex-end',
    },
    topNewsPosition: {
        position: 'absolute',
        top: pxToDp(10),
        left: pxToDp(15),
    },
    topNewsText: {
        color: white,
        fontWeight: 'bold',
        fontSize: pxToDp(20),
    },
});

export default ScrollImage;
