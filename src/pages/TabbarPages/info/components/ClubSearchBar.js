import React, { memo, useCallback, useRef } from 'react';
import {
    View,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Text from '../../../../components/AppText';
import TextInput from '../../../../components/AppTextInput';
import searchFieldStyles, {
    SEARCH_FIELD_BORDER_RADIUS,
    SEARCH_FIELD_CLEAR_ICON_SIZE,
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
} from '../../../../components/searchFieldStyles';
import { useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import { scale, verticalScale } from 'react-native-size-matters';
import TouchableScale from '../../../../components/TouchableScale';

const TIMING_MS = 220;

/**
 * 組織頁頂部搜尋列：以 Reanimated 實作 iOS 風「取消」滑入與輸入區讓位。
 * （@rneui/base 的 iOS SearchBar 依賴 RN LayoutAnimation，在 Reanimated + 新架構下常無過渡。）
 */
function ClubSearchBar({
    value,
    onChangeText,
    loading = false,
    onCancel,
    onFocus,
    containerStyle,
    placeholder,
    cancelLabel,
    clearAccessibilityLabel,
}) {
    const { t } = useTranslation(['club']);
    const { theme } = useTheme();
    const { themeColor, black, white, isLight } = theme;
    const inputRef = useRef(null);

    const focused = useSharedValue(0);
    const cancelW = useSharedValue(0);

    /** 對齊 iOS UISearchBar 常見底色（ThemeContext 無對應語義 token） */
    const searchFieldBg = isLight ? '#E5E5EA' : '#3A3A3C';

    const inputOuterAnimated = useAnimatedStyle(() => ({
        marginRight: withTiming(focused.value * cancelW.value, { duration: TIMING_MS }),
    }));

    const cancelAnimated = useAnimatedStyle(() => ({
        opacity: cancelW.value > 1 ? 1 : 0,
        transform: [
            {
                translateX: withTiming((1 - focused.value) * cancelW.value, {
                    duration: TIMING_MS,
                }),
            },
        ],
    }));

    const handleFocus = useCallback(() => {
        focused.value = 1;
        onFocus?.();
    }, [focused, onFocus]);

    const handleCancel = useCallback(() => {
        trigger();
        inputRef.current?.blur();
        focused.value = 0;
        onChangeText('');
        onCancel?.();
    }, [focused, onChangeText, onCancel]);

    const handleClear = useCallback(() => {
        trigger();
        onChangeText('');
    }, [onChangeText]);

    return (
        <View style={[styles.outer, containerStyle]}>
            <View style={styles.row}>
                <Animated.View style={[styles.inputOuter, inputOuterAnimated]}>
                    <View style={[searchFieldStyles.field, styles.pill, { backgroundColor: searchFieldBg }]}>
                        <Ionicons name="search" size={SEARCH_FIELD_ICON_SIZE} color={black.third} />
                        <TextInput
                            ref={inputRef}
                            value={value}
                            onChangeText={onChangeText}
                            onFocus={handleFocus}
                            placeholder={placeholder ?? t('club:SEARCH_PLACEHOLDER')}
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
                        {loading ? (
                            <ActivityIndicator
                                size="small"
                                color={themeColor}
                                style={styles.loading}
                            />
                        ) : null}
                        {value.length > 0 ? (
                            <TouchableScale
                                onPress={handleClear}
                                hitSlop={scale(8)}
                                accessibilityRole="button"
                                accessibilityLabel={clearAccessibilityLabel ?? t('club:A11Y_CLEAR_SEARCH')}
                                style={searchFieldStyles.clearButton}
                            >
                                <Ionicons
                                    name="close-circle"
                                    size={SEARCH_FIELD_CLEAR_ICON_SIZE}
                                    color={black.third}
                                />
                            </TouchableScale>
                        ) : null}
                    </View>
                </Animated.View>

                <Animated.View
                    style={[styles.cancelWrap, cancelAnimated]}
                    onLayout={(e) => {
                        const w = e.nativeEvent.layout.width;
                        if (w > 0) {
                            cancelW.value = w;
                        }
                    }}
                >
                    <TouchableScale
                        onPress={handleCancel}
                        accessibilityRole="button"
                        hitSlop={scale(6)}
                        style={[styles.cancelButton, { backgroundColor: white }]}
                    >
                        <Text style={[styles.cancelText, { color: themeColor }]}>
                            {cancelLabel ?? t('club:CANCEL')}
                        </Text>
                    </TouchableScale>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: {
        width: '100%',
        paddingTop: scale(8),
        paddingBottom: scale(8),
        paddingLeft: scale(8),
        paddingRight: scale(14),
        overflow: 'hidden',
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
    pill: {
        marginLeft: scale(4),
        marginRight: scale(4),
    },
    loading: {
        marginRight: scale(4),
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
        borderRadius: SEARCH_FIELD_BORDER_RADIUS,
        paddingHorizontal: scale(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelText: {
        fontSize: verticalScale(14),
        textAlign: 'center',
    },
});

export default memo(ClubSearchBar);
