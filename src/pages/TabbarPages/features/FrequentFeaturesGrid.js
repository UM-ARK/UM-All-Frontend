import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    ReduceMotion,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
import TouchableScale from '../../../components/TouchableScale';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { useAppReducedMotion } from '../../../contexts/ReducedMotionContext';
import { trigger } from '../../../utils/trigger';
import FeatureIcon from '../info/home/search/components/FeatureIcon';

const REORDER_SPRING = {
    duration: 320,
    dampingRatio: 1,
    reduceMotion: ReduceMotion.System,
};

const LIFT_SPRING = {
    duration: 220,
    dampingRatio: 1,
    reduceMotion: ReduceMotion.System,
};

const WIGGLE_KEYFRAMES = {
    '0%': { transform: [{ rotate: '0deg' }] },
    '25%': { transform: [{ rotate: '-2.4deg' }] },
    '75%': { transform: [{ rotate: '2.4deg' }] },
    '100%': { transform: [{ rotate: '0deg' }] },
};

const getFeatureKey = item => item.key_name || item.fn_name;

export function WiggleIconWrapper({ active, phaseIndex = 0, reducedMotion, children, style }) {
    const animationStyle = useMemo(() => {
        if (!active || reducedMotion) {
            return null;
        }
        return {
            animationName: WIGGLE_KEYFRAMES,
            animationDuration: 260,
            animationDelay: (phaseIndex % 5) * 40,
            animationIterationCount: 'infinite',
            animationTimingFunction: 'ease-in-out',
        };
    }, [active, phaseIndex, reducedMotion]);

    return (
        <Animated.View style={[style, animationStyle]}>
            {children}
        </Animated.View>
    );
}

export function FeatureCornerBadge({ variant, onPress, accessibilityLabel }) {
    const { theme } = useTheme();
    const { featuresScreen, themeColor, tonal, trueWhite, unread } = theme;

    const isRemove = variant === 'remove';
    const isAdded = variant === 'added';
    const backgroundColor = isRemove
        ? unread
        : isAdded
            ? tonal.primary15
            : themeColor;
    const iconColor = isAdded ? themeColor : trueWhite;
    const iconName = isRemove ? 'remove' : isAdded ? 'checkmark' : 'add';

    const badgeContent = (
        <View
            style={[
                styles.badgeCircle,
                {
                    backgroundColor,
                    borderColor: featuresScreen.cardBg,
                },
            ]}>
            <Ionicons name={iconName} size={scale(11)} color={iconColor} />
        </View>
    );

    if (!onPress) {
        return (
            <View pointerEvents="none" style={styles.badgeAnchor}>
                {badgeContent}
            </View>
        );
    }

    return (
        <ScalePressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            hitSlop={10}
            onPress={onPress}
            style={styles.badgeAnchor}>
            {badgeContent}
        </ScalePressable>
    );
}

