import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {Keyboard} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-simple-toast';

import {uploadHarborComposerImage} from '../../../../utils/harbor/harborApi';
import {
    deleteHarborDraftImageFile,
    harborDraftImageExists,
} from '../../../../utils/harbor/harborDraftImages';
import {trigger} from '../../../../utils/trigger';
import {getUploadErrorMessage} from './harborComposerErrors';
import {
    compressComposerImage,
    MAX_CONCURRENT_IMAGE_UPLOADS,
    MAX_IMAGES_PER_POST,
} from './harborComposerImages';

export function useHarborComposerImages({composerSettings, t}) {
    const uploadControllersRef = useRef(new Map());
    const uploadBatchRef = useRef(null);
    const imagesRef = useRef([]);
    const [images, setImages] = useState([]);
    const [isPreparingImages, setIsPreparingImages] = useState(false);
    const maximumConcurrentUploads = Math.max(
        1,
        Math.min(
            MAX_CONCURRENT_IMAGE_UPLOADS,
            composerSettings?.simultaneousUploads ??
                MAX_CONCURRENT_IMAGE_UPLOADS,
        ),
    );
    const hasUnreadyImages = images.some(
        image => image.status !== 'uploaded',
    );
    const isUploadingImages = images.some(
        image =>
            image.status === 'pending' ||
            image.status === 'uploading',
    );
    const hasReachedImageLimit =
        images.length >= MAX_IMAGES_PER_POST;

    useEffect(() => {
        const uploadControllers = uploadControllersRef.current;
        return () => {
            uploadControllers.forEach(controller => controller.abort());
            uploadControllers.clear();
        };
    }, []);

    const updateImages = useCallback(updater => {
        const nextImages = updater(imagesRef.current);
        imagesRef.current = nextImages;
        setImages(nextImages);
        return nextImages;
    }, []);

    const uploadImage = useCallback(async image => {
        if (uploadControllersRef.current.has(image.id)) {
            return image;
        }
        const controller = new AbortController();
        uploadControllersRef.current.set(image.id, controller);
        updateImages(current =>
            current.map(item =>
                item.id === image.id
                    ? {
                        ...item,
                        progress: 0,
                        status: 'uploading',
                        error: '',
                    }
                    : item,
            ),
        );

        try {
            const upload = await uploadHarborComposerImage(
                {
                    uri: image.localUri,
                    fileName: image.fileName,
                    mimeType: image.mimeType,
                },
                {
                    signal: controller.signal,
                    onUploadProgress: event => {
                        const progress = event.total
                            ? event.loaded / event.total
                            : 0;
                        updateImages(current =>
                            current.map(item =>
                                item.id === image.id
                                    ? {...item, progress}
                                    : item,
                            ),
                        );
                    },
                },
            );
            const uploadedImage = {
                ...image,
                uploadId: upload.id,
                shortUrl: upload.shortUrl,
                remoteUrl: upload.remoteUrl,
                progress: 1,
                status: 'uploaded',
                error: '',
            };
            updateImages(current =>
                current.map(item =>
                    item.id === image.id
                        ? uploadedImage
                        : item,
                ),
            );
            return uploadedImage;
        } catch (error) {
            if (controller.signal.aborted) {
                return image;
            }
            const failedImage = {
                ...image,
                status: 'failed',
                error: getUploadErrorMessage(error, t),
            };
            updateImages(current =>
                current.map(item =>
                    item.id === image.id
                        ? failedImage
                        : item,
                ),
            );
            return failedImage;
        } finally {
            uploadControllersRef.current.delete(image.id);
        }
    }, [t, updateImages]);

    const uploadImages = useCallback(nextImages => {
        if (uploadBatchRef.current) {
            return uploadBatchRef.current;
        }
        const currentImageIds = new Set(
            imagesRef.current.map(image => image.id),
        );
        const imagesToUpload = (
            Array.isArray(nextImages) ? nextImages : imagesRef.current
        ).filter(
            image =>
                image.status !== 'uploaded' &&
                currentImageIds.has(image.id),
        );
        if (imagesToUpload.length === 0) {
            return Promise.resolve(imagesRef.current);
        }

        updateImages(current =>
            current.map(image =>
                imagesToUpload.some(item => item.id === image.id)
                    ? {
                        ...image,
                        progress: 0,
                        status: 'pending',
                        error: '',
                    }
                    : image,
            ),
        );

        const batch = (async () => {
            let nextIndex = 0;
            const uploadNext = async () => {
                while (nextIndex < imagesToUpload.length) {
                    const image = imagesToUpload[nextIndex];
                    nextIndex += 1;
                    await uploadImage(image);
                }
            };
            await Promise.all(
                Array.from(
                    {
                        length: Math.min(
                            maximumConcurrentUploads,
                            imagesToUpload.length,
                        ),
                    },
                    uploadNext,
                ),
            );
            return imagesRef.current;
        })();
        uploadBatchRef.current = batch.finally(() => {
            uploadBatchRef.current = null;
        });
        return uploadBatchRef.current;
    }, [maximumConcurrentUploads, updateImages, uploadImage]);

    const handleAddImages = useCallback(async () => {
        trigger();
        Keyboard.dismiss();

        if (hasReachedImageLimit) {
            Toast.show(
                t('每篇貼文最多只能加入 {{count}} 張圖片。', {
                    count: MAX_IMAGES_PER_POST,
                }),
            );
            return;
        }

        try {
            const permission =
                await ImagePicker.getMediaLibraryPermissionsAsync();
            let permissionStatus = permission.status;
            if (permissionStatus !== 'granted') {
                const result =
                    await ImagePicker.requestMediaLibraryPermissionsAsync();
                permissionStatus = result.status;
            }
            if (permissionStatus !== 'granted') {
                Toast.show(t('請允許相片權限後再新增圖片。'));
                return;
            }

            const selectionLimit =
                MAX_IMAGES_PER_POST - images.length;
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                allowsMultipleSelection: true,
                orderedSelection: true,
                quality: 1,
                selectionLimit,
            });
            if (result.canceled) {
                return;
            }

            setIsPreparingImages(true);
            const maxImageBytes = composerSettings?.maxImageSizeKb == null
                ? null
                : composerSettings.maxImageSizeKb * 1024;
            const selectedAt = Date.now();
            const selectedAssets = result.assets.slice(
                0,
                selectionLimit,
            );
            const nextImages = [];
            let oversizedImageCount = 0;
            let compressionFailureCount = 0;

            for (let index = 0; index < selectedAssets.length; index += 1) {
                const asset = selectedAssets[index];
                const imageId = `${selectedAt}-${index}`;
                try {
                    const compressedImage =
                        await compressComposerImage(asset, imageId);
                    if (
                        maxImageBytes != null &&
                        compressedImage.fileSize > maxImageBytes
                    ) {
                        deleteHarborDraftImageFile(
                            compressedImage.localUri,
                        );
                        oversizedImageCount += 1;
                        continue;
                    }
                    nextImages.push({
                        id: imageId,
                        ...compressedImage,
                        progress: 0,
                        status: 'ready',
                    });
                } catch {
                    compressionFailureCount += 1;
                }
            }

            if (result.assets.length > selectionLimit) {
                Toast.show(
                    t('每篇貼文最多只能加入 {{count}} 張圖片。', {
                        count: MAX_IMAGES_PER_POST,
                    }),
                );
            }
            if (oversizedImageCount > 0) {
                Toast.show(
                    t('{{count}} 張圖片超過 Harbor 的大小限制。', {
                        count: oversizedImageCount,
                    }),
                );
            }
            if (compressionFailureCount > 0) {
                Toast.show(
                    t('{{count}} 張圖片處理失敗，請重新選擇。', {
                        count: compressionFailureCount,
                    }),
                );
            }
            if (nextImages.length === 0) {
                return;
            }

            updateImages(current => [...current, ...nextImages]);
        } catch {
            Toast.show(t('無法開啟相片圖庫，請稍後再試。'));
        } finally {
            setIsPreparingImages(false);
        }
    }, [
        composerSettings,
        hasReachedImageLimit,
        images.length,
        t,
        updateImages,
    ]);

    const handleRemoveImage = useCallback(imageId => {
        trigger();
        uploadControllersRef.current.get(imageId)?.abort();
        uploadControllersRef.current.delete(imageId);
        const removed = imagesRef.current.find(
            image => image.id === imageId,
        );
        if (removed?.localUri) {
            deleteHarborDraftImageFile(removed.localUri);
        }
        updateImages(current =>
            current.filter(image => image.id !== imageId),
        );
    }, [updateImages]);

    const handleRetryImage = useCallback(image => {
        trigger();
        uploadImages([image]);
    }, [uploadImages]);

    const handleMoveImage = useCallback((imageId, offset) => {
        trigger();
        updateImages(current => {
            const currentIndex = current.findIndex(
                image => image.id === imageId,
            );
            const nextIndex = currentIndex + offset;
            if (
                currentIndex < 0 ||
                nextIndex < 0 ||
                nextIndex >= current.length
            ) {
                return current;
            }
            const nextImages = [...current];
            const [image] = nextImages.splice(currentIndex, 1);
            nextImages.splice(nextIndex, 0, image);
            return nextImages;
        });
    }, [updateImages]);

    const restoreDraftImages = useCallback(draftImages => {
        const restoredImages = (
            Array.isArray(draftImages) ? draftImages : []
        )
            .map((image, index) => {
                if (!image || typeof image !== 'object') {
                    return null;
                }
                const localUri =
                    typeof image.localUri === 'string'
                        ? image.localUri
                        : '';
                const remoteUrl =
                    typeof image.remoteUrl === 'string'
                        ? image.remoteUrl
                        : '';
                const shortUrl =
                    typeof image.shortUrl === 'string'
                        ? image.shortUrl
                        : '';
                if (!localUri && !remoteUrl && !shortUrl) {
                    return null;
                }
                const localFileExists = harborDraftImageExists(localUri);
                const previewUri = localFileExists
                    ? localUri
                    : remoteUrl || localUri;
                if (!previewUri && !shortUrl) {
                    return null;
                }
                // 本機檔案遺失且尚未上傳：標為 failed，避免發布時才爆錯
                const missingLocal =
                    Boolean(localUri) &&
                    !localFileExists &&
                    !shortUrl &&
                    !remoteUrl;
                return {
                    ...image,
                    id:
                        typeof image.id === 'string' && image.id
                            ? image.id
                            : `draft-image-${Date.now()}-${index}`,
                    localUri: previewUri,
                    remoteUrl,
                    shortUrl,
                    progress: shortUrl ? 1 : 0,
                    status: shortUrl
                        ? 'uploaded'
                        : missingLocal
                            ? 'failed'
                            : 'ready',
                    error: missingLocal
                        ? t('圖片檔案已遺失，請重新選擇。')
                        : image.error || '',
                };
            })
            .filter(Boolean);
        imagesRef.current = restoredImages;
        setImages(restoredImages);
    }, [t]);

    return {
        images,
        hasReachedImageLimit,
        hasUnreadyImages,
        handleAddImages,
        handleMoveImage,
        handleRemoveImage,
        handleRetryImage,
        isPreparingImages,
        isUploadingImages,
        restoreDraftImages,
        uploadImages,
    };
}
