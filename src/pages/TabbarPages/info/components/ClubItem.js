import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    useSharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { scale, moderateScale } from 'react-native-size-matters';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { clubTagMap } from '../../../../utils/clubMap';
import { trigger } from '../../../../utils/trigger';

// 獲取屏幕寬度用於計算項目寬度
import { Dimensions } from 'react-native';
const { width: screenWidth } = Dimensions.get('window');
const ITEM_WIDTH = (screenWidth - scale(48)) / 3;

/**
 * 社團列表項組件 - 液態玻璃卡片
 * @param {Object} props
 * @param {Object} props.data - 社團數據
 * @param {number} props.index - 項目索引
 */
const ClubItem = React.memo(({ data, index }) => {
    const navigation = useNavigation();
    const { theme, isLight } = useTheme();
    const { white, black, glass, themeColor } = theme;
    const { logo_url, name, tag } = data;

    const scaleAnim = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(scaleAnim.value, { damping: 15 }) }],
        opacity: withTiming(opacity.value, { duration: 200 }),
    }));

    const handleJumpToDetail = useCallback(() => {
        trigger();
        navigation.navigate('ClubDetail', { data });
    }, [navigation, data]);

    // 根據主題動態計算樣式
    const blurTint = isLight ? 'light' : 'dark';
    const borderColor = isLight ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)';
    const backgroundColor = isLight ? 'rgba(255, 255, 255, 0.25)' : 'rgba(30, 30, 30, 0.6)';
    const tagBgColor = isLight ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.15)';
    const tagTextColor = isLight ? '#64748b' : '#94a3b8';

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleJumpToDetail}
            onPressIn={() => {
                scaleAnim.value = 0.92;
                opacity.value = 0.8;
            }}
            onPressOut={() => {
                scaleAnim.value = 1;
                opacity.value = 1;
            }}
            style={{ width: ITEM_WIDTH, marginBottom: scale(16) }}
        >
            <Animated.View style={animatedStyle}>
                <BlurView
                    intensity={50}
                    tint={blurTint}
                    style={[
                        styles.blurContainer,
                        {
                            borderColor,
                            backgroundColor,
                        },
                    ]}
                >
                    <View style={styles.contentContainer}>
                        {/* 社團 Logo */}
                        <View
                            style={[
                                styles.logoContainer,
                                {
                                    backgroundColor: white.main,
                                    shadowColor: black.main,
                                },
                            ]}
                        >
                            <Image
                                source={{ uri: logo_url }}
                                style={styles.logoImage}
                                contentFit="contain"
                                transition={200}
                                placeholder={{
                                    uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                                }}
                            />
                        </View>

                        {/* 社團名稱 */}
                        <Text
                            style={[
                                uiStyle.defaultText,
                                styles.clubName,
                                { color: black.main },
                            ]}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {name}
                        </Text>

                        {/* 分類標籤 */}
                        <View
                            style={[
                                styles.tagContainer,
                                { backgroundColor: tagBgColor },
                            ]}
                        >
                            <Text
                                style={[
                                    uiStyle.defaultText,
                                    styles.tagText,
                                    { color: tagTextColor },
                                ]}
                            >
                                {clubTagMap(tag)}
                            </Text>
                        </View>
                    </View>
                </BlurView>
            </Animated.View>
        </TouchableOpacity>
    );
}, (prev, next) => prev.data?._id === next.data?._id);

const styles = StyleSheet.create({
    blurContainer: {
        borderRadius: scale(16),
        overflow: 'hidden',
        borderWidth: 1,
    },
    contentContainer: {
        padding: scale(12),
        alignItems: 'center',
        gap: scale(8),
    },
    logoContainer: {
        width: scale(56),
        height: scale(56),
        borderRadius: scale(28),
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: scale(4) },
        shadowOpacity: 0.1,
        shadowRadius: scale(8),
        elevation: 4,
    },
    logoImage: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(22),
    },
    clubName: {
        fontSize: moderateScale(11),
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: moderateScale(14),
    },
    tagContainer: {
        paddingHorizontal: scale(8),
        paddingVertical: scale(3),
        borderRadius: scale(8),
    },
    tagText: {
        fontSize: moderateScale(9),
        fontWeight: '600',
    },
});

export default ClubItem;