function DraggableFrequentTile({
    item,
    itemKey,
    index,
    count,
    columns,
    cellWidth,
    cellHeight,
    spacing,
    isEditing,
    fontSize,
    featureLabelLineHeight,
    featureLabelHeight,
    isTc,
    reducedMotion,
    draggingKey,
    dragStartIndex,
    dragTargetIndex,
    dragTranslationX,
    dragTranslationY,
    isBeingDragged,
    onPressItem,
    onLongPressItem,
    onRemoveItem,
    onDragStart,
    onSlotChange,
    onDragEnd,
    onMeasureHeight,
}) {
    const { theme } = useTheme();
    const { black } = theme;
    const { t } = useTranslation('features');

    const stepX = cellWidth + spacing;
    const stepY = cellHeight + spacing;
    const totalRows = Math.max(1, Math.ceil(count / columns));

    const panGesture = useMemo(
        () =>
            Gesture.Pan()
                .enabled(isEditing && count > 1 && cellWidth > 0)
                .activateAfterLongPress(Platform.OS === 'web' ? 0 : 120)
                .maxPointers(1)
                .onStart(() => {
                    if (draggingKey.get() !== null) {
                        return;
                    }
                    draggingKey.set(itemKey);
                    dragStartIndex.set(index);
                    dragTargetIndex.set(index);
                    dragTranslationX.set(0);
                    dragTranslationY.set(0);
                    scheduleOnRN(onDragStart, itemKey);
                })
                .onUpdate(event => {
                    if (draggingKey.get() !== itemKey) {
                        return;
                    }
                    dragTranslationX.set(event.translationX);
                    dragTranslationY.set(event.translationY);

                    const startIdx = dragStartIndex.get();
                    const startCol = startIdx % columns;
                    const startRow = Math.floor(startIdx / columns);
                    const centerX = startCol * stepX + cellWidth / 2 + event.translationX;
                    const centerY = startRow * stepY + cellHeight / 2 + event.translationY;

                    const targetCol = Math.min(
                        columns - 1,
                        Math.max(0, Math.floor(centerX / stepX)),
                    );
                    const targetRow = Math.min(
                        totalRows - 1,
                        Math.max(0, Math.floor(centerY / stepY)),
                    );
                    const nextTarget = Math.min(
                        count - 1,
                        Math.max(0, targetRow * columns + targetCol),
                    );

                    if (nextTarget !== dragTargetIndex.get()) {
                        dragTargetIndex.set(nextTarget);
                        scheduleOnRN(onSlotChange);
                    }
                })
                .onFinalize(() => {
                    if (draggingKey.get() !== itemKey) {
                        return;
                    }
                    const fromIndex = dragStartIndex.get();
                    const toIndex = dragTargetIndex.get();
                    if (fromIndex === toIndex) {
                        draggingKey.set(null);
                        dragStartIndex.set(-1);
                        dragTargetIndex.set(-1);
                        dragTranslationX.set(0);
                        dragTranslationY.set(0);
                    }
                    scheduleOnRN(onDragEnd, fromIndex, toIndex);
                }),
        [
            cellHeight,
            cellWidth,
            columns,
            count,
            dragStartIndex,
            dragTargetIndex,
            dragTranslationX,
            dragTranslationY,
            draggingKey,
            index,
            isEditing,
            itemKey,
            onDragEnd,
            onDragStart,
            onSlotChange,
            stepX,
            stepY,
            totalRows,
        ],
    );

    const animatedTileStyle = useAnimatedStyle(() => {
        const activeKey = draggingKey.get();
        const isSelf = activeKey === itemKey;
        const baseX = spacing + (index % columns) * stepX;
        const baseY = spacing + Math.floor(index / columns) * stepY;

        if (isSelf) {
            return {
                zIndex: 100,
                opacity: 0.94,
                transform: [
                    { translateX: baseX + dragTranslationX.get() },
                    { translateY: baseY + dragTranslationY.get() },
                    { scale: withSpring(reducedMotion ? 1 : 1.08, LIFT_SPRING) },
                ],
            };
        }

        let slot = index;
        if (activeKey !== null) {
            const startIdx = dragStartIndex.get();
            const targetIdx = dragTargetIndex.get();
            if (index > startIdx && index <= targetIdx) {
                slot = index - 1;
            } else if (index < startIdx && index >= targetIdx) {
                slot = index + 1;
            }
        }

        const targetX = spacing + (slot % columns) * stepX;
        const targetY = spacing + Math.floor(slot / columns) * stepY;

        return {
            zIndex: 1,
            opacity: 1,
            transform: [
                {
                    translateX:
                        activeKey !== null
                            ? withSpring(targetX, REORDER_SPRING)
                            : targetX,
                },
                {
                    translateY:
                        activeKey !== null
                            ? withSpring(targetY, REORDER_SPRING)
                            : targetY,
                },
                { scale: withSpring(1, LIFT_SPRING) },
            ],
        };
    }, [columns, index, itemKey, reducedMotion, spacing, stepX, stepY]);

    const tileBody = (
        <View
            onLayout={index === 0 ? onMeasureHeight : undefined}
            style={styles.tileInner}>
            <View style={styles.iconBox}>
                <FeatureIcon
                    item={item}
                    size={scale(26)}
                    showBackground={false}
                />
                {isEditing ? (
                    <FeatureCornerBadge
                        variant="remove"
                        accessibilityLabel={t('移除常用服務')}
                        onPress={() => onRemoveItem(item)}
                    />
                ) : null}
            </View>
            <Text
                numberOfLines={isTc ? 1 : 2}
                style={[
                    styles.itemLabel,
                    {
                        fontSize,
                        lineHeight: featureLabelLineHeight,
                        height: featureLabelHeight,
                        color: black.second,
                    },
                ]}>
                {item.fn_name}
            </Text>
        </View>
    );

    return (
        <GestureDetector gesture={panGesture} touchAction={isEditing ? 'none' : 'auto'}>
            <Animated.View
                style={[
                    styles.tileSlot,
                    { width: cellWidth },
                    animatedTileStyle,
                ]}>
                {isEditing ? (
                    <WiggleIconWrapper
                        active={isEditing && !isBeingDragged}
                        phaseIndex={index}
                        reducedMotion={reducedMotion}
                        style={styles.fullWidth}>
                        {tileBody}
                    </WiggleIconWrapper>
                ) : (
                    <TouchableScale
                        accessibilityRole="button"
                        style={styles.fullWidth}
                        activeOpacity={0.7}
                        onPress={() => onPressItem(item)}
                        onLongPress={() => onLongPressItem(item)}>
                        {tileBody}
                    </TouchableScale>
                )}
            </Animated.View>
        </GestureDetector>
    );
}

