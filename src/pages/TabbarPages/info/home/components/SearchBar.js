import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { scale, verticalScale } from 'react-native-size-matters';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';

import { useTheme, uiStyle } from '../../../../../components/ThemeContext';
import { logToFirebase } from '../../../../../utils/firebaseAnalytics';
import { trigger } from '../../../../../utils/trigger';

const PLACEHOLDER_TEXTS = [
    '關於澳大的一切...',
    '校曆',
    '校園巴士',
    '圖書館',
    '打印餘額',
    '失物認領',
];

const SearchBar = ({
    navigation,
    // 允許服務頁等入口覆寫事件名，預設維持首頁
    entryFuncName = 'home_search_entry',
    style,
}) => {
    const { theme } = useTheme();
    const { black, white } = theme;
    const { t } = useTranslation(['common', 'features']);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const interval = setInterval(() => {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setPlaceholderIndex(
                    previous => (previous + 1) % PLACEHOLDER_TEXTS.length,
                );
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [fadeAnim]);

    const handlePress = () => {
        trigger();
        logToFirebase('funcUse', { funcName: entryFuncName });
        navigation.navigate('Search');
    };

    return (
        <View style={[styles.root, style]}>
            <Pressable
                onPress={handlePress}
                accessibilityRole="button"
                accessibilityLabel={t('搜索', { ns: 'common' })}
                style={({ pressed }) => [
                    styles.inputWrapper,
                    { backgroundColor: white },
                    pressed && styles.pressed,
                ]}>
                <Ionicons
                    name="search"
                    size={scale(15)}
                    color={black.third}
                    style={styles.icon}
                />
                <Animated.View
                    style={[styles.placeholder, { opacity: fadeAnim }]}
                    pointerEvents="none">
                    <Text
                        numberOfLines={1}
                        style={[
                            uiStyle.defaultText,
                            styles.placeholderText,
                            { color: black.third },
                        ]}>
                        {t('搜索', { ns: 'common' })}:{' '}
                        {t(PLACEHOLDER_TEXTS[placeholderIndex], {
                            ns: 'features',
                        })}
                    </Text>
                </Animated.View>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    // 與舊版一致：固定寬度長條，由首頁 ScrollView 置中
    root: {
        zIndex: 100,
        width: scale(310),
        marginTop: verticalScale(10),
        height: verticalScale(30),
        paddingHorizontal: verticalScale(10),
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: verticalScale(8),
    },
    pressed: {
        opacity: 0.85,
    },
    icon: {
        marginLeft: scale(8),
        marginRight: scale(6),
        opacity: 0.7,
    },
    placeholder: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
        paddingRight: scale(8),
    },
    placeholderText: {
        fontSize: verticalScale(13),
        opacity: 0.7,
    },
});

export default SearchBar;
