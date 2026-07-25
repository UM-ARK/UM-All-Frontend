import React, { useState, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image as RNImage } from 'react-native';
import GalleryPreview from 'react-native-gallery-preview';
import { Image } from 'expo-image';
import { useTheme } from './ThemeContext';
import { scale } from 'react-native-size-matters';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { handleImageDownload } from '../utils/fileKits';
import { trigger } from '../utils/trigger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 圖片查看器操作鈕
 * 淺色實心底 + 深色圖示：在黑色信箱與淺色圖片上都能辨識
 *（不用 LiquidGlass：會透出底圖導致對比失效）
 */
const ViewerChromeButton = ({
    iconName,
    label,
    size = scale(44),
    iconSize = scale(22),
    onPress,
    trueWhite,
    trueBlack,
}) => {
    return (
        <Pressable
            onPress={onPress}
            hitSlop={scale(12)}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: trueWhite,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: pressed ? 0.8 : 1,
                    shadowColor: trueBlack,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.35,
                    shadowRadius: 4,
                    elevation: 6,
                },
            ]}
        >
            <Ionicons
                name={iconName}
                color={trueBlack}
                size={iconSize}
            />
        </Pressable>
    );
};

/**
 * GalleryPreview 自訂圖片元件：expo-image + blurhash 模糊加載
 * 需回傳真實寬高給庫，才能正確計算縮放邊界
 */
const GalleryExpoImage = ({ source, onLoad, style, imagePlaceholder }) => {
    return (
        <Image
            source={source}
            style={style}
            contentFit="contain"
            placeholder={imagePlaceholder}
            placeholderContentFit="contain"
            cachePolicy="memory-disk"
            onLoad={e => {
                onLoad(e.source.width, e.source.height);
            }}
        />
    );
};

/**
 * ARKImageView - 全局圖片查看器組件
 * 基於 react-native-gallery-preview + expo-image
 */
const ARKImageView = forwardRef((props, ref) => {
    const { imageUrls } = props;
    const { theme } = useTheme();
    const { trueBlack, trueWhite, imagePlaceholder } = theme;

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
                const assetSource = RNImage.resolveAssetSource(url);
                uri = assetSource?.uri || '';
            } else if (url && typeof url === 'object') {
                if (url.url) { uri = url.url; }
                else if (url.uri) { uri = url.uri; }
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
        if (!imageUrl) { return; }

        let actualUrl = null;

        if (typeof imageUrl === 'string') {
            actualUrl = imageUrl;
        } else if (typeof imageUrl === 'number') {
            const assetSource = RNImage.resolveAssetSource(imageUrl);
            actualUrl = assetSource?.uri || null;
        } else if (typeof imageUrl === 'object') {
            if (imageUrl.url) { actualUrl = imageUrl.url; }
            else if (imageUrl.uri) { actualUrl = imageUrl.uri; }
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

    /**
     * 對齊庫內 DefaultHeader 的結構：position absolute + top 0 + 全寬。
     */
    const OverlayComponent = useCallback(({
        onClose,
        currentImageIndex,
        imagesLength,
    }) => {
        const bottomPadding = Math.max(insets.bottom, scale(20));

        const onPressClose = () => {
            trigger();
            onClose();
        };

        return (
            <>
                {/* 頂部：模仿 DefaultHeader，全寬條確保進佈局 */}
                <View
                    style={[styles.headerBar, { paddingTop: Math.max(insets.top, scale(12)) },]}
                    pointerEvents="box-none"
                    collapsable={false}
                >
                    <View style={styles.headerRow} collapsable={false}>
                        <View style={styles.headerSpacer} />
                        <ViewerChromeButton
                            iconName="close"
                            label="關閉"
                            onPress={onPressClose}
                            trueWhite={trueWhite}
                            trueBlack={trueBlack}
                        />
                    </View>
                </View>

                {/* 底部：保存 */}
                <View
                    style={[styles.footerBar, { paddingBottom: bottomPadding }]}
                    pointerEvents="box-none"
                    collapsable={false}
                >
                    {imagesLength > 1 && (
                        <Text
                            style={[
                                styles.footerText,
                                {
                                    color: trueWhite,
                                    textShadowColor: `${trueBlack}99`,
                                },
                            ]}
                        >
                            {currentImageIndex + 1} / {imagesLength}
                        </Text>
                    )}
                    <ViewerChromeButton
                        iconName="download-outline"
                        label="保存圖片"
                        size={scale(50)}
                        onPress={() => handleSaveImage(currentImageIndex)}
                        trueWhite={trueWhite}
                        trueBlack={trueBlack}
                    />
                </View>
            </>
        );
    }, [
        handleSaveImage,
        insets.bottom,
        insets.top,
        trueBlack,
        trueWhite,
    ]);

    // GalleryPreview 的 ImageComponent 只傳 source/onLoad/style，用閉包帶入 blurhash
    const ImageComponent = useCallback((imageProps) => (
        <GalleryExpoImage
            {...imageProps}
            imagePlaceholder={imagePlaceholder}
        />
    ), [imagePlaceholder]);

    if (processedImages.length === 0) { return null; }

    return (
        <GalleryPreview
            isVisible={visible}
            onRequestClose={handleClose}
            images={processedImages}
            initialIndex={startIndex}
            OverlayComponent={OverlayComponent}
            ImageComponent={ImageComponent}
            backgroundColor={trueBlack}
            headerTextColor={trueWhite}
            doubleTabEnabled={true}
            pinchEnabled={true}
            swipeToCloseEnabled={true}
        />
    );
});

const styles = StyleSheet.create({
    // 與庫 DefaultHeader 一致：不要包 absoluteFill 根節點
    headerBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 100,
        elevation: 100,
        paddingBottom: scale(10),
        paddingHorizontal: scale(16),
    },
    headerRow: {
        height: scale(44),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    headerSpacer: {
        flex: 1,
    },
    footerBar: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        zIndex: 100,
        elevation: 100,
        paddingTop: scale(12),
        alignItems: 'center',
    },
    footerText: {
        fontSize: scale(16),
        fontWeight: '500',
        marginBottom: scale(12),
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
});

export default ARKImageView;