export default function FrequentFeaturesGrid({
    items,
    isEditing,
    itemDimension,
    spacing,
    maxItemsPerRow,
    fontSize,
    featureLabelLineHeight,
    featureLabelHeight,
    isTc,
    onPressItem,
    onLongPressItem,
    onRemoveItem,
    onReorder,
    onDragActiveChange,
}) {
    const { theme } = useTheme();
    const { black } = theme;
    const { t } = useTranslation('features');
    const reducedMotion = useAppReducedMotion();
    const [containerWidth, setContainerWidth] = useState(0);
    const defaultCellHeight =
        scale(26) +
        verticalScale(6) +
        featureLabelLineHeight * (isTc ? 1 : 2) +
        verticalScale(4);
    const [measuredCellHeight, setMeasuredCellHeight] = useState(0);
    const [activeDraggingKey, setActiveDraggingKey] = useState(null);

    const draggingKey = useSharedValue(null);
    const dragStartIndex = useSharedValue(-1);
    const dragTargetIndex = useSharedValue(-1);
    const dragTranslationX = useSharedValue(0);
    const dragTranslationY = useSharedValue(0);

    const itemKeysSignature = useMemo(
        () => items.map(getFeatureKey).join('|'),
        [items],
    );

    // 排序提交後在版面更新同一幀重置拖拽狀態，避免放手時閃回原位
    useLayoutEffect(() => {
        draggingKey.set(null);
        dragStartIndex.set(-1);
        dragTargetIndex.set(-1);
        dragTranslationX.set(0);
        dragTranslationY.set(0);
        setActiveDraggingKey(null);
    }, [
        dragStartIndex,
        dragTargetIndex,
        dragTranslationX,
        dragTranslationY,
        draggingKey,
        itemKeysSignature,
    ]);

    const handleDragStart = useCallback(
        key => {
            trigger('dragStart');
            setActiveDraggingKey(key);
            onDragActiveChange?.(true);
        },
        [onDragActiveChange],
    );

    const handleSlotChange = useCallback(() => {
        trigger('selection');
    }, []);

    const handleDragEnd = useCallback(
        (fromIndex, toIndex) => {
            setActiveDraggingKey(null);
            onDragActiveChange?.(false);
            if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
                trigger('tap');
                onReorder?.(fromIndex, toIndex);
            }
        },
        [onDragActiveChange, onReorder],
    );

    const handleMeasureHeight = useCallback(event => {
        const nextHeight = event.nativeEvent.layout.height;
        if (nextHeight > 0) {
            setMeasuredCellHeight(current =>
                Math.abs(current - nextHeight) > 1 ? nextHeight : current,
            );
        }
    }, []);

    if (items.length === 0) {
        if (!isEditing) {
            return null;
        }
        return (
            <View style={styles.emptyBox}>
                <Text
                    style={[
                        styles.emptyLabel,
                        { color: black.third },
                    ]}>
                    {t('點擊下方服務添加到常用')}
                </Text>
            </View>
        );
    }

    const columns =
        containerWidth > 0
            ? Math.max(
                1,
                Math.min(
                    maxItemsPerRow,
                    Math.floor((containerWidth - spacing) / (itemDimension + spacing)),
                ),
            )
            : maxItemsPerRow;
    const cellWidth =
        containerWidth > 0
            ? (containerWidth - spacing * (columns + 1)) / columns
            : 0;
    const cellHeight = measuredCellHeight || defaultCellHeight;
    const rows = Math.max(1, Math.ceil(items.length / columns));
    const gridHeight =
        spacing + rows * cellHeight + Math.max(0, rows - 1) * spacing;

    return (
        <View
            onLayout={event => {
                const nextWidth = event.nativeEvent.layout.width;
                setContainerWidth(current =>
                    Math.abs(current - nextWidth) > 0.5 ? nextWidth : current,
                );
            }}
            style={[styles.gridContainer, { height: gridHeight }]}>
            {cellWidth > 0
                ? items.map((item, index) => {
                    const itemKey = getFeatureKey(item);
                    return (
                        <DraggableFrequentTile
                            key={itemKey}
                            item={item}
                            itemKey={itemKey}
                            index={index}
                            count={items.length}
                            columns={columns}
                            cellWidth={cellWidth}
                            cellHeight={cellHeight}
                            spacing={spacing}
                            isEditing={isEditing}
                            fontSize={fontSize}
                            featureLabelLineHeight={featureLabelLineHeight}
                            featureLabelHeight={featureLabelHeight}
                            isTc={isTc}
                            reducedMotion={reducedMotion}
                            draggingKey={draggingKey}
                            dragStartIndex={dragStartIndex}
                            dragTargetIndex={dragTargetIndex}
                            dragTranslationX={dragTranslationX}
                            dragTranslationY={dragTranslationY}
                            isBeingDragged={activeDraggingKey === itemKey}
                            onPressItem={onPressItem}
                            onLongPressItem={onLongPressItem}
                            onRemoveItem={onRemoveItem}
                            onDragStart={handleDragStart}
                            onSlotChange={handleSlotChange}
                            onDragEnd={handleDragEnd}
                            onMeasureHeight={handleMeasureHeight}
                        />
                    );
                })
                : null}
        </View>
    );
}

const styles = StyleSheet.create({
    gridContainer: {
        width: '100%',
        position: 'relative',
    },
    tileSlot: {
        position: 'absolute',
        top: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    fullWidth: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    tileInner: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: verticalScale(2),
    },
    iconBox: {
        width: scale(30),
        height: scale(30),
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badgeAnchor: {
        position: 'absolute',
        top: -scale(5),
        right: -scale(8),
        zIndex: 10,
    },
    badgeCircle: {
        width: scale(18),
        height: scale(18),
        borderRadius: scale(9),
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyBox: {
        paddingVertical: verticalScale(18),
        paddingHorizontal: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemLabel: {
        ...uiStyle.defaultText,
        textAlign: 'center',
        marginTop: verticalScale(6),
    },
    emptyLabel: {
        ...uiStyle.defaultText,
        fontSize: verticalScale(11.5),
        textAlign: 'center',
    },
});
