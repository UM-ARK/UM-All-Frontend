import React, { useState, forwardRef, useImperativeHandle, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Pressable, Image as RNImage, ActivityIndicator, Alert, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Camera } from 'expo-camera';
import GalleryPreview from 'react-native-gallery-preview';
import ActionSheet, { ScrollView } from 'react-native-actions-sheet';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-simple-toast';
import { Image } from 'expo-image';
import Text from './AppText';
import { useTheme } from './ThemeContext';
import { scale } from 'react-native-size-matters';
import Ionicons from "@react-native-vector-icons/ionicons";
import { openLink } from '../utils/browser';
import { handleImageDownload } from '../utils/fileKits';
import { getImageQrDisplayHost, getImageQrHttpUrl, normalizeImageQrResults } from '../utils/imageQrKits';
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
    disabled,
    loading,
    trueWhite,
    trueBlack,
}) => {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
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
                    opacity: disabled ? 0.65 : pressed ? 0.8 : 1,
                    shadowColor: trueBlack,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.35,
                    shadowRadius: 4,
                    elevation: 6,
                },
            ]}
        >
            {loading ? (
                <ActivityIndicator color={trueBlack} size="small" />
            ) : (
                <Ionicons
                    name={iconName}
                    color={trueBlack}
                    size={iconSize}
                />
            )}
        </Pressable>
    );
};

/**
 * GalleryPreview 自訂圖片元件：expo-image + blurhash 模糊加載
 * 需回傳真實寬高給庫，才能正確計算縮放邊界
 * 白底：透明 PNG / logo 在黑色查看器背景上才看得清
 * allowDownscaling=false：庫用 transform scale 放大，若依容器縮小解碼，超寬圖會糊
 */
const GalleryExpoImage = ({ source, onLoad, style, imagePlaceholder, trueWhite }) => {
    return (
        <Image
            source={source}
            style={[style, {backgroundColor: trueWhite}]}
            contentFit="contain"
            placeholder={imagePlaceholder}
            placeholderContentFit="contain"
            cachePolicy="memory-disk"
            allowDownscaling={false}
            onLoad={e => {
                onLoad(e.source.width, e.source.height);
            }}
        />
    );
};

