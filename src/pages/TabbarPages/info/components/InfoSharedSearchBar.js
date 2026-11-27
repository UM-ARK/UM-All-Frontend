import React, {
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import {
    Animated as RNAnimated,
    StyleSheet,
    View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import Animated, {
    useAnimatedStyle,
    useDerivedValue,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../../components/AppText';
import TextInput from '../../../../components/AppTextInput';
import ScalePressable from '../../../../components/ScalePressable';
import TouchableScale from '../../../../components/TouchableScale';
import searchFieldStyles, {
    SEARCH_FIELD_CLEAR_ICON_SIZE,
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
    SEARCH_FIELD_MIN_HEIGHT,
} from '../../../../components/searchFieldStyles';
import { useTheme } from '../../../../components/ThemeContext';
import { useAppReducedMotion } from '../../../../contexts/ReducedMotionContext';
import { trigger } from '../../../../utils/trigger';

const TIMING_MS = 220;
const PLACEHOLDER_ROTATE_MS = 4000;
const PLACEHOLDER_TEXTS = [
    '關於澳大的一切...',
    '校曆',
    '校園巴士',
    '圖書館',
    '打印餘額',
    '失物認領',
];

/**
 * 資訊頁頂部共用搜尋列（Android／非原生搜尋列回退方案，無 GlassView）：
 * - 推薦分頁（mode="navigate"）：點按跳轉至全校搜尋頁，維持輪播提示文案；
 * - 組織／活動／新聞分頁（mode="input"）：同外殼原地篩選，附清除與滑入式取消鍵。
 */
const InfoSharedSearchBar = forwardRef(function InfoSharedSearchBar({
    mode = 'input',
    value = '',
    onChangeText,
    onCancel,
    onFocus,
    onNavigatePress,
    placeholder,
    cancelLabel,
    clearAccessibilityLabel,
    containerStyle,
}, ref) {
    const { t } = useTranslation(['common', 'features']);
    const { theme } = useTheme();
    const { themeColor, accentForeground, black, white, viewShadow } = theme;
    const reducedMotion = useAppReducedMotion();
    const inputRef = useRef(null);

    const [searchActive, setSearchActive] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const fadeAnim = useRef(new RNAnimated.Value(1)).current;

    const cancelW = useSharedValue(0);
    const cancelProgress = useDerivedValue(() => {
        const target = mode === 'input' && searchActive && cancelW.value > 0 ? 1 : 0;
        return reducedMotion ? target : withTiming(target, { duration: TIMING_MS });
    });

    useImperativeHandle(
        ref,
        () => ({
            blur: () => {
                inputRef.current?.blur();
                setSearchActive(false);
            },
        }),
        [],
    );

    useEffect(() => {
        if (mode === 'navigate') {
            inputRef.current?.blur();
            setSearchActive(false);
        }
    }, [mode]);

    useEffect(() => {
        if (mode !== 'navigate' || reducedMotion) {
            fadeAnim.setValue(1);
            return undefined;
        }
        const interval = setInterval(() => {
            RNAnimated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setPlaceholderIndex(
                    previous => (previous + 1) % PLACEHOLDER_TEXTS.length,
                );
                RNAnimated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }).start();
            });
        }, PLACEHOLDER_ROTATE_MS);

        return () => clearInterval(interval);
    }, [fadeAnim, mode, reducedMotion]);

    const inputOuterAnimated = useAnimatedStyle(() => ({
        marginRight: cancelProgress.value * cancelW.value,
    }));

    const cancelAnimated = useAnimatedStyle(() => ({
        opacity: cancelProgress.value,
        transform: [{ translateX: (1 - cancelProgress.value) * cancelW.value }],
    }));

    const handleFocus = useCallback(() => {
        setSearchActive(true);
        onFocus?.();
    }, [onFocus]);

    const handleCancel = useCallback(() => {
        trigger();
        inputRef.current?.blur();
        setSearchActive(false);
        onChangeText?.('');
        onCancel?.();
    }, [onCancel, onChangeText]);

    const handleClear = useCallback(() => {
        trigger();
        onChangeText?.('');
    }, [onChangeText]);

    const handleNavigatePress = useCallback(() => {
        trigger();
        onNavigatePress?.();
    }, [onNavigatePress]);

    const isNavigateMode = mode === 'navigate';

    return (
        <View style={[styles.outer, containerStyle]}>
            <View style={styles.row}>
                <Animated.View style={[styles.inputOuter, inputOuterAnimated]}>
                    <View
                        style={[
                            styles.shadowWrap,
                            viewShadow,
                        ]}>
                        {isNavigateMode ? (
                            <ScalePressable
                                onPress={handleNavigatePress}
                                accessibilityRole="button"
                                accessibilityLabel={t('搜索', { ns: 'common' })}
                                style={[
                                    searchFieldStyles.field,
                                    styles.pillField,
                                    { backgroundColor: white },
                                ]}>
                                <Ionicons
                                    name="search"
                                    size={SEARCH_FIELD_ICON_SIZE}
                                    color={black.third}
                                />
                                <RNAnimated.View
                                    style={[styles.placeholderWrap, { opacity: fadeAnim }]}
                                    pointerEvents="none">
                                    <Text
                                        numberOfLines={1}
                                        maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                                        style={[
                                            searchFieldStyles.typography,
                                            { color: black.third },
                                        ]}>
                                        {t('搜索', { ns: 'common' })}:{' '}
                                        {t(PLACEHOLDER_TEXTS[placeholderIndex], {
                                            ns: 'features',
                                        })}
                                    </Text>
                                </RNAnimated.View>
                            </ScalePressable>
                        ) : (
                            <View
                                style={[
                                    searchFieldStyles.field,
                                    styles.pillField,
                                    { backgroundColor: white },
                                ]}>
                                <Ionicons
                                    name="search"
                                    size={SEARCH_FIELD_ICON_SIZE}
                                    color={black.third}
                                />
                                <TextInput
                                    ref={inputRef}
                                    value={value}
                                    onChangeText={onChangeText}
                                    onFocus={handleFocus}
                                    placeholder={placeholder}
                                    placeholderTextColor={black.third}
                                    maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                                    style={[
                                        searchFieldStyles.text,
                                        searchFieldStyles.input,
                                        { color: black.main },
                                    ]}
                                    selectionColor={themeColor}
                                    returnKeyType="search"
                                    clearButtonMode="never"
                                />
                                {value.length > 0 ? (
                                    <TouchableScale
                                        onPress={handleClear}
                                        hitSlop={scale(8)}
                                        accessibilityRole="button"
                                        accessibilityLabel={clearAccessibilityLabel ?? t('清除搜尋', { ns: 'common' })}
                                        style={searchFieldStyles.clearButton}>
                                        <Ionicons
                                            name="close-circle"
                                            size={SEARCH_FIELD_CLEAR_ICON_SIZE}
                                            color={black.third}
                                        />
                                    </TouchableScale>
                                ) : null}
                            </View>
                        )}
                    </View>
                </Animated.View>

                <Animated.View
                    style={[styles.cancelWrap, cancelAnimated]}
                    pointerEvents={!isNavigateMode && searchActive ? 'auto' : 'none'}
                    accessibilityElementsHidden={isNavigateMode || !searchActive}
                    importantForAccessibility={!isNavigateMode && searchActive ? 'auto' : 'no-hide-descendants'}
                    onLayout={e => {
                        const w = e.nativeEvent.layout.width;
                        if (w > 0) {
                            cancelW.value = w;
                        }
                    }}>
                    <ScalePressable
                        onPress={handleCancel}
                        disabled={isNavigateMode || !searchActive}
                        accessibilityRole="button"
                        hitSlop={scale(6)}
                        style={styles.cancelButton}>
                        <Text style={[styles.cancelText, { color: accentForeground }]}>
                            {cancelLabel ?? t('取消', { ns: 'common' })}
                        </Text>
                    </ScalePressable>
                </Animated.View>
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    outer: {
        width: '100%',
        paddingTop: verticalScale(6),
        paddingBottom: verticalScale(6),
        overflow: 'visible',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
    },
    inputOuter: {
        flex: 1,
        minWidth: 0,
    },
    shadowWrap: {
        borderRadius: SEARCH_FIELD_MIN_HEIGHT / 2,
    },
    pillField: {
        borderRadius: SEARCH_FIELD_MIN_HEIGHT / 2,
        paddingHorizontal: 14,
    },
    placeholderWrap: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    cancelWrap: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        justifyContent: 'center',
        paddingLeft: scale(4),
    },
    cancelButton: {
        height: '100%',
        paddingHorizontal: scale(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: verticalScale(14),
        textAlign: 'center',
    },
});

export default memo(InfoSharedSearchBar);
