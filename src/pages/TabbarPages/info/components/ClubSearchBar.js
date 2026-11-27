import React, { memo, useCallback, useRef, useState } from 'react';
import {
    View,
    ActivityIndicator,
    StyleSheet,
} from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useDerivedValue,
    withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import Text from '../../../../components/AppText';
import TextInput from '../../../../components/AppTextInput';
import SearchFieldContainer from '../../../../components/SearchFieldContainer';
import searchFieldStyles, {
    SEARCH_FIELD_CLEAR_ICON_SIZE,
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
} from '../../../../components/searchFieldStyles';
import { useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import { scale, verticalScale } from 'react-native-size-matters';
import TouchableScale from '../../../../components/TouchableScale';
import ScalePressable from '../../../../components/ScalePressable';
import { useAppReducedMotion } from '../../../../contexts/ReducedMotionContext';

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
    liquidGlass = false,
}) {
    const { t } = useTranslation(['club']);
    const { theme } = useTheme();
    const { themeColor, accentForeground, black, isLight } = theme;
    const reducedMotion = useAppReducedMotion();
    const inputRef = useRef(null);

    const [searchActive, setSearchActive] = useState(false);
    const cancelW = useSharedValue(0);
    const cancelProgress = useDerivedValue(() => {
        const target = searchActive && cancelW.value > 0 ? 1 : 0;
        return reducedMotion ? target : withTiming(target, { duration: TIMING_MS });
    });

    /** 對齊 iOS UISearchBar 常見底色（ThemeContext 無對應語義 token） */
    const searchFieldBg = isLight ? '#E5E5EA' : '#3A3A3C';

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
        onChangeText('');
        onCancel?.();
    }, [onChangeText, onCancel]);

    const handleClear = useCallback(() => {
        trigger();
        onChangeText('');
    }, [onChangeText]);

    return (
        <View style={[styles.outer, containerStyle]}>
            <View style={styles.row}>
                <Animated.View style={[styles.inputOuter, inputOuterAnimated]}>
                    <SearchFieldContainer
                        liquidGlass={liquidGlass}
                        containerStyle={styles.pill}
                        fieldStyle={{ backgroundColor: searchFieldBg }}>
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
                    </SearchFieldContainer>
                </Animated.View>

                <Animated.View
                    style={[styles.cancelWrap, cancelAnimated]}
                    pointerEvents={searchActive ? 'auto' : 'none'}
                    accessibilityElementsHidden={!searchActive}
                    importantForAccessibility={searchActive ? 'auto' : 'no-hide-descendants'}
                    onLayout={(e) => {
                        const w = e.nativeEvent.layout.width;
                        if (w > 0) {
                            cancelW.value = w;
                        }
                    }}
                >
                    <ScalePressable
                        onPress={handleCancel}
                        disabled={!searchActive}
                        accessibilityRole="button"
                        hitSlop={scale(6)}
                        style={styles.cancelButton}
                    >
                        <Text style={[styles.cancelText, { color: accentForeground }]}>
                            {cancelLabel ?? t('club:CANCEL')}
                        </Text>
                    </ScalePressable>
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
        paddingHorizontal: scale(8),
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
        width: 'auto',
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
