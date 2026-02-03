import React from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from './ThemeContext';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

const HERO_HEIGHT = verticalScale(420);

/**
 * Hero區域組件
 * 包含視差滾動效果的海報圖片
 */
const HeroSection = React.memo(
    ({
        imageUrl,
        scrollY,
        onImagePress,
        imgLoading,
        setImgLoading,
        title,
        themeColor,
    }) => {
        const { theme } = useTheme();
        const { white } = theme;

        // 視差動畫樣式
        const parallaxStyle = useAnimatedStyle(() => {
            const translateY = interpolate(
                scrollY.value,
                [0, HERO_HEIGHT],
                [0, HERO_HEIGHT * 0.4],
                Extrapolation.CLAMP,
            );
            const scale = interpolate(
                scrollY.value,
                [0, HERO_HEIGHT],
                [1, 1.15],
                Extrapolation.CLAMP,
            );
            return {
                transform: [{ translateY }, { scale }],
            };
        });

        // 標題淡入動畫
        const titleStyle = useAnimatedStyle(() => {
            const opacity = interpolate(
                scrollY.value,
                [0, HERO_HEIGHT * 0.5, HERO_HEIGHT * 0.8],
                [1, 0.8, 0],
                Extrapolation.CLAMP,
            );
            const translateY = interpolate(
                scrollY.value,
                [0, HERO_HEIGHT * 0.5],
                [0, -30],
                Extrapolation.CLAMP,
            );
            return {
                opacity,
                transform: [{ translateY }],
            };
        });

        return (
            <View style={[staticStyles.heroContainer, { height: HERO_HEIGHT }]}>
                <Animated.View style={[staticStyles.heroImageWrapper, parallaxStyle]}>
                    <Pressable onPress={onImagePress} style={staticStyles.heroPressable}>
                        <Image
                            source={imageUrl}
                            style={staticStyles.heroImage}
                            contentFit="cover"
                            onLoadStart={() => setImgLoading(true)}
                            onLoad={() => setImgLoading(false)}
                            transition={500}
                        />
                        {imgLoading && (
                            <View style={staticStyles.heroLoadingOverlay}>
                                <ActivityIndicator size="large" color={themeColor} />
                            </View>
                        )}
                    </Pressable>
                </Animated.View>

                {/* 漸變遮罩 */}
                <View style={staticStyles.heroGradientOverlay} />

                {/* 浮動標題 */}
                {title && (
                    <Animated.View style={[staticStyles.heroTitleContainer, titleStyle]}>
                        <BlurView intensity={40} tint="dark" style={staticStyles.heroTitleBlur}>
                            <Text style={[staticStyles.heroTitle, { color: white }]} numberOfLines={2}>
                                {title}
                            </Text>
                        </BlurView>
                    </Animated.View>
                )}
            </View>
        );
    },
);

const staticStyles = StyleSheet.create({
    heroContainer: {
        position: 'relative',
        overflow: 'hidden',
    },
    heroImageWrapper: {
        ...StyleSheet.absoluteFillObject,
    },
    heroPressable: {
        width: '100%',
        height: '100%',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroGradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    heroTitleContainer: {
        position: 'absolute',
        bottom: verticalScale(30),
        left: scale(20),
        right: scale(20),
    },
    heroTitleBlur: {
        borderRadius: scale(16),
        padding: scale(16),
        overflow: 'hidden',
    },
    heroTitle: {
        fontSize: moderateScale(22),
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
});

export default HeroSection;
