import {File} from 'expo-file-system';
import {
    ImageManipulator,
    SaveFormat,
} from 'expo-image-manipulator';

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
    const compressedFile = new File(compressedImage.uri);
    const originalName = asset.fileName || `image_${imageId}`;
    const fileName = originalName.replace(/\.[^.]+$/, '') + '.jpg';

    return {
        localUri: compressedImage.uri,
        fileName,
        mimeType: 'image/jpeg',
        fileSize: compressedFile.size,
    };
}
