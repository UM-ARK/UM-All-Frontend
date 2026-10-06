/* eslint-env browser */
// Web 替身：expo-media-library 在 web 沒有實現（import 時就會拋「Cannot find native module」）
// 瀏覽器沒有「相簿」概念，這裡把「保存到相簿」等價為觸發下載，權限一律視為已授予
const GRANTED = {
    status: 'granted',
    granted: true,
    canAskAgain: true,
    expires: 'never',
    accessPrivileges: 'all',
};

export const getPermissionsAsync = async () => GRANTED;
export const requestPermissionsAsync = async () => GRANTED;
export const usePermissions = () => [GRANTED, requestPermissionsAsync, getPermissionsAsync];

const guessFileName = uri => {
    try {
        const pathname = new URL(uri, typeof location !== 'undefined' ? location.href : undefined).pathname;
        const last = pathname.split('/').filter(Boolean).pop();
        if (last && /\.[a-z0-9]{2,5}$/i.test(last)) {
            return last;
        }
    } catch {
        // data: / blob: 等無法解析的 URI 落到默認命名
    }
    return `ark_${Date.now()}.png`;
};

// 用隱藏的 <a download> 觸發瀏覽器下載
const downloadUri = uri => {
    if (typeof document === 'undefined' || !uri) {
        return;
    }
    const anchor = document.createElement('a');
    anchor.href = uri;
    anchor.download = guessFileName(uri);
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
};

export const saveToLibraryAsync = async uri => {
    downloadUri(uri);
};

export const createAssetAsync = async uri => {
    downloadUri(uri);
    return { id: uri, uri, filename: guessFileName(uri), mediaType: 'photo' };
};

// 新版 Asset 類接口
export class Asset {
    static async create(uri) {
        downloadUri(uri);
        return new Asset(uri);
    }

    constructor(uri) {
        this.id = uri;
        this.uri = uri;
        this.filename = guessFileName(uri);
        this.mediaType = 'photo';
    }
}

export const MediaType = {
    audio: 'audio',
    photo: 'photo',
    video: 'video',
    unknown: 'unknown',
};

export default {
    getPermissionsAsync,
    requestPermissionsAsync,
    usePermissions,
    saveToLibraryAsync,
    createAssetAsync,
    Asset,
    MediaType,
};
