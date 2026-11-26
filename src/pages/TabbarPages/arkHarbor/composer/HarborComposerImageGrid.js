import React, {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import {Image} from 'expo-image';
import Animated, {useAnimatedRef} from 'react-native-reanimated';
import {scale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import ARKImageView from '../../../../components/ARKImageView';
import {useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';
import PhosphorFeatureIcon from '../../info/home/search/components/PhosphorFeatureIcon';
import {HarborComposerDraggableImage} from './HarborComposerImageDrag';

const GRID_COLUMNS = 3;
const GRID_GAP = scale(7);

const HarborComposerImageGrid = ({
    deleteTargetRef,
    dragOverlayRef,
    dragState,
    handleAddImages,
    handleMoveImage,
    handleRemoveImage,
    handleRetryImage,
    images,
    isDraggingImage,
    isPreparingImages,
    isSubmitting,
    isUploadingImages,
    onDraggedImageChange,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const imageViewerRef = useRef(null);
    const gridRef = useAnimatedRef();
    const [gridWidth, setGridWidth] = useState(0);
    const isInlineGrid = dragState != null;
    const imageActionsDisabled = isSubmitting || isDraggingImage;
    const addImageDisabled = imageActionsDisabled || isPreparingImages || isUploadingImages;
    const itemSize = gridWidth > 0
        ? Math.floor(
            (gridWidth - GRID_GAP * (GRID_COLUMNS - 1)) /
            GRID_COLUMNS,
        )
        : 0;
    const itemSizeStyle = useMemo(
        () => itemSize > 0
            ? {height: itemSize, width: itemSize}
            : null,
        [itemSize],
    );
    const stride = itemSize + GRID_GAP;
    const tileCount = images.length + (handleAddImages ? 1 : 0);
    const imageOrder = JSON.stringify(images.map(image => image.id));
    useLayoutEffect(() => {
        dragState?.set(null);
        onDraggedImageChange?.(null);
    }, [dragState, imageOrder, itemSize, onDraggedImageChange]);

    const handleDragStart = useCallback((id, uri, size) => {
        trigger('dragStart');
        onDraggedImageChange({id, uri, size});
    }, [onDraggedImageChange]);

    const handleDragFinish = useCallback((imageId, offset, remove) => {
        if (remove) {
            handleRemoveImage(imageId);
        } else if (offset !== 0) {
            handleMoveImage(imageId, offset);
        }
        onDraggedImageChange(null);
    }, [handleMoveImage, handleRemoveImage, onDraggedImageChange]);

    const previewItems = useMemo(
        () => images
            .map(image => ({
                id: image.id,
                uri: image.localUri || image.remoteUrl,
            }))
            .filter(item => item.uri),
        [images],
    );
    const imageUrls = useMemo(
        () => previewItems.map(item => item.uri),
        [previewItems],
    );
    const previewIndexById = useMemo(
        () => new Map(
            previewItems.map((item, index) => [item.id, index]),
        ),
        [previewItems],
    );

    if (tileCount === 0) {
        return null;
    }

    return (
        <>
            <Animated.View
                collapsable={false}
                ref={gridRef}
                onLayout={event => {
                    const nextWidth = event.nativeEvent.layout.width;
                    if (nextWidth > 0 && nextWidth !== gridWidth) {
                        setGridWidth(nextWidth);
                    }
                }}
                style={[
                    styles.grid,
                    isInlineGrid && styles.inlineGrid,
                    isInlineGrid && itemSize > 0 && {
                        height: Math.ceil(tileCount / GRID_COLUMNS) * stride - GRID_GAP,
                    },
                ]}>
                {images.map((image, index) => {
                    const isBusy =
                        image.status === 'pending' ||
                        image.status === 'uploading';
                    const isFailed = image.status === 'failed';
                    const isNew = image.isNew === true;
                    const imageUri = image.localUri || image.remoteUrl;
                    const previewIndex = previewIndexById.get(image.id);
                    const tile = (
                        <View
                            key={image.id}
                            style={[
                                styles.item,
                                itemSizeStyle,
                                {
                                    backgroundColor: theme.tonal.primary08,
                                    borderColor: isFailed
                                        ? theme.unread
                                        : isNew
                                            ? theme.success
                                            : theme.themeColorUltraLight,
                                    borderWidth: isNew
                                        ? scale(2)
                                        : StyleSheet.hairlineWidth,
                                },
                            ]}>
                            <Pressable
                                accessibilityLabel={t('預覽第 {{count}} 張圖片', {
                                    count: index + 1,
                                })}
                                accessibilityRole="button"
                                accessibilityState={{
                                    disabled: previewIndex == null || isDraggingImage,
                                }}
                                disabled={previewIndex == null || isDraggingImage}
                                onPress={() => {
                                    trigger();
                                    imageViewerRef.current?.handleOpenImage(
                                        previewIndex,
                                    );
                                }}
                                style={StyleSheet.absoluteFill}>
                                <Image
                                    draggable={false}
                                    contentFit="cover"
                                    placeholder={theme.imagePlaceholder}
                                    source={{uri: imageUri}}
                                    style={styles.image}
                                />
                            </Pressable>

                            {!isInlineGrid ? (
                                <View
                                    style={[
                                        styles.indexBadge,
                                        {backgroundColor: theme.trueBlack},
                                    ]}>
                                    <Text
                                        style={[
                                            styles.indexText,
                                            {color: theme.trueWhite},
                                        ]}>
                                        {index + 1}
                                    </Text>
                                </View>
                            ) : null}

                            {isNew ? (
                                <View
                                    style={[
                                        styles.newBadge,
                                        {backgroundColor: theme.success},
                                    ]}>
                                    <Text
                                        style={[
                                            styles.newBadgeText,
                                            {color: theme.trueWhite},
                                        ]}>
                                        {t('新加入')}
                                    </Text>
                                </View>
                            ) : null}

                            {!isInlineGrid ? (
                                <Pressable
                                    accessibilityLabel={t('移除第 {{count}} 張圖片', {
                                        count: index + 1,
                                    })}
                                    accessibilityRole="button"
                                    disabled={imageActionsDisabled}
                                    hitSlop={scale(5)}
                                    onPress={() => handleRemoveImage(image.id)}
                                    style={[
                                        styles.removeButton,
                                        {backgroundColor: theme.trueBlack},
                                    ]}>
                                    <PhosphorFeatureIcon
                                        name="x"
                                        size={scale(14)}
                                        color={theme.trueWhite}
                                        weight="regular"
                                    />
                                </Pressable>
                            ) : null}

                            {isBusy || isFailed ? (
                                <Pressable
                                    accessibilityLabel={
                                        isFailed ? t('重試圖片上傳') : undefined
                                    }
                                    accessibilityRole={
                                        isFailed ? 'button' : undefined
                                    }
                                    disabled={!isFailed || imageActionsDisabled}
                                    onPress={() => handleRetryImage(image)}
                                    style={[
                                        StyleSheet.absoluteFill,
                                        styles.statusOverlay,
                                        {backgroundColor: theme.trueBlack},
                                    ]}>
                                    {isFailed ? (
                                        <PhosphorFeatureIcon
                                            name="arrow-clockwise"
                                            size={scale(22)}
                                            color={theme.trueWhite}
                                            weight="regular"
                                        />
                                    ) : (
                                        <ActivityIndicator
                                            size="small"
                                            color={theme.trueWhite}
                                        />
                                    )}
                                </Pressable>
                            ) : null}

                            {!isInlineGrid ? (
                                <View style={styles.orderControls}>
                                    <Pressable
                                        accessibilityLabel={t('圖片向前移')}
                                        accessibilityRole="button"
                                        accessibilityState={{
                                            disabled: index === 0 || imageActionsDisabled,
                                        }}
                                        disabled={index === 0 || imageActionsDisabled}
                                        onPress={() => handleMoveImage(image.id, -1)}
                                        style={[
                                            styles.orderButton,
                                            index === 0
                                                ? styles.orderButtonDisabled
                                                : styles.orderButtonEnabled,
                                            {
                                                backgroundColor: theme.trueBlack,
                                            },
                                        ]}>
                                        <PhosphorFeatureIcon
                                            name="caret-left"
                                            size={scale(18)}
                                            color={theme.trueWhite}
                                            weight="regular"
                                        />
                                    </Pressable>
                                    <Pressable
                                        accessibilityLabel={t('圖片向後移')}
                                        accessibilityRole="button"
                                        accessibilityState={{
                                            disabled: index === images.length - 1 || imageActionsDisabled,
                                        }}
                                        disabled={index === images.length - 1 || imageActionsDisabled}
                                        onPress={() => handleMoveImage(image.id, 1)}
                                        style={[
                                            styles.orderButton,
                                            index === images.length - 1
                                                ? styles.orderButtonDisabled
                                                : styles.orderButtonEnabled,
                                            {
                                                backgroundColor: theme.trueBlack,
                                            },
                                        ]}>
                                        <PhosphorFeatureIcon
                                            name="caret-right"
                                            size={scale(18)}
                                            color={theme.trueWhite}
                                            weight="regular"
                                        />
                                    </Pressable>
                                </View>
                            ) : null}
                        </View>
                    );
                    return isInlineGrid ? (
                        <HarborComposerDraggableImage
                            key={image.id}
                            columns={GRID_COLUMNS}
                            count={images.length}
                            deleteTargetRef={deleteTargetRef}
                            disabled={isPreparingImages || isSubmitting}
                            dragOverlayRef={dragOverlayRef}
                            dragState={dragState}
                            gridRef={gridRef}
                            imageId={image.id}
                            imageUri={imageUri}
                            index={index}
                            itemSize={itemSize}
                            onDragStart={handleDragStart}
                            onDragFinish={handleDragFinish}
                            stride={stride}>
                            {tile}
                        </HarborComposerDraggableImage>
                    ) : tile;
                })}
                {handleAddImages && itemSize > 0 ? (
                    <ScalePressable
                        accessibilityLabel={t(isPreparingImages ? '正在處理圖片…' : '新增圖片')}
                        accessibilityRole="button"
                        accessibilityState={{busy: isPreparingImages, disabled: addImageDisabled}}
                        disabled={addImageDisabled}
                        onPress={handleAddImages}
                        style={[
                            styles.item,
                            styles.addTile,
                            itemSizeStyle,
                            {
                                left: (images.length % GRID_COLUMNS) * stride,
                                top: Math.floor(images.length / GRID_COLUMNS) * stride,
                                backgroundColor: theme.tonal.primary08,
                                borderColor: theme.themeColorUltraLight,
                                opacity: addImageDisabled && !isPreparingImages ? 0.55 : 1,
                            },
                        ]}>
                        {isPreparingImages ? (
                            <ActivityIndicator color={theme.themeColor} />
                        ) : (
                            <PhosphorFeatureIcon
                                name="plus"
                                size={scale(29)}
                                color={theme.themeColor}
                                weight="regular"
                            />
                        )}
                    </ScalePressable>
                ) : null}
            </Animated.View>
            <ARKImageView ref={imageViewerRef} imageUrls={imageUrls} />
        </>
    );
};

const styles = StyleSheet.create({
    addTile: {
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        justifyContent: 'center',
        position: 'absolute',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
        width: '100%',
    },
    inlineGrid: {
        maxWidth: scale(350),
    },
    image: {
        borderRadius: scale(9),
        height: '100%',
        width: '100%',
    },
    indexBadge: {
        alignItems: 'center',
        borderRadius: scale(9),
        height: scale(18),
        justifyContent: 'center',
        left: scale(5),
        minWidth: scale(18),
        paddingHorizontal: scale(4),
        position: 'absolute',
        top: scale(5),
        zIndex: 3,
    },
    indexText: {
        fontSize: scale(10),
        fontWeight: '700',
    },
    item: {
        borderRadius: scale(9),
        overflow: 'hidden',
    },
    newBadge: {
        borderRadius: scale(8),
        paddingHorizontal: scale(6),
        paddingVertical: scale(3),
        position: 'absolute',
        right: scale(29),
        top: scale(5),
        zIndex: 3,
    },
    newBadgeText: {
        fontSize: scale(9),
        fontWeight: '700',
    },
    orderButton: {
        alignItems: 'center',
        borderRadius: scale(8),
        height: scale(25),
        justifyContent: 'center',
        width: scale(29),
    },
    orderButtonDisabled: {
        opacity: 0.35,
    },
    orderButtonEnabled: {
        opacity: 0.78,
    },
    orderControls: {
        bottom: scale(5),
        flexDirection: 'row',
        gap: scale(5),
        left: '50%',
        position: 'absolute',
        transform: [{translateX: scale(-31.5)}],
        zIndex: 3,
    },
    removeButton: {
        alignItems: 'center',
        borderRadius: scale(10),
        height: scale(20),
        justifyContent: 'center',
        position: 'absolute',
        right: scale(5),
        top: scale(5),
        width: scale(20),
        zIndex: 4,
    },
    statusOverlay: {
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.62,
        zIndex: 2,
    },
});

export default HarborComposerImageGrid;
