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
    Text,
    View,
} from 'react-native';

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '../../../../components/ThemeContext';
import CustomBottomSheet from '../../../../utils/BottomSheet';
import {
    buildHarborCategoryRows,
    getHarborCategoryKey,
} from '../../../../utils/harbor/harborCategories';
import {trigger} from '../../../../utils/trigger';
import HarborCategoryIcon from '../components/HarborCategoryIcon';

const HarborCategoryPickerSheet = React.forwardRef(
    function HarborCategoryPickerSheet(
        {
            categories,
            onSelect,
            selectedCategoryId,
        },
        ref,
    ) {
        const {theme} = useTheme();
        const {t} = useTranslation('harbor');
        const insets = useSafeAreaInsets();
        const sheetRef = useRef(null);
        const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(
            () => new Set(),
        );
        const categoryRows = useMemo(
            () => buildHarborCategoryRows(
                categories,
                collapsedCategoryIds,
            ),
            [categories, collapsedCategoryIds],
        );

        useImperativeHandle(ref, () => ({
            close: () => {
                sheetRef.current?.close();
            },
            expand: () => {
                setCollapsedCategoryIds(new Set());
                sheetRef.current?.expand();
            },
        }), []);

        const handleToggleCategory = useCallback(item => {
            const categoryKey = getHarborCategoryKey(item);
            setCollapsedCategoryIds(current => {
                const next = new Set(current);
                if (next.has(categoryKey)) {
                    next.delete(categoryKey);
                } else {
                    next.add(categoryKey);
                }
                return next;
            });
        }, []);

        const renderCategoryItem = useCallback(
            ({item}) => {
                const selected =
                    Number(item.id) === Number(selectedCategoryId);
                return (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{selected}}
                        onPress={() => {
                            trigger();
                            onSelect(item);
                        }}
                        style={({pressed}) => [
                            styles.optionRow,
                            item.depth > 0
                                ? {
                                    paddingLeft: scale(
                                        18 + item.depth * 18,
                                    ),
                                }
                                : null,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary15
                                    : selected
                                        ? theme.tonal.primary08
                                        : theme.white,
                                borderBottomColor:
                                    theme.themeColorUltraLight,
                            },
                        ]}>
                        <HarborCategoryIcon
                            category={item}
                            color={
                                selected
                                    ? theme.themeColor
                                    : theme.black.second
                            }
                            size={scale(18)}
                            style={styles.optionCategoryIcon}
                        />
                        <Text
                            numberOfLines={2}
                            style={[
                                styles.optionLabel,
                                {
                                    color: selected
                                        ? theme.themeColor
                                        : theme.black.main,
                                },
                            ]}>
                            {item.name}
                        </Text>
                        {item.hasChildren ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityState={{
                                    expanded: item.isExpanded,
                                }}
                                accessibilityLabel={t(
                                    item.isExpanded
                                        ? '收起 {{name}} 的子分類'
                                        : '展開 {{name}} 的子分類',
                                    {name: item.name},
                                )}
                                hitSlop={scale(8)}
                                onPress={event => {
                                    event.stopPropagation?.();
                                    trigger();
                                    handleToggleCategory(item);
                                }}
                                style={({pressed}) => [
                                    styles.optionToggle,
                                    pressed && {
                                        backgroundColor:
                                            theme.tonal.primary15,
                                    },
                                ]}>
                                <MaterialCommunityIcons
                                    name={
                                        item.isExpanded
                                            ? 'chevron-up'
                                            : 'chevron-down'
                                    }
                                    size={scale(20)}
                                    color={theme.themeColor}
                                />
                            </Pressable>
                        ) : null}
                        {selected ? (
                            <MaterialCommunityIcons
                                name="check"
                                size={scale(20)}
                                color={theme.themeColor}
                            />
                        ) : null}
                    </Pressable>
                );
            },
            [
                selectedCategoryId,
                onSelect,
                handleToggleCategory,
                t,
                theme,
            ],
        );

        return (
            <CustomBottomSheet
                ref={sheetRef}
                // Stack 頁無 Tab Bar；bottomInset>0 會讓 sheet 懸空並露出下方表單
                bottomInset={0}
                enablePanDownToClose
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
                        {t('選擇分類')}
                    </Text>
                    <Pressable
                        accessibilityLabel={t('完成')}
                        accessibilityRole="button"
                        onPress={() => {
                            trigger();
                            sheetRef.current?.close();
                        }}
                        style={({pressed}) => [
                            styles.modalDoneButton,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary30
                                    : theme.tonal.primary15,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.modalDoneText,
                                {color: theme.themeColor},
                            ]}>
                            {t('完成')}
                        </Text>
                    </Pressable>
                </View>
                {categoryRows.length > 0 ? (
                    <BottomSheetFlatList
                        contentContainerStyle={{
                            paddingBottom: insets.bottom,
                        }}
                        data={categoryRows}
                        keyExtractor={item => String(item.id ?? item.name)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={renderCategoryItem}
                    />
                ) : (
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
                )}
            </CustomBottomSheet>
        );
    },
);

const styles = StyleSheet.create({
    modalDoneButton: {
        borderRadius: scale(8),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(7),
    },
    modalDoneText: {
        fontSize: scale(13),
        fontWeight: '600',
    },
    modalEmptyState: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
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
        fontSize: scale(17),
        fontWeight: '700',
    },
    optionCategoryIcon: {
        marginRight: scale(10),
    },
    optionLabel: {
        flex: 1,
        fontSize: scale(14),
    },
    optionRow: {
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        minHeight: verticalScale(50),
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(10),
    },
    optionToggle: {
        alignItems: 'center',
        borderRadius: scale(8),
        height: scale(32),
        justifyContent: 'center',
        marginLeft: scale(4),
        width: scale(32),
    },
    secondaryText: {
        fontSize: scale(12),
        lineHeight: scale(17),
    },
});

export default HarborCategoryPickerSheet;
