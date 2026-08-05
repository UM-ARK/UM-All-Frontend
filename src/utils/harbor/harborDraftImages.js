import {Directory, File, Paths} from 'expo-file-system';

const HARBOR_DRAFT_IMAGES_DIR = 'harbor-draft-images';

const getDraftImagesDirectory = () => {
    const directory = new Directory(
        Paths.document,
        HARBOR_DRAFT_IMAGES_DIR,
    );
    if (!directory.exists) {
        directory.create({intermediates: true, idempotent: true});
    }
    return directory;
};

export const isHarborDraftImageUri = uri =>
    typeof uri === 'string' &&
    uri.includes(`/${HARBOR_DRAFT_IMAGES_DIR}/`);

export const harborDraftImageExists = uri => {
    if (typeof uri !== 'string' || !uri) {
        return false;
    }
    try {
        return new File(uri).exists;
    } catch {
        return false;
    }
};

export async function persistHarborDraftImage(sourceUri, imageId) {
    if (typeof sourceUri !== 'string' || !sourceUri || !imageId) {
        throw new TypeError('Invalid Harbor draft image');
    }
    const directory = getDraftImagesDirectory();
    const destination = new File(directory, `${imageId}.jpg`);
    if (destination.exists) {
        destination.delete();
    }
    const source = new File(sourceUri);
    await source.copy(destination);
    return {
        localUri: destination.uri,
        fileSize: destination.size,
    };
}

export function deleteHarborDraftImageFile(uri) {
    if (!isHarborDraftImageUri(uri)) {
        return;
    }
    try {
        const file = new File(uri);
        if (file.exists) {
            file.delete();
        }
    } catch {
        // 忽略清理失敗，避免阻斷草稿刪除流程
    }
}

export function deleteHarborDraftImageFiles(imagesOrUris) {
    const list = Array.isArray(imagesOrUris) ? imagesOrUris : [];
    list.forEach(item => {
        const uri =
            typeof item === 'string'
                ? item
                : typeof item?.localUri === 'string'
                    ? item.localUri
                    : '';
        deleteHarborDraftImageFile(uri);
    });
}
