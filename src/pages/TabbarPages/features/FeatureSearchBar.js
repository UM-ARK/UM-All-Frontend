import { Pressable, StyleSheet, View } from 'react-native';
import React, { useState } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../components/AppText';
import TextInput from '../../../components/AppTextInput';
import { useTheme, uiStyle } from '../../../components/ThemeContext';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { trigger } from '../../../utils/trigger';
import { WIDE_CONTENT_MAX_WIDTH } from '../../../utils/windowSizeClass';

export default function FeatureSearchBar({
    inputRef,
    query,
    onChangeQuery,
    onWebSearch,
    hasQuery,
    matchCount,
}) {
    const { theme } = useTheme();
    const { black, themeColor, white } = theme;
    const { t } = useTranslation(['features', 'common', 'home']);
    const [isFocused, setIsFocused] = useState(false);
    const searchLabel = t('搜尋服務');

    return (
        <View style={styles.root}>
            <View style={[
                styles.field,
                { backgroundColor: white, borderColor: isFocused ? themeColor : white },
            ]}>
                <TextInput
                    ref={inputRef}
                    value={query}
                    onChangeText={onChangeQuery}
                    onFocus={() => {
                        setIsFocused(true);
                        trigger();
                        logToFirebase('funcUse', { funcName: 'features_search_entry' });
                    }}
                    onBlur={() => setIsFocused(false)}
                    placeholder={searchLabel}
                    placeholderTextColor={black.third}
                    selectionColor={themeColor}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                    accessibilityLabel={searchLabel}
                    style={[uiStyle.defaultText, styles.input, { color: black.main }]}
                />
                <View pointerEvents="none" style={styles.searchIcon}>
                    <Ionicons name="search" size={scale(15)} color={isFocused ? themeColor : black.third} />
                </View>
                {query.length > 0 ? (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('清除搜尋', { ns: 'common' })}
                        onPress={() => {
                            trigger();
                            onChangeQuery('');
                        }}
                        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
                        <Ionicons name="close-circle" size={scale(16)} color={black.third} />
                    </Pressable>
                ) : null}
            </View>
            {hasQuery ? (
                <View style={styles.statusRow}>
                    <Text
                        accessibilityLiveRegion="polite"
                        style={[uiStyle.defaultText, styles.status, { color: black.second }]}>
                        {matchCount > 0
                            ? t('找到 {{total}} 項服務', { total: matchCount })
                            : t('沒有找到相關服務', { ns: 'home' })}
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        onPress={onWebSearch}
                        style={({ pressed }) => [styles.button, styles.webSearch, pressed && styles.pressed]}>
                        <Ionicons name="globe-outline" size={scale(15)} color={themeColor} />
                        <Text style={[uiStyle.defaultText, styles.webSearchLabel, { color: themeColor }]}>
                            {t('網絡搜索')}
                        </Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        width: '100%',
        maxWidth: WIDE_CONTENT_MAX_WIDTH,
        alignSelf: 'center',
        marginTop: verticalScale(10),
        paddingHorizontal: scale(10),
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: verticalScale(8),
    },
    input: {
        flex: 1,
        minWidth: 0,
        minHeight: 44,
        paddingLeft: scale(30),
        paddingRight: scale(8),
        fontSize: verticalScale(13),
    },
    searchIcon: {
        position: 'absolute',
        left: scale(8),
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
        paddingLeft: scale(8),
    },
    status: {
        flex: 1,
        fontSize: verticalScale(11),
    },
    button: {
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    webSearch: {
        flexDirection: 'row',
        gap: scale(5),
        paddingHorizontal: scale(8),
    },
    webSearchLabel: {
        fontSize: verticalScale(11),
        fontWeight: '600',
    },
    pressed: {
        opacity: 0.55,
    },
});
