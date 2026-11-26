import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { scale, verticalScale } from 'react-native-size-matters';
import Ionicons from "@react-native-vector-icons/ionicons";
import { useTranslation } from 'react-i18next';

import Text from '../../../../../components/AppText';
import searchFieldStyles, {
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
} from '../../../../../components/searchFieldStyles';
import { useTheme } from '../../../../../components/ThemeContext';
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
                    searchFieldStyles.field,
                    styles.inputWrapper,
                    { backgroundColor: white },
                    pressed && styles.pressed,
                ]}>
                <Ionicons
                    name="search"
                    size={SEARCH_FIELD_ICON_SIZE}
                    color={black.third}
                    style={styles.icon}
                />
                <Animated.View
                    style={[styles.placeholder, { opacity: fadeAnim }]}
                    pointerEvents="none">
                    <Text
                        numberOfLines={1}
                        maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                        style={[
                            searchFieldStyles.typography,
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
    // 與校曆左右邊距對齊，橫向佔滿可用寬度
    root: {
        zIndex: 100,
        width: '100%',
        marginTop: verticalScale(10),
        paddingHorizontal: scale(20),
    },
    inputWrapper: {
        width: '100%',
    },
    pressed: {
        opacity: 0.85,
    },
    icon: {
        opacity: 0.7,
    },
    placeholder: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    placeholderText: {
        opacity: 0.7,
    },
});

export default SearchBar;
