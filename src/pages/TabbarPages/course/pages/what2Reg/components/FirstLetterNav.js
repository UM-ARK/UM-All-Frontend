import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { scale, verticalScale } from 'react-native-size-matters';
import Text from '../../../../../../components/AppText';
import { uiStyle } from '../../../../../../components/ThemeContext';
import { GlassView, isLiquidGlassSupported } from '../../../../../../utils/glassEffect';

const FirstLetterNavContainer = isLiquidGlassSupported ? GlassView : View;

const SIDE_MARGIN = scale(8);
const EDGE_MARGIN = verticalScale(8);
const NAV_SPRING = {
    stiffness: 200,
    damping: 25,
    mass: 0.5,
    overshootClamping: true,
};

/**
 * 側邊首字母快速導航
 *
 * 預設貼右並垂直置中；可上下拖動，放手後吸附到上／中／下，
 * 避免蓋住篩選區或課程卡時無法移開。
 *
 * @param {string[]} firstLetterList 可見課程代碼首字母
 * @param {Object} scrollData 字母 → 滾動偏移（呼叫端使用，元件本身不讀）
 * @param {Object} theme 主題色
 * @param {Function} onScrollTo 點字母後滾到對應課程
 * @param {number} [topInset=0] 頂部浮層佔用高度（搜尋列等）
 * @param {number} [bottom=0] 底部浮層佔用高度（Tab Bar 等）
 */
const FirstLetterNav = ({
    firstLetterList,
    scrollData,
    theme,
    onScrollTo,
    topInset = 0,
    bottom = 0,
}) => {
    const translateY = useSharedValue(0);
    const startY = useSharedValue(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [navHeight, setNavHeight] = useState(0);

    const minY = topInset + EDGE_MARGIN;
    const maxY = Math.max(
        minY,
        containerHeight - bottom - navHeight - EDGE_MARGIN,
    );
    // 尚未量到尺寸時先靠可用區頂部，量完後置中
    const baseTop = containerHeight > 0 && navHeight > 0
        ? (minY + maxY) / 2
        : minY;
    const maxUpOffset = Math.max(0, baseTop - minY);
    const maxDownOffset = Math.max(0, maxY - baseTop);

    // 可用範圍變更時，把目前偏移夾回合法區間
    useEffect(() => {
        translateY.value = Math.max(
            -maxUpOffset,
            Math.min(maxDownOffset, translateY.value),
        );
    }, [maxDownOffset, maxUpOffset, translateY]);

    const panGesture = useMemo(
        () =>
            Gesture.Pan()
                // 小位移先當點字母，超過門檻才進入拖動
                .minDistance(scale(8))
                .onStart(() => {
                    startY.value = translateY.value;
                })
                .onUpdate(event => {
                    translateY.value = Math.max(
                        -maxUpOffset,
                        Math.min(maxDownOffset, startY.value + event.translationY),
                    );
                })
                .onEnd(() => {
                    const points = [-maxUpOffset, 0, maxDownOffset];
                    let nearest = points[0];
                    let nearestDistance = Infinity;
                    for (let i = 0; i < points.length; i++) {
                        const distance = Math.abs(translateY.value - points[i]);
                        if (distance < nearestDistance) {
                            nearestDistance = distance;
                            nearest = points[i];
                        }
                    }
                    translateY.value = withSpring(nearest, NAV_SPRING);
                }),
        [maxDownOffset, maxUpOffset, startY, translateY],
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    if ((firstLetterList || []).length <= 1) {
        return null;
    }

    const borderRadius = scale(8);

    return (
        <View
            pointerEvents="box-none"
            style={StyleSheet.absoluteFill}
            onLayout={event => {
                setContainerHeight(event.nativeEvent.layout.height);
            }}
        >
            <GestureDetector gesture={panGesture}>
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            right: SIDE_MARGIN,
                            top: baseTop,
                            borderRadius,
                            ...(isLiquidGlassSupported ? theme.viewShadow : {}),
                        },
                        animatedStyle,
                    ]}
                    onLayout={event => {
                        setNavHeight(event.nativeEvent.layout.height);
                    }}
                >
                    <FirstLetterNavContainer style={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius,
                        padding: scale(3),
                        ...(isLiquidGlassSupported ? {
                            overflow: 'hidden',
                        } : {
                            backgroundColor: theme.white,
                            ...theme.floatingShadow,
                        }),
                    }}>
                        {firstLetterList.map(letter => (
                            <Pressable
                                key={letter}
                                style={{ padding: scale(3) }}
                                onPress={() => onScrollTo(letter)}
                            >
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(15),
                                    color: theme.black.third,
                                }}>
                                    {letter}
                                </Text>
                            </Pressable>
                        ))}
                    </FirstLetterNavContainer>
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

export default FirstLetterNav;