const ImageQrResultSheet = ({
    sheetRef,
    results,
    onOpenLink,
    onClose,
    theme,
    t,
}) => {
    const handleCopy = value => {
        trigger();
        Clipboard.setString(value);
        Toast.show(t('已複製二維碼內容'));
    };

    return (
        <ActionSheet
            ref={sheetRef}
            isModal={false}
            zIndex={300}
            gestureEnabled
            useBottomSafeAreaPadding
            onClose={onClose}
            containerStyle={[
                styles.qrSheetContainer,
                {backgroundColor: theme.bg_color},
            ]}>
            <View style={styles.qrSheetHeader}>
                <Text style={[styles.qrSheetTitle, {color: theme.black.main}]}>
                    {results.length === 1
                        ? t('識別到二維碼')
                        : t('識別到 {{count}} 個二維碼', {count: results.length})}
                </Text>
                <Text style={[styles.qrSheetHint, {color: theme.black.third}]}>
                    {t('請選擇要打開或複製的內容。')}
                </Text>
            </View>
            <ScrollView
                style={styles.qrResultList}
                contentContainerStyle={styles.qrResultListContent}
                showsVerticalScrollIndicator={results.length > 3}>
                {results.map((result, index) => {
                    const url = getImageQrHttpUrl(result.data);
                    const host = getImageQrDisplayHost(result.data);
                    return (
                        <View
                            key={`${result.data}-${index}`}
                            style={[
                                styles.qrResultCard,
                                {
                                    backgroundColor: theme.white,
                                    borderColor: theme.themeColorUltraLight,
                                },
                            ]}>
                            <Text
                                style={[styles.qrResultType, {color: theme.themeColor}]}
                                numberOfLines={1}>
                                {host || t('文字內容')}
                            </Text>
                            <Text
                                style={[styles.qrResultValue, {color: theme.black.second}]}
                                numberOfLines={3}
                                selectable>
                                {result.data}
                            </Text>
                            <View style={styles.qrResultActions}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={t('複製內容')}
                                    onPress={() => handleCopy(result.data)}
                                    style={({pressed}) => [
                                        styles.qrResultButton,
                                        {
                                            backgroundColor: pressed
                                                ? theme.tonal.primary30
                                                : theme.tonal.primary15,
                                        },
                                    ]}>
                                    <Ionicons
                                        name="copy-outline"
                                        color={theme.themeColor}
                                        size={scale(18)}
                                    />
                                    <Text style={[styles.qrResultButtonText, {color: theme.themeColor}]}>
                                        {t('複製內容')}
                                    </Text>
                                </Pressable>
                                {url && (
                                    <Pressable
                                        accessibilityRole="link"
                                        accessibilityLabel={t('打開連結')}
                                        onPress={() => onOpenLink(url)}
                                        style={({pressed}) => [
                                            styles.qrResultButton,
                                            {
                                                backgroundColor: pressed
                                                    ? theme.tonal.primary50
                                                    : theme.themeColor,
                                            },
                                        ]}>
                                        <Ionicons
                                            name="open-outline"
                                            color={theme.trueWhite}
                                            size={scale(18)}
                                        />
                                        <Text style={[styles.qrResultButtonText, {color: theme.trueWhite}]}>
                                            {t('打開連結')}
                                        </Text>
                                    </Pressable>
                                )}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </ActionSheet>
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
    const { t } = useTranslation('common');

    const [visible, setVisible] = useState(false);
    const [startIndex, setStartIndex] = useState(0);
    const [qrScanning, setQrScanning] = useState(false);
    const [qrResults, setQrResults] = useState([]);

    const qrSheetRef = useRef(null);
    const qrScanRequestRef = useRef(0);
    const pendingQrLinkRef = useRef(null);

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
        qrScanRequestRef.current += 1;
        qrSheetRef.current?.hide();
        setQrScanning(false);
        setVisible(false);
    }, []);

    const handleScanQr = useCallback(async imageIndex => {
        if (qrScanning) { return; }

        const imageUri = processedImages[imageIndex]?.uri;
        if (!imageUri) { return; }

        trigger();
        pendingQrLinkRef.current = null;
        qrSheetRef.current?.hide();
        setQrScanning(true);
        const requestId = qrScanRequestRef.current + 1;
        qrScanRequestRef.current = requestId;

        try {
            let scanUri = imageUri;
            if (Platform.OS !== 'web' && /^https?:\/\//i.test(imageUri)) {
                try {
                    const cachedPath = await Image.getCachePathAsync(imageUri);
                    if (cachedPath) {
                        scanUri = cachedPath.startsWith('file://')
                            ? cachedPath
                            : `file://${cachedPath}`;
                    }
                } catch (_error) {
                    // 讀取圖片快取失敗時，直接交由掃碼器載入原始網址
                }
            }

            const results = normalizeImageQrResults(
                await Camera.scanFromURLAsync(scanUri, ['qr']),
            );
            if (qrScanRequestRef.current !== requestId) { return; }

            setQrResults(results);
            if (results.length === 0) {
                Alert.alert(
                    t('未識別到二維碼'),
                    t('請確認二維碼清晰並在圖片中佔有足夠大小。'),
                );
                return;
            }
            setTimeout(() => qrSheetRef.current?.show(), 50);
        } catch (error) {
            if (qrScanRequestRef.current !== requestId) { return; }
            console.log('Image QR Scan Error:', error);
            Alert.alert(
                t('無法識別二維碼'),
                t('圖片可能尚未下載完成，請稍後再試。'),
            );
        } finally {
            if (qrScanRequestRef.current === requestId) {
                setQrScanning(false);
            }
        }
    }, [processedImages, qrScanning, t]);

    const handleOpenQrLink = useCallback(url => {
        trigger();
        pendingQrLinkRef.current = url;
        qrSheetRef.current?.hide();
    }, []);

    const handleQrSheetClose = useCallback(() => {
        const url = pendingQrLinkRef.current;
        pendingQrLinkRef.current = null;
        if (!url) { return; }

        setVisible(false);
        setTimeout(() => openLink(url), 150);
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

                {/* 底部：識別二維碼、保存 */}
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
                    <View style={styles.footerActions}>
                        <ViewerChromeButton
                            iconName="qr-code-outline"
                            label={t('識別二維碼')}
                            size={scale(50)}
                            loading={qrScanning}
                            disabled={qrScanning}
                            onPress={() => handleScanQr(currentImageIndex)}
                            trueWhite={trueWhite}
                            trueBlack={trueBlack}
                        />
                        <ViewerChromeButton
                            iconName="download-outline"
                            label={t('保存圖片')}
                            size={scale(50)}
                            onPress={() => handleSaveImage(currentImageIndex)}
                            trueWhite={trueWhite}
                            trueBlack={trueBlack}
                        />
                    </View>
                </View>
                <ImageQrResultSheet
                    sheetRef={qrSheetRef}
                    results={qrResults}
                    onOpenLink={handleOpenQrLink}
                    onClose={handleQrSheetClose}
                    theme={theme}
                    t={t}
                />
            </>
        );
    }, [
        handleOpenQrLink,
        handleQrSheetClose,
        handleScanQr,
        handleSaveImage,
        insets.bottom,
        insets.top,
        qrResults,
        qrScanning,
        t,
        theme,
        trueBlack,
        trueWhite,
    ]);

    // GalleryPreview 的 ImageComponent 只傳 source/onLoad/style，用閉包帶入 blurhash / 白底
    const ImageComponent = useCallback((imageProps) => (
        <GalleryExpoImage
            {...imageProps}
            imagePlaceholder={imagePlaceholder}
            trueWhite={trueWhite}
        />
    ), [imagePlaceholder, trueWhite]);

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
    footerActions: {
        flexDirection: 'row',
        gap: scale(18),
    },
    qrSheetContainer: {
        borderTopLeftRadius: scale(16),
        borderTopRightRadius: scale(16),
        maxHeight: '78%',
    },
    qrSheetHeader: {
        paddingHorizontal: scale(18),
        paddingBottom: scale(10),
    },
    qrSheetTitle: {
        fontSize: scale(17),
        fontWeight: '700',
    },
    qrSheetHint: {
        fontSize: scale(13),
        lineHeight: scale(19),
        marginTop: scale(4),
    },
    qrResultList: {
        maxHeight: scale(480),
    },
    qrResultListContent: {
        gap: scale(10),
        paddingHorizontal: scale(14),
        paddingBottom: scale(18),
    },
    qrResultCard: {
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        padding: scale(12),
    },
    qrResultType: {
        fontSize: scale(13),
        fontWeight: '700',
    },
    qrResultValue: {
        fontSize: scale(13),
        lineHeight: scale(19),
        marginTop: scale(5),
    },
    qrResultActions: {
        flexDirection: 'row',
        gap: scale(8),
        marginTop: scale(10),
    },
    qrResultButton: {
        alignItems: 'center',
        borderRadius: scale(9),
        flex: 1,
        flexDirection: 'row',
        gap: scale(6),
        justifyContent: 'center',
        paddingHorizontal: scale(8),
        paddingVertical: scale(9),
    },
    qrResultButtonText: {
        fontSize: scale(13),
        fontWeight: '700',
    },
});

export default ARKImageView;
