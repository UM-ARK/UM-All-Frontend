import {File} from 'expo-file-system';
import {
    ImageManipulator,
    SaveFormat,
} from 'expo-image-manipulator';

import {persistHarborDraftImage} from '../../../../utils/harbor/harborDraftImages';

export const MAX_IMAGES_PER_POST = 6;
export const MAX_CONCURRENT_IMAGE_UPLOADS = 3;

const MAX_COMPRESSED_IMAGE_DIMENSION = 2048;
const IMAGE_COMPRESSION_QUALITY = 0.82;

export async function compressComposerImage(asset, imageId) {
    const context = ImageManipulator.manipulate(asset.uri);
    const width = Number(asset.width) || 0;
    const height = Number(asset.height) || 0;

    if (Math.max(width, height) > MAX_COMPRESSED_IMAGE_DIMENSION) {
        context.resize(
            width >= height
                ? {width: MAX_COMPRESSED_IMAGE_DIMENSION}
                : {height: MAX_COMPRESSED_IMAGE_DIMENSION},
        );
    }

    const renderedImage = await context.renderAsync();
    const compressedImage = await renderedImage.saveAsync({
        compress: IMAGE_COMPRESSION_QUALITY,
        format: SaveFormat.JPEG,
    });
    const originalName = asset.fileName || `image_${imageId}`;
    const fileName = originalName.replace(/\.[^.]+$/, '') + '.jpg';
    const persisted = await persistHarborDraftImage(
        compressedImage.uri,
        imageId,
    );

    // 壓縮產物在 cache，已複製到持久目錄後可嘗試清理
    try {
        const compressedFile = new File(compressedImage.uri);
        if (compressedFile.exists) {
            compressedFile.delete();
        }
    } catch {
        // 忽略 cache 清理失敗
    }

    return {
        localUri: persisted.localUri,
        fileName,
        mimeType: 'image/jpeg',
        fileSize: persisted.fileSize,
    };
}
