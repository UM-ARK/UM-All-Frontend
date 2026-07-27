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
import {trigger} from '../../../../utils/trigger';
import {getUploadErrorMessage} from './harborComposerErrors';
import {
    compressComposerImage,
    MAX_CONCURRENT_IMAGE_UPLOADS,
    MAX_IMAGES_PER_POST,
} from './harborComposerImages';

export function useHarborComposerImages({composerSettings, t}) {
    const uploadControllersRef = useRef(new Map());
    const uploadQueueRef = useRef([]);
    const activeUploadCountRef = useRef(0);
    const drainUploadQueueRef = useRef(null);
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
            uploadQueueRef.current = [];
            drainUploadQueueRef.current = null;
            uploadControllers.forEach(controller => controller.abort());
            uploadControllers.clear();
        };
    }, []);

    const uploadImage = useCallback(async image => {
        if (uploadControllersRef.current.has(image.id)) {
            return;
        }
        const controller = new AbortController();
        uploadControllersRef.current.set(image.id, controller);
        setImages(current =>
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
                        setImages(current =>
                            current.map(item =>
                                item.id === image.id
                                    ? {...item, progress}
                                    : item,
                            ),
                        );
                    },
                },
            );
            setImages(current =>
                current.map(item =>
                    item.id === image.id
                        ? {
                            ...item,
                            uploadId: upload.id,
                            shortUrl: upload.shortUrl,
                            remoteUrl: upload.remoteUrl,
                            progress: 1,
                            status: 'uploaded',
                        }
                        : item,
                ),
            );
        } catch (error) {
            if (controller.signal.aborted) {
                return;
            }
            setImages(current =>
                current.map(item =>
                    item.id === image.id
                        ? {
                            ...item,
                            status: 'failed',
                            error: getUploadErrorMessage(error, t),
                        }
                        : item,
                ),
            );
        } finally {
            uploadControllersRef.current.delete(image.id);
        }
    }, [t]);

    const drainUploadQueue = useCallback(() => {
        while (
            activeUploadCountRef.current <
                maximumConcurrentUploads &&
            uploadQueueRef.current.length > 0
        ) {
            const image = uploadQueueRef.current.shift();
            activeUploadCountRef.current += 1;
            uploadImage(image).finally(() => {
                activeUploadCountRef.current = Math.max(
                    0,
                    activeUploadCountRef.current - 1,
                );
                drainUploadQueueRef.current?.();
            });
        }
    }, [maximumConcurrentUploads, uploadImage]);

    useEffect(() => {
        drainUploadQueueRef.current = drainUploadQueue;
        drainUploadQueue();
        return () => {
            drainUploadQueueRef.current = null;
        };
    }, [drainUploadQueue]);

    const enqueueImages = useCallback(nextImages => {
        const queuedIds = new Set(
            uploadQueueRef.current.map(image => image.id),
        );
        const imagesToQueue = nextImages.filter(
            image =>
                !queuedIds.has(image.id) &&
                !uploadControllersRef.current.has(image.id),
        );
        if (imagesToQueue.length === 0) {
            return;
        }

        setImages(current =>
            current.map(image =>
                imagesToQueue.some(item => item.id === image.id)
                    ? {
                        ...image,
                        progress: 0,
                        status: 'pending',
                        error: '',
                    }
                    : image,
            ),
        );
        uploadQueueRef.current.push(...imagesToQueue);
        drainUploadQueue();
    }, [drainUploadQueue]);

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
                        oversizedImageCount += 1;
                        continue;
                    }
                    nextImages.push({
                        id: imageId,
                        ...compressedImage,
                        progress: 0,
                        status: 'pending',
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

            setImages(current => [...current, ...nextImages]);
            enqueueImages(nextImages);
        } catch {
            Toast.show(t('無法開啟相片圖庫，請稍後再試。'));
        } finally {
            setIsPreparingImages(false);
        }
    }, [
        composerSettings,
        enqueueImages,
        hasReachedImageLimit,
        images.length,
        t,
    ]);

    const handleRemoveImage = useCallback(imageId => {
        trigger();
        uploadQueueRef.current = uploadQueueRef.current.filter(
            image => image.id !== imageId,
        );
        uploadControllersRef.current.get(imageId)?.abort();
        uploadControllersRef.current.delete(imageId);
        setImages(current =>
            current.filter(image => image.id !== imageId),
        );
    }, []);

    const handleRetryImage = useCallback(image => {
        trigger();
        enqueueImages([image]);
    }, [enqueueImages]);

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
                return {
                    ...image,
                    id:
                        typeof image.id === 'string' && image.id
                            ? image.id
                            : `draft-image-${Date.now()}-${index}`,
                    localUri: localUri || remoteUrl,
                    remoteUrl,
                    shortUrl,
                    progress: shortUrl ? 1 : 0,
                    status: shortUrl ? 'uploaded' : 'pending',
                };
            })
            .filter(Boolean);
        setImages(restoredImages);
        enqueueImages(
            restoredImages.filter(image => image.status === 'pending'),
        );
    }, [enqueueImages]);

    return {
        images,
        hasReachedImageLimit,
        hasUnreadyImages,
        handleAddImages,
        handleRemoveImage,
        handleRetryImage,
        isPreparingImages,
        isUploadingImages,
        restoreDraftImages,
    };
}
