import React, {
    useCallback,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import {
    BottomSheetScrollView,
    BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-simple-toast';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import searchFieldStyles, {
    SEARCH_FIELD_CLEAR_ICON_SIZE,
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
} from '../../../../components/searchFieldStyles';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import CustomBottomSheet from '../../../../utils/BottomSheet';
import {trigger} from '../../../../utils/trigger';

const HarborTagPickerSheet = React.forwardRef(
    function HarborTagPickerSheet(
        {
            maximumTagCount,
            onChange,
            selectedTags,
            tags,
        },
        ref,
    ) {
        const {theme} = useTheme();
        const {t} = useTranslation('harbor');
        const insets = useSafeAreaInsets();
        const sheetRef = useRef(null);
        const [searchQuery, setSearchQuery] = useState('');

        useImperativeHandle(ref, () => ({
            close: () => {
                sheetRef.current?.close();
            },
            expand: () => {
                sheetRef.current?.expand();
            },
        }), []);

        const filteredTags = useMemo(() => {
            const query = searchQuery.trim().toLowerCase();
            if (!query) {
                return tags;
            }
            return tags.filter(tag =>
                String(tag.name).toLowerCase().includes(query),
            );
        }, [searchQuery, tags]);

        const handleSheetIndexChange = useCallback(idx => {
            if (idx < 0) {
                setSearchQuery('');
            }
        }, []);

        const handleToggleTag = useCallback(item => {
            const itemName = String(item.name);
            if (
                selectedTags.some(tag => String(tag.name) === itemName)
            ) {
                onChange(current =>
                    current.filter(tag => String(tag.name) !== itemName),
                );
                return;
            }
            if (
                maximumTagCount != null &&
                selectedTags.length >= maximumTagCount
            ) {
                Toast.show(
                    t('每個話題最多只能選擇 {{count}} 個標籤。', {
                        count: maximumTagCount,
                    }),
                );
                return;
            }
            onChange(current => [...current, item]);
        }, [maximumTagCount, onChange, selectedTags, t]);

        const handleClearSearch = useCallback(() => {
            trigger();
            setSearchQuery('');
        }, []);

        return (
            <CustomBottomSheet
                ref={sheetRef}
                // Stack 頁無 Tab Bar；bottomInset>0 會讓 sheet 懸空並露出下方表單
                bottomInset={0}
                enablePanDownToClose
                onSheetIndexChange={handleSheetIndexChange}
                page="harborComposer">
                <View
                    style={[
                        styles.modalHeader,
                        {borderBottomColor: theme.themeColorUltraLight},
                    ]}>
                    <Text
                        style={[
                            styles.modalTitle,
                            {color: theme.black.main},
                        ]}>
                        {t('選擇標籤')}
                    </Text>
                    <ScalePressable
                        accessibilityLabel={t('完成')}
                        accessibilityRole="button"
                        onPress={() => {
                            trigger();
                            sheetRef.current?.close();
                        }}
                        style={[
                            styles.modalDoneButton,
                            {
                                backgroundColor: theme.tonal.primary15,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.modalDoneText,
                                {color: theme.themeColor},
                            ]}>
                            {t('完成')}
                        </Text>
                    </ScalePressable>
                </View>

                {tags.length > 0 ? (
                    <View
                        style={[
                            searchFieldStyles.field,
                            styles.searchRow,
                            {
                                // 對齊 HarborSearchPanel／iOS UISearchBar 常見底色（ThemeContext 無對應語義 token）
                                backgroundColor: theme.isLight
                                    ? '#E5E5EA'
                                    : '#3A3A3C',
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="magnify"
                            size={SEARCH_FIELD_ICON_SIZE}
                            color={theme.black.third}
                        />
                        <BottomSheetTextInput
                            autoCapitalize="none"
                            autoCorrect={false}
                            clearButtonMode="never"
                            maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                            onChangeText={setSearchQuery}
                            placeholder={t('搜尋標籤')}
                            placeholderTextColor={theme.black.third}
                            returnKeyType="search"
                            selectionColor={theme.themeColor}
                            style={[
                                searchFieldStyles.text,
                                searchFieldStyles.input,
                                {color: theme.black.main},
                            ]}
                            value={searchQuery}
                        />
                        {searchQuery.length > 0 ? (
                            <Pressable
                                accessibilityLabel={t('清除搜尋內容')}
                                accessibilityRole="button"
                                hitSlop={scale(8)}
                                onPress={handleClearSearch}
                                style={({pressed}) => [
                                    searchFieldStyles.clearButton,
                                    {opacity: pressed ? 0.6 : 1},
                                ]}>
                                <MaterialCommunityIcons
                                    name="close-circle"
                                    size={SEARCH_FIELD_CLEAR_ICON_SIZE}
                                    color={theme.black.third}
                                />
                            </Pressable>
                        ) : null}
                    </View>
                ) : null}

                {tags.length === 0 ? (
                    <View
                        style={[
                            styles.modalEmptyState,
                            {paddingBottom: insets.bottom},
                        ]}>
                        <Text
                            style={[
                                styles.secondaryText,
                                {color: theme.black.third},
                            ]}>
                            {t('目前沒有可選項目')}
                        </Text>
                    </View>
                ) : filteredTags.length === 0 ? (
                    <View
                        style={[
                            styles.modalEmptyState,
                            {paddingBottom: insets.bottom},
                        ]}>
                        <Text
                            style={[
                                styles.secondaryText,
                                {color: theme.black.third},
                            ]}>
                            {t('沒有符合的標籤')}
                        </Text>
                    </View>
                ) : (
                    <BottomSheetScrollView
                        contentContainerStyle={[
                            styles.chipList,
                            {paddingBottom: insets.bottom + verticalScale(12)},
                        ]}
                        keyboardShouldPersistTaps="handled">
                        <View style={styles.chipWrap}>
                            {filteredTags.map(item => {
                                const selected = selectedTags.some(
                                    tag =>
                                        String(tag.name) ===
                                        String(item.name),
                                );
                                return (
                                    <ScalePressable
                                        key={String(item.name)}
                                        accessibilityRole="button"
                                        accessibilityState={{selected}}
                                        onPress={() => {
                                            trigger();
                                            handleToggleTag(item);
                                        }}
                                        style={[
                                            styles.tagChip,
                                            {
                                                backgroundColor: selected
                                                    ? theme.tonal.primary30
                                                    : theme.tonal.primary08,
                                                borderColor: selected
                                                    ? theme.themeColor
                                                    : theme.themeColorUltraLight,
                                            },
                                        ]}>
                                        <Text
                                            numberOfLines={1}
                                            style={[
                                                styles.tagChipText,
                                                {
                                                    color: selected
                                                        ? theme.themeColor
                                                        : theme.black.second,
                                                },
                                            ]}>
                                            {`#${item.name}`}
                                        </Text>
                                    </ScalePressable>
                                );
                            })}
                        </View>
                    </BottomSheetScrollView>
                )}
            </CustomBottomSheet>
        );
    },
);

const styles = StyleSheet.create({
    chipList: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(10),
    },
    chipWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    modalDoneButton: {
        borderRadius: scale(8),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(7),
    },
    modalDoneText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
    },
    modalEmptyState: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(24),
    },
    modalHeader: {
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(12),
    },
    modalTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(17),
        fontWeight: '700',
    },
    searchRow: {
        marginHorizontal: scale(14),
        marginTop: verticalScale(10),
    },
    secondaryText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: scale(17),
        textAlign: 'center',
    },
    tagChip: {
        alignItems: 'center',
        borderRadius: scale(9),
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        marginBottom: verticalScale(8),
        marginRight: scale(8),
        maxWidth: '100%',
        minHeight: verticalScale(30),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(6),
    },
    tagChipText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
    },
});

export default HarborTagPickerSheet;
