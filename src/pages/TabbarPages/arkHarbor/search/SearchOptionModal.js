import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {FlashList} from '@shopify/flash-list';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {
    buildHarborCategoryRows,
    getHarborCategoryKey,
} from '../../../../utils/harbor/harborCategories';
import {trigger} from '../../../../utils/trigger';
import HarborCategoryIcon from '../components/HarborCategoryIcon';

const SearchOptionModal = ({
    visible,
    title,
    options,
    selectedKey,
    emptyLabel,
    hierarchical = false,
    onSelect,
    onClose,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const [collapsedCategoryIds, setCollapsedCategoryIds] = useState(
        () => new Set(),
    );
    const visibleOptions = useMemo(
        () =>
            hierarchical
                ? buildHarborCategoryRows(options, collapsedCategoryIds)
                : options,
        [collapsedCategoryIds, hierarchical, options],
    );
    const data = useMemo(
        () => [{key: '', label: emptyLabel, value: null}, ...visibleOptions],
        [emptyLabel, visibleOptions],
    );

    useEffect(() => {
        if (visible && hierarchical) {
            setCollapsedCategoryIds(new Set());
        }
    }, [hierarchical, visible]);

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

    const renderItem = useCallback(
        ({item}) => {
            const selected = item.key === selectedKey;
            return (
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{selected}}
                    onPress={() => {
                        trigger();
                        onSelect(item.value);
                    }}
                    style={({pressed}) => [
                        styles.optionRow,
                        hierarchical && item.depth > 0
                            ? {
                                paddingLeft: scale(
                                    15 + item.depth * 18,
                                ),
                            }
                            : null,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary15
                                : selected
                                    ? theme.tonal.primary08
                                    : theme.white,
                            borderBottomColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    {hierarchical && item.key !== '' ? (
                        <HarborCategoryIcon
                            category={item}
                            color={
                                selected
                                    ? theme.themeColor
                                    : theme.black.second
                            }
                            size={scale(16)}
                            style={styles.optionCategoryIcon}
                        />
                    ) : null}
                    <Text
                        numberOfLines={2}
                        style={[
                            styles.optionText,
                            {
                                color: selected
                                    ? theme.themeColor
                                    : theme.black.main,
                            },
                        ]}>
                        {item.label}
                    </Text>
                    {hierarchical && item.hasChildren ? (
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
                                size={scale(19)}
                                color={theme.themeColor}
                            />
                        </Pressable>
                    ) : null}
                    {selected ? (
                        <MaterialCommunityIcons
                            name="check"
                            size={scale(19)}
                            color={theme.themeColor}
                        />
                    ) : null}
                </Pressable>
            );
        },
        [
            handleToggleCategory,
            hierarchical,
            onSelect,
            selectedKey,
            t,
            theme,
        ],
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={() => {
                trigger();
                onClose();
            }}>
            <View
                style={[
                    styles.modalBackdrop,
                    {backgroundColor: theme.tonal.primary50},
                ]}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('關閉')}
                    onPress={() => {
                        trigger();
                        onClose();
                    }}
                    style={StyleSheet.absoluteFill}
                />
                <View
                    style={[
                        styles.optionModal,
                        {
                            backgroundColor: theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                        theme.viewShadow,
                    ]}>
                    <View style={styles.optionModalHeader}>
                        <Text
                            style={[
                                styles.optionModalTitle,
                                {color: theme.black.main},
                            ]}>
                            {title}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('關閉')}
                            hitSlop={scale(8)}
                            onPress={() => {
                                trigger();
                                onClose();
                            }}
                            style={({pressed}) => [
                                styles.modalCloseButton,
                                pressed && {
                                    backgroundColor:
                                        theme.tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="close"
                                size={scale(20)}
                                color={theme.black.main}
                            />
                        </Pressable>
                    </View>
                    <FlashList
                        data={data}
                        keyExtractor={item => item.key}
                        renderItem={renderItem}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(20),
    },
    optionModal: {
        width: '100%',
        maxHeight: '72%',
        minHeight: verticalScale(260),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(18),
        overflow: 'hidden',
    },
    optionModalHeader: {
        minHeight: verticalScale(50),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(14),
    },
    optionModalTitle: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(16),
        fontWeight: '700',
    },
    modalCloseButton: {
        width: scale(32),
        height: scale(32),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionRow: {
        minHeight: verticalScale(48),
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(8),
    },
    optionText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(12),
        marginRight: scale(8),
    },
    optionCategoryIcon: {
        marginRight: scale(8),
    },
    optionToggle: {
        alignItems: 'center',
        borderRadius: scale(8),
        height: scale(30),
        justifyContent: 'center',
        marginRight: scale(2),
        width: scale(30),
    },
});

export default SearchOptionModal;
