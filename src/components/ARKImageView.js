import React, { useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Platform } from 'react-native';
import ImageView from 'react-native-image-viewing';
import { useTheme } from './ThemeContext';
import { scale } from 'react-native-size-matters';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { handleImageDownload } from '../utils/fileKits';
import { trigger } from '../utils/trigger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const { white, themeColor, glass } = theme;

    const [visible, setVisible] = useState(false);
    const [startIndex, setStartIndex] = useState(0);

    // 保存原始圖片列表（用於長按保存）
    const [originalImages, setOriginalImages] = useState([]);

    // 使用 SafeArea insets - 必須在組件頂部調用，遵循 React Hooks 規則
    const insets = useSafeAreaInsets();

    // 處理圖片 URL 格式轉換
    const processedImages = React.useMemo(() => {
        if (!imageUrls) {return [];}

        const urls = Array.isArray(imageUrls) ? imageUrls : [imageUrls];

        // 保存原始圖片列表
        setOriginalImages(urls);

        return urls.map(url => {
            if (typeof url === 'string') {
                return { uri: url };
            } else if (url && typeof url === 'object') {
                if (url.url) {return { uri: url.url };}
                if (url.uri) {return { uri: url.uri };}
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

    // 處理保存圖片
    const handleSaveImage = useCallback((imageIndex) => {
        const imageUrl = originalImages[imageIndex];
        if (!imageUrl) {return;}

        // 解析各種格式的圖片 URL
        let actualUrl = null;

        if (typeof imageUrl === 'string') {
            actualUrl = imageUrl;
        } else if (typeof imageUrl === 'number') {
            // require 的本地圖片
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

    // 暴露方法給父組件
    useImperativeHandle(ref, () => ({
        handleOpenImage,
        tiggerModal,
        close: handleClose,
    }), [handleOpenImage, tiggerModal, handleClose]);

    // Footer 組件 - 包含圖片計數器和保存按鈕
    const FooterComponent = useCallback(({ imageIndex }) => {
        return (
            <View style={styles.footerContainer}>
                {processedImages.length > 1 && (
                    <Text style={[styles.footerText, { color: white }]}>
                        {imageIndex + 1} / {processedImages.length}
                    </Text>
                )}

                {/* 保存按鈕 */}
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: white }]}
                    onPress={() => handleSaveImage(imageIndex)}
                >
                    <Ionicons
                        name="download-outline"
                        color={themeColor}
                        size={scale(24)}
                    />
                </TouchableOpacity>
            </View>
        );
    }, [processedImages.length, white, themeColor, handleSaveImage]);

    // Header 組件 - 包含關閉按鈕（右上角，避免與狀態欄重疊）
    const HeaderComponent = useCallback(() => {
        // Android 狀態欄高度備選方案
        const statusBarHeight = StatusBar.currentHeight || 0;
        // 使用 insets.top 或狀態欄高度的較大值，確保足夠的間距
        const topPadding = Math.max(insets.top, statusBarHeight, Platform.OS === 'android' ? scale(8) : 0);

        return (
            <View style={[styles.headerContainer, { paddingTop: topPadding }]}>
                <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: glass }]}
                    onPress={() => {
                        trigger();
                        handleClose();
                    }}
                >
                    <Ionicons
                        name="close"
                        color={white}
                        size={scale(24)}
                    />
                </TouchableOpacity>
            </View>
        );
    }, [white, glass, handleClose, insets]);

    if (processedImages.length === 0) {return null;}

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
            HeaderComponent={HeaderComponent}
            FooterComponent={FooterComponent}
        />
    );
});

const styles = StyleSheet.create({
    headerContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: scale(16),
    },
    closeButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
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
        marginBottom: scale(12),
    },
    saveButton: {
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});

export default ARKImageView;
