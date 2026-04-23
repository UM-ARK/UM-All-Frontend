import React, { useState, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform, Image } from 'react-native';
import GalleryPreview from 'react-native-gallery-preview';
import { useTheme } from './ThemeContext';
import { scale } from 'react-native-size-matters';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { handleImageDownload } from '../utils/fileKits';
import { trigger } from '../utils/trigger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isLiquidGlassSupported, LiquidGlassView } from '@callstack/liquid-glass';

/**
 * ARKImageView - 全局圖片查看器組件
 * 用於替換舊的 ImageScrollViewer
 * 基於 react-native-gallery-preview 實現
 *
 * @example
 * const imageViewerRef = useRef(null);
 * <ARKImageView ref={imageViewerRef} imageUrls={imageList} />
 * // 打開圖片查看器
 * imageViewerRef.current?.handleOpenImage(index);
 * // 或舊版兼容
 * imageViewerRef.current?.tiggerModal();
 */
const ARKImageView = forwardRef((props, ref) => {
    const { imageUrls } = props;
    const { theme } = useTheme();
    const { white, themeColor, black, viewShadow, trueBlack, trueWhite } = theme;

    const [visible, setVisible] = useState(false);
    const [startIndex, setStartIndex] = useState(0);

    const insets = useSafeAreaInsets();

    const { processedImages, originalImages } = useMemo(() => {
        if (!imageUrls) {
            return { processedImages: [], originalImages: [] };
        }

        const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
        const sources = [];
        const originals = [];

        urls.forEach((url) => {
            let uri = '';
            if (typeof url === 'string') {
                uri = url;
            } else if (typeof url === 'number') {
                const assetSource = Image.resolveAssetSource(url);
                uri = assetSource?.uri || '';
            } else if (url && typeof url === 'object') {
                if (url.url) {uri = url.url;}
                else if (url.uri) {uri = url.uri;}
            }
            if (uri) {
                sources.push({ uri });
                originals.push(url);
            }
        });

        return { processedImages: sources, originalImages: originals };
    }, [imageUrls]);

    const handleOpenImage = useCallback((index = 0) => {
        setStartIndex(index);
        setVisible(true);
    }, []);

    const tiggerModal = useCallback(() => {
        setStartIndex(0);
        setVisible(true);
    }, []);

    const handleClose = useCallback(() => {
        setVisible(false);
    }, []);

    const handleSaveImage = useCallback((imageIndex) => {
        const imageUrl = originalImages[imageIndex];
        if (!imageUrl) {return;}

        let actualUrl = null;

        if (typeof imageUrl === 'string') {
            actualUrl = imageUrl;
        } else if (typeof imageUrl === 'number') {
            const assetSource = Image.resolveAssetSource(imageUrl);
            actualUrl = assetSource?.uri || null;
        } else if (typeof imageUrl === 'object') {
            if (imageUrl.url) {actualUrl = imageUrl.url;}
            else if (imageUrl.uri) {actualUrl = imageUrl.uri;}
        }

        if (actualUrl) {
            trigger();
            handleImageDownload(actualUrl);
        }
    }, [originalImages]);

    useImperativeHandle(ref, () => ({
        handleOpenImage,
        tiggerModal,
        close: handleClose,
    }), [handleOpenImage, tiggerModal, handleClose]);

    const OverlayComponent = useCallback(({
        onClose,
        currentImageIndex,
        imagesLength,
    }) => {
        const topPadding = Math.max(insets.top, Platform.OS === 'android' ? scale(8) : 0);
        const bottomPadding = Math.max(insets.bottom, scale(20));

        return (
            <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
                <View
                    style={[styles.headerContainer, { paddingTop: topPadding }]}
                    pointerEvents="box-none"
                >
                    <LiquidGlassView
                        interactive={true}
                        hover={isLiquidGlassSupported ? { effect: 'highlight' } : null}
                        style={{
                            backgroundColor: isLiquidGlassSupported ? null : white,
                            borderRadius: scale(20),
                            width: scale(40),
                            height: scale(40),
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                            ...(isLiquidGlassSupported ? {} : viewShadow),
                        }}
                    >
                        <Pressable
                            onPress={() => {
                                trigger();
                                onClose();
                            }}
                            style={{
                                width: '100%',
                                height: '100%',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Ionicons
                                name="close"
                                color={black.main}
                                size={scale(24)}
                            />
                        </Pressable>
                    </LiquidGlassView>
                </View>

                <View
                    style={[styles.footerContainer, { paddingBottom: bottomPadding }]}
                    pointerEvents="box-none"
                >
                    {imagesLength > 1 && (
                        <Text style={[styles.footerText, { color: trueWhite }]}>
                            {currentImageIndex + 1} / {imagesLength}
                        </Text>
                    )}

                    <LiquidGlassView
                        interactive={true}
                        hover={isLiquidGlassSupported ? { effect: 'highlight' } : null}
                        style={{
                            backgroundColor: isLiquidGlassSupported ? null : white,
                            borderRadius: scale(25),
                            width: scale(50),
                            height: scale(50),
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'hidden',
                        }}
                    >
                        <Pressable
                            onPress={() => handleSaveImage(currentImageIndex)}
                            style={{
                                width: '100%',
                                height: '100%',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Ionicons
                                name="download-outline"
                                color={black.main}
                                size={scale(24)}
                            />
                        </Pressable>
                    </LiquidGlassView>
                </View>
            </View>
        );
    }, [
        black.main,
        handleSaveImage,
        insets.bottom,
        insets.top,
        themeColor,
        trueWhite,
        viewShadow,
        white,
    ]);

    if (processedImages.length === 0) {return null;}

    return (
        <GalleryPreview
            isVisible={visible}
            onRequestClose={handleClose}
            images={processedImages}
            initialIndex={startIndex}
            OverlayComponent={OverlayComponent}
            backgroundColor={trueBlack}
            headerTextColor={trueWhite}
            doubleTabEnabled={true}
            pinchEnabled={true}
            swipeToCloseEnabled={true}
        />
    );
});

const styles = StyleSheet.create({
    headerContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: scale(16),
    },
    footerContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerText: {
        fontSize: scale(16),
        fontWeight: '500',
        marginBottom: scale(12),
    },
});

export default ARKImageView;
