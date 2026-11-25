import { StyleSheet, View } from 'react-native';
import React, { useState } from 'react';
import Ionicons from '@react-native-vector-icons/ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../components/AppText';
import TextInput from '../../../components/AppTextInput';
import ScalePressable from '../../../components/ScalePressable';
import searchFieldStyles, {
    SEARCH_FIELD_CLEAR_ICON_SIZE,
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
} from '../../../components/searchFieldStyles';
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
                searchFieldStyles.field,
                searchFieldStyles.borderedField,
                { backgroundColor: white, borderColor: isFocused ? themeColor : white },
            ]}>
                <Ionicons name="search" size={SEARCH_FIELD_ICON_SIZE} color={isFocused ? themeColor : black.third} />
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
                    maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                    accessibilityLabel={searchLabel}
                    style={[
                        searchFieldStyles.text,
                        searchFieldStyles.input,
                        searchFieldStyles.inputNoWebOutline,
                        { color: black.main },
                    ]}
                />
                {query.length > 0 ? (
                    <ScalePressable
                        accessibilityRole="button"
                        accessibilityLabel={t('清除搜尋', { ns: 'common' })}
                        onPress={() => {
                            trigger();
                            onChangeQuery('');
                        }}
                        style={[styles.button, styles.clearButton]}>
                        <Ionicons name="close-circle" size={SEARCH_FIELD_CLEAR_ICON_SIZE} color={black.third} />
                    </ScalePressable>
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
                    <ScalePressable
                        accessibilityRole="button"
                        onPress={onWebSearch}
                        style={[styles.button, styles.webSearch]}>
                        <Ionicons name="globe-outline" size={scale(15)} color={themeColor} />
                        <Text style={[uiStyle.defaultText, styles.webSearchLabel, { color: themeColor }]}>
                            {t('網絡搜索')}
                        </Text>
                    </ScalePressable>
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
    clearButton: {
        marginRight: -12,
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
});
