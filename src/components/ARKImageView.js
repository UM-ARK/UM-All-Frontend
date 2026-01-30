import React, { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ImageView from 'react-native-image-viewing';
import { useTheme } from './ThemeContext';
import { scale } from 'react-native-size-matters';

/**
 * ARKImageView - 全局圖片查看器組件
 * 用於替換舊的 ImageScrollViewer
 * 基於 react-native-image-viewing 實現
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
    const { white } = theme;

    const [visible, setVisible] = useState(false);
    const [startIndex, setStartIndex] = useState(0);

    // 處理圖片 URL 格式轉換
    const processedImages = React.useMemo(() => {
        if (!imageUrls) return [];

        const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
        return urls.map(url => {
            if (typeof url === 'string') {
                return { uri: url };
            } else if (url && typeof url === 'object') {
                if (url.url) return { uri: url.url };
                if (url.uri) return { uri: url.uri };
            }
            return { uri: '' };
        }).filter(item => item.uri);
    }, [imageUrls]);

    // 打開指定索引的圖片
    const handleOpenImage = useCallback((index = 0) => {
        setStartIndex(index);
        setVisible(true);
    }, []);

    // 兼容舊版 API - 打開第一張圖
    const tiggerModal = useCallback(() => {
        setStartIndex(0);
        setVisible(true);
    }, []);

    // 關閉圖片查看器
    const handleClose = useCallback(() => {
        setVisible(false);
    }, []);

    // 暴露方法給父組件
    useImperativeHandle(ref, () => ({
        handleOpenImage,
        tiggerModal,
        close: handleClose,
    }), [handleOpenImage, tiggerModal, handleClose]);

    // 圖片計數器 Footer 組件
    const FooterComponent = useCallback(({ imageIndex }) => {
        if (processedImages.length <= 1) return null;

        return (
            <View style={styles.footerContainer}>
                <Text style={[styles.footerText, { color: white }]}>
                    {imageIndex + 1} / {processedImages.length}
                </Text>
            </View>
        );
    }, [processedImages.length, white]);

    if (processedImages.length === 0) return null;

    return (
        <ImageView
            images={processedImages}
            imageIndex={startIndex}
            visible={visible}
            onRequestClose={handleClose}
            presentationStyle="overFullScreen"
            animationType="fade"
            doubleTapToZoomEnabled={true}
            swipeToCloseEnabled={true}
            FooterComponent={FooterComponent}
        />
    );
});

const styles = StyleSheet.create({
    footerContainer: {
        width: '100%',
        paddingVertical: scale(20),
        paddingBottom: scale(40),
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerText: {
        fontSize: scale(16),
        fontWeight: '500',
    },
});

export default ARKImageView;
