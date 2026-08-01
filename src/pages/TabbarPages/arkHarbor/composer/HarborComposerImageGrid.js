import React, {useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {Image} from 'expo-image';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import ARKImageView from '../../../../components/ARKImageView';
import {useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';

const GRID_COLUMNS = 3;
const GRID_GAP = scale(7);

const HarborComposerImageGrid = ({
    handleMoveImage,
    handleRemoveImage,
    handleRetryImage,
    images,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const imageViewerRef = useRef(null);
    const [gridWidth, setGridWidth] = useState(0);
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

    if (images.length === 0) {
        return null;
    }

    return (
        <>
            <View
                onLayout={event => {
                    const nextWidth = event.nativeEvent.layout.width;
                    if (nextWidth > 0 && nextWidth !== gridWidth) {
                        setGridWidth(nextWidth);
                    }
                }}
                style={styles.grid}>
                {images.map((image, index) => {
                    const isBusy =
                        image.status === 'pending' ||
                        image.status === 'uploading';
                    const isFailed = image.status === 'failed';
                    const previewIndex = previewIndexById.get(image.id);
                    return (
                        <View
                            key={image.id}
                            style={[
                                styles.item,
                                itemSizeStyle,
                                {
                                    backgroundColor: theme.tonal.primary08,
                                    borderColor: isFailed
                                        ? theme.unread
                                        : theme.themeColorUltraLight,
                                },
                            ]}>
                            <Pressable
                                accessibilityLabel={t('預覽第 {{count}} 張圖片', {
                                    count: index + 1,
                                })}
                                accessibilityRole="button"
                                accessibilityState={{
                                    disabled: previewIndex == null,
                                }}
                                disabled={previewIndex == null}
                                onPress={() => {
                                    trigger();
                                    imageViewerRef.current?.handleOpenImage(
                                        previewIndex,
                                    );
                                }}
                                style={StyleSheet.absoluteFill}>
                                <Image
                                    contentFit="cover"
                                    placeholder={theme.imagePlaceholder}
                                    source={{
                                        uri:
                                            image.localUri ||
                                            image.remoteUrl,
                                    }}
                                    style={styles.image}
                                />
                            </Pressable>

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

                            <Pressable
                                accessibilityLabel={t('移除第 {{count}} 張圖片', {
                                    count: index + 1,
                                })}
                                accessibilityRole="button"
                                hitSlop={scale(5)}
                                onPress={() => handleRemoveImage(image.id)}
                                style={[
                                    styles.removeButton,
                                    {backgroundColor: theme.trueBlack},
                                ]}>
                                <MaterialCommunityIcons
                                    name="close"
                                    size={scale(14)}
                                    color={theme.trueWhite}
                                />
                            </Pressable>

                            {isBusy || isFailed ? (
                                <Pressable
                                    accessibilityLabel={
                                        isFailed ? t('重試圖片上傳') : undefined
                                    }
                                    accessibilityRole={
                                        isFailed ? 'button' : undefined
                                    }
                                    disabled={!isFailed}
                                    onPress={() => handleRetryImage(image)}
                                    style={[
                                        StyleSheet.absoluteFill,
                                        styles.statusOverlay,
                                        {backgroundColor: theme.trueBlack},
                                    ]}>
                                    {isFailed ? (
                                        <MaterialCommunityIcons
                                            name="reload"
                                            size={scale(22)}
                                            color={theme.trueWhite}
                                        />
                                    ) : (
                                        <ActivityIndicator
                                            size="small"
                                            color={theme.trueWhite}
                                        />
                                    )}
                                </Pressable>
                            ) : null}

                            <View style={styles.orderControls}>
                                <Pressable
                                    accessibilityLabel={t('圖片向前移')}
                                    accessibilityRole="button"
                                    accessibilityState={{disabled: index === 0}}
                                    disabled={index === 0}
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
                                    <MaterialCommunityIcons
                                        name="chevron-left"
                                        size={scale(18)}
                                        color={theme.trueWhite}
                                    />
                                </Pressable>
                                <Pressable
                                    accessibilityLabel={t('圖片向後移')}
                                    accessibilityRole="button"
                                    accessibilityState={{
                                        disabled: index === images.length - 1,
                                    }}
                                    disabled={index === images.length - 1}
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
                                    <MaterialCommunityIcons
                                        name="chevron-right"
                                        size={scale(18)}
                                        color={theme.trueWhite}
                                    />
                                </Pressable>
                            </View>
                        </View>
                    );
                })}
            </View>
            <ARKImageView ref={imageViewerRef} imageUrls={imageUrls} />
        </>
    );
};

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: GRID_GAP,
        width: '100%',
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
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
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
