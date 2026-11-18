import React, {useMemo} from 'react';
import {Platform, StyleSheet} from 'react-native';

import {Image} from 'expo-image';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {KeyboardStickyView} from 'react-native-keyboard-controller';
import Animated, {
    measure,
    ReduceMotion,
    useAnimatedRef,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";

import Text from '../../../../components/AppText';
import {useTheme} from '../../../../components/ThemeContext';
import {useAppReducedMotion} from '../../../../contexts/ReducedMotionContext';

const SNAP_SPRING = {duration: 400, dampingRatio: 1, reduceMotion: ReduceMotion.System};

function getDragPosition(event, drag, stride, columns, count) {
    'worklet';
    const offsetX = event.absoluteX - drag.startX;
    const offsetY = event.absoluteY - drag.startY;
    const pointerX = drag.pointerX + offsetX;
    const pointerY = drag.pointerY + offsetY;
    const {grid, deleteTarget} = drag;
    const overDelete = deleteTarget != null &&
        pointerX >= deleteTarget.pageX &&
        pointerX <= deleteTarget.pageX + deleteTarget.width &&
        pointerY >= deleteTarget.pageY &&
        pointerY <= deleteTarget.pageY + deleteTarget.height;
    const overGrid = pointerX >= grid.pageX &&
        pointerX <= grid.pageX + grid.width &&
        pointerY >= grid.pageY &&
        pointerY <= grid.pageY + grid.height;
    const column = Math.min(columns - 1, Math.max(0, Math.floor((pointerX - grid.pageX) / stride)));
    const row = Math.floor((pointerY - grid.pageY) / stride);
    return {
        ...drag,
        offsetX,
        offsetY,
        overDelete,
        targetIndex: overGrid && !overDelete
            ? Math.min(count - 1, row * columns + column)
            : drag.index,
    };
}

function getDraggedImageStyle(drag, container, reduceMotion) {
    'worklet';
    return {
        opacity: drag.overDelete ? 0.65 : 0.92,
        transform: [
            {translateX: drag.tileX - container.pageX + drag.offsetX},
            {translateY: drag.tileY - container.pageY + drag.offsetY},
            {scale: reduceMotion ? 1 : 1.04},
        ],
    };
}

export function HarborComposerDraggableImage({
    children,
    columns,
    count,
    deleteTargetRef,
    disabled,
    dragOverlayRef,
    dragState,
    gridRef,
    imageId,
    imageUri,
    index,
    itemSize,
    onDragStart,
    onDragFinish,
    stride,
}) {
    const reduceMotion = useAppReducedMotion();
    const tileRef = useAnimatedRef();
    const pan = useMemo(() => Gesture.Pan()
        .enabled(!disabled && itemSize > 0)
        .activateAfterLongPress(Platform.OS === 'web' ? 0 : 250)
        .maxPointers(1)
        .onStart(event => {
            if (dragState.get() != null) {
                return;
            }
            const grid = measure(gridRef);
            const tile = measure(tileRef);
            const overlay = measure(dragOverlayRef);
            if (grid == null || tile == null || overlay == null) {
                return;
            }
            dragState.set({
                imageId,
                index,
                offsetX: 0,
                offsetY: 0,
                overDelete: false,
                previewVisible: false,
                targetIndex: index,
                grid,
                overlay,
                deleteTarget: measure(deleteTargetRef),
                tileX: tile.pageX,
                tileY: tile.pageY,
                startX: event.absoluteX,
                startY: event.absoluteY,
                pointerX: tile.pageX + event.x,
                pointerY: tile.pageY + event.y,
            });
            scheduleOnRN(onDragStart, imageId, imageUri, itemSize);
        })
        .onUpdate(event => {
            const drag = dragState.get();
            if (drag?.imageId === imageId) {
                dragState.set(getDragPosition(event, drag, stride, columns, count));
            }
        })
        .onFinalize((event, success) => {
            const drag = dragState.get();
            if (drag?.imageId !== imageId) {
                return;
            }
            const drop = success ? getDragPosition(event, drag, stride, columns, count) : null;
            const remove = drop?.overDelete === true;
            const offset = drop ? drop.targetIndex - index : 0;
            if (!remove && offset === 0) {
                dragState.set(null);
            }
            scheduleOnRN(onDragFinish, imageId, offset, remove);
        }), [
        columns, count, deleteTargetRef, disabled, dragOverlayRef, dragState,
        gridRef, imageId, imageUri, index, itemSize, onDragStart, onDragFinish, stride, tileRef,
    ]);

    const dragStyle = useAnimatedStyle(() => {
        const drag = dragState.get();
        if (drag?.imageId === imageId) {
            const style = getDraggedImageStyle(drag, drag.grid, reduceMotion);
            return {
                ...style,
                zIndex: 2,
                opacity: drag.previewVisible ? 0 : style.opacity,
            };
        }
        let slot = index;
        if (drag != null && index > drag.index && index <= drag.targetIndex) {
            slot -= 1;
        } else if (drag != null && index < drag.index && index >= drag.targetIndex) {
            slot += 1;
        }
        return {
            zIndex: 1,
            opacity: 1,
            transform: [
                {translateX: withSpring((slot % columns) * stride, SNAP_SPRING)},
                {translateY: withSpring(Math.floor(slot / columns) * stride, SNAP_SPRING)},
                {scale: 1},
            ],
        };
    });

    return (
        <GestureDetector gesture={pan} touchAction="none">
            <Animated.View collapsable={false} ref={tileRef} style={[styles.tile, dragStyle]}>
                {children}
            </Animated.View>
        </GestureDetector>
    );
}

export function HarborComposerImageDragOverlay({dragState, image, overlayRef, targetRef}) {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const insets = useSafeAreaInsets();
    const reduceMotion = useAppReducedMotion();
    const imageId = image?.id;
    const targetStyle = useAnimatedStyle(() => {
        const drag = dragState.get();
        return {opacity: drag == null ? 0 : drag.overDelete ? 1 : 0.88};
    });
    const previewStyle = useAnimatedStyle(() => {
        const drag = dragState.get();
        return drag != null && drag.imageId === imageId
            ? getDraggedImageStyle(drag, drag.overlay, reduceMotion)
            : {opacity: 0};
    });

    const handlePreviewDisplay = () => {
        dragState.modify(drag => {
            'worklet';
            return drag != null && drag.imageId === imageId
                ? {...drag, previewVisible: true}
                : drag;
        });
    };

    return (
        <Animated.View
            accessibilityElementsHidden
            collapsable={false}
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            ref={overlayRef}
            style={[StyleSheet.absoluteFill, styles.overlay]}>
            <KeyboardStickyView style={styles.deleteDock}>
                <Animated.View
                    collapsable={false}
                    ref={targetRef}
                    style={[
                        styles.deleteTarget,
                        {
                            backgroundColor: theme.unread,
                            paddingBottom: insets.bottom + verticalScale(12),
                        },
                        targetStyle,
                    ]}>
                    <MaterialCommunityIcons name="delete-outline" size={scale(22)} color={theme.trueBlack} />
                    <Text style={[styles.deleteText, {color: theme.trueBlack}]}>
                        {t('拖到此處刪除')}
                    </Text>
                </Animated.View>
            </KeyboardStickyView>
            {image?.uri ? (
                <Animated.View
                    key={image.id}
                    style={[
                        styles.tile,
                        {height: image.size, width: image.size, zIndex: 1},
                        previewStyle,
                    ]}>
                    <Image
                        contentFit="cover"
                        onDisplay={handlePreviewDisplay}
                        source={{uri: image.uri}}
                        style={styles.preview}
                    />
                </Animated.View>
            ) : null}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        zIndex: 1,
    },
    preview: {
        borderRadius: scale(9),
        height: '100%',
        width: '100%',
    },
    tile: {
        left: 0,
        position: 'absolute',
        top: 0,
    },
    deleteDock: {
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
    },
    deleteTarget: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: scale(8),
        justifyContent: 'center',
        minHeight: verticalScale(64),
        paddingHorizontal: scale(12),
        paddingTop: verticalScale(12),
    },
    deleteText: {
        fontSize: scale(14),
        fontWeight: '600',
    },
});
