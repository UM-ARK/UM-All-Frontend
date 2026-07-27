import React, {
    useCallback,
    useImperativeHandle,
    useRef,
} from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-simple-toast';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {useTheme} from '../../../../components/ThemeContext';
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

        useImperativeHandle(ref, () => ({
            close: () => {
                sheetRef.current?.close();
            },
            expand: () => {
                sheetRef.current?.expand();
            },
        }), []);

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

        const renderTagItem = useCallback(
            ({item}) => {
                const selected = selectedTags.some(
                    tag => String(tag.name) === String(item.name),
                );
                return (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{selected}}
                        onPress={() => {
                            trigger();
                            handleToggleTag(item);
                        }}
                        style={({pressed}) => [
                            styles.optionRow,
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
                            {`#${item.name}`}
                        </Text>
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
            [handleToggleTag, selectedTags, theme],
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
                        {t('選擇標籤')}
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
                {tags.length > 0 ? (
                    <BottomSheetFlatList
                        contentContainerStyle={{
                            paddingBottom: insets.bottom,
                        }}
                        data={tags}
                        keyExtractor={item => String(item.name)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={renderTagItem}
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
    secondaryText: {
        fontSize: scale(12),
        lineHeight: scale(17),
    },
});

export default HarborTagPickerSheet;
